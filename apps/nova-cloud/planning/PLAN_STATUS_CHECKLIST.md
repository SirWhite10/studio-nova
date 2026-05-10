# Nova Cloud Planning Status Checklist

This file is a quick inventory of the planning docs under `apps/nova-cloud/planning/`.

Status legend:

- `Complete` = the plan's main implementation is present in the codebase
- `Partial` = some or most of the plan is implemented, but follow-up work remains
- `Open` = still a proposal or implementation is not present yet

## Implementation-Tracked Docs

- [2026-04-13-file-uploads-and-folders-plan.md](./2026-04-13-file-uploads-and-folders-plan.md) - **Complete** - shared upload manager, sidebar progress, and folder creation are implemented.
- [2026-04-19-resumable-upload-persistence-plan.md](./2026-04-19-resumable-upload-persistence-plan.md) - **Complete** - durable upload persistence, multipart upload endpoints, and resume flows are in place.
- [2026-04-22-secureexec-runtime-migration-plan.md](./2026-04-22-secureexec-runtime-migration-plan.md) - **Open** - migration is still a proposal; no SecureExec runtime provider is present.
- [2026-04-22-self-hosted-docker-runtime-plan.md](./2026-04-22-self-hosted-docker-runtime-plan.md) - **Open** - self-hosted Docker/K3s runtime is still planned, not shipped.
- [2026-04-25-nova-domain-control-frp-plan.md](./2026-04-25-nova-domain-control-frp-plan.md) - **Partial** - the domain-control/frp stack is largely implemented, but some integration follow-ups remain.
- [2026-04-28-modular-pricing-stripe-plan.md](./2026-04-28-modular-pricing-stripe-plan.md) - **Open** - pricing catalog exists, but Stripe checkout/portal/webhook enforcement is still stubbed.
- [2026-05-01-workspace-template-blog-plan.md](./2026-05-01-workspace-template-blog-plan.md) - **Partial** - blog workspace contracts and tools exist, but full template/publish flow is still evolving.
- [2026-05-06-workspace-marketplace-plan.md](./2026-05-06-workspace-marketplace-plan.md) - **Open** - marketplace catalog, install flow, and DB-backed templates are not implemented yet.
- [26-04-01-nova-cloud-surrealdb-migration-tracker.md](./26-04-01-nova-cloud-surrealdb-migration-tracker.md) - **Partial** - migration foundation is done, but the tracker still has remaining cleanup and verification items.
- [26-04-03-e2b-template-and-streaming-fix.md](./26-04-03-e2b-template-and-streaming-fix.md) - **Partial** - the core fixes are done, but the rebuild and end-to-end verification steps are still pending.
- [26-04-06-nova-cloud-agent-chat-runtime-plan.md](./26-04-06-nova-cloud-agent-chat-runtime-plan.md) - **Partial** - the runtime/chat baseline exists, but several runtime, integration, and observability goals remain.
- [26-04-22-nova-cloud-pwa-standalone-app-plan.md](./26-04-22-nova-cloud-pwa-standalone-app-plan.md) - **Open** - manifest, icons, service worker, and install UX are not implemented.
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - **Open** - broad implementation roadmap, not a completed feature plan.
- [NOVA_CHAT_SURREALDB_BETTER_AUTH_MIGRATION.md](./NOVA_CHAT_SURREALDB_BETTER_AUTH_MIGRATION.md) - **Partial** - marked approved, but it now reads as a short legacy note rather than an active migration guide.
- [NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md](./NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md) - **Open** - product/business strategy document, not an implementation tracker.
- [SKILLS_ADVANCED_SEARCH.md](./SKILLS_ADVANCED_SEARCH.md) - **Partial** - semantic search is implemented, but advanced ranking and filtering work is still in progress.
- [SKILLS_CHAT_INTEGRATION.md](./SKILLS_CHAT_INTEGRATION.md) - **Open** - slash-command autocomplete and explicit skill invocation are not implemented.
- [SKILLS_CHAT_INTEGRATION_DETAILED.md](./SKILLS_CHAT_INTEGRATION_DETAILED.md) - **Open** - detailed design doc, not shipped.
- [SKILLS_FILE_BASED.md](./SKILLS_FILE_BASED.md) - **Complete** - file-based skill loading and hot-reload behavior are implemented.
- [SKILLS_ORGANIZATION.md](./SKILLS_ORGANIZATION.md) - **Open** - tags, categories, import/export, and templates are not implemented.
- [SKILLS_SYSTEM.md](./SKILLS_SYSTEM.md) - **Complete** - core skills system, search, storage, and agent injection are implemented.
- [SKILLS_TESTING.md](./SKILLS_TESTING.md) - **Open** - test strategy exists, but the end-to-end test plan is not fully implemented.
- [SKILLS_UPGRADE_TRACKING.md](./SKILLS_UPGRADE_TRACKING.md) - **Partial** - early phases are complete, later phases remain pending.
- [STUDIOS_INFORMATION_ARCHITECTURE_PLAN.md](./STUDIOS_INFORMATION_ARCHITECTURE_PLAN.md) - **Partial** - the Studio-first structure is mostly reflected in the app, but the doc is still a canonical design reference.
- [chat-rename-implementation.md](./chat-rename-implementation.md) - **Complete** - rename UI and persistence are implemented.
- [e2b-integration.md](./e2b-integration.md) - **Open** - legacy integration guide, not a completed implementation plan.

## Short Summary

- **Complete**: file uploads/folders, resumable uploads, chat rename, core skills system, file-based skill loading
- **Partial**: frp/domain control, workspace/blog template work, E2B/streaming tracker items, skills upgrades, Studio architecture
- **Open**: SecureExec, self-hosted runtime, Stripe billing, marketplace, PWA installability, skills chat integration, skills organization/testing, and strategy-only docs
