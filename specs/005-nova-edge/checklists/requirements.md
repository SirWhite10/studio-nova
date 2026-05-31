# Nova Edge — Requirements Checklist (Rust)

## Functional Requirements

### TLS / Certificates

- [ ] Automatic TLS via rustls-acme (Let's Encrypt HTTP-01/TLS-ALPN-01)
- [ ] On-demand TLS for custom domains (no restart needed)
- [ ] Host policy via SurrealDB live cache (only active domains get certs)
- [ ] Cert caching to disk (survives restart)
- [ ] Cert auto-renewal
- [ ] HTTP → HTTPS redirect (port 80)
- [ ] ACME challenge handling on port 80

### Admin API

- [ ] `POST /admin/proxies` — upsert proxy + domains
- [ ] `POST /admin/proxies/:name/sync` — verify state
- [ ] `GET /admin/proxies/:name/domains`
- [ ] `DELETE /admin/proxies/:name`
- [ ] `GET /admin/domains/verify` — check TXT status
- [ ] `POST /admin/domains/verify` — verify + activate
- [ ] `DELETE /admin/domains/:host`
- [ ] `GET /admin/studios/:id/domains`
- [ ] `POST /frp/handler` — FRP plugin auth
- [ ] `GET /health`
- [ ] `GET /resolve`
- [ ] Bearer token auth on `/admin/*`
- [ ] Drop-in compatible with nova-domain-control TypeScript API

### Tunnel Server

- [ ] FRP wire-protocol compatible (existing frpc connects unchanged)
- [ ] Per-client authentication (tunnel_credentials table)
- [ ] Shared token fallback (NOVA_EDGE_TUNNEL_TOKEN)
- [ ] yamux stream multiplexing
- [ ] Proxy registration + validation against SurrealDB
- [ ] Multi-connection load balancing (same proxy, multiple frpc connections)
- [ ] Backend health checking through tunnel
- [ ] Circuit breaker (trip on failures, half-open recovery)

### TXT Domain Verification

- [ ] Generate verification tokens (crypto-random)
- [ ] DNS TXT lookup via hickory-resolver
- [ ] Token matching + auto-activate
- [ ] Webhook on activation

### Multi-Tenant

- [ ] Studio ownership on every operation
- [ ] Studio quota enforcement (max domains per plan)
- [ ] Tenant-scoped domain listing

## Strong Should-Haves

### Proxy Middleware

- [ ] X-Forwarded-For, X-Forwarded-Proto, X-Forwarded-Host, X-Studio-Id headers
- [ ] Per-host rate limiting (token bucket via governor crate)
- [ ] Response caching for static content (content-hash + TTL)
- [ ] Brotli/gzip compression (tower-http)
- [ ] Request body size limits (per-proxy configurable)
- [ ] Bot challenge (JS gate with HMAC cookie)

### Security

- [ ] TLS 1.2+ minimum
- [ ] Circuit breaker for unhealthy tunnels
- [ ] Rate limiting prevents cert abuse
- [ ] Request body limits prevent tunnel saturation

### Observability

- [ ] ClickHouse request logging (every request)
- [ ] ClickHouse tunnel event logging
- [ ] OpenTelemetry distributed traces (OTLP)
- [ ] Structured JSON logging (tracing crate)
- [ ] Webhook alerts for domain/cert/tunnel events
- [ ] HMAC-signed webhook payloads

### Multi-VPS

- [ ] Shared SurrealDB state across instances
- [ ] Live queries keep all caches in sync
- [ ] Instance ID in all logs and events
- [ ] ClickHouse queryable by instance

## Nice-to-Have (Included)

- [ ] Bot challenge for domains under attack
- [ ] Multi-VPS horizontal scaling

## Non-Functional Requirements

### Performance

- [ ] Host lookup < 1μs (in-memory via DashMap)
- [ ] 100+ concurrent custom domains
- [ ] 50+ concurrent tunnel clients
- [ ] Graceful shutdown (drain in-flight requests)

### Reliability

- [ ] Single binary (no external runtime deps except SurrealDB + ClickHouse)
- [ ] Cert persistence on disk
- [ ] Auto-reconnect to SurrealDB
- [ ] frpc reconnection handling
- [ ] Zero-staleness cache via live queries

### Security

- [ ] No credentials in logs
- [ ] Admin API auth required
- [ ] Tunnel auth required
- [ ] FRP plugin token validation

### Compatibility

- [ ] Standard frpc v0.61+ connects unchanged
- [ ] SurrealDB schema compatible with existing tables
- [ ] Nova Cloud client code unchanged (just update env vars)

## Development Requirements

- [ ] Rust 1.85+ (stable)
- [ ] cargo build / cargo test / cargo clippy / cargo fmt
- [ ] cargo-nextest for test runner
- [ ] cargo-watch for development
- [ ] TDD: test first, implement second
- [ ] AGENTS.md with all commands
