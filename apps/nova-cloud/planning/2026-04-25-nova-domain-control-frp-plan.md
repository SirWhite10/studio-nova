# Nova Domain Control frp Plan

**Document Name:** `2026-04-25-nova-domain-control-frp-plan.md`
**Version:** 2.0
**Date:** April 25, 2026
**Last Updated:** 2026-04-28 02:20:00 UTC
**Scope:** `apps/nova-cloud`, `apps/nova-runtime-control`, `apps/nova-domain-control`, `apps/nova-frp`, public-edge frp deployment

## 1. Purpose

Plan a new Nova domain controller app under `apps` that owns public workspace domain routing for Nova Cloud runtimes.

The goal is to replace the current Cloudflared-dependent preview routing path with a Nova-controlled frp-based tunnel system backed by SurrealDB. SurrealDB is the source of truth for workspace proxy records, subdomains, custom domains, and the status values that decide whether `frps` can issue a certificate and route traffic.

This document now records the finalized direction: a custom standalone `frps` binary under `apps/nova-frp` should own public `80/443`, perform direct SurrealDB host authorization, issue/reuse ACME certificates, redirect HTTP to HTTPS, and route HTTPS traffic through outbound frpc tunnels to local/k3s workspaces.

## 2. Current Direction

Finalized runtime direction:

- `apps/nova-frp` vendors and customizes upstream `fatedier/frp`.
- custom `frps` is the production edge service.
- `frps` talks directly to SurrealDB through the SQL endpoint.
- `frps` uses SurrealDB `proxy_domain` + `workspace_proxy` rows as the certificate host policy.
- public HTTP is used only for ACME HTTP-01 and redirecting users to HTTPS.
- public HTTPS terminates in `frps`; workspace services can remain plain HTTP behind the encrypted frp tunnel.
- `frpc` runs near the runtime/workspace and exposes each workspace preview as an HTTP proxy with `customDomains` or `subdomain`.

`apps/nova-domain-control` remains useful as a local/admin API prototype and test harness, but it is no longer required on the public edge for the production edge path. The production deployment should be able to run with only:

- custom `frps`
- `frpc`
- SurrealDB reachable from the edge
- DNS records pointing workspace/custom domains at the edge

## 3. Source Notes

frp public docs reviewed:

- frp README and dynamic proxy Store notes: https://github.com/fatedier/frp
- server plugin callbacks: https://gofrp.org/en/docs/features/common/server-plugin/
- custom subdomains: https://gofrp.org/en/docs/features/http-https/subdomain/
- custom domains and HTTP/HTTPS vhost examples: https://gofrp.org/en/docs/examples/vhost-http/
- client dynamic reload behavior: https://gofrp.org/en/docs/features/common/client/

Important interpretation:

- frp Store is a local frpc dynamic configuration store, not a remote SurrealDB-backed store.
- SurrealDB should be Nova's desired-state database.
- frp HTTP routing can multiplex many workspace domains on one public HTTP port via Host headers.
- frp subdomains use `subDomainHost` plus each proxy's `subdomain`.
- frp custom domains use each proxy's `customDomains`.
- stock frp HTTPS proxying does not terminate TLS at frps. It routes HTTPS traffic to a local HTTPS service by SNI.
- Nova's custom `frps` terminates TLS itself with ACME/autocert and then routes the decrypted HTTP request through the existing HTTP vhost path.

## 4. Target Architecture

```txt
Internet users
  -> DNS-only workspace/custom domain A/CNAME
    -> public edge 80/443
      -> custom frps
        -> HTTP-01 ACME challenge handling on 80
        -> HTTP to HTTPS redirect for non-challenge traffic
        -> HTTPS termination and certificate cache
        -> direct SurrealDB host authorization
        -> HTTP vhost routing by Host header
        -> authenticated frpc tunnel control on 7000
  <- outbound frpc tunnel from local/k3s
    <- workspace runtime service / pod / temporary smoke workspace
```

Runtime ownership should stay split:

