# Host Setup

This directory contains the host-side pieces for running `nova-runtime-control` under the `nova` user.

## Bootstrap Flow

Fast path:

```bash
FRPS_SHARED_TOKEN=... ./deploy/bootstrap.sh
```

That will:

- apply the cluster RBAC
- generate the ServiceAccount kubeconfig
- write `apps/nova-runtime-control/.env.local`
- install and start the `nova-runtime-control` systemd unit
- apply the shared `frpc` deployment into k3s

If you want to do it manually:

1. Apply the cluster RBAC:

```bash
kubectl apply -f deploy/k3s/nova-runtime-control-rbac.yaml
```

2. Create a bearer token for the ServiceAccount:

```bash
kubectl -n nova-runtime-control create token nova-runtime-control --duration=365d
```

If you prefer a longer-lived token for a dev host, generate it through your cluster admin workflow and paste it into the kubeconfig template. `kubectl create token` expects Go duration syntax, such as `8760h` for roughly one year.

3. Copy the cluster CA and token into `deploy/host/nova-runtime-control.kubeconfig.yaml`.

4. Place the rendered kubeconfig at `/home/nova/.kube/config` with `chmod 600`.

5. Install the systemd unit:

```bash
sudo cp deploy/host/nova-runtime-control.service /etc/systemd/system/nova-runtime-control.service
sudo systemctl daemon-reload
sudo systemctl enable --now nova-runtime-control
```

## Notes

- The service runs as `nova`, not root.
- `KUBECONFIG` must point at a kubeconfig that can authenticate as the ServiceAccount.
- The kubeconfig should talk to the k3s API endpoint, not the root-only `/etc/rancher/k3s/k3s.yaml` file.
- `FRPS_SHARED_TOKEN` is required for the k3s `frpc` bootstrap.
