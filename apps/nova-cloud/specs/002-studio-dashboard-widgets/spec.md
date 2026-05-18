# Feature Specification: Studio Dashboard and Widget Foundation

**Feature Branch**: `002-studio-dashboard-widgets`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: User description: "Replace the current Studio overview body with a responsive dashboard built from reusable widgets, introduce a future-safe widget renderer and registry, and establish a shared chart widget architecture that can later power Nova core and integration-provided widgets such as Stripe."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View a Studio Dashboard (Priority: P1)

As a Studio user, I want the Studio overview to look like a real dashboard so I
can understand Studio health, activity, and assets at a glance.

**Why this priority**: The current overview already has real data, but it is not
organized like a dashboard. This is the user-facing foundation for the entire
widget system.

**Independent Test**: Open a Studio overview on mobile and desktop and confirm
the body renders as a responsive dashboard with real metric, activity, and
summary widgets instead of the current long narrative layout.

**Acceptance Scenarios**:

1. **Given** a user opens a Studio overview, **When** the page loads, **Then**
   they see a dashboard-style grid composed of cards/widgets instead of the
   current mixed management surface layout.
2. **Given** a user opens the same Studio overview on a narrow mobile viewport,
   **When** the dashboard renders, **Then** widgets stack in a single-column
   layout without horizontal overflow.
3. **Given** a user opens the Studio overview on a larger desktop viewport,
   **When** the dashboard renders, **Then** widgets can occupy wider horizontal
   spans and present more information side-by-side.

---

### User Story 2 - Reuse a Stable Widget Shell (Priority: P1)

As a product developer, I want dashboard widgets to render through one reusable
widget renderer so Nova core and future integrations can use a consistent
widget shell instead of building one-off dashboard blocks.

**Why this priority**: Without a reusable widget shell, the first dashboard
becomes another hardcoded page and blocks future builder and marketplace work.

**Independent Test**: Render multiple widget types through the shared widget
renderer and confirm they receive layout span configuration, shell framing, and
state handling consistently.

**Acceptance Scenarios**:

1. **Given** a dashboard page declares widgets through configuration, **When**
   the page renders, **Then** the shared renderer selects the correct concrete
   widget component and applies the configured width/span behavior.
2. **Given** a widget has no data, is loading, or has an error, **When** it is
   rendered through the shared renderer, **Then** the shell handles those
   states consistently without each widget reimplementing them.
3. **Given** a future integration supplies a widget definition compatible with
   the registry, **When** the dashboard resolves it, **Then** it can render in
   the same shell model as core Nova widgets.

---

### User Story 3 - Support Reusable Chart Widgets (Priority: P2)

As a Studio user, I want chart widgets to support multiple chart views and time
controls so I can inspect trends without the dashboard needing a different
implementation for each chart.

**Why this priority**: Charts are one of the main reasons to create a widget
system rather than static cards. They also shape the future builder model.

**Independent Test**: Render a chart widget through the core chart host,
provide compatible data for multiple chart variants, and confirm the chart can
switch views or ranges without breaking the widget shell.

**Acceptance Scenarios**:

1. **Given** a dashboard widget uses the shared core chart model, **When** it
   is configured as a line, area, or bar chart, **Then** it renders through the
   shared chart foundation rather than a separate page-only implementation.
2. **Given** a chart widget exposes compatible toolbar controls such as date
   range selection, **When** the user changes the control, **Then** the chart
   updates using the widget’s normalized config and data model.
3. **Given** a chart type requires extra configuration beyond the shared base
   fields, **When** that chart is defined, **Then** the system can accept
   variant-specific options without breaking the generic widget contract.

---

### User Story 4 - Prepare for Future Custom Widget Layouts (Priority: P3)

As a Studio owner, I want the dashboard foundation to be ready for future
custom widgets and saved layouts so my Studio can later evolve beyond the
default dashboard without a rewrite.

**Why this priority**: Saved layouts and marketplace-provided widgets are not
part of the first UI pass, but the first implementation must not block them.

**Independent Test**: Review the widget configuration and registry structure
and confirm that layout span, widget identity, provider namespace, and chart
view configuration can all be expressed without page-specific assumptions.

**Acceptance Scenarios**:

1. **Given** a widget definition includes provider, kind, and layout metadata,
   **When** the dashboard resolves it, **Then** the model is not limited to the
   current Studio overview widgets only.
2. **Given** a future integration such as Stripe wants to publish a widget,
   **When** its widget definition is added to the registry, **Then** the
   renderer can host it without changing the dashboard page architecture.

### Edge Cases

