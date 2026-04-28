# Nova Domain Control

Small HTTP control-plane service for Nova workspace preview domains and frp plugin decisions.

Initial scope:

- `GET /health`
- `GET /resolve?host=<hostname>`
- `POST /admin/proxies`
- `PATCH /admin/proxies/:id`
- `DELETE /admin/proxies/:id`
- `POST /frp/handler?op=Login|NewProxy|CloseProxy|Ping|NewUserConn`

Run locally:

```bash
vp run nova-domain-control#dev
```

Build the production Docker image:

```bash
docker build -f apps/nova-domain-control/Dockerfile -t nova-domain-control:latest apps/nova-domain-control
```

Run the image:

```bash
docker run --rm \
  -p 8787:8787 \
  -e SURREALDB_URL=https://surrealdb.dlxstudios.com/rpc \
  -e SURREALDB_USERNAME=root \
  -e SURREALDB_PASSWORD=root \
  -e SURREALDB_NAMESPACE=nova \
  -e SURREALDB_DATABASE=nova \
  -e NOVA_DOMAIN_CONTROL_HOST=0.0.0.0 \
  -e NOVA_DOMAIN_CONTROL_PORT=8787 \
  -e NOVA_DOMAIN_CONTROL_TOKEN=test-admin-token \
  -e NOVA_DOMAIN_CONTROL_FRP_TOKEN=test-frp-token \
  -e NOVA_DOMAIN_CONTROL_SUBDOMAIN_HOST=workspaces.dlxstudios.com \
  nova-domain-control:latest
```
