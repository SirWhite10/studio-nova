# Feature Specification: Constellation Application Platform

**Feature Branch**: `006-constellation-stack`  
**Created**: 2026-07-13  
**Status**: Draft  
**Input**: Implement the complete Constellation platform with Forge, Horizon, and Habitat roles; central database ownership; private Workbenches; immutable Releases; public Deployments; domains; tunnels; and multi-platform build targets.

## User Scenarios & Testing

### User Story 1 - Preserve Existing Product Data (Priority: P1)

As an existing user, I can continue using authentication, Studios, chats, jobs, memories, skills, integrations, files, and existing deployments while the platform data model is upgraded.

**Why this priority**: The platform cannot be expanded safely if migration risks current user data or causes startup races.

**Independent Test**: Take a populated installation through the schema transition, then verify that all existing records remain readable and current product flows still work without requiring manual record repair.

**Acceptance Scenarios**:

1. **Given** a populated installation, **When** the new schema baseline is adopted, **Then** all existing tables, records, indexes, and authentication sessions remain available.
2. **Given** an application process starts while the schema is current, **When** it connects to the data service, **Then** it checks compatibility without redefining production tables during a page request.
3. **Given** a schema rollout fails before cutover, **When** the operator rolls it back, **Then** the currently deployed application remains usable.

---

### User Story 2 - Create a Studio and Workbench (Priority: P1)

As a user, I can create a durable Studio and open an isolated Workbench where I or an AI agent can edit, run, and preview the Studio source without exposing that environment publicly.

**Why this priority**: The private creation environment is the foundation for every application the platform builds.

**Independent Test**: Create one Studio, allocate a Workbench, write and run a sample application, restart the Workbench, and verify that source files persist while process state is recreated safely.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they create a Studio, **Then** the Studio receives a durable identity before compute is allocated.
2. **Given** a Studio without an active Workbench, **When** the user opens it for development, **Then** an isolated Workbench is allocated with persistent source storage.
3. **Given** a stopped or expired Workbench, **When** the user resumes work, **Then** the source is restored and a replacement Workbench can start without changing the Studio identity.
4. **Given** a Workbench is active, **When** a user or agent runs a preview, **Then** the preview is available only through an authorized preview route.

---

### User Story 3 - Build and Publish a Release (Priority: P1)

As a user, I can turn Studio source into an immutable Release and publish it as a Deployment that remains available independently of the Workbench.

**Why this priority**: Separating development from production makes publishing reliable, recoverable, and safe to scale.

**Independent Test**: Build a sample web application, publish it, stop the Workbench, and verify the published Deployment remains healthy and can be rolled back to the prior Release.

**Acceptance Scenarios**:

1. **Given** valid Studio source, **When** the user requests a build, **Then** the system records a Build Job and produces an immutable, versioned Release with logs and provenance.
2. **Given** a successful Release, **When** the user publishes it, **Then** a separate Runtime Instance starts and passes its health check before receiving traffic.
3. **Given** a healthy current Deployment, **When** a new Release fails health checks, **Then** traffic remains on the current Deployment.
4. **Given** multiple successful Releases, **When** the user selects rollback, **Then** the selected Release becomes active without rebuilding it.

---

### User Story 4 - Connect Domains Through Horizon (Priority: P2)

As a user, I can assign a platform subdomain or verified custom domain to a Deployment and receive secure public traffic without exposing Habitat containers directly.

**Why this priority**: Public reachability is required for users to deliver applications to their own customers.

**Independent Test**: Connect a Habitat runtime to Horizon, register a domain, complete verification, and confirm secure traffic reaches the intended Deployment while direct runtime ports remain private.

**Acceptance Scenarios**:

1. **Given** a healthy Deployment, **When** a platform subdomain is assigned, **Then** Horizon routes secure traffic to the correct Runtime Instance.
2. **Given** a custom domain, **When** ownership verification succeeds, **Then** the domain becomes active and receives a trusted certificate.
3. **Given** an unavailable tunnel connector, **When** a visitor requests the domain, **Then** the system returns a clear unavailable response without routing to another tenant.
4. **Given** a Deployment is replaced, **When** route activation completes, **Then** new requests use the replacement without changing the domain.

---

### User Story 5 - Operate a Constellation (Priority: P2)

