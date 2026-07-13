import type { ServerPreflightResult } from "./preflight";

export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function uploadKubeconfig(file: File | null, kubeconfig: string) {
  const form = new FormData();
  if (file) {
    form.append("file", file);
  }
  if (kubeconfig.trim()) {
    form.append("kubeconfig", kubeconfig);
  }

  return fetchJson("/api/session/kubeconfig", {
    method: "POST",
    body: form,
  });
}

export async function selectKubeconfigContext(context: string) {
  return fetchJson("/api/session/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context }),
  });
}

export async function runPreflight(manifest: Record<string, unknown>, signal?: AbortSignal) {
  return fetchJson<ServerPreflightResult>("/api/preflight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(manifest),
    signal,
  });
}
