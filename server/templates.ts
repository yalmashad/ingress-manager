const pretty = (value: unknown) => JSON.stringify(value, null, 2);

export function createResourceTemplate(kind: string, namespace = "default") {
  const base = {
    apiVersion: "k8s.nginx.org/v1",
    kind,
    metadata: {
      name: `example-${kind.toLowerCase()}`,
      namespace,
    },
  } as Record<string, unknown>;

  if (kind === "VirtualServer") {
    return pretty({
      ...base,
      spec: {
        host: "app.example.com",
        tls: {
          secret: "app-tls",
        },
        upstreams: [
          {
            name: "app",
            service: "app-service",
            port: 80,
          },
        ],
        routes: [
          {
            path: "/",
            action: {
              pass: "app",
            },
          },
        ],
      },
    });
  }

  if (kind === "VirtualServerRoute") {
    return pretty({
      ...base,
      spec: {
        host: "app.example.com",
        upstreams: [
          {
            name: "tea",
            service: "tea-svc",
            port: 80,
          },
        ],
        subroutes: [
          {
            path: "/tea",
            action: {
              pass: "tea",
            },
          },
        ],
      },
    });
  }

  if (kind === "TransportServer") {
    return pretty({
      ...base,
      spec: {
        listener: {
          name: "tcp-listener",
          protocol: "TCP",
        },
        upstreams: [
          {
            name: "tcp-app",
            service: "tcp-service",
            port: 9000,
          },
        ],
        action: {
          pass: "tcp-app",
        },
      },
    });
  }

  if (kind === "Policy") {
    return pretty({
      ...base,
      spec: {
        rateLimit: {
          rate: "10r/s",
          key: "${binary_remote_addr}",
          zoneSize: "10M",
        },
      },
    });
  }

  if (kind === "GlobalConfiguration") {
    return pretty({
      ...base,
      spec: {
        listeners: [
          {
            name: "tcp-listener",
            port: 5353,
            protocol: "TCP",
          },
        ],
      },
    });
  }

  if (kind === "ConfigMap") {
    return pretty({
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: {
        name: "nginx-configuration",
        namespace,
      },
      data: {
        "proxy-connect-timeout": "30s",
        "proxy-read-timeout": "30s",
        "client-max-body-size": "4m",
      },
    });
  }

  return pretty({
    ...base,
    spec: {},
  });
}
