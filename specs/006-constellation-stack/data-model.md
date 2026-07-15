# Data Model: Constellation Application Platform

## Conventions

- Existing tables retain their current definitions during expand and cutover phases.
- New entities are schemafull and use camelCase field names to match existing application conventions.
- Internal relationships use typed record references. Better Auth `userId` values remain strings.
- New timestamps use database-native datetimes; compatibility adapters convert legacy epoch milliseconds.
- Lifecycle records are retained on failure and include a failure code/message rather than being deleted.
- Secrets are represented by opaque references only.

## Infrastructure

### Constellation

Represents one coordinated installation.

| Field     | Type                     | Rules                                                      |
| --------- | ------------------------ | ---------------------------------------------------------- |
| key       | string                   | Unique, immutable operator key                             |
| name      | string                   | Human-readable name                                        |
| status    | string                   | `provisioning`, `active`, `degraded`, `offline`, `retired` |
| metadata  | optional flexible object | Non-secret installation metadata                           |
| createdAt | datetime                 | Default current time                                       |
| updatedAt | datetime                 | Updated on mutation                                        |

### Infrastructure Node

Represents Forge, Horizon, or Habitat.

| Field                 | Type                     | Rules                                                                 |
| --------------------- | ------------------------ | --------------------------------------------------------------------- |
| constellationId       | record<`constellation`>  | Required owner                                                        |
| nodeKey               | string                   | Unique within a Constellation                                         |
| role                  | string                   | `forge`, `horizon`, or `habitat`                                      |
| displayName           | string                   | Operator-facing name                                                  |
| hostname              | string                   | Connection identity, not a secret                                     |
| region                | optional string          | Scheduling and display metadata                                       |
| status                | string                   | `registering`, `online`, `degraded`, `offline`, `draining`, `retired` |
| capabilities          | flexible object          | OS, architectures, toolchains, runtimes, capacity                     |
| lastHeartbeatAt       | optional datetime        | Liveness timestamp                                                    |
| metadata              | optional flexible object | Non-secret provider metadata                                          |
| createdAt / updatedAt | datetime                 | Audit timestamps                                                      |

Unique index: `(constellationId, nodeKey)`.

## Studio Development

### Studio

Existing durable tenant project. No destructive field conversion occurs in this feature.

### Workbench

Logical private development environment owned by a Studio.

| Field                  | Type                                    | Rules                                                                  |
| ---------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| userId                 | string                                  | Existing authenticated owner                                           |
| studioId               | record<`studio`>                        | Required Studio                                                        |
| name                   | string                                  | User-facing label                                                      |
| slug                   | string                                  | Unique within Studio                                                   |
| status                 | string                                  | `creating`, `ready`, `busy`, `paused`, `expired`, `failed`, `archived` |
| sourceVolumeKey        | string                                  | Durable source storage identity                                        |
| activeInstanceId       | optional record<`workbench_instance`>   | Current replaceable compute                                            |
| defaultTargetProfileId | optional record<`build_target_profile`> | Default build target                                                   |
| legacyWorkspaceId      | optional record<`workspace`>            | Compatibility link                                                     |
| metadata               | optional flexible object                | Framework and project hints                                            |
| createdAt / updatedAt  | datetime                                | Audit timestamps                                                       |

Unique index: `(studioId, slug)`.

### Workbench Instance

Replaceable compute allocated on Habitat.

| Field                 | Type                          | Rules                                                                                                                   |
| --------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| workbenchId           | record<`workbench`>           | Required logical Workbench                                                                                              |
| nodeId                | record<`infrastructure_node`> | Must reference a Habitat node                                                                                           |
| provider              | string                        | `k3s`, `e2b`, or approved provider                                                                                      |
| providerInstanceId    | string                        | Unique provider identity                                                                                                |
| status                | string                        | `allocating`, `starting`, `ready`, `busy`, `pausing`, `paused`, `stopping`, `stopped`, `expired`, `unhealthy`, `failed` |
| sourceMountPath       | string                        | Runtime mount location                                                                                                  |
| previewEndpoint       | optional string               | Private or authorized preview endpoint                                                                                  |
| expiresAt             | optional datetime             | Provider expiration                                                                                                     |
| lastHeartbeatAt       | optional datetime             | Liveness timestamp                                                                                                      |
| failure               | optional flexible object      | Code and safe message                                                                                                   |
| createdAt / updatedAt | datetime                      | Audit timestamps                                                                                                        |

Unique index: `(provider, providerInstanceId)`.

## Builds and Releases

### Build Target Profile

Describes one output target and its scheduler requirements.

