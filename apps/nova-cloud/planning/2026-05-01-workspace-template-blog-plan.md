# Workspace Template Blog Plan

**Document Name:** `2026-05-01-workspace-template-blog-plan.md`
**Version:** 1.0
**Date:** May 1, 2026
**Last Updated:** 2026-05-02 00:00:00 UTC
**Scope:** `apps/nova-cloud`, sandbox/runtime layer, workspace deployment flow, R2-backed content/artifact storage, domain routing integration

## 1. Purpose

Plan the first deployable Nova workspace strategy where the studio owns an on-demand sandbox/runtime, the sandbox creates the source project and runtime contract, and the workspace serves the published result.

The immediate example is a simple blog workspace generated as a `vp` React project. The sandbox should be capable of scaffolding the project, installing dependencies, writing the app structure, integrating content and future external services, and producing the declarative runtime contract plus workspace files. The workspace runtime should only execute the stored `runCommand`, expose deployment status, health, and public URLs, and scale to zero when idle.

This document is planning-only. No implementation should happen until the architecture, contract boundaries, and local testing strategy are explicit.

## 2. Current Direction

The finalized direction for this workspace model is:

- the studio is the business/container boundary.
- each studio owns its sandbox/runtime environment.
- each studio can own one or more workspaces.
- the sandbox is the authoring and build environment.
- the workspace is the deployment target.
- Nova Cloud orchestrates the relationship between Studio, sandbox, workspace, storage, and domains.
- workspace runtime is on-demand only.
- runtime state and workspace-specific files are read from R2-backed storage.
- template presets sit above raw sandbox freedom.
- users can eventually create arbitrary workspaces, but Nova should start with high-level presets that the agent can manage reliably.

For the first preset:

- template kind: `blog-react-vp`
- framework: React
- toolchain: `vp`
- delivery model: on-demand runtime contract executed by the workspace runtime

## 3. Product Principles

### Separate Authoring from Serving

- sandbox does project generation, coding, installs, content processing, and runtime-contract generation.
- workspace executes the published result and should not require the sandbox to stay alive.

### Preserve User Freedom

- the sandbox may still create arbitrary project structures.
- presets exist to reduce friction and give Nova a reliable contract for common workspace types.

### Keep Public Runtime Thin

- workspace runtime should avoid package installation, code generation, or arbitrary execution.
- public runtime should focus on health, on-demand execution, deployment switching, and domains.

### Let Nova and the Agent Orchestrate

- the UI should manage workspace lifecycle at a high level.
- the agent should manage source generation, integration wiring, rebuilds, and publishing through Nova APIs.

## 4. Target Model

```txt
User
  -> Nova Cloud UI
    -> create workspace preset
      -> create studio-scoped sandbox/runtime
      -> create workspace record
      -> create storage prefix
      -> run template scaffold in sandbox
      -> publish runtime contract and workspace files
      -> serve on workspace URL
```

Steady-state:

```txt
Agent or user action
  -> Nova Cloud server API
    -> sandbox runtime action
      -> edit source / add integration / fetch content / update runtime contract
        -> publish workspace state
          -> workspace deployment switches to new runtime revision
            -> frps/domain layer serves public traffic
```

## 5. Core Concepts

### Studio

- user-facing business working context
- owns chats, runtime state, files, integrations, one sandbox/runtime, and one or more workspaces

### Sandbox

- isolated technical runtime scoped to a single studio
- contains the editable source project
- runs `vp` commands and tool-assisted generation
- can publish source/build output into workspaces owned by the same studio
- publishes a runtime contract that tells the workspace how to execute on demand

### Workspace

- deployable app/site attached to a Studio
- serves a published runtime result
- owns public URL, deployment status, and health
- does not need the sandbox to remain alive after publication

### Workspace Template

- high-level contract that tells Nova how to scaffold, build, publish, and validate a workspace kind

### Artifact

- immutable or versioned published build output from a sandbox build
- consumed by the workspace runtime

## 6. First Template: `blog-react-vp`

### Purpose

Provide a minimal but realistic deployable site that proves:

- sandbox scaffolding
- dependency installation
- content rendering
- runtime-contract publishing
- workspace publication
- workspace serving

### Template Contract

- project scaffolded as a React app with `vp`
- source lives in the sandbox workspace
- blog pages render from markdown/content files or generated JSON
- runtime contract uses a single `runCommand`
- workspace runtime reads R2-backed files and executes the stored contract on demand
- workspace runtime serves the result on the Nova domain

### Expected Sandbox Capabilities

- `node`
- `bun`
- `vp`
- `git`
- `bash`
- `curl`

Nice-to-have later:

- browser automation
- image processing
- deployment verification helpers

## 7. Storage Model

Use distinct storage responsibilities.

### Sandbox Source Workspace

- canonical editable source tree
- lives in the sandbox persistent workspace

