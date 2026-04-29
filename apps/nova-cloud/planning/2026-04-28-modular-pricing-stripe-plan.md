# Nova Cloud Modular Pricing and Stripe Billing Plan

**Document Name:** `2026-04-28-modular-pricing-stripe-plan.md`
**Version:** 1.0
**Date:** April 28, 2026
**Last Updated:** 2026-04-28 00:00:00 UTC
**Scope:** `apps/nova-cloud`, Stripe billing, credit ledger, workspaces, add-ons, pricing routes, use-case pages

## Execution Tracker Rules

This document is the implementation tracker for changing Nova Cloud pricing from plan-first subscription tiers to modular workspace, add-on, sandbox, and AI credit billing backed by Stripe.

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
- add any blocking file paths, routes, Stripe objects, or APIs involved

This is intended to let the next agent continue without rediscovery work.

## 1. Purpose

Nova Cloud should price around what users actually consume and understand:

- Studios are free organizational containers.
- Workspaces are deployable public apps, sites, stores, blogs, portals, or internal tools.
- Add-ons are business capabilities installed onto a workspace, such as CMS, commerce, automation, email, analytics, or inventory.
- Sandboxes are optional development/build runtimes for agents and coding harnesses.
- Nova AI credits are optional hosted model usage through Nova's OpenRouter-backed model access.
- Bring-your-own-key and external coding harness flows should not incur Nova AI charges.

The goal is to avoid false "unlimited" pricing while still keeping the customer-facing model clear:

> Studios are free. Pay for live workspaces, business capabilities, optional build runtime, and optional Nova AI credits.

This replaces the earlier fixed tier framing of Starter, Pro, and Unlimited as the primary billing model. Bundles can exist later, but the billing foundation should be modular.

## 2. Product Vocabulary

### Studio

A Studio is a free container for organization and context.

Studio owns:

- chats
- memory
- skills
- integrations
- workspace list
- optional sandbox list
- billing account context
- later team membership and permissions

Studios should not be metered or sold directly.

### Workspace

A Workspace is the deployable product surface.

Examples:

- public marketing site
- ecommerce store
- blog
- creator hub
- news site
- SaaS dashboard
- booking site
- membership portal
- internal business tool
- deployed API or app backend

A Workspace can be created from integrations and templates without using a sandbox. A Workspace can also be built or modified through a sandbox when the user wants custom development.

### Sandbox

A Sandbox is the development environment that Nova agents or external coding harnesses use to build, edit, run, test, and preview code.

Important direction:

- The sandbox is moving away from E2B as the product dependency.
- The future sandbox direction is self-hosted runtime using custom Docker images.
- Existing E2B naming or traces may remain temporarily in code, but new pricing should treat sandbox as Nova runtime infrastructure, not as an E2B-specific concept.

Sandboxes are optional. A user can run a live workspace assembled from Nova capabilities without ever paying for sandbox runtime.

### Add-on

An Add-on is a paid capability attached to a workspace.

Examples:

- CMS
- commerce
- inventory control
- automation
- forms
- memberships
- email/newsletter
- analytics
- booking/scheduling
- creator video hub

Add-ons should be priced flatly with generous data caps. Do not meter normal users by database object, read, write, or internal CMS operation.

### Nova AI Credits

Nova AI credits are spent only when a user uses Nova-provided model access through Nova's provider account, currently expected to be OpenRouter.

Credits are not spent for:

- bring-your-own-key model usage
- external coding harness usage where the user logs into their own account
- local tool actions that do not call a Nova-provided model
- workspace hosting
- normal CMS reads/writes

## 3. Pricing Foundation

### Core Pricing

Initial target pricing:

| Product           |                           Price | Notes                                                                           |
| ----------------- | ------------------------------: | ------------------------------------------------------------------------------- |
| Studio            |                            Free | Unlimited organization containers                                               |
| Basic Workspace   |                           $5/mo | Hosted site/app shell, SSL, generated subdomain, generous bandwidth/storage cap |
| Pro Workspace     |                          $10/mo | Custom domain, higher traffic/storage, scheduled jobs/app routes where needed   |
| CMS Add-on        |                $10/mo/workspace | Pages, posts, media, content collections, generous content cap                  |
| Commerce Add-on   |                $20/mo/workspace | Products, inventory, cart, checkout integration, orders, discounts, customers   |
| Automation Add-on |                $10/mo/workspace | Scheduled workflows, webhooks, email hooks, recurring jobs                      |
| Sandbox Runtime   |       Optional usage or monthly | Self-hosted Docker runtime for build/development work                           |
| Nova AI Credits   | Optional subscription or top-up | Used only for Nova-provided model responses                                     |

