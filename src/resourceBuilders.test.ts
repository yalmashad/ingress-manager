import { describe, expect, it } from "vitest";
import {
  buildPolicyManifest,
  buildSecretManifest,
  defaultPolicyForm,
  defaultSecretForm,
  parsePolicyManifest,
  parseSecretManifest,
} from "./resourceBuilders";

describe("policy manifest builder", () => {
  it("uses neutral default names for policies and secrets", () => {
    expect(defaultPolicyForm("rateLimit").name).toBe("policy-name");
    expect(defaultSecretForm().name).toBe("secret-name");
    expect(defaultSecretForm().secretType).toBe("");
  });

  it("builds typed NGINX secrets used by policies", () => {
    expect(
      buildSecretManifest({
        ...defaultSecretForm(),
        name: "api-key-secret",
        secretType: "nginx.org/apikey",
        apiKeyName: "client-a",
        apiKeyValue: "secret-value",
      }),
    ).toMatchObject({
      type: "nginx.org/apikey",
      stringData: { "client-a": "secret-value" },
    });

    expect(
      buildSecretManifest({
        ...defaultSecretForm(),
        name: "basic-auth-secret",
        secretType: "nginx.org/htpasswd",
        htpasswd: "user:$apr1$hash",
      }),
    ).toMatchObject({
      type: "nginx.org/htpasswd",
      stringData: { htpasswd: "user:$apr1$hash" },
    });

    expect(
      buildSecretManifest({
        ...defaultSecretForm(),
        name: "ca-secret",
        secretType: "nginx.org/ca",
        caCertificate: "-----BEGIN CERTIFICATE-----",
      }),
    ).toMatchObject({
      type: "nginx.org/ca",
      stringData: { "ca.crt": "-----BEGIN CERTIFICATE-----" },
    });

    expect(
      buildSecretManifest({
        ...defaultSecretForm(),
        name: "oidc-secret",
        secretType: "nginx.org/oidc",
        oidcClientSecret: "oidc-client-secret",
      }),
    ).toMatchObject({
      type: "nginx.org/oidc",
      stringData: { "client-secret": "oidc-client-secret" },
    });

    expect(
      buildSecretManifest({
        ...defaultSecretForm(),
        name: "jwk-secret",
        secretType: "nginx.org/jwk",
        jwk: '{"keys":[]}',
      }),
    ).toMatchObject({
      type: "nginx.org/jwk",
      stringData: { jwk: '{"keys":[]}' },
    });
  });

  it("parses typed secrets back into the secret form", () => {
    const form = parseSecretManifest({
      apiVersion: "v1",
      kind: "Secret",
      metadata: { name: "trusted-ca", namespace: "default" },
      type: "nginx.org/ca",
      stringData: { "ca.crt": "cert", "ca.crl": "crl" },
    });

    expect(form.secretType).toBe("nginx.org/ca");
    expect(form.caCertificate).toBe("cert");
    expect(form.caCrl).toBe("crl");
  });

  it("builds API key policies with a selected secret and single supplied location", () => {
    const form = defaultPolicyForm("apiKey");
    form.apiKeyClientSecret = "api-key-secret";
    form.apiKeySuppliedIn = "query";
    form.apiKeySuppliedQuery = "apikey";

    expect(buildPolicyManifest(form).spec).toEqual({
      apiKey: {
        clientSecret: "api-key-secret",
        suppliedIn: { query: ["apikey"] },
      },
    });
  });

  it("builds JWT policies from either local secret or remote JWKS only", () => {
    const local = defaultPolicyForm("jwt");
    local.jwtMode = "localSecret";
    local.jwtSecret = "jwk-secret";
    local.jwtJwksUri = "https://idp.example.com/jwks";

    expect(buildPolicyManifest(local).spec).toEqual({
      jwt: {
        realm: "Closed Area",
        secret: "jwk-secret",
        token: "$http_authorization",
      },
    });

    const remote = defaultPolicyForm("jwt");
    remote.jwtMode = "remoteJwks";
    remote.jwtSecret = "jwk-secret";
    remote.jwtJwksUri = "https://idp.example.com/jwks";
    remote.jwtTrustedCertSecret = "idp-ca";

    expect(buildPolicyManifest(remote).spec).toEqual({
      jwt: {
        realm: "Closed Area",
        token: "$http_authorization",
        jwksURI: "https://idp.example.com/jwks",
        keyCache: "1h",
        trustedCertSecret: "idp-ca",
        sslVerifyDepth: 1,
      },
    });
  });

  it("builds externalAuth policies with current fields", () => {
    const form = defaultPolicyForm("externalAuth");
    form.externalAuthUri = "/oauth2/auth";
    form.externalAuthServiceName = "default/oauth2-proxy";
    form.externalAuthServicePorts = "4180\n4181";
    form.externalAuthSigninUri = "/oauth2/signin";
    form.externalAuthSigninRedirectBasePath = "/oauth2";
    form.externalAuthSslEnabled = true;
    form.externalAuthSslVerify = true;
    form.externalAuthSslVerifyDepth = "2";
    form.externalAuthTrustedCertSecret = "external-auth-ca";
    form.externalAuthSniName = "oauth2-proxy.default.svc";

    expect(buildPolicyManifest(form).spec).toEqual({
      externalAuth: {
        authURI: "/oauth2/auth",
        authServiceName: "default/oauth2-proxy",
        authServicePorts: [4180, 4181],
        authSigninURI: "/oauth2/signin",
        authSigninRedirectBasePath: "/oauth2",
        sslEnabled: true,
        sslVerify: true,
        sslVerifyDepth: 2,
        trustedCertSecret: "external-auth-ca",
        sniName: "oauth2-proxy.default.svc",
      },
    });
  });

  it("uses OIDC verifyDepth instead of the old sslVerifyDepth field", () => {
    const form = defaultPolicyForm("oidc");
    form.oidcClientId = "nginx-plus";
    form.oidcClientSecret = "oidc-secret";
    form.oidcAuthEndpoint = "https://idp.example.com/auth";
    form.oidcTokenEndpoint = "https://idp.example.com/token";
    form.oidcJwksUri = "https://idp.example.com/certs";
    form.oidcSslVerifyDepth = "2";

    expect(buildPolicyManifest(form).spec).toEqual({
      oidc: {
        clientID: "nginx-plus",
        clientSecret: "oidc-secret",
        authEndpoint: "https://idp.example.com/auth",
        tokenEndpoint: "https://idp.example.com/token",
        jwksURI: "https://idp.example.com/certs",
        redirectURI: "/_codexch",
        postLogoutRedirectURI: "/_logout",
        scope: "openid+profile+email",
        verifyDepth: 2,
        zoneSyncLeeway: 200,
      },
    });
  });

  it("parses legacy OIDC sslVerifyDepth for existing manifests", () => {
    const form = parsePolicyManifest({
      kind: "Policy",
      metadata: { name: "oidc" },
      spec: {
        oidc: {
          sslVerifyDepth: 3,
        },
      },
    });

    expect(form.oidcSslVerifyDepth).toBe("3");
  });

  it("builds WAF securityLogs instead of deprecated securityLog", () => {
    const form = defaultPolicyForm("waf");
    form.wafApPolicy = "default/dataguard-alarm";
    form.wafSecurityLogEnable = true;
    form.wafSecurityLogConf = "default/logconf";
    form.wafSecurityLogDest = "syslog:server=syslog-svc.default:514";

    expect(buildPolicyManifest(form).spec).toEqual({
      waf: {
        enable: true,
        apPolicy: "default/dataguard-alarm",
        securityLogs: [
          {
            enable: true,
            apLogConf: "default/logconf",
            logDest: "syslog:server=syslog-svc.default:514",
          },
        ],
      },
    });
  });
});