| Field                 | Type                     | Rules                                                                    |
| --------------------- | ------------------------ | ------------------------------------------------------------------------ |
| key                   | string                   | Stable unique key                                                        |
| displayName           | string                   | User-facing target name                                                  |
| platform              | string                   | `web`, `android`, `ios`, `windows`, `macos`, `linux`, `server`, `worker` |
| architecture          | optional string          | Target architecture                                                      |
| toolchain             | string                   | Required build family/version                                            |
| requiredCapabilities  | array<string>            | Scheduler match requirements                                             |
| artifactKinds         | array<string>            | Expected output kinds                                                    |
| enabled               | bool                     | Availability flag                                                        |
| metadata              | optional flexible object | Non-secret target configuration                                          |
| createdAt / updatedAt | datetime                 | Audit timestamps                                                         |

### Build Job

One attempt to build one target.

| Field                          | Type                                   | Rules                                                                                         |
| ------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| userId                         | string                                 | Requesting owner                                                                              |
| studioId                       | record<`studio`>                       | Required Studio                                                                               |
| workbenchId                    | record<`workbench`>                    | Source Workbench                                                                              |
| targetProfileId                | record<`build_target_profile`>         | Required target                                                                               |
| nodeId                         | optional record<`infrastructure_node`> | Assigned Forge/compatible builder                                                             |
| status                         | string                                 | `queued`, `assigned`, `preparing`, `building`, `uploading`, `succeeded`, `failed`, `canceled` |
| sourceRevision                 | string                                 | Immutable source identity                                                                     |
| releaseId                      | optional record<`release`>             | Resulting Release                                                                             |
| queuedAt / startedAt / endedAt | datetime                               | Lifecycle timestamps                                                                          |
| failure                        | optional flexible object               | Safe failure detail                                                                           |
| metadata                       | optional flexible object               | Non-secret build metadata                                                                     |
| createdAt / updatedAt          | datetime                               | Audit timestamps                                                                              |

### Release

Immutable version produced from source.

| Field          | Type                | Rules                                      |
| -------------- | ------------------- | ------------------------------------------ |
| userId         | string              | Owner                                      |
| studioId       | record<`studio`>    | Required Studio                            |
| workbenchId    | record<`workbench`> | Source Workbench                           |
| buildJobId     | record<`build_job`> | Producing job                              |
| revision       | int                 | Unique per Studio, positive                |
| sourceRevision | string              | Source integrity identity                  |
| status         | string              | `assembling`, `ready`, `failed`, `revoked` |
| manifest       | flexible object     | Target/runtime manifest without secrets    |
| createdAt      | datetime            | Immutable creation time                    |

Unique index: `(studioId, revision)`.

### Release Artifact

| Field           | Type                           | Rules                                              |
| --------------- | ------------------------------ | -------------------------------------------------- |
| releaseId       | record<`release`>              | Required Release                                   |
| targetProfileId | record<`build_target_profile`> | Target identity                                    |
| kind            | string                         | Static bundle, image, package, logs, symbols, etc. |
| uri             | string                         | Durable artifact location                          |
| sha256          | string                         | 64 lowercase hexadecimal characters                |
| sizeBytes       | int                            | Non-negative                                       |
| metadata        | optional flexible object       | Packaging metadata without secrets                 |
| createdAt       | datetime                       | Creation time                                      |

Unique index: `(releaseId, targetProfileId, kind)`.

## Deployments and Routing

### Deployment

| Field                   | Type                                | Rules                                                                                                                  |
| ----------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| userId                  | string                              | Owner                                                                                                                  |
| studioId                | record<`studio`>                    | Required Studio                                                                                                        |
| environment             | string                              | `preview`, `staging`, or `production`                                                                                  |
| releaseId               | record<`release`>                   | Selected immutable Release                                                                                             |
| previousReleaseId       | optional record<`release`>          | Rollback target                                                                                                        |
| status                  | string                              | `pending`, `provisioning`, `verifying`, `ready`, `activating`, `active`, `degraded`, `failed`, `stopped`, `superseded` |
| activeRuntimeInstanceId | optional record<`runtime_instance`> | Current runtime                                                                                                        |
| activatedAt             | optional datetime                   | Traffic activation time                                                                                                |
| failure                 | optional flexible object            | Safe failure detail                                                                                                    |
| createdAt / updatedAt   | datetime                            | Audit timestamps                                                                                                       |

### Runtime Instance

| Field                 | Type                          | Rules                                                                               |
| --------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| deploymentId          | record<`deployment`>          | Required Deployment                                                                 |
| nodeId                | record<`infrastructure_node`> | Must reference Habitat                                                              |
| provider              | string                        | Runtime provider                                                                    |
| providerInstanceId    | string                        | Provider identity                                                                   |
| status                | string                        | `provisioning`, `starting`, `healthy`, `unhealthy`, `draining`, `stopped`, `failed` |
| serviceKey            | string                        | Private service identity used by tunnel routing                                     |
| healthCheck           | flexible object               | Path, interval, last result                                                         |
| startedAt / stoppedAt | optional datetime             | Lifecycle times                                                                     |
| failure               | optional flexible object      | Safe failure detail                                                                 |
| createdAt / updatedAt | datetime                      | Audit timestamps                                                                    |

Unique index: `(provider, providerInstanceId)`.