The default business message:

> Start with a $5 workspace. Add only the capabilities your app or business needs.

### Example Packages

| Use Case                            | Components                                  | Monthly Price |
| ----------------------------------- | ------------------------------------------- | ------------: |
| Simple hosted site                  | Basic Workspace                             |            $5 |
| Blog or news site                   | Basic Workspace + CMS                       |           $15 |
| Ecommerce store                     | Basic Workspace + Commerce                  |           $25 |
| Ecommerce store with CMS            | Basic Workspace + CMS + Commerce            |           $35 |
| Creator video hub                   | Basic Workspace + CMS                       |           $15 |
| Creator hub with memberships later  | Pro Workspace + CMS + Membership Add-on     |           TBD |
| Custom app under active development | Pro Workspace + optional Sandbox Runtime    | $10 + runtime |
| Automated business portal           | Pro Workspace + CMS + Automation            |           $30 |
| Full business site                  | Pro Workspace + CMS + Commerce + Automation |           $50 |

### Commerce Anchor

Nova's commerce package should intentionally compete with entry-level Shopify-style pricing while keeping Nova's pricing modular.

Current market note:

- Shopify pricing varies by store location and billing interval.
- Current references show entry commerce pricing commonly around $30-$40/mo for a base store, with some official annual pricing variants lower depending on location and promotion.
- Nova should target the clearer message: ecommerce capability for $20/mo plus a $5/mo workspace, totaling $25/mo before optional AI or sandbox use.

Commerce Add-on should include the basic primitives a solo merchant expects:

- product catalog
- product images/media
- variants/options
- inventory control
- cart
- checkout provider connection
- orders
- customer records
- discounts/coupons
- shipping/tax configuration hooks
- basic analytics
- admin dashboard

Do not initially charge per product, order, object, CMS read, or CMS write. Use high caps and move exceptional customers to enterprise or custom credits.

Recommended initial caps:

- 10,000 products
- 100,000 CMS records
- 20 GB media/storage per workspace
- 100 GB bandwidth per workspace/month
- fair-use order volume

These caps can be adjusted after real usage data exists.

## 4. Nova AI Pricing

### AI Modes

| AI Mode                 | Nova AI Charge | Notes                                                     |
| ----------------------- | -------------: | --------------------------------------------------------- |
| Bring your own key      |   $0 AI markup | User supplies OpenRouter/OpenAI/Anthropic/xAI/etc. key    |
| External coding harness |   $0 AI markup | User logs into Codex, Cursor, Claude Code, KiloCode, etc. |
| Nova AI                 |        Credits | Uses Nova-provided OpenRouter-backed model access         |

External harnesses can still require sandbox/runtime charges if they run inside Nova infrastructure, but they should not spend Nova AI credits.

### Credit Unit

Credits should be user-facing, while Nova internally records real token and provider costs.

Recommended customer copy:

> Each Nova reply uses credits based on the model selected.

Avoid billing by "conversation" because a conversation can be long and ambiguous. Bill by completed Nova assistant response or model call group. In UI, summarize agent runs as total credits used.

Initial model classes:

| Model Class       |                   User-Facing Cost |
| ----------------- | ---------------------------------: |
| Economy/Fast      |  1 credit per completed Nova reply |
| Standard Coding   | 2 credits per completed Nova reply |
| Premium Reasoning | 5 credits per completed Nova reply |

Internal records must store:

- provider
- model
- input tokens
- output tokens
- estimated provider cost
- charged credits
- userId
- studioId
- workspaceId when applicable
- chatId/runId when applicable

### Monthly AI Credit Subscriptions

Credits can be granted monthly through subscription add-ons.

Recommended first set:

| Add-on          |  Price | Monthly Credits |
| --------------- | -----: | --------------: |
| Nova AI Lite    |  $5/mo |      10 credits |
| Nova AI Builder | $15/mo |      40 credits |
| Nova AI Pro     | $30/mo |     100 credits |

Monthly credits should reset or expire each billing cycle.

### One-Time Credit Top-Ups

Credits can also be purchased as one-time Stripe payments.

