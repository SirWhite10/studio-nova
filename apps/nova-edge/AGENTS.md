# AGENTS.md — Nova Edge

## Project Overview

Nova Edge is a **unified Caddy + FRP edge service** built as a custom xcaddy binary. It combines:

- **Caddy** (TLS termination, automatic HTTPS, on-demand TLS)
- **FRP server** (tunnel control plane, proxy bridging)
- **SurrealDB domain intelligence** (host authorization, proxy lookup)

Single binary. Single process. Deploys on the public VPS.

## Development Commands

### Prerequisites

- Go 1.25+ (`/usr/local/go/bin/go`)
- xcaddy (`~/go/bin/xcaddy`)
- PATH must include `/usr/local/go/bin` and `~/go/bin`

### Build

```bash
make build
# Output: ./nova-edge
```

Or manually:

```bash
xcaddy build --with github.com/dlxstudios/nova-edge=. --output nova-edge
```

### Testing

```bash
make test
```

### Code Quality

```bash
make fmt   # Format
make vet   # Vet
```

### Run

```bash
make run   # Build + run with Caddyfile
```

### Version

```bash
make version
```

## Module Structure

| Module ID                  | Type    | File                      | Description                  |
| -------------------------- | ------- | ------------------------- | ---------------------------- |
| `nova.surreal`             | App     | `caddy/surreal_lookup.go` | SurrealDB host resolution    |
| `nova.tunnel`              | App     | `caddy/tunnel.go`         | FRP tunnel server            |
| `http.handlers.nova_proxy` | Handler | `caddy/tunnel.go`         | Reverse proxy through tunnel |

## Architecture

See `specs/005-nova-edge/` for full spec, plan, and task breakdown.

## Key Files

- `doc.go` — Root package import (re-exports caddy modules)
- `caddy/modules.go` — Module registration
- `caddy/surreal_lookup.go` — SurrealDB lookup module
- `caddy/tunnel.go` — Tunnel app + proxy handler
- `cmd/nova-edge/main.go` — Alternative entry point (for reference)

## Build Notes

- xcaddy generates its own `main.go`; our `cmd/nova-edge/main.go` is for reference
- The `--with` flag replaces the module path with the local directory
- Build tags `nobadger,nomysql,nopgx` are applied by xcaddy to reduce binary size
