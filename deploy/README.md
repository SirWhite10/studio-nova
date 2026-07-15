# Constellation Deployment Operations

The Constellation installation has three infrastructure roles:

- **Forge** builds immutable Releases from Workbench source.
- **Habitat** runs private Workbenches and published Deployment instances.
- **Horizon** terminates public HTTP/TLS and forwards authorized routes through the native tunnel.

The logical resource chain is:

```text
Studio -> Workbench -> Build Job -> Release -> Deployment -> Runtime Instance
                                                        -> Deployment Route -> Domain Binding
Habitat -> Tunnel Connector -> Horizon
```

SurrealDB is the authoritative control-plane store. Schema changes are applied by the repository
database tooling, never during a page request or service startup.

## Network Contract

| Port       | Owner     | Exposure                           | Purpose                        |
| ---------- | --------- | ---------------------------------- | ------------------------------ |
| `80/tcp`   | Horizon   | Public                             | HTTP redirect and ACME HTTP-01 |
| `443/tcp`  | Horizon   | Public                             | User-facing HTTPS              |
| `8790/tcp` | Horizon   | Loopback/private only              | Authenticated edge control API |
| `9443/tcp` | Horizon   | Habitat nodes only                 | Native `nova-yamux-v1` tunnel  |
| `8787/tcp` | Habitat   | Private only                       | Runtime-control API            |
| `8000/tcp` | SurrealDB | Private or authenticated TLS proxy | SurrealDB RPC/HTTP             |

Keep `NOVA_EDGE_API_BIND=127.0.0.1`. Do not expose port `8790` directly to the Internet. If Nova
Cloud cannot reach Horizon over a private network, put an authenticated TLS reverse proxy in front
of the loopback listener and allowlist only the Nova Cloud source. Port `9443` is raw TCP, not an
HTTP Cloudflare Tunnel service; allow it only from known Habitat egress addresses or use a TCP-aware
private network.

## Control Credentials

Use independent, randomly generated values for each boundary:

- `NOVA_CONSTELLATION_CONTROL_TOKEN`: bearer token accepted by Nova Cloud's internal node APIs.
- `NOVA_RUNTIME_CONTROL_TOKEN`: bearer token accepted by Habitat runtime control.
- `NOVA_EDGE_CONTROL_TOKEN`: least-privilege Horizon route-control token used by Nova Cloud.
- `NOVA_EDGE_ADMIN_TOKEN`: Horizon administrative token; reserve for operators.
- `NOVA_EDGE_TUNNEL_TOKEN`: shared bootstrap credential for native tunnel registration.
- SurrealDB credentials: use scoped service users where supported; never place root credentials in
  browser code, build source, artifacts, agent context, or logs.

Pass tokens through service environment files or a secret manager. Do not place token values in
node metadata. Rotate one boundary at a time and restart both sides that share it.

## Register Nodes

Configure Nova Cloud with `NOVA_CONSTELLATION_CONTROL_TOKEN`, then register each role through the
internal API. Registration is idempotent for a `(Constellation, nodeKey)` pair. A node's role is
immutable; retire and create a new key instead of changing it.

```bash
export NOVA_CLOUD_URL=https://nova.dlxstudios.com
export NOVA_CONSTELLATION_CONTROL_TOKEN='<control-token>'

curl --fail-with-body --request POST \
  --header "Authorization: Bearer ${NOVA_CONSTELLATION_CONTROL_TOKEN}" \
  --header "Content-Type: application/json" \
  --header "X-Nova-Actor-Id: operator-bootstrap" \
  --data '{
    "constellationName": "DLX Studios",
    "nodeKey": "forge-builder-01",
    "role": "forge",
    "displayName": "Builder Forge",
    "hostname": "builder.internal",
    "capabilities": {
      "operatingSystems": ["linux"],
      "architectures": ["x86_64"],
      "toolchains": ["bun", "rust", "flutter"],
      "runtimes": ["docker"],
      "features": ["package:web-bundle", "target:web", "target:pwa", "target:android"]
    }
  }' \
  "${NOVA_CLOUD_URL}/api/internal/constellations/dlx-production/nodes/register"
```

Repeat with stable keys for `horizon` and `habitat`. Habitat should advertise `k3s`, `containerd`,
persistent-volume, and architecture capabilities. Horizon should advertise the native tunnel and
TLS capabilities. Save each returned `node._id`; services use those IDs for identity.

## Heartbeats And Reconciliation

Each node sends a heartbeat at least once per minute. The default stale threshold is two minutes.

```bash
curl --fail-with-body --request POST \
  --header "Authorization: Bearer ${NOVA_CONSTELLATION_CONTROL_TOKEN}" \
  --header "Content-Type: application/json" \
  --header "X-Nova-Actor-Id: habitat-primary" \
  --data '{"status":"online"}' \
  "${NOVA_CLOUD_URL}/api/internal/nodes/<infrastructure-node-id>/heartbeat"
```

Invoke reconciliation from one trusted scheduler. It is deliberately not run on page hits.

```bash
curl --fail-with-body --request POST \
  --header "Authorization: Bearer ${NOVA_CONSTELLATION_CONTROL_TOKEN}" \
  --header "Content-Type: application/json" \
  --header "X-Nova-Actor-Id: infrastructure-reconciler" \
  --data '{}' \
  "${NOVA_CLOUD_URL}/api/internal/nodes/reconcile"
```

When a heartbeat expires, the node becomes offline and related jobs, runtimes, connectors, and
routes become failed, unhealthy, offline, or degraded. Records are retained for recovery and audit.
Re-registering restores node availability but does not silently reactivate workloads. Reconcile or
redeploy the workload, pass its health gate, reconnect the tunnel, and then reactivate its route.

