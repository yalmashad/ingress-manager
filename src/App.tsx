import { useEffect, useRef, useState } from "react";
import YAML from "yaml";
import { fetchJson, uploadKubeconfig } from "./api";
import {
  appModeLabels,
  builderResourceKinds,
  combineYamlDocuments,
  getManifestActionLabel,
  type AppMode,
} from "./appMode";
import {
  buildGlobalConfigurationManifest,
  buildPolicyManifest,
  buildSecretManifest,
  buildTransportServerManifest,
  buildVirtualServerManifest,
  buildVirtualServerRouteManifest,
  defaultGlobalConfigurationForm,
  defaultPolicyForm,
  defaultSecretForm,
  defaultTransportServerForm,
  defaultVirtualServerForm,
  defaultVirtualServerRouteForm,
  parseGlobalConfigurationManifest,
  parsePolicyManifest,
  parseSecretManifest,
  parseTransportServerManifest,
  parseVirtualServerManifest,
  parseVirtualServerRouteManifest,
  type GlobalConfigurationForm,
  type PolicyForm,
  type SecretForm,
  type TransportServerForm,
  type VirtualServerForm,
  type VirtualServerRouteForm,
} from "./resourceBuilders";
import {
  GlobalConfigurationBuilderPanel,
  PolicyBuilderPanel,
  SecretBuilderPanel,
  TransportServerBuilderPanel,
  VirtualServerBuilderPanel,
  VirtualServerRouteBuilderPanel,
  type ClusterOptions,
} from "./builderPanels";
import { emptyManifest } from "./templates";
import { getInitialTheme, themeStorageKey, type Theme } from "./theme";

type SessionStatus = {
  connected: boolean;
  currentContext?: string;
  contexts?: string[];
  clusters?: string[];
  users?: string[];
};

type ResourceSummary = {
  apiVersion: string;
  kind: string;
  name: string;
  namespace?: string;
  creationTimestamp?: string;
  labels: Record<string, string>;
  state?: string | null;
  summary?: string | null;
};

type Overview = {
  cluster: {
    currentContext: string;
    contexts: string[];
    namespaces: string[];
  };
  controllers: Array<{
    apiVersion: string;
    kind: string;
    name: string;
    namespace: string;
    replicas: number | null;
    image: string;
    args: string[];
  }>;
  configMaps: ResourceSummary[];
  resources: Record<string, ResourceSummary[]>;
};

type Catalog = {
  resourceCatalog: Array<{
    kind: string;
    apiVersion: string;
    namespaced: boolean;
    docsUrl: string;
    description: string;
    commonFields: string[];
    examples: string[];
  }>;
};

type SelectedResource = {
  kind: string;
  name: string;
  namespace?: string;
};

type CreateOverlay = {
  kind: string;
  manifestText: string;
  onCreated?: (value: string) => void;
};

type ViewMode = "list" | "edit";

function badgeText(summary: ResourceSummary) {
  return summary.state || summary.namespace || "cluster";
}

function resourceKeyOf(resource: Pick<ResourceSummary, "name" | "namespace">) {
  return `${resource.namespace ?? "cluster"}::${resource.name}`;
}

function filterResourcesByNamespace(resources: ResourceSummary[], namespace: string) {
  if (namespace === "__all__") {
    return resources;
  }
  return resources.filter((resource) => (resource.namespace ?? "cluster") === namespace);
}

function effectiveNamespace(namespace: string) {
  return namespace === "__all__" ? "default" : namespace || "default";
}

function emptyClusterOptions(): ClusterOptions {
  return {
    namespaces: [],
    ingressClasses: [],
    policies: [],
    dosResources: [],
    tlsSecrets: [],
    listeners: [],
  };
}

