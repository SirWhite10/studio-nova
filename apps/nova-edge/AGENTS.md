# AGENTS.md — Nova Edge (Rust)

## Project Overview

Nova Edge is a **unified Rust edge service** — single binary handling TLS termination, admin API, FRP-compatible tunnel server, analytics, and observability.

## Development Commands

### Prerequisites

- Rust 1.85+ (`rustup default stable`)
- Build essentials: `build-essential pkg-config libssl-dev`
- Optional: `cargo install cargo-watch cargo-nextest`

### Build

```bash
make build        # Release build → target/release/nova-edge
make dev          # Debug build (faster compile)
make check        # cargo check (fastest, no binary)
```

### Test (TDD)

```bash
make test                    # All workspace tests
make test-one crate=edge-store  # Single crate
cargo nextest run            # Better test runner
```

### Code Quality

```bash
make fmt      # Check formatting (cargo fmt)
make clippy   # Lint (cargo clippy)
make lint     # fmt + clippy
```

### Run

```bash
source .env
make run       # Build + run release
make watch     # Auto-rebuild on changes (development)
```

## Crate Structure

| Crate            | Description                              |
| ---------------- | ---------------------------------------- |
| `nova-edge`      | Binary — app bootstrap, wires all crates |
| `edge-config`    | Config loading from env vars             |
| `edge-store`     | SurrealDB data layer + live query cache  |
| `edge-api`       | Admin API (axum routes on :8790)         |
| `edge-tls`       | TLS termination (rustls + rustls-acme)   |
| `edge-proxy`     | Reverse proxy + middleware pipeline      |
| `edge-tunnel`    | FRP-compatible tunnel server (yamux)     |
| `edge-analytics` | ClickHouse + OpenTelemetry + webhooks    |
| `edge-dns`       | DNS server (Phase 2, placeholder)        |

## Ports

| Port | Service                         |
| ---- | ------------------------------- |
| 80   | HTTP redirect + ACME challenges |
| 443  | HTTPS (public TLS traffic)      |
| 8790 | Admin API (Nova Cloud)          |
| 9443 | Tunnel server (frpc clients)    |

## Key Dependencies

- `tokio` — async runtime
- `axum` — HTTP framework
- `rustls` + `rustls-acme` — TLS + auto certs
- `yamux` — stream multiplexing (FRP protocol compat)
- `surrealdb` — database client + live queries
- `clickhouse` — analytics
- `hickory-resolver` — DNS TXT lookups
- `tracing` — structured logging
- `opentelemetry` — distributed tracing

## TDD Workflow

Every feature follows:

1. Write test → see it fail
2. Implement minimum code → see it pass
3. Refactor if needed

## Architecture

See `specs/005-nova-edge/` for full spec, plan, and task breakdown (45 tasks across 7 phases).
