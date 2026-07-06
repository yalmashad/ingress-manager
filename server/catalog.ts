export type ResourceCatalogEntry = {
  kind: string;
  apiVersion: string;
  namespaced: boolean;
  plural?: string;
  docsUrl: string;
  description: string;
  commonFields: string[];
  examples: string[];
};

export const resourceCatalog: ResourceCatalogEntry[] = [
  {
    kind: "VirtualServer",
    apiVersion: "k8s.nginx.org/v1",
    namespaced: true,
    plural: "virtualservers",
    docsUrl: "https://docs.nginx.com/nginx-ingress-controller/configuration/virtualserver-and-virtualserverroute-resources/",
    description: "HTTP and HTTPS application routing with hosts, routes, upstreams, TLS, policies, and advanced matching.",
    commonFields: ["spec.host", "spec.tls", "spec.upstreams", "spec.routes", "spec.policies"],
    examples: ["advanced-routing", "basic-configuration", "session-persistence", "traffic-splitting", "tls-passthrough"]
  },
  {
    kind: "VirtualServerRoute",
    apiVersion: "k8s.nginx.org/v1",
    namespaced: true,
    plural: "virtualserverroutes",
    docsUrl: "https://docs.nginx.com/nginx-ingress-controller/configuration/virtualserver-and-virtualserverroute-resources/",
    description: "Delegated route fragments for VirtualServers, including splits, matches, and policy attachments.",
    commonFields: ["spec.host", "spec.upstreams", "spec.subroutes"],
    examples: ["advanced-routing", "traffic-splitting", "vsr-route-selector-crossnamespace", "vsr-route-selector-policies"]
  },
  {
    kind: "TransportServer",
    apiVersion: "k8s.nginx.org/v1",
    namespaced: true,
    plural: "transportservers",
    docsUrl: "https://docs.nginx.com/nginx-ingress-controller/configuration/transportserver-resource/",
    description: "TCP, UDP, and TLS passthrough configuration backed by listeners and upstreams.",
    commonFields: ["spec.listener", "spec.host", "spec.upstreams", "spec.action", "spec.tls"],
    examples: ["tls-passthrough", "transport-server-sni"]
  },
  {
    kind: "Policy",
    apiVersion: "k8s.nginx.org/v1",
    namespaced: true,
    plural: "policies",
    docsUrl: "https://docs.nginx.com/nginx-ingress-controller/configuration/policy-resource/",
    description: "Reusable security and traffic policies such as JWT, rate limiting, access control, mTLS, WAF, and API key settings.",
    commonFields: ["spec.accessControl", "spec.rateLimit", "spec.jwt", "spec.egressMTLS", "spec.apiKey"],
    examples: ["access-control", "api-key", "basic-auth", "jwt", "mtls"]
  },
  {
    kind: "GlobalConfiguration",
    apiVersion: "k8s.nginx.org/v1",
    namespaced: true,
    plural: "globalconfigurations",
    docsUrl: "https://docs.nginx.com/nginx-ingress-controller/configuration/global-configuration/globalconfiguration-resource/",
    description: "Cluster-scoped listener definitions used by TransportServer and listener-aware routing resources.",
    commonFields: ["spec.listeners"],
    examples: ["custom-listeners", "tls-passthrough", "transport-server-sni"]
  },
  {
    kind: "ConfigMap",
    apiVersion: "v1",
    namespaced: true,
    docsUrl: "https://docs.nginx.com/nginx-ingress-controller/configuration/global-configuration/configmap-resource/",
    description: "Controller-level NGINX tuning via ConfigMap keys such as timeouts, buffer sizes, logs, protocols, and snippets.",
    commonFields: ["data.proxy-connect-timeout", "data.proxy-read-timeout", "data.client-max-body-size", "data.http-snippets"],
    examples: ["global-configuration", "proxy-buffer-configuration", "grpc", "rewrite"]
  },
  {
    kind: "Secret",
    apiVersion: "v1",
    namespaced: true,
    docsUrl: "https://docs.nginx.com/nginx-ingress-controller/configuration/virtualserver-and-virtualserverroute-resources/#virtualservertls",
    description: "TLS secrets of type kubernetes.io/tls that VirtualServer and TransportServer resources can reference for certificates.",
    commonFields: ["type", "data.tls.crt", "data.tls.key"],
    examples: ["tls"]
  },
  {
    kind: "Deployment",
    apiVersion: "apps/v1",
    namespaced: true,
    docsUrl: "https://docs.nginx.com/nginx-ingress-controller/configuration/global-configuration/command-line-arguments/",
    description: "Ingress Controller runtime configuration through pod args, environment variables, image version, service account, and volume mounts.",
    commonFields: ["spec.template.spec.containers[].args", "spec.template.spec.containers[].env", "spec.replicas"],
    examples: ["install-helm", "install-manifests", "enable-snippets"]
  },
  {
    kind: "DaemonSet",
    apiVersion: "apps/v1",
    namespaced: true,
    docsUrl: "https://docs.nginx.com/nginx-ingress-controller/configuration/global-configuration/command-line-arguments/",
    description: "DaemonSet-based controller deployment for node-local ingress processing with editable runtime flags and pod settings.",
    commonFields: ["spec.template.spec.containers[].args", "spec.template.spec.containers[].env", "spec.updateStrategy"],
    examples: ["install-manifests"]
  },
  {
    kind: "StatefulSet",
    apiVersion: "apps/v1",
    namespaced: true,
    docsUrl: "https://docs.nginx.com/nginx-ingress-controller/installation/installing-nic/installation-with-manifests/",
    description: "StatefulSet-based controller deployment, including stable identity and persistent pod settings where used.",
    commonFields: ["spec.template.spec.containers[].args", "spec.template.spec.containers[].env", "spec.serviceName"],
    examples: ["install-manifests"]
  }
];

export const officialExampleDirectories = [
  "access-control",
  "advanced-routing",
  "api-key",
  "app-protect-dos",
  "app-protect-waf",
  "app-protect-waf-v5",
  "backup-directive",
  "basic-auth",
  "basic-configuration",
  "canary",
  "custom-listeners",
  "dos-protected-resource",
  "e2e-mtls",
  "egress-mtls",
  "external-dns",
  "fault-injection",
  "grpc",
  "header-modification",
  "jwt",
  "listener-configuration",
  "mtls",
  "rate-limit",
  "request-uri-rewrite",
  "response-headers",
  "service-insight",
  "session-persistence",
  "tls-passthrough",
  "traffic-splitting",
  "transport-server-sni",
  "vsr-route-selector-crossnamespace",
  "vsr-route-selector-policies",
  "zone-sync"
];