## Role Environment

Forge registration requires a stable node key and a capability inventory matching installed host
toolchains. Build workers consume only jobs whose target requirements are a subset of those
capabilities.

### Build Runner Matrix

| Target           | Required host    | Required toolchain                             | Packaging/signing boundary                                                |
| ---------------- | ---------------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| Static web / PWA | Linux `x86_64`   | Node.js 24 and project package manager         | Web bundle packaging; no signing key                                      |
| Android Flutter  | Linux `x86_64`   | Flutter, JDK, Android SDK/build-tools          | Android package capability and brokered keystore reference                |
| iOS Flutter      | macOS `arm64`    | Flutter, Xcode, CocoaPods                      | Apple packaging plus brokered distribution certificate/profile references |
| macOS Flutter    | macOS `arm64`    | Flutter and Xcode                              | Apple packaging, code signing, and notarization references                |
| Windows Flutter  | Windows `x86_64` | Flutter and Visual Studio Desktop C++ workload | MSIX/ZIP packaging plus brokered code-signing reference                   |
| Linux Flutter    | Linux `x86_64`   | Flutter and desktop build dependencies         | AppImage/tar packaging                                                    |
| Node server      | Linux `x86_64`   | Node.js 24 and containerd/OCI builder          | OCI image and provenance output                                           |
| Node worker      | Linux `x86_64`   | Node.js 24 and worker bundler                  | Worker bundle and provenance output                                       |

Apple targets must run on a registered macOS host with a supported Xcode installation. Windows
targets must run on a registered Windows host with Visual Studio's Desktop development with C++
workload and signing tools. A Linux container must never advertise Apple or Windows native
capabilities. Android can run on Linux, but the runner must advertise all Android SDK, packaging,
and signing capability tokens before it receives a signed job.

Register native runners as additional `forge` nodes. Use capability tokens exactly as target
profiles declare them, for example:

```json
{
  "operatingSystems": ["macos"],
  "architectures": ["arm64"],
  "toolchains": ["flutter", "xcode"],
  "runtimes": [],
  "features": ["package:apple", "signing:apple", "target:ios", "target:macos"]
}
```

`signing:*` means the runner has an authorized secret-broker injection path; it does not mean the
certificate or key belongs in node metadata. Build Jobs persist only `secret://...` references.
Resolve those references immediately before the authorized build step, mount material into an
ephemeral file or environment boundary, suppress command echo, and destroy the material when the
step ends. Never place resolved values in Workbench source, agent prompts, Build Job metadata, logs,
Release manifests, artifact metadata, or API responses.

On every heartbeat, report the capabilities currently installed rather than the intended host
configuration. Removing Xcode, an SDK, a packaging tool, or the secret-broker path must remove its
token at the next heartbeat; queued jobs will remain queued with a deterministic missing-capability
explanation.

Habitat runtime control requires:

```text
NOVA_CONSTELLATION_KEY=dlx-production
NOVA_HABITAT_NODE_ID=<infrastructure-node-id>
NOVA_RUNTIME_CONTROL_TOKEN=<runtime-token>
NOVA_RUNTIME_CONTROL_HOST=127.0.0.1
NOVA_RUNTIME_CONTROL_PORT=8787
```

The Habitat tunnel client requires:

```text
NOVA_EDGE_TUNNEL_SERVER=ss.dlxstudios.com:9443
NOVA_EDGE_TUNNEL_TOKEN=<tunnel-token>
NOVA_EDGE_TUNNEL_PROXY=<registered-service-key>
NOVA_EDGE_TUNNEL_LOCAL_ADDR=<private-service-host:port>
NOVA_EDGE_CONSTELLATION_ID=<constellation-record-id>
NOVA_EDGE_HABITAT_NODE_ID=<infrastructure-node-id>
NOVA_EDGE_CONNECTOR_KEY=<stable-connector-key>
```

Horizon requires the variables documented in `apps/nova-edge/.env.example`, including:

```text
NOVA_EDGE_API_BIND=127.0.0.1
NOVA_EDGE_API_PORT=8790
NOVA_EDGE_TUNNEL_PORT=9443
NOVA_EDGE_HORIZON_NODE_ID=<infrastructure-node-id>
NOVA_EDGE_CONTROL_TOKEN=<route-control-token>
```

## Health And Recovery Order

1. Start SurrealDB and verify the required schema version.
2. Start Nova Cloud and check `/api/surreal/health`.
3. Start Habitat K3s and runtime control; verify its `/health` response.
4. Start Horizon; verify local `http://127.0.0.1:8790/health` with the required credential.
5. Register or re-register Forge, Horizon, and Habitat and start one-minute heartbeats.
6. Start the Habitat native tunnel client and verify the connector is online.
7. Reconcile Workbench/Deployment runtimes before activating public routes.

Health responses report schema, node, tunnel, runtime, and route readiness separately. A service can
be alive while the full Constellation is not ready; inspect the failed check instead of restarting
unrelated roles.

## Deployment Assets

Existing assets remain available during the additive migration:

- `host/`: runtime-control kubeconfig, systemd, and bootstrap templates.
- `k3s/workbenches/`: Workbench namespace, RBAC, storage, network, and resource controls.
- `k3s/deployments/`: immutable Deployment namespace, RBAC, and network controls.
- `k3s/frpc/`: legacy FRP compatibility scaffold.
- `k3s/caddy/` and `k3s/cloudflared/`: legacy wildcard routing compatibility.
- `k3s/domain-control/`: legacy domain-control deployment.
- `k3s/smoke-workspace/`: disposable HTTP route fixture.

Legacy records and services are not removed by the Constellation expand rollout. Cutover and later
contract cleanup require separate, explicitly approved operations.
