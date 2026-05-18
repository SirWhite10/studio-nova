# Studio Dashboard and Widget Architecture Plan

**Document Name:** `2026-05-10-studio-dashboard-widget-plan.md`
**Version:** 1.0
**Date:** May 10, 2026
**Last Updated:** 2026-05-10 00:00:00 UTC
**Scope:** `apps/nova-cloud`, Studio overview dashboard, reusable widget renderer, core chart widgets, future integration widgets

## 1. Purpose

Plan the replacement of the current Studio overview body with a dashboard-style
layout modeled after the ShadCN Svelte dashboard example, while establishing a
future-safe widget system that Nova core and installed integrations can both use.

This plan is intentionally focused on:

- the body of the Studio overview page
- a reusable widget renderer
- a reusable chart widget foundation
- widget data contracts and registry direction

It does **not** include:

- sidebar changes
- marketplace implementation details beyond widget extensibility
- full drag-and-drop builder implementation
- user-authored custom widget builder UI in this first phase

## 2. Current State

Today, the Studio overview route at:

```txt
/app/studios/[studioId]
```

already loads meaningful real data, but the page body is still structured like a
feature surface rather than a dashboard.

Current server data already available in overview state includes:

- Studio summary
- chats
- runtime and sandbox status
- integrations
- recent artifacts
- recent runs
- workspaces
- Studio plan metadata

Current implementation references:

- `src/routes/(app)/app/studios/[studioId]/+page.svelte`
- `src/routes/(app)/app/studios/[studioId]/+page.server.ts`
- `src/lib/server/studio-overview-state.ts`

The existing page contains useful information, but it is presented as a long
vertical surface with mixed callouts, management blocks, and prose rather than
as a composable dashboard.

## 3. Design Reference

Primary UI reference:

- ShadCN Svelte dashboard example:
  - rendered example: `https://www.shadcn-svelte.com/examples/dashboard`
  - source: `https://github.com/huntabyte/shadcn-svelte/blob/2f2c000a4e8259863376d9aabd623cfe8c9a2fb4/docs/src/routes/(app)/(layout)/examples/dashboard/%2Bpage.svelte`

Relevant structural patterns from the example:

- top summary cards
- a wide primary chart area
- lower table/list surfaces
- simple responsive stacking on mobile
- wider multi-column grid behavior on larger screens

Relevant chart reference direction:

- `https://www.shadcn-svelte.com/charts/area`
- `https://www.shadcn-svelte.com/charts/bar#charts`
- `https://www.shadcn-svelte.com/charts/line#charts`
- `https://www.shadcn-svelte.com/charts/pie#charts`
- `https://www.shadcn-svelte.com/charts/radar#charts`
- `https://www.shadcn-svelte.com/charts/radial#charts`
- `https://www.shadcn-svelte.com/charts/tooltip#charts`

## 4. Target Direction

Replace the current Studio overview body with a dashboard built from reusable
widgets arranged in a responsive grid.

Behavioral direction:

- one column on mobile
- multiple columns on larger screens
- widgets render real Nova Studio data from day one
- layout is compatible with future user customization
- widget renderer is generic enough for future integration-provided widgets
- chart widgets use the ShadCN Svelte + LayerChart composition model

The resulting dashboard should feel like a real operational surface rather than
a landing page.

## 5. Product Goals

Users should be able to:

- open a Studio and immediately see important operational data in dashboard form
- understand Studio health, activity, storage, integrations, jobs, agents, and workspaces at a glance
- view metric cards, charts, lists, and table-like widgets in one consistent shell
- later add widgets provided by Nova core or installed integrations such as Stripe
- later change widget view controls, including date ranges and chart variant options

## 6. First Dashboard Content

The first dashboard pass should use real data already present in Nova or data
that can be added to the overview loader without major architectural changes.

Initial widget candidates:

- integrations enabled count
- connected domains count
- agents count
- chats count
- upcoming jobs count
- active workspaces vs total workspaces
- files count
- storage used vs included storage
- runtime status summary
- recent run activity
- recent artifacts or recent files
- integrations overview
- workspace deployment summary

These widgets can be refined later, but the first implementation should already
look and behave like a real dashboard rather than static placeholders.

## 7. Architecture Direction

The dashboard should be implemented as a widget-based system, not as one large
page-specific layout with hardcoded sections.

Recommended layers:

### A. Dashboard Page

The Studio overview page owns:

- dashboard widget ordering for the current layout
- page-level data loading
- future saved widget preferences per Studio

### B. Widget Renderer

The widget renderer is the reusable host component that:

- applies layout span classes
- renders the shared card shell
- renders widget header/title/description
- renders loading, empty, and error states
- renders future toolbar controls
- resolves the correct concrete widget implementation