Recommended top-up packs:

| Top-up Price | Credits Granted | Effective Price |
| -----------: | --------------: | --------------: |
|          $10 |      20 credits |    $0.50/credit |
|          $25 |      60 credits |    $0.42/credit |
|          $50 |     140 credits |    $0.36/credit |
|         $100 |     320 credits |    $0.31/credit |

Top-up credits should roll over and be spent after monthly credits.

Spend order:

1. monthly credits
2. purchased top-up credits

Example:

```txt
User has Nova AI Builder:
Monthly credits: 40

User buys $25 top-up:
Purchased credits: 60

User spends 45 credits:
Monthly credits remaining: 0
Purchased credits remaining: 55
```

Customer-facing copy:

> Monthly AI credits reset each billing cycle. Top-up credits roll over and are used after monthly credits run out.

## 5. Stripe-Only Billing Direction

Nova should use Stripe only for v1 billing.

Do not implement PayPal, Polar, Lemon Squeezy, Paddle, or other payment providers in this phase.

Stripe owns:

- customers
- payment methods
- checkout
- subscriptions
- invoices
- receipts
- customer portal
- one-time top-up payments
- webhook event delivery
- optional Stripe Tax later

Nova owns:

- product catalog mirror
- entitlement records
- workspace/add-on access
- credit ledger
- usage ledger
- AI credit spending rules
- sandbox usage records
- provider cost tracking
- admin adjustments

Stripe should not receive one invoice item per AI message or tiny internal usage event. Nova should aggregate and account internally.

### Stripe Product Shape

Create Stripe products/prices for:

- Basic Workspace recurring monthly
- Pro Workspace recurring monthly
- CMS Add-on recurring monthly
- Commerce Add-on recurring monthly
- Automation Add-on recurring monthly
- Nova AI Lite recurring monthly
- Nova AI Builder recurring monthly
- Nova AI Pro recurring monthly
- Credit Top-up $10 one-time
- Credit Top-up $25 one-time
- Credit Top-up $50 one-time
- Credit Top-up $100 one-time

Each Stripe price should map to a local `billing_catalog` product key, not be hard-coded throughout route handlers.

### Checkout Metadata

Checkout sessions should include metadata that allows webhook processing without guesswork:

```txt
userId
studioId
workspaceId
kind = workspace_subscription | addon_subscription | ai_subscription | credit_topup
productKey
creditGrant
```

### Webhook Rules

- Verify Stripe webhook signatures.
- Store Stripe event IDs for idempotency.
- Do not grant credits from frontend success redirects.
- Grant credits only after trusted webhook confirmation.
- Update subscriptions from webhook events, not only from immediate checkout response.
- Treat frontend redirects as UI hints and refresh server state.

## 6. Data Model

### billing_account

Tracks the Stripe customer relationship.

```txt
billing_account
- userId
- stripeCustomerId
- defaultCurrency
- createdAt
- updatedAt
```

### subscription_entitlement

Tracks active recurring access.

```txt
subscription_entitlement
- userId
- studioId?
- workspaceId?
- stripeSubscriptionId
- stripeSubscriptionItemId?
- productKey
- status
- currentPeriodStart
- currentPeriodEnd
- cancelAtPeriodEnd
- createdAt
- updatedAt
```

### credit_ledger

Append-only credit accounting.

```txt
credit_ledger
- userId
- studioId?
- workspaceId?
- kind // monthly_grant, topup, usage, refund, adjustment, expiration
- bucket // monthly, purchased
- credits // positive or negative
- source // stripe_invoice, stripe_checkout, ai_message, admin, expiration_job
- sourceId
- expiresAt?
- metadata?
- createdAt
```

Balance should be computed from the ledger or cached with reconciliation. Do not rely only on a mutable `balance` field.

### usage_ledger

Records the underlying resource usage.

```txt
usage_ledger
- userId
- studioId?
- workspaceId?
- kind // ai_reply, sandbox_runtime, workspace_hosting, storage, bandwidth
- quantity
- unit
- creditsCharged
- providerCostUsd?
- sourceId
- metadata?
- createdAt
```

### workspace_billing_state

Tracks workspace subscription state and installed add-ons.

```txt
workspace_billing_state
- userId
- studioId
- workspaceId
- workspaceTier // basic, pro
- status
- activeAddons // cms, commerce, automation, etc.
- currentPeriodEnd
- createdAt
- updatedAt
```

