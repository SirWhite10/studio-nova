## Svelte

You **MUST** use the Svelte 5 API unless explicitly tasked to write Svelte 4 syntax. If you don't know about the API yet, below is the most important information about it. Other syntax not explicitly listed like `{#if ...}` blocks stay the same, so you can reuse your Svelte 4 knowledge for these.

- to mark something a state you use the `$state` rune, e.g. instead of `let count = 0` you do `let count = $state(0)`
- to mark something as a derivation you use the `$derived` rune, e.g. instead of `$: double = count * 2` you do `const double = $derived(count * 2)`
- to create a side effect you use the `$effect` rune, e.g. instead of `$: console.log(double)`you do`$effect(() => console.log(double))`
- to create component props you use the `$props` rune, e.g. instead of `export let foo = true; export let bar;` you do `let { foo = true, bar } = $props();`
- when listening to dom events do not use colons as part of the event name anymore, e.g. instead of `<button on:click={...} />` you do `<button onclick={...} />`

### What are runes?

- Runes are built-in Svelte keywords (prefixed with `$`) that control the compiler. For example, you write `let message = $state('hello');` in a `.svelte` file.
- Do **NOT** treat runes like regular functions or import them; instead, use them as language keywords.
  _In Svelte 4, this syntax did not exist—you relied on reactive declarations and stores; now runes are an integral part of the language._

### $state

- `$state` creates reactive variables that update the UI automatically. For example:
  ```svelte
  <script>
    let count = $state(0);
  </script>
  <button onclick={() => count++}>Clicked: {count}</button>
  ```
- Do **NOT** complicate state management by wrapping it in custom objects; instead, update reactive variables directly.
  _In Svelte 4, you created state with let, e.g. `let count = 0;`, now use the $state rune, e.g. `let count = $state(0);`._
- Arrays and objects become deeply reactive proxies. For example:
  ```js
  let todos = $state([{ done: false, text: "add more todos" }]);
  todos[0].done = !todos[0].done;
  ```
- Do **NOT** destructure reactive proxies (e.g., `let { done } = todos[0];`), as this breaks reactivity; instead, access properties directly.
- Use `$state` in class fields for reactive properties. For example:
  ```js
  class Todo {
    done = $state(false);
    text = $state("");
    reset = () => {
      this.text = "";
      this.done = false;
    };
  }
  ```

### $state.raw

- `$state.raw` creates shallow state where mutations are not tracked. For example:

```js
let person = $state.raw({ name: "Heraclitus", age: 49 });
// Instead of mutating:
// person.age += 1;  // NO effect
person = { name: "Heraclitus", age: 50 }; // Correct way to update
```

- Do **NOT** attempt to mutate properties on raw state; instead, reassign the entire object to trigger updates.

### $state.snapshot

- `$state.snapshot` produces a plain object copy of reactive state. For example:

```svelte
<script>
  let counter = $state({ count: 0 });
  function logSnapshot() {
    console.log($state.snapshot(counter));
  }
</script>
```

- **ONLY** use this if you are told there's a problem with passing reactive proxies to external APIs.

### Passing state into functions

- Pass-by-Value Semantics: Use getter functions to ensure functions access the current value of reactive state. For example:
  ```js
  function add(getA, getB) {
    return () => getA() + getB();
  }
  let a = 1,
    b = 2;
  let total = add(
    () => a,
    () => b,
  );
  console.log(total());
  ```
- Do **NOT** assume that passing a reactive state variable directly maintains live updates; instead, pass getter functions.
  _In Svelte 4, you often used stores with subscribe methods; now prefer getter functions with `$state` / `$derived` instead._

### $derived

- `$derived` computes reactive values based on dependencies. For example:

```svelte
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
<button onclick={() => count++}>{doubled}</button>
```

- Do **NOT** introduce side effects in derived expressions; instead, keep them pure.
  _In Svelte 4 you used `$:` for this, e.g. `$: doubled = count * 2;`, now use the $derived rune instead, e.g `let doubled = $derived(count * 2);`._

#### $derived.by

