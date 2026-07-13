import { asArray, asObj, asString, type Obj } from "./helpers";

export function validateGlobalConfiguration(manifest: Obj) {
  const errors: string[] = [];
  const spec = asObj(manifest.spec);
  const listeners = asArray(spec.listeners);
  const seenNames = new Set<string>();

  listeners.forEach((listener, index) => {
    const name = asString(listener.name);
    if (!name) errors.push(`spec.listeners[${index}].name is required.`);
    if (!asString(listener.protocol)) errors.push(`spec.listeners[${index}].protocol is required.`);
    if (listener.port === undefined) errors.push(`spec.listeners[${index}].port is required.`);
    if (name) {
      if (seenNames.has(name)) errors.push(`spec.listeners[${index}].name duplicates listener "${name}".`);
      seenNames.add(name);
    }
  });

  return errors;
}