- `nova-cloud` owns product state, Studio UI, agent tools, and user-facing preview URLs.
- `nova-runtime-control` owns k3s runtime creation, pod/service lifecycle, and runtime agent access.
- SurrealDB owns domain/proxy desired state.
- custom `frps` owns tunnel transport, public TLS, ACME, host authorization, and vhost routing.
- `nova-domain-control` can remain as an admin/control API layer, but it is not required in the minimal edge runtime.

## 5. App Boundary

Create `apps/nova-domain-control`.

Initial shape:

- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `src/config.ts`
- `src/http.ts`
- `src/surreal.ts`
- `src/domain-store.ts`
- `src/frp-plugin.ts`
- `src/frpc-reconciler.ts`

The app should mirror `nova-runtime-control` rather than become a SvelteKit app.

Recommended scripts:

```json
{
  "dev": "node --experimental-strip-types --watch src/index.ts",
  "start": "node --experimental-strip-types src/index.ts",
  "check": "tsc --noEmit"
}
```

Root workspace note:

- root `package.json` currently includes `apps/nova-runtime-control`, `apps/website`, and `apps/surreal-test-old`, but not `apps/nova-cloud`.
- add `apps/nova-domain-control` explicitly when the app is created.
- decide separately whether to add `apps/nova-cloud` to the root workspace, since that is an existing repo structure issue and should not be bundled into the controller unless needed.

## 6. HTTP API

### Public Internal Health

```txt
GET /health
```

Returns service name, SurrealDB status, frpc reconciliation status, and current frp mode.

### Host Resolver

```txt
GET /resolve?host=ws-abc.dlx.studio
```

Returns the active proxy/domain row for a host.

This is useful for tests, admin tooling, and the future frps fork. Stock frp will not call this endpoint on every HTTP request unless we add custom integration.

### Admin Proxy API

```txt
POST /admin/proxies
PATCH /admin/proxies/:id
DELETE /admin/proxies/:id
POST /admin/proxies/:id/sync
```

All admin endpoints require a bearer token. They are called by `nova-cloud` or `nova-runtime-control`, not by browsers.

### Domain API

```txt
POST /admin/domains
POST /admin/domains/:host/verify
POST /admin/domains/:host/activate
DELETE /admin/domains/:host
```

Custom domain activation must require ownership verification before frp config is exposed.

### frp Server Plugin Handler

```txt
POST /frp/handler?version=0.1.0&op=Login
POST /frp/handler?version=0.1.0&op=NewProxy
POST /frp/handler?version=0.1.0&op=CloseProxy
POST /frp/handler?version=0.1.0&op=NewUserConn
POST /frp/handler?version=0.1.0&op=Ping
```

Initial behavior:

- `Login`: allow only known frpc clients or valid shared metadata token.
- `NewProxy`: allow only proxy names/domains/ports present and active in SurrealDB.
- `CloseProxy`: mark runtime tunnel state stale or disconnected.
- `NewUserConn`: optionally enforce domain status, workspace status, and rate limits.
- `Ping`: update client heartbeat metadata.

## 7. SurrealDB Schema

Use separate proxy and domain tables instead of relying only on an array field for custom domains.