### Workspace Content Storage

- R2-compatible prefix for workspace-specific content
- markdown files, images, metadata, future imports

### Workspace Artifact Storage

- runtime-ready workspace state
- versioned by deployment or revision

Recommended prefix layout:

```txt
workspaces/{workspaceId}/
  content/
    posts/
    assets/
    index.json
  artifacts/
    {deploymentId}/
      build/
  metadata/
    workspace.json
    deploy.json
```

## 8. Lifecycle

### Create Workspace

1. User selects `Blog`.
2. Nova creates:
   - workspace record
   - linked studio sandbox/runtime record
   - storage prefix
   - initial deployment record
3. Nova starts the studio sandbox/runtime if needed.
4. Sandbox scaffolds the `vp` React project.
5. Sandbox writes starter blog structure.
6. Sandbox writes the runtime contract and workspace files.
7. Nova publishes the workspace state.
8. Workspace becomes available on demand at the default Nova domain.

### Update Workspace

1. Agent edits the source project or content.
2. Sandbox updates the runtime contract or workspace files.
3. Nova publishes a new workspace revision.
4. Workspace switches the active deployment.

### Serve Workspace

1. Public request arrives on workspace domain.
2. frps/domain edge routes traffic.
3. Workspace runtime starts on demand, reads the stored state, and executes `runCommand`.

## 9. UI Direction

The Nova Cloud UI should present this as a workspace workflow, not a low-level runtime workflow.

### Creation UI

- choose workspace type
- create blog workspace
- show provisioning/build status

### Workspace Management UI

- current deployment status
- linked sandbox status
- default domain
- future custom domain state
- publish/rebuild actions
- integration list available to the sandbox

### Runtime Relationship

- sandbox remains visible as the technical engine
- workspace remains visible as the deployed public app

## 10. Agent Responsibilities

The agent should be able to:

- scaffold the blog project
- install packages
- create pages/components
- connect supported integrations
- fetch or generate content
- write runtime contracts
- publish updates through Nova APIs

The agent should not directly own public deployment state by itself; Nova should mediate publish and activation.

## 11. API and Data Model Direction

Expected records:

- `workspace`
  - `id`
  - `studioId`
  - `name`
  - `templateKind`
  - `sandboxId`
  - `status`
  - `defaultDomain`
  - `runtimeKind`
  - `lifecycleMode`
  - `runCommand`
  - `healthCheckPath`
  - `publicHost`

- `sandbox`
  - `id`
  - `studioId`
  - `status`
  - `runtimeType`
  - `expiresAt`

- `workspace_deployment`
  - `id`
  - `workspaceId`
  - `artifactPath`
  - `status`
  - `createdAt`
  - `activatedAt`

- `workspace_artifact`
  - `id`
  - `workspaceId`
  - `kind`
  - `path`
  - `revision`

- `workspace_content_source`
  - `workspaceId`
  - `provider`
  - `bucket`
  - `prefix`

Expected server actions:

- create workspace from template
- start or reuse the studio sandbox/runtime
- scaffold source project
- publish runtime contract and workspace files
- activate deployment on demand
- list deployments
- rebuild current workspace

## 12. Testing Strategy

### Local First

Local testing should cover:

- template creation in the sandbox
- `vp` React project generation
- package installation
- starter blog rendering
- runtime contract publication logic
- on-demand runtime execution
- workspace runtime serving the stored output locally

This is enough to validate the contract between sandbox and workspace without needing public DNS.

### VPS / Public Later

Public infrastructure testing should cover:

- public workspace hostname routing
- HTTPS issuance
- real deployment activation through frps
- on-demand scale-to-zero behavior
- custom domains later

## 13. Risks

### Overcoupling Sandbox and Workspace

Risk:

- public serving depends on a live sandbox process

Mitigation:

- always deploy from a published artifact

### Arbitrary Project Drift

Risk:

- generic sandbox freedom makes deployment behavior inconsistent

Mitigation:

- enforce template contracts for preset workspaces

### Storage Ambiguity

Risk:

- source, content, and build output get mixed together

Mitigation:

- keep distinct prefixes and record types

## 14. Phased Implementation

### Phase 1

- add `blog-react-vp` workspace plan and contract
- scaffold React `vp` blog project from sandbox
- support one runtime contract publish path
- serve default Nova workspace domain

### Phase 2

- add rebuild/publish controls in UI
- support content refresh from sandbox
- add deployment history and rollback foundation

### Phase 3

- add more templates
- add custom domains
- add scheduled content refresh and richer integration flows

## 15. Success Criteria

This plan is successful when Nova can:

- create a blog workspace from the UI
- have the studio sandbox scaffold the project with `vp`
- publish the runtime contract and workspace state
- execute the workspace on demand
- serve it from the workspace runtime
- keep the deployed site working without requiring the sandbox to remain active