- What happens when a Studio has no jobs, no integrations, no files, or no
  active workspaces?
- How does the dashboard behave when a widget has incomplete or temporarily
  unavailable data?
- What happens when a chart variant is selected that is incompatible with the
  currently normalized dataset?
- How does the layout behave when widget titles, labels, or data values are
  unusually long on smaller screens?
- What happens when a widget definition references an unknown registry key or a
  provider widget that is not installed?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST replace the current Studio overview body at
  `/app/studios/[studioId]` with a dashboard-style layout built from reusable
  widgets.
- **FR-002**: The dashboard MUST render in a single-column layout on mobile and
  MUST support wider multi-column composition on larger screens.
- **FR-003**: The first dashboard release MUST use real Nova Studio data rather
  than placeholder-only widgets.
- **FR-004**: The system MUST provide a reusable widget renderer component at
  `src/lib/StudioCanvas/Widgets/widget-renderer.svelte`.
- **FR-005**: The widget renderer MUST accept widget layout span information and
  apply width behavior consistently across supported widget types.
- **FR-006**: The widget renderer MUST provide shared loading, empty, and error
  state handling.
- **FR-007**: The system MUST provide a widget registry that maps widget
  definitions to concrete widget implementations.
- **FR-008**: The widget model MUST support provider namespacing so both Nova
  core widgets and future integration widgets can use the same renderer model.
- **FR-009**: The widget model MUST support a generic layout object that
  includes at least column span and optional row span or minimum height behavior.
- **FR-010**: The widget model MUST support a generic toolbar/control model
  rather than hardcoding only one control type such as date range.
- **FR-011**: The dashboard foundation MUST include a reusable core chart widget
  model.
- **FR-012**: The core chart widget MUST support at least line, area, and bar
  chart variants in the initial design direction.
- **FR-013**: The core chart widget MUST allow variant-specific configuration
  without breaking the shared chart widget contract.
- **FR-014**: The chart architecture MUST allow multiple compatible chart
  variants to share most of the same normalized dataset configuration.
- **FR-015**: The system MUST allow future chart variants such as pie, radar,
  and radial to extend the same core chart foundation even if they require
  additional mapping or validation.
- **FR-016**: The first dashboard release MUST surface high-value Studio data
  including operational counts and activity summaries such as integrations,
  chats, jobs, workspaces, files, storage, or runtime state.
- **FR-017**: The dashboard implementation MUST remain separate from sidebar
  composition and MUST only replace the page body content for the Studio
  overview route.
- **FR-018**: The architecture MUST be compatible with future saved per-Studio
  widget layout and configuration storage, even if that storage does not ship in
  the first pass.

### Key Entities _(include if feature involves data)_

- **Studio Widget Config**: The saved or generated configuration record for a
  dashboard widget, including provider, kind, layout, view, filters, toolbar,
  and data source metadata.
- **Widget Renderer**: The shared host component that applies shell framing,
  layout span behavior, and common widget states before dispatching to the
  concrete widget implementation.
- **Widget Registry Entry**: The mapping between a widget key and its concrete
  Svelte component plus any supporting metadata.
- **Core Chart Widget Config**: The shared chart widget contract that defines
  chart variant, dataset mapping, series metadata, toolbar controls, and
  variant-specific options.
- **Widget Dataset Mapping**: The normalized mapping between raw overview or
  integration data and widget-facing data keys such as series, label, category,
  or value fields.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In acceptance testing, the Studio overview renders as a widget
  dashboard on both mobile and desktop without horizontal overflow.
- **SC-002**: In acceptance testing, at least three distinct widget types
  render through the shared widget renderer without bespoke page-level shells.
- **SC-003**: In implementation review, the chart foundation supports at least
  line, area, and bar variants through one shared core chart architecture.
- **SC-004**: In implementation review, the widget configuration model can
  describe provider, kind, layout span, view options, and toolbar controls
  without page-specific assumptions.
- **SC-005**: In validation, the first dashboard shows real Studio counts,
  summaries, or activity data rather than a placeholder-only render.

## Assumptions

- The Studio overview route `/app/studios/[studioId]` is the correct first
  dashboard target; `/app` can remain the multi-Studio hub for now.
- Existing overview-state loading will be reused and expanded rather than
  replaced.
- The first pass focuses on a default dashboard layout; drag-and-drop layout
  editing and a widget builder can land later.
- Widget data should remain server-driven and normalized before rendering
  whenever possible.
- The initial widget system should optimize for Nova core widgets first while
  preserving a clean extension path for future integration-provided widgets.
