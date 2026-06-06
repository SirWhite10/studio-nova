# Nova Edge — Unified Rust Edge Service

## Spec ID

`005-nova-edge`

## Status

**Implementation in progress** — core Rust service is deployed on the VPS. SurrealDB live-cache connectivity is working. Production ACME certificate automation remains explicit remaining work; the current VPS smoke fix uses generated self-signed fallback certs for active hosts only and must not be treated as the final TLS implementation.

## Problem Statement

Nova Studio's custom domain routing requires a single unified edge service on the public VPS that handles TLS termination, tunneling, domain management, and analytics. The Go+xcaddy POC proved the architecture works but Rust is the better long-term fit for a unified binary that includes FFI integration, DNS capabilities (future), and high-performance analytics.

## Solution

**Nova Edge** — a single Rust binary that runs on the public VPS:

- **TLS termination** with automatic Let's Encrypt certificates (rustls + rustls-acme)
- **ACME HTTP-01 challenge handling** on port 80 before HTTPS redirects
- **On-demand TLS** backed by SurrealDB live queries (instant cache invalidation)
- **FRP-compatible tunnel server** rewritten in Rust (protocol-compatible with existing frpc)
- **Admin API** for domain registration, verification, proxy management
- **Request middleware pipeline** (headers, compression, rate limiting, caching, bot challenge)
- **ClickHouse analytics** for request logging and tunnel metrics
- **Webhook alerts** for domain events, cert events, tunnel events
- **Multi-VPS support** via shared SurrealDB state
- **Backend health awareness** with circuit breaker
- **OpenTelemetry traces** for distributed observability

Single binary. Single process. Configured via SurrealDB + env vars. No config files.

## Architecture

```
                          ┌────────────────────────────────────────────────────┐
                          │              Nova Edge (Rust Binary)               │
                          │                                                    │
                          │  ┌──────────────────────────────────────────────┐  │
  Internet ──:53────────▶│  │  DNS Server (Phase 2, separate plan)          │  │
  (future)                 │  │  hickory-dns — authoritative + recursive     │  │
                          │  └──────────────────────────────────────────────┘  │
                          │                                                    │
                          │  ┌──────────────────────────────────────────────┐  │
  Internet ──:80/:443────▶│  │  HTTPS Edge (axum + rustls)                   │  │
                          │  │  ├── TLS termination (auto Let's Encrypt)     │  │
                          │  │  ├── On-demand TLS (SurrealDB live cache)     │  │
                          │  │  ├── Request middleware pipeline:             │  │
                          │  │  │   ├── X-Forwarded-* headers               │  │
                          │  │  │   ├── Rate limiting (per-host)            │  │
                          │  │  │   ├── Bot challenge (JS gate)             │  │
                          │  │  │   ├── Response caching (static content)   │  │
                          │  │  │   └── Compression (brotli/gzip)           │  │
                          │  │  └── Reverse proxy → tunnel → frpc            │  │
                          │  └──────────────────────────────────────────────┘  │
                          │                                                    │
                          │  ┌──────────────────────────────────────────────┐  │
  Nova Cloud ──:8790─────▶│  │  Admin API (axum, port 8790)                  │  │
                          │  │  ├── /admin/domains/* (CRUD + verify)         │  │
                          │  │  ├── /admin/proxies/* (CRUD + sync)           │  │
                          │  │  ├── /admin/studios/* (list domains)          │  │
                          │  │  ├── /health, /resolve                        │  │
                          │  │  └── /frp/handler (tunnel auth)               │  │
                          │  └──────────────────────────────────────────────┘  │
                          │                                                    │
                          │  ┌──────────────────────────────────────────────┐  │
  frpc ──:9443───────────▶│  │  Tunnel Server (tokio + yamux)                │  │
  (local K8s)              │  │  ├── FRP protocol-compatible (v1)            │  │
                          │  │  ├── Client auth (per-client credentials)    │  │
                          │  │  ├── Proxy registration                      │  │
                          │  │  ├── Health checking + circuit breaker        │  │
                          │  │  └── Multi-connection load balancing          │  │
                          │  └──────────────────────────────────────────────┘  │
                          │                                                    │
                          │  ┌──────────────────────────────────────────────┐  │
                          │  │  Shared State                                 │  │
                          │  │  ├── SurrealDB (live queries → in-mem cache) │  │
                          │  │  ├── ClickHouse client (analytics sidecar)   │  │
                          │  │  ├── OpenTelemetry (traces + metrics)        │  │
                          │  │  ├── Webhook dispatcher (event alerts)       │  │
                          │  │  └── Cert store (disk + SurrealDB)           │  │
                          │  └──────────────────────────────────────────────┘  │
                          └────────────────────────────────────────────────────┘
```

