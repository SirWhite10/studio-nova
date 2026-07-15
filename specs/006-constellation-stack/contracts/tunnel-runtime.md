# Horizon and Habitat Runtime Contract

## Public and Control Ports

| Port | Owner   | Purpose                                                           |
| ---- | ------- | ----------------------------------------------------------------- |
| 80   | Horizon | HTTP redirect and certificate challenge traffic                   |
| 443  | Horizon | Public HTTPS termination and Deployment routing                   |
| 8790 | Horizon | Authenticated control-plane API; should be private or allowlisted |
| 9443 | Horizon | Authenticated native tunnel connectors from Habitat               |

Habitat runtime ports are private. Horizon never resolves an arbitrary host directly to a public Habitat port.

## Connector Registration

Habitat opens an outbound connection to Horizon and supplies:

- protocol version;
- connector key;
- Habitat node identity;
- authentication proof;
- supported service keys;
- heartbeat and capacity metadata.

Horizon accepts a connector only when the node and credential are active and belong to the same Constellation as the route.

## Request Forwarding

1. Horizon validates SNI/Host and resolves one active Domain Binding.
2. The binding resolves one active Deployment Route.
3. The route resolves one healthy Deployment and Runtime Instance.
4. Horizon selects an online Tunnel Connector for the owning Habitat.
5. The request includes method, path, allowed headers, body limits, and service key.
6. Habitat forwards only to the service registered for that Runtime Instance.
7. Errors return a tenant-safe unavailable response; no fallback to another tenant is permitted.

## Runtime Health

A Runtime Instance may receive traffic only when:

- its Deployment is `active`;
- its own status is `healthy`;
- its health check is current;
- its Tunnel Connector is `online`;
- its Deployment Route is `active`;
- its Domain Binding ownership and certificate states are valid.

## Legacy FRP Compatibility

FRP records and clients may remain during cutover, marked with protocol `frp`. Native yamux and FRP connectors must not share an ambiguous connector key. New Deployments default to `nova-yamux-v1`.