## 7. Current Codebase Impact

Current relevant files:

- `src/lib/server/surreal-plans.ts`
- `src/lib/server/runtime-limits.ts`
- `src/routes/api/user-plans/+server.ts`
- `src/routes/api/billing/+server.ts`
- `src/routes/(landing)/+page.svelte`
- `src/routes/(app)/app/studios/[studioId]/settings/+page.svelte`
- `surreal/schema.surql`
- `src/lib/server/surreal-tables.ts`

Current known issues:

- `user_plan` only supports `free | pro`.
- runtime limits are plan-first instead of entitlement/usage-first.
- `/api/user-plans` allows manual plan mutation and should not be a normal user upgrade path.
- `/api/billing` is currently a placeholder.
- landing page pricing still reflects older fixed plan language.
- settings page has an instant Pro upgrade path and disabled subscription management.

Migration direction:

- Keep `user_plan` compatibility temporarily for existing runtime behavior.
- Add new billing tables and catalog.
- Stop using `/api/user-plans` as customer-facing upgrade path.
- Move plan display to entitlements and workspace/add-on status.
- Gradually map old `pro` users into equivalent entitlements or admin-granted credits.

## 8. Pricing Page and Route Architecture

Nova should have a dedicated pricing route instead of explaining everything only on the homepage.

### Initial Routes

```txt
/pricing
/pricing/workspaces
/pricing/add-ons
/pricing/ai-credits
/pricing/sandbox
/pricing/examples
```

The landing page should keep a compact pricing section and link to `/pricing` for the full explanation.

### `/pricing`

Primary pricing overview.

Should explain:

- Studios are free.
- Workspaces start at $5/mo.
- Add-ons attach to workspaces.
- Sandboxes are optional for building.
- Nova AI credits are optional.
- BYOK and external coding harnesses do not spend Nova AI credits.

This page should include a simple pricing calculator or example cards once the catalog is implemented.

### `/pricing/workspaces`

Detailed workspace pricing.

Should explain:

- Basic Workspace
- Pro Workspace
- generated domains
- custom domains
- hosting caps
- what counts as a workspace
- how workspace billing differs from Studio organization

### `/pricing/add-ons`

Detailed add-on pricing.

Initial add-on pages or sections:

- CMS
- Commerce
- Automation
- Forms
- Memberships
- Email/newsletter
- Analytics
- Booking/scheduling

This page should be explicit that normal CMS/database operations are not metered per object/read/write for typical users.

### `/pricing/ai-credits`

Detailed Nova AI pricing.

Should explain:

- BYOK
- external harnesses
- Nova AI credits
- monthly credit subscriptions
- top-up credit packs
- spend order
- model classes
- examples of credit use

### `/pricing/sandbox`

Detailed sandbox/runtime pricing.

Should explain:

- sandbox is optional
- workspace can exist without sandbox
- sandbox is for development/build runtime
- external coding harnesses can run through the sandbox if supported
- future direction is self-hosted Docker runtime
- runtime billing should be separate from workspace hosting

### `/pricing/examples`

Use-case examples with clear component breakdowns.

This page can later become the foundation for a broader top-nav "Use Cases" menu.

## 9. Use-Case Page Foundation

The product should eventually include a visible desktop/mobile navigation area for "Use Cases" or "Solutions".

Preferred label candidates:

- Use Cases
- Solutions
- Examples
- For Creators
- For Businesses

"Use Cases" is the clearest functional label for now.

Each use-case page should describe:

- the user's goal
- what Nova builds or hosts
- recommended workspace/add-ons
- optional AI and sandbox needs
- expected monthly price range
- benefits versus assembling separate tools

### Initial Use Cases

Create pricing examples and later dedicated pages for:

- Creator video hub for YouTube, Twitch, TikTok, and livestream archives
- Streamer link-in-bio plus video archive
- Podcast website with episode pages and newsletter capture
- Personal blog
- Local news website
- Niche newsletter and paid content portal
- Clothing brand ecommerce store
- Digital product store
- Restaurant website with menu and ordering link
- Appointment booking site for salons, coaches, tutors, or consultants
- Fitness trainer client portal
- Real estate listing microsite
- Event landing page with ticketing integration
- Course creator site
- Artist portfolio and print shop
- Photographer gallery and booking site
- Musician site with merch and tour dates
- Community membership portal
- Small SaaS marketing site and docs
- Internal company dashboard
- Client portal for agencies
- Inventory tracker for small retailers
- Job board or directory site
- Nonprofit donation and updates site
- Church/community organization site
- School club or sports team site
- AI-powered support knowledge base
- Product waitlist and launch page
- Multi-brand landing page portfolio

