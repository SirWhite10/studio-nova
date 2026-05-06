# Workspace Marketplace Plan

**Document Name:** `2026-05-06-workspace-marketplace-plan.md`
**Version:** 1.0
**Date:** May 6, 2026
**Last Updated:** 2026-05-06 00:00:00 UTC
**Scope:** `apps/nova-cloud`, workspace templates, marketplace UI, add-ons, integrations, pricing, agent workspace tools

## 1. Purpose

Plan the Nova workspace marketplace that will move workspace templates, add-ons, and integrations out of the Studio overview and into a dedicated app-store-like flow.

The immediate template is the existing `blog-react-vp` workspace. Today it is code-driven on the server side. The target marketplace should make templates database-backed, discoverable, priced, versioned, and actionable by both the UI and Nova agent.

## 2. Current State

The current workspace template flow is intentionally small:

- the Studio overview exposes a `Create blog workspace` action.
- `blog-react-vp` is hardcoded in server helpers.
- workspace records store the generated runtime contract and deployment state.
- templates are not yet stored as reusable database records.
- pricing pages describe workspace pricing, but workspace billing enforcement is not wired yet.
- the agent has workspace tools for list, create, contract, and action.

This is enough for proving provisioning, publishing, and previewing a workspace, but it is not enough for a real marketplace.

## 3. Target Direction

Create a marketplace surface where users can browse and install:

- workspace templates
- business add-ons
- external integrations
- bundled app presets
- future service capabilities

Examples:

- Blog
- Public website
- Staff portal
- Salon booking site
- Inventory dashboard
- Customer CRM
- Docs site
- Storefront
- Scheduled media processor
- Internal API service

The marketplace should become the primary place where new workspace types are discovered and created. The Studio overview should summarize active workspaces and suggest a few relevant options, but not become the main catalog UI.

## 4. Product Model

### Studio

The business/account context. A Studio can own multiple workspaces and one or more marketplace-enabled capabilities over time.

### Workspace

A deployed product surface under a Studio. Each workspace is created from a template or custom contract and has its own runtime contract, deployment status, pricing, and domains.

### Template

A reusable marketplace item that creates a workspace contract. Templates should eventually live in SurrealDB instead of being hardcoded.

### Add-on

A capability attached to a workspace or Studio, such as CMS, payments, bookings, staff accounts, inventory, email, analytics, or media tools.

### Integration

An external service connector such as Stripe, GitHub, Gmail, Google Drive, Slack, or domain/DNS tooling.

## 5. Database Direction

Add marketplace-focused tables after the current workspace flow is stable.

Recommended tables:

```sql
DEFINE TABLE marketplace_item SCHEMAFULL;
DEFINE FIELD itemId ON marketplace_item TYPE string;
DEFINE FIELD kind ON marketplace_item TYPE string; -- "template", "add-on", "integration", "bundle"
DEFINE FIELD title ON marketplace_item TYPE string;
DEFINE FIELD slug ON marketplace_item TYPE string;
DEFINE FIELD summary ON marketplace_item TYPE string;
DEFINE FIELD description ON marketplace_item TYPE string;
DEFINE FIELD category ON marketplace_item TYPE string;
DEFINE FIELD tags ON marketplace_item TYPE array<string>;
DEFINE FIELD images ON marketplace_item TYPE array<object>;
DEFINE FIELD featured ON marketplace_item TYPE bool;
DEFINE FIELD enabled ON marketplace_item TYPE bool;
DEFINE FIELD createdAt ON marketplace_item TYPE number;
DEFINE FIELD updatedAt ON marketplace_item TYPE number;

DEFINE TABLE workspace_template SCHEMAFULL;
DEFINE FIELD templateId ON workspace_template TYPE string;
DEFINE FIELD marketplaceItemId ON workspace_template TYPE string;
DEFINE FIELD version ON workspace_template TYPE string;
DEFINE FIELD framework ON workspace_template TYPE string;
DEFINE FIELD runtimeKind ON workspace_template TYPE string;
DEFINE FIELD lifecycleMode ON workspace_template TYPE string DEFAULT "on-demand";
DEFINE FIELD runCommand ON workspace_template TYPE string;
DEFINE FIELD healthCheckPath ON workspace_template TYPE option<string>;
DEFINE FIELD statePathPattern ON workspace_template TYPE string;
DEFINE FIELD sourcePathPattern ON workspace_template TYPE string;
DEFINE FIELD buildPathPattern ON workspace_template TYPE string;
DEFINE FIELD contentPathPattern ON workspace_template TYPE string;
DEFINE FIELD scaffold ON workspace_template TYPE object;
DEFINE FIELD pricing ON workspace_template TYPE object;
DEFINE FIELD requirements ON workspace_template TYPE object;
DEFINE FIELD enabled ON workspace_template TYPE bool;
DEFINE FIELD createdAt ON workspace_template TYPE number;
DEFINE FIELD updatedAt ON workspace_template TYPE number;

DEFINE TABLE studio_marketplace_install SCHEMAFULL;
DEFINE FIELD userId ON studio_marketplace_install TYPE string;
DEFINE FIELD studioId ON studio_marketplace_install TYPE string;
DEFINE FIELD marketplaceItemId ON studio_marketplace_install TYPE string;
DEFINE FIELD workspaceId ON studio_marketplace_install TYPE option<string>;
DEFINE FIELD status ON studio_marketplace_install TYPE string;
DEFINE FIELD createdAt ON studio_marketplace_install TYPE number;
DEFINE FIELD updatedAt ON studio_marketplace_install TYPE number;
```

