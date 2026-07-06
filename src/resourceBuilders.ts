import YAML from "yaml";

export type PolicyType =
  | "accessControl"
  | "rateLimit"
  | "apiKey"
  | "basicAuth"
  | "jwt"
  | "ingressMTLS"
  | "egressMTLS"
  | "oidc"
  | "waf"
  | "cache"
  | "cors";

export type TransportListenerProtocol = "TCP" | "UDP" | "TLS_PASSTHROUGH";
export type ListenerProtocol = "HTTP" | "TCP" | "UDP";
export type VerifyClientMode = "on" | "off" | "optional" | "optional_no_ca";
export type RouteActionType = "pass" | "proxy" | "redirect" | "return";
export type UpstreamType = "http" | "grpc";

export type PolicyForm = {
  name: string;
  namespace: string;
  ingressClassName: string;
  policyType: PolicyType;
  accessAllow: string;
  accessDeny: string;
  rate: string;
  zoneSize: string;
  key: string;
  burst: string;
  delay: string;
  noDelay: boolean;
  dryRun: boolean;
  logLevel: string;
  rejectCode: string;
  scale: boolean;
  conditionDefault: boolean;
  conditionJwtClaim: string;
  conditionJwtMatch: string;
  conditionVarName: string;
  conditionVarMatch: string;
  apiKeyClientSecret: string;
  apiKeySuppliedHeader: string;
  apiKeySuppliedQuery: string;
  basicAuthSecret: string;
  basicAuthRealm: string;
  jwtRealm: string;
  jwtSecret: string;
  jwtToken: string;
  jwtJwksUri: string;
  jwtKeyCache: string;
  jwtTrustedCertSecret: string;
  jwtSslVerify: boolean;
  jwtSslVerifyDepth: string;
  jwtSniEnabled: boolean;
  jwtSniName: string;
  ingressMtlsClientCertSecret: string;
  ingressMtlsCrlFileName: string;
  ingressMtlsVerifyClient: string;
  ingressMtlsVerifyDepth: string;
  egressMtlsTlsSecret: string;
  egressMtlsTrustedCertSecret: string;
  egressMtlsVerifyServer: boolean;
  egressMtlsVerifyDepth: string;
  egressMtlsProtocols: string;
  egressMtlsCiphers: string;
  egressMtlsServerName: boolean;
  egressMtlsSslName: string;
  egressMtlsSessionReuse: boolean;
  oidcClientId: string;
  oidcClientSecret: string;
  oidcAuthEndpoint: string;
  oidcTokenEndpoint: string;
  oidcJwksUri: string;
  oidcEndSessionEndpoint: string;
  oidcRedirectUri: string;
  oidcPostLogoutRedirectUri: string;
  oidcScope: string;
  oidcAccessTokenEnable: boolean;
  oidcPkceEnable: boolean;
  oidcTrustedCertSecret: string;
  oidcSslVerify: boolean;
  oidcSslVerifyDepth: string;
  oidcZoneSyncLeeway: string;
  oidcAuthExtraArgs: string;
  wafEnable: boolean;
  wafApPolicy: string;
  wafApBundle: string;
  wafSecurityLogEnable: boolean;
  wafSecurityLogConf: string;
  wafSecurityLogBundle: string;
  wafSecurityLogDest: string;
  cacheZoneName: string;
  cacheZoneSize: string;
  cacheKey: string;
  cacheTime: string;
  cacheAllowedCodes: string;
  cacheAllowedMethods: string;
  cacheMinUses: string;
  cacheInactive: string;
  cacheLevels: string;
  cacheMaxSize: string;
  cacheMinFree: string;
  cacheUseTempPath: boolean;
  cacheBackgroundUpdate: boolean;
  cacheRevalidate: boolean;
  cacheOverrideUpstreamCache: boolean;
  cacheUseStale: string;
  cacheBypass: string;
  cacheNoCache: string;
  cachePurgeAllow: string;
  cacheLockEnable: boolean;
  cacheLockAge: string;
  cacheLockTimeout: string;
  corsAllowOrigin: string;
  corsAllowMethods: string;
  corsAllowHeaders: string;
  corsExposeHeaders: string;
  corsAllowCredentials: boolean;
  corsMaxAge: string;
};

export type UpstreamForm = {
  name: string;
  service: string;
  port: string;
  type: string;
  tlsEnable: boolean;
  useClusterIp: boolean;
  lbMethod: string;
  nextUpstream: string;
  nextUpstreamTimeout: string;
  nextUpstreamTries: string;
  connectTimeout: string;
  readTimeout: string;
  sendTimeout: string;
  buffering: boolean;
  bufferSize: string;
  clientMaxBodySize: string;
  maxConns: string;
  maxFails: string;
  failTimeout: string;
  keepalive: string;
  queueSize: string;
  queueTimeout: string;
  slowStart: string;
  subselectorText: string;
  healthCheckYaml: string;
  sessionCookieEnable: boolean;
  sessionCookieName: string;
  sessionCookiePath: string;
  sessionCookieDomain: string;
  sessionCookieExpires: string;
  sessionCookieSecure: boolean;
  sessionCookieHttpOnly: boolean;
  sessionCookieSameSite: string;
};

export type RouteForm = {
  path: string;
  actionType: RouteActionType;
  pass: string;
  proxyUpstream: string;
  rewritePath: string;
  redirectUrl: string;
  redirectCode: string;
  returnCode: string;
  returnType: string;
  returnBody: string;
  policyRefsText: string;
  locationSnippets: string;
  dos: string;
  routeSelectorText: string;
  matchConditionType: "header" | "cookie" | "argument" | "variable";
  matchConditionName: string;
  matchValue: string;
  matchActionType: RouteActionType;
  matchActionPass: string;
  matchProxyUpstream: string;
  matchRewritePath: string;
  matchRedirectUrl: string;
  matchRedirectCode: string;
  matchReturnCode: string;
  matchReturnType: string;
  matchReturnBody: string;
  splitPrimaryWeight: string;
  splitPrimaryPass: string;
  splitSecondaryWeight: string;
  splitSecondaryPass: string;
  errorCodes: string;
  errorActionType: "redirect" | "return";
  errorRedirectCode: string;
  errorRedirectUrl: string;
  errorReturnCode: string;
  errorReturnType: string;
  errorReturnBody: string;
};

export type GlobalConfigurationListenerForm = {
  name: string;
  port: string;
  protocol: ListenerProtocol;
  ssl: boolean;
  ipv4: string;
  ipv6: string;
};

export type GlobalConfigurationForm = {
  name: string;
  namespace: string;
  listeners: GlobalConfigurationListenerForm[];
};

export type TransportServerUpstreamForm = {
  name: string;
  service: string;
  port: string;
  backup: string;
  backupPort: string;
  loadBalancingMethod: string;
  maxFails: string;
  failTimeout: string;
  maxConns: string;
  healthCheckYaml: string;
};

export type TransportServerForm = {
  name: string;
  namespace: string;
  host: string;
  ingressClassName: string;
  listenerName: string;
  listenerProtocol: TransportListenerProtocol;
  actionPass: string;
  tlsSecret: string;
  sessionTimeout: string;
  serverSnippets: string;
  streamSnippets: string;
  upstreamConnectTimeout: string;
  upstreamNextUpstream: boolean;
  upstreamNextUpstreamTimeout: string;
  upstreamNextUpstreamTries: string;
  udpRequests: string;
  udpResponses: string;
  upstreams: TransportServerUpstreamForm[];
};

export type VirtualServerRouteForm = {
  name: string;
  namespace: string;
  host: string;
  ingressClassName: string;
  upstreams: UpstreamForm[];
  subroutes: RouteForm[];
};

export type VirtualServerForm = {
  name: string;
  namespace: string;
  host: string;
  ingressClassName: string;
  internalRoute: boolean;
  gunzip: boolean;
  dos: string;
  listenerHttp: string;
  listenerHttps: string;
  tlsSecret: string;
  tlsRedirectEnable: boolean;
  tlsRedirectCode: string;
  tlsRedirectBasedOn: string;
  certIssuer: string;
  certClusterIssuer: string;
  certIssuerKind: string;
  certIssuerGroup: string;
  externalDnsEnable: boolean;
  externalDnsRecordTTL: string;
  externalDnsRecordType: string;
  externalDnsLabelsText: string;
  externalDnsProviderText: string;
  policyRefsText: string;
  httpSnippets: string;
  serverSnippets: string;
  upstreams: UpstreamForm[];
  routes: RouteForm[];
};

export type SecretForm = {
  name: string;
  namespace: string;
  certificate: string;
  privateKey: string;
};

export const policyTypeOptions: Array<{ value: PolicyType; label: string }> = [
  { value: "accessControl", label: "Access control" },
  { value: "rateLimit", label: "Rate limit" },
  { value: "apiKey", label: "API key" },
  { value: "basicAuth", label: "Basic auth" },
  { value: "jwt", label: "JWT" },
  { value: "ingressMTLS", label: "Ingress mTLS" },
  { value: "egressMTLS", label: "Egress mTLS" },
  { value: "oidc", label: "OIDC" },
  { value: "waf", label: "WAF" },
  { value: "cache", label: "Cache" },
  { value: "cors", label: "CORS" },
];

