import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import YAML from "yaml";
import {
  buildGlobalConfigurationManifest,
  buildPolicyManifest,
  buildSecretManifest,
  buildTransportServerManifest,
  buildVirtualServerManifest,
  buildVirtualServerRouteManifest,
  cacheMethodOptions,
  corsMethodOptions,
  defaultGlobalConfigurationListenerForm,
  defaultPolicyForm,
  defaultRouteForm,
  defaultSecretForm,
  defaultTransportServerUpstreamForm,
  defaultUpstreamForm,
  listenerProtocolOptions,
  logLevelOptions,
  policyTypeOptions,
  rateKeyExamples,
  routeActionOptions,
  sameSiteOptions,
  secretTypeOptions,
  tlsRedirectBasedOnOptions,
  tlsRedirectCodeOptions,
  transportListenerProtocolOptions,
  type ApiKeySuppliedIn,
  type GlobalConfigurationForm,
  type GlobalConfigurationListenerForm,
  type JwtMode,
  type PolicyForm,
  type PolicyType,
  type RateLimitConditionType,
  type RouteForm,
  type RouteActionType,
  type SecretForm,
  type SecretType,
  type TransportServerForm,
  type TransportServerUpstreamForm,
  type UpstreamForm,
  type VerifyClientMode,
  type VirtualServerForm,
  type VirtualServerRouteForm,
  verifyClientOptions,
} from "./resourceBuilders";

export type ClusterOptions = {
  namespaces: string[];
  ingressClasses: string[];
  policies: Array<{ name: string; namespace?: string }>;
  dosResources: Array<{ name: string; namespace?: string }>;
  tlsSecrets: Array<{ name: string; namespace?: string }>;
  apiKeySecrets?: Array<{ name: string; namespace?: string }>;
  htpasswdSecrets?: Array<{ name: string; namespace?: string }>;
  caSecrets?: Array<{ name: string; namespace?: string }>;
  oidcSecrets?: Array<{ name: string; namespace?: string }>;
  jwkSecrets?: Array<{ name: string; namespace?: string }>;
  listeners: string[];
};

type PropsCommon = {
  setManifestText: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string | null>>;
  clusterOptions: ClusterOptions;
  onSubmitManifest: (manifest: Record<string, unknown>, options?: { onCreated?: (value: string) => void }) => Promise<void>;
  onCreateResource: (
    kind: string,
    options?: { namespace?: string; onCreated?: (value: string) => void; initialManifest?: string },
  ) => void;
};

type Option = string | { value: string; label: string };

const createPolicyValue = "__create_policy__";
const createDosValue = "__create_dos__";
const createTlsSecretValue = "__create_tls_secret__";
const createTypedSecretValue = "__create_typed_secret__";
const createListenerValue = "__create_listener__";
const lbMethodOptions = [
  { value: "", label: "Controller default" },
  { value: "round_robin", label: "round_robin" },
  { value: "least_conn", label: "least_conn" },
  { value: "random", label: "random" },
  { value: "random two least_conn", label: "random two least_conn" },
  { value: "ip_hash", label: "ip_hash" },
  { value: "hash $request_uri", label: "hash $request_uri" },
  { value: "hash $cookie_session consistent", label: "hash $cookie_session consistent" },
];
const dnsRecordTypeOptions = [
  { value: "", label: "Controller default" },
  { value: "A", label: "A" },
  { value: "AAAA", label: "AAAA" },
  { value: "CNAME", label: "CNAME" },
  { value: "TXT", label: "TXT" },
];
const errorActionOptions = [
  { value: "redirect", label: "Redirect" },
  { value: "return", label: "Return" },
];
const policyTypeDescriptions: Record<PolicyType, string> = {
  accessControl: "Allow or deny traffic by source address.",
  rateLimit: "Throttle requests using keys, burst, delay, and dry-run settings.",
  apiKey: "Validate client API keys from headers or query parameters.",
  basicAuth: "Require basic auth backed by an htpasswd secret.",
  jwt: "Validate JWT tokens from a secret or remote JWKS.",
  ingressMTLS: "Require and verify client TLS certificates at ingress.",
  egressMTLS: "Use mTLS when the ingress controller connects upstream.",
  externalAuth: "Authenticate requests through an external auth service.",
  oidc: "Use OpenID Connect authentication with an external IdP.",
  waf: "Attach App Protect WAF policy and log settings.",
  cache: "Control NGINX Plus response caching behavior.",
  cors: "Configure cross-origin request handling.",
};

function splitLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(items: string[]) {
  return items.filter(Boolean).join("\n");
}

function updateAtIndex<T>(items: T[], index: number, next: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? next : item));
}

function resourceOptions(items: Array<{ name: string; namespace?: string }>, createValue: string, createLabel: string): Array<{ value: string; label: string }> {
  const built = items.map((item) => ({
    value: item.namespace ? `${item.namespace}/${item.name}` : item.name,
    label: item.namespace ? `${item.namespace}/${item.name}` : item.name,
  }));
  return [{ value: "", label: "None" }, ...built, { value: createValue, label: createLabel }];
}

function secretTypeLabel(secretType: SecretType) {
  return secretTypeOptions.find((option) => option.value === secretType)?.label ?? secretType;
}

function typedSecretItems(clusterOptions: ClusterOptions, secretType: SecretType) {
  if (secretType === "kubernetes.io/tls") return clusterOptions.tlsSecrets;
  if (secretType === "nginx.org/apikey") return clusterOptions.apiKeySecrets ?? [];
  if (secretType === "nginx.org/htpasswd") return clusterOptions.htpasswdSecrets ?? [];
  if (secretType === "nginx.org/ca") return clusterOptions.caSecrets ?? [];
  if (secretType === "nginx.org/oidc") return clusterOptions.oidcSecrets ?? [];
  if (secretType === "nginx.org/jwk") return clusterOptions.jwkSecrets ?? [];
  return [];
}

function normalizeOptions(options: Option[]) {
  return options.map((option) => (typeof option === "string" ? { value: option, label: option } : option));
}

function sectionTitle(title: string, description: string) {
  return (
    <summary>
      <span>{title}</span>
      <small>{description}</small>
    </summary>
  );
}

function Labeled({
  label,
  description,
  required = false,
  children,
}: {
  label: string;
  description: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required ? <span className="required-indicator">Required</span> : null}
        <button type="button" className="help-tip" title={description} aria-label={`${label}: ${description}`}>
          ?
        </button>
      </span>
      {children}
    </label>
  );
}

function Section({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="section-card" open={defaultOpen}>
      {sectionTitle(title, description)}
      <div className="section-body">{children}</div>
    </details>
  );
}

function TextField({
  label,
  description,
  value,
  onChange,
  placeholder = "",
  required = false,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <Labeled label={label} description={description} required={required}>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </Labeled>
  );
}

function TextAreaField({
  label,
  description,
  value,
  onChange,
  placeholder = "",
  rows = 4,
  required = false,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <Labeled label={label} description={description} required={required}>
      <textarea rows={rows} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </Labeled>
  );
}

function SelectField({
  label,
  description,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
}) {
  const normalized = normalizeOptions(options);
  return (
    <Labeled label={label} description={description} required={required}>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Labeled>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="checkbox" title={description}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
      <button type="button" className="help-tip inline" title={description} aria-label={`${label}: ${description}`}>
        ?
      </button>
    </label>
  );
}

function BooleanSelectField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return <ToggleField label={label} description={description} checked={value} onChange={onChange} />;
}

function InlineSettingRow({
  label,
  description,
  children,
  multiline = false,
}: {
  label: string;
  description: string;
  children: ReactNode;
  multiline?: boolean;
}) {
  return (
    <div className={`settings-row ${multiline ? "multiline" : ""}`}>
      <span className="settings-label">
        {label}
        <button type="button" className="help-tip" title={description} aria-label={`${label}: ${description}`}>
          ?
        </button>
      </span>
      <div className="settings-control">{children}</div>
    </div>
  );
}

function NamespaceField({
  value,
  onChange,
  clusterOptions,
}: {
  value: string;
  onChange: (value: string) => void;
  clusterOptions: ClusterOptions;
}) {
  const options = clusterOptions.namespaces.length
    ? clusterOptions.namespaces.map((namespace) => ({ value: namespace, label: namespace }))
    : [{ value, label: value || "default" }];
  return (
    <SelectField
      label="Namespace"
      description="The Kubernetes namespace where this resource will live."
      value={value}
      onChange={onChange}
      options={options}
    />
  );
}

function IngressClassField({
  value,
  onChange,
  clusterOptions,
}: {
  value: string;
  onChange: (value: string) => void;
  clusterOptions: ClusterOptions;
}) {
  return (
    <SelectField
      label="Ingress class"
      description="Select which ingress controller instance should own this resource."
      value={value}
      onChange={onChange}
      options={[{ value: "", label: "None" }, ...clusterOptions.ingressClasses.map((item) => ({ value: item, label: item }))]}
    />
  );
}

function SecretField({
  label,
  description,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return <TextField label={label} description={description} value={value} onChange={onChange} placeholder={placeholder} />;
}

function SettingsRow({
  label,
  description,
  required = false,
  children,
}: {
  label: string;
  description: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="settings-table-row">
      <span className="settings-table-label">
        {label}
        {required ? <span className="required-indicator">Required</span> : null}
        <button type="button" className="help-tip" title={description} aria-label={`${label}: ${description}`}>
          ?
        </button>
      </span>
      <div className="settings-table-control">{children}</div>
    </div>
  );
}

function SettingsTextField({
  label,
  description,
  value,
  onChange,
  placeholder = "",
  required = false,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <SettingsRow label={label} description={description} required={required}>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </SettingsRow>
  );
}

function SettingsTextAreaField({
  label,
  description,
  value,
  onChange,
  placeholder = "",
  rows = 3,
  required = false,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <SettingsRow label={label} description={description} required={required}>
      <textarea rows={rows} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </SettingsRow>
  );
}

function SettingsSelectField({
  label,
  description,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
}) {
  const normalized = normalizeOptions(options);
  return (
    <SettingsRow label={label} description={description} required={required}>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </SettingsRow>
  );
}

function SettingsToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <SettingsRow label={label} description={description}>
      <label className="checkbox settings-checkbox">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span>Enabled</span>
      </label>
    </SettingsRow>
  );
}

function SettingsBooleanField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return <SettingsToggleField label={label} description={description} checked={value} onChange={onChange} />;
}

