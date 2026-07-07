import express from "express";
import session from "express-session";
import multer from "multer";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AppsV1Api,
  ApiException,
  CoreV1Api,
  CustomObjectsApi,
  KubeConfig,
  NetworkingV1Api,
  KubernetesObject,
  KubernetesObjectApi,
} from "@kubernetes/client-node";
import { resourceCatalog } from "./catalog.js";
import { rewriteLoopbackClusterServers, setKubeconfigCurrentContext } from "./kubeconfig.js";
import { createResourceTemplate } from "./templates.js";

declare module "express-session" {
  interface SessionData {
    kubeconfig?: string;
    pendingContextSelection?: boolean;
  }
}

type AnyRecord = Record<string, any>;

function kubeconfigStatus(kc: KubeConfig, connected: boolean, requiresContextSelection = false) {
  return {
    connected,
    requiresContextSelection,
    currentContext: kc.getCurrentContext(),
    contexts: kc.getContexts().map((context) => context.name),
    contextDetails: kc.getContexts().map((context) => ({
      name: context.name,
      cluster: context.cluster,
      user: context.user,
      namespace: context.namespace,
    })),
    clusters: kc.getClusters().map((cluster) => cluster.name),
    users: kc.getUsers().map((user) => user.name),
  };
}

const app = express();
const upload = multer();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, "../dist");
const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET ?? crypto.randomBytes(32).toString("hex");
const kubeconfigLoopbackHost = process.env.KUBECONFIG_LOOPBACK_HOST;

if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

app.use(express.json({ limit: "2mb" }));
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
    },
  }),
);

const customResourceKinds = new Map([
  ["VirtualServer", { plural: "virtualservers", namespaced: true }],
  ["VirtualServerRoute", { plural: "virtualserverroutes", namespaced: true }],
  ["TransportServer", { plural: "transportservers", namespaced: true }],
  ["Policy", { plural: "policies", namespaced: true }],
  ["GlobalConfiguration", { plural: "globalconfigurations", namespaced: true }],
]);

const controllerKinds = new Set(["Deployment", "DaemonSet", "StatefulSet"]);

function requireKubeconfig(req: express.Request, options: { allowPendingContext?: boolean } = {}) {
  const kubeconfig = req.session.kubeconfig;
  if (!kubeconfig) {
    throw new Error("No kubeconfig has been imported yet.");
  }
  if (req.session.pendingContextSelection && !options.allowPendingContext) {
    throw new Error("Select a kubeconfig context before connecting to the cluster.");
  }

  const kc = new KubeConfig();
  kc.loadFromString(kubeconfig);

  return {
    kc,
    objectApi: KubernetesObjectApi.makeApiClient(kc),
    appsApi: kc.makeApiClient(AppsV1Api),
    coreApi: kc.makeApiClient(CoreV1Api),
    networkingApi: kc.makeApiClient(NetworkingV1Api),
    customApi: kc.makeApiClient(CustomObjectsApi),
  };
}

function toErrorPayload(error: unknown) {
  if (error instanceof ApiException) {
    const body = typeof error.body === "object" && error.body ? (error.body as AnyRecord) : null;
    return {
      message: body?.message ?? error.message,
      statusCode: error.code,
    };
  }

  if (error instanceof Error) {
    return { message: error.message, statusCode: 500 };
  }

  return { message: "Unknown server error", statusCode: 500 };
}

function isNotFoundError(error: unknown) {
  return error instanceof ApiException && error.code === 404;
}

function unwrapResponse<T>(response: T | { body?: T }) {
  if (response && typeof response === "object" && "body" in response) {
    const maybeWrapped = response as { body?: T };
    return maybeWrapped.body ?? (response as T);
  }

  return response as T;
}

