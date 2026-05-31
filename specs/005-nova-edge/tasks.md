# Nova Edge — Task List (Rust)

## Phase 0: Project Scaffold

- [ ] T1: Create Rust workspace (Cargo.toml, crates, Makefile, .gitignore)
- [ ] T2: Create AGENTS.md
- [ ] T3: Create .env.example

## Phase 1: Configuration + Store (Foundation)

- [ ] T4: edge-config — Config struct + from_env() + tests
- [ ] T5: edge-store — Data types (WorkspaceProxy, ProxyDomain, etc.) + ser/de tests
- [ ] T6: edge-store — DomainStore trait + MemoryStore + tests
- [ ] T7: edge-store — SurrealStore implementation + integration tests
- [ ] T8: edge-store — LiveCache (DashMap + live queries) + tests

## Phase 2: Admin API

- [ ] T9: Domain validation (normalize, validate, classify, reserved) + tests
- [ ] T10: TXT verification (token gen, DNS lookup, verify) + tests
- [ ] T11: Auth middleware (Bearer token) + tests
- [ ] T12: Domain handlers (GET/POST/DELETE /admin/domains/\*) + tests
- [ ] T13: Proxy handlers (POST/GET/DELETE /admin/proxies/\*) + tests
- [ ] T14: Studio + health + resolve handlers + tests
- [ ] T15: FRP plugin handler (Login, NewProxy, etc.) + tests
- [ ] T16: Router assembly + integration test

## Phase 3: TLS + HTTPS Edge

- [ ] T17: Cert provisioning (rustls-acme + storage) + tests
- [ ] T18: On-demand TLS (SurrealDB host policy) + tests
- [ ] T19: HTTPS server (tokio-rustls + axum) + tests
- [ ] T20: HTTP redirect + ACME challenge listener + tests

## Phase 4: Proxy Middleware Pipeline

- [ ] T21: Reverse proxy handler + tests
- [ ] T22: X-Forwarded-\* headers + tests
- [ ] T23: Per-host rate limiting (token bucket) + tests
- [ ] T24: Response caching (static content) + tests
- [ ] T25: Brotli/gzip compression + tests
- [ ] T26: Bot challenge (JS gate) + tests
- [ ] T27: Circuit breaker + tests
- [ ] T28: Request body limits + tests

## Phase 5: Tunnel Server

- [ ] T29: FRP protocol message types + ser/de tests
- [ ] T30: Client connection + auth + tests
- [ ] T31: Proxy registration (validate against SurrealDB) + tests
- [ ] T32: Data forwarding (yamux streams) + tests
- [ ] T33: Backend health checker + tests
- [ ] T34: Multi-connection load balancing + tests

## Phase 6: Analytics + Observability

- [ ] T35: ClickHouse schema + client + tests
- [ ] T36: Request logging middleware + tests
- [ ] T37: Tunnel metrics logging + tests
- [ ] T38: OpenTelemetry traces + tests
- [ ] T39: Webhook dispatcher + tests

## Phase 7: Integration + Deployment

- [ ] T40: Wire all crates into main binary (app bootstrap)
- [ ] T41: End-to-end integration test
- [ ] T42: Dockerfile + docker-compose
- [ ] T43: Systemd service unit
- [ ] T44: VPS deployment script
- [ ] T45: Update Nova Cloud env vars to point at nova-edge
