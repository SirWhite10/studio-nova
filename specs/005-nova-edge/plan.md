# Nova Edge — Implementation Plan (Rust)

**Goal:** Build a unified Rust binary (`nova-edge`) with TLS termination, admin API, FRP-compatible tunnel server, analytics, and full observability. TDD approach — write tests first, then implement.

**Architecture:** Rust workspace with 9 crates (1 binary + 8 libraries). SurrealDB live queries for zero-staleness cache. ClickHouse sidecar for analytics. frpc wire-protocol compatible tunnel.

**Tech Stack:** Rust 1.85+, tokio, axum, rustls, rustls-acme, yamux, surrealdb, clickhouse, hickory-resolver, tracing, opentelemetry

**TDD:** Every task follows: write test → see it fail → implement → see it pass.

---

## Prerequisites (Server Setup)

### Install on VPS (Debian/Ubuntu)

```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup default stable

# 2. Install build dependencies
sudo apt update
sudo apt install -y build-essential pkg-config libssl-dev

# 3. Install ClickHouse (sidecar)
sudo apt install -y apt-transport-https ca-certificates curl gnupg
# Follow ClickHouse official install for your distro
# Or use Docker: docker run -d -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server

# 4. Verify
rustc --version
cargo --version
```

### Existing (already on server)

- SurrealDB at `ws://127.0.0.1:8000/rpc`
- frpc on local K3s

---

## Phase 0: Project Scaffold

### Task 1: Create Rust workspace

**Files:**

- `apps/nova-edge/Cargo.toml` (workspace)
- `apps/nova-edge/Cargo.lock`
- `apps/nova-edge/Makefile`
- `apps/nova-edge/.env.example`
- `apps/nova-edge/AGENTS.md`
- `apps/nova-edge/.gitignore`
- One `Cargo.toml` per crate (empty lib.rs placeholders)

**Workspace Cargo.toml:**

```toml
[workspace]
resolver = "2"
members = [
    "crates/nova-edge",
    "crates/edge-api",
    "crates/edge-tls",
    "crates/edge-proxy",
    "crates/edge-tunnel",
    "crates/edge-store",
    "crates/edge-analytics",
    "crates/edge-dns",
    "crates/edge-config",
]

[workspace.dependencies]
tokio = { version = "1", features = ["full"] }
axum = "0.8"
tower = "0.5"
tower-http = { version = "0.6", features = ["cors", "trace", "compression-br", "compression-gzip"] }
hyper = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rustls = "0.23"
tokio-rustls = "0.26"
rustls-acme = "0.12"
surrealdb = { version = "2", features = ["protocol-ws", "protocol-http"] }
yamux = "0.12"
hickory-resolver = "0.24"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
opentelemetry = "0.27"
opentelemetry-sdk = "0.27"
opentelemetry-otlp = "0.27"
clickhouse = "0.13"
dashmap = "6"
thiserror = "2"
anyhow = "1"
```

**Makefile:**

```makefile
.PHONY: build test fmt clippy run clean

build:
	cargo build --release

dev:
	cargo build

test:
	cargo test --workspace

test-one:
	cargo test -p $(crate)

fmt:
	cargo fmt --all -- --check

clippy:
	cargo clippy --workspace -- -D warnings

lint: fmt clippy

run: build
	./target/release/nova-edge

clean:
	cargo clean

watch:
	cargo watch -x test -x run
```

**Verification:** `cargo build` compiles. `cargo test` runs (no tests yet). `cargo fmt` and `cargo clippy` pass.

### Task 2: Create AGENTS.md

Document build/test/lint commands, crate structure, TDD workflow.

### Task 3: Create .env.example

All `NOVA_EDGE_*` env vars documented (see spec.md).

---

## Phase 1: Configuration + Store (Foundation)

### Task 4: edge-config — Config loading

**TDD cycle:**

1. Write tests for env var loading, defaults, validation
2. Implement `Config` struct with `from_env()` method
3. Verify tests pass

**Key types:**

