import { describe, expect, it } from "vitest";
import { deriveManifestPreservation, findUnknownManifestPaths, preserveUnknownManifestFields, stripRuntimeManifestFields } from "./manifestPreservation";

describe("manifest preservation", () => {
  it("preserves unsupported top-level spec fields while keeping generated GUI values authoritative", () => {
    const original = {
      apiVersion: "k8s.nginx.org/v1",
      kind: "VirtualServer",
      metadata: { name: "cafe", namespace: "default" },
      spec: {
        host: "old.example.com",
        futureFeature: { enabled: true },
      },
    };
    const generated = {
      apiVersion: "k8s.nginx.org/v1",
      kind: "VirtualServer",
      metadata: { name: "cafe", namespace: "default" },
      spec: {
        host: "new.example.com",
      },
    };

    expect(preserveUnknownManifestFields(original, generated)).toMatchObject({
      spec: {
        host: "new.example.com",
        futureFeature: { enabled: true },
      },
    });
  });

  it("preserves unsupported fields inside matched array items", () => {
    const original = {
      spec: {
        routes: [
          {
            path: "/tea",
            action: { pass: "tea" },
            futureRouteSetting: "keep-me",
          },
        ],
      },
    };
    const generated = {
      spec: {
        routes: [
          {
            path: "/tea",
            action: { pass: "coffee" },
          },
        ],
      },
    };

    expect(preserveUnknownManifestFields(original, generated)).toEqual({
      spec: {
        routes: [
          {
            path: "/tea",
            action: { pass: "coffee" },
            futureRouteSetting: "keep-me",
          },
        ],
      },
    });
  });

  it("reports unsupported paths that are present in raw YAML but absent from the GUI-generated manifest", () => {
    expect(
      findUnknownManifestPaths(
        { spec: { routes: [{ path: "/", futureRouteSetting: true }], futureSpecSetting: "x" } },
        { spec: { routes: [{ path: "/" }] } },
      ),
    ).toEqual(["spec.routes[0].futureRouteSetting", "spec.futureSpecSetting"]);
  });

  it("removes Kubernetes runtime fields before showing or applying a manifest", () => {
    expect(
      stripRuntimeManifestFields({
        apiVersion: "k8s.nginx.org/v1",
        kind: "VirtualServer",
        metadata: {
          name: "my-vs",
          namespace: "default",
          creationTimestamp: "2026-07-07T15:25:29.000Z",
          generation: 1,
          managedFields: [{ manager: "nginx-ingress" }],
          resourceVersion: "645222",
          uid: "a9b513b3",
          labels: { app: "demo" },
        },
        spec: { host: "app.example.com" },
        status: { state: "Invalid" },
      }),
    ).toEqual({
      apiVersion: "k8s.nginx.org/v1",
      kind: "VirtualServer",
      metadata: {
        name: "my-vs",
        namespace: "default",
        labels: { app: "demo" },
      },
      spec: { host: "app.example.com" },
    });
  });

  it("does not warn or preserve Secret data entries represented by generated stringData", () => {
    const original = {
      apiVersion: "v1",
      kind: "Secret",
      metadata: { name: "apikey-secret" },
      type: "nginx.org/apikey",
      data: { client1: "cGFzc3dvcmQ=", client2: "cGFzc3dvcmQy" },
    };
    const generated = {
      apiVersion: "v1",
      kind: "Secret",
      metadata: { name: "apikey-secret", namespace: "default" },
      type: "nginx.org/apikey",
      stringData: { client1: "password", client2: "password2" },
    };

    expect(findUnknownManifestPaths(original, generated)).toEqual([]);
    expect(preserveUnknownManifestFields(original, generated)).toEqual(generated);
  });

  it("removes API key secret entries deleted through the GUI after parsing manual YAML edits", () => {
    const original = {
      apiVersion: "v1",
      kind: "Secret",
      metadata: { name: "test-secret", namespace: "default" },
      type: "nginx.org/apikey",
      stringData: {
        "client-1": "key1",
        "client-2": "key2",
        "client-3": "key3",
      },
    };
    const generated = {
      apiVersion: "v1",
      kind: "Secret",
      metadata: { name: "test-secret", namespace: "default" },
      type: "nginx.org/apikey",
      stringData: {
        "client-1": "key1",
      },
    };

    expect(findUnknownManifestPaths(original, generated)).toEqual([]);
    expect(preserveUnknownManifestFields(original, generated)).toEqual(generated);
  });

  it("does not enable preservation mode when a manifest only contains supported fields", () => {
    const original = {
      apiVersion: "k8s.nginx.org/v1",
      kind: "VirtualServer",
      metadata: { name: "cafe", namespace: "default" },
      spec: {
        host: "cafe.example.com",
        gunzip: true,
      },
    };
    const generated = {
      apiVersion: "k8s.nginx.org/v1",
      kind: "VirtualServer",
      metadata: { name: "cafe", namespace: "default" },
      spec: {
        host: "cafe.example.com",
        gunzip: true,
      },
    };

    expect(deriveManifestPreservation(original, generated)).toEqual({
      rawManifest: null,
      unsupportedFieldPaths: [],
    });
  });

  it("enables preservation mode only when unsupported fields exist", () => {
    const original = {
      apiVersion: "k8s.nginx.org/v1",
      kind: "VirtualServer",
      metadata: { name: "cafe", namespace: "default" },
      spec: {
        host: "cafe.example.com",
        futureFeature: { enabled: true },
      },
    };
    const generated = {
      apiVersion: "k8s.nginx.org/v1",
      kind: "VirtualServer",
      metadata: { name: "cafe", namespace: "default" },
      spec: {
        host: "cafe.example.com",
      },
    };

    expect(deriveManifestPreservation(original, generated)).toEqual({
      rawManifest: original,
      unsupportedFieldPaths: ["spec.futureFeature"],
    });
  });
});
