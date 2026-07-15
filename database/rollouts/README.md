# Rollouts

SurrealKit generates reviewed `*.toml` manifests in this directory. Do not hand-apply schema files to shared environments.

The initial `constellation_expand` rollout may add definitions and indexes, but it must not remove or narrow any legacy table, field, or index. Legacy removal belongs to a later contract rollout with explicit operator approval.