```sql
DEFINE TABLE IF NOT EXISTS workspace_proxy SCHEMALESS;
DEFINE FIELD userId ON workspace_proxy TYPE string;
DEFINE FIELD studioId ON workspace_proxy TYPE string;
DEFINE FIELD runtimeId ON workspace_proxy TYPE option<string>;
DEFINE FIELD proxyName ON workspace_proxy TYPE string;
DEFINE FIELD proxyType ON workspace_proxy TYPE string;
DEFINE FIELD localIP ON workspace_proxy TYPE string DEFAULT "127.0.0.1";
DEFINE FIELD localPort ON workspace_proxy TYPE number;
DEFINE FIELD remotePort ON workspace_proxy TYPE option<number>;
DEFINE FIELD frpcClientId ON workspace_proxy TYPE option<string>;
DEFINE FIELD enabled ON workspace_proxy TYPE bool DEFAULT true;
DEFINE FIELD createdAt ON workspace_proxy TYPE number;
DEFINE FIELD updatedAt ON workspace_proxy TYPE number;
DEFINE INDEX idx_workspace_proxy_studio ON workspace_proxy FIELDS studioId;
DEFINE INDEX idx_workspace_proxy_name ON workspace_proxy FIELDS proxyName UNIQUE;

DEFINE TABLE IF NOT EXISTS proxy_domain SCHEMALESS;
DEFINE FIELD host ON proxy_domain TYPE string;
DEFINE FIELD proxyId ON proxy_domain TYPE string;
DEFINE FIELD kind ON proxy_domain TYPE string;
DEFINE FIELD status ON proxy_domain TYPE string;
DEFINE FIELD verificationToken ON proxy_domain TYPE option<string>;
DEFINE FIELD createdAt ON proxy_domain TYPE number;
DEFINE FIELD updatedAt ON proxy_domain TYPE number;
DEFINE INDEX idx_proxy_domain_host ON proxy_domain FIELDS host UNIQUE;
DEFINE INDEX idx_proxy_domain_proxy ON proxy_domain FIELDS proxyId;

DEFINE TABLE IF NOT EXISTS frp_client SCHEMALESS;
DEFINE FIELD clientId ON frp_client TYPE string;
DEFINE FIELD clusterId ON frp_client TYPE option<string>;
DEFINE FIELD status ON frp_client TYPE string;
DEFINE FIELD lastHeartbeatAt ON frp_client TYPE option<number>;
DEFINE FIELD metadata ON frp_client TYPE option<object>;
DEFINE INDEX idx_frp_client_client ON frp_client FIELDS clientId UNIQUE;
```

Domain row conventions:

- `kind = "subdomain"` for generated workspace domains.
- `kind = "custom"` for user-owned domains.
- `status = "pending"` before verification.
- `status = "verified"` after DNS/HTTP ownership proof.
- `status = "active"` only after the proxy is reconciled into frpc.
- `status = "blocked"` for reserved, abusive, or invalid hosts.

## 8. frp Configuration

Final standalone `frps.toml` shape:

```toml
bindPort = 7000
vhostHTTPPort = 80
vhostHTTPSPort = 443
subDomainHost = "dlx.studio"

[auth]
method = "token"
token = "<strong-shared-token>"

[novaDomainControl]
enable = true
acmeEmail = "admin@dlxstudios.com"
acmeCertDir = "/var/lib/frps-nova/acme"

[novaDomainControl.surreal]
url = "https://surrealdb.dlxstudios.com/rpc"
namespace = "main"
database = "main"
username = "<surreal-user>"
password = "<surreal-password>"
connectTimeoutMs = 5000
```

Smoke/test `frpc.toml` shape generated by `frps nova-smoke`:

```toml
serverAddr = "127.0.0.1"
serverPort = 7000
auth.method = "token"
auth.token = "<strong-shared-token>"
loginFailExit = true
transport.tls.enable = false

[[proxies]]
name = "nova-smoke-workspace"
type = "http"
localIP = "127.0.0.1"
localPort = "<temporary-workspace-port>"
customDomains = ["test.dlx.studio"]
```

Production frpc can run on the runtime host/k3s side and should publish HTTP proxies for workspace services. The public browser path remains HTTPS because `frps` terminates TLS before forwarding through the tunnel.

## 9. Cloudflared Transition

The early plan assumed the current local machine and Cloudflared would remain in the path during transition. The current direction is a public frps edge fronted by your owned domain, without hardwiring a VPS into the architecture.

Production DNS model:

- `*.dlx.studio` should point to the public edge that fronts `frps`.
- customer custom domains can point to that same public edge by A record or CNAME.
- `frps` must be reachable on public `80` and `443` for HTTP-01 and HTTPS.
- Cloudflare can still host DNS, and any tunnel layer must preserve public reachability for the `frps` HTTP-01 and HTTPS path.

Custom domain constraint:

- If users point arbitrary domains at this machine, public `80/443` or DNS-01 automation is needed for Nova-controlled certificates.
- the current custom `frps` implementation uses HTTP-01, so the hostname must resolve to the public edge before certificate issuance.

## 10. Runtime Integration

