# Nova Edge Builder Handoff

Date: 2026-07-11

## Purpose

This handoff is for the agent/operator running on the **builder machine**. The builder should compile and, if instructed, deploy the Nova Edge Rust binary to the VPS that owns the public URL/root host:

- Public/VPS host: `ss.dlxstudios.com`
- VPS SSH user: `root`
- Builder machine repo path: `~/Nova_Projects/studio-nova/apps/nova-edge`
- Branch: `feat/nova-edge-rust`
- Current synced commit: `de822ab`
- Commit message: `feat(nova-edge): add native tunnel routing and production tls`

The build machine already has the SSH keys needed to connect to the VPS.

## Current Constellation Update (2026-07-13)

The commit and branch details below describe the last deployed Nova Edge snapshot. Current
development is on branch `006-constellation-stack` and is an additive control-plane expansion. Do
not deploy an uncommitted working tree or assume the dated `de822ab` snapshot includes these new
contracts.

The machine roles are now:

- **Forge**: this builder; compiles immutable Releases and the static Nova Edge binary.
- **Horizon**: `ss.dlxstudios.com`; owns ports `80`, `443`, `8790`, and `9443`.
- **Habitat**: the K3s/container and SurrealDB host; runs Workbenches and Deployments.

Operational invariants:

- `80/tcp` and `443/tcp` are public Horizon web ingress.
- `9443/tcp` accepts the authenticated native Habitat tunnel and should be firewall-restricted to
  Habitat egress where possible.
- `8790/tcp` is the authenticated Horizon control API. Bind it to `127.0.0.1`; never expose it as an
  unrestricted public service. Nova Cloud should use a private path or an allowlisted TLS proxy.
- SurrealDB is the authoritative route/connector graph. Nova Edge verifies schema compatibility and
  does not own or apply DDL at startup.
- Node roles are immutable. Heartbeats run at least every minute; the default stale threshold is two
  minutes.

Before a Constellation-aware Horizon deployment, register the Horizon node through Nova Cloud and
place its returned record ID in `/etc/nova-edge/env`:

```text
NOVA_EDGE_HORIZON_NODE_ID=<infrastructure-node-id>
NOVA_EDGE_CONTROL_TOKEN=<scoped-route-control-token>
NOVA_EDGE_ADMIN_TOKEN=<operator-admin-token>
NOVA_EDGE_TUNNEL_TOKEN=<habitat-tunnel-token>
NOVA_EDGE_API_BIND=127.0.0.1
NOVA_EDGE_API_PORT=8790
NOVA_EDGE_TUNNEL_PORT=9443
```

Use separate values for admin, route control, and tunnel credentials. The Habitat tunnel client must
also provide `NOVA_EDGE_CONSTELLATION_ID`, `NOVA_EDGE_HABITAT_NODE_ID`, and a stable
`NOVA_EDGE_CONNECTOR_KEY`; all three are required together. Full node registration, heartbeat,
recovery, and credential procedures are in `deploy/README.md`.

## Where we left off

The local repo, remote branch, and builder repo were checked and are all on the same commit:

```text
local HEAD:                  de822ab
origin/feat/nova-edge-rust:  de822ab
builder HEAD:                de822ab
```

So there is **no required git push** from local and **no required git pull** on the builder before building. A safety pull is still fine.

The builder currently showed one modified file in the wider repo:

```text
M ../../history.txt
```

Do **not** commit that file unless you intentionally changed it and know why.

## What has been done so far

1. Nova Edge Rust work was committed on branch `feat/nova-edge-rust`.
2. The remote branch was verified at commit `de822ab`.
3. Builder machine SSH was verified at `10.0.0.11`.
4. Builder repo was verified at:

```bash
~/Nova_Projects/studio-nova/apps/nova-edge
```

5. Builder Rust toolchain was previously confirmed available.
6. VPS deployment target is:

```bash
root@ss.dlxstudios.com
```

7. The `nova-edge` service on the VPS was previously confirmed listening locally on port `9443`.
8. Public inbound access to `137.184.212.150:9443` was not reachable from outside. That looked like a VPS/provider firewall or security-group issue, not a code/build issue.