## Data Flow

### Request lifecycle

```
1. Browser → https://10.cloud:443
2. TLS handshake: SNI=10.cloud
3. rustls-acme: "Do I have a cert for this host?"
   a. No → Ask SurrealDB (via live-updated cache): "Is 10.cloud active?"
   b. Yes → Obtain cert via ACME, cache to disk, serve
4. TLS established, axum receives HTTP request
5. Middleware pipeline:
   a. Rate limit check (per-host, in-memory counter)
   b. Bot challenge check (if enabled for this host)
   c. X-Forwarded-For, X-Forwarded-Proto, X-Studio-Id headers added
   d. Response cache check (static content hash lookup)
6. Host → cache lookup → ProxyResolution (proxy_id, tunnel_client, backend_addr)
7. Backend health check (circuit breaker): is this tunnel alive?
   a. Healthy → forward
   b. Unhealthy → return 503 + webhook alert
8. Request forwarded through yamux stream to frpc tunnel client
9. frpc → local backend → response
10. Response middleware:
    a. Compression (brotli/gzip) if client accepts
    b. Cache storage (if cacheable)
11. Response → browser
12. Log to ClickHouse (host, status, latency, tunnel_id, timestamp)
13. OpenTelemetry span closed
```

### Domain registration flow

```
1. Nova Cloud → POST /admin/proxies { studioId, proxyName, customDomains: ["10.cloud"] }
2. Admin API:
   a. Check studio quota (max domains for plan)
   b. Validate host (normalize, check reserved)
   c. Write workspace_proxy to SurrealDB
   d. Write proxy_domain (status: "pending") to SurrealDB
   e. Generate verification token
3. SurrealDB live query fires → cache updated automatically
4. Nova Cloud shows user: "Add TXT record _nova-domain.10.cloud = nova-domain=<token>"
5. User → POST /admin/domains/verify { host: "10.cloud" }
6. Admin API:
   a. DNS TXT lookup via hickory-resolver
   b. Token matches → set status: "active" in SurrealDB
   c. Live query fires → cache updated → next TLS handshake for 10.cloud will be allowed
   d. Webhook: "domain.activated" → Nova Cloud
7. On first request to 10.cloud → cert auto-provisioned
8. Webhook: "cert.obtained" → Nova Cloud
```

### Tunnel connection flow

```
1. frpc connects to nova-edge:9443 (TCP + TLS)
2. Sends Login message (client_id, token)
3. Tunnel server:
   a. Validate client credentials against SurrealDB
   b. Register client in tunnel registry
   c. Start heartbeat monitor
4. frpc sends NewProxy messages (name, type, local_ip, local_port)
5. Tunnel server:
   a. Validate proxy exists in SurrealDB (is it registered?)
   b. Validate studio ownership
   c. Add to tunnel routing table
6. frpc sends Heartbeat messages (keep-alive)
7. If heartbeat times out → circuit breaker trips → webhook: "tunnel.disconnected"
8. On reconnect → circuit breaker resets → webhook: "tunnel.connected"
```


## Production ACME Certificate Requirements

ACME is part of the remaining Nova Edge spec and is required before calling public TLS production-ready. The temporary self-signed fallback used during VPS smoke testing is allowed only for development/staging diagnostics.

### ACME flow

```
1. Browser connects to https://<active-host> with SNI.
2. Host policy checks LiveCache: host must be active and proxy enabled.
3. If a non-expired cert exists in CertStorage, serve it.
4. If no cert exists, request/obtain a Let's Encrypt certificate via ACME HTTP-01.
5. ACME solver publishes token response under /.well-known/acme-challenge/<token> on port 80.
6. Port 80 router must serve ACME challenge paths before applying HTTP→HTTPS redirects.
7. Store cert/key/account metadata on disk and write cert status metadata to SurrealDB.
8. Emit webhook event: cert.obtained or cert.failed.
9. Renew automatically when cert has <= 30 days remaining; emit cert.renewed.
```

