# Nova Cloud Root Route / App Prefix Migration Plan

> **For Hermes:** Keep this as a planning-only change set unless the user explicitly asks to execute in this thread. Prefer a separate execution thread for implementation.

**Goal:** Make `app.dlxstudios.com/` the default Nova Cloud entry so logged-out users land on auth immediately and authenticated users land on the Studio dashboard flow without the `/app` prefix.

**Architecture:** Treat this as a route-prefix migration, not just a cosmetic redirect. The current authenticated shell lives under `src/routes/(app)/app/**`, while root `/` is occupied by the landing page under `src/routes/(landing)/**`. The safest path is to move the authenticated shell to root, relocate the current landing page to a non-root marketing path, then update server redirects, client navigation helpers, and generated URLs in one pass so auth, sidebar state, chat navigation, and Studio deep links stay consistent.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, Vite+, better-auth session flow, Surreal-backed Studio state.

---

## Current State Summary

### Existing route split

- Marketing root currently lives at:
  - `src/routes/(landing)/+page.svelte`
  - `src/routes/(landing)/+page.server.ts`
- Authenticated shell currently lives under:
  - `src/routes/(app)/app/+layout.svelte`
  - `src/routes/(app)/app/+layout.server.ts`
  - `src/routes/(app)/app/+page.svelte`
- Auth routes currently redirect authenticated users to `/app`:
  - `src/routes/auth/+layout.server.ts`
  - `src/routes/auth/sign-in/+page.server.ts`
  - `src/routes/auth/sign-up/+page.server.ts`
  - `src/routes/auth/forgot-password/+page.server.ts`
  - `src/routes/auth/reset-password/+page.server.ts`
- Global auth guard currently keys off `/app` in:
  - `src/hooks.server.ts`

### Broad impact areas already confirmed

Hardcoded `/app` assumptions exist in:

- route guards (`src/hooks.server.ts`)
- auth redirects (`src/routes/auth/**/*.server.ts`)
- landing CTA links (`src/routes/(landing)/+page.svelte`)
- authenticated layout/sidebar (`src/routes/(app)/app/+layout.svelte`, `src/lib/components/app-sidebar.svelte`, `src/lib/components/nova-logo.svelte`)
- generated Studio/chat/search URLs:
  - `src/lib/server/sidebar-state.ts`
  - `src/lib/server/studio-overview-state.ts`
  - `src/lib/server/studio-jobs-state.ts`
  - `src/lib/server/surreal-integrations.ts`
  - `src/lib/server/app-search.ts`
- client-side navigation helpers:
  - `src/lib/user-store.svelte.ts`
  - `src/lib/nova/chat/chat-store.svelte.ts`
  - `src/lib/components/studios/studio-create-dialog.svelte`
  - `src/lib/components/studios/studio-switcher.svelte`
  - multiple `src/routes/(app)/app/studios/**/+page.svelte` files

---

## Recommended Product Decision

Before implementation, lock the public URL map to avoid churn during the rename.

### Proposed URL model

- `/` → authenticated app entry
  - if signed out: redirect to `/auth/sign-in`
  - if signed in: show current app home/dashboard surface
- `/studios/[studioId]` → Studio overview
- `/studios/[studioId]/chat/[chatId]` → Studio chat
- `/chats` → global chat list for current Studio context
- `/settings` → account settings
- `/skills` → global skills view
- `/landing` (or `/product`) → current marketing homepage, moved off root
- `/pricing`, `/about` can remain where they are if still needed for marketing, but links from app chrome should be reviewed

### Why this is the right shape

- Matches user expectation for an app subdomain
- Removes duplicated `/app` namespace from every internal route
- Keeps auth routes explicit and conventional
- Leaves space for separate marketing pages without making root ambiguous

---

## Implementation Plan

### Task 1: Freeze the target route map in one constants file

**Objective:** Avoid scattering route literals during migration.

**Files:**

- Create: `src/lib/routes.ts`
- Modify: callers over time to use shared helpers

**Steps:**

1. Add a tiny route helper module for root, chats, settings, studio overview, studio chat, studio sections, and auth sign-in.
2. Keep helpers dumb and string-based; do not introduce a routing abstraction framework.
3. Use this module first in the highest-churn redirect/navigation files.

