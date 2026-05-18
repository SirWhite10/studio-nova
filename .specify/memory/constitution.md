<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Modified principles:
  - Project name set to Nova Cloud Studio-First Product Constitution
  - Studio-First Information Architecture
  - State-Driven Page Design
  - Action-First Copy and Transparent Economics
  - Data-Driven Controls and Surface Discovery
  - Modern Svelte Implementation and Accessibility
- Added sections:
  - Product and UX Standards
  - Delivery and Quality Gates
- Removed sections:
  - Placeholder template comments and bracket tokens
- Reviewed dependent templates and guidance:
  - ✅ /.specify/templates/plan-template.md
  - ✅ /.specify/templates/spec-template.md
  - ✅ /.specify/templates/tasks-template.md
  - ✅ /.specify/templates/checklist-template.md
  - ✅ /.specify/extensions/git/commands/speckit.git.initialize.md
  - ✅ /.specify/extensions/git/commands/speckit.git.feature.md
  - ✅ /.specify/extensions/git/commands/speckit.git.commit.md
  - ✅ /home/nova/studio-nova/AGENTS.md
- Follow-up TODOs:
  - None
-->

# Nova Cloud Studio-First Product Constitution

## Core Principles

### I. Studio-First Information Architecture

Nova Cloud MUST present the Studio as the primary user-facing unit. Navigation,
page hierarchy, and copy MUST reinforce that chats, agents, runtime, files, and
integrations belong to a Studio rather than to an anonymous app shell. Root and
landing surfaces MAY orient users, but operational pages MUST make the selected
Studio obvious and keep the current context stable.

### II. State-Driven Page Design

Each page MUST be designed around explicit UI states: empty, populated, loading,
and error. The empty state MUST be purposeful and action-oriented, while the
populated state MUST collapse unnecessary explanatory content and focus on the
current objects, controls, and next actions. Different object counts MAY change
emphasis, but they MUST NOT require a different page model.

### III. Action-First Copy and Transparent Economics

Product copy MUST help users act quickly and avoid wordy explanations. Education
belongs below the primary action path unless the user is in an onboarding or
empty state. Pricing, credit usage, and bring-your-own-capability options MUST be
explained clearly and neutrally so users understand tradeoffs without being
nudged toward a single billing path.

### IV. Data-Driven Controls and Surface Discovery

Search, filters, grouping, and sorting MUST derive from the actual data exposed
by the loaded records. Controls MAY be dynamic and faceted, but they MUST be
backed by real fields or computed metadata rather than hardcoded UI assumptions.
When a feature exposes multiple records, the interface MUST make the most
important discovery tools visible, predictable, and responsive.

### V. Modern Svelte Implementation and Accessibility

New Nova Cloud UI MUST use modern Svelte patterns, runes mode, and data flow
that keeps state local and predictable. Components MUST be responsive, keyboard
usable, and legible on mobile and desktop. Sticky navigation or toolbars MAY be
used when they improve long lists or dense management views, but they MUST not
obscure core content or create redundant chrome.

## Product and UX Standards

1. Feature pages MUST define the primary user goal before implementation starts.
2. Management views MUST prioritize identity first, then operational state, then
   secondary metadata and actions.
3. Empty states SHOULD teach just enough to orient the user, then lead with the
   most useful action.
4. Agent-related surfaces MUST expose creation, management, and bring-your-own
   options when those choices are relevant to the product model.
5. Responsive layout decisions MUST preserve scanability on small screens and
   density on large screens without changing the page's basic meaning.
6. If a page has multiple record types or filters, the default sort SHOULD favor
   recency or relevance unless the feature spec says otherwise.

## Delivery and Quality Gates

1. Every feature MUST have a written spec, implementation plan, and task list
   before code changes begin.
2. Feature plans MUST name the expected user states, key entities, and
   validation strategy before implementation is scheduled.
3. Tests or verification steps MUST be defined for any feature that changes data
   loading, filtering, sorting, creation flows, or navigation.
4. UI changes that affect shared Studio navigation MUST be reviewed against the
   current sidebar and page-shell patterns so the product remains coherent.
5. Relevant validation commands MUST run before merge, including formatting,
   linting, type checking, and tests for the affected area.

## Governance

This constitution governs Nova Cloud product and implementation decisions. It
supersedes conflicting guidance in feature notes, plans, or ad hoc discussion.
Changes MUST be made intentionally, with the reason for the change documented
alongside the edit.

Amendments require:

1. A clear description of the principle or rule being changed.
2. A review of the dependent spec-kit templates and runtime guidance docs.
3. A semantic version update:
   - MAJOR for backward-incompatible principle removals or redefinitions
   - MINOR for new principles or materially expanded guidance
   - PATCH for clarifications, wording fixes, or non-semantic refinements
4. A date update for `Last Amended`.

Compliance checks MUST happen during planning and review. If a proposed change
conflicts with the constitution, the plan or implementation MUST explain the
exception and its justification before work proceeds.

**Version**: 1.0.0 | **Ratified**: 2026-05-10 | **Last Amended**: 2026-05-10