function isLikelyController(workload: AnyRecord) {
  const name = workload?.metadata?.name?.toLowerCase?.() ?? "";
  const labels = workload?.metadata?.labels ?? {};
  const containers = workload?.spec?.template?.spec?.containers ?? [];
  const serialized = JSON.stringify({
    name,
    labels,
    containers: containers.map((container: AnyRecord) => ({
      name: container.name,
      image: container.image,
      args: container.args,
    })),
  }).toLowerCase();

  return [
    "nginx-ingress",
    "nginx-plus-ingress",
    "nginx-ingress-controller",
    "nginx-kubernetes-ingress",
  ].some((marker) => serialized.includes(marker));
}

function summarizeWorkload(workload: AnyRecord) {
  const containers = workload?.spec?.template?.spec?.containers ?? [];

  return {
    apiVersion: workload.apiVersion,
    kind: workload.kind,
    name: workload?.metadata?.name,
    namespace: workload?.metadata?.namespace,
    replicas: workload?.spec?.replicas ?? workload?.status?.desiredNumberScheduled ?? null,
    image: containers[0]?.image ?? "n/a",
    args: containers.flatMap((container: AnyRecord) => container.args ?? []),
  };
}

function simplifyResourceList(items: AnyRecord[]) {
  return items.map((item) => ({
    apiVersion: item.apiVersion,
    kind: item.kind,
    name: item.metadata?.name,
    namespace: item.metadata?.namespace,
    creationTimestamp: item.metadata?.creationTimestamp,
    labels: item.metadata?.labels ?? {},
    state: item.status?.state ?? item.status?.phase ?? null,
    summary:
      (item.kind === "Secret" ? ingressPolicySecretTypeLabel(item.type) : null) ??
      item.spec?.host ??
      item.spec?.listener?.name ??
      item.spec?.listeners?.[0]?.name ??
      item.data?.["proxy-read-timeout"] ??
      null,
  }));
}

const ingressPolicySecretTypeLabels: Record<string, string> = {
  "nginx.org/apikey": "API key secret",
  "nginx.org/htpasswd": "HTTP password secret",
  "nginx.org/ca": "CA cert secret",
  "nginx.org/oidc": "OIDC secret",
  "nginx.org/jwk": "JWK secret",
};

function isIngressPolicySecret(secret: AnyRecord) {
  return typeof secret?.type === "string" && Object.prototype.hasOwnProperty.call(ingressPolicySecretTypeLabels, secret.type);
}

function ingressPolicySecretTypeLabel(type: unknown) {
  return typeof type === "string" ? ingressPolicySecretTypeLabels[type] ?? type : null;
}

function isTlsSecret(secret: AnyRecord) {
  const data = secret?.data ?? {};
  return secret?.type === "kubernetes.io/tls" && Boolean(data["tls.crt"]) && Boolean(data["tls.key"]);
}

function isTypedSecret(secret: AnyRecord, type: string) {
  return secret?.type === type;
}

function summarizeNamedSecret(secret: AnyRecord) {
  return {
    name: secret.metadata?.name,
    namespace: secret.metadata?.namespace,
  };
}

async function listCustomResources(customApi: CustomObjectsApi, kind: string) {
  const details = customResourceKinds.get(kind);
  if (!details) {
    return [];
  }

  try {
    const response = await customApi.listClusterCustomObject({
      group: "k8s.nginx.org",
      version: "v1",
      plural: details.plural,
    });

    const body = unwrapResponse<AnyRecord>(response);
    return (body.items ?? []) as AnyRecord[];
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }

    throw error;
  }
}

async function listNamedCustomResources(
  customApi: CustomObjectsApi,
  group: string,
  version: string,
  plural: string,
) {
  try {
    const response = await customApi.listClusterCustomObject({
      group,
      version,
      plural,
    });
    const body = unwrapResponse<AnyRecord>(response);
    return ((body.items ?? []) as AnyRecord[]).map((item) => ({
      name: item.metadata?.name,
      namespace: item.metadata?.namespace,
    }));
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }
    throw error;
  }
}

async function readResource(
  objectApi: KubernetesObjectApi,
  manifest: KubernetesObject & { metadata: { name: string; namespace?: string } },
) {
  const response = await objectApi.read(manifest);
  return response;
}