**Verification:**

- `vp check` passes for the new helper file.

---

### Task 2: Move the authenticated shell from `/app` to root-path equivalents

**Objective:** Remove the `/app` segment from the authenticated route tree.

**Files:**

- Move/rename route files from `src/routes/(app)/app/**` to `src/routes/(app)/**`
- Key starting points:
  - `src/routes/(app)/app/+layout.svelte`
  - `src/routes/(app)/app/+layout.server.ts`
  - `src/routes/(app)/app/+page.svelte`
  - `src/routes/(app)/app/+page.server.ts`
  - `src/routes/(app)/app/+page.ts`

**Steps:**

1. Move the authenticated shell directory up one level so the app home becomes `/` inside the `(app)` group instead of `/app`.
2. Preserve route-group names; only remove the path segment.
3. Keep the current page components intact first; do not redesign UI during the move.
4. Re-run generated route types if needed via build/check.

**Verification:**

- Build compiles with new routes.
- Visiting the authenticated root in dev resolves to the current dashboard/home surface.

---

### Task 3: Relocate the current landing page off `/`

**Objective:** Prevent route collision with the new authenticated root.

**Files:**

- Move:
  - `src/routes/(landing)/+page.svelte`
  - `src/routes/(landing)/+page.server.ts`
- Likely target:
  - `src/routes/(landing)/landing/+page.svelte`
  - `src/routes/(landing)/landing/+page.server.ts`

**Steps:**

1. Move the current marketing page to `/landing` or another explicit marketing slug.
2. Update CTA buttons inside that page to point at the new root-based app URLs.
3. Decide whether the marketing page should still redirect authenticated users to `/` or render with “Open dashboard” buttons.

**Verification:**

- `/landing` renders existing marketing content.
- `/` no longer resolves to the marketing page.

---

### Task 4: Update global auth/session gating

**Objective:** Make root-path app pages work with the same auth behavior currently tied to `/app`.

**Files:**

- Modify: `src/hooks.server.ts`

**Steps:**

1. Replace `/app`-specific checks with route rules that cover the new root-based authenticated pages.
2. Preserve existing `/auth` and `/api` handling.
3. Decide explicitly how `/landing`, `/pricing`, `/about`, and other public pages bypass auth.
4. Ensure authenticated users hitting `/auth/sign-in` or `/auth/sign-up` redirect to `/` instead of `/app`.

**Verification:**

- Signed-out request to `/` goes to `/auth/sign-in`.
- Signed-in request to `/auth/sign-in` redirects to `/`.
- Public marketing routes remain reachable without auth.

---

### Task 5: Update all auth completion redirects

**Objective:** Ensure sign-in/sign-up/reset flows land on the new root entry.

**Files:**

- Modify:
  - `src/routes/auth/+layout.server.ts`
  - `src/routes/auth/sign-in/+page.server.ts`
  - `src/routes/auth/sign-up/+page.server.ts`
  - `src/routes/auth/forgot-password/+page.server.ts`
  - `src/routes/auth/reset-password/+page.server.ts`
  - `src/lib/user-store.svelte.ts`

**Steps:**

1. Change every successful auth redirect from `/app` to `/`.
2. Keep logout redirect going to `/auth/sign-in` unless product wants `/landing` after logout.
3. Verify both server-form actions and client-side auth helpers agree on the same destination.

**Verification:**

- Successful auth flows all resolve to `/`.
- Logout still clears session and lands on the correct public auth page.

---

### Task 6: Update generated URLs and chrome navigation

**Objective:** Remove `/app` from all server-generated and component-generated links.

**Files:**

- Modify at minimum:
  - `src/lib/server/sidebar-state.ts`
  - `src/lib/server/studio-overview-state.ts`
  - `src/lib/server/studio-jobs-state.ts`
  - `src/lib/server/surreal-integrations.ts`
  - `src/lib/server/app-search.ts`
  - `src/lib/components/app-sidebar.svelte`
  - `src/lib/components/nova-logo.svelte`
  - `src/lib/components/studios/studio-create-dialog.svelte`
  - `src/lib/components/studios/studio-switcher.svelte`
  - `src/lib/components/nova/chat/nav-nova-chat.svelte`
  - `src/lib/components/nova/chat/chat-view.svelte`
  - `src/lib/nova/chat/chat-store.svelte.ts`

