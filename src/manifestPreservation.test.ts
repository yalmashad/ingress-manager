import { describe, expect, it } from "vitest";
import { findUnknownManifestPaths, preserveUnknownManifestFields } from "./manifestPreservation";

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
});
