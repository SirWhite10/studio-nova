# Nova Cloud PWA Standalone App Plan

**Document Name:** `26-04-22-nova-cloud-pwa-standalone-app-plan.md`
**Version:** 1.0
**Date:** April 22, 2026
**Last Updated:** 2026-04-22 08:46:21 EDT

## Execution Tracker Rules

This document is the implementation tracker for making Nova Cloud installable as a standalone app on Android, iOS, and desktop-class browsers.

### How To Use This File

- Each checkpoint has a stable ID such as `1.a`, `3.c`, or `7.b`.
- Each checkpoint should be marked as one of:
  - `[ ]` not started
  - `[-]` in progress
  - `[x]` completed
  - `[!]` blocked
- When a checkpoint changes state, append a timestamp note directly beneath it.
- If work stops mid-feature, update only the affected checkpoint and add a short resume note.
- Do not rename checkpoint IDs once they exist. Add new suffixes if more breakdown is needed.

### Resume Rule

If an agent must stop due to limits, time, or blockers:

- mark the exact checkpoint status
- add the last meaningful change made
- add the next concrete step
- add any blocking file paths, routes, or APIs involved

This is intended to let the next agent continue without rediscovery work.

## 1. Purpose

Make Nova Cloud feel like a real installed application when saved to the Android or iOS home screen.

The goal is not only to pass PWA install checks. The installed app should feel intentional for an agent workspace:

- launch directly into `/app`
- run in standalone mode without browser chrome
- keep auth/session behavior reliable
- preserve chat, jobs, runtime, and Studio navigation expectations
- provide useful install instructions on platforms that cannot show a native install prompt
- support later app-grade features like notifications, app badges, shortcuts, and deep links

## 2. Product Principles

- Installed Nova should feel like the primary way to use the product on mobile.
- The web version and installed version should share the same code path unless a platform-specific capability requires a small branch.
- Offline support should be honest. Nova can cache the shell, but agent/runtime work requires network and backend services.
- The service worker must not corrupt auth, streaming, runtime, or mutation behavior.
- Android and iOS should both be first-class, but iOS limitations should be handled explicitly instead of hidden.
- Install prompts should be helpful and non-invasive.
- App-grade features such as notifications and badges should be opt-in, explainable, and controlled from settings.

## 3. Current State Audit

### Current Files Checked

- `src/app.html`
- `vite.config.ts`
- `static/`
- `src/routes/`

### Current Baseline

- `static/favicon.svg` exists.
- `src/app.html` has basic favicon and viewport metadata.
- No `manifest.webmanifest` is present.
- No service worker is present.
- No PNG icon set is present.
- No Apple touch icons are present.
- No Apple standalone metadata is present.
- No `theme-color` metadata is present.
- No install prompt or install instructions UI is present.
- No push notification or app badge flow is present.

### Current App Characteristics That Matter

- Nova has authenticated app routes under `/app`.
- Chat runs use server-side SSE.
- Studio events use server-side SSE.
- Runtime, sandbox, jobs, integrations, and files use authenticated APIs.
- The app has mobile-safe chat shell work already started, but installed-mode safe-area QA still needs real-device coverage.

## 4. Target Installed-App Behavior

### Android Target

- Chrome shows Nova as installable.
- Installed Nova launches in standalone mode.
- Start URL lands at `/app?source=pwa`.
- If logged out, user reaches sign-in and then returns to the app.
- App icon looks correct in Android adaptive icon masking.
- Optional long-press shortcuts expose useful actions.
- Static shell can load during transient network loss.

### iOS Target

- Safari users can use Share -> Add to Home Screen.
- Home Screen Nova launches in standalone mode.
- Status bar and safe-area behavior look intentional.
- Touch icon is crisp and not cropped.
- App does not show a broken browser-layout shell when launched standalone.
- iOS-specific install instructions explain the manual install path.
- Later Web Push and app badge support can be layered on for iOS/iPadOS 16.4+ Home Screen web apps.

### Desktop Target

- Chromium desktop can install Nova as an app.
- Manifest and icon assets work across desktop and mobile.
- Desktop installed app does not break auth or deep links.

## 5. Implementation Phases

### Phase 1: PWA Requirements Audit

[ ] `1.a` Confirm current installability baseline
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- Chrome Lighthouse or DevTools Application panel confirms current missing requirements
- current absence/presence of manifest, icons, service worker, and installability metadata is recorded
- no code changes required in this checkpoint unless documentation needs correction
  Sub-steps:
- run local app
- inspect `/app` and landing page with DevTools or browser automation
- capture current PWA audit failures
- record whether app is served over HTTPS in production and localhost in dev

[ ] `1.b` Decide PWA entry strategy
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- `start_url`, `scope`, and fallback route behavior are decided
  Recommended decision:
- `start_url`: `/app?source=pwa`
- `scope`: `/`
- logged-out launch redirects to `/auth/sign-in` and then back to `/app`
- installed-mode app should prefer authenticated Studio shell over marketing homepage
  Sub-steps:
- verify auth redirect behavior for `/app?source=pwa`
- preserve query param only if useful for analytics/install detection
- avoid using a Studio-specific start URL as the default because users may delete or switch Studios

[ ] `1.c` Define app identity and colors
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- app name, short name, theme color, background color, and icon direction are decided
  Recommended defaults:
- `name`: `Nova Cloud`
- `short_name`: `Nova`
- `theme_color`: use the primary Nova shell color, not per-Studio dynamic hue
- `background_color`: match the initial app shell background
- `display`: `standalone`
- `orientation`: omit unless a real need exists; do not force portrait by default

### Phase 2: Manifest and HTML Metadata

[ ] `2.a` Add web app manifest
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- `static/manifest.webmanifest` exists and validates
- `src/app.html` links to it
  Required fields:
- `id`
- `name`
- `short_name`
- `description`
- `start_url`
- `scope`
- `display`
- `background_color`
- `theme_color`
- `icons`
  Recommended extras:
- `categories`
- `shortcuts`
- `screenshots`
- `prefer_related_applications: false`

[ ] `2.b` Add Android-friendly manifest settings
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- Android Chrome installability audit passes for manifest requirements
  Sub-steps:
- use `display: "standalone"`
- include `192x192` and `512x512` icons
- include at least one `maskable` icon
- verify `start_url` is reachable while authenticated and unauthenticated
- verify `scope` keeps Studio/chat deep links inside the installed app

[ ] `2.c` Add iOS-specific metadata
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- `src/app.html` contains Apple standalone metadata and touch icon links
  Required tags:
- `apple-mobile-web-app-capable`
- `mobile-web-app-capable`
- `apple-mobile-web-app-title`
- `apple-mobile-web-app-status-bar-style`
- `apple-touch-icon`
  Recommended default:
- use `apple-mobile-web-app-status-bar-style="black-translucent"` only if safe-area testing confirms the app shell looks correct
- otherwise use `default` or `black`

[ ] `2.d` Add theme and browser UI metadata
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- browser UI color is intentional on Android and desktop
  Sub-steps:
- add `theme-color`
- verify dark/light behavior if Nova adds theme switching later
- avoid dynamic per-Studio theme-color until the base PWA behavior is stable

### Phase 3: Icons, Splash, and Brand Assets

[ ] `3.a` Create core PWA icon set
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- static icon assets exist and are referenced by the manifest
  Minimum assets:
- `static/icons/icon-192.png`
- `static/icons/icon-512.png`
- `static/icons/maskable-512.png`
- `static/icons/apple-touch-icon.png`
  Recommended additional assets:
- `48x48`
- `72x72`
- `96x96`
- `128x128`
- `144x144`
- `152x152`
- `167x167`
- `180x180`
- `384x384`

[ ] `3.b` Verify maskable icon safety
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- Android adaptive icon preview does not crop important logo content
  Sub-steps:
- keep important content inside the maskable safe zone
- add background color or shape that survives circular, squircle, and rounded-square masks
- test with Chrome DevTools or maskable icon preview tooling

[ ] `3.c` Add optional iOS startup images
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- decision recorded: implement startup images now or defer
  Recommendation:
- defer unless launch flash looks poor on real iOS devices
- if implemented, generate a matrix of `apple-touch-startup-image` assets for common iPhone/iPad viewport sizes
- keep this as a later polish task because the asset matrix is noisy and easy to get wrong

[ ] `3.d` Add manifest screenshots for richer install UI
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- manifest includes screenshots if supported by install surfaces
  Recommended screenshots:
- mobile chat screen
- Studio overview
- Jobs screen
- runtime/preview screen
  Notes:
- keep screenshots free of private data
- use stable demo Studio data

### Phase 4: Service Worker and Offline Boundary

[ ] `4.a` Add SvelteKit service worker
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- `src/service-worker.ts` exists and registers through SvelteKit build output
  Sub-steps:
- use SvelteKit service worker APIs for build assets
- precache immutable app shell assets
- cache manifest, icons, and favicon
- define cache versioning strategy

