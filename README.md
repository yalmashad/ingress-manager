# NGINX Plus Ingress Manager

Browser UI for building and managing NGINX Ingress Controller resources.

Use it in either mode:

- **Manager mode**: import a kubeconfig, connect to Kubernetes, browse resources, and apply changes directly.
- **Config-Generator mode**: build manifests without cluster access, copy YAML, and apply it later with your own tools.

Uploaded kubeconfigs are stored only in the server-side browser session and are not written to local files.

## Key Features

- Builders for `VirtualServer`, `VirtualServerRoute`, `TransportServer`, `Policy`, `GlobalConfiguration`, NGINX Ingress related `Secret` types, and `DosProtectedResource` starter YAML.
- Live YAML preview beside the GUI builder.
- Two-way editing between YAML and supported GUI fields.
- Preservation warnings for YAML fields that are not represented in the GUI.
- Manager mode apply, update, delete, and controller status feedback.
- Config-Generator mode for offline YAML generation.
- Cluster-aware dropdowns for namespaces, policies, listeners, TLS secrets, and typed policy secrets.
- Kubeconfig context selection when multiple contexts are present.
- Light and dark themes.

## Run

```bash
docker compose up --build -d
```

Open:

```text
http://localhost:4000
```

Stop:

```bash
docker compose down
```

## How To Use

### Manager Mode

1. Select **Manager**.
2. Upload a kubeconfig file.
3. Select a kubeconfig context if prompted.
4. Browse existing NGINX Ingress resources.
5. Create or open a resource.
6. Use the GUI builder, edit YAML directly, or combine both.
7. Click **Apply manifest**.

After apply, the app shows whether Kubernetes accepted the manifest and, for NGINX resources, what the controller reports as the current status.

### Config-Generator Mode

1. Select **Config-Generator**.
2. Choose a resource kind.
3. Fill the GUI builder fields or edit YAML.
4. Copy the generated YAML.
5. Apply it later, for example:

```bash
kubectl apply -f manifest.yaml
```

No kubeconfig or cluster connection is required.

## Resource Builders

### VirtualServer

Supports host, namespace, ingress class, ExternalDNS, TLS secret selection, multiple policies, upstreams, routes, matches, splits, direct actions, delegated `VirtualServerRoute`, snippets, and advanced fields behind **Show Advanced Fields**.

The builder validates common route issues such as conflicting `action` and `splits`, missing upstream references, and invalid split weights.

### VirtualServerRoute

Build delegated route fragments with metadata, host, optional upstreams, subroutes, actions, matches, splits, policies, and snippets.

### TransportServer

Build TCP, UDP, and TLS passthrough resources with listeners, upstream services, action pass targets, and server or stream snippets.

### GlobalConfiguration

Create custom listeners with name, port, protocol, SSL flag, and optional IPv4 or IPv6 listener addresses.

## Policy Builder

The `Policy` builder uses compact settings with required fields highlighted and shown first.

Supported policy types:

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

Policy fields show only the options relevant to the selected policy type. Policy references can be attached to `VirtualServer` and route sections with an Available and Selected selector.

## Secret Builder

The Secret builder only focuses on NGINX Ingress relevant secret types:

- **TLS secret**: `kubernetes.io/tls`
- **API key secret**: `nginx.org/apikey`
- **HTTP password secret**: `nginx.org/htpasswd`
- **CA cert secret**: `nginx.org/ca`
- **OIDC secret**: `nginx.org/oidc`
- **JWK secret**: `nginx.org/jwk`

The secret type is not preselected. After the user chooses a type, only the relevant fields are shown. File-based fields support **Upload File** or **Paste Text**, and policy builders can open the same Secret builder inline when a required secret does not exist yet.

## YAML Behavior

The GUI and manifest editor stay synchronized:

- Supported YAML fields update the GUI.
- GUI edits update the YAML.
- Unsupported YAML fields are preserved when possible and shown with a warning.
- Runtime Kubernetes fields such as `status`, `managedFields`, resource versions, and UIDs are removed from editable manifests.

This lets users work with common GUI fields while keeping advanced or newer CRD fields in raw YAML.

## Validation

The app checks common mistakes before applying or copying YAML, including:

- Invalid `VirtualServer` route target combinations.
- Missing upstream references in route actions, matches, and splits.
- Split weights that do not add up to `100`.
- Access control policies that include both allow and deny lists.
- TLS references that use an invalid secret name format.

Kubernetes API and installed CRD validation still apply in Manager mode.

## Kubeconfig Handling

- Kubeconfigs are uploaded through the browser and stored in server memory for that browser session.
- If a kubeconfig has multiple contexts, the app asks which context to use.
- Local kubeconfigs that point to `127.0.0.1` or `localhost` can be rewritten for container access through the configured loopback host.
- Restarting the container clears active sessions.
