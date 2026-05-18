# Quickstart: Canvas Styling Layer

## Goal

Render the Canvas demo home page using Canvas-owned primitives and semantic components while
preserving the layout hierarchy of the reference dashboard slice.

## Steps

1. Install workspace dependencies:

   ```bash
   vp install
   ```

2. Start the Canvas demo:

   ```bash
   cd /home/nova/studio-nova/packages/canvas
   npm run dev
   ```

3. Implement the primitive layer needed for the first slice:
   - confirm `View` remains the rendering substrate
   - add or refine `ViewFlex` and `ViewGrid`
   - ensure primitives can express the spacing and shell structure needed by the dashboard

4. Implement the first semantic component family:
   - `Card`
   - `CardHeader`
   - `CardContent`
   - `CardAction`
   - `CardFooter`

5. Replace the current dashboard metric section with Canvas semantic card components and
   confirm that the section preserves the reference dashboard's layout hierarchy.

6. Implement the page shell components:
   - `SidebarShell`
   - `PageHeader`
   - top-level content shell

7. Implement chart and table shells as structural sections only, without attempting full
   advanced behavior in the first slice.

8. Verify the first slice:

   ```bash
   cd /home/nova/studio-nova/packages/shadcn-svelte
   PATH="/home/nova/.local/share/pnpm/bin:$PATH" npm run prepack

   cd /home/nova/studio-nova/packages/canvas
   PATH="/home/nova/.local/share/pnpm/bin:$PATH" npm run build
   ```

## Expected Result

The Canvas home page renders a Canvas-owned dashboard shell with sidebar, header, metric card
section, chart shell, and table shell that aligns with the supported reference slice without
importing the reference stylesheet.