### Environment/config

- `NOVA_EDGE_TLS_EMAIL` is required in production.
- `NOVA_EDGE_ACME_DIRECTORY` defaults to Let's Encrypt production; staging can be selected for tests.
- `NOVA_EDGE_ACME_CACHE_DIR` defaults to `${NOVA_EDGE_TLS_CACHE_DIR}/acme`.
- `NOVA_EDGE_TLS_SELF_SIGNED_FALLBACK=false` in production. If enabled, fallback certs are generated only after ACME failure and logs/webhooks must mark the host as degraded.

### Safety rules

- Never request certificates for inactive, pending, blocked, disabled, or unknown hosts.
- Never issue certs for raw IP SNI or malformed hostnames.
- Never let the catch-all redirect handler consume `/.well-known/acme-challenge/*`.
- Rate-limit certificate attempts per host to avoid Let's Encrypt failed-validation limits.
- Multi-VPS deployments must either share cert state or use a SurrealDB-backed cert lock so two instances do not stampede ACME for the same host.

## SurrealDB Live Queries — The Key Pattern

Nova Edge maintains an in-memory cache of all active domains and proxies, kept fresh by SurrealDB live queries:

```rust
// On startup: load all active domains into memory
let cache = Arc::new(DashMap::new());

// Subscribe to live queries — updates are pushed instantly
let stream = db.select("proxy_domain").live().await?;
tokio::spawn(async move {
    while let Some(event) = stream.next().await {
        match event {
            Create(data) | Update(data) => cache.insert(data.host, data.into()),
            Delete(id) => cache.remove(&id),
        }
    }
});
```

This means:

- Every request reads from memory — sub-microsecond lookup
- Changes propagate instantly — no TTL, no staleness, no sync button
- No separate "hot reload" feature needed — it's architectural

## Multi-VPS Support

Multiple nova-edge instances share SurrealDB state:

```
VPS 1 (nova-edge) ──┐
                     ├── SurrealDB (shared) ── live queries to each instance
VPS 2 (nova-edge) ──┤
                     └── ClickHouse (replicated)
```

- DNS round-robin or anycast routes traffic to nearest VPS
- Each instance runs the same code, reads the same SurrealDB
- Live queries keep all caches in sync
- Cert state stored in SurrealDB + shared disk (S3/GCS) or each VPS obtains its own cert
- ClickHouse replicated for analytics

## Feature Summary

### Phase 1: Core (TLS + Admin API + Tunnel)

| Feature                 | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| TLS termination         | rustls + rustls-acme, automatic Let's Encrypt         |
| On-demand TLS           | Certs provisioned on first request for active domains |
| Admin API               | Full CRUD for domains, proxies, studios               |
| TXT domain verification | DNS TXT lookup + token matching                       |
| FRP tunnel server       | Protocol-compatible, rewritten in Rust                |
| SurrealDB live cache    | Zero-staleness in-memory cache via live queries       |
| Multi-tenant scoping    | Studio ownership on every operation                   |
| Per-client tunnel auth  | Each frpc has own credentials                         |
| X-Forwarded headers     | X-Forwarded-For, Proto, Host, Studio-Id               |

### Phase 1: Security + Reliability

| Feature                  | Description                                |
| ------------------------ | ------------------------------------------ |
| Per-host rate limiting   | Token bucket, configurable per domain      |
| Circuit breaker          | Auto-trip on unhealthy tunnels, auto-reset |
| Backend health checks    | Periodic probing of tunnel backends        |
| Request body size limits | Per-proxy, configurable                    |

### Phase 1: Observability

| Feature              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| ClickHouse logging   | Every request logged (host, status, latency, tunnel) |
| OpenTelemetry traces | Distributed tracing through the full pipeline        |
| Webhook alerts       | Domain events, cert events, tunnel events            |
| Structured logging   | tracing crate, JSON output                           |

### Phase 1: Performance

| Feature            | Description                                     |
| ------------------ | ----------------------------------------------- |
| Response caching   | Static content cached at edge, configurable TTL |
| Compression        | Brotli/gzip on tunnel responses                 |
| Connection pooling | SurrealDB + ClickHouse connection reuse         |

