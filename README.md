# NGINX Plus Ingress Manager

Web UI for importing a kubeconfig, browsing NGINX Ingress resources, and applying Kubernetes manifests.

## Local development

```bash
npm install
npm run dev
```

UI: `http://localhost:5173`  
API: `http://localhost:4000`

## Docker

```bash
docker compose up --build -d
```

Open `http://localhost:4000`.

For EC2, set a strong `SESSION_SECRET` in `docker-compose.yml`, open port `4000` or place the app behind a TLS reverse proxy. If TLS terminates at a proxy, set `TRUST_PROXY=true` and `COOKIE_SECURE=true`.

## Commands

```bash
npm test
npm run build
docker compose logs -f
docker compose down
```
