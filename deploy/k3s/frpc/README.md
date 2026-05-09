# Shared frpc Deployment

This is the first K3s-side `frpc` scaffold.

It is intentionally split into:

- `namespace.yaml`
- `configmap.yaml`
- `secret.example.yaml`
- `deployment.yaml`

## Intent

- keep `frpc` alive inside K3s across reboots
- let Nova manage workspace proxy state from the control plane later
- avoid tying the client process to a host-level systemd unit

## Apply Order

```bash
kubectl apply -f deploy/k3s/frpc/namespace.yaml
kubectl apply -f deploy/k3s/frpc/secret.example.yaml
kubectl apply -f deploy/k3s/frpc/configmap.yaml
kubectl apply -f deploy/k3s/frpc/deployment.yaml
```

Or use the bootstrap helper:

```bash
FRPS_SHARED_TOKEN=... ./deploy/k3s/bootstrap-frpc.sh
```

## Notes

- Replace `frps.dlx.studio` with the actual public frps endpoint if needed.
- Replace the token placeholder with the same shared token used by `frps`.
- The rendered config is just the bootstrap client connection. Proxy reconciliation is a later layer.