- Use `$derived.by` for multi-line or complex logic. For example:

```svelte
<script>
  let numbers = $state([1, 2, 3]);
  let total = $derived.by(() => {
    let sum = 0;
    for (const n of numbers) sum += n;
    return sum;
  });
</script>
```

- Do **NOT** force complex logic into a single expression; instead, use `$derived.by` to keep code clear.

#### Overriding derived values

- You can reassign a derived value for features like optimistic UI. It will go back to the `$derived` value once an update in its dependencies happen. For example:

```svelte
<script>
  let post = $props().post;
  let likes = $derived(post.likes);
  async function onclick() {
    likes += 1;
    try { await post.like(); } catch { likes -= 1; }
  }
</script>
```

- Do **NOT** try to override derived state via effects; instead, reassign directly when needed.
  _In Svelte 4 you could use `$:` for that, e.g. `$: likes = post.likes; likes = 1`, now use the `$derived` instead, e.g. `let likes = $derived(post.likes); likes = 1;`._

### $effect

- `$effect` executes functions when reactive state changes. For example:

```svelte
<script>
  let size = $state(50);
  $effect(() => {
    console.log('Size changed:', size);
  });
</script>
```

- Do **NOT** use `$effect` for state synchronization; instead, use it only for side effects like logging or DOM manipulation.
  _In Svelte 4, you used reactive statements (`$:`) for similar tasks, .e.g `$: console.log(size)`; now use the `$effect` rune instead, e.g. `$effect(() => console.log(size))` ._

#### Understanding lifecycle (for $effect)

- Effects run after the DOM updates and can return teardown functions. For example:

```svelte
<script>
  let count = $state(0);
  $effect(() => {
    const interval = setInterval(() => { count += 1; }, 1000);
    return () => clearInterval(interval);
  });
</script>
```

- **Directive:** Do **NOT** ignore cleanup; instead, always return a teardown function when needed.

#### $effect.pre

- `$effect.pre` works like `$effect` with the only difference that it runs before the DOM updates. For example:

```svelte
<script>
  let div = $state();
  $effect.pre(() => {
    if (div) console.log('Running before DOM update');
  });
</script>
```

- Do **NOT** use `$effect.pre` for standard post-update tasks; instead, reserve it for pre-DOM manipulation like autoscrolling.

#### $effect.tracking

- `$effect.tracking` indicates if code is running inside a reactive context. For example:

```svelte
<script>
  $effect(() => {
    console.log('Inside effect, tracking:', $effect.tracking());
  });
</script>
```

- Do **NOT** misuse tracking information outside its intended debugging context; instead, use it to enhance reactive debugging.
  _In Svelte 4, no equivalent existed; now this feature offers greater insight into reactivity._

#### $effect.root

- `$effect.root` creates a non-tracked scope for nested effects with manual cleanup. For example:

```svelte
<script>
  let count = $state(0);
  const cleanup = $effect.root(() => {
    $effect(() => {
      console.log('Count is:', count);
    });
    return () => console.log('Root effect cleaned up');
  });
</script>
```

- Do **NOT** expect root effects to auto-cleanup; instead, manage their teardown manually.
  _In Svelte 4, manual cleanup required explicit lifecycle hooks; now `$effect.root` centralizes this control._

### $props

- Use `$props` to access component inputs. For example:

```svelte
<script>
  let { adjective } = $props();
</script>
<p>This component is {adjective}</p>
```

- Do **NOT** mutate props directly; instead, use callbacks or bindable props to communicate changes.
  _In Svelte 4, props were declared with `export let foo`; now you use `$props` rune, e.g. `let { foo } = $props()`._
- Declare fallback values via destructuring. For example:

```js
let { adjective = "happy" } = $props();
```

- Rename props to avoid reserved keywords. For example:

```js
let { super: trouper } = $props();
```

- Use rest syntax to collect all remaining props. For example:

```js
let { a, b, ...others } = $props();
```

#### $props.id()

- Generate a unique ID for the component instance. For example:

```svelte
<script>
  const uid = $props.id();
</script>
<label for="{uid}-firstname">First Name:</label>
<input id="{uid}-firstname" type="text" />
```

- Do **NOT** manually generate or guess IDs; instead, rely on `$props.id()` for consistency.

### $bindable

- Mark props as bindable to allow two-way data flow. For example, in `FancyInput.svelte`:

```svelte
<script>
  let { value = $bindable() } = $props();
</script>
<input bind:value={value} />
```

- Do **NOT** overuse bindable props; instead, default to one-way data flow unless bi-directionality is truly needed.
  _In Svelte 4, all props were implicitly bindable; in Svelte 5 `$bindable` makes this explicit._

### $host

- Only available inside custom elements. Access the host element for custom event dispatching. For example:

```svelte
<script>
  function dispatch(type) {
    $host().dispatchEvent(new CustomEvent(type));
  }
</script>
<button onclick={() => dispatch('increment')}>Increment</button>
```

- Do **NOT** use this unless you are explicitly tasked to create a custom element using Svelte components

### {#snippet ...}

- **Definition & Usage:**
  Snippets allow you to define reusable chunks of markup with parameters inside your component.
  _Example:_
  ```svelte
  {#snippet figure(image)}
    <figure>
      <img src={image.src} alt={image.caption} width={image.width} height={image.height} />
      <figcaption>{image.caption}</figcaption>
    </figure>
  {/snippet}
  ```
- **Parameterization:**
  Snippets accept multiple parameters with optional defaults and destructuring, but rest parameters are not allowed.
  _Example with parameters:_
  ```svelte
  {#snippet name(param1, param2)}
    <!-- snippet markup here -->
  {/snippet}
  ```

### Snippet scope

- **Lexical Visibility:**
  Snippets can be declared anywhere and reference variables from their outer lexical scope, including script or block-level declarations.
  _Example:_
  ```svelte
  <script>
    let { message = "it's great to see you!" } = $props();
  </script>
  {#snippet hello(name)}
    <p>hello {name}! {message}!</p>
  {/snippet}
  {@render hello('alice')}
  ```
- **Scope Limitations:**
  Snippets are only accessible within their lexical scope; siblings and child blocks share scope, but nested snippets cannot be rendered outside.
  _Usage caution:_ Do **NOT** attempt to render a snippet outside its declared scope.

### Passing snippets to components

- **As Props:**
  Within a template, snippets are first-class values that can be passed to components as props.
  _Example:_
  ```svelte
  <script>
    import Table from './Table.svelte';
    const fruits = [
      { name: 'apples', qty: 5, price: 2 },
      { name: 'bananas', qty: 10, price: 1 }
    ];
  </script>
  {#snippet header()}
    <th>fruit</th>
    <th>qty</th>
    <th>price</th>
    <th>total</th>
  {/snippet}
  {#snippet row(d)}
    <td>{d.name}</td>
    <td>{d.qty}</td>
    <td>{d.price}</td>
    <td>{d.qty * d.price}</td>
  {/snippet}
  <Table data={fruits} {header} {row} />
  ```
- **Slot-like Behavior:**
  Snippets declared inside component tags become implicit props (akin to slots) for the component.
  _Svelte 4 used slots for this, e.g. `<Component><p slot="x" let:y>hi {y}</p></Component>`; now use snippets instead, e.g. `<Component>{#snippet x(y)}<p>hi {y}</p>{/snippet}</Component>`._
- **Content Fallback:**
  Content not wrapped in a snippet declaration becomes the `children` snippet, rendering as fallback content.
  _Example:_
  ```svelte
  <!-- App.svelte -->
  <Button>click me</Button>
  <!-- Button.svelte -->
  <script>
    let { children } = $props();
  </script>
  <button>{@render children()}</button>
  ```

### Typing snippets

- Snippets implement the `Snippet` interface, enabling strict type checking in TypeScript or JSDoc.
  _Example:_

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  interface Props {
    data: any[];
    children: Snippet;
    row: Snippet<[any]>;
  }
  let { data, children, row }: Props = $props();
