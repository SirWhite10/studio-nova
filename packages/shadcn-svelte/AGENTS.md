# AGENTS.md

## Internal import rule for `src/lib`

This package is consumed directly from source by `packages/canvas` via re-export entrypoints.

Because of that, files inside `packages/shadcn-svelte/src/lib/**` must be **self-contained** and must **not** rely on the consumer's `$lib` alias for internal imports.

### Required rule

- For imports between files inside `src/lib/**`, use **relative imports** only.
- Do **not** use `$lib/...` for internal sibling/library imports inside `src/lib/**`.

### Why

When Canvas imports `packages/shadcn-svelte/src/lib/...` source files directly, `$lib` resolves to Canvas, not this package. That caused runtime failures such as:

- `Cannot find module '$lib/components/ui/label/index.js'`
- triggered from `src/lib/components/ui/field/field-label.svelte`

### What was changed

We converted internal imports in `packages/shadcn-svelte/src/lib/**` from `$lib/...` to relative paths so the reference package works when:

- built normally as `shadcn-svelte`
- consumed directly from source by Canvas

### Important maintenance note

This is a shadcn-style project and component files may be regenerated or overwritten.
If that happens, regenerated files may reintroduce `$lib/...` imports.

After adding/updating components, always verify:

```bash
rg -n '\$lib/' packages/shadcn-svelte/src/lib -g '*.svelte' -g '*.ts'
```

Expected result:
- internal `src/lib` import count should stay at `0`

If any appear again, convert them back to relative imports before considering the component integration complete.
