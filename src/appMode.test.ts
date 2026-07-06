import { describe, expect, it } from "vitest";
import {
  appModeLabels,
  builderResourceKinds,
  combineYamlDocuments,
  getManifestActionLabel,
} from "./appMode";

describe("app mode helpers", () => {
  it("uses Manager and Config-Generator mode labels", () => {
    expect(appModeLabels.manager).toBe("Manager mode");
    expect(appModeLabels.generator).toBe("Config-Generator mode");
  });

  it("uses apply wording only in manager mode", () => {
    expect(getManifestActionLabel("manager", false)).toBe("Apply manifest");
    expect(getManifestActionLabel("manager", true)).toBe("Saving...");
    expect(getManifestActionLabel("generator", false)).toBe("Copy YAML");
    expect(getManifestActionLabel("generator", true)).toBe("Copying...");
  });

  it("exposes the resources that can be generated without a cluster connection", () => {
    expect(builderResourceKinds).toEqual([
      "VirtualServer",
      "VirtualServerRoute",
      "TransportServer",
      "Policy",
      "GlobalConfiguration",
      "Secret",
      "DosProtectedResource",
    ]);
  });

  it("combines generated manifests as multi-document YAML", () => {
    expect(combineYamlDocuments(["kind: Secret\n", "", "kind: VirtualServer\n"])).toBe(
      "kind: Secret\n---\nkind: VirtualServer",
    );
  });
});
