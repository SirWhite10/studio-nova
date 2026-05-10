# Feature Specification: Studio Shell Marketplace Overhaul

**Feature Branch**: `001-studio-shell-marketplace`  
**Created**: 2026-05-09  
**Status**: Draft  
**Input**: User description: "Consolidate the existing Nova Cloud planning work into a Studio-first shell overhaul with grouped sidebar navigation, per-Studio ordering, content/files, integrations marketplace entry, workspace and sandbox management, global search, sticky top navigation, overflow fixes, live sidebar user info, and a modern Studio settings experience."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Navigate a Studio Shell (Priority: P1)

As a Studio user, I want a clear, collapsible navigation shell so I can move
between the most important Studio areas without getting lost, regardless of
screen size.

**Why this priority**: The Studio shell is the entry point for every other
capability. If navigation remains confusing or unstable, the rest of the
overhaul has reduced value.

**Independent Test**: This can be fully tested by opening an existing Studio,
collapsing and expanding the sidebar, using the grouped navigation, and moving
between primary destinations while confirming the top bar remains visible and
the layout does not overflow horizontally.

**Acceptance Scenarios**:

1. **Given** a user is inside a Studio, **When** they view the app shell,
   **Then** they see grouped navigation for Agent, Workspace & Sandbox,
   Integrations, and Content.
2. **Given** a user is using the sidebar on desktop, **When** they collapse it,
   **Then** the sidebar switches to an icon-capable compact state and the
   current navigation context remains usable.
3. **Given** a user scrolls a long content page, **When** the main content
   moves, **Then** the top navigation area remains fixed in place and the page
   does not create shell-level horizontal overflow.

---

### User Story 2 - Personalize a Studio Workspace (Priority: P1)

As a Studio user, I want to reorder my navigation and manage Studio settings in
one modern workspace so the product matches how I work and how I want my Studio
to look.

**Why this priority**: Personalization and settings are core to the Studio
model. Users need stable, durable customization rather than a one-size-fits-all
navigation structure.

**Independent Test**: This can be fully tested by reordering Studio navigation,
saving Studio settings changes, reloading the app, and confirming that custom
order and saved settings persist while unsaved changes can still be discarded.

**Acceptance Scenarios**:

1. **Given** a user rearranges sidebar sections or supported items, **When**
   they reopen the same Studio later, **Then** the saved order is restored for
   that Studio.
2. **Given** a user edits Studio settings, **When** they save their changes,
   **Then** the updated settings become the new Studio configuration.
3. **Given** a user edits Studio settings but cancels before saving, **When**
   they leave the page, **Then** unsaved changes are not applied.

---

### User Story 3 - Manage Studio Capabilities (Priority: P2)

As a Studio user, I want clear destinations for deployments, sandbox controls,
integrations, files, and future content tools so I can manage Studio
capabilities without hunting through unrelated pages.

**Why this priority**: The shell overhaul is not complete unless the grouped
navigation leads to meaningful management surfaces for Studio capabilities.

**Independent Test**: This can be fully tested by opening a Studio with files,
integrations, and workspace activity, then using the sidebar to reach the
related sections, open the integrations marketplace entry, and confirm that
content and deployment surfaces are clearly separated.

**Acceptance Scenarios**:

1. **Given** a Studio has installed integrations, **When** the user opens the
   Integrations section, **Then** the installed capabilities appear there and a
   clear add action is available to open the marketplace flow.
2. **Given** a user wants to manage files and content, **When** they open the
   Content section, **Then** they can reach Files and see the included free
   storage allowance for the Studio.
3. **Given** a user wants to manage public outputs and runtime behavior,
   **When** they open the Workspace & Sandbox section, **Then** they can reach
   deployment/domain management and sandbox management from distinct navigation
   entries.

---

### User Story 4 - Search and Account Access from Anywhere (Priority: P3)

As a signed-in user, I want global search and live account controls available
from the shell so I can quickly jump to relevant places and manage my account
without leaving the Studio experience.

**Why this priority**: Search and live account access improve speed and polish,
but the shell can still deliver value before full search coverage expands.

**Independent Test**: This can be fully tested by opening the shell, invoking
the global search entry, and using the sidebar footer account controls with real
user identity data.

**Acceptance Scenarios**:

1. **Given** a user is in the authenticated app shell, **When** they look below
   the logo area, **Then** they see a global search entry before the main
   navigation items.
2. **Given** a user opens the sidebar footer menu, **When** their account menu
   appears, **Then** it shows live user identity data rather than sample
   placeholder data.

### Edge Cases

- What happens when a Studio has no installed integrations, no deployments, or
  no content beyond its initial empty state?
- How does the system handle saved sidebar ordering that references a capability
  that is disabled, unavailable, or no longer installed?
- What happens when navigation labels, page titles, file names, or other
  content are unusually long on mobile or desktop screens?
- How does the shell behave when a user has only one Studio, many Studios, or a
  newly created Studio with default navigation?
- What happens when a user collapses the sidebar while currently viewing a page
  nested under a subsection item?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST present Studio navigation as grouped sections for
  Agent, Workspace & Sandbox, Integrations, and Content whenever a Studio is
  selected.