export const logLevelOptions = ["info", "notice", "warn", "error"];
export const verifyClientOptions: VerifyClientMode[] = ["on", "off", "optional", "optional_no_ca"];
export const sameSiteOptions = ["strict", "lax", "none"];
export const upstreamTypeOptions: UpstreamType[] = ["http", "grpc"];
export const routeActionOptions: RouteActionType[] = ["pass", "proxy", "redirect", "return"];
export const tlsRedirectCodeOptions = ["301", "302", "307", "308"];
export const tlsRedirectBasedOnOptions = ["scheme", "x-forwarded-proto"];
export const listenerProtocolOptions: ListenerProtocol[] = ["HTTP", "TCP", "UDP"];
export const transportListenerProtocolOptions: TransportListenerProtocol[] = ["TCP", "UDP", "TLS_PASSTHROUGH"];
export const corsMethodOptions = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
export const cacheMethodOptions = ["GET", "HEAD", "POST"];
export const rateKeyExamples = ["${binary_remote_addr}", "${request_uri}", "${request_method}", "${cookie_session}"];

function decodeBase64(value: string) {
  try {
    return atob(value);
  } catch {
    return "";
  }
}

const splitLines = (value: string) =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const toNumber = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : undefined;
};

const parseYamlBlock = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return YAML.parse(trimmed) as unknown;
};

const stringifyYamlBlock = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return YAML.stringify(value).trim();
};

const parseRecordText = (value: string) => {
  const record: Record<string, string> = {};
  for (const line of splitLines(value)) {
    const [key, ...rest] = line.split("=");
    if (key?.trim()) {
      record[key.trim()] = rest.join("=").trim();
    }
  }
  return Object.keys(record).length ? record : undefined;
};

const stringifyRecordText = (value: Record<string, string> | undefined) =>
  value ? Object.entries(value).map(([key, item]) => `${key}=${item}`).join("\n") : "";

const parsePolicyRefs = (value: string) => {
  const refs = splitLines(value).map((entry) => {
    const [namespace, name] = entry.includes("/") ? entry.split("/", 2) : ["", entry];
    return namespace ? { namespace, name } : { name };
  });

  return refs.length ? refs : undefined;
};

const stringifyPolicyRefs = (value: Array<{ name?: string; namespace?: string }> | undefined) =>
  value?.map((item) => (item.namespace ? `${item.namespace}/${item.name ?? ""}` : item.name ?? "")).join("\n") ?? "";

export function defaultPolicyForm(policyType: PolicyType = "rateLimit"): PolicyForm {
  return {
    name: `example-${policyType.toLowerCase()}-policy`,
    namespace: "default",
    ingressClassName: "",
    policyType,
    accessAllow: "10.0.0.0/8",
    accessDeny: "",
    rate: "10r/s",
    zoneSize: "10M",
    key: "${binary_remote_addr}",
    burst: "20",
    delay: "",
    noDelay: false,
    dryRun: false,
    logLevel: "error",
    rejectCode: "503",
    scale: false,
    conditionDefault: false,
    conditionJwtClaim: "",
    conditionJwtMatch: "",
    conditionVarName: "",
    conditionVarMatch: "",
    apiKeyClientSecret: "$http_x_api_key",
    apiKeySuppliedHeader: "$http_x_api_key",
    apiKeySuppliedQuery: "",
    basicAuthSecret: "",
    basicAuthRealm: "Protected",
    jwtRealm: "Closed Area",
    jwtSecret: "",
    jwtToken: "$http_authorization",
    jwtJwksUri: "",
    jwtKeyCache: "1h",
    jwtTrustedCertSecret: "",
    jwtSslVerify: false,
    jwtSslVerifyDepth: "1",
    jwtSniEnabled: false,
    jwtSniName: "",
    ingressMtlsClientCertSecret: "",
    ingressMtlsCrlFileName: "",
    ingressMtlsVerifyClient: "on",
    ingressMtlsVerifyDepth: "1",
    egressMtlsTlsSecret: "",
    egressMtlsTrustedCertSecret: "",
    egressMtlsVerifyServer: true,
    egressMtlsVerifyDepth: "1",
    egressMtlsProtocols: "TLSv1.2 TLSv1.3",
    egressMtlsCiphers: "",
    egressMtlsServerName: true,
    egressMtlsSslName: "",
    egressMtlsSessionReuse: true,
    oidcClientId: "",
    oidcClientSecret: "",
    oidcAuthEndpoint: "",
    oidcTokenEndpoint: "",
    oidcJwksUri: "",
    oidcEndSessionEndpoint: "",
    oidcRedirectUri: "/_codexch",
    oidcPostLogoutRedirectUri: "/_logout",
    oidcScope: "openid+profile+email",
    oidcAccessTokenEnable: false,
    oidcPkceEnable: false,
    oidcTrustedCertSecret: "",
    oidcSslVerify: false,
    oidcSslVerifyDepth: "1",
    oidcZoneSyncLeeway: "200",
    oidcAuthExtraArgs: "",
    wafEnable: true,
    wafApPolicy: "",
    wafApBundle: "",
    wafSecurityLogEnable: false,
    wafSecurityLogConf: "",
    wafSecurityLogBundle: "",
    wafSecurityLogDest: "stderr",
    cacheZoneName: "maincache",
    cacheZoneSize: "10m",
    cacheKey: "$scheme$proxy_host$uri$is_args$args",
    cacheTime: "10m",
    cacheAllowedCodes: "200\n301\n404",
    cacheAllowedMethods: "GET\nHEAD",
    cacheMinUses: "1",
    cacheInactive: "10m",
    cacheLevels: "1:2",
    cacheMaxSize: "",
    cacheMinFree: "",
    cacheUseTempPath: false,
    cacheBackgroundUpdate: false,
    cacheRevalidate: false,
    cacheOverrideUpstreamCache: false,
    cacheUseStale: "error\ntimeout\nupdating",
    cacheBypass: "",
    cacheNoCache: "",
    cachePurgeAllow: "",
    cacheLockEnable: false,
    cacheLockAge: "",
    cacheLockTimeout: "",
    corsAllowOrigin: "https://example.com",
    corsAllowMethods: "GET\nPOST\nOPTIONS",
    corsAllowHeaders: "Authorization\nContent-Type",
    corsExposeHeaders: "X-Request-Id",
    corsAllowCredentials: false,
    corsMaxAge: "86400",
  };
}

