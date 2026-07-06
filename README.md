# NGINX Plus Ingress Manager

Dockerized web app for managing NGINX Ingress Controller resources from a browser.

## Overview

Import a kubeconfig, inspect NGINX Ingress Controller resources, and create or update Kubernetes manifests through guided forms or raw YAML. Each user's kubeconfig is kept in that user's server-side browser session only. The app does not write uploaded kubeconfigs or pasted credentials to local files.

## Features

- Browse namespaces, controller workloads, ConfigMaps, TLS Secrets, and NGINX custom resources.
- Create and edit `VirtualServer`, `VirtualServerRoute`, `TransportServer`, `Policy`, `GlobalConfiguration`, and TLS `Secret` manifests.
- Use guided builders with cluster-aware options, or edit the generated YAML directly.
- Apply and delete resources through the Kubernetes API.
- Switch between light and dark themes.

## Run With Docker Compose

```bash
docker compose up --build -d
```

Open `http://localhost:4000`.

## Stop

```bash
docker compose down
```

## Notes

- Works on Linux and macOS hosts with Docker Compose.
- For shared deployments, put the app behind your normal HTTPS reverse proxy.
- Sessions are isolated by browser cookie and stored in server memory. Restarting the container clears active sessions.