function starterManifest(kind: string, namespace: string) {
  if (kind === "Policy") {
    return YAML.stringify({
      apiVersion: "k8s.nginx.org/v1",
      kind: "Policy",
      metadata: { name: "example-policy", namespace },
      spec: {
        rateLimit: {
          rate: "10r/s",
          key: "${binary_remote_addr}",
          zoneSize: "10M",
        },
      },
    });
  }

  if (kind === "VirtualServer") {
    return YAML.stringify({
      apiVersion: "k8s.nginx.org/v1",
      kind: "VirtualServer",
      metadata: { name: "example-virtualserver", namespace },
      spec: {
        host: "app.example.com",
        upstreams: [{ name: "app", service: "app-service", port: 80 }],
        routes: [{ path: "/", action: { pass: "app" } }],
      },
    });
  }

  if (kind === "GlobalConfiguration") {
    return YAML.stringify({
      apiVersion: "k8s.nginx.org/v1",
      kind: "GlobalConfiguration",
      metadata: { name: "example-globalconfiguration", namespace },
      spec: {
        listeners: [{ name: "http-8083", port: 8083, protocol: "HTTP" }],
      },
    });
  }

  if (kind === "TransportServer") {
    return YAML.stringify({
      apiVersion: "k8s.nginx.org/v1",
      kind: "TransportServer",
      metadata: { name: "example-transportserver", namespace },
      spec: {
        listener: { name: "tcp-listener", protocol: "TCP" },
        upstreams: [{ name: "tcp-app", service: "tcp-service", port: 9000 }],
        action: { pass: "tcp-app" },
      },
    });
  }

  if (kind === "VirtualServerRoute") {
    return YAML.stringify({
      apiVersion: "k8s.nginx.org/v1",
      kind: "VirtualServerRoute",
      metadata: { name: "example-virtualserverroute", namespace },
      spec: {
        host: "app.example.com",
        upstreams: [{ name: "app", service: "app-service", port: 80 }],
        subroutes: [{ path: "/", action: { pass: "app" } }],
      },
    });
  }

  if (kind === "Secret") {
    return YAML.stringify({
      apiVersion: "v1",
      kind: "Secret",
      metadata: { name: "example-tls-secret", namespace },
      type: "kubernetes.io/tls",
      stringData: {
        "tls.crt": "-----BEGIN CERTIFICATE-----\nPASTE_CERT_HERE\n-----END CERTIFICATE-----",
        "tls.key": "-----BEGIN PRIVATE KEY-----\nPASTE_KEY_HERE\n-----END PRIVATE KEY-----",
      },
    });
  }

  if (kind === "DosProtectedResource") {
    return YAML.stringify({
      apiVersion: "appprotectdos.f5.com/v1beta1",
      kind: "DosProtectedResource",
      metadata: { name: "example-dos-policy", namespace },
      spec: {
        enable: true,
      },
    });
  }

  return YAML.stringify({
    apiVersion: "k8s.nginx.org/v1",
    kind,
    metadata: { name: `example-${kind.toLowerCase()}`, namespace },
    spec: {},
  });
}