**Steps:**

1. Replace `/app/studios/...` with `/studios/...`.
2. Replace `/app/chats` with `/chats`.
3. Replace `/app/settings` with `/settings`.
4. Update any regex/path parsing logic that expects `/app/studios/...`.
5. Prefer route helpers from Task 1 instead of repeating literals again.

**Verification:**

- Sidebar navigation opens the correct destinations.
- Studio switcher, create dialog, search results, and chat transitions all navigate without `/app`.

---

### Task 7: Sweep page-level hardcoded href/goto calls inside Studio routes

**Objective:** Catch direct link literals embedded in pages after the route move.

**Files:**

- Modify multiple files under:
  - `src/routes/(app)/**/+page.svelte`
  - `src/routes/(app)/**/+page.server.ts`

**Known hotspots already identified:**

- `src/routes/(app)/app/studios/[studioId]/+page.svelte`
- `src/routes/(app)/app/studios/[studioId]/settings/+page.svelte`
- `src/routes/(app)/app/studios/[studioId]/marketplace/+page.svelte`
- `src/routes/(app)/app/studios/[studioId]/runtime/+page.server.ts`
- `src/routes/(app)/app/studios/[studioId]/files/+page.svelte`
- `src/routes/(app)/app/studios/[studioId]/deployments/+page.svelte`
- `src/routes/(app)/app/chats/+page.svelte`
- related chat and jobs pages

**Steps:**

1. Search for all remaining `/app` literals after Tasks 1–6.
2. Update every `href`, `goto`, redirect, route object, and pathname regex.
3. Keep this as a cleanup pass after structural moves so the search result count trends to zero.

**Verification:**

- A full `/app` literal search only returns intentional non-route strings or deprecated notes.

---

### Task 8: Add regression checks for entry behavior

**Objective:** Prevent future regressions where root or auth pages drift back to `/app` assumptions.

**Files:**

- Add or modify tests near route/server coverage for auth and navigation
- Candidate locations depend on existing test layout in `apps/nova-cloud`

**Suggested assertions:**

1. signed-out `/` redirects to `/auth/sign-in`
2. signed-in `/auth/sign-in` redirects to `/`
3. generated Studio overview URL equals `/studios/[id]`
4. generated chat URL equals `/studios/[studioId]/chat/[chatId]`
5. sidebar “home” link points to `/`

**Verification:**

- Targeted route/navigation tests pass.

---

## Validation Commands

Run from repo root:

```bash
/home/nova/.vite-plus/bin/vp run nova-cloud#build
```

Then broader validation:

```bash
cd /home/nova/studio-nova
/home/nova/.vite-plus/bin/vp check
/home/nova/.vite-plus/bin/vp test
```

If broad monorepo validation is noisy, at minimum rerun:

```bash
cd /home/nova/studio-nova
/home/nova/.vite-plus/bin/vp run nova-cloud#build
```

---

## Recommended Execution Order

1. Add route helpers
2. Move authenticated route tree up one level
3. Move landing page off `/`
4. Update auth/session guards
5. Update auth completion redirects
6. Update generated URLs + chrome navigation
7. Sweep remaining hardcoded `/app` literals
8. Run build/check/test

---

## Risk Notes

- The biggest hidden risk is `src/hooks.server.ts`; root auth gating must not accidentally lock public marketing pages.
- The second biggest risk is regex/path parsing in `src/lib/nova/chat/chat-store.svelte.ts`.
- The third biggest risk is server-generated deep links from sidebar/search/integrations that still emit `/app/...` after the route move.
- Because this app is deployed in k3s and already live behind Cloudflare, route breakage will surface immediately. Treat full link-sweep verification as mandatory.

---

## Definition of Done

The change is done when:

- `app.dlxstudios.com/` shows auth when logged out
- `app.dlxstudios.com/` opens the app home/dashboard when logged in
- internal Studio/chat/settings URLs no longer include `/app`
- no auth flow redirects to `/app`
- `vp run nova-cloud#build` passes
- targeted navigation checks pass
