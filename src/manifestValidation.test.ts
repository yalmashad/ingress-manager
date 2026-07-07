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

  it("accepts a VirtualServer with defined upstreams, default action, matches, and weighted splits on separate routes", () => {
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
  });
});
