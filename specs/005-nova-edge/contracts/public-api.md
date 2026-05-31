# Nova Edge — Public API Contract (Rust)

## Ports

| Port | Service   | Access                   |
| ---- | --------- | ------------------------ |
| 443  | HTTPS     | Public — browser traffic |
| 80   | HTTP      | Public — ACME + redirect |
| 8790 | Admin API | Private — Nova Cloud     |
| 9443 | Tunnel    | Private — frpc clients   |

## Authentication

### Admin API (port 8790)

All `/admin/*` endpoints require Bearer token:

```
Authorization: Bearer <NOVA_EDGE_ADMIN_TOKEN>
```

Unauthenticated: `GET /health`, `GET /resolve`

### Tunnel (port 9443)

frpc clients authenticate with credentials stored in `tunnel_credentials` table:

```json
{ "type": "Login", "user": { "metas": { "token": "<client_secret>" } } }
```

Shared token mode also supported (matches `NOVA_EDGE_TUNNEL_TOKEN`).

---

## Admin API Endpoints

### `GET /health`

```json
{
  "ok": true,
  "service": "nova-edge",
  "version": "0.1.0",
  "instance_id": "edge-us-east-1",
  "store": { "ok": true },
  "cache": { "domains": 12, "proxies": 7 },
  "tunnel": { "clients": 3 },
  "clickhouse": { "ok": true }
}
```

### `GET /resolve?host=<hostname>`

```json
{
  "ok": true,
  "host": "10.cloud",
  "kind": "custom",
  "result": {
    "proxy": {
      "proxyName": "one0-cloud-runtime",
      "localIP": "10.0.0.17",
      "localPort": 3000,
      "enabled": true
    },
    "domain": { "host": "10.cloud", "kind": "custom", "status": "active" }
  }
}
```

### `POST /admin/proxies`

```json
// Request
{
  "userId": "user_abc",
  "studioId": "studio_xyz",
  "proxyName": "my-workspace",
  "proxyType": "http",
  "localIP": "10.0.0.17",
  "localPort": 3000,
  "enabled": true,
  "subdomain": "myworkspace",
  "customDomains": ["10.cloud"]
}

// Response
{
  "ok": true,
  "result": [
    { "proxy": { ... }, "domain": { "host": "myworkspace.dlx.studio", "kind": "subdomain", "status": "active" } },
    { "proxy": { ... }, "domain": { "host": "10.cloud", "kind": "custom", "status": "pending", "verificationToken": "abc123..." } }
  ]
}
```

### `POST /admin/proxies/:name/sync`

Confirms current state. Cache is auto-updated via live queries — this endpoint is for verification only.

```json
{
  "ok": true,
  "proxyName": "my-workspace",
  "domains": ["10.cloud", "myworkspace.dlx.studio"],
  "cert_status": { "10.cloud": "provisioned", "myworkspace.dlx.studio": "provisioned" }
}
```

### `GET /admin/proxies/:name/domains`

```json
{
  "ok": true,
  "result": [ { "proxy": { ... }, "domain": { ... } } ]
}
```

### `DELETE /admin/proxies/:name`

```json
{ "ok": true }
```

### `GET /admin/domains/verify?host=<hostname>`

```json
{
  "ok": true,
  "host": "10.cloud",
  "status": "pending",
  "verification": {
    "host": "10.cloud",
    "recordName": "_nova-domain.10.cloud",
    "expectedValue": "nova-domain=abc123...",
    "foundValues": ["nova-domain=abc123..."],
    "verified": true
  }
}
```

### `POST /admin/domains/verify`

```json
// Request
{ "host": "10.cloud" }

// Response (activated)
{
  "ok": true,
  "host": "10.cloud",
  "activated": true,
  "status": "active",
  "verification": { "verified": true, ... }
}
```

### `GET /admin/studios/:id/domains`

```json
{
  "ok": true,
  "studioId": "studio_xyz",
  "result": [ { "proxy": { ... }, "domain": { ... } } ]
}
```

### `DELETE /admin/domains/:host?studioId=<id>`

```json
{ "ok": true, "host": "10.cloud" }
```

### `POST /frp/handler?op=<operation>`

```json
// Allowed
{ "reject": false, "unchange": true }

// Rejected
{ "reject": true, "rejectReason": "Proxy is not registered: my-proxy" }
```

---

## Webhook Events

POSTed to `NOVA_EDGE_WEBHOOK_URL` with HMAC signature.

```json
{
  "event": "domain.activated",
  "timestamp": 1780187517000,
  "data": { "host": "10.cloud", "studioId": "studio_xyz" },
  "instance_id": "edge-us-east-1"
}
```

**Event names:**

- `domain.activated`, `domain.deactivated`, `domain.verified`
- `cert.obtained`, `cert.renewed`, `cert.failed`
- `tunnel.connected`, `tunnel.disconnected`
- `proxy.registered`, `proxy.disabled`
- `rate_limit.exceeded`
- `circuit_breaker.tripped`, `circuit_breaker.reset`
- `bot_challenge.served`

**Headers:**

```
X-Nova-Signature: sha256=<hmac_hex>
Content-Type: application/json
X-Nova-Event: <event_name>
```

---

## Multi-VPS

Multiple instances share SurrealDB. Each has a unique `NOVA_EDGE_INSTANCE_ID`.

- Live queries keep caches in sync across instances
- ClickHouse receives data from all instances (queryable by instance_id)
- TLS certs can be shared via disk mount or each instance obtains its own
- Webhook events include instance_id for source identification
