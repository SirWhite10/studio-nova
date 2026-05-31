# Nova SurrealDB on k3s

This directory deploys SurrealDB for Nova Cloud in k3s.

Current design:

- dedicated `nova-cloud` namespace
- dedicated PVC (`local-path`) for durable data
- `ClusterIP` service at `nova-surrealdb.nova-cloud.svc.cluster.local:8000`
- optional `hostPort: 8000` mode so the k3s pod can temporarily replace the local systemd SurrealDB on the same host port during cutover testing
- seed job that copies the current host SurrealDB data from `apps/nova-cloud/surreal/data` into the PVC

## Files

- `pvc.yaml` — persistent volume claim for SurrealDB data
- `service.yaml` — cluster-internal service
- `deployment.yaml` — normal cluster-internal deployment
- `deployment-hostport.yaml` — same deployment, but also binds host port `8000`
- `seed-job.yaml` — copies the current host data into the PVC
- `secret.example.yaml` — example connection secret for future app deployments

## Recommended cutover flow

1. Stop the local systemd SurrealDB service so the on-disk snapshot is stable.
2. Seed the k3s PVC from `apps/nova-cloud/surreal/data`.
3. Deploy SurrealDB in `hostport` mode so `127.0.0.1:8000` stays usable on the host.
4. Verify the pod and health endpoint.
5. Once the rest of Nova Cloud is running inside k3s, switch app configs to the cluster DNS name instead of loopback.

## Bootstrap

Cluster-internal only:

```sh
deploy/k3s/bootstrap-surrealdb.sh
```

Host-port cutover test using the same port as local development:

```sh
deploy/k3s/bootstrap-surrealdb.sh --mode hostport --stop-local-service
```

If you are ready to fully retire the local systemd service from boot:

```sh
deploy/k3s/bootstrap-surrealdb.sh --mode hostport --disable-local-service
```

## Future app connection

Inside k3s, future Nova Cloud app deployments should use:

- `SURREALDB_URL=http://nova-surrealdb.nova-cloud.svc.cluster.local:8000/rpc`
- `SURREALDB_NAMESPACE=main`
- `SURREALDB_DATABASE=main`

The bootstrap script writes these into the `nova-surrealdb-app-env` secret.