### Tunnel Connector

| Field                    | Type                          | Rules                                                            |
| ------------------------ | ----------------------------- | ---------------------------------------------------------------- |
| constellationId          | record<`constellation`>       | Required installation                                            |
| habitatNodeId            | record<`infrastructure_node`> | Connector owner                                                  |
| horizonNodeId            | record<`infrastructure_node`> | Receiving edge                                                   |
| connectorKey             | string                        | Stable registration key                                          |
| protocol                 | string                        | Initially `nova-yamux-v1`; legacy `frp` allowed during migration |
| status                   | string                        | `registering`, `online`, `degraded`, `offline`, `revoked`        |
| connectedAt / lastSeenAt | optional datetime             | Connection health                                                |
| metadata                 | optional flexible object      | Non-secret transport metadata                                    |
| createdAt / updatedAt    | datetime                      | Audit timestamps                                                 |

Unique index: `(horizonNodeId, connectorKey)`.

### Domain Binding

| Field                 | Type              | Rules                                                              |
| --------------------- | ----------------- | ------------------------------------------------------------------ |
| userId                | string            | Owner                                                              |
| studioId              | record<`studio`>  | Required Studio                                                    |
| host                  | string            | Globally unique normalized hostname                                |
| kind                  | string            | `platform` or `custom`                                             |
| ownershipStatus       | string            | `pending`, `verified`, `failed`, `revoked`                         |
| certificateStatus     | string            | `pending`, `issuing`, `active`, `renewal_due`, `failed`, `revoked` |
| verificationToken     | optional string   | Random ownership token; not a credential                           |
| verifiedAt            | optional datetime | Verification time                                                  |
| createdAt / updatedAt | datetime          | Audit timestamps                                                   |

### Deployment Route

| Field                 | Type                          | Rules                                                               |
| --------------------- | ----------------------------- | ------------------------------------------------------------------- |
| domainBindingId       | record<`domain_binding`>      | Required unique hostname                                            |
| deploymentId          | record<`deployment`>          | Required target                                                     |
| horizonNodeId         | record<`infrastructure_node`> | Serving Horizon                                                     |
| tunnelConnectorId     | record<`tunnel_connector`>    | Habitat transport                                                   |
| status                | string                        | `pending`, `validating`, `active`, `degraded`, `disabled`, `failed` |
| activatedAt           | optional datetime             | Traffic activation time                                             |
| failure               | optional flexible object      | Safe failure detail                                                 |
| createdAt / updatedAt | datetime                      | Audit timestamps                                                    |

Unique index: `domainBindingId` for the active route model.

## Audit

### Audit Event

| Field      | Type                      | Rules                                      |
| ---------- | ------------------------- | ------------------------------------------ |
| actorType  | string                    | `user`, `service`, `node`, `system`        |
| actorId    | string                    | Stable actor identity                      |
| action     | string                    | Namespaced operation                       |
| targetType | string                    | Entity category                            |
| targetId   | string                    | Record identity                            |
| studioId   | optional record<`studio`> | Tenant context                             |
| outcome    | string                    | `started`, `succeeded`, `failed`, `denied` |
| requestId  | optional string           | Correlation identity                       |
| details    | optional flexible object  | Redacted structured detail                 |
| createdAt  | datetime                  | Immutable event time                       |

## State Transitions

### Workbench

`creating -> ready -> busy -> ready -> paused -> ready -> archived`

Failure branches: allocation or operation may move to `failed`; expired compute moves the Workbench to `expired` only when no replacement is active. Resume creates a new Workbench Instance.

### Build Job

`queued -> assigned -> preparing -> building -> uploading -> succeeded`

Terminal alternatives: `failed`, `canceled`. A successful job creates exactly one Release.

### Deployment

`pending -> provisioning -> verifying -> ready -> activating -> active`

An active Deployment may become `degraded`, `stopped`, or `superseded`. Failed verification never activates its route. Rollback creates or activates a Deployment referencing an earlier Release.

### Deployment Route

`pending -> validating -> active -> degraded|disabled`

Only a route whose domain, Deployment, Runtime Instance, and tunnel are all healthy may become active.

### Infrastructure Node

`registering -> online -> degraded|offline -> online|draining -> retired`

Heartbeat expiration changes status but never deletes owned resources.

## Legacy Mapping

| Legacy table           | Expand/cutover destination                                               |
| ---------------------- | ------------------------------------------------------------------------ |
| `workspace`            | `workbench` compatibility source                                         |
| `sandbox`              | `workbench_instance` compatibility source                                |
| `workspace_deployment` | split into `release` and `deployment`                                    |
| `runtime_process`      | development process metadata; selected records map to `runtime_instance` |
| `workspace_proxy`      | `deployment_route` target compatibility                                  |
| `proxy_domain`         | `domain_binding`                                                         |
| `frp_client`           | `tunnel_connector` with legacy protocol                                  |

Backfill records store legacy references, are idempotent, and do not remove or rewrite the source records.