export function buildPolicyManifest(form: PolicyForm) {
  const manifest: Record<string, unknown> = {
    apiVersion: "k8s.nginx.org/v1",
    kind: "Policy",
    metadata: {
      name: form.name,
      namespace: form.namespace,
    },
    spec: {},
  };

  const spec = manifest.spec as Record<string, unknown>;
  if (form.ingressClassName.trim()) {
    spec.ingressClassName = form.ingressClassName.trim();
  }

  if (form.policyType === "accessControl") {
    spec.accessControl = form.accessAllow.trim()
      ? { allow: splitLines(form.accessAllow) }
      : { deny: splitLines(form.accessDeny) };
  }

  if (form.policyType === "rateLimit") {
    const rateLimit: Record<string, unknown> = {
      rate: form.rate,
      key: form.key,
      zoneSize: form.zoneSize,
    };
    if (form.burst.trim()) rateLimit.burst = Number(form.burst);
    if (form.delay.trim()) rateLimit.delay = Number(form.delay);
    if (form.noDelay) rateLimit.noDelay = true;
    if (form.dryRun) rateLimit.dryRun = true;
    if (form.logLevel.trim()) rateLimit.logLevel = form.logLevel;
    if (form.rejectCode.trim()) rateLimit.rejectCode = Number(form.rejectCode);
    if (form.scale) rateLimit.scale = true;

    const condition: Record<string, unknown> = {};
    if (form.conditionDefault) condition.default = true;
    if (form.conditionJwtClaim.trim() && form.conditionJwtMatch.trim()) {
      condition.jwt = {
        claim: form.conditionJwtClaim.trim(),
        match: form.conditionJwtMatch.trim(),
      };
    }
    if (form.conditionVarName.trim() && form.conditionVarMatch.trim()) {
      condition.variables = [{ name: form.conditionVarName.trim(), match: form.conditionVarMatch.trim() }];
    }
    if (Object.keys(condition).length) rateLimit.condition = condition;
    spec.rateLimit = rateLimit;
  }

  if (form.policyType === "apiKey") {
    spec.apiKey = {
      clientSecret: form.apiKeyClientSecret,
      suppliedIn: {
        ...(form.apiKeySuppliedHeader.trim() ? { header: splitLines(form.apiKeySuppliedHeader) } : {}),
        ...(form.apiKeySuppliedQuery.trim() ? { query: splitLines(form.apiKeySuppliedQuery) } : {}),
      },
    };
  }

  if (form.policyType === "basicAuth") {
    spec.basicAuth = {
      secret: form.basicAuthSecret,
      realm: form.basicAuthRealm,
    };
  }

  if (form.policyType === "jwt") {
    spec.jwt = {
      ...(form.jwtRealm.trim() ? { realm: form.jwtRealm.trim() } : {}),
      ...(form.jwtSecret.trim() ? { secret: form.jwtSecret.trim() } : {}),
      ...(form.jwtToken.trim() ? { token: form.jwtToken.trim() } : {}),
      ...(form.jwtJwksUri.trim() ? { jwksURI: form.jwtJwksUri.trim() } : {}),
      ...(form.jwtKeyCache.trim() ? { keyCache: form.jwtKeyCache.trim() } : {}),
      ...(form.jwtTrustedCertSecret.trim() ? { trustedCertSecret: form.jwtTrustedCertSecret.trim() } : {}),
      ...(form.jwtSslVerify ? { sslVerify: true } : {}),
      ...(form.jwtSslVerifyDepth.trim() ? { sslVerifyDepth: Number(form.jwtSslVerifyDepth) } : {}),
      ...(form.jwtSniEnabled ? { sniEnabled: true } : {}),
      ...(form.jwtSniName.trim() ? { sniName: form.jwtSniName.trim() } : {}),
    };
  }

  if (form.policyType === "ingressMTLS") {
    spec.ingressMTLS = {
      ...(form.ingressMtlsClientCertSecret.trim() ? { clientCertSecret: form.ingressMtlsClientCertSecret.trim() } : {}),
      ...(form.ingressMtlsCrlFileName.trim() ? { crlFileName: form.ingressMtlsCrlFileName.trim() } : {}),
      ...(form.ingressMtlsVerifyClient.trim() ? { verifyClient: form.ingressMtlsVerifyClient.trim() } : {}),
      ...(form.ingressMtlsVerifyDepth.trim() ? { verifyDepth: Number(form.ingressMtlsVerifyDepth) } : {}),
    };
  }

  if (form.policyType === "egressMTLS") {
    spec.egressMTLS = {
      ...(form.egressMtlsTlsSecret.trim() ? { tlsSecret: form.egressMtlsTlsSecret.trim() } : {}),
      ...(form.egressMtlsTrustedCertSecret.trim() ? { trustedCertSecret: form.egressMtlsTrustedCertSecret.trim() } : {}),
      ...(form.egressMtlsVerifyServer ? { verifyServer: true } : {}),
      ...(form.egressMtlsVerifyDepth.trim() ? { verifyDepth: Number(form.egressMtlsVerifyDepth) } : {}),
      ...(form.egressMtlsProtocols.trim() ? { protocols: form.egressMtlsProtocols.trim() } : {}),
      ...(form.egressMtlsCiphers.trim() ? { ciphers: form.egressMtlsCiphers.trim() } : {}),
      ...(form.egressMtlsServerName ? { serverName: true } : {}),
      ...(form.egressMtlsSslName.trim() ? { sslName: form.egressMtlsSslName.trim() } : {}),
      ...(form.egressMtlsSessionReuse ? { sessionReuse: true } : {}),
    };
  }

  if (form.policyType === "oidc") {
    spec.oidc = {
      ...(form.oidcClientId.trim() ? { clientID: form.oidcClientId.trim() } : {}),
      ...(form.oidcClientSecret.trim() ? { clientSecret: form.oidcClientSecret.trim() } : {}),
      ...(form.oidcAuthEndpoint.trim() ? { authEndpoint: form.oidcAuthEndpoint.trim() } : {}),
      ...(form.oidcTokenEndpoint.trim() ? { tokenEndpoint: form.oidcTokenEndpoint.trim() } : {}),
      ...(form.oidcJwksUri.trim() ? { jwksURI: form.oidcJwksUri.trim() } : {}),
      ...(form.oidcEndSessionEndpoint.trim() ? { endSessionEndpoint: form.oidcEndSessionEndpoint.trim() } : {}),
      ...(form.oidcRedirectUri.trim() ? { redirectURI: form.oidcRedirectUri.trim() } : {}),
      ...(form.oidcPostLogoutRedirectUri.trim()
        ? { postLogoutRedirectURI: form.oidcPostLogoutRedirectUri.trim() }
        : {}),
      ...(form.oidcScope.trim() ? { scope: form.oidcScope.trim() } : {}),
      ...(form.oidcAccessTokenEnable ? { accessTokenEnable: true } : {}),
      ...(form.oidcPkceEnable ? { pkceEnable: true } : {}),
      ...(form.oidcTrustedCertSecret.trim() ? { trustedCertSecret: form.oidcTrustedCertSecret.trim() } : {}),
      ...(form.oidcSslVerify ? { sslVerify: true } : {}),
      ...(form.oidcSslVerifyDepth.trim() ? { sslVerifyDepth: Number(form.oidcSslVerifyDepth) } : {}),
      ...(form.oidcZoneSyncLeeway.trim() ? { zoneSyncLeeway: Number(form.oidcZoneSyncLeeway) } : {}),
      ...(form.oidcAuthExtraArgs.trim() ? { authExtraArgs: splitLines(form.oidcAuthExtraArgs) } : {}),
    };
  }

  if (form.policyType === "waf") {
    spec.waf = {
      enable: form.wafEnable,
      ...(form.wafApPolicy.trim() ? { apPolicy: form.wafApPolicy.trim() } : {}),
      ...(form.wafApBundle.trim() ? { apBundle: form.wafApBundle.trim() } : {}),
      ...((form.wafSecurityLogEnable || form.wafSecurityLogConf.trim() || form.wafSecurityLogDest.trim() || form.wafSecurityLogBundle.trim())
        ? {
            securityLog: {
              ...(form.wafSecurityLogEnable ? { enable: true } : {}),
              ...(form.wafSecurityLogConf.trim() ? { apLogConf: form.wafSecurityLogConf.trim() } : {}),
              ...(form.wafSecurityLogBundle.trim() ? { apLogBundle: form.wafSecurityLogBundle.trim() } : {}),
              ...(form.wafSecurityLogDest.trim() ? { logDest: form.wafSecurityLogDest.trim() } : {}),
            },
          }
        : {}),
    };
  }

  if (form.policyType === "cache") {
    spec.cache = {
      cacheZoneName: form.cacheZoneName,
      cacheZoneSize: form.cacheZoneSize,
      ...(form.cacheKey.trim() ? { cacheKey: form.cacheKey.trim() } : {}),
      ...(form.cacheTime.trim() ? { time: form.cacheTime.trim() } : {}),
      ...(form.cacheAllowedCodes.trim() ? { allowedCodes: splitLines(form.cacheAllowedCodes).map((item) => (item === "any" ? "any" : Number(item))) } : {}),
      ...(form.cacheAllowedMethods.trim() ? { allowedMethods: splitLines(form.cacheAllowedMethods) } : {}),
      ...(form.cacheMinUses.trim() ? { cacheMinUses: Number(form.cacheMinUses) } : {}),
      ...(form.cacheInactive.trim() ? { inactive: form.cacheInactive.trim() } : {}),
      ...(form.cacheLevels.trim() ? { levels: form.cacheLevels.trim() } : {}),
      ...(form.cacheMaxSize.trim() ? { maxSize: form.cacheMaxSize.trim() } : {}),
      ...(form.cacheMinFree.trim() ? { minFree: form.cacheMinFree.trim() } : {}),
      ...(form.cacheUseTempPath ? { useTempPath: true } : {}),
      ...(form.cacheBackgroundUpdate ? { cacheBackgroundUpdate: true } : {}),
      ...(form.cacheRevalidate ? { cacheRevalidate: true } : {}),
      ...(form.cacheOverrideUpstreamCache ? { overrideUpstreamCache: true } : {}),
      ...(form.cacheUseStale.trim() ? { cacheUseStale: splitLines(form.cacheUseStale) } : {}),
      ...((form.cacheBypass.trim() || form.cacheNoCache.trim())
        ? {
            conditions: {
              ...(form.cacheBypass.trim() ? { bypass: splitLines(form.cacheBypass) } : {}),
              ...(form.cacheNoCache.trim() ? { noCache: splitLines(form.cacheNoCache) } : {}),
            },
          }
        : {}),
      ...(form.cachePurgeAllow.trim() ? { cachePurgeAllow: splitLines(form.cachePurgeAllow) } : {}),
      ...((form.cacheLockEnable || form.cacheLockAge.trim() || form.cacheLockTimeout.trim())
        ? {
            lock: {
              enable: form.cacheLockEnable,
              ...(form.cacheLockAge.trim() ? { age: form.cacheLockAge.trim() } : {}),
              ...(form.cacheLockTimeout.trim() ? { timeout: form.cacheLockTimeout.trim() } : {}),
            },
          }
        : {}),
    };
  }

  if (form.policyType === "cors") {
    spec.cors = {
      allowOrigin: splitLines(form.corsAllowOrigin),
      ...(form.corsAllowMethods.trim() ? { allowMethods: splitLines(form.corsAllowMethods) } : {}),
      ...(form.corsAllowHeaders.trim() ? { allowHeaders: splitLines(form.corsAllowHeaders) } : {}),
      ...(form.corsExposeHeaders.trim() ? { exposeHeaders: splitLines(form.corsExposeHeaders) } : {}),
      ...(form.corsAllowCredentials ? { allowCredentials: true } : {}),
      ...(form.corsMaxAge.trim() ? { maxAge: Number(form.corsMaxAge) } : {}),
    };
  }

  return manifest;
}

