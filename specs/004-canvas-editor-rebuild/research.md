# Research: Canvas Editor Rebuild

## Decision 1: Delete `components/ui/`, keep `shadcn-components/` as frozen reference

**Decision**: Remove the `components/ui/` directory (duplicate re-exports with zero active imports) and keep `shadcn-components/ui/` as a read-only visual specification.

**Rationale**: Three UI component layers was confusing. `components/ui/` was an incomplete set of re-exports with no unique value. `shadcn-components/` has 57 fully-styled components that define the visual target. `view-ui/` is the runtime layer. Two layers (reference + runtime) is cleaner than three.

**Alternatives considered**:

- Keep all three. Rejected — adds confusion about which layer to import from.
- Delete shadcn-components too. Rejected — we need the Tailwind classes as a visual specification to translate from.
- Move shadcn-components to a separate package. Rejected — it's already in the monorepo, no need to restructure.

## Decision 2: Build missing components before fixing existing ones

**Decision**: Create the 6 missing view-ui components (input, textarea, checkbox, switch, progress, accordion) plus dialog and command before fixing visual gaps in existing components.

**Rationale**: The editor doesn't compile without these components — 8 editor fields import them and will crash. Visual polish on existing components doesn't matter if the editor is broken.

**Alternatives considered**:

- Fix existing components first. Rejected — doesn't unblock the editor.
- Build all components simultaneously. Rejected — missing components are a hard blocker, visual gaps are not.

## Decision 3: Translate Tailwind classes to View props via systematic rules

**Decision**: Use a deterministic translation from Tailwind classes to View inline styles, documented in the `tailwind-to-view-translation.md` reference.

**Rationale**: Every shadcn component's visual appearance is defined entirely by its Tailwind classes. By translating each class mechanically (bg-X → background, text-X → color, px-N → padding, etc.), we achieve guaranteed visual parity without guesswork.

**Alternatives considered**:

- "Eyeball" the visual output. Rejected — fragile, doesn't scale to 57 components, hard to verify.
- Use CSS-in-JS libraries (styled-components, emotion). Rejected — adds a dependency, conflicts with the View primitive approach.
- Keep Tailwind for the editor chrome only. Rejected — user explicitly wants zero Tailwind.

## Decision 4: Incremental refactor, not full rewrite

**Decision**: Keep the existing editor store, context, field system, and View primitive. Only replace the UI component layer and editor shell layout.

**Rationale**: The core architecture (store with path-based selection, View primitive with states/events/theming, CanvasApp runtime) is working. The problem is the component layer — duplicate sources, missing implementations, visual gaps. Rewriting the foundation would lose working code without solving the actual problem.

**Alternatives considered**:

- Full rewrite from scratch. Rejected — would lose working store, context, selection, history, fields, and View primitive.
- Fork Puck and convert to Svelte. Rejected — Puck is React + Tailwind + Redux; converting frameworks is harder than building Svelte-native.

## Decision 5: Match Puck's editor layout, not its internal architecture

**Decision**: The Canvas editor should look and behave like Puck visually (same panels, same interactions) but use Svelte-native patterns internally (runes, stores, context) rather than porting Puck's React internals.

**Rationale**: Puck's UX is proven and well-designed. Its internal architecture (Zustand stores, dnd-kit, Redux-like reducers) is React-specific and would be awkward in Svelte. Matching the visual output while using idiomatic Svelte patterns gives the best result.

**Alternatives considered**:

- Port Puck's exact architecture. Rejected — Zustand → Svelte stores, dnd-kit → Svelte drag, reducer → runes is a 1:1 translation that fights the framework.
- Design a completely new editor UX. Rejected — Puck's UX is the product spec; inventing a new one adds risk without value.

## Decision 6: Focus-visible, disabled, and theme tokens are cross-cutting concerns

**Decision**: All view-ui components need the same set of fixes: focus-visible rings, disabled states, and hardcoded color replacement. These should be addressed systematically across all components rather than per-component.

**Rationale**: The audit found the same 3 issues in nearly every component. A systematic pass ensures consistency and avoids each component implementing these differently.

**Alternatives considered**:

- Fix per-component as needed. Rejected — leads to inconsistent implementations and repeated work.
- Create a View mixin/wrapper for these. Considered — but View's `states` prop already handles this; it just needs to be used consistently.

## Decision 7: CSS animations via `<style>` blocks with `@keyframes`

**Decision**: Where shadcn uses Tailwind's `animate-in/out` utilities (for dialog, drawer, dropdown-menu, etc.), Canvas will use standard CSS `@keyframes` in component `<style>` blocks.

**Rationale**: Tailwind's animation utilities are just shorthand for CSS animations. We can replicate the exact same animations with `@keyframes` in Svelte's `<style>` blocks. This avoids any Tailwind dependency while achieving the same visual result.

**Alternatives considered**:

- Use View's transition prop. Partial — good for simple transitions, but complex enter/exit animations need `<style>` blocks.
- Use Svelte's `transition:` directive. Considered — works for mount/unmount but not for CSS class-based animations that Tailwind's animate utilities produce.
- Skip animations. Rejected — animations are part of the visual fidelity requirement.
