# Research: Studio Agents Overview

## Decision 1: Keep the empty state on the same route

**Decision**: The agents page will use a landing-style empty state when no
agents exist instead of redirecting to a separate onboarding route.

**Rationale**: The user asked for a first-page experience that explains the
agents concept, gives a direct create-agent action, and offers bring-your-own-
agent as a neutral alternative. Keeping that flow on the same page reduces
context switching.

**Alternatives considered**:

- Separate onboarding wizard page. Rejected because the page should feel like a
  landing surface until the user is ready to act.
- Inline banner inside a populated page. Rejected because the empty-state copy
  should disappear once the page becomes a management surface.

## Decision 2: Use a single card grid for one agent and many agents

**Decision**: The populated state will always use the same responsive card grid,
including the single-agent case.

**Rationale**: The user explicitly wanted the single-agent and multi-agent
states to look the same, with identity-first cards and operational data.

**Alternatives considered**:

- Special-casing the one-agent view. Rejected because it would create an
  inconsistent mental model.
- Table view for larger lists. Rejected because the user asked for modern card
  overview behavior.

## Decision 3: Keep search, filters, and sort local to the loaded page state

**Decision**: Search, filtering, and sorting will operate on the agent data
already loaded by the page for v1.

**Rationale**: The feature is a management overview, not a data platform. Using
loaded data keeps the toolbar responsive and avoids unnecessary backend plumbing
for the first release.

**Alternatives considered**:

- New server-side search subsystem. Rejected because it adds complexity without
  improving the first release experience.
- Full-page navigation for each search/filter change. Rejected because it would
  make the toolbar feel sluggish.

## Decision 4: Make the toolbar sticky

**Decision**: The toolbar will stay sticky at the top of the agents content
area.

**Rationale**: The user explicitly wants it available on mobile and desktop for
long lists, which is a common pattern for modern management surfaces.

**Alternatives considered**:

- Static toolbar above the grid. Rejected because users would lose access after
  scrolling.
- Floating action controls. Rejected because search and filtering need a stable,
  predictable placement.

## Decision 5: Keep pricing and BYO guidance neutral

**Decision**: The empty state will explain that Nova-managed agents use credits
while also clearly presenting bring-your-own-agent or subscription options.

**Rationale**: The user wants transparency without a coercive upsell. This keeps
the page honest and leaves room for multiple adoption paths.

**Alternatives considered**:

- Credit-heavy sales copy. Rejected because it would over-emphasize one monet-
  ization path.
- Omitting pricing entirely. Rejected because users should understand the cost
  model up front.
