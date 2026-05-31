# Nova Edge — Research (Rust)

## Crate Ecosystem

### TLS

- **rustls** (0.23) — Pure Rust TLS. No OpenSSL. Ring or aws-lc-rs backend.
- **tokio-rustls** (0.26) — Async TLS acceptor/stream for tokio.
- **rustls-acme** (0.12) — Automatic certificate management (ACME/Let's Encrypt). Handles HTTP-01 and TLS-ALPN-01 challenges. Supports on-demand TLS.

### HTTP

- **axum** (0.8) — Web framework built on hyper + tower. Excellent for APIs.
- **tower** (0.5) — Service abstraction. Middleware composition.
- **tower-http** (0.6) — HTTP middleware: CORS, tracing, compression, rate limiting.
- **hyper** (1.x) — Low-level HTTP. axum uses this under the hood.

### Tunnel

- **yamux** (0.12) — Stream multiplexing. Used by FRP for data plane. Rust implementation compatible with Go yamux.

### Database

- **surrealdb** (2.x) — Official Rust SDK. Supports WS and HTTP protocols. Live queries.
- **clickhouse** (0.13) — ClickHouse client. Row-based insertion. Supports native protocol.

### DNS

- **hickory-resolver** (0.24) — DNS resolver for TXT lookups (domain verification).
- **hickory-server** (0.24) — DNS server framework (Phase 2 DNS server).

### Observability

- **tracing** (0.1) — Structured logging + span-based instrumentation.
- **tracing-subscriber** (0.3) — Output formatting (JSON, pretty).
- **opentelemetry** (0.27) — Distributed tracing.
- **opentelemetry-otlp** (0.27) — OTLP export to collector.

### Concurrency

- **dashmap** (6) — Concurrent HashMap. Used for live cache.
- **tokio** (1.x) — Async runtime.

### Testing

- **cargo-nextest** — Better test runner (parallel, TUI).
- **tokio::test** — Async test macro.

## SurrealDB Live Queries

Live queries in the Rust SDK:

```rust
use surrealdb::engine::remote::ws::Ws;
use surrealdb::opt::Resource;
use surrealdb::sql::Thing;
use surrealdb::Surreal;

let db = Surreal::new::<Ws>("127.0.0.1:8000").await?;
db.use_ns("main").use_db("main").await?;

// Subscribe to live changes on proxy_domain table
let stream = db.select(Resource::from("proxy_domain")).live().await?;

// Process events
while let Some(result) = stream.next().await {
    let event: Result<LiveQueryEvent, _> = result;
    match event? {
        LiveQueryEvent::Create { id, data } => { /* new domain */ }
        LiveQueryEvent::Update { id, data } => { /* domain changed */ }
        LiveQueryEvent::Delete { id } => { /* domain removed */ }
        _ => {}
    }
}
```

This is the foundation for the zero-staleness cache.

## FRP Protocol (Wire Format)

FRP uses a simple binary protocol over yamux streams:

1. **Control connection**: frpc connects to frps via TCP (+ optional TLS)
2. **yamux**: Connection is upgraded to yamux for multiplexing
3. **Messages**: JSON-framed on the control stream:
   - `Login` → `{ type: "Login", version, hostname, os, arch, user, token, ... }`
   - `NewProxy` → `{ type: "NewProxy", proxy_name, proxy_type, use_encryption, ... }`
   - `NewWorkConn` → frpc opens new yamux streams for data
   - `Heartbeat` → keep-alive ping
   - `CloseProxy` → unregister proxy
4. **Data plane**: For HTTP proxies, frps opens yamux substreams to frpc, forwards raw HTTP

Key insight: the protocol is well-documented and simple. The Rust implementation just needs to speak the same JSON messages over yamux.

## On-Demand TLS Pattern (rustls-acme)

```rust
use rustls_acme::AcmeConfig;

let acme_config = AcmeConfig::new(["domains.dlxstudios.com"])
    .cache_dir(Some("/var/lib/nova-edge/certs".into()))
    .directory_lets_encrypt(true); // production

// For on-demand: custom resolver that checks SurrealDB
// rustls-acme supports a custom ResolvesServerCert implementation
// that can check the live cache before provisioning
```

Custom cert resolver for on-demand TLS:

```rust
struct OnDemandCertResolver {
    cache: Arc<LiveCache>,
    acme: Arc<AcmeConfig>,
    certs: DashMap<String, CertifiedKey>,
}

impl ResolvesServerCert for OnDemandCertResolver {
    fn resolve(&self, client_hello: ClientHello) -> Option<Arc<CertifiedKey>> {
        let sni = client_hello.server_name()?;

        // Check SurrealDB live cache
        if !self.cache.is_host_active(sni) {
            return None; // Reject — domain not active
        }

        // Check cert cache
        if let Some(cert) = self.certs.get(sni) {
            return Some(cert.value().clone());
        }

        // Trigger ACME cert provisioning (async, but resolve is sync)
        // Use a pre-provisioned approach or tokio::block_in_place
        None // First request will fail, but cert gets provisioned for next
    }
}
```

Better approach: provision certs reactively. When a domain is activated (live query event), immediately start ACME for that domain. By the time the first request arrives, the cert is usually ready.

## Compression

`tower-http` provides compression middleware:

```rust
use tower_http::compression::CompressionLayer;

let app = axum::Router::new()
    .route("/*path", proxy_handler)
    .layer(CompressionLayer::new()); // auto brotli/gzip/deflate
```

## Rate Limiting

Token bucket per host:

```rust
use dashmap::DashMap;
use std::time::Instant;

struct RateLimiter {
    buckets: DashMap<String, TokenBucket>,
    max_tokens: u64,
    refill_rate: u64, // tokens per second
}

struct TokenBucket {
    tokens: f64,
    last_refill: Instant,
}
```

Or use the `governor` crate (Battle-tested token bucket):

```rust
use governor::{Quota, RateLimiter};

let quota = Quota::per_second(NonZeroU32::new(10).unwrap());
let limiter = RateLimiter::<String, _, _>::keyed(quota);
```

## Bot Challenge

Simple JS challenge:

1. Request arrives without cookie → return HTML with JS that solves a hash puzzle
2. JS computes answer, sets cookie, reloads page
3. Request arrives with valid cookie → pass through to proxy

```rust
struct BotChallenge {
    secret: String,
    cookie_name: String,
    challenge_html: String,
}

impl BotChallenge {
    fn check(&self, req: &Request) -> ChallengeResult {
        // Verify cookie HMAC
        match req.cookies().get(&self.cookie_name) {
            Some(cookie) if self.verify_cookie(cookie) => ChallengeResult::Pass,
            _ => ChallengeResult::Challenge(self.render_challenge()),
        }
    }
}
```

## Circuit Breaker

```rust
enum CircuitState {
    Closed,      // Healthy — traffic flows
    Open,        // Tripped — traffic rejected
    HalfOpen,    // Testing — allow one request to probe
}

struct CircuitBreaker {
    state: AtomicU8, // CircuitState
    failure_count: AtomicU32,
    threshold: u32,
    reset_timeout: Duration,
    last_failure: Mutex<Instant>,
}
```

## Webhook Pattern

```rust
struct WebhookDispatcher {
    url: String,
    secret: String,
    client: reqwest::Client,
}

#[derive(Serialize)]
struct WebhookEvent {
    event: String,     // "domain.activated", "cert.obtained", "tunnel.disconnected"
    timestamp: i64,
    data: serde_json::Value,
    instance_id: String,
}

impl WebhookDispatcher {
    async fn dispatch(&self, event: WebhookEvent) -> Result<()> {
        let payload = serde_json::to_string(&event)?;
        let signature = hmac_sha256(&self.secret, &payload);
        self.client.post(&self.url)
            .header("X-Nova-Signature", signature)
            .header("Content-Type", "application/json")
            .body(payload)
            .send()
            .await?;
        Ok(())
    }
}
```

## OpenTelemetry Integration

```rust
use opentelemetry::trace::TracerProvider;
use opentelemetry_otlp::WithExportConfig;
use tracing_subscriber::{layer, Registry};

fn init_telemetry(endpoint: &str) -> Result<()> {
    let exporter = opentelemetry_otlp::new_exporter()
        .tonic()
        .with_endpoint(endpoint);

    let provider = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(exporter)
        .install_batch(opentelemetry_sdk::runtime::Tokio)?;

    let tracer = provider.tracer("nova-edge");
    let otel_layer = tracing_opentelemetry::layer().with_tracer(tracer);

    tracing_subscriber::registry()
        .with(otel_layer)
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    Ok(())
}
```

## ClickHouse Schema

```sql
CREATE TABLE IF NOT EXISTS request_log (
    timestamp DateTime64(3),
    host String,
    path String,
    method String,
    status_code UInt16,
    latency_ms UInt32,
    tunnel_id Nullable(String),
    proxy_name Nullable(String),
    client_ip String,
    instance_id String,
    cache_hit UInt8,
    compressed UInt8
) ENGINE = MergeTree()
ORDER BY (host, timestamp);

CREATE TABLE IF NOT EXISTS tunnel_event (
    timestamp DateTime64(3),
    event_type String,  -- 'connect', 'disconnect', 'proxy_register', 'proxy_unregister'
    client_id String,
    tunnel_id String,
    proxy_name Nullable(String),
    instance_id String
) ENGINE = MergeTree()
ORDER BY (client_id, timestamp);
```