### Phase 1: Protection

| Feature             | Description                                    |
| ------------------- | ---------------------------------------------- |
| Bot challenge       | JS challenge gate for domains under attack     |
| Automatic abuse ban | ClickHouse pattern detection → temporary block |

### Phase 2: DNS Server (separate plan)

| Feature           | Description                              |
| ----------------- | ---------------------------------------- |
| Authoritative DNS | Serve A/CNAME/TXT for Nova domains       |
| ACME DNS-01       | DNS challenge support for wildcard certs |
| DNS analytics     | Query logging to ClickHouse              |

## Project Structure

```
apps/nova-edge/
├── Cargo.toml                    # Workspace root
├── Cargo.lock
├── .env.example
├── AGENTS.md
├── Makefile
├── Dockerfile
├── deploy/
│   ├── nova-edge.service          # Systemd unit
│   ├── install.sh                 # VPS installer
│   └── docker-compose.yml
│
├── crates/
│   ├── nova-edge/                 # Main binary crate
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs            # Entry point
│   │       ├── app.rs             # App bootstrap (load config, start services)
│   │       └── shutdown.rs        # Graceful shutdown
│   │
│   ├── edge-api/                  # Admin API (axum routes)
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── server.rs          # Axum router setup
│   │       ├── handlers/
│   │       │   ├── mod.rs
│   │       │   ├── domains.rs     # /admin/domains/*
│   │       │   ├── proxies.rs     # /admin/proxies/*
│   │       │   ├── studios.rs     # /admin/studios/*
│   │       │   ├── health.rs      # /health, /resolve
│   │       │   └── frp.rs         # /frp/handler
│   │       ├── middleware/
│   │       │   ├── mod.rs
│   │       │   ├── auth.rs        # Bearer token + tunnel auth
│   │       │   └── tenant.rs      # Studio ownership verification
│   │       └── types.rs           # Request/response types
│   │
│   ├── edge-tls/                  # TLS termination + cert management
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── server.rs          # HTTPS listener (rustls + axum)
│   │       ├── certs.rs           # Cert provisioning + storage
│   │       ├── on_demand.rs       # On-demand TLS with SurrealDB host policy
│   │       └── redirect.rs        # HTTP → HTTPS redirect
│   │
│   ├── edge-proxy/                # Reverse proxy + middleware pipeline
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── proxy.rs           # Reverse proxy handler
│   │       ├── headers.rs         # X-Forwarded-* injection
│   │       ├── rate_limit.rs      # Per-host token bucket
│   │       ├── cache.rs           # Static response cache
│   │       ├── compress.rs        # Brotli/gzip compression
│   │       ├── bot_challenge.rs   # JS challenge gate
│   │       ├── circuit_breaker.rs # Backend health + circuit breaker
│   │       └── body_limit.rs      # Request body size limits
│   │
│   ├── edge-tunnel/               # FRP-compatible tunnel server
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── server.rs          # Tunnel TCP listener
│   │       ├── control.rs         # Client connection + auth
│   │       ├── proxy.rs           # Proxy registration
│   │       ├── registry.rs        # Active tunnel registry
│   │       ├── transport.rs       # yamux stream management
│   │       ├── health.rs          # Backend health checker
│   │       └── protocol.rs        # FRP message types (serde)
│   │
│   ├── edge-store/                # SurrealDB data layer
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── client.rs          # SurrealDB connection pool
│   │       ├── store.rs           # DomainStore trait
│   │       ├── surreal_store.rs   # SurrealDB implementation
│   │       ├── memory_store.rs    # In-memory implementation (tests)
│   │       ├── live_cache.rs      # Live query → DashMap cache
│   │       ├── schema.rs          # Table definitions + migrations
│   │       └── types.rs           # Data model types
│   │
│   ├── edge-analytics/            # ClickHouse + observability
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── clickhouse.rs      # ClickHouse client + schema
│   │       ├── request_log.rs     # Request event logging
│   │       ├── tunnel_metrics.rs  # Tunnel event logging
│   │       ├── traces.rs          # OpenTelemetry setup
│   │       └── webhooks.rs        # Webhook dispatcher
│   │
│   ├── edge-dns/                  # DNS capabilities (Phase 2)
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs             # Placeholder
│   │
│   └── edge-config/               # Configuration
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           └── config.rs          # Env var loading + types
│
└── tests/                         # Integration tests
    ├── common/
    │   ├── mod.rs                 # Test helpers
    │   └── mock_frpc.rs           # Mock FRP client
    ├── api_tests.rs
    ├── tunnel_tests.rs
    ├── tls_tests.rs
    └── proxy_tests.rs
```

