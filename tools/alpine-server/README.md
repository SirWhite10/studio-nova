# Alpine Server Utilities

This directory contains host-level bootstrap utilities for Nova on Alpine Linux.

## OpenRC installer

`install-nova-openrc.sh` writes the Nova service stack to `/etc/init.d` and the shared service config to `/etc/conf.d/nova-cloud`.

It manages:

- `nova-surrealdb`
- `nova-runtime-control`
- `nova-cloud-dev`
- `nova-cloud-prod`

By default it:

- detects the Nova setup user from the repo ownership
- installs the service files
- enables them with `rc-update`
- restarts them immediately
- keeps SurrealDB on Docker mode, which is the current known-good backend on this host

## Usage

Run as root from the repo root:

```sh
tools/alpine-server/install-nova-openrc.sh
```

Explicit configuration:

```sh
tools/alpine-server/install-nova-openrc.sh \
  --repo-root /home/nova/studio-nova \
  --setup-user nova \
  --public-host 192.168.1.2 \
  --surreal-mode docker
```

Install without enabling or starting:

```sh
tools/alpine-server/install-nova-openrc.sh --no-enable --no-start
```

## Notes

- `nova-cloud-dev` and `nova-cloud-prod` both run under the detected setup user, not root.
- `nova-surrealdb` supports `docker` and `native` modes through `NOVA_SURREAL_MODE` in `/etc/conf.d/nova-cloud`.
- `native` mode depends on the local `surreal` binary being compatible with the host libc. On this machine that path still fails, so `docker` remains the default.
