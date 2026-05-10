# Research: Studio Shell Marketplace Overhaul

## Decision 1: Store Studio shell preferences on the existing Studio record

- **Decision**: Persist Studio navigation order and fine-grained appearance
  settings as structured fields on the existing `studio` record rather than
  introducing a separate preferences table for this release.
- **Rationale**: The current shell already reads Studio identity and theme data
  through Studio-centric loaders and patch routes. Keeping shell preferences on
  the same durable record minimizes fetch overhead, reduces coordination across
  multiple records, and keeps the selected Studio state self-contained.
- **Alternatives considered**:
  - Create a dedicated `studio_preferences` table. Rejected because it adds a
    second source of truth for shell state and creates extra loader and mutation
    complexity before that separation is necessary.
  - Store ordering in client-only local state. Rejected because the
    constitution requires durable, cross-session persistence for user-visible
    behavior.

## Decision 2: Build the sidebar from a server-resolved navigation registry

- **Decision**: Generate sidebar sections and items from a registry of known
  navigation destinations combined with server-side capability resolution for
  the selected Studio.
- **Rationale**: The shell needs stable top-level groups, but many child items
  depend on enabled integrations, workspace presence, jobs, files, and other
  Studio capabilities. A registry-plus-resolver model preserves consistent
  product language while allowing the selected Studio to shape the final menu.
- **Alternatives considered**:
  - Hardcode every section and item directly in Svelte markup. Rejected because
    it scales poorly as integrations, marketplace items, and content tools grow.
  - Let each capability inject arbitrary navigation at runtime. Rejected because
    it risks terminology drift and makes Studio ordering persistence harder to
    validate.

## Decision 3: Ship global search as a command-style shell surface

- **Decision**: Implement the shell search as a global command-style search
  entry backed by an authenticated app-level search endpoint with selected
  Studio context.
- **Rationale**: The repo already includes reusable command primitives, which
  fit the desired modern embedded search behavior. An app-level endpoint keeps
  the interaction global while still allowing results to prioritize the current
  Studio and later expand across more domains.
- **Alternatives considered**:
  - Build a purely client-side search over currently loaded sidebar data.
    Rejected because it would not cover chats, files, skills, or future
    marketplace entries well enough.
  - Integrate an external hosted search provider immediately. Rejected because
    the shell interaction is the immediate requirement, while hosted indexing
    can remain a future optimization.

## Decision 4: Use native reorder interactions plus explicit move controls

- **Decision**: Support navigation reordering with native drag interactions and
  explicit move controls rather than introducing a new drag-and-drop library.
- **Rationale**: The repo currently has no dedicated drag-and-drop dependency
  for shell navigation, and the requested behavior is scoped to ordered Studio
  menu items rather than a generalized canvas system. Native interactions plus
  keyboard-accessible move controls keep the dependency surface small.
- **Alternatives considered**:
  - Add a new drag-and-drop framework. Rejected because it increases bundle and
    integration complexity for a narrow use case.
  - Offer reorder through settings only. Rejected because it weakens the direct
    personalization experience requested for the sidebar itself.

## Decision 5: Express the redesign through shared Nova page-shell tokens

- **Decision**: Implement the visual realignment through shared shell/page
  wrappers and token-driven CSS variables mapped onto existing shadcn
  primitives, with Aura Gold as the default design direction.
- **Rationale**: The current issue is not a missing component library; it is
  inconsistent page composition and styling. Standardizing page shells, section
  cards, headers, and settings layouts creates consistency without forking away
  from the existing component system.
- **Alternatives considered**:
  - Restyle each page independently. Rejected because it would repeat the
    inconsistency problem the feature is trying to solve.
  - Replace the existing component layer with a bespoke design system. Rejected
    because the user explicitly wants heavier reuse of the existing shadcn-based
    components.

## Decision 6: Keep marketplace entry lightweight in this release

- **Decision**: Treat the marketplace in this feature as a shell and navigation
  concern first: add the integrations header action, the marketplace routes, and
  the initial Studio-aware discovery surface without requiring the full future
  marketplace data model to be complete.
- **Rationale**: The planning docs show the broader marketplace is still open,
  while the shell needs a user-facing entry point now. This keeps the feature
  aligned with future marketplace plans without blocking on every catalog or
  billing requirement.
- **Alternatives considered**:
  - Fully implement the entire marketplace product in the same slice. Rejected
    because it would substantially widen scope beyond the shell overhaul.
  - Defer marketplace completely. Rejected because the plus action on
    Integrations is a primary requirement and should lead somewhere useful.
