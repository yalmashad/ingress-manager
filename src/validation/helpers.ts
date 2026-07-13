export type Obj = Record<string, unknown>;

export function isObj(value: unknown): value is Obj {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function asObj(value: unknown): Obj {
  return isObj(value) ? value : {};
}

export function asArray(value: unknown): Obj[] {
  return Array.isArray(value) ? value.filter(isObj) : [];
}

export function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isRfc1123Subdomain(value: string) {
  return /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/.test(value);
}

export function hasOwn(obj: Obj, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
