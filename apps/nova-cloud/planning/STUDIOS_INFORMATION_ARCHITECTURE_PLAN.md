# Nova Cloud - Studios Information Architecture Plan

**Document Type:** Product / UX Architecture Plan
**Status:** Canonical planning reference
**Version:** 1.0
**Last Updated:** March 2026

## Purpose

This document defines Nova Cloud's transition from a chat-first application shell to a Studio-first product architecture.

The goal is to make `Studio` the top-level user-facing concept in the app while preserving `sandbox` as the runtime and infrastructure term behind the scenes. This plan also establishes the sidebar model, onboarding flow, dynamic Integrations behavior, and migration path from today's chat-centric structure.

This document should be treated as the canonical reference for Studio-related information architecture, app-shell navigation, dashboard behavior, and Studio-scoped sidebar design.

## Terminology

- `Studio`
  - The top-level user-facing environment in Nova Cloud.
  - A Studio contains chats, runtime state, skills, and future capabilities like files and integrations.
- `sandbox`
  - The runtime / infrastructure backing a Studio.
  - Sandboxes remain the technical execution term and should not be the primary UX noun.
- `agent`
  - The AI execution concept.
  - This term is still technically valid, but it is not the main user-facing shell concept for the app.
- `Integrations`
  - The user-facing sidebar label for Studio-connected capabilities such as Stripe, GitHub, Notion, email, and similar features.
- `extensions`
  - The internal implementation term for the dynamic records that power Studio Integrations.

## Goals

- Make `"/app"` the real home of the authenticated product experience.
- Move Nova from a chat-first shell to a Studio-first shell.
- Scope chats to a Studio rather than treating them as the app's primary object.
- Make the middle portion of the sidebar depend on the selected Studio.
- Support dynamic `Integrations` in the Studio sidebar.
- Preserve a clean distinction between user-facing product concepts and runtime implementation details.

## Current State

Nova is currently structured around chats more than Studios.

- The sidebar primarily centers the chat list rather than a top-level Studio object.
  - `src/lib/components/nova/chat/nav-nova-chat.svelte:27`
- The authenticated app root acts like a chat-start surface instead of a Studio dashboard.
  - `src/routes/(app)/app/+page.svelte:20`
- The app layout still loads shell-level state from the older chat-session layer.
  - `src/routes/(app)/app/+layout.server.ts:14`
  - `src/lib/server/chat-store.ts:45`
- Current sandbox modeling is effectively one runtime record per user rather than a first-class Studio domain object.
  - `src/convex/schema.ts:73`
  - `src/convex/sandboxes.ts:5`

This mismatch creates a product architecture where chats feel like the top-level object even though the longer-term Nova direction is closer to a persistent environment model.

## Target State

Nova should become Studio-first.

- `Studio` is the top-level container users select and navigate.
- `Chats` are one feature inside a Studio.
- `Skills`, `Runtime`, and `Integrations` are also Studio-scoped features.
- The selected Studio changes what appears in the middle section of the sidebar.
- `"/app"` becomes a conditional welcome page or dashboard instead of a direct chat-start screen.

## Routing Model

### Root

- `"/app"`
  - If the user has no Studios: show a welcome / onboarding page.
  - If the user has one or more Studios: show a Studio dashboard.

### Studio Routes

- `"/app/studios/[studioId]"`
  - Studio overview page.
- `"/app/studios/[studioId]/chat/[chatId]"`
  - Studio-scoped conversation page.
- `"/app/studios/[studioId]/skills"`
  - Studio skills view.
- `"/app/studios/[studioId]/runtime"`
  - Runtime / sandbox state for the Studio.
- `"/app/studios/[studioId]/settings"`
  - Studio-specific settings.
- `"/app/studios/[studioId]/integrations/[integrationKey]"`
  - Dynamic route for Studio integrations such as Stripe.

### Migration Compatibility

- Existing `"/app/chat/[id]"` routes may remain temporarily for compatibility.
- Legacy chat routes should eventually redirect to Studio-scoped chat URLs once migration is complete.

## Sidebar Architecture

The sidebar should be Studio-first and divided into three functional regions.

### Top Region