`nova-runtime-control` should eventually create a stable Kubernetes Service per runtime or expose a predictable local target for frpc.

Preferred first implementation:

- one shared frpc deployment per k3s cluster or node.
- runtime pods expose dev server ports through ClusterIP Services.
- `nova-domain-control` reconciles proxies that target those service DNS names and ports.

Per-workspace frpc sidecars remain an option, but they increase pod complexity and multiply tunnel clients. Start with shared frpc unless isolation requirements force sidecars.

When a Studio starts a primary preview:

1. agent calls the runtime dev start tool.
2. `nova-cloud` records `runtime_process` with command, port, and status.
3. `nova-cloud` or `nova-runtime-control` calls `nova-domain-control`.
4. `nova-domain-control` upserts `workspace_proxy` and `proxy_domain`.
5. reconciler applies the active proxy to frpc.
6. `runtime_process.previewUrl` is updated to the managed Nova domain.

## 11. Phased Implementation

### Phase 1: Domain Controller Skeleton

- create `apps/nova-domain-control`.
- add config/env loading.
- add SurrealDB connection helper.
- add `/health`.
- add schema ensure function for `workspace_proxy`, `proxy_domain`, and `frp_client`.
- add host normalization and validation helpers.
- add resolver tests for exact hosts and generated subdomains.

Exit criteria:

- app starts locally.
- `GET /health` works.
- schema ensure succeeds against local SurrealDB.
- `GET /resolve?host=...` returns expected rows.

### Phase 2: Stock frp Plugin Gate

- implement `/frp/handler`.
- validate `Login` by shared token/client metadata.
- validate `NewProxy` against active SurrealDB proxy/domain rows.
- record `CloseProxy` and `Ping` state.
- configure local stock `frps` to call the plugin.

Exit criteria:

- invalid proxy names/domains are rejected.
- valid generated subdomains are accepted.
- frp plugin behavior can be tested without forking frp.

### Phase 3: frpc Reconciliation

- choose shared frpc deployment as the first target.
- implement desired-state to frpc Store/API translation.
- support create/update/delete for HTTP proxies.
- keep reconciliation idempotent.
- record sync status and last error in SurrealDB metadata.

Exit criteria:

- creating a Surreal proxy row results in a live frpc HTTP proxy.
- deleting or disabling a row removes it from frpc.
- proxy updates do not require restarting runtime pods.

### Phase 4: Nova Cloud Preview Integration

- replace E2B preview URL generation for k3s runtimes with managed Nova domains.
- add a server helper in `nova-cloud` for domain-control API calls.
- update `runtime_process.previewUrl` after successful reconciliation.
- show the managed URL in existing Studio runtime UI.

Exit criteria:

- starting a dev server in a Studio yields a stable Nova preview URL.
- stopping the process marks the proxy stopped or disabled.
- existing UI continues to work with `runtime_process.previewUrl`.

### Phase 5: Custom Domain Verification

- add custom domain request records.
- generate DNS TXT verification tokens.
- optionally support HTTP verification once HTTP routing exists.
- require verification before `status = "active"`.
- block reserved and unsafe hostnames.

Exit criteria:

- a custom domain cannot activate before ownership proof.
- verified domains map to exactly one active proxy.
- duplicate domains are rejected by unique index and service validation.

### Phase 6: Native HTTPS Decision

Choose one:

- keep stock frp and terminate TLS with an outer proxy later.
- use Cloudflare custom hostname/SaaS certificates if the Cloudflare account model supports it.
- fork frps to terminate TLS, obtain certificates, and resolve hosts through an internal cache backed by SurrealDB.

Do not fork frp before phases 1-5 prove the product and runtime flow.

### Phase 7: TCP and UDP

- add port allocation table or fields.
- enforce frps `allowPorts`.
- support `proxyType = "tcp"` and `proxyType = "udp"` with `remotePort`.
- add quotas per user/workspace.
- keep domain routing limited to HTTP/S unless a protocol has a host/SNI equivalent.

Exit criteria:

- TCP/UDP proxies use allocated ports.
- port collisions are impossible.
- quotas prevent unlimited public port exposure.