function App() {
  const [theme, setTheme] = useState<Theme>(() =>
    getInitialTheme(
      window.localStorage.getItem(themeStorageKey),
      window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
    ),
  );
  const [status, setStatus] = useState<SessionStatus>({ connected: false });
  const [appMode, setAppMode] = useState<AppMode | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [clusterOptions, setClusterOptions] = useState<ClusterOptions>(() => emptyClusterOptions());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [kubeconfigText, setKubeconfigText] = useState("");
  const [selected, setSelected] = useState<SelectedResource | null>(null);
  const [manifestText, setManifestText] = useState(emptyManifest);
  const [saving, setSaving] = useState(false);
  const [loadingResource, setLoadingResource] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createKind, setCreateKind] = useState("VirtualServer");
  const [createNamespace, setCreateNamespace] = useState("default");
  const [policyForm, setPolicyForm] = useState<PolicyForm>(defaultPolicyForm());
  const [secretForm, setSecretForm] = useState<SecretForm>(defaultSecretForm());
  const [virtualServerForm, setVirtualServerForm] = useState<VirtualServerForm>(defaultVirtualServerForm());
  const [globalConfigurationForm, setGlobalConfigurationForm] = useState<GlobalConfigurationForm>(defaultGlobalConfigurationForm());
  const [transportServerForm, setTransportServerForm] = useState<TransportServerForm>(defaultTransportServerForm());
  const [virtualServerRouteForm, setVirtualServerRouteForm] = useState<VirtualServerRouteForm>(defaultVirtualServerRouteForm());
  const [createOverlay, setCreateOverlay] = useState<CreateOverlay | null>(null);
  const [overlaySaving, setOverlaySaving] = useState(false);
  const skipManifestParseRef = useRef(false);
  const [selectedResourceKeys, setSelectedResourceKeys] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [generatedManifests, setGeneratedManifests] = useState<string[]>([]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  const activeKind = selected?.kind ?? createKind;
  const builderKind =
    activeKind === "Policy" ||
    activeKind === "Secret" ||
    activeKind === "VirtualServer" ||
    activeKind === "GlobalConfiguration" ||
    activeKind === "TransportServer" ||
    activeKind === "VirtualServerRoute"
      ? activeKind
      : null;

  useEffect(() => {
    if (!builderKind) return;
    const nextManifest =
      builderKind === "Policy"
        ? buildPolicyManifest(policyForm)
        : builderKind === "Secret"
          ? buildSecretManifest(secretForm)
        : builderKind === "VirtualServer"
          ? buildVirtualServerManifest(virtualServerForm)
          : builderKind === "GlobalConfiguration"
            ? buildGlobalConfigurationManifest(globalConfigurationForm)
            : builderKind === "TransportServer"
              ? buildTransportServerManifest(transportServerForm)
              : buildVirtualServerRouteManifest(virtualServerRouteForm);
    const serialized = YAML.stringify(nextManifest);
    setManifestText((current) => {
      if (current === serialized) {
        return current;
      }
      skipManifestParseRef.current = true;
      return serialized;
    });
  }, [
    builderKind,
    policyForm,
    secretForm,
    virtualServerForm,
    globalConfigurationForm,
    transportServerForm,
    virtualServerRouteForm,
  ]);

  async function refreshOverview() {
    const [nextStatus, nextCatalog] = await Promise.all([
      fetchJson<SessionStatus>("/api/session/status"),
      fetchJson<Catalog>("/api/catalog"),
    ]);
    setStatus(nextStatus);
    setCatalog(nextCatalog);

    if (nextStatus.connected) {
      const [nextOverview, nextOptions] = await Promise.all([
        fetchJson<Overview>("/api/overview"),
        fetchJson<ClusterOptions>("/api/options"),
      ]);
      setOverview(nextOverview);
      setClusterOptions(nextOptions);
      if (createNamespace !== "__all__" && nextOptions.namespaces.length > 0 && !nextOptions.namespaces.includes(createNamespace)) {
        setCreateNamespace(nextOptions.namespaces[0]);
      }
    } else {
      setOverview(null);
      setClusterOptions(emptyClusterOptions());
    }
  }

  useEffect(() => {
    if (appMode !== "manager") return;
    void refreshOverview().catch((err: Error) => setError(err.message));
  }, [appMode]);

  useEffect(() => {
    if (skipManifestParseRef.current) {
      skipManifestParseRef.current = false;
      return;
    }

    try {
      const parsed = YAML.parse(manifestText) as Record<string, unknown> | null;
      if (!parsed || typeof parsed !== "object") return;

      if (parsed.kind === "Policy") setPolicyForm(parsePolicyManifest(parsed));
      if (parsed.kind === "Secret") setSecretForm(parseSecretManifest(parsed));
      if (parsed.kind === "VirtualServer") setVirtualServerForm(parseVirtualServerManifest(parsed));
      if (parsed.kind === "GlobalConfiguration") setGlobalConfigurationForm(parseGlobalConfigurationManifest(parsed));
      if (parsed.kind === "TransportServer") setTransportServerForm(parseTransportServerManifest(parsed));
      if (parsed.kind === "VirtualServerRoute") setVirtualServerRouteForm(parseVirtualServerRouteManifest(parsed));
    } catch {
      // Preserve the last valid builder state while the user edits raw YAML.
    }
  }, [manifestText]);

  async function handleImport() {
    try {
      setError(null);
      setNotice(null);
      const nextStatus = (await uploadKubeconfig(selectedFile, kubeconfigText)) as SessionStatus;
      setStatus(nextStatus);
      setSelectedFile(null);
      setKubeconfigText("");
      const [nextOverview, nextCatalog, nextOptions] = await Promise.all([
        fetchJson<Overview>("/api/overview"),
        fetchJson<Catalog>("/api/catalog"),
        fetchJson<ClusterOptions>("/api/options"),
      ]);
      setOverview(nextOverview);
      setCatalog(nextCatalog);
      setClusterOptions(nextOptions);
      if (nextOptions.namespaces.length > 0) {
        setCreateNamespace(nextOptions.namespaces[0]);
      }
      setNotice(`Connected to ${nextStatus.currentContext ?? "the selected cluster"}.`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function selectMode(nextMode: AppMode) {
    setAppMode(nextMode);
    setError(null);
    setNotice(null);
    setSelected(null);
    setSelectedResourceKeys([]);
    setCreateOverlay(null);
    setGeneratedManifests([]);

    if (nextMode === "generator") {
      setStatus({ connected: false });
      setCatalog(null);
      setOverview(null);
      setClusterOptions(emptyClusterOptions());
      setViewMode("list");
      setCreateKind("VirtualServer");
      setCreateNamespace("default");
      setManifestText(emptyManifest);
    } else {
      setViewMode("list");
      setManifestText(emptyManifest);
    }
  }

  async function loadResource(nextSelected: SelectedResource) {
    try {
      setLoadingResource(true);
      setError(null);
      setSelected(nextSelected);
      setViewMode("edit");
      const params = new URLSearchParams({
        kind: nextSelected.kind,
        name: nextSelected.name,
      });
      if (nextSelected.namespace) params.set("namespace", nextSelected.namespace);
      const resource = await fetchJson<Record<string, unknown>>(`/api/resource?${params.toString()}`);
      skipManifestParseRef.current = false;
      setManifestText(YAML.stringify(resource));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingResource(false);
    }
  }

  async function createTemplate(kind: string) {
    try {
      setSelected(null);
      setError(null);
      setCreateKind(kind);
      setViewMode("edit");
      if (kind === "Policy") {
        const next = defaultPolicyForm();
        next.namespace = effectiveNamespace(createNamespace);
        setPolicyForm(next);
        skipManifestParseRef.current = true;
        setManifestText(
          YAML.stringify({
            apiVersion: "k8s.nginx.org/v1",
            kind: "Policy",
            metadata: { name: next.name, namespace: next.namespace },
            spec: {},
          }),
        );
        return;
      }
      if (kind === "VirtualServer") {
        const next = defaultVirtualServerForm();
        next.namespace = effectiveNamespace(createNamespace);
        setVirtualServerForm(next);
        skipManifestParseRef.current = true;
        setManifestText(
          YAML.stringify({
            apiVersion: "k8s.nginx.org/v1",
            kind: "VirtualServer",
            metadata: { name: next.name, namespace: next.namespace },
            spec: { host: next.host, upstreams: [], routes: [] },
          }),
        );
        return;
      }
      if (kind === "GlobalConfiguration") {
        const next = defaultGlobalConfigurationForm();
        next.namespace = effectiveNamespace(createNamespace);
        setGlobalConfigurationForm(next);
        skipManifestParseRef.current = true;
        setManifestText(
          YAML.stringify({
            apiVersion: "k8s.nginx.org/v1",
            kind: "GlobalConfiguration",
            metadata: { name: next.name, namespace: next.namespace },
            spec: { listeners: [] },
          }),
        );
        return;
      }
      if (kind === "TransportServer") {
        const next = defaultTransportServerForm();
        next.namespace = effectiveNamespace(createNamespace);
        setTransportServerForm(next);
        skipManifestParseRef.current = true;
        setManifestText(
          YAML.stringify({
            apiVersion: "k8s.nginx.org/v1",
            kind: "TransportServer",
            metadata: { name: next.name, namespace: next.namespace },
            spec: { listener: { name: next.listenerName, protocol: next.listenerProtocol }, upstreams: [] },
          }),
        );
        return;
      }
      if (kind === "VirtualServerRoute") {
        const next = defaultVirtualServerRouteForm();
        next.namespace = effectiveNamespace(createNamespace);
        setVirtualServerRouteForm(next);
        skipManifestParseRef.current = true;
        setManifestText(
          YAML.stringify({
            apiVersion: "k8s.nginx.org/v1",
            kind: "VirtualServerRoute",
            metadata: { name: next.name, namespace: next.namespace },
            spec: { host: next.host, upstreams: [], subroutes: [] },
          }),
        );
        return;
      }
      if (kind === "Secret") {
        const next = defaultSecretForm();
        next.namespace = effectiveNamespace(createNamespace);
        setSecretForm(next);
        skipManifestParseRef.current = true;
        setManifestText(YAML.stringify(buildSecretManifest(next)));
        setNotice("Loaded a TLS Secret builder.");
        return;
      }
      if (kind === "DosProtectedResource") {
        skipManifestParseRef.current = true;
        setManifestText(starterManifest("DosProtectedResource", effectiveNamespace(createNamespace)));
        setNotice("Loaded a DOS resource starter manifest.");
        return;
      }
      skipManifestParseRef.current = true;
      setManifestText(starterManifest(kind, effectiveNamespace(createNamespace)));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleCreateRelatedResource(
    kind: string,
    options?: { namespace?: string; onCreated?: (value: string) => void; initialManifest?: string },
  ) {
    setCreateOverlay({
      kind,
      manifestText: options?.initialManifest ?? starterManifest(kind, options?.namespace ?? effectiveNamespace(createNamespace)),
      onCreated: options?.onCreated,
    });
  }

  async function saveManifest() {
    try {
      setSaving(true);
      setError(null);
      const parsed = YAML.parse(manifestText) as Record<string, unknown>;
      if (appMode === "generator") {
        await copyYaml([manifestText]);
        return;
      }
      await submitResourceManifest(parsed, {
        onCreated: (_value) => {
          const metadata = parsed.metadata as Record<string, unknown> | undefined;
          if (parsed.kind && metadata?.name) {
            setSelected({
              kind: String(parsed.kind),
              name: String(metadata.name),
              namespace: typeof metadata.namespace === "string" ? metadata.namespace : undefined,
            });
          }
        },
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function callOnCreated(
    manifest: Record<string, unknown>,
    options?: { onCreated?: (value: string) => void },
  ) {
    if (!options?.onCreated) return;

    const metadata = (manifest.metadata ?? {}) as Record<string, unknown>;
    if (manifest.kind === "GlobalConfiguration") {
      const listeners = ((((manifest.spec ?? {}) as Record<string, unknown>).listeners ?? []) as Array<Record<string, unknown>>);
      options.onCreated(String(listeners[0]?.name ?? ""));
    } else if (typeof metadata.namespace === "string" && typeof metadata.name === "string") {
      options.onCreated(`${metadata.namespace}/${metadata.name}`);
    } else if (typeof metadata.name === "string") {
      options.onCreated(String(metadata.name));
    }
  }

  async function submitResourceManifest(
    manifest: Record<string, unknown>,
    options?: { onCreated?: (value: string) => void },
  ) {
    const metadata = (manifest.metadata ?? {}) as Record<string, unknown>;

    if (appMode === "generator") {
      const serialized = YAML.stringify(manifest);
      setGeneratedManifests((current) => (current.includes(serialized) ? current : [...current, serialized]));
      callOnCreated(manifest, options);
      setNotice(`${String(manifest.kind)} ${String(metadata.name ?? "")} added to generated YAML.`);
      return;
    }

    await fetchJson("/api/resource", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manifest),
    });
    await refreshOverview();
    callOnCreated(manifest, options);
    setNotice(`${String(manifest.kind)} ${String(metadata.name ?? "")} saved.`);
  }

  async function copyYaml(extraManifests: string[] = []) {
    const yamlText = combineYamlDocuments([...generatedManifests, ...extraManifests]);

    if (!yamlText) {
      throw new Error("No YAML has been generated yet.");
    }

    await copyTextToClipboard(yamlText);
    setNotice(
      yamlText.includes("\n---\n")
        ? `${yamlText.split("\n---\n").length} YAML documents copied.`
        : "YAML copied to clipboard.",
    );
  }

  async function copyTextToClipboard(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch {
      // Fall back to a temporary selection below when the Clipboard API rejects.
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!copied) {
      throw new Error("Clipboard access is not available in this browser. Select the YAML and copy it manually.");
    }
  }

  async function saveOverlayManifest() {
    if (!createOverlay) return;

    try {
      setOverlaySaving(true);
      setError(null);
      const parsed = YAML.parse(createOverlay.manifestText) as Record<string, unknown>;
      await submitResourceManifest(parsed, {
        onCreated: createOverlay.onCreated,
      });
      setCreateOverlay(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOverlaySaving(false);
    }
  }

  async function deleteSelectedResource() {
    if (!selected) return;
    if (!window.confirm(`Delete ${selected.kind} ${selected.name}? This cannot be undone.`)) return;

    try {
      setDeleting(true);
      setError(null);
      const params = new URLSearchParams({ kind: selected.kind, name: selected.name });
      if (selected.namespace) params.set("namespace", selected.namespace);
      await fetchJson(`/api/resource?${params.toString()}`, { method: "DELETE" });
      setNotice(`${selected.kind} ${selected.name} deleted.`);
      setSelected(null);
      setManifestText(emptyManifest);
      await refreshOverview();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  const sidebarResourceKinds =
    appMode === "generator"
      ? builderResourceKinds
      : (catalog?.resourceCatalog ?? [])
          .map((entry) => entry.kind)
          .filter((kind) => !["Deployment", "DaemonSet", "StatefulSet"].includes(kind));
  const activeResourceItems = filterResourcesByNamespace(
    createKind === "ConfigMap" ? overview?.configMaps ?? [] : overview?.resources[createKind] ?? [],
    createNamespace,
  );

  useEffect(() => {
    setSelectedResourceKeys([]);
  }, [createKind]);

  async function deleteSelectedResources() {
    if (selectedResourceKeys.length === 0) return;
    if (!window.confirm(`Delete ${selectedResourceKeys.length} ${createKind} resource(s)? This cannot be undone.`)) return;

    try {
      setDeleting(true);
      setError(null);
      const targets = activeResourceItems.filter((resource) => selectedResourceKeys.includes(resourceKeyOf(resource)));
      for (const resource of targets) {
        const params = new URLSearchParams({ kind: createKind, name: resource.name });
        if (resource.namespace) params.set("namespace", resource.namespace);
        await fetchJson(`/api/resource?${params.toString()}`, { method: "DELETE" });
      }
      if (selected && targets.some((resource) => resource.name === selected.name && resource.namespace === selected.namespace)) {
        setSelected(null);
        setManifestText(emptyManifest);
        setViewMode("list");
      }
      setSelectedResourceKeys([]);
      setNotice(`${targets.length} ${createKind} resource(s) deleted.`);
      await refreshOverview();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <p className="eyebrow">{appMode ? appModeLabels[appMode] : "Ingress workspace"}</p>
          <h1>NGINX Plus Ingress Manager</h1>
          <p className="lede">
            {appMode === "generator"
              ? "Build NGINX Ingress manifests without connecting to a Kubernetes cluster, then copy YAML for manual apply."
              : "Inspect the controller, import kubeconfig, review live NGINX resources, and apply safe edits back to your remote clusters."}
          </p>
          <div className="theme-toggle" role="group" aria-label="Theme">
            {(["light", "dark"] as const).map((option) => (
              <button
                key={option}
                className={theme === option ? "active" : ""}
                type="button"
                onClick={() => setTheme(option)}
                aria-pressed={theme === option}
              >
                {option === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>

        {appMode && (
          <section className="panel">
            <div className="panel-heading">
              <h2>Mode</h2>
              <span className="pill">{appModeLabels[appMode]}</span>
            </div>
            <div className="mode-switcher" role="group" aria-label="Application mode">
              <button
                type="button"
                className={appMode === "manager" ? "active" : ""}
                onClick={() => selectMode("manager")}
              >
                Manager
              </button>
              <button
                type="button"
                className={appMode === "generator" ? "active" : ""}
                onClick={() => selectMode("generator")}
              >
                Config-Generator
              </button>
            </div>
          </section>
        )}

        {appMode === "manager" && (
        <section className="panel">
          <div className="panel-heading">
            <h2>Connection</h2>
            <span className={`status-dot ${status.connected ? "online" : "offline"}`} />
          </div>
          <p className="muted">Current context: {status.currentContext ?? "not connected"}</p>
          <label className="field">
            <span>Kubeconfig file</span>
            <input type="file" accept=".yaml,.yml,.conf,.config,*/*" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
          </label>
          <label className="field">
            <span>Or paste kubeconfig</span>
            <textarea
              rows={8}
              placeholder="apiVersion: v1&#10;clusters: ..."
              value={kubeconfigText}
              onChange={(event) => setKubeconfigText(event.target.value)}
            />
          </label>
          <button className="primary" onClick={() => void handleImport()}>
            Import kubeconfig
          </button>
        </section>
        )}

        {(appMode === "generator" || overview) && (
          <section className="panel scroller">
            <div className="panel-heading">
              <h2>Resources</h2>
              <span className="pill">{sidebarResourceKinds.length} kinds</span>
            </div>
            <div className="resource-kind-list">
              {sidebarResourceKinds.map((kind) => {
                const count =
                  appMode === "generator"
                    ? null
                    : kind === "ConfigMap"
                      ? overview?.configMaps.length ?? 0
                      : overview?.resources[kind]?.length ?? 0;
                return (
                  <button
                    key={kind}
                    className={`resource-kind-row ${createKind === kind ? "active" : ""}`}
                    onClick={() => {
                      setCreateKind(kind);
                      setSelected(null);
                      setManifestText(emptyManifest);
                      setViewMode("list");
                    }}
                  >
                    <span>{kind}</span>
                    <strong>{appMode === "generator" ? "build" : count}</strong>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </aside>

      <main className="main">
        {error && <div className="banner error">{error}</div>}
        {notice && <div className="banner success">{notice}</div>}

        {!appMode && (
          <section className="mode-choice empty-state">
            <h3>Choose how you want to work</h3>
            <div className="mode-choice-grid">
              <button type="button" className="mode-card" onClick={() => selectMode("manager")}>
                <span>Manager mode</span>
                <strong>Connect to Kubernetes</strong>
                <small>Import kubeconfig, list resources, and apply changes directly to the selected cluster.</small>
              </button>
              <button type="button" className="mode-card" onClick={() => selectMode("generator")}>
                <span>Config-Generator mode</span>
                <strong>Generate YAML only</strong>
                <small>Use the builders without cluster access, copy YAML, and apply it manually later.</small>
              </button>
            </div>
          </section>
        )}

        {appMode === "manager" && !status.connected && (
          <section className="empty-state">
            <h3>Import a kubeconfig to begin</h3>
            <p>
              The backend keeps kubeconfig server-side for this browser session, then uses the Kubernetes API to list
              your NGINX controller workloads, ConfigMaps, and `k8s.nginx.org` custom resources.
            </p>
          </section>
        )}

        {overview && (
          <>
            <section className="stats-grid">
              <article className="stat-card">
                <span>Context</span>
                <strong>{overview.cluster.currentContext}</strong>
              </article>
              <article className="stat-card">
                <span>Controllers</span>
                <strong>{overview.controllers.length}</strong>
              </article>
              <article className="stat-card">
                <span>ConfigMaps</span>
                <strong>{overview.configMaps.length}</strong>
              </article>
              <article className="stat-card">
                <span>Custom resources</span>
                <strong>{Object.values(overview.resources).reduce((total, items) => total + items.length, 0)}</strong>
              </article>
            </section>
          </>
        )}

        {(appMode === "generator" || overview) && (
          <>
            <section className={`workspace ${viewMode === "edit" ? "expanded" : "list-only"}`}>
              {viewMode === "list" && (
              <div className="editor-panel resource-browser resource-browser-wide">
                <div className="panel-heading">
                  <h3>{createKind}</h3>
                  <div className="editor-actions">
                    <button className="secondary" onClick={() => void createTemplate(createKind)}>
                      {appMode === "generator" ? "Generate" : "Create"}
                    </button>
                    {appMode === "manager" && (
                      <button className="danger" disabled={deleting || selectedResourceKeys.length === 0} onClick={() => void deleteSelectedResources()}>
                        {deleting ? "Deleting..." : `Delete${selectedResourceKeys.length ? ` (${selectedResourceKeys.length})` : ""}`}
                      </button>
                    )}
                  </div>
                </div>
                <label className="field namespace-filter">
                  <span>Namespace</span>
                  <select value={createNamespace} onChange={(event) => setCreateNamespace(event.target.value)}>
                    {["__all__", ...(clusterOptions.namespaces.length ? clusterOptions.namespaces : ["default"])].map((namespace) => (
                      <option key={namespace} value={namespace}>
                        {namespace === "__all__" ? "All namespaces" : namespace}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="resource-group">
                  {appMode === "generator" ? (
                    <p className="muted">No cluster connection is required. Generate a {createKind} manifest and copy the YAML.</p>
                  ) : activeResourceItems.length === 0 ? (
                    <p className="muted">No {createKind} resources found in the cluster.</p>
                  ) : (
                    activeResourceItems.map((resource) => {
                      const resourceKey = resourceKeyOf(resource);
                      const isActive =
                        selected?.kind === createKind && selected.name === resource.name && selected.namespace === resource.namespace;
                      return (
                        <button
                          key={`${createKind}-${resource.namespace}-${resource.name}`}
                          className={`resource-row ${isActive ? "active" : ""}`}
                          onClick={() => void loadResource({ kind: createKind, name: resource.name, namespace: resource.namespace })}
                        >
                          <span className="resource-row-main">
                            <label className="resource-check" onClick={(event) => event.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedResourceKeys.includes(resourceKey)}
                                onChange={(event) =>
                                  setSelectedResourceKeys((current) =>
                                    event.target.checked ? [...current, resourceKey] : current.filter((item) => item !== resourceKey),
                                  )
                                }
                              />
                            </label>
                            <span>
                              {resource.name}
                              <small>{resource.namespace ?? "cluster"}</small>
                            </span>
                          </span>
                          <strong>{badgeText(resource)}</strong>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              )}

              {viewMode === "edit" && (
              <>
              {builderKind === "Policy" && (
                <PolicyBuilderPanel form={policyForm} setForm={setPolicyForm} setManifestText={setManifestText} setNotice={setNotice} clusterOptions={clusterOptions} onSubmitManifest={submitResourceManifest} onCreateResource={handleCreateRelatedResource} />
              )}
              {builderKind === "Secret" && (
                <SecretBuilderPanel form={secretForm} setForm={setSecretForm} setManifestText={setManifestText} setNotice={setNotice} clusterOptions={clusterOptions} onSubmitManifest={submitResourceManifest} onCreateResource={handleCreateRelatedResource} />
              )}
              {builderKind === "VirtualServer" && (
                <VirtualServerBuilderPanel form={virtualServerForm} setForm={setVirtualServerForm} setManifestText={setManifestText} setNotice={setNotice} clusterOptions={clusterOptions} onSubmitManifest={submitResourceManifest} onCreateResource={handleCreateRelatedResource} />
              )}
              {builderKind === "GlobalConfiguration" && (
                <GlobalConfigurationBuilderPanel form={globalConfigurationForm} setForm={setGlobalConfigurationForm} setManifestText={setManifestText} setNotice={setNotice} clusterOptions={clusterOptions} onSubmitManifest={submitResourceManifest} onCreateResource={handleCreateRelatedResource} />
              )}
              {builderKind === "TransportServer" && (
                <TransportServerBuilderPanel form={transportServerForm} setForm={setTransportServerForm} setManifestText={setManifestText} setNotice={setNotice} clusterOptions={clusterOptions} onSubmitManifest={submitResourceManifest} onCreateResource={handleCreateRelatedResource} />
              )}
              {builderKind === "VirtualServerRoute" && (
                <VirtualServerRouteBuilderPanel form={virtualServerRouteForm} setForm={setVirtualServerRouteForm} setManifestText={setManifestText} setNotice={setNotice} clusterOptions={clusterOptions} onSubmitManifest={submitResourceManifest} onCreateResource={handleCreateRelatedResource} />
              )}

              <div className="editor-panel">
                <div className="panel-heading">
                  <h3>{selected ? `${selected.kind} ${selected.name}` : `New ${createKind}`}</h3>
                  <div className="editor-actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        setSelected(null);
                        setManifestText(emptyManifest);
                        setViewMode("list");
                      }}
                    >
                      Cancel
                    </button>
                    {appMode === "manager" && selected && (
                      <button className="danger" disabled={deleting} onClick={() => void deleteSelectedResource()}>
                        {deleting ? "Deleting..." : "Delete"}
                      </button>
                    )}
                    <button className="primary" disabled={saving} onClick={() => void saveManifest()}>
                      {getManifestActionLabel(appMode ?? "manager", saving)}
                    </button>
                  </div>
                </div>
                <textarea
                  className="manifest-editor"
                  value={manifestText}
                  onChange={(event) => {
                    skipManifestParseRef.current = false;
                    setManifestText(event.target.value);
                  }}
                />
              </div>
              </>
              )}
            </section>
          </>
        )}

        {createOverlay && (
          <div className="overlay-backdrop">
            <div className="overlay-panel">
              <div className="panel-heading">
                <h3>Create {createOverlay.kind}</h3>
                <div className="editor-actions">
                  <button className="secondary" onClick={() => setCreateOverlay(null)}>
                    Cancel
                  </button>
                  <button className="primary" disabled={overlaySaving} onClick={() => void saveOverlayManifest()}>
                    {appMode === "generator" ? (overlaySaving ? "Adding..." : "Add YAML") : (overlaySaving ? "Applying..." : "Apply")}
                  </button>
                </div>
              </div>
              <textarea
                className="manifest-editor overlay-editor"
                value={createOverlay.manifestText}
                onChange={(event) =>
                  setCreateOverlay((current) => (current ? { ...current, manifestText: event.target.value } : current))
                }
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
