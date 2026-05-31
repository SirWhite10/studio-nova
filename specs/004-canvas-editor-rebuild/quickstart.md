# Quickstart: Canvas Editor Rebuild

## Goal

Get the canvas editor compiling and rendering with zero Tailwind runtime dependency, using only View-based components from `view-ui/`.

## Steps

1. Install workspace dependencies:

   ```bash
   cd /home/nova/studio-nova && pnpm install
   ```

2. Start the canvas dev server:

   ```bash
   cd /home/nova/studio-nova/packages/canvas && pnpm dev
   ```

3. Verify current state — editor will have import errors for 6 missing view-ui components:

   ```
   view-ui/input/     — imported by 8 field files
   view-ui/textarea/  — imported by TextField
   view-ui/checkbox/  — imported by BooleanField
   view-ui/switch/    — imported by BooleanField, SpacingField
   view-ui/progress/  — imported by ImageField
   view-ui/accordion/ — imported by ObjectField
   ```

4. Create each missing component by translating its shadcn reference:

   For each component:
   a. Read `shadcn-components/ui/<name>/<name>.svelte`
   b. Note all Tailwind classes
   c. Create `view-ui/<name>/<name>.svelte` using `<View>` with equivalent inline styles
   d. Create `view-ui/<name>/index.ts` barrel export
   e. Verify the field file that imports it compiles

5. Create dialog + command components for editor settings/pages:

   a. Read `shadcn-components/ui/dialog/` (8 subcomponents)
   b. Create `view-ui/dialog/` with all subcomponents
   c. Read `shadcn-components/ui/command/` (7 subcomponents)
   d. Create `view-ui/command/` with all subcomponents

6. Migrate editor shell imports off shadcn:

   Files to update:
   - `base/editor/CanvasEditor.svelte` — sidebar import
   - `base/editor/canvas-editor-left-sidebar.svelte` — sidebar import
   - `base/editor/canvas-editor-right-sidebar.svelte` — sidebar import
   - `base/editor/editor-settings.svelte` — dialog import
   - `base/editor/canvas-editor-pages-dialog.svelte` — dialog + command import

7. Verify zero shadcn imports:

   ```bash
   grep -r "shadcn-components" packages/canvas/src/lib/base/ packages/canvas/src/lib/components/view-ui/
   # Should return nothing
   ```

8. Build and verify:

   ```bash
   cd /home/nova/studio-nova/packages/canvas && pnpm build
   ```

## Expected Result

The canvas editor compiles, renders, and all field editors work using exclusively View-based UI components. No Tailwind classes appear in rendered output. The `shadcn-components/` directory still exists as reference but nothing imports from it at runtime.

## Translation Reference

For each Tailwind class → View prop:

| Tailwind                     | View Prop                                        |
| ---------------------------- | ------------------------------------------------ |
| `bg-transparent`             | `background="transparent"`                       |
| `bg-card`                    | `background={canvasTheme.colors.card}`           |
| `text-card-foreground`       | `color={canvasTheme.colors.cardForeground}`      |
| `border-input`               | `border="1px solid ${canvasTheme.colors.input}"` |
| `rounded-md`                 | `borderRadius="0.375rem"`                        |
| `px-3 py-2`                  | `padding="0.5rem 0.75rem"`                       |
| `text-sm`                    | `fontSize="0.875rem"`                            |
| `shadow-xs`                  | `shadow="xs"`                                    |
| `focus-visible:border-ring`  | Via View `states.focus`                          |
| `focus-visible:ring-ring/50` | Via View `states.focus`                          |
| `gap-4`                      | `gap="1rem"`                                     |
| `flex flex-col`              | `display="flex" flexDirection="column"`          |
| `h-5 w-9`                    | `height="1.25rem" width="2.25rem"`               |
| `opacity-50`                 | `opacity=0.5`                                    |
| `pointer-events-none`        | `pointerEvents="none"`                           |