```rust
pub struct Config {
    pub hostname: String,
    pub admin_token: String,
    pub tunnel_token: String,
    pub surreal_url: String,
    pub subdomain_host: String,
    pub api_port: u16,
    pub tunnel_port: u16,
    pub tls_port: u16,
    pub http_port: u16,
    pub tls_email: Option<String>,
    pub tls_cache_dir: PathBuf,
    pub clickhouse_url: Option<String>,
    pub clickhouse_database: String,
    pub verification_prefix: String,
    pub log_level: String,
    pub webhook_url: Option<String>,
    pub webhook_secret: Option<String>,
    pub otel_endpoint: Option<String>,
    pub instance_id: Option<String>,
    // SurrealDB
    pub surreal_namespace: String,
    pub surreal_database: String,
    pub surreal_username: String,
    pub surreal_password: String,
}
```

### Task 5: edge-store — Data types

**TDD cycle:**

1. Write tests for serialization/deserialization of all types
2. Implement types matching SurrealDB schema
3. Verify tests pass

**Key types:**

```rust
pub struct WorkspaceProxy { /* matches SurrealDB table */ }
pub struct ProxyDomain { /* matches SurrealDB table */ }
pub struct DomainResolution { proxy: WorkspaceProxy, domain: ProxyDomain }
pub struct ProxyUpsertInput { /* API input type */ }
pub struct VerificationDetails { host, record_name, expected, found, verified }
```

### Task 6: edge-store — DomainStore trait

**TDD cycle:**

1. Write tests against a mock store
2. Define the `DomainStore` trait
3. Implement `MemoryStore` for tests
4. Verify tests pass

```rust
#[async_trait]
pub trait DomainStore: Send + Sync {
    async fn ensure_schema(&self) -> Result<()>;
    async fn health(&self) -> Result<StoreHealth>;
    async fn resolve_host(&self, host: &str) -> Result<Option<DomainResolution>>;
    async fn get_domain_by_host(&self, host: &str) -> Result<Option<DomainResolution>>;
    async fn list_domains_for_studio(&self, studio_id: &str) -> Result<Vec<DomainResolution>>;
    async fn get_proxy_by_name(&self, name: &str) -> Result<Option<WorkspaceProxy>>;
    async fn list_proxy_domains(&self, name: &str) -> Result<Vec<DomainResolution>>;
    async fn upsert_proxy(&self, input: ProxyUpsertInput) -> Result<Vec<DomainResolution>>;
    async fn set_domain_status(&self, host: &str, status: &str) -> Result<Option<DomainResolution>>;
    async fn remove_domain(&self, host: &str, studio_id: Option<&str>) -> Result<bool>;
    async fn disable_proxy(&self, name: &str) -> Result<()>;
}
```

### Task 7: edge-store — SurrealDB implementation

**TDD cycle:**

1. Write integration tests (require running SurrealDB)
2. Implement `SurrealStore` using `surrealdb` crate
3. Verify tests pass

### Task 8: edge-store — Live query cache

**TDD cycle:**

1. Write tests: insert → cache updated, delete → cache removed, lookup → cache hit
2. Implement `LiveCache` using `DashMap` + SurrealDB live queries
3. Verify tests pass

```rust
pub struct LiveCache {
    domains: DashMap<String, DomainResolution>,
    proxies: DashMap<String, WorkspaceProxy>,
}

impl LiveCache {
    pub async fn start(db: &Surreal) -> Result<Self>;
    pub fn resolve(&self, host: &str) -> Option<DomainResolution>;
    pub fn is_host_active(&self, host: &str) -> bool;
}
```

---

## Phase 2: Admin API

### Task 9: edge-api — Domain validation

**TDD cycle:**

1. Write tests for normalize, validate, classify, is_reserved, generated_host
2. Implement in a new module (inside edge-api or separate edge-domain crate)
3. Verify tests pass

### Task 10: edge-api — TXT verification

**TDD cycle:**

1. Write tests for token generation, record building, verification logic
2. Implement using `hickory-resolver` for TXT lookups
3. Verify tests pass

### Task 11: edge-api — Auth middleware

**TDD cycle:**

1. Write tests: valid token → 200, invalid token → 401, missing token → 401
2. Implement axum middleware layer
3. Verify tests pass

### Task 12: edge-api — Domain handlers

**TDD cycle:**