[ ] `4.b` Define strict cache exclusions
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- service worker does not cache unsafe dynamic routes
  Must not cache:
- `/api/chat-runs/*/stream`
- `/api/studios/*/events/stream`
- auth/session APIs
- chat send/start/stop/reconcile APIs
- sandbox/runtime mutation APIs
- file upload APIs
- scheduled-job mutation/run APIs
- integration config APIs
  Rationale:
- streaming and mutation endpoints must stay network-first and real-time
- cached auth/session responses can create dangerous false login states
- cached runtime data can mislead users about sandbox status

[ ] `4.c` Add offline fallback
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- offline navigation shows a useful fallback instead of browser failure
  Recommended fallback:
- static page explaining Nova needs internet for agent/runtime work
- show cached shell guidance if available
- do not pretend chats, jobs, or files are fully offline-capable yet
  Possible files:
- `static/offline.html`
- service worker navigation fallback

[ ] `4.d` Add safe update behavior
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- users do not get stuck on stale broken app shell assets
  Sub-steps:
- version cache names
- delete old caches during activate
- consider a small "Update available" prompt later if service worker updates need user action
- test deploy refresh behavior after build hash changes

### Phase 5: Standalone Shell and Mobile Layout Polish

[ ] `5.a` Add installed-mode detection
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- app can detect standalone mode on Android, iOS, and desktop Chromium
  Detection:
- `matchMedia("(display-mode: standalone)")`
- iOS fallback: `window.navigator.standalone`
  Use cases:
- hide install instructions once installed
- tune shell spacing if needed
- optionally record `source=pwa`

[ ] `5.b` Validate safe-area handling
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- installed Android and iOS layouts do not overlap home indicator, status bar, composer, or sidebar controls
  Surfaces to test:
- chat composer
- chat stream while keyboard is open
- Studio sidebar drawer
- Jobs page dialog
- files/upload page
- runtime preview page
- settings and integrations pages
  Implementation notes:
- prefer `100dvh`
- use `env(safe-area-inset-top)`
- use `env(safe-area-inset-bottom)`
- avoid assuming the browser address bar exists

[ ] `5.c` Keep deep links inside standalone app
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- opening Studio, chat, job, settings, and integration URLs remains inside installed app where supported
  Sub-steps:
- verify manifest `scope`
- verify internal links are same-origin relative URLs
- avoid `target="_blank"` for internal app navigation
- preserve auth redirect return paths

[ ] `5.d` Validate keyboard behavior
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- mobile keyboard does not hide the chat composer or dialog actions in installed mode
  Sub-steps:
- test Android Chrome installed app
- test iOS Home Screen app
- verify `visualViewport` issues are not present or are handled
- verify scroll restoration does not fight chat streaming

### Phase 6: Install UX

[ ] `6.a` Add Android install prompt handling
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- app can capture and trigger `beforeinstallprompt` where supported
  Recommended UI:
- subtle "Install Nova" action in app settings or sidebar footer
- not a blocking modal
- hide after dismissal for a reasonable cooldown
  Sub-steps:
- capture `beforeinstallprompt`
- store event in client state
- call `prompt()` only after explicit user action
- track accepted/dismissed outcome

[ ] `6.b` Add iOS install instructions
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- iOS Safari users see clear manual install instructions
  Recommended UI:
- show only on iOS Safari when not installed
- instructions: Share button -> Add to Home Screen
- include a small visual cue if design allows
- hide in Chrome/Firefox on iOS if behavior differs or copy should say "Open in Safari"
  Constraint:
- iOS does not support the same `beforeinstallprompt` flow as Android

[ ] `6.c` Add installed-app settings surface
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- user can tell whether Nova is installed or installable from settings
  Recommended content:
- install status
- platform-specific instructions
- notification permission status later
- badge permission/status later

[ ] `6.d` Add install analytics hooks
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- install flow can be measured without invasive tracking
  Events:
- install prompt shown
- install prompt accepted
- install prompt dismissed
- app launched with `source=pwa`
- iOS instructions viewed
  Note:
- use existing analytics approach if one exists; otherwise keep this as a deferred instrumentation task

### Phase 7: Shortcuts, Actions, and Deep App Features

[ ] `7.a` Add Android/desktop manifest shortcuts
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- manifest defines useful app shortcuts where supported
  Recommended shortcuts:
- `New Chat` -> `/app?intent=new-chat`
- `Jobs` -> `/app?intent=jobs`
- `Studios` -> `/app`
- `Files` -> `/app?intent=files`
  Notes:
