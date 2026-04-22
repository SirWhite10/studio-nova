# Nova Runtime Control

Experimental control plane for self-hosted Nova Studio runtimes on K3s.

This app is intentionally separate from `apps/nova-cloud` so we can test runtime orchestration without destabilizing the product app.

## Current Scope

- Runs as a small TypeScript HTTP service.
- Uses local `kubectl` through a narrow adapter.
- Creates a smoke runtime namespace, PVC, and Pod for a Studio id.
- Does not yet run real Nova runtime images or agent workloads.

## Expected Deployment Shape

Run this service on the K3s host first, then move it inside the K3s cluster once the API is stable. It should not store SSH passwords or talk to a public Docker socket.

```txt
Nova Cloud
  -> nova-runtime-control
    -> local kubectl / K3s API
      -> per-Studio runtime Pods and PVCs
```

## Local Commands

```bash
vp run nova-runtime-control#check
vp run nova-runtime-control#smoke:render
vp run nova-runtime-control#start
```

## First K3s Host Target

Initial test host:

```txt
host: 192.168.1.2
os: Alpine Linux 3.22.3
k3s: v1.34.6+k3s1
runtime: containerd
storage: local-path
```

K3s was installed with bundled Traefik and ServiceLB disabled so it does not conflict with the existing Caddy container on ports `80` and `443`.

Before running the service on the host, verify:

```bash
kubectl get nodes -o wide
kubectl get pods -A
kubectl get storageclass
```

Expected single-node result:

```txt
localhost   Ready   control-plane
coredns, local-path-provisioner, metrics-server all Running
local-path storage class present
```

## Environment

Copy `.env.example` to `.env.local` when running the service manually. The service can also be configured with normal environment variables.

`NOVA_RUNTIME_CONTROL_TOKEN` is required for mutating endpoints.

## HTTP API

`GET /health`

Returns service status.

`GET /cluster/summary`

Returns `kubectl get nodes`, `kubectl get pods -A`, and `kubectl get storageclass`.

`POST /runtimes/:studioId/smoke`

Creates a throwaway namespace, PVC, and Pod that writes a marker file into the workspace volume.

`DELETE /runtimes/:studioId/smoke`

Deletes the throwaway smoke namespace.

## Notes

- The first implementation uses `kubectl` for speed and debuggability.
- The production version can switch the adapter to the Kubernetes API directly.
- Runtime images, preview routing, sleep-to-zero, and real agent execution are later phases.
- The control plane should get SSH-key-based deployment later; do not build password auth into the app.
