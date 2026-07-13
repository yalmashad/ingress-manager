import { asObj, asString, type Obj } from "./validation/helpers";
import { validateGlobalConfiguration } from "./validation/globalConfiguration";
import { validatePolicy } from "./validation/policy";
import { validateSecret } from "./validation/secret";
import { validateTransportServer } from "./validation/transportServer";
import { validateVirtualServer } from "./validation/virtualServer";
import { validateVirtualServerRoute } from "./validation/virtualServerRoute";

function validateMetadata(manifest: Obj) {
  const errors: string[] = [];
  const metadata = asObj(manifest.metadata);
  if (!asString(metadata.name)) {
    errors.push("metadata.name is required.");
  }
  return errors;
}

export function validateManifest(manifest: Obj) {
  const errors = validateMetadata(manifest);

  switch (manifest.kind) {
    case "VirtualServer":
      return [...errors, ...validateVirtualServer(manifest)];
    case "VirtualServerRoute":
      return [...errors, ...validateVirtualServerRoute(manifest)];
    case "TransportServer":
      return [...errors, ...validateTransportServer(manifest)];
    case "GlobalConfiguration":
      return [...errors, ...validateGlobalConfiguration(manifest)];
    case "Policy":
      return [...errors, ...validatePolicy(manifest)];
    case "Secret":
      return [...errors, ...validateSecret(manifest)];
    default:
      return errors;
  }
}