- shortcuts should degrade safely when no Studio is selected
- iOS Home Screen web apps generally should not be assumed to expose Android-style long-press shortcuts

[ ] `7.b` Add shortcut intent handling
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- `intent` query params route users to useful in-app surfaces
  Sub-steps:
- choose current/default Studio if intent is Studio-scoped
- show Studio picker if no Studio exists
- open create-chat flow for `new-chat`
- route to Jobs or Files when selected Studio exists

[ ] `7.c` Evaluate Web Share Target
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- decision recorded: implement now or defer
  Possible use cases:
- share text/URLs into Nova as a new chat prompt
- share files into Studio Files
- share links into a research/job creation flow
  Risks:
- authenticated handling must be clean
- uploaded files must respect Studio selection and storage limits
- iOS support should be verified before promising this as cross-platform

[ ] `7.d` Evaluate file handling and protocol handlers
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- decision recorded for desktop/mobile app-like integrations
  Possible future capabilities:
- file handlers for supported desktop browsers
- protocol handler for `web+nova://`
- "Open in Nova" flows from generated artifacts or Studio links
  Recommendation:
- defer until the core installed app and file upload model are stable

### Phase 8: Notifications, Badges, and Background Awareness

[ ] `8.a` Design notification permission model
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- user-facing notification categories and permission UX are defined
  Notification categories:
- scheduled job completed
- scheduled job failed
- long-running agent task completed
- deployment completed
- deployment failed
- runtime unhealthy or stopped unexpectedly
- mention/team event later if collaboration is added
  Requirements:
- explicit opt-in
- per-category toggles
- quiet failure if platform does not support notifications

[ ] `8.b` Add Web Push foundation
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- architecture for push subscriptions is documented or implemented
  Requirements:
- VAPID keys or platform equivalent
- `push_subscription` persistence table
- user/device subscription management
- server-side send path
- unsubscribe/revoke path
  iOS notes:
- iOS/iPadOS Web Push requires Home Screen web app support on modern iOS versions
- do not show push promises before platform capability is detected

[ ] `8.c` Add app badge support
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- app can set and clear badges where supported
  Badge candidates:
- unread/completed agent updates
- failed scheduled jobs
- deployment failures
- pending user action count
  Notes:
- iOS Home Screen badging is tied to notification permission
- Badging API is not universal; feature-detect before use

[ ] `8.d` Add notification settings UI
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- app settings includes notification and badge controls
  UI should show:
- current permission state
- platform support state
- subscribed devices
- per-category toggles
- test notification action

[ ] `8.e` Evaluate background sync and periodic sync
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- decision recorded for offline-created actions and periodic refresh
  Possible use cases:
- queue a prompt while offline and send when online
- queue file upload retry
- refresh non-sensitive shell data
  Recommendation:
- defer for agent/runtime work
- do not attempt background agent execution from the browser; use server-side scheduled jobs instead

### Phase 9: Auth, Security, and Data Safety

[ ] `9.a` Verify auth behavior in installed mode
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- installed launch works while logged in and logged out
  Sub-steps:
- launch from Android home screen while logged in
- launch from Android home screen after session expiry
- launch from iOS Home Screen while logged in
- launch from iOS Home Screen after session expiry
- verify sign-in redirects back to intended route

[ ] `9.b` Confirm service worker security boundaries
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- service worker cache rules cannot leak or stale sensitive data
  Must verify:
- no cached auth responses
- no cached user-specific API payloads unless explicitly safe
- no cached chat messages by default
- no cached file contents by default
- no cached tool or runtime output by default

[ ] `9.c` Add PWA-specific debug visibility
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- super-admin or developer can inspect installed-mode state
  Useful diagnostics:
- standalone mode detected
- service worker registration state
- cache version
- manifest URL
- notification permission
- push subscription state
- badge support

### Phase 10: QA and Release

[ ] `10.a` Add automated installability checks
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- repeatable checks catch broken manifest/service worker basics
  Options:
- Lighthouse PWA audit
- Playwright route checks for manifest/icons/offline fallback
- simple unit/static checks for manifest JSON fields

[ ] `10.b` Real Android QA
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- Android install and standalone behavior verified on real device or reliable emulator
  Checklist:
- install prompt appears
- icon looks correct
- launch opens `/app`
- auth works
- chat composer works with keyboard
- SSE chat stream works
- Studio event stream works
- Jobs page dialog works
- offline fallback appears when network is unavailable

[ ] `10.c` Real iOS QA
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- iOS Add to Home Screen behavior verified on real iPhone/iPad
  Checklist:
- Safari instructions are accurate
- touch icon looks correct
- app launches standalone
- status bar and safe areas look correct
- auth works
- keyboard does not cover chat composer
- SSE chat and Studio streams work
- offline fallback appears when network is unavailable
- push and badging tested later only if implemented

[ ] `10.d` Production HTTPS and tunnel validation
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- production install path works on `https://nova.dlxstudios.com`
  Sub-steps:
- verify HTTPS
- verify manifest content type
- verify service worker scope
- verify icons are cacheable
- verify the edge layer does not cache dynamic APIs incorrectly
- verify deployed worker serves service worker and static assets correctly

[ ] `10.e` Rollout and rollback plan
Timestamp:

- 2026-04-22 08:46:21 EDT: checkpoint created
  Definition of done:
- release can be rolled back if the service worker causes issues
  Requirements:
- document how to unregister or neutralize a bad service worker
- use versioned caches
- keep first service worker conservative
- avoid caching dynamic authenticated content in first release

## 6. Recommended File Map

Likely files to add:

- `static/manifest.webmanifest`
- `static/offline.html`
- `static/icons/icon-192.png`
- `static/icons/icon-512.png`
- `static/icons/maskable-512.png`
- `static/icons/apple-touch-icon.png`
- `src/service-worker.ts`
- `src/lib/pwa/install-state.svelte.ts`
- `src/lib/components/pwa/install-nova.svelte`

Likely files to edit:

- `src/app.html`
- `src/routes/(app)/app/+layout.svelte`
- `src/routes/(app)/app/settings/+page.svelte`
- possibly `src/hooks.server.ts` or auth redirect helpers if return-to-route support needs tightening

## 7. Platform Constraints

### Android

- Supports install prompt through `beforeinstallprompt` in Chromium browsers.
- Supports manifest shortcuts in supported launchers/browsers.
- Requires valid manifest and suitable icons for strong installability.
- Maskable icons matter because Android adaptive icons crop aggressively.

### iOS

- Does not support the Android-style `beforeinstallprompt` flow.
- Users install manually through Safari Share -> Add to Home Screen.
- iOS standalone mode relies heavily on Apple-specific metadata and touch icons.
- Web Push and Badging are available only under platform/version/support constraints and should be feature-detected.
- Long-press manifest shortcuts should not be treated as an iOS requirement.

### Desktop

- Chromium installability generally follows manifest/service-worker expectations.
- Desktop shortcuts and richer install UI may use manifest screenshots.
- File handling/protocol handling support is browser-specific and should be treated as future enhancement.

## 8. Current Completion Snapshot

Use this section to summarize real progress when stopping work.

### Completed

- `baseline` current app audit found no manifest, service worker, PNG icon set, Apple touch icons, theme-color metadata, install prompt, or push/badge flow
- `baseline` plan file created

### In Progress

- none

### Blocked

- none recorded in this tracker yet

### Next Recommended Start Point

- Start at `1.a` by running a current PWA installability audit against the local app, then implement `2.a` and `3.a` together because manifest validation depends on icon assets.

### Stop Template

When stopping mid-implementation, append:

- `Stopped At:` timestamp
- `Active Checkpoint:` for example `2.a`
- `Last Change:` short summary
- `Next Step:` exact next action
- `Blocked By:` optional blocker
- `Files Touched:` file paths

## 9. Risks and Open Questions

- Should `start_url` always be `/app`, or should it restore the last opened Studio/chat for installed launches?
- Should Nova expose install prompts only after login, or also from the marketing homepage?
- What brand/icon source should be used for production app icons?
- Should app badges count unread chat activity, completed jobs, failed jobs, or only user-action-required events?
- Should push notifications be Studio-scoped, account-scoped, or both?
- Should offline mode eventually allow composing prompts and jobs for later sync, or should Nova remain online-only for all agent actions?
- How should service worker rollback be handled in the chosen deployment target if a bad worker ships?

## 10. Success Criteria

This plan is successful when:

- Android Chrome can install Nova Cloud from production
- iOS Safari users can add Nova Cloud to the Home Screen with accurate instructions
- installed Nova launches into the app shell in standalone mode
- app icons are crisp and not cropped on Android or iOS
- auth redirects work from installed launch
- chat streaming and Studio event SSE still work with the service worker present
- offline navigation shows an honest fallback instead of a browser error
- install UI is helpful but not intrusive
- notification and badge enhancements have a clear future path
- rollback strategy exists for service worker issues
