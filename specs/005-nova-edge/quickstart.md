# Nova Edge — Quickstart (Rust)

## Prerequisites

- Rust 1.85+ (`rustup default stable`)
- SurrealDB running
- ClickHouse running (optional, for analytics)
- A VPS with ports 80, 443, 8790, 9443 open

## Server Setup (One-time)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Build dependencies
sudo apt install -y build-essential pkg-config libssl-dev

# Development tools
cargo install cargo-watch cargo-nextest

# ClickHouse (optional, Docker)
docker run -d --name clickhouse \
  -p 8123:8123 -p 9000:9000 \
  clickhouse/clickhouse-server:latest

# Verify
rustc --version && cargo --version
```

## Build

```bash
cd apps/nova-edge
make build        # Release build
make dev          # Debug build (faster compile)
```

## Configure

```bash
cp .env.example .env
# Edit .env — see below for required values
```

**Required env vars:**

```bash
NOVA_EDGE_HOSTNAME=domains.dlxstudios.com
NOVA_EDGE_ADMIN_TOKEN=          # openssl rand -hex 32
NOVA_EDGE_TUNNEL_TOKEN=         # openssl rand -hex 32
NOVA_EDGE_SURREAL_URL=wss://surrealdb.dlxstudios.com/rpc
NOVA_EDGE_SURREAL_USERNAME=root
NOVA_EDGE_SURREAL_PASSWORD=root
NOVA_EDGE_SURREAL_NAMESPACE=main
NOVA_EDGE_SURREAL_DATABASE=main
NOVA_EDGE_SUBDOMAIN_HOST=dlxstudios.com
NOVA_EDGE_TLS_EMAIL=nova@dlxstudios.com
NOVA_EDGE_ACME_DIRECTORY=https://acme-staging-v02.api.letsencrypt.org/directory  # staging first
NOVA_EDGE_TLS_SELF_SIGNED_FALLBACK=false
```

## Run

```bash
source .env
make run           # Build + run release
make watch         # Auto-rebuild on changes (development)
```

## Test

```bash
make test          # All tests
make test-one crate=edge-store  # Single crate
cargo nextest run  # Better test runner
```

## Ports

| Port | Service   | Purpose                          |
| ---- | --------- | -------------------------------- |
| 80   | HTTP      | ACME challenges + HTTPS redirect |
| 443  | HTTPS     | Public TLS traffic               |
| 8790 | Admin API | Nova Cloud domain management     |
| 9443 | Tunnel    | frpc client connections          |
| 2019 | Internal  | Debug/metrics (localhost only)   |

## Connect Nova Cloud

In Nova Cloud's environment:

```bash
NOVA_DOMAIN_CONTROL_URL=https://domains.dlxstudios.com:8790
NOVA_DOMAIN_CONTROL_TOKEN=<same as NOVA_EDGE_ADMIN_TOKEN>
```

No code changes needed in Nova Cloud.

## Connect frpc

```toml
serverAddr = "domains.dlxstudios.com"
serverPort = 9443

[auth]
method = "token"
token = "<NOVA_EDGE_TUNNEL_TOKEN>"

[transport]
tls.enable = true

[[proxies]]
name = "my-workspace"
type = "http"
localIP = "my-workspace.nova-edge.svc.cluster.local"
localPort = 3000
```

## Commands

```bash
make build     # Release build
make dev       # Debug build
make test      # Run all tests
make fmt       # Check formatting
make clippy    # Lint
make lint      # fmt + clippy
make run       # Build + run
make watch     # Dev mode with auto-rebuild
make clean     # Clean build artifacts
```


## ACME certificate smoke test

Use Let's Encrypt staging before production:

```bash
# Should serve ACME challenge paths on port 80 without redirecting
curl -i --resolve test.one0.cloud:80:137.184.212.150 \
  http://test.one0.cloud/.well-known/acme-challenge/smoke

# Should complete TLS for active hosts and reject unknown hosts
curl -vk --resolve test.one0.cloud:443:137.184.212.150 \
  https://test.one0.cloud/health

# Production check after switching NOVA_EDGE_ACME_DIRECTORY to Let's Encrypt production
openssl s_client -connect 137.184.212.150:443 -servername test.one0.cloud </dev/null 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates
```

Expected production issuer: Let's Encrypt. Self-signed fallback must stay disabled in production.