Planned path:

```txt
src/lib/StudioCanvas/Widgets/widget-renderer.svelte
```

### C. Widget Registry

The registry maps widget keys to actual Svelte components and metadata.

Planned path:

```txt
src/lib/StudioCanvas/Widgets/widget-registry.ts
```

### D. Concrete Widgets

Concrete widgets live under provider or feature folders.

Examples:

```txt
src/lib/StudioCanvas/Widgets/Core/core-chart.svelte
src/lib/StudioCanvas/Widgets/Core/core-metric-card.svelte
src/lib/StudioCanvas/Widgets/Core/core-list.svelte
src/lib/StudioCanvas/Widgets/Core/core-table.svelte
src/lib/StudioCanvas/Widgets/Stripe/stripe-chart-line.svelte
src/lib/StudioCanvas/Widgets/Stripe/stripe-chart-bar.svelte
```

## 8. Widget Config Model

The widget system should be designed for saved JSON-driven configuration.

Recommended base direction:

```ts
type StudioWidgetConfig = {
  id: string;
  provider: "core" | string;
  kind: string;
  title?: string;
  description?: string;
  layout: {
    colSpan: 1 | 2 | 3 | 4 | 6 | 8 | 12;
    rowSpan?: 1 | 2 | 3;
    minHeight?: "sm" | "md" | "lg";
  };
  view?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  toolbar?: WidgetToolbarControl[];
  source?: {
    integrationKey?: string;
    endpoint?: string;
    capability?: string;
  };
};
```

Important direction:

- `toolbar` should be generic, not a hardcoded `dateRange` contract
- `filters` should carry state such as range, series choice, or grouping mode
- `view` should carry display configuration such as chart variant, legend mode,
  metric style, or table presentation

This avoids baking Stripe-like assumptions into the core widget schema.

## 9. Toolbar and Control Model

The widget system should support a generic toolbar model for future controls.

Recommended direction:

```ts
type WidgetToolbarControl =
  | {
      type: "select";
      key: string;
      label?: string;
      value: string;
      options: { label: string; value: string }[];
    }
  | {
      type: "toggle-group";
      key: string;
      value: string;
      options: { label: string; value: string }[];
    }
  | {
      type: "date-range";
      key: string;
      value: string;
      allowCustom?: boolean;
    }
  | {
      type: "action";
      key: string;
      label: string;
      action: string;
    };
```

This allows:

- 7d / 30d / 90d range switching
- grouping or stacking mode switching
- metric selection
- export or refresh actions
- future integration-defined widget controls

## 10. Chart Widget Strategy

Charts should use one shared `core.chart` model with variant-specific rendering.

The system should **not** force every chart type into identical props, but it
also should not split all charts into completely unrelated configuration models.

Recommended approach:

- one shared chart widget type
- shared dataset mapping contract
- variant-specific rendering files
- variant-specific option extensions only where needed

### Core Chart Contract

Recommended direction:

```ts
type CoreChartWidgetConfig = {
  kind: "core.chart";
  variant: "area" | "bar" | "line" | "pie" | "radar" | "radial";
  title?: string;
  description?: string;
  layout: {
    colSpan: 1 | 2 | 3 | 4 | 6 | 8 | 12;
    rowSpan?: 1 | 2 | 3;
    minHeight?: "sm" | "md" | "lg";
  };
  dataset: {
    xKey?: string;
    labelKey?: string;
    categoryKey?: string;
    valueKey?: string;
    series?: Array<{
      key: string;
      label: string;
      color?: string;
    }>;
  };
  filters?: Record<string, unknown>;
  toolbar?: WidgetToolbarControl[];
  options?: Record<string, unknown>;
};
```

### Variant Compatibility Direction

These chart families are often interchangeable from the same normalized dataset:

- line
- area
- bar

These may require light remapping:

- pie
- radar

This is often more specialized:

- radial

That means the future builder should support:

- instant view changes across compatible variants
- validation when a selected chart type needs missing fields
- guided remapping rather than silently failing

## 11. Core Chart Component Structure

The chart layer should be split into a shared host and separate chart variants.

Recommended structure:

```txt
src/lib/StudioCanvas/Widgets/Core/core-chart.svelte
src/lib/StudioCanvas/Widgets/Core/core-chart-area.svelte
src/lib/StudioCanvas/Widgets/Core/core-chart-bar.svelte
src/lib/StudioCanvas/Widgets/Core/core-chart-line.svelte
src/lib/StudioCanvas/Widgets/Core/core-chart-pie.svelte
src/lib/StudioCanvas/Widgets/Core/core-chart-radar.svelte
src/lib/StudioCanvas/Widgets/Core/core-chart-radial.svelte
```

