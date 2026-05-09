# Nova Deployment Assets

This directory holds the first production-shaped deployment pieces for Nova's K3s runtime and public frps edge.

Current layout:

- `k3s/nova-runtime-control-rbac.yaml`
  - minimal RBAC for running `nova-runtime-control` with a dedicated ServiceAccount
- `host/nova-runtime-control.kubeconfig.yaml`
  - kubeconfig template for the `nova` user on the host
- `host/nova-runtime-control.service`
  - systemd unit to run `nova-runtime-control` on reboot as the `nova` user
- `host/bootstrap-nova-runtime-control.sh`
  - generates the kubeconfig, writes the app env file, and installs the systemd unit
- `k3s/frpc/`
  - shared frpc deployment scaffold for the K3s side
- `k3s/caddy/`
  - internal Caddy deployment for wildcard workspace routing behind Cloudflare Tunnel
- `k3s/cloudflared/`
  - remotely-managed Cloudflare Tunnel deployment for `*.dlx.studio`
- `k3s/domain-control/`
  - k3s deployment for `nova-domain-control`
- `k3s/smoke-workspace/`
  - disposable HTTP echo backend for route smoke tests
- `k3s/edge-namespace.yaml`
  - shared namespace for the in-cluster edge components
- `k3s/bootstrap-frpc.sh`
  - applies the namespace, secret, configmap, and deployment for `frpc`
- `k3s/bootstrap-caddy.sh`
  - applies the namespace, configmap, service, and deployment for Caddy
- `k3s/bootstrap-cloudflared.sh`
  - installs the Cloudflare Tunnel secret and deployment
- `k3s/bootstrap-domain-control.sh`
  - installs the domain-control secret, service, and deployment
- `k3s/bootstrap-smoke-workspace.sh`
  - deploys a disposable echo backend used for wildcard edge smoke tests
- `bootstrap.sh`
  - runs the host and k3s bootstrap steps in sequence

The intended rollout is:

1. apply the `nova-runtime-control` RBAC to the cluster
2. bind the generated ServiceAccount token into the host kubeconfig
3. run `nova-runtime-control` under systemd
4. deploy `frpc` in k3s so it survives reboots with the cluster
