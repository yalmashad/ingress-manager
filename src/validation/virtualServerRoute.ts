import { asArray, asObj, asString, type Obj } from "./helpers";
import { validateRoute } from "./routes";

export function validateVirtualServerRoute(manifest: Obj) {
  const errors: string[] = [];
  const spec = asObj(manifest.spec);
  if (!asString(spec.host)) {
    errors.push("spec.host is required.");
  }

  const upstreams = new Set(
    asArray(spec.upstreams)
      .map((upstream) => asString(upstream.name))
      .filter(Boolean),
  );

  asArray(spec.subroutes).forEach((route, index) => validateRoute(route, index, "spec.subroutes", upstreams, errors));
  return errors;
}
