import { asArray, asObj, asString, isRfc1123Subdomain, type Obj } from "./helpers";

export function validateTransportServer(manifest: Obj) {
  const errors: string[] = [];
  const spec = asObj(manifest.spec);
  const listener = asObj(spec.listener);
  if (!asString(listener.name)) {
    errors.push("spec.listener.name is required.");
  }
  if (!asString(listener.protocol)) {
    errors.push("spec.listener.protocol is required.");
  }

  const upstreams = asArray(spec.upstreams);
  const upstreamNames = new Set(upstreams.map((upstream) => asString(upstream.name)).filter(Boolean));
  const action = asObj(spec.action);
  const pass = asString(action.pass);
  if (!pass) {
    errors.push("spec.action.pass is required.");
  } else if (!upstreamNames.has(pass)) {
    errors.push(`spec.action.pass references upstream "${pass}", but spec.upstreams does not define it.`);
  }

  upstreams.forEach((upstream, index) => {
    if (!asString(upstream.name)) errors.push(`spec.upstreams[${index}].name is required.`);
    if (!asString(upstream.service)) errors.push(`spec.upstreams[${index}].service is required.`);
    if (upstream.port === undefined) errors.push(`spec.upstreams[${index}].port is required.`);
  });

  const tls = asObj(spec.tls);
  const secret = asString(tls.secret);
  if (secret && (secret.includes("/") || !isRfc1123Subdomain(secret))) {
    errors.push("spec.tls.secret must be a same-namespace TLS secret name, not namespace/name.");
  }

  return errors;
}
