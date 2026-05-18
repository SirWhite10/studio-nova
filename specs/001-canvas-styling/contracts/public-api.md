# Public API Contract: Canvas Styling Layer

## Purpose

Define the initial public API surface for the Canvas styling slice so implementation work can
separate primitive rendering from semantic dashboard components.

## Consumer Entry Points

### Primitive Layer

Canvas MUST expose primitive rendering components that are safe for advanced composition:

- `View`
- `ViewFlex`
- `ViewGrid`

These primitives form the lowest-level reusable layer. They are not the preferred authoring
surface for the dashboard slice, but they remain public and stable enough for internal Canvas
composition and future generated layouts.

### Semantic Dashboard Layer

Canvas MUST expose semantic components for the supported first slice:

- `Card`
- `CardHeader`
- `CardContent`
- `CardFooter`
- `CardAction`
- `SidebarShell`
- `PageHeader`
- `MetricCardSection`
- `ChartShell`
- `TableShell`

## Contract Rules

1. Semantic components MUST compose primitive Canvas rendering rather than directly re-export
   the reference package components.
2. Semantic components MUST express styling through Canvas-owned props and defaults rather
   than relying on imported reference package stylesheets.
3. Primitive components MAY allow low-level overrides, but semantic components SHOULD prefer
   constrained props that reflect layout or component intent.
4. The initial public API MUST support rendering the dashboard demo slice end to end.
5. Full behavioral parity for advanced chart and table internals is outside this contract for
   the first slice; shell composition parity is in scope.
