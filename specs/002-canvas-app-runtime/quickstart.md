# Quickstart: Canvas App Runtime

## Goal

Render authored Canvas documents through `CanvasApp`, use root-owned responsive configuration, and verify that provider runtime and responsive `Text` behavior flow through the app boundary rather than the document tree.

## Steps

1. Install workspace dependencies:

   ```bash
   cd /home/nova/studio-nova && pnpm install
   ```

2. Start the canvas package dev server:

   ```bash
   cd /home/nova/studio-nova/packages/canvas && pnpm dev
   ```

3. Verify a simple `CanvasApp` render path already exists:

   Routes to inspect:
   - `src/routes/document-demo/+page.svelte`
   - `src/routes/form-demo/+page.svelte`
   - `src/routes/landing-canvas/+page.svelte`

4. Confirm the conceptual hierarchy in code:
   - `src/lib/base/canvas-app/CanvasApp.svelte`
   - `src/lib/base/canvas-app/types.ts`
   - `src/lib/base/canvas/canvas.svelte`
   - `src/lib/base/responsive/`
   - `src/lib/base/text/text.svelte`

5. Verify `CanvasApp` stays outside the authored document tree:
   - Open a document file such as `src/routes/landing-canvas/document.ts`
   - Confirm it exports a `CanvasDocument`
   - Confirm that `CanvasApp` is used only at the route/render layer, not as a document child node

6. Verify responsive foundation exports:

   Check `src/lib/index.ts` for exports of:
   - `CanvasApp`
   - breakpoint helpers
   - responsive resolution helpers
   - responsive types

7. Verify provider runtime through `CanvasApp`:
   - Open `src/routes/document-demo/+page.svelte`
   - Confirm `providerData` and `providerActions` are passed into `<CanvasApp />`
   - Trigger one of the provider-backed UI actions in the demo and confirm the UI updates without changing the document structure

8. Verify responsive `Text` ownership:
   - Open `src/lib/blocks/hero/hero-1.svelte`
   - Confirm hero title/description use `<Text>` with responsive `size` props
   - Confirm classes remain present only for non-typography concerns such as balance/layout/effects

9. Verify app-configured responsive behavior:
   - Open `src/routes/landing-canvas/+page.svelte`
   - Confirm `canvasAppConfig.responsive` is built from app-level state
   - Confirm responsive defaults and breakpoint overrides are defined at the app level rather than inside `Text`

10. Verify editor-side app-level editing support:

- Open `src/lib/base/editor/CanvasEditor.svelte`
- Confirm the editor accepts `appConfig`, `appEditorConfig`, and `updateAppProperty`
- Confirm app-level editing paths exist in the current editor shell

11. Run validation:

```bash
cd /home/nova/studio-nova/packages/canvas
vp test
vp build
vp check
```

## Expected Result

You should be able to confirm all of the following:

- `CanvasApp` exists and wraps rendering as a first-class runtime root
- `CanvasDocument` remains the authored serializable model
- `Canvas` remains the renderer
- responsive values support viewport + container branches
- `Text` owns responsive typography
- provider runtime is centralized at the app boundary
- app-level editor inputs exist separately from document/component editing

## Known Follow-Up

The main thing still requiring product/architecture confirmation is whether `CanvasApp` must become a literal root selection object in the editor store, or whether the current app-level editing flows already satisfy that requirement.
