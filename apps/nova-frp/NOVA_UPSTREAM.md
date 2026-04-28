# Nova frp Vendor Notes

This directory vendors the upstream `fatedier/frp` source tree for Nova-specific tunnel and domain-control work.

Upstream source:

- Repository: https://github.com/fatedier/frp
- Branch at import: `dev`
- Commit at import: `e8dfd6efcccded4affeee9bb25f542c8280edf6e`
- Commit summary: `web/frpc: use static imports for proxy and visitor route components (#5286)`

The upstream `.git` directory was intentionally removed so this source is tracked directly by the parent `studio-nova` repository rather than as a submodule.

## Nova Domain Control Build

Nova adds an optional `novaDomainControl` block to `frps.toml`.

When enabled, `frps` uses the normal HTTP vhost router for HTTPS workspace traffic. HTTPS is terminated inside `frps` with ACME certificates, and certificate issuance is allowed only when the hostname is active in SurrealDB.

The public HTTP port is still required for ACME HTTP-01 challenges, but non-challenge HTTP requests are redirected to HTTPS instead of being proxied.

Example:

```toml
bindPort = 7000
vhostHTTPPort = 80
vhostHTTPSPort = 443
subDomainHost = "workspace.dlxstudios.com"

[auth]
method = "token"
token = "your-frp-token"

[novaDomainControl]
enable = true
acmeEmail = "admin@dlxstudios.com"
acmeCertDir = "/var/lib/frps-nova/acme"

[novaDomainControl.surreal]
url = "https://surrealdb.dlxstudios.com/rpc"
namespace = "main"
database = "main"
username = "root"
password = "change-me"
connectTimeoutMs = 5000
```

With this mode enabled, use `http` frpc proxies for workspace web apps. That means the public browser connection is HTTPS, while the tunnel carries normal HTTP to the workspace service after `frps` terminates TLS. Stock frp `https` proxies are TLS passthrough and do not participate in Nova's built-in certificate handling.

Before starting the VPS service, test a hostname against SurrealDB:

```sh
frps -c /etc/frp/frps.toml nova-check --host test.workspace.dlxstudios.com
```

## Debian VPS Build

To build only the Nova `frps` and `frpc` binaries on a Debian VPS after cloning
this repository, run:

```sh
./apps/nova-frp/scripts/build-debian.sh
```

The script installs Debian build dependencies, installs the required Go toolchain
when needed, builds static `frps` and `frpc` binaries with the `noweb` tag, and
writes a tarball under `apps/nova-frp/dist/`.