export function parsePolicyManifest(manifest: Record<string, unknown>) {
  const metadata = (manifest.metadata ?? {}) as Record<string, unknown>;
  const spec = (manifest.spec ?? {}) as Record<string, unknown>;
  const policyType = ([
    "accessControl",
    "rateLimit",
    "apiKey",
    "basicAuth",
    "jwt",
    "ingressMTLS",
    "egressMTLS",
    "oidc",
    "waf",
    "cache",
    "cors",
  ] as PolicyType[]).find((type) => spec[type] !== undefined) ?? "rateLimit";
  const form = defaultPolicyForm(policyType);
  form.name = String(metadata.name ?? form.name);
  form.namespace = String(metadata.namespace ?? form.namespace);
  form.ingressClassName = String(spec.ingressClassName ?? "");
  const value = (spec[policyType] ?? {}) as Record<string, unknown>;

  if (policyType === "accessControl") {
    form.accessAllow = Array.isArray(value.allow) ? (value.allow as string[]).join("\n") : "";
    form.accessDeny = Array.isArray(value.deny) ? (value.deny as string[]).join("\n") : "";
  }

  if (policyType === "rateLimit") {
    form.rate = String(value.rate ?? "");
    form.zoneSize = String(value.zoneSize ?? "");
    form.key = String(value.key ?? "");
    form.burst = value.burst !== undefined ? String(value.burst) : "";
    form.delay = value.delay !== undefined ? String(value.delay) : "";
    form.noDelay = Boolean(value.noDelay);
    form.dryRun = Boolean(value.dryRun);
    form.logLevel = String(value.logLevel ?? "");
    form.rejectCode = value.rejectCode !== undefined ? String(value.rejectCode) : "";
    form.scale = Boolean(value.scale);
    const condition = (value.condition ?? {}) as Record<string, unknown>;
    form.conditionDefault = Boolean(condition.default);
    const jwt = (condition.jwt ?? {}) as Record<string, unknown>;
    form.conditionJwtClaim = String(jwt.claim ?? "");
    form.conditionJwtMatch = String(jwt.match ?? "");
    const variable = Array.isArray(condition.variables) ? (condition.variables[0] as Record<string, unknown> | undefined) : undefined;
    form.conditionVarName = String(variable?.name ?? "");
    form.conditionVarMatch = String(variable?.match ?? "");
  }

  if (policyType === "apiKey") {
    form.apiKeyClientSecret = String(value.clientSecret ?? "");
    const suppliedIn = (value.suppliedIn ?? {}) as Record<string, unknown>;
    form.apiKeySuppliedHeader = Array.isArray(suppliedIn.header) ? (suppliedIn.header as string[]).join("\n") : "";
    form.apiKeySuppliedQuery = Array.isArray(suppliedIn.query) ? (suppliedIn.query as string[]).join("\n") : "";
  }

  if (policyType === "basicAuth") {
    form.basicAuthSecret = String(value.secret ?? "");
    form.basicAuthRealm = String(value.realm ?? "");
  }

  if (policyType === "jwt") {
    form.jwtRealm = String(value.realm ?? "");
    form.jwtSecret = String(value.secret ?? "");
    form.jwtToken = String(value.token ?? "");
    form.jwtJwksUri = String(value.jwksURI ?? "");
    form.jwtKeyCache = String(value.keyCache ?? "");
    form.jwtTrustedCertSecret = String(value.trustedCertSecret ?? "");
    form.jwtSslVerify = Boolean(value.sslVerify);
    form.jwtSslVerifyDepth = value.sslVerifyDepth !== undefined ? String(value.sslVerifyDepth) : "";
    form.jwtSniEnabled = Boolean(value.sniEnabled);
    form.jwtSniName = String(value.sniName ?? "");
  }

  if (policyType === "ingressMTLS") {
    form.ingressMtlsClientCertSecret = String(value.clientCertSecret ?? "");
    form.ingressMtlsCrlFileName = String(value.crlFileName ?? "");
    form.ingressMtlsVerifyClient = String(value.verifyClient ?? "on");
    form.ingressMtlsVerifyDepth = value.verifyDepth !== undefined ? String(value.verifyDepth) : "";
  }

  if (policyType === "egressMTLS") {
    form.egressMtlsTlsSecret = String(value.tlsSecret ?? "");
    form.egressMtlsTrustedCertSecret = String(value.trustedCertSecret ?? "");
    form.egressMtlsVerifyServer = Boolean(value.verifyServer);
    form.egressMtlsVerifyDepth = value.verifyDepth !== undefined ? String(value.verifyDepth) : "";
    form.egressMtlsProtocols = String(value.protocols ?? "");
    form.egressMtlsCiphers = String(value.ciphers ?? "");
    form.egressMtlsServerName = Boolean(value.serverName);
    form.egressMtlsSslName = String(value.sslName ?? "");
    form.egressMtlsSessionReuse = value.sessionReuse === undefined ? true : Boolean(value.sessionReuse);
  }

  if (policyType === "oidc") {
    form.oidcClientId = String(value.clientID ?? "");
    form.oidcClientSecret = String(value.clientSecret ?? "");
    form.oidcAuthEndpoint = String(value.authEndpoint ?? "");
    form.oidcTokenEndpoint = String(value.tokenEndpoint ?? "");
    form.oidcJwksUri = String(value.jwksURI ?? "");
    form.oidcEndSessionEndpoint = String(value.endSessionEndpoint ?? "");
    form.oidcRedirectUri = String(value.redirectURI ?? "");
    form.oidcPostLogoutRedirectUri = String(value.postLogoutRedirectURI ?? "");
    form.oidcScope = String(value.scope ?? "");
    form.oidcAccessTokenEnable = Boolean(value.accessTokenEnable);
    form.oidcPkceEnable = Boolean(value.pkceEnable);
    form.oidcTrustedCertSecret = String(value.trustedCertSecret ?? "");
    form.oidcSslVerify = Boolean(value.sslVerify);
    form.oidcSslVerifyDepth = value.sslVerifyDepth !== undefined ? String(value.sslVerifyDepth) : "";
    form.oidcZoneSyncLeeway = value.zoneSyncLeeway !== undefined ? String(value.zoneSyncLeeway) : "";
    form.oidcAuthExtraArgs = Array.isArray(value.authExtraArgs) ? (value.authExtraArgs as string[]).join("\n") : "";
  }

  if (policyType === "waf") {
    form.wafEnable = Boolean(value.enable);
    form.wafApPolicy = String(value.apPolicy ?? "");
    form.wafApBundle = String(value.apBundle ?? "");
    const securityLog = (value.securityLog ?? {}) as Record<string, unknown>;
    form.wafSecurityLogEnable = Boolean(securityLog.enable);
    form.wafSecurityLogConf = String(securityLog.apLogConf ?? "");
    form.wafSecurityLogBundle = String(securityLog.apLogBundle ?? "");
    form.wafSecurityLogDest = String(securityLog.logDest ?? "");
  }

  if (policyType === "cache") {
    form.cacheZoneName = String(value.cacheZoneName ?? "");
    form.cacheZoneSize = String(value.cacheZoneSize ?? "");
    form.cacheKey = String(value.cacheKey ?? "");
    form.cacheTime = String(value.time ?? "");
    form.cacheAllowedCodes = Array.isArray(value.allowedCodes) ? (value.allowedCodes as Array<string | number>).join("\n") : "";
    form.cacheAllowedMethods = Array.isArray(value.allowedMethods) ? (value.allowedMethods as string[]).join("\n") : "";
    form.cacheMinUses = value.cacheMinUses !== undefined ? String(value.cacheMinUses) : "";
    form.cacheInactive = String(value.inactive ?? "");
    form.cacheLevels = String(value.levels ?? "");
    form.cacheMaxSize = String(value.maxSize ?? "");
    form.cacheMinFree = String(value.minFree ?? "");
    form.cacheUseTempPath = Boolean(value.useTempPath);
    form.cacheBackgroundUpdate = Boolean(value.cacheBackgroundUpdate);
    form.cacheRevalidate = Boolean(value.cacheRevalidate);
    form.cacheOverrideUpstreamCache = Boolean(value.overrideUpstreamCache);
    form.cacheUseStale = Array.isArray(value.cacheUseStale) ? (value.cacheUseStale as string[]).join("\n") : "";
    const conditions = (value.conditions ?? {}) as Record<string, unknown>;
    form.cacheBypass = Array.isArray(conditions.bypass) ? (conditions.bypass as string[]).join("\n") : "";
    form.cacheNoCache = Array.isArray(conditions.noCache) ? (conditions.noCache as string[]).join("\n") : "";
    form.cachePurgeAllow = Array.isArray(value.cachePurgeAllow) ? (value.cachePurgeAllow as string[]).join("\n") : "";
    const lock = (value.lock ?? {}) as Record<string, unknown>;
    form.cacheLockEnable = Boolean(lock.enable);
    form.cacheLockAge = String(lock.age ?? "");
    form.cacheLockTimeout = String(lock.timeout ?? "");
  }

  if (policyType === "cors") {
    form.corsAllowOrigin = Array.isArray(value.allowOrigin) ? (value.allowOrigin as string[]).join("\n") : "";
    form.corsAllowMethods = Array.isArray(value.allowMethods) ? (value.allowMethods as string[]).join("\n") : "";
    form.corsAllowHeaders = Array.isArray(value.allowHeaders) ? (value.allowHeaders as string[]).join("\n") : "";
    form.corsExposeHeaders = Array.isArray(value.exposeHeaders) ? (value.exposeHeaders as string[]).join("\n") : "";
    form.corsAllowCredentials = Boolean(value.allowCredentials);
    form.corsMaxAge = value.maxAge !== undefined ? String(value.maxAge) : "";
  }

  return form;
}

export function defaultUpstreamForm(): UpstreamForm {
  return {
    name: "app",
    service: "app-service",
    port: "80",
    type: "http",
    tlsEnable: false,
    useClusterIp: false,
    lbMethod: "",
    nextUpstream: "",
    nextUpstreamTimeout: "",
    nextUpstreamTries: "",
    connectTimeout: "",
    readTimeout: "",
    sendTimeout: "",
    buffering: true,
    bufferSize: "",
    clientMaxBodySize: "",
    maxConns: "",
    maxFails: "",
    failTimeout: "",
    keepalive: "",
    queueSize: "",
    queueTimeout: "",
    slowStart: "",
    subselectorText: "",
    healthCheckYaml: "",
    sessionCookieEnable: false,
    sessionCookieName: "route",
    sessionCookiePath: "/",
    sessionCookieDomain: "",
    sessionCookieExpires: "",
    sessionCookieSecure: false,
    sessionCookieHttpOnly: true,
    sessionCookieSameSite: "lax",
  };
}

