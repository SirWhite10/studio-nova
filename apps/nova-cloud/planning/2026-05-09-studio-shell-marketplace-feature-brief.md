# Nova Cloud Consolidated Feature Brief

**Document Name:** `2026-05-09-studio-shell-marketplace-feature-brief.md`  
**Document Type:** Proposed feature brief for Spec Kit input  
**Status:** Draft  
**Date:** 2026-05-09  
**Scope:** `apps/nova-cloud`

## 1. Purpose

This document consolidates the relevant open and partial planning work in
`apps/nova-cloud/planning/` into one proposed feature brief for the next
Spec Kit workflow.

It intentionally does **not** replace or delete the existing planning files.
Instead, it extracts only the implementation work that still appears necessary
based on:

- the planning status checklist
- the current codebase
- the additional primary requirements provided by the user

This brief is meant to serve as the input for `/speckit-specify`.

## 2. Source Plans Used

Primary source plans:

- `planning/STUDIOS_INFORMATION_ARCHITECTURE_PLAN.md`
- `planning/2026-05-06-workspace-marketplace-plan.md`
- `planning/2026-05-01-workspace-template-blog-plan.md`
- `planning/26-04-06-nova-cloud-agent-chat-runtime-plan.md`
- `planning/NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md`
- `planning/SKILLS_ORGANIZATION.md`

Supporting design reference:

- `packages/design/DESIGN.md`

Current implementation references reviewed:

- `src/routes/(app)/app/+layout.svelte`
- `src/lib/components/app-sidebar.svelte`
- `src/lib/components/studios/studio-sidebar-nav.svelte`
- `src/lib/server/sidebar-state.ts`
- `src/routes/api/app/sidebar-state/+server.ts`
- `src/routes/(app)/app/settings/+page.svelte`

## 3. Current Baseline To Retain

The following capabilities already exist in some form and should be reused,
refined, or re-homed rather than rebuilt from scratch:

- Studio-aware app shell and selected-studio loading
- Studio summaries and integration-aware sidebar state loading
- server-driven sidebar refresh and Studio event stream updates
- Studio theme hue plumbing in the app layout
- Studio chats, runtime records, integrations scaffolding, and workspace/domain
  server modules
- file uploads, folder creation, resumable upload persistence, and core skills
  system

Completed work that is **not** the target of this brief:

- file upload pipeline reimplementation
- resumable upload persistence reimplementation
- chat rename reimplementation
- core file-based skills system reimplementation

This brief should only include the missing product shell, data model, and UI
work needed to unify those pieces into the intended Nova Cloud experience.

## 4. Proposed Feature Name

`studio-shell-marketplace-overhaul`

## 5. Feature Summary

Overhaul the authenticated Nova Cloud app shell into a fully Studio-first,
reorderable, shadcn-aligned workspace experience built on the newer
`sidebar-7` pattern.

The result should unify agent capabilities, workspace/deployment management,
integrations, content/files, settings, support, and search into one coherent
navigation system per Studio, while preserving already-shipped runtime, file,
and data foundations.

## 6. Primary User Outcomes

Users should be able to:

- open a Studio and navigate a modern, collapsible icon-capable sidebar
- rearrange Studio sidebar sections and items to match how they work
- access grouped agent capabilities such as chat, skills, agents, memory, and jobs
- access grouped workspace and sandbox capabilities such as deployments,
  domain configuration, sandbox package/library management, and related controls
- open a dynamic integrations area and launch the new marketplace from a `+`
  action in that section header
- use a built-in `Content` section with `Files` and future CMS-oriented tools
- see live user/account information in the sidebar footer instead of sample data
- use a global search entry below the logo and above navigation, styled like a
  modern embedded search surface similar to Algolia patterns
- use content pages that keep the top bar sticky and avoid horizontal overflow
- manage Studio settings in a modern tabbed page with save/cancel actions
- apply finer-grained theme customization while remaining within a consistent
  shadcn-compatible design system

## 7. In-Scope Capability Areas

