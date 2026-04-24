# Nova Runtime Control

Experimental control plane for self-hosted Nova Studio runtimes on K3s.

This app is intentionally separate from `apps/nova-cloud` so we can test runtime orchestration without destabilizing the product app.

## Current Scope

- Runs as a small TypeScript HTTP service.
- Uses local `kubectl` through a narrow adapter.
- Creates a runtime namespace, PVC, Secret, ConfigMap, and Pod for a Studio id.
- Runs a token-protected runtime-agent HTTP server inside the Pod.
- Supports command execution plus workspace file read/write/list/delete through the runtime agent.
- Supports optional Alpine system packages per runtime through a persisted APK root and cache PVC.
- Uses `node:24-alpine` as the first runtime image; this proves the control path before building the full Nova tools image.

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
vp run nova-runtime-control#smoke:media
vp run nova-runtime-control#start
```

When testing from this workstation against the SSH-backed K3s host, pass the local kubectl wrapper explicitly:

```bash
vp run nova-runtime-control#smoke:media -- --kubectl "$PWD/.tmp/kubectl-ssh"
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
`NOVA_RUNTIME_AGENT_TOKEN` is passed to the per-Studio runtime-agent Pod and used by the control plane when calling the in-Pod agent.

## HTTP API

`GET /health`

Returns service status.

`GET /cluster/summary`

Returns `kubectl get nodes`, `kubectl get pods -A`, and `kubectl get storageclass`.

`POST /runtimes/:studioId`

Creates or reapplies the runtime namespace, runtime-agent ConfigMap, token Secret, workspace PVC, and runtime Pod.

Optional body:

```json
{
  "systemPackages": ["ffmpeg", "imagemagick"]
}
```

Requested packages are installed by an init container into a persisted `/apk-root` PVC and exposed to the runtime container through `PATH` and package-specific environment paths where needed.

`GET /runtimes/:studioId`

Returns Pod, PVC, and requested system package status for the Studio runtime namespace.

`DELETE /runtimes/:studioId`

Deletes the Studio runtime namespace. This deletes the local-path PVC too, so this is currently a destructive test cleanup endpoint.

`POST /runtimes/:studioId/exec`

Runs a shell command through the runtime agent.

Example body:

```json
{
  "command": "node --version && pwd",
  "cwd": ".",
  "timeoutMs": 10000
}
```

`POST /runtimes/:studioId/files/write`

Writes a UTF-8 file under `/workspace`.

`POST /runtimes/:studioId/files/read`

Reads a UTF-8 file under `/workspace`.

`POST /runtimes/:studioId/files/list`

Lists files under `/workspace`.

`POST /runtimes/:studioId/files/delete`

Deletes a file or directory under `/workspace`.

`POST /runtimes/:studioId/smoke`

Compatibility alias for `POST /runtimes/:studioId`.

`DELETE /runtimes/:studioId/smoke`

Compatibility alias for `DELETE /runtimes/:studioId`.

## Verified Behavior

Tested against the initial K3s host:

- control plane created a namespace, ConfigMap, Secret, PVC, and runtime Pod
- runtime Pod reached `Running`
- `/exec` returned `node --version`, `pwd`, and workspace listing
- `/files/write`, `/files/read`, and `/files/list` worked through the runtime-agent API
- deleting only the Pod and reapplying the runtime preserved `notes/hello.md` on the PVC
- `systemPackages: ["ffmpeg", "imagemagick"]` installed into the persisted APK root PVC
- `ffmpeg` generated a PNG frame from `testsrc`
- ImageMagick generated and identified a PNG file
- deleting only the Pod and reapplying the runtime preserved both installed packages and generated media files
- deleting the namespace cleaned up the test runtime

## Notes

- The first implementation uses `kubectl` for speed and debuggability.
- The production version can switch the adapter to the Kubernetes API directly.
- Full Nova runtime image, package policy/allowlists, preview routing, sleep-to-zero, background process management, and real agent execution are later phases.
- The control plane should get SSH-key-based deployment later; do not build password auth into the app.