As an operator, I can identify Forge, Horizon, and Habitat nodes, observe their health and capabilities, and understand which Workbenches, builds, runtimes, routes, and tunnels each node owns.

**Why this priority**: Clear infrastructure ownership is necessary for recovery, capacity planning, and secure routing.

**Independent Test**: Register one node of each role, update heartbeats and capabilities, simulate a node becoming unavailable, and verify affected resources are visible without corrupting unrelated resources.

**Acceptance Scenarios**:

1. **Given** a new node, **When** it registers, **Then** it has one explicit role and a stable installation identity.
2. **Given** a Habitat node, **When** it reports capabilities, **Then** scheduling can distinguish supported build and runtime targets.
3. **Given** a stale heartbeat, **When** the health threshold is exceeded, **Then** the node and its affected resources are marked unavailable without being deleted.
4. **Given** an operator inspects a Studio, **When** resources are loaded, **Then** their owning nodes and current operational states are traceable.

---

### User Story 6 - Build Multiple Application Targets (Priority: P3)

As a user, I can select supported targets such as Web/PWA, Android, iOS, Windows, macOS, or Linux, and the platform schedules each build only on a compatible builder while keeping signing credentials private.

**Why this priority**: Multi-platform output expands the product beyond hosted web applications after the core publish path is reliable.

**Independent Test**: Define multiple target profiles for one Studio and verify each Build Job is accepted, queued, or rejected according to available node capabilities, with no signing secret exposed in user-visible logs.

**Acceptance Scenarios**:

1. **Given** a supported target and available compatible builder, **When** the user starts a build, **Then** it is scheduled on that builder and produces a target-specific Release artifact.
2. **Given** no compatible builder, **When** the user requests the target, **Then** the build remains queued or reports the missing capability instead of running incorrectly.
3. **Given** a signed target, **When** the build runs, **Then** signing material is provided only to the authorized build operation and is excluded from source, logs, and agent context.

### Edge Cases

- A schema definition exists in the live database but not in the repository baseline.
- A rollout is interrupted between additive changes and application cutover.
- Two requests attempt to allocate a Workbench or publish a Deployment concurrently.
- A Workbench expires while an agent operation or build is active.
- A build succeeds but its artifact upload, health check, or route activation fails.
- Horizon restarts while Habitat tunnel connectors are active.
- Habitat restarts while published Deployments and Workbench volumes exist.
- A domain is already attached to another tenant or fails ownership verification.
- A node reports a capability it no longer has or stops reporting heartbeats.
- A Release contains multiple frontend, backend, worker, or native targets with different runtime requirements.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST maintain one authoritative, version-controlled description of all platform data definitions.
- **FR-002**: The system MUST capture the complete existing production schema as a baseline before managing future changes.
- **FR-003**: The system MUST support staged, reviewable, reversible schema changes that preserve compatibility during application cutover.
- **FR-004**: Application page requests and ordinary service startup MUST NOT redefine shared production tables.
- **FR-005**: Services MUST detect and report an incompatible schema version before performing writes that depend on it.
- **FR-006**: Existing user, authentication, Studio, chat, job, memory, skill, integration, file, runtime, sandbox, domain, and proxy records MUST remain accessible during migration.
- **FR-007**: A Constellation MUST represent one coordinated platform installation containing infrastructure nodes.
- **FR-008**: Every infrastructure node MUST have a stable identity, exactly one primary role, capabilities, lifecycle status, and heartbeat state.
- **FR-009**: Supported node roles MUST include Forge, Horizon, and Habitat.
- **FR-010**: A Studio MUST be durable and exist independently of Workbench or Deployment allocation.
- **FR-011**: A Workbench MUST represent a private user-and-agent development environment associated with one Studio.
- **FR-012**: Workbench source storage MUST persist independently from replaceable Workbench compute instances.
- **FR-013**: Workbench allocation, resume, stop, and expiration operations MUST be idempotent.
- **FR-014**: Every build attempt MUST create a traceable Build Job with target, status, timestamps, logs, inputs, and resulting artifacts.
- **FR-015**: Every successful build MUST produce an immutable Release with provenance and one or more target artifacts.
- **FR-016**: A Deployment MUST reference an immutable Release and MUST NOT depend on an active Workbench.
- **FR-017**: A Runtime Instance MUST be health-checked before it can receive public traffic.
- **FR-018**: Publishing and rollback MUST activate routes atomically and preserve the previously healthy Deployment on failure.
- **FR-019**: Horizon MUST terminate public HTTP and HTTPS traffic and route it only to the authorized Deployment.
- **FR-020**: Habitat MUST establish outbound authenticated tunnel connections; application runtime ports MUST not require public exposure.
- **FR-021**: Domain bindings MUST support platform subdomains and ownership-verified custom domains.
- **FR-022**: Domain ownership, certificate state, route state, and Deployment association MUST be independently observable.
- **FR-023**: Administrative route changes MUST require authenticated, authorized control-plane access and produce an audit trail.
- **FR-024**: Tenant identity MUST be enforced across Studio, Workbench, Release, Deployment, domain, route, and tunnel operations.
- **FR-025**: The system MUST prevent one tenant's unavailable or malformed route from resolving to another tenant's runtime.
- **FR-026**: Build target profiles MUST declare required operating system, toolchain, architecture, packaging, and signing capabilities.
- **FR-027**: Build Jobs MUST run only on nodes whose reported capabilities satisfy the selected target profile.
- **FR-028**: Secrets and signing material MUST be excluded from source storage, build logs, artifacts, and agent-visible context.
- **FR-029**: Operators MUST be able to trace every active resource to its Studio, owner, node, Release, and current lifecycle state.
- **FR-030**: All lifecycle transitions MUST use explicit states and retain failure details without deleting recoverable records.