- **FR-002**: The system MUST allow the Studio sidebar to switch between an
  expanded state and a compact icon-capable state without breaking navigation.
- **FR-003**: The system MUST place a global search entry below the logo area
  and above the main Studio navigation items.
- **FR-004**: The system MUST keep Settings and Support visually near the bottom
  of the sidebar rather than mixing them into the main Studio capability groups.
- **FR-005**: The system MUST keep the top navigation or breadcrumb bar visible
  while the main content area scrolls.
- **FR-006**: The system MUST prevent shell-level horizontal overflow on primary
  Studio pages during normal mobile and desktop use.
- **FR-007**: Users MUST be able to reorder sidebar sections for a Studio.
- **FR-008**: Users MUST be able to reorder supported sidebar items within a
  Studio section.
- **FR-009**: The system MUST persist saved sidebar ordering per Studio and
  restore it after refresh and later sessions.
- **FR-010**: The system MUST fall back to a valid default navigation order when
  saved ordering references unavailable capabilities or invalid items.
- **FR-011**: The Agent section MUST provide navigation to chat, skills, agents,
  memory, and jobs management areas.
- **FR-012**: The Workspace & Sandbox section MUST provide distinct navigation
  paths for deployments and sandbox management.
- **FR-013**: The Integrations section MUST show installed integrations and MUST
  expose an add action that opens the marketplace flow for extensions and
  integrations.
- **FR-014**: The system MUST support integration entries that expose sub-items
  when an installed capability requires multiple destinations.
- **FR-015**: The Content section MUST exist as a built-in Studio capability and
  MUST include Files as an initial sub-item.
- **FR-016**: The Content section MUST display the included free storage
  allowance of 2 GB for the Studio experience.
- **FR-017**: The sidebar footer MUST display live authenticated user identity
  information instead of placeholder sample data.
- **FR-018**: The sidebar footer MUST provide an actionable account menu for
  account-related destinations that are available to the user.
- **FR-019**: The Studio settings experience MUST be Studio-specific rather than
  a generic account miscellany page.
- **FR-020**: The Studio settings experience MUST organize settings into clear
  sections or tabs and MUST provide explicit Save and Cancel actions.
- **FR-021**: Users MUST be able to adjust Studio visual customization with more
  granularity than a single coarse color choice while staying inside the
  approved Nova visual style.
- **FR-022**: The system MUST apply a consistent visual language across the main
  Studio content pages so related pages feel like parts of one product rather
  than unrelated custom surfaces.
- **FR-023**: The system MUST clearly distinguish Studio, Workspace,
  Deployment, Sandbox, Integrations, and Content as separate product concepts in
  navigation labels and page structure.
- **FR-024**: The shell MUST reflect the currently available Studio capabilities
  so navigation stays aligned to the selected Studio's installed or enabled
  features.

### Key Entities _(include if feature involves data)_

- **Studio Navigation Profile**: The saved navigation structure for a Studio,
  including the order of sections and supported child items.
- **Navigation Section**: A top-level Studio shell group such as Agent,
  Workspace & Sandbox, Integrations, or Content, with label, visibility rules,
  and child destinations.
- **Navigation Item**: A user-facing destination within a section, including its
  title, destination, availability state, and whether it supports reordering.
- **Studio Capability**: An enabled Studio feature area such as Files,
  Integrations, Deployments, Sandbox management, Jobs, or Memory that may appear
  in navigation.
- **Studio Settings Profile**: The saved Studio-level configuration covering
  presentation, organization, and other Studio-specific preferences.
- **Content Allocation Summary**: The Studio-facing record of included storage
  allowance and related usage information shown in the Content area.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In acceptance testing, users can reach Chat, Files, Deployments,
  and Studio Settings from the sidebar in two selections or fewer.
- **SC-002**: In acceptance testing, saved Studio sidebar order persists after
  page refresh and a new sign-in in 100% of validation runs.
- **SC-003**: On primary Studio pages audited for this release, no page-level
  horizontal scrolling appears at standard mobile and desktop viewport sizes
  during normal usage.
- **SC-004**: In usability validation, at least 90% of participants can locate
  the integrations marketplace entry without external instruction.
- **SC-005**: In acceptance testing, users can update Studio settings, save the
  changes, and later discard a different unsaved edit without unintended
  persistence.
- **SC-006**: In visual review, the audited Studio pages follow one consistent
  navigation and component language rather than mixing conflicting shell styles.

## Assumptions

- Existing Studio authentication and Studio selection behavior will remain in
  place and be extended rather than replaced.
- Existing file upload and folder capabilities will be surfaced through the new
  Content section rather than rebuilt.
- Existing integration, runtime, workspace, and job records will continue to
  supply the underlying Studio capability data for this release.
- The `2 GB` free storage allowance is a product-facing entitlement that must be
  visible in the Content experience for this release, even if deeper billing or
  entitlement enforcement evolves separately.
- Global search may initially cover a limited set of high-value result types for
  the first release, provided the shell-level search entry and interaction model
  are delivered now.
