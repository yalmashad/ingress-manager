export type AppMode = "manager" | "generator";

export const appModeLabels: Record<AppMode, string> = {
  manager: "Manager mode",
  generator: "Config-Generator mode",
};

export const builderResourceKinds = [
  "VirtualServer",
  "VirtualServerRoute",
  "TransportServer",
  "Policy",
  "GlobalConfiguration",
  "Secret",
  "DosProtectedResource",
];

export function getManifestActionLabel(mode: AppMode, busy: boolean) {
  if (mode === "generator") {
    return busy ? "Copying..." : "Copy YAML";
  }

  return busy ? "Saving..." : "Apply manifest";
}

export function combineYamlDocuments(documents: string[]) {
  return documents
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n---\n");
}