### A. Studio App Shell Overhaul

Replace the current flatter Studio sidebar with the newer `sidebar-7` pattern.

Required behavior:

- collapsible desktop sidebar with icon-only collapsed state
- mobile behavior that remains usable and consistent with the same nav model
- logo/header area at the top
- global search directly below the logo
- grouped section architecture rather than a mostly flat list
- sticky or fixed top bar/breadcrumb area independent from page content scroll

### B. Studio-Scoped Navigation Model

The main Studio sidebar should be reorganized into explicit sections.

Required top-level sections:

- `Agent`
- `Workspace & Sandbox`
- `Integrations`
- `Content`

Required initial submenu direction:

- `Agent`
  - Chat
  - Skills
  - Agents
  - Memory
  - Jobs
- `Workspace & Sandbox`
  - Deployments
  - Sandbox
  - additional workspace/runtime-related items as needed for current flows
- `Integrations`
  - installed integrations
  - possible integration-specific sub-items where appropriate
- `Content`
  - Files
  - future CMS-related options

Global items near the bottom should remain:

- Settings
- Support

These should stay visually close to the bottom even if Studio-specific main
sections are reorderable.

### C. Reorderable Sidebar Persistence

Sidebar order should become Studio-specific persisted state.

Required data behavior:

- persist sidebar section ordering in the database
- persist child item ordering in the database where the item is user-reorderable
- load that order as part of Studio sidebar state
- preserve sensible defaults for newly created Studios
- support fallback when stored navigation references an item that is disabled,
  unavailable, or not yet configured

This is broader than the current selected-studio cookie behavior. The source of
truth should move to the app's durable data model.

### D. Content Section and Storage Surface

Introduce `Content` as a built-in Studio capability rather than leaving files as
an isolated nav item.

Required behavior:

- `Content` appears as its own top-level section
- `Files` is its first shipped sub-item
- existing file upload and folder capabilities are surfaced through this section
- users can see the included free storage amount of `2 GB`
- the product model should be ready for future CMS-oriented content surfaces

This should reuse current file infrastructure rather than replacing it.

### E. Integrations and Marketplace Entry

The integrations area should evolve from a passive list into an actionable
capability section.

Required behavior:

- `Integrations` section header includes a trailing `+` action
- that action opens or routes to the new marketplace flow for extensions and integrations
- installed integrations remain visible inside the section
- integrations may expose sub-items where the product surface needs them

This work should align with the marketplace direction already defined in
`2026-05-06-workspace-marketplace-plan.md`, but this brief only includes the
parts needed for the Studio shell and first marketplace entry experience.

### F. Workspace, Deployment, and Sandbox Management

The app shell should make workspace and sandbox management first-class.

Required behavior:

- `Deployments` becomes the main management surface for workspaces and domain configuration
- `Sandbox` becomes the main surface where users manage package/library additions
  and other sandbox functions
- the shell language should distinguish clearly between Studio, Workspace,
  Deployment, and Sandbox
- existing workspace and runtime infrastructure should be surfaced through
  clearer product navigation

This work should build on the workspace/blog and runtime plans rather than
redefining those systems.

### G. Global Search

Add a global search entry beneath the logo and before the sidebar items.

Required behavior:

- visually similar to a modern embedded site/app search input
- inspired by the feel of Algolia-style embedded search experiences
- available globally within the authenticated app shell
- capable of becoming the future entry point for searching Studios, chats,
  skills, files, integrations, pages, and marketplace items

This brief includes the shell UX and integration point. Full search coverage
across every domain can be phased if necessary, but the search component itself
must ship as part of the overhaul.

### H. Page-Shell and Overflow Fixes

The app shell must address the current layout issues called out by the user.

Required behavior:

- breadcrumbs/top bar remain sticky or fixed at the top
- page content scroll does not move the shell header out of place
- long text and wide content do not cause page-level horizontal overflow on
  mobile or desktop
- the shell and page containers handle responsive overflow cleanly
- layout consistency across content pages improves materially

