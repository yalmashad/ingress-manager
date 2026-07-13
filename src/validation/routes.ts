import { asArray, asObj, asString, hasOwn, type Obj } from "./helpers";

function targetKeys(route: Obj) {
  return ["action", "splits", "route", "routeSelector"].filter((key) => hasOwn(route, key));
}

function actionKeys(action: Obj) {
  return ["pass", "proxy", "redirect", "return"].filter((key) => hasOwn(action, key));
}

export function validateAction(action: unknown, upstreams: Set<string>, path: string, errors: string[]) {
  if (!asString(action) && !asObj(action)) {
    errors.push(`${path} must be an object.`);
    return;
  }

  const actionObj = asObj(action);
  const keys = actionKeys(actionObj);
  if (keys.length !== 1) {
    errors.push(`${path}: choose exactly one of pass, proxy, redirect, or return.`);
    return;
  }

  if (typeof actionObj.pass === "string" && !upstreams.has(actionObj.pass)) {
    errors.push(`${path}.pass references upstream "${actionObj.pass}", but spec.upstreams does not define it.`);
  }

  const proxy = asObj(actionObj.proxy);
  if (typeof proxy.upstream === "string" && !upstreams.has(proxy.upstream)) {
    errors.push(`${path}.proxy.upstream references upstream "${proxy.upstream}", but spec.upstreams does not define it.`);
  }
}

export function validateSplits(splits: unknown, upstreams: Set<string>, path: string, errors: string[]) {
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

export function validateRoute(route: Obj, index: number, routePath: string, upstreams: Set<string>, errors: string[]) {
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
