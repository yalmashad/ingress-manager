type AnyRecord = Record<string, any>;

export const ingressSecretTypeLabels: Record<string, string> = {
  "kubernetes.io/tls": "TLS secret",
  "nginx.org/apikey": "API key secret",
  "nginx.org/htpasswd": "HTTP password secret",
  "nginx.org/ca": "CA cert secret",
  "nginx.org/oidc": "OIDC secret",
  "nginx.org/jwk": "JWK secret",
};

export function ingressSecretTypeLabel(type: unknown) {
  return typeof type === "string" ? ingressSecretTypeLabels[type] ?? type : null;
}

export function isTlsSecret(secret: AnyRecord) {
  const data = secret?.data ?? {};
  return secret?.type === "kubernetes.io/tls" && Boolean(data["tls.crt"]) && Boolean(data["tls.key"]);
}

export function isTypedSecret(secret: AnyRecord, type: string) {
  return secret?.type === type;
}

export function isListedIngressSecret(secret: AnyRecord) {
  return typeof secret?.type === "string" && Object.prototype.hasOwnProperty.call(ingressSecretTypeLabels, secret.type);
}

export function isRelevantIngressSecret(secret: AnyRecord) {
  return isListedIngressSecret(secret) || isTlsSecret(secret);
}

export function summarizeNamedSecret(secret: AnyRecord) {
  return {
    name: secret.metadata?.name,
    namespace: secret.metadata?.namespace,
  };
}