## 11.a Finalized Implementation Tracker

Current implemented state:

- [x] Vendored upstream `fatedier/frp` into `apps/nova-frp`.
- [x] Added custom `novaDomainControl` config block to `frps`.
- [x] Added direct SurrealDB SQL host authorization in custom `frps`.
- [x] Added ACME/autocert certificate issuance inside `frps`.
- [x] Changed public HTTP behavior to ACME challenge handling plus HTTPS redirect.
- [x] Routed public HTTPS through the existing HTTP vhost path after TLS termination.
- [x] Added `frps nova-check --host <host>` to validate SurrealDB host authorization from the public edge.
- [x] Added `frps nova-smoke --host test.dlx.studio --frpc-binary ./frpc` for end-to-end edge testing.
- [x] Built an edge smoke bundle containing `frps` and `frpc`.
- [x] Kept `apps/nova-domain-control` as a local/admin API prototype and compatibility test harness.

Edge smoke command behavior:

1. Load `/etc/frp/frps.toml`.
2. Connect directly to SurrealDB from the config.
3. Start a temporary single-page workspace HTTP server.
4. Reuse an already-running `frps` on the configured `bindPort`, or start `frps` if it is not already running.
5. Start `frpc` against the local `frps` control port.
6. Create or update `workspace_proxy` and `proxy_domain` records for the smoke host.
7. Poll until the host is active and authorized by SurrealDB.
8. Request `http://<host>/` and require a redirect to HTTPS.
9. Request `https://<host>/` and require the workspace response.
10. Leave records in SurrealDB by default; delete them only when `--cleanup` is passed.

Required edge preconditions:

- `test.dlx.studio` resolves publicly to the chosen edge.
- The edge firewall permits `80`, `443`, and the frp control port.
- no other process owns `80` or `443` when `frps` starts.
- SurrealDB is reachable from the VPS.
- `proxy_domain.host` and `workspace_proxy.proxyName` are unique and usable by the smoke records.

Remaining production work:

- [ ] Add a Nova Cloud API path that creates/updates `workspace_proxy` and `proxy_domain` for real runtimes.
- [ ] Add user custom-domain ownership verification before setting `status = "active"`.
- [ ] Add rate limits/quotas for domain and proxy creation.
- [ ] Add persistent frpc deployment on the runtime/k3s side.
- [ ] Add TCP/UDP allocation and quota support.
- [ ] Add operational docs for systemd, firewall, DNS, ACME cache backups, and rollback.

## 12. Security Rules

- require bearer auth for all admin endpoints.
- never trust hostnames from users without normalization and validation.
- reject domains under the configured `subDomainHost` when submitted as custom domains.
- reserve platform hosts and common admin names.
- require domain ownership verification for custom domains.
- use strong frp token auth.
- consider `auth.additionalScopes = ["HeartBeats"]`.
- limit frps control port exposure to known k3s/VPN egress where possible.
- log proxy changes with userId, studioId, host, proxyName, and actor.
- rate-limit proxy creation and domain verification.

## 13. Open Questions

- What is the production base domain for generated workspace subdomains?
- Will this machine eventually accept direct public `80/443`, or will Cloudflared remain permanently?
- Should the first k3s integration use shared frpc or per-workspace sidecars?
- Where should frpc run: on the k3s node, inside the cluster, or on a separate bridge host?
- Should custom domain certificates be solved by DNS-01 first, HTTP-01 first, or delayed until the frps fork?
- Does Nova need custom domains for all users, only paid plans, or only admin-created workspaces at first?

## 14. Implementation Notes

Use Vite+ commands for workspace operations:

- `vp install` after dependency/workspace changes.
- `vp check` after TypeScript changes.
- `vp test` if tests are added.

Do not install Vitest directly. If tests are added, import test utilities from `vite-plus/test`.

Final implementation status:

- custom `frps` fork exists in `apps/nova-frp`.
- public browser route is HTTPS-first.
- HTTP is only for ACME and redirect.
- SurrealDB is read directly by `frps`.
- `nova-domain-control` is not required for the minimal edge runtime, though it remains in the repo for local/admin API work.