async function upsertResource(objectApi: KubernetesObjectApi, manifest: KubernetesObject) {
  try {
    if (!manifest.metadata?.name) {
      throw new Error("Manifest metadata.name is required.");
    }

    const readTarget = {
      apiVersion: manifest.apiVersion,
      kind: manifest.kind,
      metadata: {
        name: manifest.metadata.name,
        namespace: manifest.metadata.namespace ?? undefined,
      },
    };

    const existing = await readResource(objectApi, readTarget);
    manifest.metadata = {
      ...manifest.metadata,
      resourceVersion: (existing as AnyRecord).metadata?.resourceVersion,
    };
    const response = await objectApi.replace(manifest);
    return response;
  } catch (error) {
    if (isNotFoundError(error)) {
      const response = await objectApi.create(manifest);
      return response;
    }

    throw error;
  }
}

app.get("/api/catalog", (_req, res) => {
  res.json({
    resourceCatalog,
  });
});

app.get("/api/session/status", (req, res) => {
  if (!req.session.kubeconfig) {
    res.json({ connected: false });
    return;
  }

  try {
    const { kc } = requireKubeconfig(req, { allowPendingContext: true });
    res.json(kubeconfigStatus(kc, !req.session.pendingContextSelection, Boolean(req.session.pendingContextSelection)));
  } catch (error) {
    const payload = toErrorPayload(error);
    res.status(payload.statusCode).json(payload);
  }
});

app.post("/api/session/kubeconfig", upload.single("file"), (req, res) => {
  try {
    const fileContent = req.file?.buffer?.toString("utf8");
    const bodyContent = typeof req.body.kubeconfig === "string" ? req.body.kubeconfig : "";
    const kubeconfig = rewriteLoopbackClusterServers(fileContent || bodyContent, kubeconfigLoopbackHost);

    if (!kubeconfig.trim()) {
      res.status(400).json({ message: "Upload a kubeconfig file." });
      return;
    }

    const kc = new KubeConfig();
    kc.loadFromString(kubeconfig);
    req.session.kubeconfig = kubeconfig;
    const requiresContextSelection = kc.getClusters().length > 1 && kc.getContexts().length > 1;
    req.session.pendingContextSelection = requiresContextSelection;

    res.json(kubeconfigStatus(kc, !requiresContextSelection, requiresContextSelection));
  } catch (error) {
    const payload = toErrorPayload(error);
    res.status(400).json(payload);
  }
});

app.post("/api/session/context", (req, res) => {
  try {
    const contextName = typeof req.body.context === "string" ? req.body.context : "";
    if (!contextName.trim()) {
      res.status(400).json({ message: "Select a kubeconfig context." });
      return;
    }
    if (!req.session.kubeconfig) {
      res.status(400).json({ message: "Import a kubeconfig before selecting a context." });
      return;
    }

    const kubeconfig = setKubeconfigCurrentContext(req.session.kubeconfig, contextName);
    const kc = new KubeConfig();
    kc.loadFromString(kubeconfig);
    req.session.kubeconfig = kubeconfig;
    req.session.pendingContextSelection = false;
    res.json(kubeconfigStatus(kc, true, false));
  } catch (error) {
    const payload = toErrorPayload(error);
    res.status(400).json(payload);
  }
});