The existing `workspace.templateKind` can remain as a denormalized field, but future workspaces should also store `templateId`, `templateVersion`, and `marketplaceItemId`.

## 6. Marketplace Item Data

Each marketplace card should include:

- title
- summary
- category
- tags
- featured image or preview image
- workspace size/tier
- monthly cost
- setup cost, if any
- included add-ons
- required integrations
- runtime kind
- on-demand behavior
- storage expectations
- support level

Each detail page should include:

- full description
- screenshots or generated preview images
- included pages/features
- runtime contract summary
- pricing breakdown
- required permissions
- data/storage layout
- deployment expectations
- install/create action

## 7. UI Direction

### Navigation

The existing Studio sidebar `Integrations` area should evolve into a broader marketplace entry point.

Recommended labels to evaluate:

- Marketplace
- Apps
- Add-ons
- Integrations

The final label can still group integrations, but it should support templates and add-ons too.

### Studio Overview

The Studio overview should:

- show current workspaces and status.
- suggest top marketplace items.
- link to the marketplace.
- avoid hosting the full catalog.

### Marketplace Index

Route direction:

```txt
/app/studios/[studioId]/marketplace
```

The index should support:

- search
- category filters
- featured items
- installed/available state
- template/add-on/integration grouping

### Marketplace Detail

Route direction:

```txt
/app/studios/[studioId]/marketplace/[slug]
```

The detail page should support:

- full item details
- pricing summary
- image gallery
- included capabilities
- install/create workspace action
- agent handoff prompt such as "Have Nova customize this"

## 8. Pricing Direction

Marketplace pricing should respect the current Nova pricing model:

- Studios stay free.
- Workspaces are paid public/live surfaces.
- Nova AI credits are separate from workspace hosting.
- Add-ons can attach to a workspace or Studio.
- Self-hosted options can be free on Nova's side later.

Initial workspace billing direction:

- minimum hosted workspace tier starts around `$5/month`.
- higher tiers can map to more memory, CPU, storage, custom domains, or bundled add-ons.
- workspace creation can create a draft without charging.
- workspace activation/public deployment should require an active entitlement.

Open decision:

- whether to charge at workspace creation, provision, publish, or first public activation.

Recommended first enforcement point:

- charge or verify entitlement before public activation, not before draft creation.

## 9. Agent Direction

Nova agent should eventually gain marketplace-aware tools:

- `marketplace_list`
- `marketplace_item`
- `marketplace_install`
- `workspace_create_from_template`
- `workspace_quote`
- `workspace_activate`

The agent should use the marketplace template record as the source of truth instead of hardcoded template assumptions.

Target agent flow:

```txt
User: Create a salon website with booking.
Nova:
  -> searches marketplace
  -> selects Salon Website + Booking add-on
  -> explains cost
  -> creates workspace draft
  -> provisions in sandbox
  -> asks before paid activation if needed
```

## 10. Implementation Phases

### Phase 1: Planning and Current Flow Stabilization

- keep `blog-react-vp` working.
- fix provisioning and preview UX.
- document marketplace direction.
- keep templates code-driven for now.

### Phase 2: Seeded Marketplace Catalog

- add marketplace schema.
- seed `blog-react-vp` as the first template item.
- move card content and pricing metadata into database seed data.
- keep scaffold execution server-side while metadata becomes DB-backed.

### Phase 3: Marketplace UI

- add marketplace index route.
- add item detail route.
- add create workspace from detail page.
- move "Create blog workspace" out of the overview and replace it with marketplace suggestions.

### Phase 4: Agent Marketplace Tools

- expose catalog query tools.
- allow agent to create workspace drafts from templates.
- allow agent to explain pricing and required integrations.

### Phase 5: Billing and Entitlements

- create workspace entitlement records.
- integrate checkout or credit handling.
- enforce entitlement before public activation.
- keep draft/provision flows available for unpaid planning where appropriate.

## 11. Testing Strategy

Backend:

- seed marketplace item.
- fetch catalog.
- fetch detail.
- create workspace from template.
- verify runtime contract matches template metadata.

UI:

- marketplace index loads.
- filters work.
- detail page renders pricing and included capabilities.
- create action creates a workspace draft.

Agent:

- list templates.
- inspect blog template.
- create workspace draft.
- provision workspace.

Provisioning:

- keep internal smoke coverage for create -> provision -> active deployment.
- verify warnings and build stderr are user-friendly.
- ensure preview remains unavailable until provision succeeds.

## 12. Open Questions

- Should marketplace templates be globally managed only, or can users publish private templates?
- Should add-ons be installed at Studio level, workspace level, or both?
- Should workspace drafts consume any quota before activation?
- Should marketplace detail pages include generated screenshots from actual template previews?
- Should custom templates be versioned through git, R2 artifacts, or SurrealDB records?

## 13. Next Actions

1. Finish troubleshooting current workspace provisioning.
2. Keep the overview workspace card stable.
3. Add marketplace schema and seed helpers.
4. Seed `blog-react-vp` as the first marketplace item.
5. Build marketplace index and detail routes.
6. Move workspace creation entry point from overview to marketplace after the new flow is usable.