### Example Price Breakdowns

Creator video hub:

```txt
Basic Workspace: $5/mo
CMS Add-on: $10/mo
Total: $15/mo
Optional Nova AI Lite: +$5/mo
```

Clothing store:

```txt
Basic Workspace: $5/mo
Commerce Add-on: $20/mo
Total: $25/mo
Optional CMS Add-on for lookbooks/blog: +$10/mo
```

News website:

```txt
Pro Workspace: $10/mo
CMS Add-on: $10/mo
Automation Add-on: $10/mo
Total: $30/mo
```

Custom web app:

```txt
Pro Workspace: $10/mo
Sandbox Runtime: usage-based or monthly
Nova AI credits: optional
Total: $10/mo + build/runtime usage
```

Full business site:

```txt
Pro Workspace: $10/mo
CMS Add-on: $10/mo
Commerce Add-on: $20/mo
Automation Add-on: $10/mo
Total: $50/mo
```

## 10. Implementation Phases

### Phase 1: Catalog and Terminology

[ ] `1.a` Create local billing catalog
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- local catalog defines workspaces, add-ons, Nova AI subscriptions, and top-up packs
- catalog includes Stripe lookup keys or price env names
- catalog is imported by server routes and pricing UI
- no hard-coded Stripe price IDs outside the catalog

[ ] `1.b` Update product terminology
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- docs and UI distinguish Studio, Workspace, Sandbox, Add-on, and Nova AI credits
- landing page stops implying sandboxes are required for every workspace
- pricing copy says Studios are free

[ ] `1.c` Decide workspace tier names
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- Basic Workspace and Pro Workspace are confirmed or renamed
- pricing catalog and page copy use the final names consistently

### Phase 2: Stripe Billing Infrastructure

[ ] `2.a` Add Stripe dependency and env configuration
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- Stripe SDK is installed through `vp add`
- `.env.example` includes Stripe secret key, webhook secret, and public price configuration
- server env loader exposes Stripe configuration

[ ] `2.b` Implement billing account persistence
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- `billing_account` table is ensured
- helper can get or create Stripe customer for a Nova user
- helper stores and reuses `stripeCustomerId`

[ ] `2.c` Implement Stripe Checkout routes
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- route creates checkout session for workspace subscription
- route creates checkout session for add-on subscription
- route creates checkout session for Nova AI subscription
- route creates checkout session for one-time credit top-up
- route validates requested product against local catalog

[ ] `2.d` Implement Stripe Customer Portal route
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- authenticated user can open Stripe portal
- portal redirects back to app settings or billing page
- portal route does not create duplicate Stripe customers

[ ] `2.e` Implement Stripe webhook route
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- route verifies webhook signature
- route stores processed event IDs
- route updates entitlements from subscription events
- route grants monthly credits from paid subscription invoices
- route grants purchased credits from completed top-up checkout
- duplicate webhook delivery does not double-grant credits

### Phase 3: Credit Ledger

[ ] `3.a` Add credit ledger persistence
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- `credit_ledger` table exists
- helpers can append grants, usage, refunds, adjustments, and expirations
- helpers can compute monthly, purchased, and total balances

[ ] `3.b` Implement credit spend order
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- monthly credits spend before purchased credits
- spending records source usage IDs
- failed AI calls do not charge or are refunded

[ ] `3.c` Record provider cost data
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- Nova AI usage records provider, model, token counts, estimated provider cost, and charged credits
- cost data is internal and not required for customer-facing billing

### Phase 4: Workspace and Add-on Entitlements

[ ] `4.a` Add workspace billing state
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- workspace billing state records tier, status, add-ons, and period end
- workspace access can be checked from server routes
- missing billing state resolves to free/draft behavior where appropriate

[ ] `4.b` Add add-on entitlement checks
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- CMS features check CMS entitlement
- commerce features check Commerce entitlement
- automation features check Automation entitlement
- disabled/missing entitlement produces an upgrade path, not a crash