app.get("/api/overview", async (req, res) => {
  try {
    const { kc, appsApi, coreApi, customApi } = requireKubeconfig(req);
    const [deploymentsResponse, daemonsetsResponse, statefulsetsResponse, configMapsResponse, namespacesResponse, secretsResponse] =
      await Promise.all([
      appsApi.listDeploymentForAllNamespaces(),
      appsApi.listDaemonSetForAllNamespaces(),
      appsApi.listStatefulSetForAllNamespaces(),
      coreApi.listConfigMapForAllNamespaces(),
      coreApi.listNamespace(),
      coreApi.listSecretForAllNamespaces(),
      ]);

    const deployments = unwrapResponse<AnyRecord>(deploymentsResponse);
    const daemonsets = unwrapResponse<AnyRecord>(daemonsetsResponse);
    const statefulsets = unwrapResponse<AnyRecord>(statefulsetsResponse);
    const configMaps = unwrapResponse<AnyRecord>(configMapsResponse);
    const namespaces = unwrapResponse<AnyRecord>(namespacesResponse);
    const secrets = unwrapResponse<AnyRecord>(secretsResponse);

    const workloads = [
      ...(deployments.items ?? []),
      ...(daemonsets.items ?? []),
      ...(statefulsets.items ?? []),
    ]
      .filter(isLikelyController)
      .map(summarizeWorkload);

    const configMapItems = ((configMaps.items ?? []) as AnyRecord[]).filter((item: AnyRecord) => {
      const name = item.metadata?.name?.toLowerCase() ?? "";
      const labels = JSON.stringify(item.metadata?.labels ?? {}).toLowerCase();
      return name.includes("nginx") || labels.includes("nginx-ingress");
    });
    const secretItems = ((secrets.items ?? []) as AnyRecord[]).filter(isIngressPolicySecret);

    const [virtualServers, virtualServerRoutes, transportServers, policies, globalConfigurations] =
      await Promise.all([
        listCustomResources(customApi, "VirtualServer"),
        listCustomResources(customApi, "VirtualServerRoute"),
        listCustomResources(customApi, "TransportServer"),
        listCustomResources(customApi, "Policy"),
        listCustomResources(customApi, "GlobalConfiguration"),
      ]);

    res.json({
      cluster: {
        currentContext: kc.getCurrentContext(),
        contexts: kc.getContexts().map((context) => context.name),
        namespaces: ((namespaces.items ?? []) as AnyRecord[])
          .map((namespace: AnyRecord) => namespace.metadata?.name)
          .filter(Boolean),
      },
      controllers: workloads,
      configMaps: simplifyResourceList(configMapItems as AnyRecord[]),
      resources: {
        VirtualServer: simplifyResourceList(virtualServers),
        VirtualServerRoute: simplifyResourceList(virtualServerRoutes),
        TransportServer: simplifyResourceList(transportServers),
        Policy: simplifyResourceList(policies),
        GlobalConfiguration: simplifyResourceList(globalConfigurations),
        Secret: simplifyResourceList(secretItems),
      },
    });
  } catch (error) {
    const payload = toErrorPayload(error);
    res.status(payload.statusCode).json(payload);
  }
});

app.get("/api/options", async (req, res) => {
  try {
    const { coreApi, networkingApi, customApi } = requireKubeconfig(req);
    const [namespacesResponse, ingressClassesResponse, secretsResponse, policies, dosResources, globalConfigurations] =
      await Promise.all([
        coreApi.listNamespace(),
        networkingApi.listIngressClass(),
        coreApi.listSecretForAllNamespaces(),
        listCustomResources(customApi, "Policy"),
        listNamedCustomResources(customApi, "appprotectdos.f5.com", "v1beta1", "dosprotectedresources"),
        listCustomResources(customApi, "GlobalConfiguration"),
      ]);

    const namespaces = (unwrapResponse<AnyRecord>(namespacesResponse).items ?? []) as AnyRecord[];
    const ingressClasses = (unwrapResponse<AnyRecord>(ingressClassesResponse).items ?? []) as AnyRecord[];
    const secrets = (unwrapResponse<AnyRecord>(secretsResponse).items ?? []) as AnyRecord[];

    const listenerNames = globalConfigurations.flatMap((item) =>
      ((item.spec?.listeners ?? []) as AnyRecord[]).map((listener) => listener.name).filter(Boolean),
    );

    res.json({
      namespaces: namespaces.map((namespace) => namespace.metadata?.name).filter(Boolean),
      ingressClasses: ingressClasses.map((ingressClass) => ingressClass.metadata?.name).filter(Boolean),
      policies: policies.map((item) => ({
        name: item.metadata?.name,
        namespace: item.metadata?.namespace,
      })),
      dosResources,
      tlsSecrets: secrets
        .filter(isTlsSecret)
        .map(summarizeNamedSecret),
      apiKeySecrets: secrets.filter((secret) => isTypedSecret(secret, "nginx.org/apikey")).map(summarizeNamedSecret),
      htpasswdSecrets: secrets.filter((secret) => isTypedSecret(secret, "nginx.org/htpasswd")).map(summarizeNamedSecret),
      caSecrets: secrets.filter((secret) => isTypedSecret(secret, "nginx.org/ca")).map(summarizeNamedSecret),
      oidcSecrets: secrets.filter((secret) => isTypedSecret(secret, "nginx.org/oidc")).map(summarizeNamedSecret),
      jwkSecrets: secrets.filter((secret) => isTypedSecret(secret, "nginx.org/jwk")).map(summarizeNamedSecret),
      listeners: listenerNames,
    });
  } catch (error) {
    const payload = toErrorPayload(error);
    res.status(payload.statusCode).json(payload);
  }
});