This is not cosmetic-only. It is part of the functional overhaul.

### I. Design System Realignment

The content pages should be brought into stronger alignment with the design
direction in `packages/design/DESIGN.md` while staying compatible with shadcn UI
primitives already in the repo.

Required behavior:

- heavily reuse existing shadcn components rather than ad hoc custom page code
- keep a coherent visual language across overview, settings, integrations,
  workspace, and content pages
- preserve user theme customization, but make it more fine-grained for users
  who need branding alignment
- express the Aura Gold design direction through tokens, page composition, and
  component styling without breaking shadcn behavior

The goal is not a separate bespoke design system. The goal is a consistent Nova
skin on top of the component system already in use.

### J. Studio Settings Redesign

The current settings page is too generic and under-scoped.

Required behavior:

- settings become explicitly Studio-related
- use a tabbed layout
- group settings by meaningful Studio domains instead of miscellaneous sections
- include modern bottom actions such as `Save` and `Cancel`
- align the page structure and controls with the updated design system

Theme and branding controls should likely live here.

### K. Live Sidebar User Footer

The sidebar footer currently follows sample-code structure and placeholder data.

Required behavior:

- show real authenticated user identity
- keep the interactive account menu live and useful
- align footer actions with actual Nova account/billing/support surfaces where available

This should replace placeholder hardcoded user values returned by the sidebar
state loader.

## 8. What This Brief Intentionally Excludes

The following should not be treated as primary implementation targets for this
feature brief unless later pulled in explicitly during Spec Kit clarification:

- redoing completed file upload and resumable upload internals
- redoing the existing core skills storage/hot-reload foundation
- SecureExec migration
- self-hosted Docker/K3s runtime delivery
- Stripe billing enforcement rollout
- PWA installability work
- full marketplace data model and every marketplace item type
- full skill import/export/templates work from `SKILLS_ORGANIZATION.md`
- explicit slash-command chat skill invocation from `SKILLS_CHAT_INTEGRATION.md`

These may remain related future work, but they are not required to deliver the
Studio shell overhaul defined here.

## 9. Implementation Notes From Existing Plans

This brief should inherit and preserve these existing directions:

- `Studio` remains the primary user-facing shell concept
- `Sandbox` remains an infrastructure/runtime term, not the main product noun
- `Workspace` remains the deployable product surface
- `Integrations` remains the user-facing label even if internal records still
  use extension-oriented terms
- workspace creation and deployment should continue moving toward the marketplace
  and deployment model already planned
- runtime, jobs, memory, artifacts, and integrations remain Studio-scoped

## 10. Candidate Acceptance Shape For Specification

The resulting specification should likely include user stories covering at least:

- reordering and persisting Studio navigation
- navigating grouped Agent, Workspace & Sandbox, Integrations, and Content areas
- opening the marketplace from the integrations header
- managing Studio settings and theme controls
- using sticky top navigation and improved responsive page layouts
- viewing live account info and global search from the shell

## 11. Recommended Spec Kit Input

Suggested natural-language feature prompt for `/speckit-specify`:

> Overhaul Nova Cloud's authenticated Studio shell using the newer collapsible
> sidebar-7 pattern. Consolidate the partial Studio-first, marketplace, runtime,
> and workspace plans into one implementation. The sidebar must support grouped
> Studio sections for Agent, Workspace & Sandbox, Integrations, and Content;
> allow per-Studio reordering persisted in the database; show a global search
> below the logo; keep settings and support near the bottom; and expose a `+`
> action on Integrations that opens the marketplace flow. Content is a built-in
> section with Files and future CMS options, and users get 2 GB of free storage.
> The top bar must stay sticky, long content must stop causing layout overflow,
> the sidebar user footer must use live account data, and content pages must be
> realigned to the Aura Gold design direction from `packages/design/DESIGN.md`
> while heavily reusing shadcn components. Studio settings should become a
> tabbed, modern save/cancel page with more fine-grained theme customization.