Recommended responsibility split:

### `core-chart.svelte`

- shared card shell
- title and description
- toolbar controls
- loading/empty/error states
- common chart normalization
- variant selection

### variant files

- actual chart rendering using ShadCN chart container + LayerChart primitives
- variant-specific props and mark composition
- variant-specific tooltip, legend, or axis decisions

Snippets can still be used inside `core-chart.svelte` for shell regions or
small branch rendering, but the actual chart variant rendering should live in
separate files once complexity grows.

## 12. Widget Renderer Responsibilities

`widget-renderer.svelte` should own:

- `colSpan` layout class application
- card shell framing
- title and description rendering
- toolbar rendering
- loading state
- empty state
- error state
- dispatching to the correct concrete widget component

It should **not** own:

- direct provider API fetching
- provider-specific auth behavior
- chart-specific data normalization rules beyond top-level plumbing

## 13. Data Flow Direction

Widget data should be server-driven and normalized before rendering whenever
possible.

Recommended data flow:

1. overview page loads dashboard data
2. server composes and normalizes widget-friendly payloads
3. widget renderer receives config + data
4. concrete widget renders the visualization

This is preferable to letting widgets fetch directly from integrations because it:

- keeps auth and secrets server-side
- avoids duplicated integration fetch logic
- makes widgets easier to test
- makes future saved dashboards more deterministic

## 14. Studio Overview Layout Direction

The first dashboard layout should follow the ShadCN dashboard composition model:

- top summary cards
- one or more wide primary chart or activity widgets
- medium secondary widgets below or beside them
- larger list/table widgets toward the lower portion of the page

Recommended responsive direction:

- mobile: `grid-cols-1`
- large screens: multiple columns
- future target: 12-column grid for saved widget placement

Example direction:

- KPI row: small metric cards
- primary row: runtime/activity chart plus jobs or workspace activity
- lower row: integrations, agents, domains, storage
- bottom row: recent runs, workspaces, recent files/artifacts

## 15. Implementation Phases

### Phase 1. Replace Overview Layout With Dashboard Grid

- redesign `/app/studios/[studioId]` body around a responsive grid
- keep real Nova data
- preserve current behavior for refresh and actions where still relevant

### Phase 2. Add Widget Renderer and Core Widget Shells

- create `widget-renderer.svelte`
- create registry and shared widget types
- create first reusable core widgets:
  - metric card
  - list
  - table-like activity list
  - chart shell

### Phase 3. Convert First Dashboard Blocks Into Config-Driven Widgets

- make first dashboard widgets render through config + registry
- keep layout static at first, but renderer-driven

### Phase 4. Add Core Chart Variants

- implement area, bar, line first
- add pie, radar, radial after base model is proven

### Phase 5. Add Saved Layout and Future Builder Hooks

- store widget config per Studio
- support future add/remove/reorder/resize
- support integration-provided widget registration

## 16. Risks and Constraints

### LayerChart Evolution

ShadCN Svelte charts depend on LayerChart v2 direction, which is still evolving.
Nova should avoid over-wrapping chart internals and keep chart components close
to the upstream composition model.

### Over-Specializing Too Early

If the widget config is too specific to one provider or one dashboard view,
future integrations will not fit cleanly.

### Over-Generalizing Too Early

If the first pass tries to solve every possible widget type, delivery will slow.
The first implementation should support a small but real core widget set with
clear extension points.

## 17. Recommended First Core Widgets

- `core.metric-card`
- `core.chart`
- `core.list`
- `core.table`
- `core.runtime-status`
- `core.integrations-summary`
- `core.agents-summary`
- `core.workspaces-summary`
- `core.jobs-upcoming`
- `core.recent-runs`
- `core.storage-usage`
- `core.files-recent`
- `core.domains-summary`

## 18. Open Decisions

- whether `/app` should remain a multi-Studio hub while `/app/studios/[studioId]`
  becomes the dashboard, or whether `/app` should later become a true executive dashboard
- whether the first saved widget layout should be per Studio only or also user-specific within a Studio
- whether domain counts should be added directly to overview state or sourced from a dedicated domain summary helper
- whether the first dashboard should retain direct action widgets such as `Create workspace` and `Start preview`, or move those into smaller action cards

## 19. Recommendation

Proceed with the Studio dashboard overhaul by first converting the Studio
overview route into a responsive widget-based dashboard using real Nova data,
then use Spec Kit to structure the implementation plan around:

- dashboard layout replacement
- widget renderer foundation
- shared chart widget architecture
- future integration widget extensibility

This preserves the current real data investment while creating a stable path
toward a configurable Studio canvas.
