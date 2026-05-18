# Data Model: Canvas Styling Layer

## Primitive View Component

**Purpose**: Lowest-level rendering substrate for Canvas-owned layout and style application.

**Fields**:

- `as`: rendered element type
- `class`: optional escape hatch for authored classes
- `style`: optional escape hatch for authored inline styles
- `children`: rendered nested content
- primitive layout and appearance props supported by the Canvas primitive layer

**Relationships**:

- Used by `Semantic Layout Component`
- Used by `Semantic Card Component`
- Used by `Dashboard Shell Component`

## Semantic Layout Component

**Purpose**: Expresses layout intent such as stack, inline row, grid, container, and inset
shell without requiring screens to author every visual detail through primitive props.

**Fields**:

- `kind`: stack, inline, grid, container, shell, inset
- `gap`
- `align`
- `justify`
- `wrap`
- `surface`
- `children`

**Relationships**:

- Composes one or more `Primitive View Component` instances
- Used by `Dashboard Slice`

## Semantic Card Component

**Purpose**: Reusable card system for metric cards and future card-based component families.

**Fields**:

- `variant`: base, metric, shell
- `surface`
- `density`
- `border`
- `interactive`
- named regions: `header`, `content`, `action`, `footer`

**Relationships**:

- Composes `Primitive View Component`
- May contain `Semantic Layout Component`
- Used by `Dashboard Slice`

## Dashboard Shell Component

**Purpose**: Represents the page-level shell for the Canvas demo, including sidebar region,
header region, and primary content area.

**Fields**:

- `sidebar`
- `header`
- `main`
- shell sizing and spacing configuration

**Relationships**:

- Composes `Semantic Layout Component`
- Contains `Semantic Card Component`
- Contains chart and table shell sections

## Dashboard Slice

**Purpose**: The supported first milestone for Canvas styling parity.

**Fields**:

- `sidebarShell`
- `pageHeader`
- `metricCardSection`
- `chartShell`
- `tableShell`

**Relationships**:

- Rendered by the Canvas demo home page
- Derived from the `Reference Dashboard`

## Reference Dashboard

**Purpose**: Existing package-owned dashboard used as the parity target for structure and
visual hierarchy.

**Fields**:

- ordered regions
- card composition patterns
- sidebar composition patterns
- shell section boundaries

**Relationships**:

- Drives implementation acceptance for `Dashboard Slice`

## State Transitions

This first slice focuses on populated dashboard rendering. The implemented components must
preserve room for later introduction of empty, loading, and error variants without requiring a
different component model.