export function defaultRouteForm(): RouteForm {
  return {
    path: "/",
    actionType: "pass",
    pass: "app",
    proxyUpstream: "app",
    rewritePath: "",
    redirectUrl: "",
    redirectCode: "301",
    returnCode: "200",
    returnType: "text/plain",
    returnBody: "",
    policyRefsText: "",
    locationSnippets: "",
    dos: "",
    routeSelectorText: "",
    matchConditionType: "header",
    matchConditionName: "",
    matchValue: "",
    matchActionType: "pass",
    matchActionPass: "",
    matchProxyUpstream: "",
    matchRewritePath: "",
    matchRedirectUrl: "",
    matchRedirectCode: "301",
    matchReturnCode: "200",
    matchReturnType: "text/plain",
    matchReturnBody: "",
    splitPrimaryWeight: "80",
    splitPrimaryPass: "",
    splitSecondaryWeight: "20",
    splitSecondaryPass: "",
    errorCodes: "",
    errorActionType: "redirect",
    errorRedirectCode: "302",
    errorRedirectUrl: "",
    errorReturnCode: "200",
    errorReturnType: "text/plain",
    errorReturnBody: "",
  };
}

export function defaultGlobalConfigurationListenerForm(): GlobalConfigurationListenerForm {
  return {
    name: "http-listener",
    port: "80",
    protocol: "HTTP",
    ssl: false,
    ipv4: "",
    ipv6: "",
  };
}

export function defaultGlobalConfigurationForm(): GlobalConfigurationForm {
  return {
    name: "nginx-global",
    namespace: "default",
    listeners: [defaultGlobalConfigurationListenerForm()],
  };
}

export function buildGlobalConfigurationManifest(form: GlobalConfigurationForm) {
  return {
    apiVersion: "k8s.nginx.org/v1",
    kind: "GlobalConfiguration",
    metadata: {
      name: form.name,
      namespace: form.namespace,
    },
    spec: {
      listeners: form.listeners.map((listener) => ({
        name: listener.name,
        port: Number(listener.port),
        protocol: listener.protocol,
        ...(listener.ssl ? { ssl: true } : {}),
        ...(listener.ipv4.trim() ? { ipv4: listener.ipv4.trim() } : {}),
        ...(listener.ipv6.trim() ? { ipv6: listener.ipv6.trim() } : {}),
      })),
    },
  };
}

export function parseGlobalConfigurationManifest(manifest: Record<string, unknown>): GlobalConfigurationForm {
  const form = defaultGlobalConfigurationForm();
  const metadata = (manifest.metadata ?? {}) as Record<string, unknown>;
  const spec = (manifest.spec ?? {}) as Record<string, unknown>;
  form.name = String(metadata.name ?? form.name);
  form.namespace = String(metadata.namespace ?? form.namespace);
  form.listeners = Array.isArray(spec.listeners)
    ? (spec.listeners as Array<Record<string, unknown>>).map((listener) => ({
        name: String(listener.name ?? ""),
        port: listener.port !== undefined ? String(listener.port) : "",
        protocol: (String(listener.protocol ?? "HTTP") as ListenerProtocol),
        ssl: Boolean(listener.ssl),
        ipv4: String(listener.ipv4 ?? ""),
        ipv6: String(listener.ipv6 ?? ""),
      }))
    : form.listeners;
  return form;
}

export function defaultTransportServerUpstreamForm(): TransportServerUpstreamForm {
  return {
    name: "tcp-app",
    service: "tcp-service",
    port: "9000",
    backup: "",
    backupPort: "",
    loadBalancingMethod: "",
    maxFails: "",
    failTimeout: "",
    maxConns: "",
    healthCheckYaml: "",
  };
}

export function defaultTransportServerForm(): TransportServerForm {
  return {
    name: "example-transportserver",
    namespace: "default",
    host: "",
    ingressClassName: "",
    listenerName: "tcp-listener",
    listenerProtocol: "TCP",
    actionPass: "tcp-app",
    tlsSecret: "",
    sessionTimeout: "",
    serverSnippets: "",
    streamSnippets: "",
    upstreamConnectTimeout: "",
    upstreamNextUpstream: true,
    upstreamNextUpstreamTimeout: "",
    upstreamNextUpstreamTries: "",
    udpRequests: "",
    udpResponses: "",
    upstreams: [defaultTransportServerUpstreamForm()],
  };
}

export function buildTransportServerManifest(form: TransportServerForm) {
  return {
    apiVersion: "k8s.nginx.org/v1",
    kind: "TransportServer",
    metadata: {
      name: form.name,
      namespace: form.namespace,
    },
    spec: {
      ...(form.host.trim() ? { host: form.host.trim() } : {}),
      ...(form.ingressClassName.trim() ? { ingressClassName: form.ingressClassName.trim() } : {}),
      listener: {
        name: form.listenerName,
        protocol: form.listenerProtocol,
      },
      ...(form.actionPass.trim() ? { action: { pass: form.actionPass.trim() } } : {}),
      ...(form.tlsSecret.trim() ? { tls: { secret: form.tlsSecret.trim() } } : {}),
      ...(form.sessionTimeout.trim() ? { sessionParameters: { timeout: form.sessionTimeout.trim() } } : {}),
      ...(form.serverSnippets.trim() ? { serverSnippets: form.serverSnippets } : {}),
      ...(form.streamSnippets.trim() ? { streamSnippets: form.streamSnippets } : {}),
      ...((form.upstreamConnectTimeout.trim() ||
        form.upstreamNextUpstreamTimeout.trim() ||
        form.upstreamNextUpstreamTries.trim() ||
        form.udpRequests.trim() ||
        form.udpResponses.trim() ||
        !form.upstreamNextUpstream)
        ? {
            upstreamParameters: {
              ...(form.upstreamConnectTimeout.trim() ? { connectTimeout: form.upstreamConnectTimeout.trim() } : {}),
              ...(form.upstreamNextUpstream ? {} : { nextUpstream: false }),
              ...(form.upstreamNextUpstreamTimeout.trim()
                ? { nextUpstreamTimeout: form.upstreamNextUpstreamTimeout.trim() }
                : {}),
              ...(form.upstreamNextUpstreamTries.trim()
                ? { nextUpstreamTries: Number(form.upstreamNextUpstreamTries) }
                : {}),
              ...(form.udpRequests.trim() ? { udpRequests: Number(form.udpRequests) } : {}),
              ...(form.udpResponses.trim() ? { udpResponses: Number(form.udpResponses) } : {}),
            },
          }
        : {}),
      upstreams: form.upstreams.map((upstream) => ({
        name: upstream.name,
        service: upstream.service,
        port: Number(upstream.port),
        ...(upstream.backup.trim() ? { backup: upstream.backup.trim() } : {}),
        ...(upstream.backupPort.trim() ? { backupPort: Number(upstream.backupPort) } : {}),
        ...(upstream.loadBalancingMethod.trim() ? { loadBalancingMethod: upstream.loadBalancingMethod.trim() } : {}),
        ...(upstream.maxFails.trim() ? { maxFails: Number(upstream.maxFails) } : {}),
        ...(upstream.failTimeout.trim() ? { failTimeout: upstream.failTimeout.trim() } : {}),
        ...(upstream.maxConns.trim() ? { maxConns: Number(upstream.maxConns) } : {}),
        ...(upstream.healthCheckYaml.trim() ? { healthCheck: parseYamlBlock(upstream.healthCheckYaml) } : {}),
      })),
    },
  };
}

export function parseTransportServerManifest(manifest: Record<string, unknown>): TransportServerForm {
  const form = defaultTransportServerForm();
  const metadata = (manifest.metadata ?? {}) as Record<string, unknown>;
  const spec = (manifest.spec ?? {}) as Record<string, unknown>;
  form.name = String(metadata.name ?? form.name);
  form.namespace = String(metadata.namespace ?? form.namespace);
  form.host = String(spec.host ?? "");
  form.ingressClassName = String(spec.ingressClassName ?? "");
  const listener = (spec.listener ?? {}) as Record<string, unknown>;
  form.listenerName = String(listener.name ?? form.listenerName);
  form.listenerProtocol = (String(listener.protocol ?? "TCP") as TransportListenerProtocol);
  form.actionPass = String(((spec.action ?? {}) as Record<string, unknown>).pass ?? "");
  form.tlsSecret = String(((spec.tls ?? {}) as Record<string, unknown>).secret ?? "");
  form.sessionTimeout = String(((spec.sessionParameters ?? {}) as Record<string, unknown>).timeout ?? "");
  form.serverSnippets = String(spec.serverSnippets ?? "");
  form.streamSnippets = String(spec.streamSnippets ?? "");
  const upstreamParameters = (spec.upstreamParameters ?? {}) as Record<string, unknown>;
  form.upstreamConnectTimeout = String(upstreamParameters.connectTimeout ?? "");
  form.upstreamNextUpstream = upstreamParameters.nextUpstream === undefined ? true : Boolean(upstreamParameters.nextUpstream);
  form.upstreamNextUpstreamTimeout = String(upstreamParameters.nextUpstreamTimeout ?? "");
  form.upstreamNextUpstreamTries = upstreamParameters.nextUpstreamTries !== undefined ? String(upstreamParameters.nextUpstreamTries) : "";
  form.udpRequests = upstreamParameters.udpRequests !== undefined ? String(upstreamParameters.udpRequests) : "";
  form.udpResponses = upstreamParameters.udpResponses !== undefined ? String(upstreamParameters.udpResponses) : "";
  form.upstreams = Array.isArray(spec.upstreams)
    ? (spec.upstreams as Array<Record<string, unknown>>).map((upstream) => ({
        name: String(upstream.name ?? ""),
        service: String(upstream.service ?? ""),
        port: upstream.port !== undefined ? String(upstream.port) : "",
        backup: String(upstream.backup ?? ""),
        backupPort: upstream.backupPort !== undefined ? String(upstream.backupPort) : "",
        loadBalancingMethod: String(upstream.loadBalancingMethod ?? ""),
        maxFails: upstream.maxFails !== undefined ? String(upstream.maxFails) : "",
        failTimeout: String(upstream.failTimeout ?? ""),
        maxConns: upstream.maxConns !== undefined ? String(upstream.maxConns) : "",
        healthCheckYaml: stringifyYamlBlock(upstream.healthCheck),
      }))
    : form.upstreams;
  return form;
}

