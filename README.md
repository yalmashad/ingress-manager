# NGINX Plus Ingress Manager

Dockerized browser UI for building and managing NGINX Ingress Controller custom resources.

The app can be used in two ways:

- **Manager mode**: import a kubeconfig, connect to a Kubernetes cluster, browse NGINX Ingress resources, and apply changes directly.
- **Config-Generator mode**: build manifests without cluster access, copy the generated YAML, and apply it later with your own workflow.

Uploaded kubeconfigs are kept only in the user's server-side browser session. The app does not write uploaded kubeconfigs to local files.

## Key Features

- Guided builders for:
  - `VirtualServer`
  - `VirtualServerRoute`
  - `TransportServer`
  - `Policy`
  - `GlobalConfiguration`
  - NGINX Ingress related `Secret` types
  - `DosProtectedResource` starter YAML
- Live YAML preview beside the GUI builder.
- Two-way editing: YAML changes update the GUI when the field is supported.
- Unsupported YAML fields are preserved when possible and shown with a warning, so newer CRD fields are not silently removed.
- Manager mode can apply, update, and delete resources through the Kubernetes API.
- Config-Generator mode works without any Kubernetes connection.
- Kubeconfigs with multiple contexts prompt the user to select which context to connect to.
- Cluster-aware dropdowns for namespaces, policies, listeners, TLS secrets, and typed policy secrets.
- Light and dark themes.

## Run With Docker Compose

```bash
docker compose up --build -d
```

Open:

```text
http://localhost:4000
```

Stop the app:

```bash
docker compose down
```

## Modes

### Manager Mode

Use Manager mode when you want the app to connect to a Kubernetes cluster.

Typical workflow:

1. Select **Manager** on the first screen.
2. Upload a kubeconfig file.
3. If the kubeconfig has multiple contexts, select the context to use.
4. Browse available NGINX Ingress resources.
5. Open an existing resource or create a new one.
6. Use the GUI builder, edit YAML directly, or combine both.
7. Click **Apply manifest** to create or update the resource in the cluster.

Manager mode lists supported resources such as `VirtualServer`, `VirtualServerRoute`, `TransportServer`, `Policy`, `GlobalConfiguration`, and relevant NGINX Ingress secrets. Secret rows show the secret type where applicable.

### Config-Generator Mode

Use Config-Generator mode when you do not have cluster access, or when you only want to prepare YAML for later.

Typical workflow:

1. Select **Config-Generator** on the first screen.
2. Choose a resource kind.
3. Fill the GUI builder fields or edit the YAML directly.
4. Click **Copy YAML**.
5. Apply the manifest later with your own tooling, for example:

```bash
kubectl apply -f manifest.yaml
```

No kubeconfig or cluster connection is required in this mode.

## YAML And GUI Behavior

The manifest editor and GUI builder stay synchronized.

- Changing supported YAML fields updates the GUI.
- Changing GUI fields updates the YAML.
- If the YAML contains fields that are not represented in the GUI, the app shows a warning and preserves those fields when regenerating YAML.
- Supported GUI fields remain authoritative. For example, if you change `spec.host` in the GUI, that GUI value replaces the old YAML value.
- Unsupported fields are merged back into the generated manifest so newer NGINX Ingress Controller fields can still be used before the GUI explicitly supports them.

This makes the GUI useful for common fields while still allowing advanced users to keep custom or newly introduced CRD fields in raw YAML.

## Resource Builders

### VirtualServer

The `VirtualServer` builder supports common NGINX Ingress Controller configuration, including:

- General metadata, host, namespace, ingress class, and ExternalDNS.
- TLS secret selection limited to `kubernetes.io/tls` secrets, with an option to create a TLS secret.
- Multiple policy attachments using an **Available** and **Selected** policy selector.
- Optional upstreams. Add upstreams only when needed.
- Upstream service mapping, backup service, load balancing, health checks, and session persistence.
- Optional routes. Add routes only when needed.
- Direct route actions: `pass`, `proxy`, `redirect`, and `return`.
- Conditional matches for header, cookie, argument, or variable based routing.
- Weighted splits for traffic splitting.
- Delegation to `VirtualServerRoute`.
- Advanced fields behind **Show Advanced Fields** to keep the default UI compact.
- Snippets section for larger raw snippet text.

The builder validates common invalid route combinations, such as using `action` and `splits` on the same route or referencing undefined upstreams.

### VirtualServerRoute

The `VirtualServerRoute` builder is used for delegated route fragments referenced by a parent `VirtualServer`.

It supports:

- Metadata, namespace, and host.
- Optional upstreams.
- Subroutes with actions, matches, splits, policies, and snippets.
- Compact table-style field layout aligned with the other builders.