</script>
```

### {@render ...}

- Use the {@render ...} tag to invoke and render a snippet, passing parameters as needed.
  _Example:_
  ```svelte
  {#snippet sum(a, b)}
    <p>{a} + {b} = {a + b}</p>
  {/snippet}
  {@render sum(1, 2)}
  ```
- Do **NOT** call snippets without parentheses when parameters are required; instead, always invoke the snippet correctly.
  _In Svelte 4, you used slots for this, e.g. `<slot name="sum" {a} {b} />`; now use `{@render}` instead, e.g. `{@render sum(a,b)}`._

### <svelte:boundary>

- Use error boundary tags to prevent rendering errors in a section from crashing the whole app.
  _Example:_

  ```svelte
  <svelte:boundary onerror={(error, reset) => console.error(error)}>
    <FlakyComponent />
  </svelte:boundary>
  ```

- **Failed Snippet for Fallback UI:**
  Providing a `failed` snippet renders fallback content when an error occurs and supplies a `reset` function.
  _Example:_

  ```svelte
  <svelte:boundary>
    <FlakyComponent />
    {#snippet failed(error, reset)}
      <button onclick={reset}>Oops! Try again</button>
    {/snippet}
  </svelte:boundary>
  ```

### class

- Svelte 5 allows objects for conditional class assignment using truthy keys. It closely follows the `clsx` syntax
  _Example:_

```svelte
<script>
  let { cool } = $props();
</script>
<div class={{ cool, lame: !cool }}>Content</div>
```

runes are imported automactically. no need to import any functions that start with '$'

# Nova Cloud – Studios, Agents, and Runtime

**Document Name:** `AGENTS.md`
**Version:** 1.1 (March 2026)
**Related Documents:** [planning/NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md](./planning/NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md), [planning/STUDIOS_INFORMATION_ARCHITECTURE_PLAN.md](./planning/STUDIOS_INFORMATION_ARCHITECTURE_PLAN.md), [PLAN_CHAT_PERSISTENCE.md](./PLAN_CHAT_PERSISTENCE.md)

This file documents how Nova Cloud should be implemented and evolved, including Studios, agents, runtime behavior, Svelte requirements, and architecture references.
For pricing, overall architecture, business strategy, and higher-level product direction, see the referenced planning documents.

## Nova Studios Model

Nova now uses `Studio` as the top-level user-facing concept.

- `Studio`
  - The primary app-shell object users select in the UI.
  - A Studio contains chats, runtime state, skills, settings, and future capabilities.
- `sandbox`
  - The runtime / execution term.
  - This should remain an internal or technical term, not the primary product noun.
- `agent`
  - The AI execution concept.
  - This term is still valid technically, but should not replace `Studio` as the main user-facing shell concept.
- `Integrations`
  - The user-facing sidebar label for Studio-connected capabilities like Stripe, GitHub, Notion, email, and similar features.
- `extensions`
  - The internal implementation term for the records that power `Integrations`.

### Canonical Planning References

- `planning/STUDIOS_INFORMATION_ARCHITECTURE_PLAN.md`
  - Canonical reference for Studio-first information architecture, app shell, sidebar, onboarding, and Integrations behavior.
- `PLAN_CHAT_PERSISTENCE.md`
  - Canonical reference for durable chat runs, live streaming, and final message persistence.

Any Studio navigation, root app-shell, dashboard, or sidebar work should follow `planning/STUDIOS_INFORMATION_ARCHITECTURE_PLAN.md`.

### Sidebar Rules

- The app shell is Studio-first, not chat-first.
- The selected Studio controls the middle section of the sidebar.
- Chats are scoped to the selected Studio.
- Skills, runtime, settings, and integrations are also scoped to the selected Studio.
- `Integrations` must be treated as a dynamic sidebar group.
- Example: if a user enables Stripe for a Studio, `Stripe` should appear under `Integrations` for that Studio.
- Use `Integrations` in user-facing copy.
- Use `extensions` only as the internal implementation term.

### Svelte Skills Guidance

When editing Svelte routes, layouts, dashboard pages, Studio pages, sidebar navigation, or Studio-related UI, load these skills first:

- `svelte-web-builder`
- `svelte-core-bestpractices`

These should be treated as required guidance for Studio shell and Svelte UI work.

## 1. What is a Nova Cloud Agent?

A Nova Cloud Agent is a persistent, isolated AI assistant running inside a dedicated sandbox runtime.
Each agent has:

- Its own `/workspace` filesystem (R2-mounted, persistent across sessions)
- Independent memory thread and conversation history
- Full Bun runtime + Git/package manager access
- Ability to run dev servers (`bun run dev`) with hot reload
- Public preview URLs when a server is active

Agents are fully isolated from each other and from other users — security matches or exceeds local OpenClaw.

## 2. Multiple Agents and Studios

Nova Cloud's platform differentiator is support for multiple independent AI execution contexts and multiple user-facing Studios.

| Tier      | Max Agents | Max Studios | Example Use Case                                         |
| --------- | ---------- | ----------- | -------------------------------------------------------- |
| Starter   | 1          | 1           | Single personal assistant                                |
| Pro       | 3          | 3           | Coding agent + content agent + personal automation agent |
| Unlimited | Unlimited  | Unlimited   | Separate agents per client, project, hobby, or life area |

**Technical implementation:**

- Each agent is a row in Convex `agents` table
- Each agent has a unique sandbox ID (`nova-agent-${userId}-${agentId}`)
- Each agent has a dedicated R2 sub-bucket mounted at `/workspace`
- The user-facing UI should prefer Studio switching and Studio-scoped navigation over a global chat list

**Example folder structure** (per user, visible in UI):
/workspace
├── agent-coding/ # Agent 1: sveltekit + Bun project
├── agent-content/ # Agent 2: Blog posts, social media drafts
└── agent-personal/ # Agent 3: Calendar + email automation scripts

## 3. Agent Lifecycle and Sandbox Behavior

1. User creates/selects an agent in the Svelte 5 UI
2. Prompt sent → Grok generates PTC script (single call)
3. Normal chat stays lightweight unless the model explicitly needs runtime execution
4. If runtime work is needed, Nova uses Studio runtime tools to start or reuse the sandbox on demand
5. Executes Bun commands (clone repo, `bun install`, `bun run dev`, etc.)
6. If a server starts, Nova can persist one primary Studio preview/dev server record and expose a preview URL
7. Sandbox sleeps automatically after 10 minutes inactivity (configurable in Pro+)
8. Files persist in R2 — next interaction wakes up instantly

**Long-running servers**:

- `bun run dev` processes stay alive until user stops them or sandbox sleeps
- Each Studio currently supports one primary preview/dev server record at a time
- Preview URLs remain active while the process runs

### Studio Runtime Tooling

Nova should prefer an on-demand runtime model:

- normal chat, memory, and skill usage should not start the runtime unless execution is actually required
- runtime capabilities should be exposed through tool-like or MCP-like surfaces instead of eager sandbox startup per message

Current runtime tool families include:

- lifecycle: `runtime_status`, `runtime_start`, `runtime_stop`
- general execution: `runtime_shell`, `runtime_filesystem`
- installed CLI wrappers: `runtime_browser`, `runtime_firecrawl`, `runtime_context7`, `runtime_wrangler`
- scaffolding and preview workflows: `runtime_vite_create`, `runtime_svelte_create`, `runtime_dev_start`, `runtime_dev_stop`, `runtime_dev_logs`, `runtime_preview_status`

Studio runtime UI should surface:

- runtime wake/sleep/refresh controls
- runtime health and expiry metadata
- one primary preview/dev server per Studio with preview URL and recent logs

## 4. Bring Your Own Key (BYOK) per Agent

Users can optionally attach their own Grok API key to any agent:

- Higher rate limits
- Complete key privacy (Nova never sees it)
- Still uses Nova’s sandbox, PTC pattern, and workspace isolation

## 5. Example – Executing a PTC Script in an Agent’s Sandbox

````ts
// lib/agent-executor.ts (called from SvelteKit API route or Convex action)
import { getSandbox } from '@cloudflare/sandbox';

export async function executeInAgentSandbox(
  userId: string,
  agentId: string,
  ptcScript: string,
  repoUrl?: string,
  env: Env
) {
  const sandbox = getSandbox(env.Sandbox, `nova-agent-${userId}-${agentId}`, {
    sleepAfter: '10m',
    keepAlive: false
  });

  await sandbox.mountBucket(`nova-workspace-${agentId}`, '/workspace');

  // Optional: clone repo
  if (repoUrl) {
    await sandbox.exec(`bunx git clone ${repoUrl} /workspace/project`);
  }

  // Write and run PTC script
  await sandbox.writeFile('/workspace/agent-task.ts', ptcScript);
  const result = await sandbox.exec('bun run /workspace/agent-task.ts', {
    cwd: '/workspace/project',
    stream: true
  });

  // Optional: start dev server
  let previewUrl: string | null = null;
  if (result.stdout.includes('dev server')) {
    const devProcess = await sandbox.startProcess('bun run dev', {
      cwd: '/workspace/project',
      env: { PORT: '3000' }
    });
    const preview = await sandbox.exposePort(3000, {
      hostname: new URL(request.url).hostname,
      token: `preview-${userId}-${agentId}`
    });
    previewUrl = preview.url;
  }

  return { logs: result.stdout, previewUrl };
}
6. Svelte 5 Runes Example – Agent Switcher UI
<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
  let { data } = $props();
  let currentAgentId = $state(data.agents[0]?.id ?? '');

  const agents = $derived(data.agents);
</script>

<div class="agent-switcher">
  {#each agents as agent}
    <button
      class:active={agent.id === currentAgentId}
      onclick={() => currentAgentId = agent.id}
    >
      {agent.name}
    </button>
  {/each}
</div>

<style>
  .agent-switcher { display: flex; gap: 0.5rem; }
  button.active { background: #0070f3; color: white; }
</style>
This file serves as the canonical implementation guide for how Studios, agents, and sandbox-backed runtime behavior are structured in Nova Cloud.

### 2. `MIGRATION_STEPS.md` (if you decide to migrate execution layer later)

```markdown
# Nova Cloud – Migration Steps (e.g., to E2B or other sandbox provider)

**Document Name:** `MIGRATION_STEPS.md`
**Version:** 1.0 (March 2026)
**Related Document:** [NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md](./NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md)

This file outlines the steps to migrate the execution layer (currently Cloudflare Sandbox) to another provider (e.g. E2B, Northflank, Fly Machines, or self-hosted Firecracker) while preserving Bun runtime, PTC pattern, multi-agent workspaces, and Svelte 5 frontend.

## 1. Why Migrate?

- Better long-running session support
- Different pricing model
- More mature agent-specific SDKs
- Additional features (Jupyter-style execution, built-in plotting, etc.)

## 2. Preparation Checklist

- [ ] Choose target provider (e.g. E2B)
- [ ] Create account & get API key
- [ ] Install SDK/CLI for target (e.g. `bun add @e2b/sdk`)
- [ ] Build/test custom template/image with Bun pre-installed
- [ ] Identify all places where Cloudflare Sandbox is called (search for `getSandbox`, `mountBucket`, `exec`, `startProcess`, `exposePort`)

## 3. Step-by-Step Migration (Example: to E2B)

### Step 3.1 – Create Bun-powered template

```bash
mkdir e2b-nova-bun
cd e2b-nova-bun

cat <<EOF > Dockerfile
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y curl unzip git ca-certificates
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"
RUN bun install -g typescript
WORKDIR /home/user
CMD ["bash"]
EOF

cat <<EOF > e2b.toml
name = "nova-bun-agent"
description = "Bun runtime for Nova Cloud agents"
EOF

bunx @e2b/cli template create --name nova-bun-agent --dockerfile ./Dockerfile
Step 3.2 – Update agent executor code
Replace Cloudflare calls with E2B equivalents:
// lib/agent-executor.ts (after migration)
import { Sandbox } from '@e2b/sdk';

export async function runPtcInAgentSandbox(
  userId: string,
  agentId: string,
  grokGeneratedScript: string,
  repoUrl?: string
) {
  const sandbox = await Sandbox.create({
    apiKey: process.env.E2B_API_KEY,
    template: 'nova-bun-agent',
    metadata: { userId, agentId }
  });

  try {
    if (repoUrl) {
      await sandbox.process.startAndWait(`git clone ${repoUrl} /home/user/project`);
    }

    await sandbox.filesystem.write('/home/user/agent-task.ts', grokGeneratedScript);

    const execResult = await sandbox.process.startAndWait(
      'bun run /home/user/agent-task.ts',
      { cwd: '/home/user/project' }
    );

    // Long-running dev server
    const devProcess = await sandbox.process.start('bun run dev', {
      cwd: '/home/user/project',
      env: { PORT: '3000' }
    });

    const previewUrl = await sandbox.getUrl(3000);

    return {
      previewUrl,
      logs: execResult.stdout,
      processId: devProcess.pid
    };
  } finally {
    // Keep alive or close based on use-case
    // await sandbox.close();
  }
}
Step 3.3 – Data & Persistence Migration

Manually copy files from old R2 buckets → new sandbox via filesystem.write
Update Convex agents table to store sandboxProvider and sandboxId

Step 3.4 – Test & Rollout

Run full POC per agent tier
Monitor cost (E2B Pro $150/mo base + per-second usage)
Roll out to new users first → migrate existing gradually
Keep old Cloudflare code as fallback (conditional import)

4. Rollback Plan

Revert to Cloudflare Sandbox if E2B latency, cost, or preview URLs don’t meet expectations
Use feature flag in Convex (sandboxProvider: 'cloudflare' | 'e2b')

5. Recommended Providers for Future Evaluation

E2B (current focus)
Northflank / Fly Machines (BYOC options)
Self-hosted Firecracker (advanced, high ops)

Cross-reference: Full business strategy, pricing details, revenue projections, and overall architecture are documented in `planning/NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md`.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Start

- create - Create a new project from a template
- migrate - Migrate an existing project to Vite+
- config - Configure hooks and agent integration
- staged - Run linters on staged files
- install (`i`) - Install dependencies
- env - Manage Node.js versions

### Develop

- dev - Run the development server
- check - Run format, lint, and TypeScript type checks
- lint - Lint code
- fmt - Format code
- test - Run tests

### Execute

- run - Run monorepo tasks
- exec - Execute a command from local `node_modules/.bin`
- dlx - Execute a package binary without installing it as a dependency
- cache - Manage the task cache

### Build

- build - Build for production
- pack - Build libraries
- preview - Preview production build

### Manage Dependencies

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- add - Add packages to dependencies
- remove (`rm`, `un`, `uninstall`) - Remove packages from dependencies
- update (`up`) - Update packages to latest versions
- dedupe - Deduplicate dependencies
- outdated - Check for outdated packages
- list (`ls`) - List installed packages
- why (`explain`) - Show why a package is installed
- info (`view`, `show`) - View package information from the registry
- link (`ln`) / unlink - Manage local package links
- pm - Forward a command to the package manager

### Maintain

- upgrade - Update `vp` itself to the latest version

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ built-in commands (`vp dev`, `vp build`, `vp test`, etc.) always run the Vite+ built-in tool, not any `package.json` script of the same name. To run a custom script that shares a name with a built-in command, use `vp run <script>`. For example, if you have a custom `dev` script that runs multiple services concurrently, run it with `vp run dev`, not `vp dev` (which always starts Vite's dev server).
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## CI Integration

For GitHub Actions, consider using [`voidzero-dev/setup-vp`](https://github.com/voidzero-dev/setup-vp) to replace separate `actions/setup-node`, package-manager setup, cache, and install steps with a single action.

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
- run: vp check
- run: vp test
```

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
<!--VITE PLUS END-->
````