1. Write tests for each endpoint:
   - `GET /admin/domains/verify?host=` → verification status
   - `POST /admin/domains/verify` → verify + activate
   - `DELETE /admin/domains/:host` → remove
2. Implement handlers using `MemoryStore` in tests
3. Verify tests pass

### Task 13: edge-api — Proxy handlers

**TDD cycle:**

1. Write tests for each endpoint:
   - `POST /admin/proxies` → upsert proxy + domains
   - `POST /admin/proxies/:name/sync` → trigger cert/route refresh
   - `GET /admin/proxies/:name/domains` → list proxy domains
   - `DELETE /admin/proxies/:name` → disable
2. Implement handlers
3. Verify tests pass

### Task 14: edge-api — Studio + health + resolve handlers

**TDD cycle:**

1. Write tests for:
   - `GET /admin/studios/:id/domains`
   - `GET /health`
   - `GET /resolve?host=`
2. Implement handlers
3. Verify tests pass

### Task 15: edge-api — FRP plugin handler

**TDD cycle:**

1. Write tests for each op: Login, Ping, NewProxy, NewUserConn, CloseProxy
2. Implement handler
3. Verify tests pass

### Task 16: edge-api — Router assembly

Wire all handlers into an axum `Router` with middleware layers. Integration test that the full API server starts and responds.

---

## Phase 3: TLS + HTTPS Edge

### Task 17: edge-tls — Cert provisioning

**TDD cycle:**

1. Write tests for cert storage, retrieval, expiry checking
2. Implement using `rustls-acme` for ACME + `rustls` for TLS
3. Verify tests pass (use ACME staging or pebble)

### Task 18: edge-tls — On-demand TLS

**TDD cycle:**

1. Write tests: active host → cert provisioned, inactive host → rejected
2. Implement `rustls-acme` with custom `AccountCache` that checks SurrealDB live cache
3. Verify tests pass

### Task 19: edge-tls — HTTPS server

**TDD cycle:**

1. Write test: start HTTPS server, connect, verify cert
2. Implement `tokio-rustls` + `axum` HTTPS listener
3. Verify tests pass

### Task 20: edge-tls — HTTP redirect

**TDD cycle:**

1. Write test: HTTP request → 301 redirect to HTTPS
2. Implement separate HTTP listener for redirect + ACME challenges
3. Verify tests pass

---

## Phase 4: Proxy Middleware Pipeline

### Task 21: edge-proxy — Reverse proxy handler

**TDD cycle:**

1. Write test: request → proxy → tunnel mock → response
2. Implement core proxy handler
3. Verify tests pass

### Task 22: edge-proxy — X-Forwarded headers

**TDD cycle:**

1. Write test: verify headers are injected correctly
2. Implement middleware
3. Verify tests pass

### Task 23: edge-proxy — Rate limiting

**TDD cycle:**

1. Write tests: under limit → pass, over limit → 429, refill over time
2. Implement token bucket per host using `DashMap`
3. Verify tests pass

### Task 24: edge-proxy — Response caching

**TDD cycle:**

1. Write tests: first request → cache miss → tunnel, second request → cache hit
2. Implement cache with content hash + TTL
3. Verify tests pass

### Task 25: edge-proxy — Compression

**TDD cycle:**

1. Write tests: Accept-Encoding: gzip → compressed, no Accept-Encoding → raw
2. Implement brotli/gzip response compression
3. Verify tests pass

### Task 26: edge-proxy — Bot challenge

**TDD cycle:**

1. Write tests: no cookie → JS challenge, valid cookie → pass, invalid cookie → challenge again
2. Implement JS challenge gate with cookie verification
3. Verify tests pass

### Task 27: edge-proxy — Circuit breaker

**TDD cycle:**

1. Write tests: healthy → pass, consecutive failures → trip → 503, recovery → reset
2. Implement with failure counting + half-open state
3. Verify tests pass

### Task 28: edge-proxy — Request body limits

**TDD cycle:**

1. Write tests: under limit → pass, over limit → 413
2. Implement per-proxy configurable body size limit
3. Verify tests pass

---

## Phase 5: Tunnel Server

### Task 29: edge-tunnel — FRP protocol types

**TDD cycle:**

