import { asObj, asString, type Obj } from "./helpers";

function hasStringDataValue(manifest: Obj, key: string) {
  const stringData = asObj(manifest.stringData);
  const data = asObj(manifest.data);
  return Boolean(asString(stringData[key]) || asString(data[key]));
}

export function validateSecret(manifest: Obj) {
  const errors: string[] = [];
  const type = asString(manifest.type);

  if (!type) {
    errors.push("type is required.");
    return errors;
  }

  if (type === "kubernetes.io/tls") {
    if (!hasStringDataValue(manifest, "tls.crt")) errors.push('tls secrets require "tls.crt".');
    if (!hasStringDataValue(manifest, "tls.key")) errors.push('tls secrets require "tls.key".');
    return errors;
  }

  if (type === "nginx.org/apikey") {
    const stringData = asObj(manifest.stringData);
    const data = asObj(manifest.data);
    const keys = new Set([...Object.keys(stringData), ...Object.keys(data)]);
    if (!keys.size) {
      errors.push("nginx.org/apikey secrets require at least one client ID entry.");
    }
    return errors;
  }

  if (type === "nginx.org/htpasswd") {
    if (!hasStringDataValue(manifest, "htpasswd")) errors.push('nginx.org/htpasswd secrets require "htpasswd".');
    return errors;
  }

  if (type === "nginx.org/ca") {
    if (!hasStringDataValue(manifest, "ca.crt")) errors.push('nginx.org/ca secrets require "ca.crt".');
    return errors;
  }

  if (type === "nginx.org/oidc") {
    if (!hasStringDataValue(manifest, "client-secret")) errors.push('nginx.org/oidc secrets require "client-secret".');
    return errors;
  }

  if (type === "nginx.org/jwk") {
    if (!hasStringDataValue(manifest, "jwk")) errors.push('nginx.org/jwk secrets require "jwk".');
    return errors;
  }

  return errors;
}