[ ] `4.c` Remove customer-facing manual plan mutation
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- `/api/user-plans` no longer lets normal users grant themselves paid access
- super-admin or development-only path remains only if explicitly guarded
- settings page uses Stripe checkout/portal instead of manual plan toggles

### Phase 5: Pricing Pages

[x] `5.a` Build `/pricing` overview route
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
- 2026-04-28 15:50:00 UTC: built `/pricing` overview route using shared pricing catalog and reusable pricing components.
  Definition of done:
- route exists under landing/public routes
- page explains Studios, Workspaces, Add-ons, Sandboxes, and Nova AI credits
- page links to detailed pricing subpages
- landing page links to `/pricing`

[x] `5.b` Build pricing detail subpages
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
- 2026-04-28 15:50:00 UTC: built `/pricing/workspaces`, `/pricing/add-ons`, `/pricing/ai-credits`, and `/pricing/sandbox`.
  Definition of done:
- `/pricing/workspaces` exists
- `/pricing/add-ons` exists
- `/pricing/ai-credits` exists
- `/pricing/sandbox` exists
- each page uses shared catalog data where practical

[x] `5.c` Build `/pricing/examples`
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
- 2026-04-28 15:50:00 UTC: built `/pricing/examples` with package examples and broad use-case cards.
  Definition of done:
- examples page includes several use cases and component price breakdowns
- examples include creators, streamers, ecommerce, blogs, news, services, and custom apps
- examples make clear when sandbox and Nova AI are optional

### Phase 6: Use-Case Navigation Foundation

[x] `6.a` Define use-case content model
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
- 2026-04-28 15:50:00 UTC: added reusable `src/lib/pricing/use-cases.ts` content model used by pricing examples.
  Definition of done:
- use cases can be represented as structured data
- each use case includes title, audience, benefits, recommended products, estimated price, and route slug
- pricing examples can reuse the same data

[ ] `6.b` Add first use-case landing pages
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- at least 4 use-case pages exist
- recommended starting set: creator hub, ecommerce store, blog/news site, custom app
- pages are designed as useful landing pages, not just text dumps

[ ] `6.c` Add top navigation entry
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- desktop nav exposes Use Cases or equivalent label
- mobile nav exposes same content cleanly
- navigation does not crowd the existing landing header

### Phase 7: Validation

[ ] `7.a` Add billing unit tests
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- catalog validation is covered
- credit ledger grants/spends are covered
- webhook idempotency is covered
- entitlement resolution is covered

[ ] `7.b` Add route/API tests
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- checkout route rejects unknown products
- checkout route requires authentication
- webhook rejects invalid signatures
- portal route requires authentication

[ ] `7.c` Run project validation
Timestamp:

- 2026-04-28 00:00:00 UTC: checkpoint created
  Definition of done:
- `vp check` passes
- `vp test` passes
- any skipped tests or blocked checks are documented in this file

## 11. Open Decisions

[ ] `D1` Decide whether purchased top-up credits never expire or expire after 12 months.

Recommendation:

- start with no expiration for customer simplicity
- reserve the right to add expiration later for inactive/abandoned balances if accounting requires it

[ ] `D2` Decide whether Workspace Basic includes custom domains.

Recommendation:

- Basic includes generated Nova subdomain
- Pro Workspace includes custom domain
- custom domain can later be a small add-on if needed

[ ] `D3` Decide whether Nova AI monthly credits can be shared across all Studios and Workspaces.

Recommendation:

- account-level credits shared across all Studios for simplicity
- usage records still include Studio/Workspace for reporting

[ ] `D4` Decide sandbox pricing unit.

Recommendation:

- defer until self-hosted Docker runtime costs are known
- keep sandbox pricing separate from workspace and AI billing
- avoid exposing CPU/RAM complexity early

[ ] `D5` Decide first four public use-case pages.

Recommendation:

- Creator Hub
- Ecommerce Store
- Blog and News Site
- Custom App Builder

## 12. Initial Implementation Notes

- Use `vp install` after pulling remote changes before implementation work.
- Use `vp add stripe` instead of package-manager-specific commands.
- Use `vp check` and `vp test` for validation.
- Keep existing dirty worktree changes intact.
- Do not remove existing `user_plan` behavior until replacement entitlement checks are wired.
- Do not let client redirects grant paid credits or paid access.
- Keep Stripe IDs in env/config/catalog mappings, not scattered through route files.