### Key Entities

- **Constellation**: A coordinated installation and its operational identity.
- **Infrastructure Node**: A Forge, Horizon, or Habitat machine with capabilities and heartbeat status.
- **Studio**: The durable user project containing source intent, configuration, and integrations.
- **Workbench**: The private development environment associated with a Studio.
- **Workbench Instance**: Replaceable compute allocated to a Workbench.
- **Build Target Profile**: Requirements for producing a specific platform output.
- **Build Job**: One traceable attempt to produce a Release target.
- **Release**: An immutable, versioned output created from Studio source.
- **Release Artifact**: A target-specific build output and its integrity metadata.
- **Deployment**: A published Release selected for an environment.
- **Runtime Instance**: A process or container serving a Deployment.
- **Tunnel Connector**: An authenticated Habitat-to-Horizon transport connection.
- **Domain Binding**: A platform or custom hostname and its ownership/certificate lifecycle.
- **Deployment Route**: The active mapping from a hostname to a Deployment.
- **Audit Event**: A durable record of privileged or lifecycle-changing operations.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A populated installation completes baseline adoption with 100% of pre-migration records and authentication sessions retained.
- **SC-002**: A user can create a Studio and reach a usable Workbench in under 60 seconds under normal capacity.
- **SC-003**: A stopped Workbench can be replaced while retaining 100% of committed Studio source files.
- **SC-004**: A successful web Release can be published to a secure domain within five minutes after its build completes.
- **SC-005**: Failed health checks or route activation attempts cause zero requests to be switched away from the previously healthy Deployment.
- **SC-006**: A published Deployment remains available after its originating Workbench is stopped.
- **SC-007**: Rollback to the immediately previous healthy Release completes within 30 seconds after operator confirmation.
- **SC-008**: Every active domain can be traced to exactly one tenant, Studio, Deployment, Release, Runtime Instance, and Horizon route.
- **SC-009**: Node restart tests restore database connectivity, tunnel registration, and serving state without manual record repair.
- **SC-010**: Unsupported build targets are rejected or queued before consuming build resources, with a clear missing-capability explanation.
- **SC-011**: Automated checks detect all missing authoritative definitions, cross-tenant route attempts, and invalid lifecycle transitions before deployment.

## Assumptions

- Existing authentication and Studio ownership remain the source of tenant identity.
- Existing records are migrated additively; legacy names may remain as compatibility fields or tables until cutover is proven.
- The current remote database is the initial production baseline and is backed up before any managed rollout.
- Forge is the initial platform build machine, Horizon is the public edge VPS, and Habitat initially hosts the database and container workloads.
- The first complete deployment target is a web/PWA or full-stack web application; native targets follow through capability-based build runners.
- Workbench source and Release artifacts use durable storage independent from container lifetimes.
- Public brand naming remains separate from internal infrastructure and lifecycle terminology.
- Existing chat, job, and agent features remain in scope for compatibility but are not redesigned by this feature.
