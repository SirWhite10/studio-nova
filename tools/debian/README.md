# Debian systemd utilities

This directory contains host-level bootstrap utilities for Nova on Debian/systemd hosts.

## SurrealDB installer

`install-nova-surreal-systemd.sh` writes:

- `/etc/default/nova-cloud`
- `/etc/systemd/system/nova-surrealdb.service`

By default it:

- detects the Nova setup user from `apps/nova-cloud/surreal`
- configures native SurrealDB startup through `apps/nova-cloud/scripts/start-surreal.sh`
- enables the service with `systemctl enable`
- starts or restarts it immediately

### Usage

Run as root from the repo root:

```sh
tools/debian/install-nova-surreal-systemd.sh
```

Explicit configuration:

```sh
tools/debian/install-nova-surreal-systemd.sh \
  --repo-root /home/nova/studio-nova \
  --setup-user nova \
  --surreal-mode native
```

Install without enabling or starting:

```sh
tools/debian/install-nova-surreal-systemd.sh --no-enable --no-start
```
