import { asArray, asObj, asString, type Obj } from "./helpers";

export function validatePolicy(manifest: Obj) {
  const errors: string[] = [];
  const spec = asObj(manifest.spec);

  if (spec.accessControl !== undefined) {
    const access = asObj(spec.accessControl);
    const hasAllow = asArray(access.allow).length > 0;
    const hasDeny = asArray(access.deny).length > 0;
    if (!hasAllow && !hasDeny) errors.push("spec.accessControl requires either allow or deny entries.");
    if (hasAllow && hasDeny) errors.push("spec.accessControl cannot define both allow and deny entries.");
    return errors;
  }

  if (spec.rateLimit !== undefined) {
    const rateLimit = asObj(spec.rateLimit);
    if (!asString(rateLimit.rate)) errors.push("spec.rateLimit.rate is required.");
    if (!asString(rateLimit.key)) errors.push("spec.rateLimit.key is required.");
    if (!asString(rateLimit.zoneSize)) errors.push("spec.rateLimit.zoneSize is required.");
    return errors;
  }

  if (spec.apiKey !== undefined) {
    const apiKey = asObj(spec.apiKey);
    if (!asString(apiKey.clientSecret)) errors.push("spec.apiKey.clientSecret is required.");
    const suppliedIn = asObj(apiKey.suppliedIn);
    if (!suppliedIn.header && !suppliedIn.query) errors.push("spec.apiKey.suppliedIn requires header, query, or both.");
    return errors;
  }

  if (spec.basicAuth !== undefined) {
    const basicAuth = asObj(spec.basicAuth);
    if (!asString(basicAuth.secret)) errors.push("spec.basicAuth.secret is required.");
    return errors;
  }

  if (spec.jwt !== undefined) {
    const jwt = asObj(spec.jwt);
    const hasSecret = Boolean(asString(jwt.secret));
    const hasJwks = Boolean(asString(jwt.jwksURI));
    if (!hasSecret && !hasJwks) errors.push("spec.jwt requires either secret or jwksURI.");
    if (hasSecret && hasJwks) errors.push("spec.jwt cannot define both secret and jwksURI.");
    return errors;
  }

  if (spec.ingressMTLS !== undefined) {
    const ingressMtls = asObj(spec.ingressMTLS);
    if (!asString(ingressMtls.clientCertSecret)) errors.push("spec.ingressMTLS.clientCertSecret is required.");
    return errors;
  }

  if (spec.externalAuth !== undefined) {
    const externalAuth = asObj(spec.externalAuth);
    if (!asString(externalAuth.authURI)) errors.push("spec.externalAuth.authURI is required.");
    if (!asString(externalAuth.authServiceName)) errors.push("spec.externalAuth.authServiceName is required.");
    return errors;
  }

  if (spec.oidc !== undefined) {
    const oidc = asObj(spec.oidc);
    if (!asString(oidc.clientID)) errors.push("spec.oidc.clientID is required.");
    if (!asString(oidc.authEndpoint)) errors.push("spec.oidc.authEndpoint is required.");
    if (!asString(oidc.tokenEndpoint)) errors.push("spec.oidc.tokenEndpoint is required.");
    if (!asString(oidc.jwksURI)) errors.push("spec.oidc.jwksURI is required.");
    if (!oidc.pkceEnable && !asString(oidc.clientSecret)) errors.push("spec.oidc.clientSecret is required unless pkceEnable is true.");
    return errors;
  }

  if (spec.cache !== undefined) {
    const cache = asObj(spec.cache);
    if (!asString(cache.zoneName)) errors.push("spec.cache.zoneName is required.");
    return errors;
  }

  if (spec.cors !== undefined) {
    const cors = asObj(spec.cors);
    if (!asArray(cors.allowOrigins).length) errors.push("spec.cors.allowOrigins is required.");
    if (!asArray(cors.allowMethods).length) errors.push("spec.cors.allowMethods is required.");
    return errors;
  }

  return errors;
}
