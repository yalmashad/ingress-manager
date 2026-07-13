import { describe, expect, it } from "vitest";
import {
  ingressSecretTypeLabel,
  isListedIngressSecret,
  isRelevantIngressSecret,
  isTlsSecret,
  isTypedSecret,
  summarizeNamedSecret,
} from "./secrets.js";

describe("secret helpers", () => {
  it("labels every supported ingress secret type", () => {
    expect(ingressSecretTypeLabel("kubernetes.io/tls")).toBe("TLS secret");
    expect(ingressSecretTypeLabel("nginx.org/apikey")).toBe("API key secret");
    expect(ingressSecretTypeLabel("nginx.org/htpasswd")).toBe("HTTP password secret");
    expect(ingressSecretTypeLabel("nginx.org/ca")).toBe("CA cert secret");
    expect(ingressSecretTypeLabel("nginx.org/oidc")).toBe("OIDC secret");
    expect(ingressSecretTypeLabel("nginx.org/jwk")).toBe("JWK secret");
  });

  it("includes TLS secrets in the main ingress secret list", () => {
    const secret = {
      metadata: { name: "test-secret", namespace: "default" },
      type: "kubernetes.io/tls",
      data: {
        "tls.crt": "Y2VydA==",
        "tls.key": "a2V5",
      },
    };

    expect(isTlsSecret(secret)).toBe(true);
    expect(isRelevantIngressSecret(secret)).toBe(true);
    expect(isListedIngressSecret(secret)).toBe(true);
    expect(summarizeNamedSecret(secret)).toEqual({ name: "test-secret", namespace: "default" });
  });

  it("keeps all NGINX ingress secret types included in the main list", () => {
    const types = [
      "nginx.org/apikey",
      "nginx.org/htpasswd",
      "nginx.org/ca",
      "nginx.org/oidc",
      "nginx.org/jwk",
    ];

    for (const type of types) {
      const secret = { metadata: { name: type }, type };
      expect(isRelevantIngressSecret(secret)).toBe(true);
      expect(isListedIngressSecret(secret)).toBe(true);
      expect(isTypedSecret(secret, type)).toBe(true);
    }
  });

  it("excludes unrelated Kubernetes secret types", () => {
    const opaqueSecret = {
      metadata: { name: "generic-secret", namespace: "default" },
      type: "Opaque",
      data: { token: "dG9rZW4=" },
    };

    expect(isTlsSecret(opaqueSecret)).toBe(false);
    expect(isListedIngressSecret(opaqueSecret)).toBe(false);
    expect(isRelevantIngressSecret(opaqueSecret)).toBe(false);
  });
});
