# Cloudflared

This runs a remotely-managed Cloudflare Tunnel inside k3s.

The tunnel token comes from the Cloudflare dashboard and is stored in the
`cloudflared-tunnel` secret.

Recommended dashboard-published hostnames:

- `*.dlx.studio` -> `http://caddy.nova-edge.svc.cluster.local:80`
- `app.dlx.studio` -> `http://<nova-cloud-service>.<namespace>.svc.cluster.local:<port>`

Do not publish the FRP control port through Cloudflare Tunnel. Keep `frps:7000`
cluster-internal unless you later deploy a separate public edge for custom domains.