app.get("/api/resource", async (req, res) => {
  try {
    const kind = String(req.query.kind ?? "");
    const name = String(req.query.name ?? "");
    const namespace = req.query.namespace ? String(req.query.namespace) : undefined;

    if (!kind || !name) {
      res.status(400).json({ message: "kind and name are required." });
      return;
    }

    const { objectApi } = requireKubeconfig(req);
    const apiVersion =
      resourceCatalog.find((entry) => entry.kind === kind)?.apiVersion ??
      (customResourceKinds.has(kind) ? "k8s.nginx.org/v1" : kind === "ConfigMap" ? "v1" : "apps/v1");
    const manifest = {
      apiVersion,
      kind,
      metadata: {
        name,
        namespace,
      },
    };

    const body = await readResource(objectApi, manifest);
    res.json(body);
  } catch (error) {
    const payload = toErrorPayload(error);
    res.status(payload.statusCode).json(payload);
  }
});

app.post("/api/resource", async (req, res) => {
  try {
    const manifest = req.body as KubernetesObject;
    if (!manifest?.apiVersion || !manifest?.kind || !manifest?.metadata?.name) {
      res.status(400).json({ message: "Manifest requires apiVersion, kind, and metadata.name." });
      return;
    }

    const { objectApi } = requireKubeconfig(req);
    const body = await upsertResource(objectApi, manifest);
    res.json(body);
  } catch (error) {
    const payload = toErrorPayload(error);
    res.status(payload.statusCode).json(payload);
  }
});

app.delete("/api/resource", async (req, res) => {
  try {
    const kind = String(req.query.kind ?? "");
    const name = String(req.query.name ?? "");
    const namespace = req.query.namespace ? String(req.query.namespace) : undefined;

    if (!kind || !name) {
      res.status(400).json({ message: "kind and name are required." });
      return;
    }

    const { objectApi } = requireKubeconfig(req);
    const apiVersion =
      resourceCatalog.find((entry) => entry.kind === kind)?.apiVersion ??
      (customResourceKinds.has(kind) ? "k8s.nginx.org/v1" : kind === "ConfigMap" ? "v1" : "apps/v1");

    await objectApi.delete({
      apiVersion,
      kind,
      metadata: {
        name,
        namespace,
      },
    });

    res.json({ deleted: true, kind, name, namespace });
  } catch (error) {
    const payload = toErrorPayload(error);
    res.status(payload.statusCode).json(payload);
  }
});

app.get("/api/template/:kind", (req, res) => {
  const kind = req.params.kind;
  const namespace = typeof req.query.namespace === "string" ? req.query.namespace : "default";
  res.json({
    kind,
    template: createResourceTemplate(kind, namespace),
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, resourceKinds: [...customResourceKinds.keys()], controllerKinds: [...controllerKinds] });
});

if (isProduction) {
  app.use(express.static(clientDistPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";
const server = app.listen(port, host, () => {
  console.log(`NGINX Plus Ingress Manager listening on http://${host}:${port}`);
});

server.on("error", (error) => {
  console.error("Failed to start NGINX Plus Ingress Manager.", error);
  process.exit(1);
});