## Crate Dependency Graph

```
nova-edge (binary)
├── edge-api
│   ├── edge-store
│   ├── edge-analytics
│   ├── edge-tunnel
│   └── edge-config
├── edge-tls
│   ├── edge-store
│   └── edge-config
├── edge-proxy
│   ├── edge-tunnel
│   ├── edge-analytics
│   ├── edge-store
│   └── edge-config
├── edge-tunnel
│   ├── edge-store
│   ├── edge-analytics
│   └── edge-config
├── edge-analytics
│   └── edge-config
└── edge-config
```

## Environment Variables

### Bootstrap (required before DB connection)

```bash
NOVA_EDGE_HOSTNAME=domains.dlxstudios.com     # Public hostname
NOVA_EDGE_ADMIN_TOKEN=                         # API auth (openssl rand -hex 32)
NOVA_EDGE_TUNNEL_TOKEN=                        # frpc shared token
NOVA_EDGE_SURREAL_URL=ws://127.0.0.1:8000/rpc  # SurrealDB URL
NOVA_EDGE_SUBDOMAIN_HOST=dlx.studio            # Base domain for subdomains
```

### Optional

```bash
NOVA_EDGE_SURREAL_NAMESPACE=main
NOVA_EDGE_SURREAL_DATABASE=main
NOVA_EDGE_SURREAL_USERNAME=root
NOVA_EDGE_SURREAL_PASSWORD=root

NOVA_EDGE_API_PORT=8790
NOVA_EDGE_TUNNEL_PORT=9443
NOVA_EDGE_TLS_PORT=443
NOVA_EDGE_HTTP_PORT=80

NOVA_EDGE_TLS_EMAIL=admin@dlxstudios.com
NOVA_EDGE_TLS_CACHE_DIR=/var/lib/nova-edge/certs

NOVA_EDGE_CLICKHOUSE_URL=http://127.0.0.1:8123
NOVA_EDGE_CLICKHOUSE_DATABASE=nova_analytics

NOVA_EDGE_VERIFICATION_PREFIX=_nova-domain
NOVA_EDGE_LOG_LEVEL=info

NOVA_EDGE_WEBHOOK_URL=                         # Webhook endpoint for alerts
NOVA_EDGE_WEBHOOK_SECRET=                      # Webhook signing secret

NOVA_EDGE_OTEL_ENDPOINT=                       # OpenTelemetry collector URL
NOVA_EDGE_OTEL_SERVICE_NAME=nova-edge

# Multi-VPS
NOVA_EDGE_INSTANCE_ID=edge-us-east-1           # Unique instance identifier
```

## Out of Scope (Phase 1)

- DNS server (Phase 2)
- Nova-native tunnel client (keep using frpc for now)
- FRP web dashboard
- KCP/QUIC/WebSocket transports
- STUN/NAT hole punching
- UDP proxy support
- Plugin system for custom middleware
- User-facing admin dashboard HTML
- IP allowlisting per domain
- Wildcard certificates (DNS-01 challenge needs DNS server)
- DuckDB or embedded analytics engine

## Success Criteria

1. Single `nova-edge` binary runs on VPS
2. Custom domains get automatic HTTPS certs via Let's Encrypt
3. Requests route through FRP tunnel to local K3s services
4. No manual cert management or restart needed for new domains
5. Existing frpc client on local K3s connects without changes
6. SurrealDB remains the domain/proxy source of truth
7. Nova Cloud calls admin API without code changes (just new URL)
8. ClickHouse receives request logs and tunnel metrics
9. Webhook alerts fire on domain/cert/tunnel events
10. Circuit breaker protects against unhealthy tunnels
11. Rate limiting prevents abuse per domain
12. OpenTelemetry traces visible in collector
13. Bot challenge gates protect domains under attack
14. Multiple VPS instances share SurrealDB state
