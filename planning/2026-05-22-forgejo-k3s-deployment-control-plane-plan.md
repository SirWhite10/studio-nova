# Forgejo-First Deployment Control Plane Implementation Plan

> **For Hermes:** Keep this as a planning-only artifact in this thread. Execute implementation in a separate thread unless the user explicitly asks to proceed here.

**Goal:** Replace the GitHub-oriented CI/CD direction with a Forgejo-first, image-based deployment system that builds from fresh checkouts, publishes immutable container images, deploys to k3s through TypeScript + the official Kubernetes client, and lays the foundation for both private Nova admin operations and future tenant workspace deployments.

**Architecture:** Forgejo triggers CI/CD jobs on a self-hosted runner. Deployments are orchestrated centrally from `tools/deploy/`, not from per-package deployment implementations. Individual apps keep normal app scripts like `build` and `check`, while a shared TypeScript deployment CLI under `tools/deploy/` handles target selection, image tagging, registry publishing, Kubernetes apply/patch, rollout checks, and future blue/green workflows. The same backend deployment APIs and execution primitives will later serve both the private admin dashboard and Nova Cloud workspace deployment features.

**Tech Stack:** Forgejo + act_runner, Node.js/TypeScript, pnpm/Vite+, Docker or nerdctl/buildx, OCI registry, k3s, `@kubernetes/client-node`, SvelteKit apps, systemd for host-managed runtime-control during transition.

---

## Design decisions locked in by this plan

1. **Forgejo only** — do not invest further in GitHub-hosted workflow assumptions.
2. **Fresh checkout builds** — the CI runner checks out the commit into a clean workspace, installs dependencies, builds artifacts, then builds/pushes an image. Do not treat the long-lived local repo as the authoritative CI workspace.
3. **Image-based deployment** — move away from host-mounted build artifact deployments for CI/CD. Pods should run immutable images tagged by commit or release tag.
4. **TypeScript deployment layer** — deployment logic lives in versioned repo code, not in shell-only glue or CI YAML.
5. **Centralized deploy entrypoint** — deployment behavior lives in `tools/deploy/`; deployable projects may expose thin convenience scripts, but the source of truth is the shared deployment CLI rather than per-package deploy logic.
6. **Tag-based production releases** — development deployments can auto-roll forward; production uses explicit version tags and approval.
7. **Shared deployment APIs** — internal admin tooling and future Nova Cloud user workspace deploys must converge on the same backend deployment primitives.

## Current repo facts to preserve

Confirmed from the repo today:

- Monorepo workspaces live under:
  - `apps/*`
  - `packages/*`
  - `tools/*`
- Existing deployment/bootstrap assets already present:
  - `deploy/k3s/public-apps/bootstrap-public-apps.sh`
  - `deploy/k3s/bootstrap-domain-control.sh`
  - `deploy/k3s/bootstrap-surrealdb.sh`
  - `deploy/host/bootstrap-nova-runtime-control.sh`
- Current deployable surfaces already in scope:
  - `apps/website`
  - `packages/canvas`
  - `apps/nova-cloud`
  - `apps/nova-domain-control`
  - `apps/nova-runtime-control`
- Current package script situation is inconsistent:
  - `apps/nova-cloud` has a placeholder `deploy` script that only builds
  - `apps/nova-domain-control` and `apps/nova-runtime-control` do not yet expose image/deploy scripts

## Target operating model

### CI build cycle

For every deployment-capable app, the runner should:

1. receive a Forgejo event (push, PR, tag, or manual dispatch)
2. create a fresh checkout of the target revision
3. install dependencies deterministically
4. run checks/tests/build for affected projects
5. build an OCI image from the checked-out source
6. push the image to a registry
7. update k3s workloads to the new image tag
8. verify rollout and app health
9. record deployment metadata for future admin/dashboard visibility

This confirms the user's intuition: **yes, even if the repo also exists locally, the correct CI build flow is usually clone/checkout → install → build → image → deploy**.

### Environments

Define at least these environments from the start:

- `dev` — auto-deploy on protected branch pushes
- `staging` — optional later, for approval-based pre-prod checks
- `prod` — deploy only from signed/approved tags

### Release identifiers

Use immutable tags:

