import { describe, expect, it } from "vitest";
import {
  buildPolicyManifest,
  defaultPolicyForm,
  parsePolicyManifest,
} from "./resourceBuilders";

describe("policy manifest builder", () => {
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