- Studio switcher
- Current Studio identity
- `Create Studio` action, gated by plan / billing if needed

### Middle Region

This area changes based on the selected Studio.

- `Overview`
- `Chats`
- recent chat list
- `Skills`
- `Runtime`
- `Integrations`
- `Settings`

This middle region is explicitly not a global chats list anymore.

### Bottom Region

- Account
- Support
- Global / app-level settings

## Dynamic Integrations Model

Each Studio can have zero or more enabled integrations.

- `Integrations` is the user-facing sidebar group.
- `extensions` remains the internal implementation term.
- The `Integrations` sidebar group is dynamic and data-driven.
- Enabled integrations should appear in the selected Studio's sidebar automatically.

### Example Behavior

- A user asks Nova to connect Stripe to a Studio.
- Stripe is enabled for that Studio.
- `Stripe` appears under the Studio's `Integrations` sidebar group.

### Empty State Behavior

If a Studio has no enabled integrations:

- the `Integrations` group may be hidden, or
- it may show a lightweight `Add integration` affordance

### Internal Model Direction

The internal data model can use a concept like `extensions` or `studioExtensions`, but the UI should always say `Integrations`.

Potential future record shape:

- `studioId`
- `key`
- `title`
- `route`
- `icon`
- `enabled`
- `installedAt`
- optional provider-specific config metadata

## Onboarding Flow

If a user has no Studios:

- `"/app"` should show a welcome page
- primary CTA: `Create your first studio`
- follow with a lightweight wizard

### Wizard Direction

Suggested steps:

1. Name the Studio
2. Choose a primary purpose
   - coding
   - research
   - content
   - general
3. Create the Studio and land on its overview page

The onboarding should feel lightweight and product-guided, not like an admin setup form.

## Studio Dashboard

If the user already has one or more Studios, `"/app"` should become a dashboard.

Suggested dashboard content:

- Studio cards
- runtime status
- last active timestamp
- chat count or recent activity
- quick actions like `Open` and `New chat`

If the user has exactly one Studio, the dashboard may bias toward quickly resuming it.

## Data Model Direction

The long-term model should distinguish between product entities and runtime entities.

### Recommended Split

- `studios`
  - top-level user-facing product entity
- `sandboxes`
  - runtime / execution state tied to a Studio
- `chats`
  - conversations scoped to a Studio
- `extensions` or `studioExtensions`
  - dynamic integration records scoped to a Studio

### Recommended Relationships

- Add `studioId` to chats
- Add `studioId` to runtime / sandbox records
- Add a first-class `studios` table

This keeps the architecture clean:

- Studio = product concept
- sandbox = runtime concept
- chat = Studio feature
- integrations = Studio capabilities

## Migration Strategy

Nova already has users, chats, and runtime assumptions that predate Studios. The migration path should preserve continuity.

### Recommended Migration

1. Create one default Studio for each existing user.
2. Assign legacy chats to that default Studio.
3. Associate the user's existing sandbox / runtime with that Studio.
4. Move shell navigation to Studio-aware loading.
5. Preserve old chat routes temporarily.
6. Redirect old routes once Studio-scoped routes are stable.

This approach allows the product model to evolve without breaking continuity for existing users.

## Implementation Phases

### Phase 1 - Documentation

- Create this Studios IA plan
- Update `AGENTS.md`
- Rewrite `README.md`
- Align product planning docs with Studio terminology

### Phase 2 - Data Model

- Add `studios`
- add `studioId` to chats
- connect runtime / sandbox records to Studios
- define integration / extension records

### Phase 3 - App Shell

- Replace the chat-first sidebar model with a Studio-first shell
- add Studio switcher
- move chats under the selected Studio
- add dynamic `Integrations` group

### Phase 4 - Root Experience

- change `"/app"` to welcome-or-dashboard behavior
- add create-first-Studio onboarding wizard
- add Studio dashboard cards and quick actions

### Phase 5 - Route Migration

- add Studio-scoped routes
- preserve old chat routes temporarily
- redirect legacy routes later

## References

- `AGENTS.md`
- `README.md`
- `PLAN_CHAT_PERSISTENCE.md`
- `planning/NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md`
