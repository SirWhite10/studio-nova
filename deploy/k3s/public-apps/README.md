# Nova public apps on k3s

This deploy set puts the three outward-facing Nova surfaces on host-reachable ports in the `10000` range:

- `10001` → landing page (`apps/website`)
- `10002` → canvas package host (`packages/canvas`)
- `10003` → Nova Cloud app (`apps/nova-cloud`)

## Design

- Uses the existing repo checkout via `hostPath: /home/nova/studio-nova`
- Reuses host-built artifacts instead of introducing a registry/build pipeline first
- Keeps `nova-runtime-control` on the host under systemd
- Runs `nova-cloud` with `hostNetwork: true` so its default `http://127.0.0.1:8787` runtime-control URL still works from inside the pod
- Publishes all three apps on host-facing ports so Cloudflare Tunnel dashboard mappings can point directly at them

## Files

- `services.yaml` — ClusterIP services for internal discovery
- `website-deployment.yaml` — landing page on port 10001
- `canvas-deployment.yaml` — canvas host on port 10002
- `nova-cloud-deployment.yaml` — Nova Cloud on port 10003
- `nova-cloud-web-env.example.yaml` — example secret for production app env
- `bootstrap-public-apps.sh` — builds the apps, refreshes the env secret from `.env.local`, and applies manifests

## Deploy

```bash
cd /home/nova/studio-nova
./deploy/k3s/public-apps/bootstrap-public-apps.sh
```

## Cloudflare tunnel targets

Point the tunnel hostnames at:

- `http://HOST_IP:10001` — landing page
- `http://HOST_IP:10002` — canvas host
- `http://HOST_IP:10003` — Nova Cloud app

If your tunnel runs inside k3s and you prefer service DNS instead of host ports, you can also target:

- `http://nova-website.nova-cloud.svc.cluster.local:10001`
- `http://nova-canvas.nova-cloud.svc.cluster.local:10002`
- `http://nova-cloud-web.nova-cloud.svc.cluster.local:10003`
