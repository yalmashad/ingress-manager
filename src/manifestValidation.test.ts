import { describe, expect, it } from "vitest";
import { validateManifest } from "./manifestValidation";

describe("manifest validation", () => {
  it("explains invalid VirtualServer route target combinations and missing upstream references", () => {
    const errors = validateManifest({
      apiVersion: "k8s.nginx.org/v1",
      kind: "VirtualServer",
      metadata: { name: "test-virtualserver", namespace: "default" },
      spec: {
        host: "app.test.com",
        routes: [
          {
            path: "/",
            action: { pass: "xyz" },
            matches: [{ conditions: [{ header: "NAME", value: "VALUE" }], action: { pass: "XXX" } }],
            splits: [
              { weight: 90, action: { pass: "NINTY" } },
              { weight: 10, action: { pass: "TEN" } },
            ],
          },
          {
            path: "/AAA",
            matches: [{ conditions: [{ cookie: "ddd", value: "dddfffff" }], action: { proxy: { upstream: "gggggg" } } }],
          },
        ],
      },
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        "spec.routes[0] (/): choose exactly one of action, splits, route, or routeSelector.",
        'spec.routes[1] (/AAA): matches require a default action or splits for unmatched requests.',
        'spec.routes[0].action.pass references upstream "xyz", but spec.upstreams does not define it.',
        'spec.routes[0].matches[0].action.pass references upstream "XXX", but spec.upstreams does not define it.',
        'spec.routes[1].matches[0].action.proxy.upstream references upstream "gggggg", but spec.upstreams does not define it.',
      ]),
    );
  });

  it("rejects namespace-qualified VirtualServer TLS secret references", () => {
    expect(
      validateManifest({
        apiVersion: "k8s.nginx.org/v1",
        kind: "VirtualServer",
        metadata: { name: "my-vs", namespace: "default" },
        spec: {
          host: "app.example.com",
          tls: { secret: "default/example-tls-secret" },
          upstreams: [{ name: "app", service: "nginx-service", port: 80 }],
          routes: [{ path: "/", action: { pass: "app" } }],
        },
      }),
    ).toContain("spec.tls.secret must be a same-namespace TLS secret name, not namespace/name.");
  });

  it("validates TransportServer listener and upstream references", () => {
    expect(
      validateManifest({
        apiVersion: "k8s.nginx.org/v1alpha1",
        kind: "TransportServer",
        metadata: { name: "ts", namespace: "default" },
        spec: {
          listener: { protocol: "TCP" },
          action: { pass: "missing" },
          upstreams: [{ service: "tcp-app", port: 9000 }],
          tls: { secret: "default/tcp-secret" },
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        "spec.listener.name is required.",
        'spec.action.pass references upstream "missing", but spec.upstreams does not define it.',
        "spec.upstreams[0].name is required.",
        "spec.tls.secret must be a same-namespace TLS secret name, not namespace/name.",
      ]),
    );
  });

  it("validates VirtualServerRoute subroutes against defined upstreams", () => {
    expect(
      validateManifest({
        apiVersion: "k8s.nginx.org/v1",
        kind: "VirtualServerRoute",
        metadata: { name: "route-set", namespace: "default" },
        spec: {
          host: "app.example.com",
          upstreams: [{ name: "tea", service: "tea-svc", port: 80 }],
          subroutes: [{ path: "/coffee", action: { pass: "coffee" } }],
        },
      }),
    ).toContain('spec.subroutes[0].action.pass references upstream "coffee", but spec.upstreams does not define it.');
  });

  it("validates policy-specific required fields", () => {
    expect(
      validateManifest({
        apiVersion: "k8s.nginx.org/v1",
        kind: "Policy",
        metadata: { name: "jwt-policy", namespace: "default" },
        spec: { jwt: {} },
      }),
    ).toEqual(expect.arrayContaining(["spec.jwt requires either secret or jwksURI."]));

    expect(
      validateManifest({
        apiVersion: "k8s.nginx.org/v1",
        kind: "Policy",
        metadata: { name: "oidc-policy", namespace: "default" },
        spec: { oidc: { clientID: "web-client", authEndpoint: "https://idp/auth" } },
      }),
    ).toEqual(
      expect.arrayContaining([
        "spec.oidc.tokenEndpoint is required.",
        "spec.oidc.jwksURI is required.",
        "spec.oidc.clientSecret is required unless pkceEnable is true.",
      ]),
    );
  });

  it("validates nginx ingress secret payload requirements", () => {
    expect(
      validateManifest({
        apiVersion: "v1",
        kind: "Secret",
        metadata: { name: "tls-secret", namespace: "default" },
        type: "kubernetes.io/tls",
        stringData: { "tls.crt": "cert" },
      }),
    ).toContain('tls secrets require "tls.key".');

    expect(
      validateManifest({
        apiVersion: "v1",
        kind: "Secret",
        metadata: { name: "apikey-secret", namespace: "default" },
        type: "nginx.org/apikey",
        stringData: {},
      }),
    ).toContain("nginx.org/apikey secrets require at least one client ID entry.");
  });

  it("validates GlobalConfiguration listener uniqueness", () => {
    expect(
      validateManifest({
        apiVersion: "k8s.nginx.org/v1alpha1",
        kind: "GlobalConfiguration",
        metadata: { name: "global", namespace: "default" },
        spec: {
          listeners: [
            { name: "http-8080", port: 8080, protocol: "HTTP" },
            { name: "http-8080", port: 8081, protocol: "HTTP" },
          ],
        },
      }),
    ).toContain('spec.listeners[1].name duplicates listener "http-8080".');
  });

  it("accepts a valid set of supported manifests", () => {
    expect(
      validateManifest({
        apiVersion: "k8s.nginx.org/v1",
        kind: "VirtualServer",
        metadata: { name: "cafe", namespace: "default" },
        spec: {
          host: "cafe.example.com",
          upstreams: [
            { name: "tea", service: "tea-svc", port: 80 },
            { name: "coffee", service: "coffee-svc", port: 80 },
          ],
          routes: [
            {
              path: "/routing",
              matches: [{ conditions: [{ variable: "$request_method", value: "POST" }], action: { pass: "coffee" } }],
              action: { pass: "tea" },
            },
            {
              path: "/split",
              splits: [
                { weight: 90, action: { pass: "coffee" } },
                { weight: 10, action: { pass: "tea" } },
              ],
            },
          ],
        },
      }),
    ).toEqual([]);

    expect(
      validateManifest({
        apiVersion: "v1",
        kind: "Secret",
        metadata: { name: "secret-name", namespace: "default" },
        type: "nginx.org/apikey",
        stringData: { client1: "mykey", client2: "mykey2" },
      }),
    ).toEqual([]);
  });
});
