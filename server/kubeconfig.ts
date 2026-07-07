import YAML from "yaml";

type KubeconfigDocument = {
  clusters?: Array<{
    cluster?: {
      server?: string;
      "tls-server-name"?: string;
    };
  }>;
  contexts?: Array<{
    name?: string;
  }>;
  "current-context"?: string;
};

const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);

export function rewriteLoopbackClusterServers(kubeconfig: string, rewriteHost: string | undefined) {
  if (!rewriteHost) {
    return kubeconfig;
  }

  const parsed = YAML.parse(kubeconfig) as KubeconfigDocument | null;
  if (!parsed?.clusters) {
    return kubeconfig;
  }

  let changed = false;
  for (const entry of parsed.clusters) {
    const cluster = entry.cluster;
    const server = cluster?.server;
    if (!server) continue;

    try {
      const url = new URL(server);
      if (!loopbackHosts.has(url.hostname)) continue;

      const tlsServerName = cluster["tls-server-name"] ?? url.hostname;
      url.hostname = rewriteHost;
      entry.cluster = {
        ...cluster,
        server: url.toString(),
        "tls-server-name": tlsServerName,
      };
      changed = true;
    } catch {
      // Leave non-URL server values untouched so Kubernetes validation owns the error.
    }
  }

  return changed ? YAML.stringify(parsed) : kubeconfig;
}

export function setKubeconfigCurrentContext(kubeconfig: string, contextName: string) {
  const parsed = YAML.parse(kubeconfig) as KubeconfigDocument | null;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid kubeconfig document.");
  }

  const contexts = Array.isArray(parsed.contexts) ? parsed.contexts : [];
  if (!contexts.some((context) => context?.name === contextName)) {
    throw new Error(`Context "${contextName}" was not found in the uploaded kubeconfig.`);
  }

  parsed["current-context"] = contextName;
  return YAML.stringify(parsed);
}