### TransportServer

The `TransportServer` builder supports TCP, UDP, and TLS passthrough style resources.

It includes:

- Listener name and protocol.
- Host and TLS secret where applicable.
- Upstream services, backup services, and upstream tuning fields.
- Action pass target.
- Server and stream snippets.

### GlobalConfiguration

The `GlobalConfiguration` builder manages custom listener definitions.

It supports:

- Listener name.
- Port.
- Protocol.
- SSL flag.
- Optional IPv4 and IPv6 listener addresses.

These listeners can then be referenced by `VirtualServer` and `TransportServer` resources.

## Policy Builder

The `Policy` builder supports NGINX Ingress Controller policy types with compact, table-style settings. Required fields are shown first and highlighted.

Supported policy types include:

- Access control
- Rate limit
- API key
- Basic authentication
- JWT
- Ingress mTLS
- Egress mTLS
- External authentication
- OIDC
- WAF
- Cache
- CORS

Policy-specific behavior:

- **Access control** keeps allow and deny list examples empty by default. If both allow and deny are used together, the UI warns about the unsupported conflict.
- **Rate limit** supports common keys, custom keys, and optional conditions.
- **API key** supports header, query parameter, or both, and selects `nginx.org/apikey` secrets.
- **Basic authentication** selects `nginx.org/htpasswd` secrets.
- **JWT** separates local JWK secret mode from remote JWKS URI mode so conflicting fields are not shown together.
- **Ingress mTLS** selects `nginx.org/ca` secrets.
- **External authentication** supports trusted CA secret selection and aligned auth service settings.
- **Egress mTLS** selects TLS and CA secrets as required by the policy.
- **OIDC** selects `nginx.org/oidc` client secrets and CA secrets where needed.
- **WAF** supports App Protect policy references, bundles, security logs, and bundle source YAML.
- **Cache** supports required cache zone fields, cache conditions, cache manager YAML, lock settings, and explicit `useTempPath` behavior.
- **CORS** uses the same compact settings layout as the other policies.

Policies can be attached to a `VirtualServer` or route using the Available and Selected policy selector.

## Secret Builder

The Secret builder focuses on secret types relevant to NGINX Ingress Controller resources and policies.

Supported secret types:

- **TLS secret**: `kubernetes.io/tls`
- **API key secret**: `nginx.org/apikey`
- **HTTP password secret**: `nginx.org/htpasswd`
- **CA cert secret**: `nginx.org/ca`
- **OIDC secret**: `nginx.org/oidc`
- **JWK secret**: `nginx.org/jwk`

Secret behavior:

- The secret type is not preselected; users choose the intended type first.
- Only fields relevant to the selected secret type are shown.
- File-or-text fields use an **Upload File** or **Paste Text** choice, with upload as the default.
- Related policy fields can create a secret inline using the same Secret builder UI.
- Manager mode lists only NGINX Ingress relevant secret types and shows each secret's type.

## Raw YAML Safety

The app includes a preservation layer for advanced YAML edits.

Example:

```yaml
apiVersion: k8s.nginx.org/v1
kind: VirtualServer
metadata:
  name: cafe
spec:
  host: cafe.example.com
  futureControllerField:
    enabled: true
```

If `futureControllerField` is not represented in the GUI, the app shows a warning and keeps that field in the generated YAML while still allowing normal GUI edits to supported fields.

This is intended for:

- New NGINX Ingress Controller CRD fields.
- Advanced fields not yet exposed by the GUI.
- Lab or migration scenarios where raw YAML must be preserved.

## Validation

The app performs client-side validation for common mistakes before applying or copying YAML, including:

- Invalid `VirtualServer` route target combinations.
- Missing upstream references in route actions, matches, and splits.
- Split weights that do not add up to `100`.
- Access control policies that include both allow and deny lists.

Kubernetes API validation still applies in Manager mode. If the installed CRD version does not support a field, the Kubernetes API may reject the manifest even if the GUI can preserve it in YAML.

## Kubeconfig Handling

- Kubeconfigs are uploaded through the browser and stored in server memory for that browser session.
- If a kubeconfig has multiple contexts, the app asks which context to use.
- Local kubeconfigs that point to `127.0.0.1` or `localhost` can be rewritten for container access through the configured loopback host.
- Restarting the container clears active sessions.

## Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Build:

```bash
npm run build
```

Run locally for development:

```bash
npm run dev
```

## Deployment Notes

- Works on Linux and macOS hosts with Docker Compose.
- For shared deployments, put the app behind your normal HTTPS reverse proxy.
- Set a stable session secret for shared or long-running deployments.
- Sessions are isolated by browser cookie and stored in server memory.
- Config-Generator mode can be used without any Kubernetes network access.