1. Write tests for serialization/deserialization of each message type
2. Implement `Login`, `NewProxy`, `NewWorkConn`, `CloseProxy`, `Heartbeat` structs
3. Verify tests pass

### Task 30: edge-tunnel — Client connection + auth

**TDD cycle:**

1. Write tests: valid credentials → accepted, invalid → rejected
2. Implement TCP listener + yamux + login handler
3. Verify tests pass

### Task 31: edge-tunnel — Proxy registration

**TDD cycle:**

1. Write tests: register proxy → appears in registry, register same name → error
2. Implement NewProxy handler that validates against SurrealDB
3. Verify tests pass

### Task 32: edge-tunnel — Data forwarding

**TDD cycle:**

1. Write test: mock frpc → register → HTTP request through tunnel → response
2. Implement yamux stream forwarding
3. Verify tests pass

### Task 33: edge-tunnel — Health checker

**TDD cycle:**

1. Write tests: backend responds → healthy, timeout → unhealthy, reconnect → healthy
2. Implement periodic health probe via tunnel
3. Verify tests pass

### Task 34: edge-tunnel — Multi-connection load balancing

**TDD cycle:**

1. Write tests: 2 connections for same proxy → round-robin
2. Implement connection selection with least-connections strategy
3. Verify tests pass

---

## Phase 6: Analytics + Observability

### Task 35: edge-analytics — ClickHouse schema + client

**TDD cycle:**

1. Write tests: insert request log → query it back
2. Implement ClickHouse table creation + client wrapper
3. Verify tests pass

### Task 36: edge-analytics — Request logging

**TDD cycle:**

1. Write test: proxy request → ClickHouse row inserted
2. Implement middleware that logs to ClickHouse after each request
3. Verify tests pass

### Task 37: edge-analytics — Tunnel metrics

**TDD cycle:**

1. Write tests: connect → metric logged, disconnect → metric logged
2. Implement event emission from tunnel server
3. Verify tests pass

### Task 38: edge-analytics — OpenTelemetry traces

**TDD cycle:**

1. Write test: request → span created with correct attributes
2. Implement opentelemetry-rust with OTLP export
3. Verify tests pass

### Task 39: edge-analytics — Webhook dispatcher

**TDD cycle:**

1. Write tests: event → webhook POST sent with correct payload + signature
2. Implement async webhook sender with retry + HMAC signing
3. Verify tests pass

---

## Phase 7: Integration + Assembly

### Task 40: Wire all crates into main binary

`nova-edge/src/main.rs`:

1. Load config from env
2. Connect to SurrealDB, ensure schema
3. Start live cache
4. Start admin API server (port 8790)
5. Start tunnel server (port 9443)
6. Start HTTPS edge (ports 80 + 443)
7. Start ClickHouse logging
8. Start OpenTelemetry
9. Graceful shutdown on SIGTERM/SIGINT

### Task 41: End-to-end integration test

Full test with mock SurrealDB:

1. Start nova-edge
2. Register proxy via admin API
3. Register domain via admin API
4. Verify domain via admin API
5. Connect mock frpc to tunnel
6. Send HTTPS request to custom domain
7. Verify response routed through tunnel
8. Verify ClickHouse log written
9. Verify webhook fired

### Task 42: Dockerfile + docker-compose

Multi-stage build. docker-compose with SurrealDB + ClickHouse + nova-edge.

### Task 43: Systemd service unit

### Task 44: VPS deployment script

### Task 45: Update Nova Cloud env vars

Point `NOVA_DOMAIN_CONTROL_URL` to nova-edge.

---

## Dependency Installation Order

```bash
# Step 1: Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Step 2: Build essentials (likely already installed)
sudo apt install -y build-essential pkg-config libssl-dev

# Step 3: cargo-watch (for development)
cargo install cargo-watch

# Step 4: cargo-nextest (better test runner)
cargo install cargo-nextest

# Step 5: ClickHouse (Docker is easiest)
docker run -d --name clickhouse \
  -p 8123:8123 -p 9000:9000 \
  -v clickhouse-data:/var/lib/clickhouse \
  clickhouse/clickhouse-server:latest

# Step 6: Verify everything
rustc --version && cargo --version && cargo watch --version
```