## SSH into the VPS from the builder

From the builder machine, connect directly to the VPS:

```bash
ssh root@ss.dlxstudios.com
```

If host key checking blocks automation, use:

```bash
ssh -o StrictHostKeyChecking=no root@ss.dlxstudios.com
```

Quick VPS checks:

```bash
hostname
systemctl status nova-edge --no-pager
ss -ltnp | grep -E ':80|:443|:8790|:9443'
cat /etc/nova-edge/env
```

## Sync/check repo on builder

On the builder:

```bash
cd ~/Nova_Projects/studio-nova/apps/nova-edge

git status --short --branch
git log --oneline -1
git fetch origin feat/nova-edge-rust
git rev-parse --short HEAD
git rev-parse --short origin/feat/nova-edge-rust
```

Expected output for both commit hashes:

```text
de822ab
```

Optional safe update:

```bash
git pull --ff-only origin feat/nova-edge-rust
```

If `git pull` refuses because of `history.txt`, do **not** commit it automatically. Either leave it alone if already at `de822ab`, or stash only if absolutely necessary:

```bash
git stash push -m "builder local history.txt before nova-edge build" -- ../../history.txt
```

## Build command — important

The VPS runs Debian 12 with older glibc than the Arch builder. Do **not** deploy a dynamically linked binary from the builder. Always build with static linking:

```bash
cd ~/Nova_Projects/studio-nova/apps/nova-edge

CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+crt-static" \
  cargo build --release -p nova-edge --target x86_64-unknown-linux-gnu
```

Expected binary:

```bash
target/x86_64-unknown-linux-gnu/release/nova-edge
```

Verify it is static:

```bash
file target/x86_64-unknown-linux-gnu/release/nova-edge
```

Expected wording should include something like:

```text
static-pie linked, statically linked
```

## Deploy binary to VPS

From the builder:

```bash
cd ~/Nova_Projects/studio-nova/apps/nova-edge

scp -o StrictHostKeyChecking=no \
  target/x86_64-unknown-linux-gnu/release/nova-edge \
  root@ss.dlxstudios.com:/usr/local/bin/nova-edge
```

Then restart on the VPS:

```bash
ssh -o StrictHostKeyChecking=no root@ss.dlxstudios.com '
  chmod +x /usr/local/bin/nova-edge &&
  systemctl restart nova-edge &&
  systemctl status nova-edge --no-pager
'
```

## Post-deploy verification

From the builder:

```bash
ssh -o StrictHostKeyChecking=no root@ss.dlxstudios.com '
  systemctl is-active nova-edge &&
  ss -ltnp | grep -E ":80|:443|:8790|:9443" &&
  journalctl -u nova-edge -n 80 --no-pager
'
```

Local-on-VPS tunnel port check:

```bash
ssh -o StrictHostKeyChecking=no root@ss.dlxstudios.com '
  nc -vz 127.0.0.1 9443 || true
'
```

Public port check from the builder:

```bash
nc -vz ss.dlxstudios.com 9443 || true
curl -v --max-time 8 http://ss.dlxstudios.com:9443/ || true
```

If local VPS `127.0.0.1:9443` works but public `ss.dlxstudios.com:9443` fails, the likely issue is still provider firewall/security-group ingress for TCP `9443`.

## Important VPS ports

Nova Edge expected listeners:

- `:80` — HTTP redirect / ACME HTTP-01 support
- `:443` — public HTTPS edge
- `:8790` — admin API
- `:9443` — tunnel/control placeholder or tunnel listener

## Do not compile on the VPS

The VPS is small and has previously OOM-killed Rust builds. Build on the builder only, then copy the binary to the VPS.

## Summary for the builder agent

Recommended next action:

1. Confirm builder repo is at `de822ab`.
2. Build static Nova Edge binary using the command above.
3. Verify binary is statically linked.
4. SCP to `root@ss.dlxstudios.com:/usr/local/bin/nova-edge`.
5. Restart `nova-edge` service.
6. Verify service health and listeners.
7. If `9443` remains inaccessible publicly but works locally on the VPS, escalate/fix VPS provider firewall ingress for TCP `9443`.