export function defaultVirtualServerRouteForm(): VirtualServerRouteForm {
  return {
    name: "example-virtualserverroute",
    namespace: "default",
    host: "app.example.com",
    ingressClassName: "",
    upstreams: [defaultUpstreamForm()],
    subroutes: [defaultRouteForm()],
  };
}

export function buildVirtualServerRouteManifest(form: VirtualServerRouteForm) {
  return {
    apiVersion: "k8s.nginx.org/v1",
    kind: "VirtualServerRoute",
    metadata: {
      name: form.name,
      namespace: form.namespace,
    },
    spec: {
      host: form.host,
      ...(form.ingressClassName.trim() ? { ingressClassName: form.ingressClassName.trim() } : {}),
      upstreams: buildVirtualServerManifest({
        ...defaultVirtualServerForm(),
        name: form.name,
        namespace: form.namespace,
        host: form.host,
        ingressClassName: form.ingressClassName,
        upstreams: form.upstreams,
        routes: [],
      }).spec.upstreams,
      subroutes: buildVirtualServerManifest({
        ...defaultVirtualServerForm(),
        name: form.name,
        namespace: form.namespace,
        host: form.host,
        ingressClassName: form.ingressClassName,
        routes: form.subroutes,
      }).spec.routes,
    },
  };
}

export function parseVirtualServerRouteManifest(manifest: Record<string, unknown>): VirtualServerRouteForm {
  const form = defaultVirtualServerRouteForm();
  const metadata = (manifest.metadata ?? {}) as Record<string, unknown>;
  const spec = (manifest.spec ?? {}) as Record<string, unknown>;
  form.name = String(metadata.name ?? form.name);
  form.namespace = String(metadata.namespace ?? form.namespace);
  form.host = String(spec.host ?? form.host);
  form.ingressClassName = String(spec.ingressClassName ?? "");
  const faux = parseVirtualServerManifest({
    apiVersion: "k8s.nginx.org/v1",
    kind: "VirtualServer",
    metadata,
    spec: {
      host: form.host,
      ingressClassName: form.ingressClassName,
      upstreams: spec.upstreams,
      routes: spec.subroutes,
    },
  });
  form.upstreams = faux.upstreams;
  form.subroutes = faux.routes;
  return form;
}

export function defaultVirtualServerForm(): VirtualServerForm {
  return {
    name: "example-virtualserver",
    namespace: "default",
    host: "app.example.com",
    ingressClassName: "",
    internalRoute: false,
    gunzip: false,
    dos: "",
    listenerHttp: "",
    listenerHttps: "",
    tlsSecret: "",
    tlsRedirectEnable: false,
    tlsRedirectCode: "",
    tlsRedirectBasedOn: "",
    certIssuer: "",
    certClusterIssuer: "",
    certIssuerKind: "",
    certIssuerGroup: "",
    externalDnsEnable: false,
    externalDnsRecordTTL: "",
    externalDnsRecordType: "",
    externalDnsLabelsText: "",
    externalDnsProviderText: "",
    policyRefsText: "",
    httpSnippets: "",
    serverSnippets: "",
    upstreams: [defaultUpstreamForm()],
    routes: [defaultRouteForm()],
  };
}

export function defaultSecretForm(): SecretForm {
  return {
    name: "example-tls-secret",
    namespace: "default",
    certificate: "-----BEGIN CERTIFICATE-----\nPASTE_CERT_HERE\n-----END CERTIFICATE-----",
    privateKey: "-----BEGIN PRIVATE KEY-----\nPASTE_KEY_HERE\n-----END PRIVATE KEY-----",
  };
}

export function buildSecretManifest(form: SecretForm) {
  return {
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name: form.name,
      namespace: form.namespace,
    },
    type: "kubernetes.io/tls",
    stringData: {
      "tls.crt": form.certificate,
      "tls.key": form.privateKey,
    },
  };
}

export function parseSecretManifest(manifest: Record<string, unknown>): SecretForm {
  const form = defaultSecretForm();
  const metadata = (manifest.metadata ?? {}) as Record<string, unknown>;
  form.name = String(metadata.name ?? form.name);
  form.namespace = String(metadata.namespace ?? form.namespace);
  const stringData = (manifest.stringData ?? {}) as Record<string, unknown>;
  const data = (manifest.data ?? {}) as Record<string, unknown>;
  form.certificate = String(stringData["tls.crt"] ?? (typeof data["tls.crt"] === "string" ? decodeBase64(data["tls.crt"]) : form.certificate));
  form.privateKey = String(stringData["tls.key"] ?? (typeof data["tls.key"] === "string" ? decodeBase64(data["tls.key"]) : form.privateKey));
  return form;
}

