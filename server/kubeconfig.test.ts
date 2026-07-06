import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { rewriteLoopbackClusterServers } from "./kubeconfig.js";

describe("rewriteLoopbackClusterServers", () => {
  it("rewrites localhost Kubernetes API endpoints to the configured Docker host", () => {
    const kubeconfig = YAML.stringify({
      apiVersion: "v1",
      clusters: [
        { name: "docker-desktop", cluster: { server: "https://127.0.0.1:51177" } },
        { name: "kind", cluster: { server: "https://localhost:6443" } },
        { name: "remote", cluster: { server: "https://10.0.0.5:6443" } },
      ],
    });

    const rewritten = YAML.parse(rewriteLoopbackClusterServers(kubeconfig, "host.docker.internal"));

    expect(rewritten.clusters[0].cluster.server).toBe("https://host.docker.internal:51177/");
    expect(rewritten.clusters[1].cluster.server).toBe("https://host.docker.internal:6443/");
    expect(rewritten.clusters[2].cluster.server).toBe("https://10.0.0.5:6443");
  });

  it("leaves kubeconfig unchanged when no rewrite host is configured", () => {
    const kubeconfig = "clusters:\n  - name: local\n    cluster:\n      server: https://127.0.0.1:51177\n";

    expect(rewriteLoopbackClusterServers(kubeconfig, undefined)).toBe(kubeconfig);
  });
});