- development: `dev-<shortsha>`
- production: `<semver-tag>` such as `v0.3.1`
- optional convenience aliases:
  - `dev-latest`
  - `prod-latest`

Never deploy mutable local build directories as the system of record.

## Deployment control-plane shape

### Shared backend concepts

Design the deployment API around these core entities:

- **Project** — deployable unit (`website`, `canvas`, `nova-cloud`, `nova-domain-control`, etc.)
- **Environment** — `dev`, `staging`, `prod`
- **Build** — result of source checkout + validation + image build
- **Release** — immutable image/tag + metadata
- **Deployment** — attempt to roll a release into an environment
- **Rollout** — live k3s transition status
- **Service binding** — domain, ingress, tunnel, port, secret, dependency wiring
- **Runtime workspace** — later tenant-specific deployable unit managed by Nova Cloud

### Internal API direction

The private admin dashboard and user-facing workspace deploy UX should eventually call the same backend service methods for:

- start build
- publish image
- create deployment
- monitor rollout
- promote/rollback release
- attach domain
- read logs/events
- list active revisions

That API does not need to be fully built in phase 1, but phase 1 scripts must be shaped so they can be wrapped by that API later instead of thrown away.

## Deployment strategy support

### Phase 1 required

- **Rolling** deployment for all services

### Phase 2 required

- **Blue/green** for critical apps (`nova-cloud`, possibly `website`)

### Phase 3 optional

- **Canary** / weighted rollout if traffic splitting becomes valuable

For phase 1, use Kubernetes-native rolling updates. For phase 2, add a release abstraction that can hold both old and new revisions and switch traffic through Service selector changes or ingress/tunnel routing.

## Registry recommendation

Choose one of these and lock it before implementation starts:

### Preferred

- **Forgejo Container Registry** if enabled and stable for your install

### Good fallback

- private OCI registry in k3s or Docker on the same host

### Scale-up option

- Harbor later if you want richer registry and artifact management

Selection criteria:

- works with Forgejo auth and runner auth
- supports immutable tags
- low friction for k3s image pulls
- acceptable for future tenant workspace image storage

## Runner placement recommendation

### Phase 1 runner

Use a **self-hosted Forgejo runner** on the Nova infrastructure with:

- direct network access to k3s API
- ability to build container images
- access to deployment secrets
- access to restart host-side `nova-runtime-control` while it remains outside k3s

### Security constraints

- no public/shared runners for deployment jobs
- keep deploy secrets local to the Nova infra
- restrict deploy jobs to protected branches/tags
- separate read-only CI tokens from deployment tokens where possible

## Centralized deployment CLI contract

Every deployable package/project should converge on a common deployment interface, but the implementation should live in `tools/deploy/` rather than in per-package deploy scripts.

### Preferred script shape

```json
{
  "scripts": {
    "check": "...",
    "build": "...",
    "deploy": "tsx tools/deploy/src/cli.ts deploy --project <name>",
    "deploy:dev": "tsx tools/deploy/src/cli.ts deploy --project <name> --env dev",
    "deploy:prod": "tsx tools/deploy/src/cli.ts deploy --project <name> --env prod",
    "verify": "tsx tools/deploy/src/cli.ts verify --project <name>"
  }
}
```

Notes:

- `image:build` and `image:push` may exist as convenience aliases, but they should call into `tools/deploy/` rather than app-local deployment code.
- App-local `build` remains app-specific because build commands differ by project.
- The deployment system should also be callable directly from Forgejo as a central CLI, for example:
  - `tsx tools/deploy/src/cli.ts deploy --project nova-cloud --env dev`
  - `tsx tools/deploy/src/cli.ts deploy --project website --env prod --tag v0.3.1`

### Notes by current project

#### `apps/website`

Add any needed convenience scripts, but have them delegate to `tools/deploy/` instead of app-local deployment files.

#### `packages/canvas`

Decide whether this is:

- a build-only library dependency, or
- a separately deployed demo/editor surface

Right now Canvas has been deployed as a public surface; if that remains true, treat it like an app and give it the same centralized deploy interface.

#### `apps/nova-cloud`

Replace the current placeholder `deploy` script so it calls the shared `tools/deploy/` CLI.

#### `apps/nova-domain-control`