function SettingsChecklistField({
  label,
  description,
  valuesText,
  options,
  onChange,
  required = false,
}: {
  label: string;
  description: string;
  valuesText: string;
  options: string[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const selected = new Set(splitLines(valuesText));
  return (
    <SettingsRow label={label} description={description} required={required}>
      <div className="settings-checklist">
        {options.map((option) => (
          <label key={option} className="checkbox slim">
            <input
              type="checkbox"
              checked={selected.has(option)}
              onChange={(event) => {
                const next = new Set(selected);
                if (event.target.checked) next.add(option);
                else next.delete(option);
                onChange(joinLines([...next]));
              }}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </SettingsRow>
  );
}

function initialSecretManifest(secretType: SecretType, namespace?: string) {
  const form = defaultSecretForm();
  form.secretType = secretType;
  form.namespace = namespace || form.namespace;
  form.name =
    secretType === "kubernetes.io/tls"
      ? "tls-secret-name"
      : secretType === "nginx.org/apikey"
        ? "apikey-secret-name"
        : secretType === "nginx.org/htpasswd"
          ? "htpasswd-secret-name"
          : secretType === "nginx.org/ca"
            ? "ca-secret-name"
            : secretType === "nginx.org/oidc"
              ? "oidc-secret-name"
              : "jwk-secret-name";
  return YAML.stringify(buildSecretManifest(form));
}

function SettingsSecretSelect({
  label,
  description,
  value,
  onChange,
  clusterOptions,
  onCreateResource,
  secretType,
  namespace,
  required = false,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  clusterOptions: ClusterOptions;
  onCreateResource: (
    kind: string,
    options?: { namespace?: string; onCreated?: (value: string) => void; initialManifest?: string },
  ) => void;
  secretType: SecretType;
  namespace?: string;
  required?: boolean;
}) {
  const options = resourceOptions(typedSecretItems(clusterOptions, secretType), createTypedSecretValue, "Create Secret");
  return (
    <SettingsSelectField
      label={label}
      description={description}
      value={value}
      onChange={(next) => {
        if (next === createTypedSecretValue) {
          onCreateResource("Secret", {
            namespace,
            initialManifest: initialSecretManifest(secretType, namespace),
            onCreated: (created) => onChange(created.includes("/") ? created.split("/").pop() ?? created : created),
          });
          return;
        }
        onChange(next);
      }}
      options={options}
      required={required}
    />
  );
}

type SecretInputSource = "upload" | "paste";

function SecretSourceField({
  label,
  description,
  source,
  onSourceChange,
  fileAccept,
  onFileUpload,
  textValue,
  onTextChange,
  textPlaceholder,
  textRows = 8,
  required = false,
}: {
  label: string;
  description: string;
  source: SecretInputSource;
  onSourceChange: (value: SecretInputSource) => void;
  fileAccept: string;
  onFileUpload: (file: File | null) => void;
  textValue: string;
  onTextChange: (value: string) => void;
  textPlaceholder: string;
  textRows?: number;
  required?: boolean;
}) {
  return (
    <div className="secret-source-field">
      <div className="field-label">
        {label}
        {required ? <span className="required-indicator">Required</span> : null}
        <button type="button" className="help-tip" title={description} aria-label={`${label}: ${description}`}>
          ?
        </button>
      </div>
      <div className="secret-source-options" role="radiogroup" aria-label={`${label} source`}>
        <label className="radio-option">
          <input type="radio" checked={source === "upload"} onChange={() => onSourceChange("upload")} />
          <span>Upload File</span>
        </label>
        <label className="radio-option">
          <input type="radio" checked={source === "paste"} onChange={() => onSourceChange("paste")} />
          <span>Paste Text</span>
        </label>
      </div>
      {source === "upload" ? (
        <input type="file" accept={fileAccept} onChange={(event) => onFileUpload(event.target.files?.[0] ?? null)} />
      ) : (
        <textarea rows={textRows} value={textValue} placeholder={textPlaceholder} onChange={(event) => onTextChange(event.target.value)} />
      )}
    </div>
  );
}

function ResourceRefField({
  label,
  description,
  value,
  onChange,
  options,
  onCreate,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  onCreate: () => void;
}) {
  return (
    <SelectField
      label={label}
      description={description}
      value={splitLines(value)[0] ?? ""}
      onChange={(next) => {
        if (next === createPolicyValue) {
          onCreate();
          return;
        }
        onChange(next);
      }}
      options={options}
    />
  );
}

function PolicyRefsField({
  value,
  onChange,
  clusterOptions,
  onCreateResource,
  label = "Policy refs",
}: {
  value: string;
  onChange: (value: string) => void;
  clusterOptions: ClusterOptions;
  onCreateResource: (kind: string, options?: { namespace?: string; onCreated?: (value: string) => void }) => void;
  label?: string;
}) {
  return (
    <ResourceRefField
      label={label}
      description="Attach one or more Policy resources that NGINX should apply here."
      value={value}
      onChange={onChange}
      options={resourceOptions(clusterOptions.policies, createPolicyValue, "Create new Policy...")}
      onCreate={() => onCreateResource("Policy", { onCreated: onChange })}
    />
  );
}

function DosField({
  value,
  onChange,
  clusterOptions,
  onCreateResource,
}: {
  value: string;
  onChange: (value: string) => void;
  clusterOptions: ClusterOptions;
  onCreateResource: (kind: string, options?: { namespace?: string; onCreated?: (value: string) => void }) => void;
}) {
  return (
    <SelectField
      label="DOS resource"
      description="Reference an App Protect DoS resource for this object."
      value={value}
      onChange={(next) => {
        if (next === createDosValue) {
          onCreateResource("DosProtectedResource", { onCreated: onChange });
          return;
        }
        onChange(next);
      }}
      options={resourceOptions(clusterOptions.dosResources, createDosValue, "Create new DOS resource...")}
    />
  );
}

function TlsSecretField({
  value,
  onChange,
  clusterOptions,
  onCreateResource,
}: {
  value: string;
  onChange: (value: string) => void;
  clusterOptions: ClusterOptions;
  onCreateResource: (kind: string, options?: { namespace?: string; onCreated?: (value: string) => void }) => void;
}) {
  return (
    <SelectField
      label="TLS secret"
      description="Choose the TLS secret used for HTTPS termination."
      value={value}
      onChange={(next) => {
        if (next === createTlsSecretValue) {
          onCreateResource("Secret", { onCreated: onChange });
          return;
        }
        onChange(next);
      }}
      options={resourceOptions(clusterOptions.tlsSecrets, createTlsSecretValue, "Create new TLS secret...")}
    />
  );
}

function listenerOptions(clusterOptions: ClusterOptions) {
  return [
    { value: "", label: "None" },
    ...clusterOptions.listeners.map((item) => ({ value: item, label: item })),
    { value: createListenerValue, label: "Create new listener..." },
  ];
}

function resetRouteForAction(route: RouteForm, actionType: RouteActionType): RouteForm {
  return {
    ...route,
    actionType,
    pass: actionType === "pass" ? route.pass : "",
    proxyUpstream: actionType === "proxy" ? route.proxyUpstream : "",
    rewritePath: actionType === "proxy" ? route.rewritePath : "",
    redirectUrl: actionType === "redirect" ? route.redirectUrl : "",
    redirectCode: actionType === "redirect" ? route.redirectCode : "301",
    returnCode: actionType === "return" ? route.returnCode : "200",
    returnType: actionType === "return" ? route.returnType : "text/plain",
    returnBody: actionType === "return" ? route.returnBody : "",
  };
}

type HttpHealthCheckForm = {
  enable: boolean;
  path: string;
  interval: string;
  jitter: string;
  fails: string;
  passes: string;
  port: string;
  tlsEnable: boolean;
  connectTimeout: string;
  readTimeout: string;
  sendTimeout: string;
  headersText: string;
  statusMatch: string;
  grpcStatus: string;
  grpcService: string;
  mandatory: boolean;
  persistent: boolean;
  keepaliveTime: string;
};

type StreamHealthCheckForm = {
  enable: boolean;
  interval: string;
  jitter: string;
  fails: string;
  passes: string;
  port: string;
  connectTimeout: string;
  matchSend: string;
  matchExpect: string;
};

function parseHttpHealthCheck(value: string): HttpHealthCheckForm {
  const parsed = value.trim() ? ((YAML.parse(value) as Record<string, unknown>) ?? {}) : {};
  const headers = Array.isArray(parsed.headers)
    ? (parsed.headers as Array<Record<string, unknown>>).map((item) => `${String(item.name ?? "")}=${String(item.value ?? "")}`).join("\n")
    : "";
  return {
    enable: Boolean(parsed.enable),
    path: String(parsed.path ?? ""),
    interval: String(parsed.interval ?? ""),
    jitter: String(parsed.jitter ?? ""),
    fails: parsed.fails !== undefined ? String(parsed.fails) : "",
    passes: parsed.passes !== undefined ? String(parsed.passes) : "",
    port: parsed.port !== undefined ? String(parsed.port) : "",
    tlsEnable: Boolean((parsed.tls as Record<string, unknown> | undefined)?.enable),
    connectTimeout: String(parsed["connect-timeout"] ?? ""),
    readTimeout: String(parsed["read-timeout"] ?? ""),
    sendTimeout: String(parsed["send-timeout"] ?? ""),
    headersText: headers,
    statusMatch: String(parsed.statusMatch ?? ""),
    grpcStatus: parsed.grpcStatus !== undefined ? String(parsed.grpcStatus) : "",
    grpcService: String(parsed.grpcService ?? ""),
    mandatory: Boolean(parsed.mandatory),
    persistent: Boolean(parsed.persistent),
    keepaliveTime: String(parsed["keepalive-time"] ?? ""),
  };
}

function buildHttpHealthCheck(form: HttpHealthCheckForm) {
  if (
    !form.enable &&
    !form.path &&
    !form.interval &&
    !form.jitter &&
    !form.fails &&
    !form.passes &&
    !form.port &&
    !form.tlsEnable &&
    !form.connectTimeout &&
    !form.readTimeout &&
    !form.sendTimeout &&
    !form.headersText &&
    !form.statusMatch &&
    !form.grpcStatus &&
    !form.grpcService &&
    !form.mandatory &&
    !form.persistent &&
    !form.keepaliveTime
  ) {
    return "";
  }

  const payload: Record<string, unknown> = {};
  if (form.enable) payload.enable = true;
  if (form.path.trim()) payload.path = form.path.trim();
  if (form.interval.trim()) payload.interval = form.interval.trim();
  if (form.jitter.trim()) payload.jitter = form.jitter.trim();
  if (form.fails.trim()) payload.fails = Number(form.fails);
  if (form.passes.trim()) payload.passes = Number(form.passes);
  if (form.port.trim()) payload.port = Number(form.port);
  if (form.tlsEnable) payload.tls = { enable: true };
  if (form.connectTimeout.trim()) payload["connect-timeout"] = form.connectTimeout.trim();
  if (form.readTimeout.trim()) payload["read-timeout"] = form.readTimeout.trim();
  if (form.sendTimeout.trim()) payload["send-timeout"] = form.sendTimeout.trim();
  if (form.headersText.trim()) {
    payload.headers = splitLines(form.headersText).map((entry) => {
      const [name, ...rest] = entry.split("=");
      return { name: name.trim(), value: rest.join("=").trim() };
    });
  }
  if (form.statusMatch.trim()) payload.statusMatch = form.statusMatch.trim();
  if (form.grpcStatus.trim()) payload.grpcStatus = Number(form.grpcStatus);
  if (form.grpcService.trim()) payload.grpcService = form.grpcService.trim();
  if (form.mandatory) payload.mandatory = true;
  if (form.persistent) payload.persistent = true;
  if (form.keepaliveTime.trim()) payload["keepalive-time"] = form.keepaliveTime.trim();
  return YAML.stringify(payload).trim();
}

function parseStreamHealthCheck(value: string): StreamHealthCheckForm {
  const parsed = value.trim() ? ((YAML.parse(value) as Record<string, unknown>) ?? {}) : {};
  const match = (parsed.match as Record<string, unknown> | undefined) ?? {};
  return {
    enable: Boolean(parsed.enable),
    interval: String(parsed.interval ?? ""),
    jitter: String(parsed.jitter ?? ""),
    fails: parsed.fails !== undefined ? String(parsed.fails) : "",
    passes: parsed.passes !== undefined ? String(parsed.passes) : "",
    port: parsed.port !== undefined ? String(parsed.port) : "",
    connectTimeout: String(parsed.connectTimeout ?? ""),
    matchSend: String(match.send ?? ""),
    matchExpect: String(match.expect ?? ""),
  };
}

function buildStreamHealthCheck(form: StreamHealthCheckForm) {
  if (
    !form.enable &&
    !form.interval &&
    !form.jitter &&
    !form.fails &&
    !form.passes &&
    !form.port &&
    !form.connectTimeout &&
    !form.matchSend &&
    !form.matchExpect
  ) {
    return "";
  }

  const payload: Record<string, unknown> = {};
  if (form.enable) payload.enable = true;
  if (form.interval.trim()) payload.interval = form.interval.trim();
  if (form.jitter.trim()) payload.jitter = form.jitter.trim();
  if (form.fails.trim()) payload.fails = Number(form.fails);
  if (form.passes.trim()) payload.passes = Number(form.passes);
  if (form.port.trim()) payload.port = Number(form.port);
  if (form.connectTimeout.trim()) payload.connectTimeout = form.connectTimeout.trim();
  if (form.matchSend.trim() || form.matchExpect.trim()) {
    payload.match = {
      ...(form.matchSend.trim() ? { send: form.matchSend.trim() } : {}),
      ...(form.matchExpect.trim() ? { expect: form.matchExpect.trim() } : {}),
    };
  }
  return YAML.stringify(payload).trim();
}

function UpstreamEditor({
  upstream,
  onChange,
  onRemove,
}: {
  upstream: UpstreamForm;
  onChange: (next: UpstreamForm) => void;
  onRemove?: () => void;
}) {
  const healthCheck = useMemo(() => parseHttpHealthCheck(upstream.healthCheckYaml), [upstream.healthCheckYaml]);
  const updateHealthCheck = (next: Partial<HttpHealthCheckForm>) =>
    onChange({ ...upstream, healthCheckYaml: buildHttpHealthCheck({ ...healthCheck, ...next }) });
  const isGrpcUpstream = upstream.type === "grpc";

  return (
    <div className="nested-card">
      <div className="panel-heading compact">
        <h4>{upstream.name || "Upstream"}</h4>
        {onRemove ? (
          <button type="button" className="danger" onClick={onRemove}>
            Remove
          </button>
        ) : null}
      </div>

      <Section title="Service" description="Basic upstream identity and service mapping" defaultOpen>
        <div className="builder-grid">
          <TextField label="Name" description="Unique upstream name referenced by route actions." value={upstream.name} onChange={(value) => onChange({ ...upstream, name: value })} placeholder="app" required />
          <TextField label="Service" description="Kubernetes Service that backs this upstream." value={upstream.service} onChange={(value) => onChange({ ...upstream, service: value })} placeholder="app-service" required />
          <TextField label="Port" description="Service port exposed by the upstream." value={upstream.port} onChange={(value) => onChange({ ...upstream, port: value })} placeholder="80" required />
          <SelectField label="Type" description="Protocol used between NGINX and the upstream service." value={upstream.type} onChange={(value) => onChange({ ...upstream, type: value })} options={["http", "grpc"]} />
          <BooleanSelectField label="TLS to upstream" description="Send traffic to this upstream over TLS." value={upstream.tlsEnable} onChange={(value) => onChange({ ...upstream, tlsEnable: value })} />
          <BooleanSelectField label="Use cluster IP" description="Send traffic to the Service ClusterIP instead of individual pod endpoints." value={upstream.useClusterIp} onChange={(value) => onChange({ ...upstream, useClusterIp: value })} />
        </div>
      </Section>

      <Section title="Load Balancing" description="Retry logic and server selection">
        <div className="settings-list">
          <InlineSettingRow label="LB method" description="Method NGINX uses to select a backend endpoint.">
            <select value={upstream.lbMethod} onChange={(event) => onChange({ ...upstream, lbMethod: event.target.value })}>
              {normalizeOptions(lbMethodOptions).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </InlineSettingRow>
          <InlineSettingRow label="Next upstream" description="Failure conditions that should retry another endpoint.">
            <input value={upstream.nextUpstream} onChange={(event) => onChange({ ...upstream, nextUpstream: event.target.value })} placeholder="example: error timeout invalid_header" />
          </InlineSettingRow>
          <InlineSettingRow label="Next upstream timeout" description="Total retry window across endpoints. Default: 0.">
            <input value={upstream.nextUpstreamTimeout} onChange={(event) => onChange({ ...upstream, nextUpstreamTimeout: event.target.value })} placeholder="default: 0" />
          </InlineSettingRow>
          <InlineSettingRow label="Next upstream tries" description="Maximum number of retry attempts. Default: 0.">
            <input value={upstream.nextUpstreamTries} onChange={(event) => onChange({ ...upstream, nextUpstreamTries: event.target.value })} placeholder="default: 0" />
          </InlineSettingRow>
          <InlineSettingRow label="Max conns" description="Maximum active connections per backend endpoint. Default: unlimited.">
            <input value={upstream.maxConns} onChange={(event) => onChange({ ...upstream, maxConns: event.target.value })} placeholder="default: unlimited" />
          </InlineSettingRow>
          <InlineSettingRow label="Max fails" description="Failures before an endpoint is marked unavailable. Default: 1.">
            <input value={upstream.maxFails} onChange={(event) => onChange({ ...upstream, maxFails: event.target.value })} placeholder="default: 1" />
          </InlineSettingRow>
          <InlineSettingRow label="Fail timeout" description="Window used together with max fails. Default: 10s.">
            <input value={upstream.failTimeout} onChange={(event) => onChange({ ...upstream, failTimeout: event.target.value })} placeholder="default: 10s" />
          </InlineSettingRow>
          <InlineSettingRow label="Slow start" description="Ramp-up period after an endpoint becomes healthy again. Default: disabled.">
            <input value={upstream.slowStart} onChange={(event) => onChange({ ...upstream, slowStart: event.target.value })} placeholder="default: disabled" />
          </InlineSettingRow>
        </div>
      </Section>

      <Section title="Timeouts and Buffers" description="HTTP connection and buffering behavior">
        <div className="settings-list">
          <InlineSettingRow label="Connect timeout" description="Time allowed to establish a backend connection. Default: from ConfigMap.">
            <input value={upstream.connectTimeout} onChange={(event) => onChange({ ...upstream, connectTimeout: event.target.value })} placeholder="default: from ConfigMap" />
          </InlineSettingRow>
          <InlineSettingRow label="Read timeout" description="Time allowed to read a backend response. Default: from ConfigMap.">
            <input value={upstream.readTimeout} onChange={(event) => onChange({ ...upstream, readTimeout: event.target.value })} placeholder="default: from ConfigMap" />
          </InlineSettingRow>
          <InlineSettingRow label="Send timeout" description="Time allowed to send the request upstream. Default: from ConfigMap.">
            <input value={upstream.sendTimeout} onChange={(event) => onChange({ ...upstream, sendTimeout: event.target.value })} placeholder="default: from ConfigMap" />
          </InlineSettingRow>
          <InlineSettingRow label="Buffering" description="Buffer upstream responses before returning them to the client.">
            <input type="checkbox" checked={upstream.buffering} onChange={(event) => onChange({ ...upstream, buffering: event.target.checked })} />
          </InlineSettingRow>
          <InlineSettingRow label="Buffer size" description="Buffer used for the first part of the upstream response. Default: from ConfigMap.">
            <input value={upstream.bufferSize} onChange={(event) => onChange({ ...upstream, bufferSize: event.target.value })} placeholder="default: from ConfigMap" />
          </InlineSettingRow>
          <InlineSettingRow label="Client max body size" description="Maximum request body size accepted for this upstream. Default: from ConfigMap.">
            <input value={upstream.clientMaxBodySize} onChange={(event) => onChange({ ...upstream, clientMaxBodySize: event.target.value })} placeholder="default: from ConfigMap" />
          </InlineSettingRow>
          <InlineSettingRow label="Keepalive" description="Number of idle keepalive connections to cache. Default: from ConfigMap.">
            <input value={upstream.keepalive} onChange={(event) => onChange({ ...upstream, keepalive: event.target.value })} placeholder="default: from ConfigMap" />
          </InlineSettingRow>
          <InlineSettingRow label="Queue size" description="Number of requests that may wait for an endpoint. Default: disabled.">
            <input value={upstream.queueSize} onChange={(event) => onChange({ ...upstream, queueSize: event.target.value })} placeholder="default: disabled" />
          </InlineSettingRow>
          <InlineSettingRow label="Queue timeout" description="How long a request may wait in the queue. Default: 60s.">
            <input value={upstream.queueTimeout} onChange={(event) => onChange({ ...upstream, queueTimeout: event.target.value })} placeholder="default: 60s" />
          </InlineSettingRow>
        </div>
      </Section>

      <Section title="Health Check" description="NGINX Plus active health checks for this upstream">
        <div className="settings-list">
          <InlineSettingRow label="Enable health check" description="Enable NGINX Plus active health checks for this upstream. Default: false.">
            <input type="checkbox" checked={healthCheck.enable} onChange={(event) => updateHealthCheck({ enable: event.target.checked })} />
          </InlineSettingRow>
          {healthCheck.enable ? (
            <>
              {!isGrpcUpstream ? (
                <InlineSettingRow label="Path" description="Path used for health check requests. Default: /.">
                  <input value={healthCheck.path} onChange={(event) => updateHealthCheck({ path: event.target.value })} placeholder="default: /" />
                </InlineSettingRow>
              ) : null}
              <InlineSettingRow label="Interval" description="Interval between health checks. Default: 5s.">
                <input value={healthCheck.interval} onChange={(event) => updateHealthCheck({ interval: event.target.value })} placeholder="default: 5s" />
              </InlineSettingRow>
              <InlineSettingRow label="Jitter" description="Random delay applied to each health check. Default: no delay.">
                <input value={healthCheck.jitter} onChange={(event) => updateHealthCheck({ jitter: event.target.value })} placeholder="default: no delay" />
              </InlineSettingRow>
              <InlineSettingRow label="Fails" description="Consecutive failed checks before marking unhealthy. Default: 1.">
                <input value={healthCheck.fails} onChange={(event) => updateHealthCheck({ fails: event.target.value })} placeholder="default: 1" />
              </InlineSettingRow>
              <InlineSettingRow label="Passes" description="Consecutive successful checks before marking healthy. Default: 1.">
                <input value={healthCheck.passes} onChange={(event) => updateHealthCheck({ passes: event.target.value })} placeholder="default: 1" />
              </InlineSettingRow>
              <InlineSettingRow label="Port" description="Pod port used for health checks. Default: upstream server port.">
                <input value={healthCheck.port} onChange={(event) => updateHealthCheck({ port: event.target.value })} placeholder="default: upstream pod port" />
              </InlineSettingRow>
              <InlineSettingRow label="Health-check TLS" description="Use TLS for health check requests. Default: use the upstream TLS setting.">
                <input type="checkbox" checked={healthCheck.tlsEnable} onChange={(event) => updateHealthCheck({ tlsEnable: event.target.checked })} />
              </InlineSettingRow>
              <InlineSettingRow label="Connect timeout" description="Connection timeout for the health check. Default: use upstream connect-timeout.">
                <input value={healthCheck.connectTimeout} onChange={(event) => updateHealthCheck({ connectTimeout: event.target.value })} placeholder="default: upstream connect-timeout" />
              </InlineSettingRow>
              <InlineSettingRow label="Read timeout" description="Read timeout for the health check. Default: use upstream read-timeout.">
                <input value={healthCheck.readTimeout} onChange={(event) => updateHealthCheck({ readTimeout: event.target.value })} placeholder="default: upstream read-timeout" />
              </InlineSettingRow>
              <InlineSettingRow label="Send timeout" description="Send timeout for the health check. Default: use upstream send-timeout.">
                <input value={healthCheck.sendTimeout} onChange={(event) => updateHealthCheck({ sendTimeout: event.target.value })} placeholder="default: upstream send-timeout" />
              </InlineSettingRow>
              <InlineSettingRow label="Headers" description="Headers sent with health check requests. NGINX Plus always sets Host, User-Agent, and Connection." multiline>
                <textarea rows={4} value={healthCheck.headersText} onChange={(event) => updateHealthCheck({ headersText: event.target.value })} placeholder="example: Host=my.service" />
              </InlineSettingRow>
              {!isGrpcUpstream ? (
                <InlineSettingRow label="Status match" description="Expected HTTP response status. Default: 2xx or 3xx.">
                  <input value={healthCheck.statusMatch} onChange={(event) => updateHealthCheck({ statusMatch: event.target.value })} placeholder="example: ! 500" />
                </InlineSettingRow>
              ) : (
                <InlineSettingRow label="gRPC status" description="Expected gRPC status code. Configure only when the service does not implement the standard gRPC health protocol.">
                  <input value={healthCheck.grpcStatus} onChange={(event) => updateHealthCheck({ grpcStatus: event.target.value })} placeholder="example: 12" />
                </InlineSettingRow>
              )}
              {isGrpcUpstream ? (
                <InlineSettingRow label="gRPC service" description="The gRPC service to monitor. Only valid for gRPC upstreams.">
                  <input value={healthCheck.grpcService} onChange={(event) => updateHealthCheck({ grpcService: event.target.value })} placeholder="example: grpc.health.v1.Health" />
                </InlineSettingRow>
              ) : null}
              <InlineSettingRow label="Mandatory" description="Require new servers to pass health checks before receiving traffic. Default: false.">
                <input type="checkbox" checked={healthCheck.mandatory} onChange={(event) => updateHealthCheck({ mandatory: event.target.checked })} />
              </InlineSettingRow>
              <InlineSettingRow label="Persistent" description="Preserve healthy state across reloads. Default: false. Requires Mandatory.">
                <input type="checkbox" checked={healthCheck.persistent} onChange={(event) => updateHealthCheck({ persistent: event.target.checked })} />
              </InlineSettingRow>
              <InlineSettingRow label="Keepalive time" description="Keepalive time for health check connections. Default: 60s.">
                <input value={healthCheck.keepaliveTime} onChange={(event) => updateHealthCheck({ keepaliveTime: event.target.value })} placeholder="default: 60s" />
              </InlineSettingRow>
            </>
          ) : null}
        </div>
      </Section>

      <Section title="Session Persistence" description="Session persistence and endpoint selection">
        <div className="settings-list">
          <InlineSettingRow label="Subselector labels" description="Pod labels used to narrow which endpoints join this upstream." multiline>
            <textarea rows={4} value={upstream.subselectorText} onChange={(event) => onChange({ ...upstream, subselectorText: event.target.value })} placeholder={"example: app=tea\ntrack=stable"} />
          </InlineSettingRow>
          <InlineSettingRow label="Sticky session cookie" description="Enable sticky sessions using an NGINX-generated cookie.">
            <input type="checkbox" checked={upstream.sessionCookieEnable} onChange={(event) => onChange({ ...upstream, sessionCookieEnable: event.target.checked })} />
          </InlineSettingRow>
          <InlineSettingRow label="Cookie name" description="Name of the sticky-session cookie.">
            <input value={upstream.sessionCookieName} onChange={(event) => onChange({ ...upstream, sessionCookieName: event.target.value })} placeholder="example: route" />
          </InlineSettingRow>
          <InlineSettingRow label="Cookie path" description="Path attribute for the sticky-session cookie.">
            <input value={upstream.sessionCookiePath} onChange={(event) => onChange({ ...upstream, sessionCookiePath: event.target.value })} placeholder="example: /" />
          </InlineSettingRow>
          <InlineSettingRow label="Cookie domain" description="Domain attribute for the sticky-session cookie.">
            <input value={upstream.sessionCookieDomain} onChange={(event) => onChange({ ...upstream, sessionCookieDomain: event.target.value })} placeholder="example: app.example.com" />
          </InlineSettingRow>
          <InlineSettingRow label="Cookie expires" description="Expiration or max-age setting for the sticky-session cookie. Default: session cookie.">
            <input value={upstream.sessionCookieExpires} onChange={(event) => onChange({ ...upstream, sessionCookieExpires: event.target.value })} placeholder="default: session cookie" />
          </InlineSettingRow>
          <InlineSettingRow label="SameSite" description="SameSite attribute for the sticky-session cookie.">
            <select value={upstream.sessionCookieSameSite} onChange={(event) => onChange({ ...upstream, sessionCookieSameSite: event.target.value })}>
              {[{ value: "", label: "None" }, ...sameSiteOptions.map((option) => ({ value: option, label: option }))].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </InlineSettingRow>
          <InlineSettingRow label="Cookie secure" description="Mark the sticky-session cookie as Secure.">
            <input type="checkbox" checked={upstream.sessionCookieSecure} onChange={(event) => onChange({ ...upstream, sessionCookieSecure: event.target.checked })} />
          </InlineSettingRow>
          <InlineSettingRow label="Cookie HttpOnly" description="Mark the sticky-session cookie as HttpOnly.">
            <input type="checkbox" checked={upstream.sessionCookieHttpOnly} onChange={(event) => onChange({ ...upstream, sessionCookieHttpOnly: event.target.checked })} />
          </InlineSettingRow>
        </div>
      </Section>
    </div>
  );
}

function RouteEditor({
  route,
  title,
  onChange,
  onRemove,
  clusterOptions,
  onCreateResource,
}: {
  route: RouteForm;
  title: string;
  onChange: (next: RouteForm) => void;
  onRemove?: () => void;
  clusterOptions: ClusterOptions;
  onCreateResource: (kind: string, options?: { namespace?: string; onCreated?: (value: string) => void }) => void;
}) {
  return (
    <div className="nested-card">
      <div className="panel-heading compact">
        <h4>{title}</h4>
        {onRemove ? (
          <button type="button" className="danger" onClick={onRemove}>
            Remove
          </button>
        ) : null}
      </div>

      <Section title="Route" description="Path matching and the action applied to matching requests" defaultOpen>
        <div className="builder-grid">
          <TextField label="Path" description="Route path, exact match, or regex pattern." value={route.path} onChange={(value) => onChange({ ...route, path: value })} placeholder="example: /tea or ~ ^/v[0-9]+/" required />
          <SelectField label="Action type" description="Choose how requests matching this route should be handled." value={route.actionType} onChange={(value) => onChange(resetRouteForAction(route, value as RouteActionType))} options={routeActionOptions} required />
          {route.actionType === "pass" ? (
            <TextField label="Pass upstream" description="Upstream that receives matching requests." value={route.pass} onChange={(value) => onChange({ ...route, pass: value })} placeholder="example: tea" required />
          ) : null}
          {route.actionType === "proxy" ? (
            <>
              <TextField label="Proxy upstream" description="Upstream that receives proxied requests." value={route.proxyUpstream} onChange={(value) => onChange({ ...route, proxyUpstream: value })} placeholder="example: api" required />
              <TextField label="Rewrite path" description="Optional rewritten URI sent to the upstream." value={route.rewritePath} onChange={(value) => onChange({ ...route, rewritePath: value })} placeholder="example: /v1/$1" />
            </>
          ) : null}
          {route.actionType === "redirect" ? (
            <>
              <TextField label="Redirect URL" description="Destination URL returned in the redirect response." value={route.redirectUrl} onChange={(value) => onChange({ ...route, redirectUrl: value })} placeholder="example: https://www.example.com$request_uri" />
              <SelectField label="Redirect code" description="HTTP status code used for redirects." value={route.redirectCode} onChange={(value) => onChange({ ...route, redirectCode: value })} options={tlsRedirectCodeOptions} />
            </>
          ) : null}
          {route.actionType === "return" ? (
            <>
              <TextField label="Return code" description="HTTP status code returned directly by NGINX." value={route.returnCode} onChange={(value) => onChange({ ...route, returnCode: value })} placeholder="example: 200" />
              <TextField label="Return type" description="MIME type of the custom response body." value={route.returnType} onChange={(value) => onChange({ ...route, returnType: value })} placeholder="example: application/json" />
              <TextAreaField label="Return body" description="Literal response body returned by NGINX." value={route.returnBody} onChange={(value) => onChange({ ...route, returnBody: value })} placeholder='example: {"message":"ok"}' />
            </>
          ) : null}
          <DosField value={route.dos} onChange={(value) => onChange({ ...route, dos: value })} clusterOptions={clusterOptions} onCreateResource={onCreateResource} />
          <TextAreaField label="Route selector" description="Advanced selector used when automatically including VirtualServerRoutes." value={route.routeSelectorText} onChange={(value) => onChange({ ...route, routeSelectorText: value })} placeholder={"example:\nmatchLabels:\n  app: cafe"} rows={5} />
        </div>
        <PolicyRefsField value={route.policyRefsText} onChange={(value) => onChange({ ...route, policyRefsText: value })} clusterOptions={clusterOptions} onCreateResource={onCreateResource} label="Route policy refs" />
      </Section>

      <Section title="Matches" description="Optional content-based header match rule">
        <div className="builder-grid">
          <SelectField label="Condition type" description="Condition source used by this match rule." value={route.matchConditionType} onChange={(value) => onChange({ ...route, matchConditionType: value as RouteForm["matchConditionType"] })} options={["header", "cookie", "argument", "variable"]} />
          <TextField label="Condition name" description="Header, cookie, argument, or variable name used by the match condition." value={route.matchConditionName} onChange={(value) => onChange({ ...route, matchConditionName: value })} placeholder={route.matchConditionType === "variable" ? "example: $request_method" : "example: user"} />
          <TextField label="Condition value" description="Value to compare against, including exact or regex-based matches." value={route.matchValue} onChange={(value) => onChange({ ...route, matchValue: value })} placeholder="example: john or ~*^mobile" />
          <SelectField label="Match action" description="Action used when this match rule succeeds." value={route.matchActionType} onChange={(value) => onChange({ ...route, matchActionType: value as RouteForm["matchActionType"] })} options={routeActionOptions} />
          {route.matchActionType === "pass" ? (
            <TextField label="Match pass upstream" description="Upstream used when the match succeeds." value={route.matchActionPass} onChange={(value) => onChange({ ...route, matchActionPass: value })} placeholder="example: mobile-app" />
          ) : null}
          {route.matchActionType === "proxy" ? (
            <>
              <TextField label="Match proxy upstream" description="Upstream used for a proxy action when the match succeeds." value={route.matchProxyUpstream} onChange={(value) => onChange({ ...route, matchProxyUpstream: value })} placeholder="example: mobile-app" />
              <TextField label="Match rewrite path" description="Optional rewritten URI sent upstream for the match action." value={route.matchRewritePath} onChange={(value) => onChange({ ...route, matchRewritePath: value })} placeholder="example: /m/$1" />
            </>
          ) : null}
          {route.matchActionType === "redirect" ? (
            <>
              <TextField label="Match redirect URL" description="Redirect destination used when the match succeeds." value={route.matchRedirectUrl} onChange={(value) => onChange({ ...route, matchRedirectUrl: value })} placeholder="example: https://m.example.com$request_uri" />
              <SelectField label="Match redirect code" description="Redirect status code used for the match action." value={route.matchRedirectCode} onChange={(value) => onChange({ ...route, matchRedirectCode: value })} options={tlsRedirectCodeOptions} />
            </>
          ) : null}
          {route.matchActionType === "return" ? (
            <>
              <TextField label="Match return code" description="HTTP status returned when the match succeeds." value={route.matchReturnCode} onChange={(value) => onChange({ ...route, matchReturnCode: value })} placeholder="example: 200" />
              <TextField label="Match return type" description="MIME type of the returned body." value={route.matchReturnType} onChange={(value) => onChange({ ...route, matchReturnType: value })} placeholder="example: application/json" />
              <TextAreaField label="Match return body" description="Literal body returned when the match succeeds." value={route.matchReturnBody} onChange={(value) => onChange({ ...route, matchReturnBody: value })} placeholder='example: {"message":"ok"}' />
            </>
          ) : null}
        </div>
      </Section>

      <Section title="Splits" description="Optional two-way traffic split between upstreams">
        <div className="builder-grid">
          <TextField label="Primary weight" description="Traffic percentage or weight for the primary upstream." value={route.splitPrimaryWeight} onChange={(value) => onChange({ ...route, splitPrimaryWeight: value })} placeholder="example: 80" />
          <TextField label="Primary upstream" description="Upstream name used for the primary share." value={route.splitPrimaryPass} onChange={(value) => onChange({ ...route, splitPrimaryPass: value })} placeholder="example: stable" />
          <TextField label="Secondary weight" description="Traffic percentage or weight for the secondary upstream." value={route.splitSecondaryWeight} onChange={(value) => onChange({ ...route, splitSecondaryWeight: value })} placeholder="example: 20" />
          <TextField label="Secondary upstream" description="Upstream name used for the secondary share." value={route.splitSecondaryPass} onChange={(value) => onChange({ ...route, splitSecondaryPass: value })} placeholder="example: canary" />
        </div>
      </Section>

      <Section title="Error Pages" description="Custom redirect or response for selected error codes">
        <div className="builder-grid">
          <TextAreaField label="Error codes" description="Status codes that should trigger this custom error handling." value={route.errorCodes} onChange={(value) => onChange({ ...route, errorCodes: value })} placeholder="example: 404&#10;500" />
          <SelectField label="Error action type" description="Choose whether matching errors should redirect or return a custom response." value={route.errorActionType} onChange={(value) => onChange({ ...route, errorActionType: value as RouteForm["errorActionType"] })} options={errorActionOptions} />
          {route.errorActionType === "redirect" ? (
            <>
              <SelectField label="Redirect code" description="HTTP redirect status code returned for matching errors." value={route.errorRedirectCode} onChange={(value) => onChange({ ...route, errorRedirectCode: value })} options={tlsRedirectCodeOptions} />
              <TextField label="Redirect URL" description="URL returned when these errors occur." value={route.errorRedirectUrl} onChange={(value) => onChange({ ...route, errorRedirectUrl: value })} placeholder="example: /error.html" />
            </>
          ) : (
            <>
              <TextField label="Return code" description="Status code returned with the custom error body." value={route.errorReturnCode} onChange={(value) => onChange({ ...route, errorReturnCode: value })} placeholder="example: 200" />
              <TextField label="Return type" description="MIME type of the custom error body." value={route.errorReturnType} onChange={(value) => onChange({ ...route, errorReturnType: value })} placeholder="example: application/json" />
              <TextAreaField label="Return body" description="Literal body returned for the selected error codes." value={route.errorReturnBody} onChange={(value) => onChange({ ...route, errorReturnBody: value })} placeholder='example: {"message":"fallback"}' />
            </>
          )}
        </div>
      </Section>

      <Section title="Snippets" description="Location-level raw NGINX directives for this route">
        <div className="builder-grid">
          <TextAreaField label="Location snippets" description="Custom directives injected into the location block for this route." value={route.locationSnippets} onChange={(value) => onChange({ ...route, locationSnippets: value })} placeholder="" />
        </div>
      </Section>
    </div>
  );
}

function PolicyTypeField({
  form,
  setForm,
  onSelected,
  selected,
}: {
  form: PolicyForm;
  setForm: Dispatch<SetStateAction<PolicyForm>>;
  onSelected?: () => void;
  selected: boolean;
}) {
  return (
    <SelectField
      label="Policy type"
      description={selected ? policyTypeDescriptions[form.policyType] : "Choose the single policy type this resource will define."}
      value={selected ? form.policyType : ""}
      onChange={(value) => {
        if (!value) return;
        onSelected?.();
        setForm((current) => {
          const next = defaultPolicyForm(value as PolicyType);
          next.name = current.name;
          next.namespace = current.namespace;
          return next;
        });
      }}
      options={[{ value: "", label: "Select policy type" }, ...policyTypeOptions]}
      required
    />
  );
}

function multiSelectChecklist({
  label,
  description,
  valuesText,
  options,
  onChange,
}: {
  label: string;
  description: string;
  valuesText: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const selected = new Set(splitLines(valuesText));
  return (
    <div className="field">
      <span className="field-label">
        {label}
        <button type="button" className="help-tip" title={description} aria-label={`${label}: ${description}`}>
          ?
        </button>
      </span>
      <div className="checklist">
        {options.map((option) => (
          <label key={option} className="checkbox slim">
            <input
              type="checkbox"
              checked={selected.has(option)}
              onChange={(event) => {
                const next = new Set(selected);
                if (event.target.checked) next.add(option);
                else next.delete(option);
                onChange(joinLines([...next]));
              }}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function PolicySettings({
  form,
  update,
  clusterOptions,
  onCreateResource,
}: {
  form: PolicyForm;
  update: <K extends keyof PolicyForm>(key: K, value: PolicyForm[K]) => void;
  clusterOptions: ClusterOptions;
  onCreateResource: PropsCommon["onCreateResource"];
}) {
  const hasAccessConflict = Boolean(form.accessAllow.trim() && form.accessDeny.trim());
  const keyMode = rateKeyExamples.includes(form.key) ? form.key : "__custom__";

  if (form.policyType === "accessControl") {
    return (
      <div className="settings-table">
        {hasAccessConflict ? (
          <div className="inline-warning">Allow and deny lists are both set. NGINX Ingress Controller uses only the allow list when both are referenced.</div>
        ) : null}
        <SettingsTextAreaField label="Allow list" description="CIDRs or IPs that are allowed." value={form.accessAllow} onChange={(value) => update("accessAllow", value)} placeholder="example: 10.0.0.0/8" rows={1} />
        <SettingsTextAreaField label="Deny list" description="CIDRs or IPs that are denied." value={form.accessDeny} onChange={(value) => update("accessDeny", value)} placeholder="example: 0.0.0.0/0" rows={1} />
      </div>
    );
  }

  if (form.policyType === "rateLimit") {
    return (
      <div className="settings-table">
        <SettingsTextField label="Rate" description="Maximum request rate, for example 10r/s." value={form.rate} onChange={(value) => update("rate", value)} placeholder="example: 10r/s" required />
        <SettingsTextField label="Zone size" description="Shared memory zone size used to track counters." value={form.zoneSize} onChange={(value) => update("zoneSize", value)} placeholder="example: 10M" required />
        <SettingsSelectField
          label="Key"
          description="Rate-limit key expression."
          value={keyMode}
          onChange={(value) => update("key", value === "__custom__" ? "" : value)}
          options={[...rateKeyExamples.map((option) => ({ value: option, label: option })), { value: "__custom__", label: "Custom key" }]}
          required
        />
        {keyMode === "__custom__" ? <SettingsTextField label="Custom key" description="Advanced variable or expression used to count requests." value={form.key} onChange={(value) => update("key", value)} placeholder="example: ${binary_remote_addr}" required /> : null}
        <SettingsTextField label="Burst" description="Number of excessive requests that may queue before rejection." value={form.burst} onChange={(value) => update("burst", value)} placeholder="example: 20" />
        <SettingsTextField label="Delay" description="Threshold where excessive requests start being delayed." value={form.delay} onChange={(value) => update("delay", value)} placeholder="example: 5" />
        <SettingsSelectField label="Log level" description="Severity used when delayed or rejected requests are logged." value={form.logLevel} onChange={(value) => update("logLevel", value)} options={logLevelOptions} />
        <SettingsTextField label="Reject code" description="HTTP status returned when requests are rejected." value={form.rejectCode} onChange={(value) => update("rejectCode", value)} placeholder="default: 503" />
        <SettingsToggleField label="Condition" description="Limit requests only when a condition matches." checked={form.conditionEnabled} onChange={(value) => {
          update("conditionEnabled", value);
          update("conditionDefault", value && form.conditionType === "default");
          if (!value) {
            update("conditionType", "default");
            update("conditionJwtClaim", "");
            update("conditionJwtMatch", "");
            update("conditionVarName", "");
            update("conditionVarMatch", "");
          }
        }} />
        {form.conditionEnabled ? (
          <>
            <SettingsSelectField
              label="Condition type"
              description="Choose which documented condition form to use."
              value={form.conditionType}
              onChange={(value) => {
                const next = value as RateLimitConditionType;
                update("conditionType", next);
                update("conditionDefault", next === "default");
                if (next !== "jwt") {
                  update("conditionJwtClaim", "");
                  update("conditionJwtMatch", "");
                }
                if (next !== "variable") {
                  update("conditionVarName", "");
                  update("conditionVarMatch", "");
                }
              }}
              options={[
                { value: "default", label: "Default condition" },
                { value: "jwt", label: "JWT claim" },
                { value: "variable", label: "Variable" },
              ]}
            />
            {form.conditionType === "jwt" ? (
              <>
                <SettingsTextField label="JWT claim" description="JWT claim used by the condition." value={form.conditionJwtClaim} onChange={(value) => update("conditionJwtClaim", value)} placeholder="example: sub" />
                <SettingsTextField label="JWT match" description="Value or regex the JWT claim must match." value={form.conditionJwtMatch} onChange={(value) => update("conditionJwtMatch", value)} placeholder="example: ^admin" />
              </>
            ) : null}
            {form.conditionType === "variable" ? (
              <>
                <SettingsTextField label="Variable name" description="NGINX variable used by the condition." value={form.conditionVarName} onChange={(value) => update("conditionVarName", value)} placeholder="example: $request_method" />
                <SettingsTextField label="Variable match" description="Value or regex the variable must match." value={form.conditionVarMatch} onChange={(value) => update("conditionVarMatch", value)} placeholder="example: POST" />
              </>
            ) : null}
          </>
        ) : null}
        <SettingsToggleField label="No delay" description="Reject excessive requests immediately instead of delaying them." checked={form.noDelay} onChange={(value) => update("noDelay", value)} />
        <SettingsToggleField label="Dry run" description="Track over-limit requests without enforcing the limit." checked={form.dryRun} onChange={(value) => update("dryRun", value)} />
        <SettingsToggleField label="Scale by pod count" description="Divide the configured rate across active controller pods." checked={form.scale} onChange={(value) => update("scale", value)} />
      </div>
    );
  }

  if (form.policyType === "apiKey") {
    return (
      <div className="settings-table">
        <SettingsSecretSelect label="Client secret" description="Secret of type nginx.org/apikey." value={form.apiKeyClientSecret} onChange={(value) => update("apiKeyClientSecret", value)} clusterOptions={clusterOptions} onCreateResource={onCreateResource} secretType="nginx.org/apikey" namespace={form.namespace} required />
        <SettingsSelectField label="Supplied in" description="Where clients provide the API key." value={form.apiKeySuppliedIn} onChange={(value) => update("apiKeySuppliedIn", value as ApiKeySuppliedIn)} options={[{ value: "header", label: "Header" }, { value: "query", label: "Query parameter" }]} required />
        {form.apiKeySuppliedIn === "header" ? (
          <SettingsTextField label="Header" description="HTTP header name that carries the API key." value={form.apiKeySuppliedHeader} onChange={(value) => update("apiKeySuppliedHeader", value)} placeholder="example: x-api-key" required />
        ) : (
          <SettingsTextField label="Query" description="Query parameter name that carries the API key." value={form.apiKeySuppliedQuery} onChange={(value) => update("apiKeySuppliedQuery", value)} placeholder="example: apikey" required />
        )}
      </div>
    );
  }

  if (form.policyType === "basicAuth") {
    return (
      <div className="settings-table">
        <SettingsSecretSelect label="Htpasswd secret" description="Secret of type nginx.org/htpasswd." value={form.basicAuthSecret} onChange={(value) => update("basicAuthSecret", value)} clusterOptions={clusterOptions} onCreateResource={onCreateResource} secretType="nginx.org/htpasswd" namespace={form.namespace} required />
        <SettingsTextField label="Realm" description="Browser prompt realm shown during authentication." value={form.basicAuthRealm} onChange={(value) => update("basicAuthRealm", value)} placeholder="example: Protected Area" />
      </div>
    );
  }

  if (form.policyType === "jwt") {
    return (
      <div className="settings-table">
        <SettingsSelectField label="JWT source" description="Use a local JWK secret or fetch keys from a remote JWKS endpoint." value={form.jwtMode} onChange={(value) => update("jwtMode", value as JwtMode)} options={[{ value: "localSecret", label: "JWT Using Local Kubernetes Secret" }, { value: "remoteJwks", label: "JWT Using JWKS From Remote Location" }]} required />
        {form.jwtMode === "localSecret" ? (
          <SettingsSecretSelect label="JWK secret" description="Secret of type nginx.org/jwk." value={form.jwtSecret} onChange={(value) => update("jwtSecret", value)} clusterOptions={clusterOptions} onCreateResource={onCreateResource} secretType="nginx.org/jwk" namespace={form.namespace} required />
        ) : (
          <>
            <SettingsTextField label="JWKS URI" description="Remote JWKS endpoint used to validate tokens." value={form.jwtJwksUri} onChange={(value) => update("jwtJwksUri", value)} placeholder="example: https://idp.example.com/.well-known/jwks.json" required />
          </>
        )}
        <SettingsTextField label="Realm" description="Realm shown when JWT authentication fails." value={form.jwtRealm} onChange={(value) => update("jwtRealm", value)} placeholder="example: Closed Area" />
        <SettingsTextField label="Token variable" description="Variable used to locate the JWT token." value={form.jwtToken} onChange={(value) => update("jwtToken", value)} placeholder="example: $http_authorization" />
        {form.jwtMode === "remoteJwks" ? (
          <>
            <SettingsTextField label="Key cache" description="How long JWKS keys should be cached." value={form.jwtKeyCache} onChange={(value) => update("jwtKeyCache", value)} placeholder="default: 1h" />
            <SettingsSecretSelect label="Trusted cert secret" description="CA secret used to verify the JWKS endpoint." value={form.jwtTrustedCertSecret} onChange={(value) => update("jwtTrustedCertSecret", value)} clusterOptions={clusterOptions} onCreateResource={onCreateResource} secretType="nginx.org/ca" namespace={form.namespace} />
            <SettingsTextField label="SSL verify depth" description="Maximum certificate chain depth for the JWKS endpoint." value={form.jwtSslVerifyDepth} onChange={(value) => update("jwtSslVerifyDepth", value)} placeholder="default: 1" />
            <SettingsTextField label="SNI name" description="Explicit server name used during TLS to the JWKS endpoint." value={form.jwtSniName} onChange={(value) => update("jwtSniName", value)} placeholder="example: idp.example.com" />
            <SettingsToggleField label="Verify JWKS certificate" description="Require TLS certificate validation for the JWKS endpoint." checked={form.jwtSslVerify} onChange={(value) => update("jwtSslVerify", value)} />
            <SettingsToggleField label="Enable SNI" description="Send SNI when connecting to the JWKS endpoint." checked={form.jwtSniEnabled} onChange={(value) => update("jwtSniEnabled", value)} />
          </>
        ) : null}
      </div>
    );
  }

  if (form.policyType === "ingressMTLS") {
    return (
      <div className="settings-table">
        <SettingsSecretSelect label="Client cert secret" description="Secret of type nginx.org/ca." value={form.ingressMtlsClientCertSecret} onChange={(value) => update("ingressMtlsClientCertSecret", value)} clusterOptions={clusterOptions} onCreateResource={onCreateResource} secretType="nginx.org/ca" namespace={form.namespace} required />
        <SettingsSelectField label="Verify client" description="How strictly client certificates should be required and verified." value={form.ingressMtlsVerifyClient} onChange={(value) => update("ingressMtlsVerifyClient", value as VerifyClientMode)} options={verifyClientOptions} />
        <SettingsTextField label="Verify depth" description="Maximum client certificate chain depth." value={form.ingressMtlsVerifyDepth} onChange={(value) => update("ingressMtlsVerifyDepth", value)} placeholder="default: 1" />
        <SettingsTextField label="CRL file name" description="Optional CRL file name mounted into the controller." value={form.ingressMtlsCrlFileName} onChange={(value) => update("ingressMtlsCrlFileName", value)} placeholder="example: ca.crl" />
      </div>
    );
  }

  if (form.policyType === "egressMTLS") {
    return (
      <div className="settings-table">
        <SettingsSecretSelect label="TLS secret" description="Secret of type kubernetes.io/tls for upstream client authentication." value={form.egressMtlsTlsSecret} onChange={(value) => update("egressMtlsTlsSecret", value)} clusterOptions={clusterOptions} onCreateResource={onCreateResource} secretType="kubernetes.io/tls" namespace={form.namespace} />
        <SettingsSecretSelect label="Trusted cert secret" description="Secret of type nginx.org/ca for upstream server verification." value={form.egressMtlsTrustedCertSecret} onChange={(value) => update("egressMtlsTrustedCertSecret", value)} clusterOptions={clusterOptions} onCreateResource={onCreateResource} secretType="nginx.org/ca" namespace={form.namespace} />
        <SettingsToggleField label="Verify upstream certificate" description="Require certificate validation when connecting upstream." checked={form.egressMtlsVerifyServer} onChange={(value) => update("egressMtlsVerifyServer", value)} />
        <SettingsTextField label="Verify depth" description="Maximum upstream certificate chain depth." value={form.egressMtlsVerifyDepth} onChange={(value) => update("egressMtlsVerifyDepth", value)} placeholder="default: 1" />
        <SettingsTextField label="Protocols" description="TLS protocol list used for upstream mTLS." value={form.egressMtlsProtocols} onChange={(value) => update("egressMtlsProtocols", value)} placeholder="default: TLSv1 TLSv1.1 TLSv1.2" />
        <SettingsTextField label="Ciphers" description="Cipher suite override for upstream TLS connections." value={form.egressMtlsCiphers} onChange={(value) => update("egressMtlsCiphers", value)} placeholder="default: DEFAULT" />
        <SettingsTextField label="SSL name" description="Override the server name used during upstream verification." value={form.egressMtlsSslName} onChange={(value) => update("egressMtlsSslName", value)} placeholder="example: upstream.example.com" />
        <SettingsToggleField label="Send server name (SNI)" description="Send the upstream hostname in TLS SNI." checked={form.egressMtlsServerName} onChange={(value) => update("egressMtlsServerName", value)} />
        <SettingsToggleField label="Reuse sessions" description="Reuse upstream TLS sessions for better performance." checked={form.egressMtlsSessionReuse} onChange={(value) => update("egressMtlsSessionReuse", value)} />
      </div>
    );
  }

  if (form.policyType === "externalAuth") {
    return (
      <div className="settings-table">
        <SettingsTextField label="Auth URI" description="Internal URI where NGINX sends auth subrequests. Must start with /." value={form.externalAuthUri} onChange={(value) => update("externalAuthUri", value)} placeholder="example: /oauth2/auth" required />
        <SettingsTextField label="Auth service" description="Service that receives auth subrequests. Use name or namespace/name." value={form.externalAuthServiceName} onChange={(value) => update("externalAuthServiceName", value)} placeholder="example: default/oauth2-proxy" required />
        <SettingsTextAreaField label="Auth service ports" description="One or more service ports for the auth service." value={form.externalAuthServicePorts} onChange={(value) => update("externalAuthServicePorts", value)} placeholder="example: 4180" rows={2} />
        <SettingsTextField label="Signin URI" description="URI where unauthenticated users are redirected." value={form.externalAuthSigninUri} onChange={(value) => update("externalAuthSigninUri", value)} placeholder="example: /oauth2/signin" />
        <SettingsTextField label="Signin redirect base path" description="Base path used to build sign-in redirects." value={form.externalAuthSigninRedirectBasePath} onChange={(value) => update("externalAuthSigninRedirectBasePath", value)} placeholder="default: /oauth2" />
        <SettingsSecretSelect label="Trusted cert secret" description="Secret of type nginx.org/ca used to verify the auth service." value={form.externalAuthTrustedCertSecret} onChange={(value) => update("externalAuthTrustedCertSecret", value)} clusterOptions={clusterOptions} onCreateResource={onCreateResource} secretType="nginx.org/ca" namespace={form.namespace} />
        <SettingsToggleField label="Use TLS to auth service" description="Connect to the external auth service with TLS." checked={form.externalAuthSslEnabled} onChange={(value) => update("externalAuthSslEnabled", value)} />
        <SettingsToggleField label="Verify auth service certificate" description="Require TLS certificate validation for the auth service." checked={form.externalAuthSslVerify} onChange={(value) => update("externalAuthSslVerify", value)} />
        <SettingsTextField label="SSL verify depth" description="Maximum certificate chain depth for the auth service." value={form.externalAuthSslVerifyDepth} onChange={(value) => update("externalAuthSslVerifyDepth", value)} placeholder="default: 1" />
        <SettingsTextField label="SNI name" description="Server name used during TLS to the auth service." value={form.externalAuthSniName} onChange={(value) => update("externalAuthSniName", value)} placeholder="default: service.namespace.svc" />
        <SettingsTextAreaField label="Auth snippets" description="Advanced directives injected into the generated auth location." value={form.externalAuthSnippets} onChange={(value) => update("externalAuthSnippets", value)} placeholder="requires -enable-snippets" />
      </div>
    );
  }

  if (form.policyType === "oidc") {
    return (
      <div className="settings-table">
        <SettingsTextField label="Client ID" description="OIDC client identifier registered with the provider." value={form.oidcClientId} onChange={(value) => update("oidcClientId", value)} placeholder="example: web-client" required />
        <SettingsSecretSelect label="Client secret" description="Secret of type nginx.org/oidc. Not used when PKCE is enabled." value={form.oidcClientSecret} onChange={(value) => update("oidcClientSecret", value)} clusterOptions={clusterOptions} onCreateResource={onCreateResource} secretType="nginx.org/oidc" namespace={form.namespace} required={!form.oidcPkceEnable} />
        <SettingsTextField label="Auth endpoint" description="OIDC provider authorization endpoint URL." value={form.oidcAuthEndpoint} onChange={(value) => update("oidcAuthEndpoint", value)} placeholder="example: https://idp.example.com/auth" required />
        <SettingsTextField label="Token endpoint" description="OIDC provider token endpoint URL." value={form.oidcTokenEndpoint} onChange={(value) => update("oidcTokenEndpoint", value)} placeholder="example: https://idp.example.com/token" required />
        <SettingsTextField label="JWKS URI" description="OIDC provider key set endpoint URL." value={form.oidcJwksUri} onChange={(value) => update("oidcJwksUri", value)} placeholder="example: https://idp.example.com/keys" required />
        <SettingsTextField label="End session endpoint" description="OIDC logout endpoint URL." value={form.oidcEndSessionEndpoint} onChange={(value) => update("oidcEndSessionEndpoint", value)} placeholder="example: https://idp.example.com/logout" />
        <SettingsTextField label="Redirect URI" description="Callback path for the authorization code exchange." value={form.oidcRedirectUri} onChange={(value) => update("oidcRedirectUri", value)} placeholder="default: /_codexch" />
        <SettingsTextField label="Post-logout redirect URI" description="Path or URL to send users to after logout." value={form.oidcPostLogoutRedirectUri} onChange={(value) => update("oidcPostLogoutRedirectUri", value)} placeholder="default: /_logout" />
        <SettingsTextField label="Scope" description="OIDC scopes requested during login." value={form.oidcScope} onChange={(value) => update("oidcScope", value)} placeholder="default: openid" />
        <SettingsSecretSelect label="Trusted cert secret" description="Secret of type nginx.org/ca used to verify the OIDC provider." value={form.oidcTrustedCertSecret} onChange={(value) => update("oidcTrustedCertSecret", value)} clusterOptions={clusterOptions} onCreateResource={onCreateResource} secretType="nginx.org/ca" namespace={form.namespace} />
        <SettingsToggleField label="Enable PKCE" description="Use Proof Key for Code Exchange. Client secret is not used in this mode." checked={form.oidcPkceEnable} onChange={(value) => update("oidcPkceEnable", value)} />
        <SettingsToggleField label="Verify IdP certificate" description="Require TLS certificate validation for the OIDC provider." checked={form.oidcSslVerify} onChange={(value) => update("oidcSslVerify", value)} />
        <SettingsTextField label="SSL verify depth" description="Maximum certificate chain depth for the OIDC provider." value={form.oidcSslVerifyDepth} onChange={(value) => update("oidcSslVerifyDepth", value)} placeholder="default: 1" />
        <SettingsTextField label="Zone sync leeway" description="Milliseconds allowed for token sync between controller pods." value={form.oidcZoneSyncLeeway} onChange={(value) => update("oidcZoneSyncLeeway", value)} placeholder="default: 200" />
        <SettingsTextAreaField label="Extra auth args" description="Additional provider-specific authorization parameters." value={form.oidcAuthExtraArgs} onChange={(value) => update("oidcAuthExtraArgs", value)} placeholder="example: prompt=login" />
        <SettingsToggleField label="Pass access token to backend" description="Forward the access token to upstream applications." checked={form.oidcAccessTokenEnable} onChange={(value) => update("oidcAccessTokenEnable", value)} />
      </div>
    );
  }

  if (form.policyType === "waf") {
    return (
      <div className="settings-table">
        <SettingsBooleanField label="Enable WAF" description="Enable App Protect WAF enforcement." value={form.wafEnable} onChange={(value) => update("wafEnable", value)} />
        <SettingsTextField label="App Protect policy" description="App Protect WAF policy resource reference." value={form.wafApPolicy} onChange={(value) => update("wafApPolicy", value)} placeholder="example: default/webapp-ap-policy" required />
        <SettingsTextField label="App Protect bundle" description="App Protect WAF bundle reference." value={form.wafApBundle} onChange={(value) => update("wafApBundle", value)} placeholder="example: waf-bundle" />
        <SettingsBooleanField label="Enable security log" description="Enable App Protect WAF security logging." value={form.wafSecurityLogEnable} onChange={(value) => update("wafSecurityLogEnable", value)} />
        <SettingsTextField label="Security log conf" description="App Protect WAF log configuration reference used in securityLogs." value={form.wafSecurityLogConf} onChange={(value) => update("wafSecurityLogConf", value)} placeholder="example: default/waf-log-conf" />
        <SettingsTextField label="Security log bundle" description="App Protect WAF log bundle reference used in securityLogs." value={form.wafSecurityLogBundle} onChange={(value) => update("wafSecurityLogBundle", value)} placeholder="example: waf-log-bundle" />
        <SettingsTextField label="Security log destination" description="Where WAF securityLogs should be written." value={form.wafSecurityLogDest} onChange={(value) => update("wafSecurityLogDest", value)} placeholder="example: stderr" />
      </div>
    );
  }

  if (form.policyType === "cache") {
    return (
      <div className="settings-table">
        <SettingsTextField label="Cache zone name" description="Name of the shared cache zone." value={form.cacheZoneName} onChange={(value) => update("cacheZoneName", value)} placeholder="example: maincache" required />
        <SettingsTextField label="Cache zone size" description="Size of the cache zone in memory." value={form.cacheZoneSize} onChange={(value) => update("cacheZoneSize", value)} placeholder="example: 10m" required />
        <SettingsTextField label="Cache key" description="NGINX cache key expression." value={form.cacheKey} onChange={(value) => update("cacheKey", value)} placeholder="example: $scheme$proxy_host$uri$is_args$args" required />
        <SettingsTextField label="Cache time" description="Default time to cache responses." value={form.cacheTime} onChange={(value) => update("cacheTime", value)} placeholder="example: 10m" required />
        <SettingsChecklistField label="Allowed methods" description="HTTP methods that may be cached." valuesText={form.cacheAllowedMethods} options={cacheMethodOptions} onChange={(value) => update("cacheAllowedMethods", value)} />
        <SettingsTextAreaField label="Allowed codes" description="Response status codes to cache." value={form.cacheAllowedCodes} onChange={(value) => update("cacheAllowedCodes", value)} placeholder="example: 200&#10;301&#10;404" rows={2} />
        <SettingsTextField label="Min uses" description="Number of identical requests before caching begins." value={form.cacheMinUses} onChange={(value) => update("cacheMinUses", value)} placeholder="default: 1" />
        <SettingsTextField label="Inactive time" description="How long unused cache entries remain before eviction." value={form.cacheInactive} onChange={(value) => update("cacheInactive", value)} placeholder="default: 10m" />
        <SettingsTextField label="Levels" description="Directory layout for cache files on disk." value={form.cacheLevels} onChange={(value) => update("cacheLevels", value)} placeholder="example: 1:2" />
        <SettingsTextField label="Max size" description="Maximum disk size for the cache." value={form.cacheMaxSize} onChange={(value) => update("cacheMaxSize", value)} placeholder="example: 1g" />
        <SettingsTextField label="Min free" description="Free disk space to preserve before eviction." value={form.cacheMinFree} onChange={(value) => update("cacheMinFree", value)} placeholder="example: 100m" />
        <SettingsTextAreaField label="Use stale conditions" description="Failure cases where stale cache may be served." value={form.cacheUseStale} onChange={(value) => update("cacheUseStale", value)} placeholder="example: error&#10;timeout&#10;updating" rows={2} />
        <SettingsTextAreaField label="Bypass conditions" description="Expressions that bypass cache lookup." value={form.cacheBypass} onChange={(value) => update("cacheBypass", value)} placeholder="example: ${http_cache_bypass}" rows={2} />
        <SettingsTextAreaField label="No-cache conditions" description="Expressions that prevent cache save." value={form.cacheNoCache} onChange={(value) => update("cacheNoCache", value)} placeholder="example: ${cookie_nocache}" rows={2} />
        <SettingsTextAreaField label="Purge allow list" description="CIDRs allowed to purge cache entries." value={form.cachePurgeAllow} onChange={(value) => update("cachePurgeAllow", value)} placeholder="example: 10.0.0.0/8" rows={2} />
        <SettingsTextField label="Lock age" description="Maximum time a cache lock may be held." value={form.cacheLockAge} onChange={(value) => update("cacheLockAge", value)} placeholder="default: 5s" />
        <SettingsTextField label="Lock timeout" description="How long to wait on a cache lock before bypassing." value={form.cacheLockTimeout} onChange={(value) => update("cacheLockTimeout", value)} placeholder="default: 5s" />
        <SettingsBooleanField label="Use temp path" description="Write temp files outside the cache path." value={form.cacheUseTempPath} onChange={(value) => update("cacheUseTempPath", value)} />
        <SettingsBooleanField label="Background update" description="Refresh expired cache entries in the background." value={form.cacheBackgroundUpdate} onChange={(value) => update("cacheBackgroundUpdate", value)} />
        <SettingsBooleanField label="Revalidate" description="Revalidate expired cache with conditional requests." value={form.cacheRevalidate} onChange={(value) => update("cacheRevalidate", value)} />
        <SettingsBooleanField label="Override upstream cache headers" description="Ignore upstream cache-control headers." value={form.cacheOverrideUpstreamCache} onChange={(value) => update("cacheOverrideUpstreamCache", value)} />
        <SettingsBooleanField label="Enable cache lock" description="Avoid duplicate concurrent cache fills." value={form.cacheLockEnable} onChange={(value) => update("cacheLockEnable", value)} />
      </div>
    );
  }

  if (form.policyType === "cors") {
    return (
      <div className="settings-table">
        <SettingsTextAreaField label="Allowed origins" description="Origins allowed to make cross-origin requests." value={form.corsAllowOrigin} onChange={(value) => update("corsAllowOrigin", value)} placeholder="example: https://example.com" rows={2} required />
        <SettingsChecklistField label="Allowed methods" description="Methods allowed for CORS requests." valuesText={form.corsAllowMethods} options={corsMethodOptions} onChange={(value) => update("corsAllowMethods", value)} required />
        <SettingsTextAreaField label="Allowed headers" description="Headers allowed in CORS requests." value={form.corsAllowHeaders} onChange={(value) => update("corsAllowHeaders", value)} placeholder="example: Authorization&#10;Content-Type" rows={2} />
        <SettingsTextAreaField label="Expose headers" description="Response headers browsers may read." value={form.corsExposeHeaders} onChange={(value) => update("corsExposeHeaders", value)} placeholder="example: X-Request-Id" rows={2} />
        <SettingsTextField label="Max age" description="How long browsers may cache preflight responses." value={form.corsMaxAge} onChange={(value) => update("corsMaxAge", value)} placeholder="default: 86400" />
        <SettingsBooleanField label="Allow credentials" description="Allow cookies or auth headers on cross-origin requests." value={form.corsAllowCredentials} onChange={(value) => update("corsAllowCredentials", value)} />
      </div>
    );
  }

  return null;
}

export function PolicyBuilderPanel({
  form,
  setForm,
  policyTypeSelected,
  setPolicyTypeSelected,
  setManifestText,
  setNotice,
  clusterOptions,
  onCreateResource,
}: {
  form: PolicyForm;
  setForm: Dispatch<SetStateAction<PolicyForm>>;
  policyTypeSelected: boolean;
  setPolicyTypeSelected: Dispatch<SetStateAction<boolean>>;
} & PropsCommon) {
  const update = <K extends keyof PolicyForm>(key: K, value: PolicyForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const apply = () => {
    setManifestText(
      YAML.stringify(
        policyTypeSelected
          ? buildPolicyManifest(form)
          : {
              apiVersion: "k8s.nginx.org/v1",
              kind: "Policy",
              metadata: { name: form.name, namespace: form.namespace },
              spec: {},
            },
      ),
    );
    setNotice(`Policy builder updated ${form.name}.`);
  };

  return (
    <div className="builder-panel">
      <div className="panel-heading">
        <h3>Policy builder</h3>
        <button type="button" className="secondary" onClick={apply}>
          Reflect in YAML
        </button>
      </div>

      <Section title="General" description="Identity, namespace, and policy category" defaultOpen>
        <div className="builder-grid">
          <TextField label="Name" description="The Kubernetes name of this Policy resource." value={form.name} onChange={(value) => update("name", value)} placeholder="policy-name" required />
          <NamespaceField value={form.namespace} onChange={(value) => update("namespace", value)} clusterOptions={clusterOptions} />
          <PolicyTypeField form={form} setForm={setForm} onSelected={() => setPolicyTypeSelected(true)} selected={policyTypeSelected} />
        </div>
      </Section>

      {policyTypeSelected ? (
        <Section title="Settings" description="Options for the selected policy type" defaultOpen>
          <PolicySettings form={form} update={update} clusterOptions={clusterOptions} onCreateResource={onCreateResource} />
        </Section>
      ) : null}
    </div>
  );
}

export function VirtualServerBuilderPanel({
  form,
  setForm,
  setManifestText,
  setNotice,
  clusterOptions,
  onSubmitManifest,
  onCreateResource,
}: { form: VirtualServerForm; setForm: Dispatch<SetStateAction<VirtualServerForm>> } & PropsCommon) {
  const update = <K extends keyof VirtualServerForm>(key: K, value: VirtualServerForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const [tlsSecretModalOpen, setTlsSecretModalOpen] = useState(false);
  const [tlsSecretName, setTlsSecretName] = useState(form.tlsSecret || "app-tls");
  const [tlsCertificate, setTlsCertificate] = useState("");
  const [tlsPrivateKey, setTlsPrivateKey] = useState("");
  const [tlsSecretSaving, setTlsSecretSaving] = useState(false);
  const derivedCertManagerEnabled = Boolean(
    form.certIssuer.trim() || form.certClusterIssuer.trim() || form.certIssuerKind.trim() || form.certIssuerGroup.trim(),
  );
  const derivedCertManagerMode = form.certClusterIssuer.trim() ? "clusterIssuer" : "issuer";
  const [certManagerEnabled, setCertManagerEnabled] = useState(derivedCertManagerEnabled);
  const [certManagerMode, setCertManagerMode] = useState<"issuer" | "clusterIssuer">(derivedCertManagerMode);
  const apply = () => {
    setManifestText(YAML.stringify(buildVirtualServerManifest(form)));
    setNotice(`VirtualServer builder updated ${form.name}.`);
  };
  const sameNamespaceTlsSecrets = clusterOptions.tlsSecrets
    .filter((item) => (item.namespace ?? form.namespace) === form.namespace)
    .map((item) => ({ value: item.name, label: item.name }));
  const usesCertManager = certManagerEnabled;

  useEffect(() => {
    setCertManagerEnabled(derivedCertManagerEnabled);
    setCertManagerMode(derivedCertManagerMode);
  }, [form.certIssuer, form.certClusterIssuer, form.certIssuerKind, form.certIssuerGroup, derivedCertManagerEnabled, derivedCertManagerMode]);

  async function handleTlsFileUpload(file: File | null, type: "cert" | "key") {
    if (!file) return;
    const text = await file.text();
    if (type === "cert") setTlsCertificate(text);
    else setTlsPrivateKey(text);
  }

  async function createTlsSecret() {
    if (!tlsSecretName.trim()) return;
    setTlsSecretSaving(true);
    try {
      await onSubmitManifest(
        {
          apiVersion: "v1",
          kind: "Secret",
          metadata: {
            name: tlsSecretName.trim(),
            namespace: form.namespace,
          },
          type: "kubernetes.io/tls",
          stringData: {
            "tls.crt": tlsCertificate.trim(),
            "tls.key": tlsPrivateKey.trim(),
          },
        },
        {
          onCreated: (created) => update("tlsSecret", created.includes("/") ? created.split("/").pop() ?? created : created),
        },
      );
      setTlsSecretModalOpen(false);
      setTlsCertificate("");
      setTlsPrivateKey("");
    } finally {
      setTlsSecretSaving(false);
    }
  }

  return (
    <div className="builder-panel">
      <div className="panel-heading">
        <h3>VirtualServer builder</h3>
        <button type="button" className="secondary" onClick={apply}>
          Reflect in YAML
        </button>
      </div>

      <Section title="General" description="Identity, namespace, host, policies, and ownership" defaultOpen>
        <div className="builder-grid">
          <TextField label="Name" description="The Kubernetes name of this VirtualServer." value={form.name} onChange={(value) => update("name", value)} placeholder="example: cafe" required />
          <NamespaceField value={form.namespace} onChange={(value) => update("namespace", value)} clusterOptions={clusterOptions} />
          <TextField label="Host" description="Unique host name served by this VirtualServer." value={form.host} onChange={(value) => update("host", value)} placeholder="example: cafe.example.com" required />
          <IngressClassField value={form.ingressClassName} onChange={(value) => update("ingressClassName", value)} clusterOptions={clusterOptions} />
          <DosField value={form.dos} onChange={(value) => update("dos", value)} clusterOptions={clusterOptions} onCreateResource={onCreateResource} />
          <PolicyRefsField label="Policies" value={form.policyRefsText} onChange={(value) => update("policyRefsText", value)} clusterOptions={clusterOptions} onCreateResource={onCreateResource} />
          <div className="toggle-group grid-span-2">
            <BooleanSelectField label="Internal route" description="Mark the VirtualServer as internal-only." value={form.internalRoute} onChange={(value) => update("internalRoute", value)} />
            <BooleanSelectField label="Enable gunzip" description="Allow NGINX to decompress gzipped upstream responses." value={form.gunzip} onChange={(value) => update("gunzip", value)} />
            <BooleanSelectField
              label="Enable External DNS"
              description="Generate ExternalDNS records for this VirtualServer."
              value={form.externalDnsEnable}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  externalDnsEnable: value,
                  externalDnsRecordTTL: value ? current.externalDnsRecordTTL : "",
                }))
              }
            />
            {form.externalDnsEnable ? (
              <div className="toggle-subfield">
                <TextField
                  label="Record TTL"
                  description="ExternalDNS record TTL in seconds."
                  value={form.externalDnsRecordTTL}
                  onChange={(value) => update("externalDnsRecordTTL", value)}
                  placeholder="keep blank for the default"
                />
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      <Section title="Custom Listeners" description="Custom listener names defined through GlobalConfiguration">
        <div className="builder-grid">
          <SelectField label="HTTP listener" description="HTTP listener name from a GlobalConfiguration resource." value={form.listenerHttp} onChange={(value) => value === createListenerValue ? onCreateResource("GlobalConfiguration", { onCreated: (created) => update("listenerHttp", created) }) : update("listenerHttp", value)} options={listenerOptions(clusterOptions)} />
          <SelectField label="HTTPS listener" description="HTTPS listener name from a GlobalConfiguration resource." value={form.listenerHttps} onChange={(value) => value === createListenerValue ? onCreateResource("GlobalConfiguration", { onCreated: (created) => update("listenerHttps", created) }) : update("listenerHttps", value)} options={listenerOptions(clusterOptions)} />
        </div>
      </Section>

      <Section title="TLS" description="Choose a valid same-namespace TLS secret or create a new one, then configure redirect and certificate automation">
        <div className="builder-grid">
          {usesCertManager ? (
            <TextField
              label="TLS secret name"
              description="Name of the same-namespace kubernetes.io/tls secret that cert-manager should create and keep updated for this VirtualServer."
              value={form.tlsSecret}
              onChange={(value) => update("tlsSecret", value)}
              placeholder={`example: ${form.name || "virtualserver"}-tls`}
              required
            />
          ) : (
            <SelectField
              label="TLS secret"
              description="Select a same-namespace secret of type kubernetes.io/tls with tls.crt and tls.key."
              value={form.tlsSecret}
              onChange={(value) => {
                if (value === createTlsSecretValue) {
                  setTlsSecretName(form.tlsSecret || `${form.name || "virtualserver"}-tls`);
                  setTlsSecretModalOpen(true);
                  return;
                }
                update("tlsSecret", value);
              }}
              options={[{ value: "", label: "None" }, ...sameNamespaceTlsSecrets, { value: createTlsSecretValue, label: "Create new TLS secret..." }]}
            />
          )}
          <div className="field checkbox-field">
            <span className="field-label field-label-placeholder" aria-hidden="true">
              Placeholder
            </span>
            <BooleanSelectField
              label="Enable TLS redirect"
              description="Redirect HTTP requests to HTTPS."
              value={form.tlsRedirectEnable}
              onChange={(value) => {
                setForm((current) => ({
                  ...current,
                  tlsRedirectEnable: value,
                  tlsRedirectCode: value ? current.tlsRedirectCode || "301" : "",
                  tlsRedirectBasedOn: value ? current.tlsRedirectBasedOn || "scheme" : "",
                }));
              }}
            />
          </div>
          {form.tlsRedirectEnable ? (
            <>
              <SelectField
                label="TLS redirect code"
                description="HTTP status code used for HTTP-to-HTTPS redirects."
                value={form.tlsRedirectCode}
                onChange={(value) => update("tlsRedirectCode", value)}
                options={tlsRedirectCodeOptions}
              />
              <SelectField
                label="Redirect based on"
                description="Request attribute used before redirecting to HTTPS."
                value={form.tlsRedirectBasedOn}
                onChange={(value) => update("tlsRedirectBasedOn", value)}
                options={tlsRedirectBasedOnOptions}
              />
            </>
          ) : null}
          <div className="grid-span-2">
            <BooleanSelectField
              label="Certificate automation"
              description="Use cert-manager to issue and renew the certificate for this VirtualServer."
              value={certManagerEnabled}
              onChange={(value) => {
                setCertManagerEnabled(value);
                setForm((current) => ({
                  ...current,
                  tlsSecret: value ? current.tlsSecret || `${current.name || "virtualserver"}-tls` : current.tlsSecret,
                  certIssuer: value && certManagerMode === "issuer" ? current.certIssuer : "",
                  certClusterIssuer: value && certManagerMode === "clusterIssuer" ? current.certClusterIssuer : "",
                  certIssuerKind: "",
                  certIssuerGroup: "",
                }));
              }}
            />
          </div>
          {certManagerEnabled ? (
            <>
              <SelectField
                label="Certificate source"
                description="Choose whether cert-manager should use a namespace Issuer or a cluster-wide ClusterIssuer."
                value={certManagerMode}
                onChange={(value) => {
                  const nextMode = value as "issuer" | "clusterIssuer";
                  setCertManagerMode(nextMode);
                  setForm((current) => ({
                    ...current,
                    certIssuer: nextMode === "issuer" ? current.certIssuer : "",
                    certClusterIssuer: nextMode === "clusterIssuer" ? current.certClusterIssuer : "",
                    certIssuerKind: "",
                    certIssuerGroup: "",
                  }));
                }}
                options={[
                  { value: "issuer", label: "Issuer" },
                  { value: "clusterIssuer", label: "ClusterIssuer" },
                ]}
              />
            </>
          ) : null}
          {certManagerEnabled && certManagerMode === "issuer" ? <TextField label="Issuer name" description="Namespace-scoped cert-manager Issuer name." value={form.certIssuer} onChange={(value) => update("certIssuer", value)} placeholder="example: letsencrypt" /> : null}
          {certManagerEnabled && certManagerMode === "clusterIssuer" ? <TextField label="ClusterIssuer name" description="ClusterIssuer name for cert-manager." value={form.certClusterIssuer} onChange={(value) => update("certClusterIssuer", value)} placeholder="example: letsencrypt-prod" /> : null}
        </div>
      </Section>

      {tlsSecretModalOpen ? (
        <div className="overlay-backdrop">
          <div className="overlay-panel tls-secret-modal">
            <div className="panel-heading">
              <h3>Create TLS Secret</h3>
              <div className="editor-actions">
                <button type="button" className="secondary" onClick={() => setTlsSecretModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={tlsSecretSaving || !tlsSecretName.trim() || !tlsCertificate.trim() || !tlsPrivateKey.trim()}
                  onClick={() => void createTlsSecret()}
                >
                  {tlsSecretSaving ? "Creating..." : "Create secret"}
                </button>
              </div>
            </div>
            <div className="builder-grid">
              <TextField
                label="Secret name"
                description="Name of the same-namespace kubernetes.io/tls secret to create."
                value={tlsSecretName}
                onChange={setTlsSecretName}
                placeholder="example: cafe-secret"
                required
              />
              <TextField
                label="Namespace"
                description="The new secret will be created in the same namespace as this VirtualServer."
                value={form.namespace}
                onChange={() => undefined}
                placeholder=""
              />
              <div className="field">
                <span className="field-label">
                  Upload certificate
                  <button type="button" className="help-tip" title="Upload a PEM certificate file for tls.crt." aria-label="Upload certificate help">
                    ?
                  </button>
                </span>
                <input type="file" accept=".crt,.pem,.cer,text/plain" onChange={(event) => void handleTlsFileUpload(event.target.files?.[0] ?? null, "cert")} />
              </div>
              <div className="field">
                <span className="field-label">
                  Upload private key
                  <button type="button" className="help-tip" title="Upload a PEM private key file for tls.key." aria-label="Upload private key help">
                    ?
                  </button>
                </span>
                <input type="file" accept=".key,.pem,text/plain" onChange={(event) => void handleTlsFileUpload(event.target.files?.[0] ?? null, "key")} />
              </div>
              <TextAreaField
                label="Certificate"
                description="Paste the PEM-encoded certificate content for tls.crt."
                value={tlsCertificate}
                onChange={setTlsCertificate}
                placeholder="-----BEGIN CERTIFICATE-----"
                rows={6}
                required
              />
              <TextAreaField
                label="Private key"
                description="Paste the PEM-encoded private key content for tls.key."
                value={tlsPrivateKey}
                onChange={setTlsPrivateKey}
                placeholder="-----BEGIN PRIVATE KEY-----"
                rows={6}
                required
              />
            </div>
          </div>
        </div>
      ) : null}

      <Section title="Upstreams" description="Backend services and HTTP upstream tuning">
        <div className="panel-heading compact">
          <h4>Upstreams</h4>
          <button type="button" className="secondary" onClick={() => update("upstreams", [...form.upstreams, defaultUpstreamForm()])}>
            Add upstream
          </button>
        </div>
        {form.upstreams.map((upstream, index) => (
          <UpstreamEditor
            key={`${upstream.name}-${index}`}
            upstream={upstream}
            onChange={(next) => update("upstreams", updateAtIndex(form.upstreams, index, next))}
            onRemove={form.upstreams.length > 1 ? () => update("upstreams", form.upstreams.filter((_, itemIndex) => itemIndex !== index)) : undefined}
          />
        ))}
      </Section>

      <Section title="Routes" description="Route actions, policy refs, matching, splits, and error handling">
        <div className="panel-heading compact">
          <h4>Routes</h4>
          <button type="button" className="secondary" onClick={() => update("routes", [...form.routes, defaultRouteForm()])}>
            Add route
          </button>
        </div>
        {form.routes.map((route, index) => (
          <RouteEditor
            key={`${route.path || "route"}-${index}`}
            route={route}
            title={route.path || `Route ${index + 1}`}
            onChange={(next) => update("routes", updateAtIndex(form.routes, index, next))}
            onRemove={form.routes.length > 1 ? () => update("routes", form.routes.filter((_, itemIndex) => itemIndex !== index)) : undefined}
            clusterOptions={clusterOptions}
            onCreateResource={onCreateResource}
          />
        ))}
      </Section>

      <Section title="Snippets" description="Raw NGINX snippets for advanced customization">
        <div className="builder-grid">
          <TextAreaField label="HTTP snippets" description="Directives injected into the NGINX http context." value={form.httpSnippets} onChange={(value) => update("httpSnippets", value)} placeholder="" />
          <TextAreaField label="Server snippets" description="Directives injected into the NGINX server block." value={form.serverSnippets} onChange={(value) => update("serverSnippets", value)} placeholder="" />
        </div>
      </Section>
    </div>
  );
}

function ListenerEditor({
  listener,
  index,
  total,
  onChange,
  onRemove,
}: {
  listener: GlobalConfigurationListenerForm;
  index: number;
  total: number;
  onChange: (next: GlobalConfigurationListenerForm) => void;
  onRemove: () => void;
}) {
  return (
    <div className="nested-card">
      <div className="panel-heading compact">
        <h4>{listener.name || `Listener ${index + 1}`}</h4>
        {total > 1 ? (
          <button type="button" className="danger" onClick={onRemove}>
            Remove
          </button>
        ) : null}
      </div>
      <div className="builder-grid">
        <TextField label="Name" description="Unique listener name referenced by VirtualServer or TransportServer resources." value={listener.name} onChange={(value) => onChange({ ...listener, name: value })} placeholder="example: http-8083" required />
        <TextField label="Port" description="Port where NGINX should listen." value={listener.port} onChange={(value) => onChange({ ...listener, port: value })} placeholder="example: 80" required />
        <SelectField label="Protocol" description="Listener protocol." value={listener.protocol} onChange={(value) => onChange({ ...listener, protocol: value as GlobalConfigurationListenerForm["protocol"] })} options={listenerProtocolOptions} required />
        <BooleanSelectField label="SSL enabled" description="Mark this listener as SSL/TLS-capable." value={listener.ssl} onChange={(value) => onChange({ ...listener, ssl: value })} />
        <TextField label="IPv4 address" description="Optional IPv4 address to bind to." value={listener.ipv4} onChange={(value) => onChange({ ...listener, ipv4: value })} placeholder="example: 0.0.0.0" />
        <TextField label="IPv6 address" description="Optional IPv6 address to bind to." value={listener.ipv6} onChange={(value) => onChange({ ...listener, ipv6: value })} placeholder="example: ::" />
      </div>
    </div>
  );
}

export function GlobalConfigurationBuilderPanel({
  form,
  setForm,
  setManifestText,
  setNotice,
  clusterOptions,
  onCreateResource: _onCreateResource,
}: { form: GlobalConfigurationForm; setForm: Dispatch<SetStateAction<GlobalConfigurationForm>> } & PropsCommon) {
  const update = <K extends keyof GlobalConfigurationForm>(key: K, value: GlobalConfigurationForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const apply = () => {
    setManifestText(YAML.stringify(buildGlobalConfigurationManifest(form)));
    setNotice(`GlobalConfiguration builder updated ${form.name}.`);
  };

  return (
    <div className="builder-panel">
      <div className="panel-heading">
        <h3>GlobalConfiguration builder</h3>
        <button type="button" className="secondary" onClick={apply}>
          Reflect in YAML
        </button>
      </div>

      <Section title="General" description="Resource identity and namespace" defaultOpen>
        <div className="builder-grid">
          <TextField label="Name" description="The Kubernetes name of this GlobalConfiguration." value={form.name} onChange={(value) => update("name", value)} placeholder="example: nginx-global" required />
          <NamespaceField value={form.namespace} onChange={(value) => update("namespace", value)} clusterOptions={clusterOptions} />
        </div>
      </Section>

      <Section title="Listeners" description="Listener names, ports, protocols, and addresses" defaultOpen>
        <div className="panel-heading compact">
          <h4>Listeners</h4>
          <button type="button" className="secondary" onClick={() => update("listeners", [...form.listeners, defaultGlobalConfigurationListenerForm()])}>
            Add listener
          </button>
        </div>
        {form.listeners.map((listener, index) => (
          <ListenerEditor
            key={`${listener.name}-${index}`}
            listener={listener}
            index={index}
            total={form.listeners.length}
            onChange={(next) => update("listeners", updateAtIndex(form.listeners, index, next))}
            onRemove={() => update("listeners", form.listeners.filter((_, itemIndex) => itemIndex !== index))}
          />
        ))}
      </Section>
    </div>
  );
}

function TransportUpstreamEditor({
  upstream,
  onChange,
  onRemove,
}: {
  upstream: TransportServerUpstreamForm;
  onChange: (next: TransportServerUpstreamForm) => void;
  onRemove?: () => void;
}) {
  const healthCheck = useMemo(() => parseStreamHealthCheck(upstream.healthCheckYaml), [upstream.healthCheckYaml]);
  const updateHealthCheck = (next: Partial<StreamHealthCheckForm>) =>
    onChange({ ...upstream, healthCheckYaml: buildStreamHealthCheck({ ...healthCheck, ...next }) });

  return (
    <div className="nested-card">
      <div className="panel-heading compact">
        <h4>{upstream.name || "Upstream"}</h4>
        {onRemove ? (
          <button type="button" className="danger" onClick={onRemove}>
            Remove
          </button>
        ) : null}
      </div>
        <div className="builder-grid">
        <TextField label="Name" description="Unique upstream identifier used by the TransportServer action." value={upstream.name} onChange={(value) => onChange({ ...upstream, name: value })} placeholder="example: tcp-app" required />
        <TextField label="Service" description="Kubernetes Service that backs this stream upstream." value={upstream.service} onChange={(value) => onChange({ ...upstream, service: value })} placeholder="example: tcp-service" required />
        <TextField label="Port" description="Service port exposed by the stream backend." value={upstream.port} onChange={(value) => onChange({ ...upstream, port: value })} placeholder="example: 9000" required />
        <TextField label="Backup service" description="Optional backup Service used when the primary service is unavailable." value={upstream.backup} onChange={(value) => onChange({ ...upstream, backup: value })} placeholder="example: backup-service" />
        <TextField label="Backup port" description="Port exposed by the backup Service." value={upstream.backupPort} onChange={(value) => onChange({ ...upstream, backupPort: value })} placeholder="example: 9001" />
        <SelectField label="LB method" description="Method used to distribute stream traffic." value={upstream.loadBalancingMethod} onChange={(value) => onChange({ ...upstream, loadBalancingMethod: value })} options={lbMethodOptions} />
        <TextField label="Max fails" description="Failures before an endpoint is marked unavailable." value={upstream.maxFails} onChange={(value) => onChange({ ...upstream, maxFails: value })} placeholder="default: 1" />
        <TextField label="Fail timeout" description="Time window used with max fails." value={upstream.failTimeout} onChange={(value) => onChange({ ...upstream, failTimeout: value })} placeholder="default: 10s" />
        <TextField label="Max conns" description="Maximum simultaneous connections to this backend." value={upstream.maxConns} onChange={(value) => onChange({ ...upstream, maxConns: value })} placeholder="default: 0" />
        <ToggleField label="Enable health check" description="Enable NGINX Plus stream health checks for this upstream." checked={healthCheck.enable} onChange={(value) => updateHealthCheck({ enable: value })} />
        <TextField label="Interval" description="Time between consecutive stream health checks." value={healthCheck.interval} onChange={(value) => updateHealthCheck({ interval: value })} placeholder="default: 5s" />
        <TextField label="Jitter" description="Random delay applied to each health check." value={healthCheck.jitter} onChange={(value) => updateHealthCheck({ jitter: value })} placeholder="default: no delay" />
        <TextField label="Fails" description="Consecutive failed checks before marking the endpoint unhealthy." value={healthCheck.fails} onChange={(value) => updateHealthCheck({ fails: value })} placeholder="default: 1" />
        <TextField label="Passes" description="Consecutive successful checks before marking the endpoint healthy." value={healthCheck.passes} onChange={(value) => updateHealthCheck({ passes: value })} placeholder="default: 1" />
        <TextField label="Port" description="Port used for stream health checks." value={healthCheck.port} onChange={(value) => updateHealthCheck({ port: value })} placeholder="default: upstream port" />
        <TextField label="Connect timeout" description="Time allowed to connect during a health check." value={healthCheck.connectTimeout} onChange={(value) => updateHealthCheck({ connectTimeout: value })} placeholder="default: 5s" />
        <TextField label="Match send" description="Payload sent during a stream health check match block." value={healthCheck.matchSend} onChange={(value) => updateHealthCheck({ matchSend: value })} placeholder="example: ping" />
        <TextField label="Match expect" description="Expected response payload for the health check match block." value={healthCheck.matchExpect} onChange={(value) => updateHealthCheck({ matchExpect: value })} placeholder="example: pong" />
      </div>
    </div>
  );
}

export function TransportServerBuilderPanel({
  form,
  setForm,
  setManifestText,
  setNotice,
  clusterOptions,
  onCreateResource,
}: { form: TransportServerForm; setForm: Dispatch<SetStateAction<TransportServerForm>> } & PropsCommon) {
  const update = <K extends keyof TransportServerForm>(key: K, value: TransportServerForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const apply = () => {
    setManifestText(YAML.stringify(buildTransportServerManifest(form)));
    setNotice(`TransportServer builder updated ${form.name}.`);
  };

  return (
    <div className="builder-panel">
      <div className="panel-heading">
        <h3>TransportServer builder</h3>
        <button type="button" className="secondary" onClick={apply}>
          Reflect in YAML
        </button>
      </div>

      <Section title="General" description="Identity, namespace, listener, and primary action" defaultOpen>
        <div className="builder-grid">
          <TextField label="Name" description="The Kubernetes name of this TransportServer." value={form.name} onChange={(value) => update("name", value)} placeholder="example: mysql" required />
          <NamespaceField value={form.namespace} onChange={(value) => update("namespace", value)} clusterOptions={clusterOptions} />
          <TextField label="Host" description="Optional SNI host used for TLS passthrough." value={form.host} onChange={(value) => update("host", value)} placeholder="example: tcp.example.com" />
          <IngressClassField value={form.ingressClassName} onChange={(value) => update("ingressClassName", value)} clusterOptions={clusterOptions} />
          <SelectField label="Listener name" description="Listener created in GlobalConfiguration." value={form.listenerName} onChange={(value) => value === createListenerValue ? onCreateResource("GlobalConfiguration", { onCreated: (created) => update("listenerName", created) }) : update("listenerName", value)} options={listenerOptions(clusterOptions)} />
          <SelectField label="Listener protocol" description="Protocol used by this listener." value={form.listenerProtocol} onChange={(value) => update("listenerProtocol", value as TransportServerForm["listenerProtocol"])} options={transportListenerProtocolOptions} required />
          <TextField label="Action pass upstream" description="Upstream that receives matching TCP or UDP traffic." value={form.actionPass} onChange={(value) => update("actionPass", value)} placeholder="example: tcp-app" required />
          <TlsSecretField value={form.tlsSecret} onChange={(value) => update("tlsSecret", value)} clusterOptions={clusterOptions} onCreateResource={onCreateResource} />
          <TextField label="Session timeout" description="Idle timeout between client and upstream packets." value={form.sessionTimeout} onChange={(value) => update("sessionTimeout", value)} placeholder="default: 10m" />
        </div>
      </Section>

      <Section title="Upstream Parameters" description="Retry behavior and UDP session settings">
        <div className="builder-grid">
          <TextField label="Connect timeout" description="Time allowed to connect to a backend endpoint." value={form.upstreamConnectTimeout} onChange={(value) => update("upstreamConnectTimeout", value)} placeholder="default: 60s" />
          <BooleanSelectField label="Allow next upstream" description="Retry another backend endpoint if the first one fails." value={form.upstreamNextUpstream} onChange={(value) => update("upstreamNextUpstream", value)} />
          <TextField label="Next upstream timeout" description="Total retry time budget across stream upstreams." value={form.upstreamNextUpstreamTimeout} onChange={(value) => update("upstreamNextUpstreamTimeout", value)} placeholder="default: 0" />
          <TextField label="Next upstream tries" description="Maximum number of stream retry attempts." value={form.upstreamNextUpstreamTries} onChange={(value) => update("upstreamNextUpstreamTries", value)} placeholder="default: 0" />
          <TextField label="UDP requests" description="Number of UDP datagrams after which NGINX starts a new session." value={form.udpRequests} onChange={(value) => update("udpRequests", value)} placeholder="default: 1" />
          <TextField label="UDP responses" description="Expected number of UDP datagrams from the backend." value={form.udpResponses} onChange={(value) => update("udpResponses", value)} placeholder="default: 1" />
        </div>
      </Section>

      <Section title="Upstreams" description="Backend services used by the TransportServer">
        <div className="panel-heading compact">
          <h4>Upstreams</h4>
          <button type="button" className="secondary" onClick={() => update("upstreams", [...form.upstreams, defaultTransportServerUpstreamForm()])}>
            Add upstream
          </button>
        </div>
        {form.upstreams.map((upstream, index) => (
          <TransportUpstreamEditor
            key={`${upstream.name}-${index}`}
            upstream={upstream}
            onChange={(next) => update("upstreams", updateAtIndex(form.upstreams, index, next))}
            onRemove={form.upstreams.length > 1 ? () => update("upstreams", form.upstreams.filter((_, itemIndex) => itemIndex !== index)) : undefined}
          />
        ))}
      </Section>

      <Section title="Snippets" description="Raw stream and server context snippets">
        <div className="builder-grid">
          <TextAreaField label="Server snippets" description="Directives injected into the stream server block." value={form.serverSnippets} onChange={(value) => update("serverSnippets", value)} placeholder="" />
          <TextAreaField label="Stream snippets" description="Directives injected into the top-level stream block." value={form.streamSnippets} onChange={(value) => update("streamSnippets", value)} placeholder="" />
        </div>
      </Section>
    </div>
  );
}

export function VirtualServerRouteBuilderPanel({
  form,
  setForm,
  setManifestText,
  setNotice,
  clusterOptions,
  onCreateResource,
}: { form: VirtualServerRouteForm; setForm: Dispatch<SetStateAction<VirtualServerRouteForm>> } & PropsCommon) {
  const update = <K extends keyof VirtualServerRouteForm>(key: K, value: VirtualServerRouteForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const apply = () => {
    setManifestText(YAML.stringify(buildVirtualServerRouteManifest(form)));
    setNotice(`VirtualServerRoute builder updated ${form.name}.`);
  };

  return (
    <div className="builder-panel">
      <div className="panel-heading">
        <h3>VirtualServerRoute builder</h3>
        <button type="button" className="secondary" onClick={apply}>
          Reflect in YAML
        </button>
      </div>

      <Section title="General" description="Identity, namespace, host, and ingress ownership" defaultOpen>
        <div className="builder-grid">
          <TextField label="Name" description="The Kubernetes name of this VirtualServerRoute." value={form.name} onChange={(value) => update("name", value)} placeholder="example: cafe-routes" required />
          <NamespaceField value={form.namespace} onChange={(value) => update("namespace", value)} clusterOptions={clusterOptions} />
          <TextField label="Host" description="Host name that must match the parent VirtualServer." value={form.host} onChange={(value) => update("host", value)} placeholder="example: cafe.example.com" required />
          <IngressClassField value={form.ingressClassName} onChange={(value) => update("ingressClassName", value)} clusterOptions={clusterOptions} />
        </div>
      </Section>

      <Section title="Upstreams" description="Backend services shared by subroutes">
        <div className="panel-heading compact">
          <h4>Upstreams</h4>
          <button type="button" className="secondary" onClick={() => update("upstreams", [...form.upstreams, defaultUpstreamForm()])}>
            Add upstream
          </button>
        </div>
        {form.upstreams.map((upstream, index) => (
          <UpstreamEditor
            key={`${upstream.name}-${index}`}
            upstream={upstream}
            onChange={(next) => update("upstreams", updateAtIndex(form.upstreams, index, next))}
            onRemove={form.upstreams.length > 1 ? () => update("upstreams", form.upstreams.filter((_, itemIndex) => itemIndex !== index)) : undefined}
          />
        ))}
      </Section>

      <Section title="Subroutes" description="Delegated route actions and route-level features">
        <div className="panel-heading compact">
          <h4>Subroutes</h4>
          <button type="button" className="secondary" onClick={() => update("subroutes", [...form.subroutes, defaultRouteForm()])}>
            Add subroute
          </button>
        </div>
        {form.subroutes.map((route, index) => (
          <RouteEditor
            key={`${route.path || "subroute"}-${index}`}
            route={route}
            title={route.path || `Subroute ${index + 1}`}
            onChange={(next) => update("subroutes", updateAtIndex(form.subroutes, index, next))}
            onRemove={form.subroutes.length > 1 ? () => update("subroutes", form.subroutes.filter((_, itemIndex) => itemIndex !== index)) : undefined}
            clusterOptions={clusterOptions}
            onCreateResource={onCreateResource}
          />
        ))}
      </Section>
    </div>
  );
}

export function SecretBuilderPanel({
  form,
  setForm,
  setManifestText,
  setNotice,
  clusterOptions,
  showApplyButton = true,
}: { form: SecretForm; setForm: Dispatch<SetStateAction<SecretForm>>; showApplyButton?: boolean } & PropsCommon) {
  const update = <K extends keyof SecretForm>(key: K, value: SecretForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const [certificateSource, setCertificateSource] = useState<SecretInputSource>("upload");
  const [privateKeySource, setPrivateKeySource] = useState<SecretInputSource>("upload");
  const [htpasswdSource, setHtpasswdSource] = useState<SecretInputSource>("upload");
  const [caCertificateSource, setCaCertificateSource] = useState<SecretInputSource>("upload");
  const [caCrlSource, setCaCrlSource] = useState<SecretInputSource>("upload");
  const [jwkSource, setJwkSource] = useState<SecretInputSource>("upload");

  async function handleFileUpload(file: File | null, type: "certificate" | "privateKey" | "htpasswd" | "caCertificate" | "caCrl" | "jwk") {
    if (!file) return;
    const text = await file.text();
    update(type, text);
  }

  const apply = () => {
    setManifestText(YAML.stringify(buildSecretManifest(form)));
    setNotice(`Secret builder updated ${form.name}.`);
  };

  return (
    <div className="builder-panel">
      <div className="panel-heading">
        <h3>Secret builder</h3>
        {showApplyButton ? (
          <button type="button" className="secondary" onClick={apply}>
            Reflect in YAML
          </button>
        ) : null}
      </div>

      <Section title="General" description="Name, namespace, and secret type" defaultOpen>
        <div className="builder-grid">
          <TextField label="Secret name" description="The Kubernetes name of this secret." value={form.name} onChange={(value) => update("name", value)} placeholder="tls-secret-name" required />
          <NamespaceField value={form.namespace} onChange={(value) => update("namespace", value)} clusterOptions={clusterOptions} />
          <SelectField label="Secret type" description="Secret type expected by NGINX Ingress Controller policies." value={form.secretType} onChange={(value) => update("secretType", value as SecretType)} options={secretTypeOptions} required />
        </div>
      </Section>

      {form.secretType === "kubernetes.io/tls" ? (
      <Section title="TLS Certificate" description="Certificate and private key required by kubernetes.io/tls" defaultOpen>
        <div className="builder-grid">
          <SecretSourceField label="Certificate source" description="PEM-encoded certificate stored as tls.crt." source={certificateSource} onSourceChange={setCertificateSource} fileAccept=".crt,.pem,.cer,text/plain" onFileUpload={(file) => void handleFileUpload(file, "certificate")} textValue={form.certificate} onTextChange={(value) => update("certificate", value)} textPlaceholder="-----BEGIN CERTIFICATE-----" required />
          <SecretSourceField label="Private key source" description="PEM-encoded private key stored as tls.key." source={privateKeySource} onSourceChange={setPrivateKeySource} fileAccept=".key,.pem,text/plain" onFileUpload={(file) => void handleFileUpload(file, "privateKey")} textValue={form.privateKey} onTextChange={(value) => update("privateKey", value)} textPlaceholder="-----BEGIN PRIVATE KEY-----" required />
        </div>
      </Section>
      ) : null}

      {form.secretType === "nginx.org/apikey" ? (
        <Section title="API Key" description="Key/value data for nginx.org/apikey secrets" defaultOpen>
          <div className="builder-grid">
            <TextField label="Client name" description="Key name stored in the secret." value={form.apiKeyName} onChange={(value) => update("apiKeyName", value)} placeholder="example: client-a" required />
            <TextField label="API key value" description="API key value stored under the client name." value={form.apiKeyValue} onChange={(value) => update("apiKeyValue", value)} placeholder="paste API key value" required />
          </div>
        </Section>
      ) : null}

      {form.secretType === "nginx.org/htpasswd" ? (
        <Section title="Htpasswd" description="Basic auth credentials stored under htpasswd" defaultOpen>
          <div className="builder-grid">
            <SecretSourceField label="Htpasswd source" description="htpasswd file content." source={htpasswdSource} onSourceChange={setHtpasswdSource} fileAccept=".htpasswd,.txt,text/plain" onFileUpload={(file) => void handleFileUpload(file, "htpasswd")} textValue={form.htpasswd} onTextChange={(value) => update("htpasswd", value)} textPlaceholder="example: user:$apr1$..." required />
          </div>
        </Section>
      ) : null}

      {form.secretType === "nginx.org/ca" ? (
        <Section title="CA Certificate" description="CA certificate and optional CRL for nginx.org/ca" defaultOpen>
          <div className="builder-grid">
            <SecretSourceField label="CA certificate source" description="PEM-encoded CA certificate stored as ca.crt." source={caCertificateSource} onSourceChange={setCaCertificateSource} fileAccept=".crt,.pem,.cer,text/plain" onFileUpload={(file) => void handleFileUpload(file, "caCertificate")} textValue={form.caCertificate} onTextChange={(value) => update("caCertificate", value)} textPlaceholder="-----BEGIN CERTIFICATE-----" required />
            <SecretSourceField label="CRL source" description="Optional CRL stored as ca.crl." source={caCrlSource} onSourceChange={setCaCrlSource} fileAccept=".crl,.pem,.txt,text/plain" onFileUpload={(file) => void handleFileUpload(file, "caCrl")} textValue={form.caCrl} onTextChange={(value) => update("caCrl", value)} textPlaceholder="optional PEM or CRL content" textRows={6} />
          </div>
        </Section>
      ) : null}

      {form.secretType === "nginx.org/oidc" ? (
        <Section title="OIDC Client Secret" description="Client secret stored under client-secret" defaultOpen>
          <div className="builder-grid">
            <TextField label="Client secret" description="OIDC client secret value." value={form.oidcClientSecret} onChange={(value) => update("oidcClientSecret", value)} placeholder="paste client secret" required />
          </div>
        </Section>
      ) : null}

      {form.secretType === "nginx.org/jwk" ? (
        <Section title="JWT JWK" description="JWK content stored under jwk" defaultOpen>
          <div className="builder-grid">
            <SecretSourceField label="JWK source" description="JSON Web Key or key set content." source={jwkSource} onSourceChange={setJwkSource} fileAccept=".json,application/json,text/plain" onFileUpload={(file) => void handleFileUpload(file, "jwk")} textValue={form.jwk} onTextChange={(value) => update("jwk", value)} textPlaceholder='{"keys":[]}' required />
          </div>
        </Section>
      ) : null}
    </div>
  );
}
