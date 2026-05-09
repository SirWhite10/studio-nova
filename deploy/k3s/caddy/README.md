# Caddy Edge

This deploys the internal HTTP edge for Nova-managed hosts.

Current role:

- accept HTTP traffic from `cloudflared`
- expose the Caddy admin API inside the cluster
- receive dynamic host routes from `nova-domain-control`

It does not manage public TLS. Cloudflare handles browser-facing TLS for `*.dlx.studio`.
