type Obj = Record<string, unknown>;

const runtimeMetadataFields = new Set([
  "creationTimestamp",
  "deletionGracePeriodSeconds",
  "deletionTimestamp",
  "finalizers",
  "generation",
  "managedFields",
  "ownerReferences",
  "resourceVersion",
  "selfLink",
  "uid",
]);

function isObj(value: unknown): value is Obj {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function decodeBase64(value: string) {
  try {
    return atob(value);
  } catch {
    return "";
  }
}

function equivalentSecretDataKeys(original: Obj, generated: Obj) {
  if (original.kind !== "Secret" || generated.kind !== "Secret") return new Set<string>();
  const data = isObj(original.data) ? original.data : {};
  const stringData = isObj(generated.stringData) ? generated.stringData : {};
  return new Set(
    Object.entries(data)
      .filter(([key, value]) => typeof value === "string" && stringData[key] !== undefined && decodeBase64(value) === String(stringData[key] ?? ""))
      .map(([key]) => key),
  );
}

function managedSecretDataKeys(original: Obj, generated: Obj) {
  if (original.kind !== "Secret" || generated.kind !== "Secret") return new Set<string>();
  const secretType = typeof generated.type === "string" ? generated.type : typeof original.type === "string" ? original.type : "";
  if (!secretType) return new Set<string>();

  if (secretType === "nginx.org/apikey") {
    const originalStringData = isObj(original.stringData) ? Object.keys(original.stringData) : [];
    const originalData = isObj(original.data) ? Object.keys(original.data) : [];
    const generatedStringData = isObj(generated.stringData) ? Object.keys(generated.stringData) : [];
    const generatedData = isObj(generated.data) ? Object.keys(generated.data) : [];
    return new Set([...originalStringData, ...originalData, ...generatedStringData, ...generatedData]);
  }

  if (secretType === "kubernetes.io/tls") return new Set(["tls.crt", "tls.key"]);
  if (secretType === "nginx.org/htpasswd") return new Set(["htpasswd"]);
  if (secretType === "nginx.org/ca") return new Set(["ca.crt", "ca.crl"]);
  if (secretType === "nginx.org/oidc") return new Set(["client-secret"]);
  if (secretType === "nginx.org/jwk") return new Set(["jwk"]);
  return new Set<string>();
}

function stripEquivalentSecretData(original: Obj, generated: Obj) {
  const managedKeys = managedSecretDataKeys(original, generated);
  const equivalentKeys = equivalentSecretDataKeys(original, generated);
  const keysToStrip = new Set([...managedKeys, ...equivalentKeys]);
  if (!keysToStrip.size) return original;

  const nextData = isObj(original.data)
    ? Object.fromEntries(Object.entries(original.data).filter(([key]) => !keysToStrip.has(key)))
    : undefined;
  const nextStringData = isObj(original.stringData)
    ? Object.fromEntries(Object.entries(original.stringData).filter(([key]) => !keysToStrip.has(key)))
    : undefined;
  const next = { ...original };
  if (nextData && Object.keys(nextData).length) next.data = nextData;
  else delete next.data;
  if (nextStringData && Object.keys(nextStringData).length) next.stringData = nextStringData;
  else delete next.stringData;
  return next;
}

function itemKey(value: unknown) {
  if (!isObj(value)) return "";
  if (typeof value.namespace === "string" && typeof value.name === "string") return `${value.namespace}/${value.name}`;
  if (typeof value.name === "string") return `name:${value.name}`;
  if (typeof value.path === "string") return `path:${value.path}`;
  if (typeof value.host === "string") return `host:${value.host}`;
  return "";
}

function matchingArrayItem(original: unknown[], generatedItem: unknown, index: number) {
  const key = itemKey(generatedItem);
  if (key) {
    const match = original.find((item) => itemKey(item) === key);
    if (match !== undefined) return match;
  }
  return original[index];
}

export function preserveUnknownManifestFields(original: unknown, generated: unknown): unknown {
  if (Array.isArray(original) && Array.isArray(generated)) {
    return generated.map((item, index) => preserveUnknownManifestFields(matchingArrayItem(original, item, index), item));
  }

  if (!isObj(original) || !isObj(generated)) {
    return generated;
  }

  const source = stripEquivalentSecretData(original, generated);
  const merged: Obj = { ...generated };
  for (const [key, value] of Object.entries(source)) {
    merged[key] = key in generated ? preserveUnknownManifestFields(value, generated[key]) : value;
  }
  return merged;
}

export function findUnknownManifestPaths(original: unknown, generated: unknown, basePath = ""): string[] {
  if (Array.isArray(original) && Array.isArray(generated)) {
    return generated.flatMap((item, index) => findUnknownManifestPaths(matchingArrayItem(original, item, index), item, `${basePath}[${index}]`));
  }

  if (!isObj(original) || !isObj(generated)) {
    return [];
  }

  const source = stripEquivalentSecretData(original, generated);
  return Object.entries(source).flatMap(([key, value]) => {
    const path = basePath ? `${basePath}.${key}` : key;
    return key in generated ? findUnknownManifestPaths(value, generated[key], path) : [path];
  });
}

export function deriveManifestPreservation(original: unknown, generated: unknown) {
  const unsupportedFieldPaths = findUnknownManifestPaths(original, generated);
  return {
    rawManifest: unsupportedFieldPaths.length ? original : null,
    unsupportedFieldPaths,
  };
}

export function stripRuntimeManifestFields(manifest: unknown): unknown {
  if (!isObj(manifest)) return manifest;

  const cleaned: Obj = {};
  for (const [key, value] of Object.entries(manifest)) {
    if (key === "status") continue;
    if (key === "metadata" && isObj(value)) {
      cleaned.metadata = Object.fromEntries(Object.entries(value).filter(([metadataKey]) => !runtimeMetadataFields.has(metadataKey)));
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
}