export function buildVirtualServerManifest(form: VirtualServerForm) {
  const buildNestedAction = (
    actionType: RouteActionType,
    values: {
      pass: string;
      proxyUpstream: string;
      rewritePath: string;
      redirectUrl: string;
      redirectCode: string;
      returnCode: string;
      returnType: string;
      returnBody: string;
    },
  ) => {
    if (actionType === "pass" && values.pass.trim()) {
      return { pass: values.pass.trim() };
    }
    if (actionType === "proxy" && values.proxyUpstream.trim()) {
      return {
        proxy: {
          upstream: values.proxyUpstream.trim(),
          ...(values.rewritePath.trim() ? { rewritePath: values.rewritePath.trim() } : {}),
        },
      };
    }
    if (actionType === "redirect" && values.redirectUrl.trim()) {
      return {
        redirect: {
          url: values.redirectUrl.trim(),
          ...(values.redirectCode.trim() ? { code: Number(values.redirectCode) } : {}),
        },
      };
    }
    if (actionType === "return") {
      return {
        return: {
          ...(values.returnCode.trim() ? { code: Number(values.returnCode) } : {}),
          ...(values.returnType.trim() ? { type: values.returnType.trim() } : {}),
          ...(values.returnBody.trim() ? { body: values.returnBody } : {}),
        },
      };
    }
    return undefined;
  };

  const spec: Record<string, unknown> = {
    host: form.host,
    upstreams: form.upstreams.map((upstream) => {
      const built: Record<string, unknown> = {
        name: upstream.name,
        service: upstream.service,
        port: Number(upstream.port),
      };
      if (upstream.type.trim()) built.type = upstream.type;
      if (upstream.tlsEnable) built.tls = { enable: true };
      if (upstream.useClusterIp) built["use-cluster-ip"] = true;
      if (upstream.lbMethod.trim()) built["lb-method"] = upstream.lbMethod.trim();
      if (upstream.nextUpstream.trim()) built["next-upstream"] = upstream.nextUpstream.trim();
      if (upstream.nextUpstreamTimeout.trim()) built["next-upstream-timeout"] = upstream.nextUpstreamTimeout.trim();
      if (upstream.nextUpstreamTries.trim()) built["next-upstream-tries"] = Number(upstream.nextUpstreamTries);
      if (upstream.connectTimeout.trim()) built["connect-timeout"] = upstream.connectTimeout.trim();
      if (upstream.readTimeout.trim()) built["read-timeout"] = upstream.readTimeout.trim();
      if (upstream.sendTimeout.trim()) built["send-timeout"] = upstream.sendTimeout.trim();
      if (!upstream.buffering) built.buffering = false;
      if (upstream.bufferSize.trim()) built["buffer-size"] = upstream.bufferSize.trim();
      if (upstream.clientMaxBodySize.trim()) built["client-max-body-size"] = upstream.clientMaxBodySize.trim();
      if (upstream.maxConns.trim()) built["max-conns"] = Number(upstream.maxConns);
      if (upstream.maxFails.trim()) built["max-fails"] = Number(upstream.maxFails);
      if (upstream.failTimeout.trim()) built["fail-timeout"] = upstream.failTimeout.trim();
      if (upstream.keepalive.trim()) built.keepalive = Number(upstream.keepalive);
      if (upstream.slowStart.trim()) built["slow-start"] = upstream.slowStart.trim();
      if (upstream.subselectorText.trim()) built.subselector = parseRecordText(upstream.subselectorText);
      if (upstream.healthCheckYaml.trim()) built.healthCheck = parseYamlBlock(upstream.healthCheckYaml);
      if (upstream.queueSize.trim() || upstream.queueTimeout.trim()) {
        built.queue = {
          ...(upstream.queueSize.trim() ? { size: Number(upstream.queueSize) } : {}),
          ...(upstream.queueTimeout.trim() ? { timeout: upstream.queueTimeout.trim() } : {}),
        };
      }
      if (upstream.sessionCookieEnable) {
        built.sessionCookie = {
          enable: true,
          ...(upstream.sessionCookieName.trim() ? { name: upstream.sessionCookieName.trim() } : {}),
          ...(upstream.sessionCookiePath.trim() ? { path: upstream.sessionCookiePath.trim() } : {}),
          ...(upstream.sessionCookieDomain.trim() ? { domain: upstream.sessionCookieDomain.trim() } : {}),
          ...(upstream.sessionCookieExpires.trim() ? { expires: upstream.sessionCookieExpires.trim() } : {}),
          ...(upstream.sessionCookieSecure ? { secure: true } : {}),
          ...(upstream.sessionCookieHttpOnly ? { httpOnly: true } : {}),
          ...(upstream.sessionCookieSameSite.trim() ? { samesite: upstream.sessionCookieSameSite.trim() } : {}),
        };
      }
      return built;
    }),
    routes: form.routes.map((route) => {
      const built: Record<string, unknown> = {
        path: route.path,
      };
      if (route.actionType === "pass" && route.pass.trim()) {
        built.action = { pass: route.pass.trim() };
      }
      if (route.actionType === "proxy" && route.proxyUpstream.trim()) {
        built.action = {
          proxy: {
            upstream: route.proxyUpstream.trim(),
            ...(route.rewritePath.trim() ? { rewritePath: route.rewritePath.trim() } : {}),
          },
        };
      }
      if (route.actionType === "redirect" && route.redirectUrl.trim()) {
        built.action = {
          redirect: {
            url: route.redirectUrl.trim(),
            ...(route.redirectCode.trim() ? { code: Number(route.redirectCode) } : {}),
          },
        };
      }
      if (route.actionType === "return") {
        built.action = {
          return: {
            ...(route.returnCode.trim() ? { code: Number(route.returnCode) } : {}),
            ...(route.returnType.trim() ? { type: route.returnType.trim() } : {}),
            ...(route.returnBody.trim() ? { body: route.returnBody } : {}),
          },
        };
      }
      if (route.policyRefsText.trim()) built.policies = parsePolicyRefs(route.policyRefsText);
      if (route.locationSnippets.trim()) built["location-snippets"] = route.locationSnippets;
      if (route.dos.trim()) built.dos = route.dos.trim();
      if (route.routeSelectorText.trim()) built.routeSelector = parseYamlBlock(route.routeSelectorText);
      const matchAction = buildNestedAction(route.matchActionType, {
        pass: route.matchActionPass,
        proxyUpstream: route.matchProxyUpstream,
        rewritePath: route.matchRewritePath,
        redirectUrl: route.matchRedirectUrl,
        redirectCode: route.matchRedirectCode,
        returnCode: route.matchReturnCode,
        returnType: route.matchReturnType,
        returnBody: route.matchReturnBody,
      });
      if (route.matchConditionName.trim() && route.matchValue.trim() && matchAction) {
        built.matches = [
          {
            conditions: [{ [route.matchConditionType]: route.matchConditionName.trim(), value: route.matchValue.trim() }],
            action: matchAction,
          },
        ];
      }
      if (
        route.splitPrimaryPass.trim() &&
        route.splitSecondaryPass.trim() &&
        route.splitPrimaryWeight.trim() &&
        route.splitSecondaryWeight.trim()
      ) {
        built.splits = [
          { weight: Number(route.splitPrimaryWeight), action: { pass: route.splitPrimaryPass.trim() } },
          { weight: Number(route.splitSecondaryWeight), action: { pass: route.splitSecondaryPass.trim() } },
        ];
      }
      if (route.errorCodes.trim()) {
        built.errorPages = [
          {
            codes: splitLines(route.errorCodes).map((item) => Number(item)),
            ...(route.errorActionType === "redirect"
              ? {
                  redirect: {
                    ...(route.errorRedirectCode.trim() ? { code: Number(route.errorRedirectCode) } : {}),
                    ...(route.errorRedirectUrl.trim() ? { url: route.errorRedirectUrl.trim() } : {}),
                  },
                }
              : {
                  return: {
                    ...(route.errorReturnCode.trim() ? { code: Number(route.errorReturnCode) } : {}),
                    ...(route.errorReturnType.trim() ? { type: route.errorReturnType.trim() } : {}),
                    ...(route.errorReturnBody.trim() ? { body: route.errorReturnBody } : {}),
                  },
                }),
          },
        ];
      }
      return built;
    }),
  };

  if (form.ingressClassName.trim()) spec.ingressClassName = form.ingressClassName.trim();
  if (form.internalRoute) spec.internalRoute = true;
  if (form.gunzip) spec.gunzip = true;
  if (form.dos.trim()) spec.dos = form.dos.trim();
  if (form.listenerHttp.trim() || form.listenerHttps.trim()) {
    spec.listener = {
      ...(form.listenerHttp.trim() ? { http: form.listenerHttp.trim() } : {}),
      ...(form.listenerHttps.trim() ? { https: form.listenerHttps.trim() } : {}),
    };
  }
  const hasTlsSecret = Boolean(form.tlsSecret.trim());
  const hasTlsRedirect = form.tlsRedirectEnable;
  const hasCertManager = Boolean(
    form.certIssuer.trim() || form.certClusterIssuer.trim() || form.certIssuerKind.trim() || form.certIssuerGroup.trim(),
  );

  if (hasTlsSecret || hasTlsRedirect || hasCertManager) {
    spec.tls = {
      ...(hasTlsSecret ? { secret: form.tlsSecret.trim() } : {}),
      ...(hasTlsRedirect
        ? {
            redirect: {
              enable: true,
              ...(form.tlsRedirectCode.trim() ? { code: Number(form.tlsRedirectCode) } : {}),
              ...(form.tlsRedirectBasedOn.trim() ? { basedOn: form.tlsRedirectBasedOn.trim() } : {}),
            },
          }
        : {}),
      ...(hasCertManager
        ? {
            "cert-manager": {
              ...(form.certIssuer.trim() ? { issuer: form.certIssuer.trim() } : {}),
              ...(form.certClusterIssuer.trim() ? { "cluster-issuer": form.certClusterIssuer.trim() } : {}),
              ...(form.certIssuerKind.trim() ? { "issuer-kind": form.certIssuerKind.trim() } : {}),
              ...(form.certIssuerGroup.trim() ? { "issuer-group": form.certIssuerGroup.trim() } : {}),
            },
          }
        : {}),
    };
  }
  if (form.policyRefsText.trim()) spec.policies = parsePolicyRefs(form.policyRefsText);
  if (form.httpSnippets.trim()) spec["http-snippets"] = form.httpSnippets;
  if (form.serverSnippets.trim()) spec["server-snippets"] = form.serverSnippets;
  if (
    form.externalDnsEnable ||
    form.externalDnsRecordTTL.trim() ||
    form.externalDnsRecordType.trim() ||
    form.externalDnsLabelsText.trim() ||
    form.externalDnsProviderText.trim()
  ) {
    spec.externalDNS = {
      ...(form.externalDnsEnable ? { enable: true } : {}),
      ...(form.externalDnsRecordTTL.trim() ? { recordTTL: Number(form.externalDnsRecordTTL) } : {}),
      ...(form.externalDnsRecordType.trim() ? { recordType: form.externalDnsRecordType.trim() } : {}),
      ...(form.externalDnsLabelsText.trim() ? { labels: parseRecordText(form.externalDnsLabelsText) } : {}),
      ...(form.externalDnsProviderText.trim()
        ? {
            providerSpecific: splitLines(form.externalDnsProviderText).map((entry) => {
              const [name, ...rest] = entry.split("=");
              return { name: name.trim(), value: rest.join("=").trim() };
            }),
          }
        : {}),
    };
  }

  return {
    apiVersion: "k8s.nginx.org/v1",
    kind: "VirtualServer",
    metadata: {
      name: form.name,
      namespace: form.namespace,
    },
    spec,
  };
}

