# Nova Domain Control

This deploys `nova-domain-control` in k3s.

Current dev setup:

- runs directly from the checked-out repo using a hostPath mount
- defaults to `memory` store mode unless you replace the secret values
- writes approved host routes into Caddy through the Caddy admin API
- supports TXT verification for custom domains using `_nova-domain.<host>`

For a durable setup later, replace `memory` mode with SurrealDB credentials and
replace the hostPath-based runtime with a built container image.
