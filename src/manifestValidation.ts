type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray(value: unknown): Obj[] {
  return Array.isArray(value) ? value.filter(isObj) : [];
}

function targetKeys(route: Obj) {
  return ["action", "splits", "route", "routeSelector"].filter((key) => route[key] !== undefined);
}

function actionKey(action: Obj) {
  return ["pass", "proxy", "redirect", "return"].filter((key) => action[key] !== undefined);
}

function isRfc1123Subdomain(value: string) {
  return /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/.test(value);
}

function validateAction(action: unknown, upstreams: Set<string>, path: string, errors: string[]) {
  if (!isObj(action)) {
    errors.push(`${path} must be an object.`);
    return;
  }

  const keys = actionKey(action);
  if (keys.length !== 1) {
    errors.push(`${path}: choose exactly one of pass, proxy, redirect, or return.`);
    return;
  }

  if (typeof action.pass === "string" && !upstreams.has(action.pass)) {
    errors.push(`${path}.pass references upstream "${action.pass}", but spec.upstreams does not define it.`);
  }

  const proxy = action.proxy;
  if (isObj(proxy) && typeof proxy.upstream === "string" && !upstreams.has(proxy.upstream)) {
    errors.push(`${path}.proxy.upstream references upstream "${proxy.upstream}", but spec.upstreams does not define it.`);
  }
}

function validateSplits(splits: unknown, upstreams: Set<string>, path: string, errors: string[]) {
  const items = asArray(splits);
  if (items.length < 2) {
    errors.push(`${path}: define at least two split entries.`);
    return;
  }

  let total = 0;
  items.forEach((split, index) => {
    if (typeof split.weight !== "number") {
      errors.push(`${path}[${index}].weight must be a number.`);
    } else {
      total += split.weight;
    }
    validateAction(split.action, upstreams, `${path}[${index}].action`, errors);
  });

  if (total !== 100) {
    errors.push(`${path}: split weights must add up to 100.`);
  }
}

function validateRoute(route: Obj, index: number, routePath: string, upstreams: Set<string>, errors: string[]) {
  const label = typeof route.path === "string" ? route.path : `route ${index + 1}`;
  const base = `${routePath}[${index}] (${label})`;
  const keys = targetKeys(route);

  if (typeof route.path !== "string" || !route.path.trim()) {
    errors.push(`${routePath}[${index}].path is required.`);
  }

  if (keys.length !== 1) {
    errors.push(`${base}: choose exactly one of action, splits, route, or routeSelector.`);
  }

  const matches = asArray(route.matches);
  if (matches.length && route.action === undefined && route.splits === undefined) {
    errors.push(`${base}: matches require a default action or splits for unmatched requests.`);
  }

  if (route.action !== undefined) validateAction(route.action, upstreams, `${routePath}[${index}].action`, errors);
  if (route.splits !== undefined) validateSplits(route.splits, upstreams, `${routePath}[${index}].splits`, errors);

  matches.forEach((match, matchIndex) => {
    const conditions = asArray(match.conditions);
    if (!conditions.length) {
      errors.push(`${routePath}[${index}].matches[${matchIndex}].conditions must include at least one condition.`);
    }
    if (match.action !== undefined) validateAction(match.action, upstreams, `${routePath}[${index}].matches[${matchIndex}].action`, errors);
    if (match.splits !== undefined) validateSplits(match.splits, upstreams, `${routePath}[${index}].matches[${matchIndex}].splits`, errors);
    if (match.action === undefined && match.splits === undefined) {
      errors.push(`${routePath}[${index}].matches[${matchIndex}]: choose action or splits.`);
    }
  });
}

function validateVirtualServer(manifest: Obj) {
  const errors: string[] = [];
  const spec = isObj(manifest.spec) ? manifest.spec : {};
  const tls = isObj(spec.tls) ? spec.tls : {};
  if (typeof tls.secret === "string" && tls.secret.trim()) {
    if (tls.secret.includes("/") || !isRfc1123Subdomain(tls.secret)) {
      errors.push("spec.tls.secret must be a same-namespace TLS secret name, not namespace/name.");
    }
  }
  const upstreams = new Set(
    asArray(spec.upstreams)
      .map((upstream) => upstream.name)
      .filter((name): name is string => typeof name === "string" && Boolean(name.trim())),
  );

  asArray(spec.routes).forEach((route, index) => validateRoute(route, index, "spec.routes", upstreams, errors));
  return errors;
}

export function validateManifest(manifest: Obj) {
  if (manifest.kind === "VirtualServer") return validateVirtualServer(manifest);
  return [];
}