Add a thin deploy contract that forwards into `tools/deploy/`, plus Kubernetes rollout verification.

#### `apps/nova-runtime-control`

Add a thin deploy contract even if phase 1 deploy still targets host systemd instead of k3s, so the interface remains consistent while the implementation stays centralized.

## Shared TypeScript deployment tooling

Create a reusable deployment toolkit under:

- `tools/deploy/`

Suggested structure:

- `tools/deploy/src/config.ts` — environment and registry config
- `tools/deploy/src/git.ts` — revision metadata, branch/tag parsing
- `tools/deploy/src/image.ts` — image naming, build, push
- `tools/deploy/src/k8s.ts` — shared `@kubernetes/client-node` helpers
- `tools/deploy/src/rollout.ts` — rollout waiters and status collection
- `tools/deploy/src/health.ts` — HTTP/system checks
- `tools/deploy/src/releases.ts` — release metadata model
- `tools/deploy/src/strategies/rolling.ts`
- `tools/deploy/src/strategies/blue-green.ts` — phase 2
- `tools/deploy/src/types.ts`
- `tools/deploy/src/cli.ts` — common CLI entrypoint

Package-specific wrappers are optional. If they exist, they should be thin aliases only. The real deployment logic should stay in `tools/deploy/`.

## Kubernetes integration approach

Use the official client:

- `@kubernetes/client-node`

Expected capabilities in phase 1:

- read kube config from runner environment
- patch Deployments / StatefulSets / Services
- create/update ConfigMaps and Secrets references if needed
- watch rollout status
- inspect Pods for failure diagnostics
- collect resource events for operator feedback

Do not hand-roll raw `kubectl` strings as the long-term primary path. Keeping `kubectl` as a debug fallback is fine.

## Service-by-service deployment plan

### `apps/website`

**Phase 1**

- Dockerfile or equivalent build definition
- build image from checked-out source
- deploy image to `nova-website`
- verify HTTP 200 on external/internal dev URL

### `packages/canvas`

**Phase 1**

- if still deployed as a standalone surface, create image + deployment path like `website`
- otherwise demote it to library-only and remove standalone runtime assumptions

### `apps/nova-cloud`

**Phase 1**

- build image with correct production env contract
- deploy to `nova-cloud-web`
- verify app health, auth entry, and dependency reachability

**Phase 2**

- blue/green support
- release history surfaced in admin dashboard

### `apps/nova-domain-control`

**Phase 1**

- add image/deploy scripts
- deploy into `nova-domain`
- verify API/service health

### `apps/nova-runtime-control`

**Phase 1 transitional state**

- build/check via CI
- restart/reconcile host systemd deployment if source changes
- keep deploy contract aligned with other apps

**Phase 2 target state**

- evaluate containerizing runtime-control if host dependencies allow it

## Forgejo pipeline lanes

### Lane A: branch / PR CI

No deployment. Fast validation only.

Checks should include:

- dependency install
- workspace-aware checks/tests
- targeted builds for changed deployable projects
- image build smoke test optionally without pushing

### Lane B: dev auto-deploy

Trigger on push to protected dev branch (`main` or `develop`, decide explicitly).

Behavior:

- fresh checkout
- install
- build changed projects
- build/push dev-tagged images
- deploy only changed services
- run verification
- emit deployment summary

### Lane C: production tag deploy

Trigger on version tags like `v*`.

Behavior:

- fresh checkout at tag
- full validation
- build/push immutable release images
- manual approval if desired
- deploy to prod
- run extended verification
- retain rollback pointer to previous stable release

## Build and deploy source of truth

The build source of truth is the **checked-out commit**, not:

- the developer's local working tree
- previous host build artifacts
- mutable mounted workspace directories inside pods

This is important because later tenant workspace deploys will need the same mental model:

- build from a source snapshot
- produce immutable release artifact
- deploy artifact
- track rollout

## Migration away from current shell bootstrap flow

Do not delete the current shell scripts immediately. Migrate them in layers.

### Phase 1

- keep existing shell bootstraps as fallback/orchestration references
- add TypeScript deployment commands beside them
- prove image-based deployment for one app first

### Phase 2

- move public app deploys fully to image-based TS flows
- keep shell scripts only for emergency/manual recovery

### Phase 3

- remove host-artifact deployment assumptions from normal CI/CD

