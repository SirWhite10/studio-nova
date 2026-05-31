<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

<!-- SPECKIT START -->

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`/home/nova/studio-nova/specs/001-canvas-styling/plan.md`

<!-- SPECKIT END -->

## Reference package integration note

- `packages/canvas` currently reuses `packages/shadcn-svelte` source files directly in several `src/lib/components/ui/*` re-export entrypoints.
- Because of that, internal imports inside `packages/shadcn-svelte/src/lib/**` must **not** use the `$lib/...` alias for sibling modules.
- We converted internal `shadcn-svelte` source imports from `$lib/...` to **relative imports** so the reference package is self-contained when consumed from Canvas source.
- Why: when Canvas imports `shadcn-svelte` source files directly, `$lib` resolves to Canvas, not to `shadcn-svelte`, which caused runtime failures like missing `components/ui/label/index.js` from `field-label.svelte`.
- Rule for future work in `packages/shadcn-svelte/src/lib/**`:
  - use relative imports for internal library-to-library references (`../...`, `../../...`)
  - avoid introducing new `$lib/...` imports between files inside the reference package source
  - external consumers may still import through public package entrypoints, but internal source should stay alias-independent