export function parseVirtualServerManifest(manifest: Record<string, unknown>): VirtualServerForm {
  const form = defaultVirtualServerForm();
  const metadata = (manifest.metadata ?? {}) as Record<string, unknown>;
  const spec = (manifest.spec ?? {}) as Record<string, unknown>;
  form.name = String(metadata.name ?? form.name);
  form.namespace = String(metadata.namespace ?? form.namespace);
  form.host = String(spec.host ?? form.host);
  form.ingressClassName = String(spec.ingressClassName ?? "");
  form.internalRoute = Boolean(spec.internalRoute);
  form.gunzip = Boolean(spec.gunzip);
  form.dos = String(spec.dos ?? "");
  const listener = (spec.listener ?? {}) as Record<string, unknown>;
  form.listenerHttp = String(listener.http ?? "");
  form.listenerHttps = String(listener.https ?? "");
  const tls = (spec.tls ?? {}) as Record<string, unknown>;
  form.tlsSecret = String(tls.secret ?? "");
  const redirect = (tls.redirect ?? {}) as Record<string, unknown>;
  form.tlsRedirectEnable = Boolean(redirect.enable);
  form.tlsRedirectCode = redirect.code !== undefined ? String(redirect.code) : "";
  form.tlsRedirectBasedOn = String(redirect.basedOn ?? "");
  const certManager = (tls["cert-manager"] ?? {}) as Record<string, unknown>;
  form.certIssuer = String(certManager.issuer ?? "");
  form.certClusterIssuer = String(certManager["cluster-issuer"] ?? "");
  form.certIssuerKind = String(certManager["issuer-kind"] ?? "");
  form.certIssuerGroup = String(certManager["issuer-group"] ?? "");
  const externalDns = (spec.externalDNS ?? {}) as Record<string, unknown>;
  form.externalDnsEnable = Boolean(externalDns.enable);
  form.externalDnsRecordTTL = externalDns.recordTTL !== undefined ? String(externalDns.recordTTL) : "";
  form.externalDnsRecordType = String(externalDns.recordType ?? "");
  form.externalDnsLabelsText = stringifyRecordText(externalDns.labels as Record<string, string> | undefined);
  form.externalDnsProviderText = Array.isArray(externalDns.providerSpecific)
    ? (externalDns.providerSpecific as Array<Record<string, string>>)
        .map((item) => `${item.name ?? ""}=${item.value ?? ""}`)
        .join("\n")
    : "";
  form.policyRefsText = stringifyPolicyRefs(spec.policies as Array<{ name?: string; namespace?: string }> | undefined);
  form.httpSnippets = String(spec["http-snippets"] ?? "");
  form.serverSnippets = String(spec["server-snippets"] ?? "");
  form.upstreams = Array.isArray(spec.upstreams)
    ? (spec.upstreams as Array<Record<string, unknown>>).map((item) => {
        const upstream = defaultUpstreamForm();
        upstream.name = String(item.name ?? "");
        upstream.service = String(item.service ?? "");
        upstream.port = item.port !== undefined ? String(item.port) : "";
        upstream.type = String(item.type ?? "http");
        upstream.tlsEnable = Boolean((item.tls as Record<string, unknown> | undefined)?.enable);
        upstream.useClusterIp = Boolean(item["use-cluster-ip"]);
        upstream.lbMethod = String(item["lb-method"] ?? "");
        upstream.nextUpstream = String(item["next-upstream"] ?? "");
        upstream.nextUpstreamTimeout = String(item["next-upstream-timeout"] ?? "");
        upstream.nextUpstreamTries = item["next-upstream-tries"] !== undefined ? String(item["next-upstream-tries"]) : "";
        upstream.connectTimeout = String(item["connect-timeout"] ?? "");
        upstream.readTimeout = String(item["read-timeout"] ?? "");
        upstream.sendTimeout = String(item["send-timeout"] ?? "");
        upstream.buffering = item.buffering !== false;
        upstream.bufferSize = String(item["buffer-size"] ?? "");
        upstream.clientMaxBodySize = String(item["client-max-body-size"] ?? "");
        upstream.maxConns = item["max-conns"] !== undefined ? String(item["max-conns"]) : "";
        upstream.maxFails = item["max-fails"] !== undefined ? String(item["max-fails"]) : "";
        upstream.failTimeout = String(item["fail-timeout"] ?? "");
        upstream.keepalive = item.keepalive !== undefined ? String(item.keepalive) : "";
        upstream.queueSize = (item.queue as Record<string, unknown> | undefined)?.size !== undefined ? String((item.queue as Record<string, unknown>).size) : "";
        upstream.queueTimeout = String((item.queue as Record<string, unknown> | undefined)?.timeout ?? "");
        upstream.slowStart = String(item["slow-start"] ?? "");
        upstream.subselectorText = stringifyRecordText(item.subselector as Record<string, string> | undefined);
        upstream.healthCheckYaml = stringifyYamlBlock(item.healthCheck);
        const sessionCookie = (item.sessionCookie ?? {}) as Record<string, unknown>;
        upstream.sessionCookieEnable = Boolean(sessionCookie.enable);
        upstream.sessionCookieName = String(sessionCookie.name ?? "route");
        upstream.sessionCookiePath = String(sessionCookie.path ?? "/");
        upstream.sessionCookieDomain = String(sessionCookie.domain ?? "");
        upstream.sessionCookieExpires = String(sessionCookie.expires ?? "");
        upstream.sessionCookieSecure = Boolean(sessionCookie.secure);
        upstream.sessionCookieHttpOnly = Boolean(sessionCookie.httpOnly);
        upstream.sessionCookieSameSite = String(sessionCookie.samesite ?? "");
        return upstream;
      })
    : form.upstreams;
  form.routes = Array.isArray(spec.routes)
    ? (spec.routes as Array<Record<string, unknown>>).map((item) => {
        const route = defaultRouteForm();
        route.path = String(item.path ?? "/");
        const action = (item.action ?? {}) as Record<string, unknown>;
        if ((action.proxy as Record<string, unknown> | undefined)?.upstream) route.actionType = "proxy";
        else if ((action.redirect as Record<string, unknown> | undefined)?.url) route.actionType = "redirect";
        else if (action.return) route.actionType = "return";
        else route.actionType = "pass";
        route.pass = String(action.pass ?? "");
        route.proxyUpstream = String((action.proxy as Record<string, unknown> | undefined)?.upstream ?? "");
        route.rewritePath = String((action.proxy as Record<string, unknown> | undefined)?.rewritePath ?? "");
        route.redirectUrl = String((action.redirect as Record<string, unknown> | undefined)?.url ?? "");
        route.redirectCode = (action.redirect as Record<string, unknown> | undefined)?.code !== undefined ? String((action.redirect as Record<string, unknown>).code) : "";
        route.returnCode = (action.return as Record<string, unknown> | undefined)?.code !== undefined ? String((action.return as Record<string, unknown>).code) : "";
        route.returnType = String((action.return as Record<string, unknown> | undefined)?.type ?? "");
        route.returnBody = String((action.return as Record<string, unknown> | undefined)?.body ?? "");
        route.policyRefsText = stringifyPolicyRefs(item.policies as Array<{ name?: string; namespace?: string }> | undefined);
        route.locationSnippets = String(item["location-snippets"] ?? "");
        route.dos = String(item.dos ?? "");
        route.routeSelectorText = stringifyYamlBlock(item.routeSelector);
        const firstMatch = Array.isArray(item.matches) ? (item.matches[0] as Record<string, unknown> | undefined) : undefined;
        const firstCondition = Array.isArray(firstMatch?.conditions)
          ? ((firstMatch?.conditions as Array<Record<string, unknown>>)[0] ?? undefined)
          : undefined;
        route.matchConditionType = firstCondition?.header
          ? "header"
          : firstCondition?.cookie
            ? "cookie"
            : firstCondition?.argument
              ? "argument"
              : "variable";
        route.matchConditionName = String(firstCondition?.header ?? firstCondition?.cookie ?? firstCondition?.argument ?? firstCondition?.variable ?? "");
        route.matchValue = String(firstCondition?.value ?? "");
        const firstMatchAction = ((firstMatch?.action ?? {}) as Record<string, unknown>) ?? {};
        if (firstMatchAction.pass) {
          route.matchActionType = "pass";
          route.matchActionPass = String(firstMatchAction.pass ?? "");
        } else if (firstMatchAction.proxy) {
          route.matchActionType = "proxy";
          route.matchProxyUpstream = String(((firstMatchAction.proxy as Record<string, unknown>)?.upstream) ?? "");
          route.matchRewritePath = String(((firstMatchAction.proxy as Record<string, unknown>)?.rewritePath) ?? "");
        } else if (firstMatchAction.redirect) {
          route.matchActionType = "redirect";
          route.matchRedirectUrl = String(((firstMatchAction.redirect as Record<string, unknown>)?.url) ?? "");
          route.matchRedirectCode = ((firstMatchAction.redirect as Record<string, unknown>)?.code) !== undefined ? String((firstMatchAction.redirect as Record<string, unknown>)?.code) : "301";
        } else if (firstMatchAction.return) {
          route.matchActionType = "return";
          route.matchReturnCode = ((firstMatchAction.return as Record<string, unknown>)?.code) !== undefined ? String((firstMatchAction.return as Record<string, unknown>)?.code) : "200";
          route.matchReturnType = String(((firstMatchAction.return as Record<string, unknown>)?.type) ?? "text/plain");
          route.matchReturnBody = String(((firstMatchAction.return as Record<string, unknown>)?.body) ?? "");
        }
        const splits = Array.isArray(item.splits) ? (item.splits as Array<Record<string, unknown>>) : [];
        route.splitPrimaryWeight = splits[0]?.weight !== undefined ? String(splits[0].weight) : "80";
        route.splitPrimaryPass = String((((splits[0]?.action ?? {}) as Record<string, unknown>).pass) ?? "");
        route.splitSecondaryWeight = splits[1]?.weight !== undefined ? String(splits[1].weight) : "20";
        route.splitSecondaryPass = String((((splits[1]?.action ?? {}) as Record<string, unknown>).pass) ?? "");
        const errorPage = Array.isArray(item.errorPages) ? ((item.errorPages as Array<Record<string, unknown>>)[0] ?? undefined) : undefined;
        route.errorCodes = Array.isArray(errorPage?.codes) ? (errorPage?.codes as number[]).join("\n") : "";
        if (errorPage?.return) {
          route.errorActionType = "return";
          const errorReturn = errorPage.return as Record<string, unknown>;
          route.errorReturnCode = errorReturn.code !== undefined ? String(errorReturn.code) : "";
          route.errorReturnType = String(errorReturn.type ?? "");
          route.errorReturnBody = String(errorReturn.body ?? "");
        } else {
          route.errorActionType = "redirect";
          const errorRedirect = (errorPage?.redirect ?? {}) as Record<string, unknown>;
          route.errorRedirectCode = errorRedirect.code !== undefined ? String(errorRedirect.code) : "302";
          route.errorRedirectUrl = String(errorRedirect.url ?? "");
        }
        return route;
      })
    : form.routes;
  return form;
}