## Planning tasks

### Task 1: Choose the baseline branch and release policy

**Objective:** Lock branch/tag semantics before pipeline implementation.

**Decisions required:**

- which branch auto-deploys to dev: `main` or `develop`
- production tag format: `v*` or another convention
- whether prod deploys require manual approval in Forgejo

**Output:**

- short policy section appended to this plan or to a future deploy spec

### Task 2: Choose the registry

**Objective:** Select the OCI registry that CI and k3s will use.

**Candidates:**

- Forgejo registry
- local private registry
- Harbor

**Output:**

- chosen registry host
- auth model for runner pushes and cluster pulls
- naming convention such as `registry.example.com/studio-nova/nova-cloud:dev-<sha>`

### Task 3: Standardize the centralized deploy contract

**Objective:** Define the exact shared CLI contract in `tools/deploy/` and only the minimal convenience scripts each project should expose.

**Files to modify later:**

- `apps/website/package.json`
- `packages/canvas/package.json`
- `apps/nova-cloud/package.json`
- `apps/nova-domain-control/package.json`
- `apps/nova-runtime-control/package.json`

**Deliverable:**

- one shared contract used by CI and by future admin/API calls

### Task 4: Create the shared deploy toolkit

**Objective:** Implement `tools/deploy/` with common TypeScript modules and a CLI.

**Deliverable:**

- reusable image, registry, k8s, and verification helpers

### Task 5: Convert one app end-to-end first

**Objective:** Prove the system with the least risky public app before broad rollout.

**Recommended first target:**

- `apps/website`

**Why:**

- fewer runtime dependencies than `nova-cloud`
- fast validation cycle
- visible success criteria

### Task 6: Convert `nova-cloud`

**Objective:** Move the core app to image-based deployment using the new shared deploy tooling.

**Critical checks:**

- secrets/env injection
- SurrealDB connectivity
- runtime-control and domain-control wiring
- auth flow health

### Task 7: Convert domain-control and runtime-control

**Objective:** Bring service-management components into the same deployment contract.

**Special note:**

- runtime-control may still deploy to host systemd in phase 1, but it should still report through the same release/deployment interface.

### Task 8: Install Forgejo and runner service

**Objective:** Stand up the source/control plane to execute this plan.

**Execution order after planning:**

1. install Forgejo service
2. enable container registry if using Forgejo registry
3. install/register self-hosted runner
4. create protected branches/tags policy
5. add CI/CD workflows pointing primarily to `tools/deploy/` commands, with package scripts used only as thin aliases where helpful
6. then continue k3s deployment integration work

This matches the user's requested sequence: **service installation first, k3s wiring afterwards**.

## Verification strategy

### CI verification

- branch CI succeeds from a fresh checkout
- no deployment side effects on PRs

### Dev deploy verification

- image exists in registry with expected tag
- Deployment image in k3s matches expected tag
- rollout finishes successfully
- health endpoint returns success
- deployment metadata recorded

### Prod deploy verification

- tag resolves to immutable image
- rollout succeeds
- previous release remains available for rollback
- external endpoint health passes

## Risks and pitfalls

1. **Current host-artifact deployment pattern** is convenient but conflicts with long-term immutable release management.
2. **Canvas ambiguity** must be resolved: deployed surface vs library package.
3. **Runtime-control host dependence** makes it a special case until containerized.
4. **Registry auth** must be designed once, not improvised per workflow.
5. **Blue/green** should not be half-implemented in phase 1; do rolling first, then add proper strategy support.

## Recommended immediate next execution thread

When switching from planning to implementation, execute in this order:

1. install Forgejo service
2. decide and enable registry
3. install/register Forgejo runner on Nova infra
4. scaffold `tools/deploy/`
5. standardize the shared `tools/deploy/` contract and any thin package aliases
6. convert `apps/website` first
7. verify image-based deployment to k3s
8. then convert the rest of the stack

## Final recommendation

Do **not** treat this as merely CI/CD plumbing. Treat it as the first operational slice of Nova's future deployment control plane.

That gives you:

- a practical Forgejo-based dev/prod pipeline now
- image-based k3s deployments
- a clean path to blue/green later
- shared deployment primitives for both private admin operations and future tenant workspace deployments
