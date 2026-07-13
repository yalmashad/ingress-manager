import { asArray, asObj, asString, isRfc1123Subdomain, type Obj } from "./helpers";
import { validateRoute } from "./routes";

export function validateVirtualServer(manifest: Obj) {
  const errors: string[] = [];
  const spec = asObj(manifest.spec);
  const host = asString(spec.host);
  if (!host) {
    errors.push("spec.host is required.");
  }

  const tls = asObj(spec.tls);
  const tlsSecret = asString(tls.secret);
  if (tlsSecret && (tlsSecret.includes("/") || !isRfc1123Subdomain(tlsSecret))) {
    errors.push("spec.tls.secret must be a same-namespace TLS secret name, not namespace/name.");
  }

  const upstreams = new Set(
    asArray(spec.upstreams)
      .map((upstream) => asString(upstream.name))
      .filter(Boolean),
  );

  asArray(spec.routes).forEach((route, index) => validateRoute(route, index, "spec.routes", upstreams, errors));
  return errors;
}
