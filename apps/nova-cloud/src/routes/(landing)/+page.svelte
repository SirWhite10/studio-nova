<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import * as Card from '$lib/components/ui/card';
  import * as Accordion from '$lib/components/ui/accordion';
  import { Separator } from '$lib/components/ui/separator';
  import ModeToggle from '$lib/components/mode-toggle.svelte';
  import NovaLogo from '$lib/components/nova-logo.svelte';
  import { userStore } from '$lib/user-store.svelte';

  let { data } = $props();
  const isLoggedIn = $derived(data.isAuthenticated);

  const features = [
    {
      icon: '💾',
      title: 'Persistent Sandbox',
      description: 'Your files, repos, and dev servers survive across sessions. No rebuilding from scratch every time you log in.',
    },
    {
      icon: '🐙',
      title: 'GitHub Clone & Dev Servers',
      description: 'Clone any repo, run any language, start dev servers with hot reload — all inside your isolated cloud sandbox.',
    },
    {
      icon: '🔗',
      title: 'Live Preview URLs',
      description: 'Expose your running dev server to the world instantly. Share a stable preview URL with clients or your team.',
    },
    {
      icon: '🤖',
      title: 'Multi-Agent Workspaces',
      description: 'Run multiple independent agents in parallel, each with its own isolated workspace, filesystem, and memory.',
    },
    {
      icon: '🧠',
      title: 'Semantic Memory',
      description: 'Nova remembers context across conversations. Relevant past sessions are surfaced automatically when you need them.',
    },
    {
      icon: '🔑',
      title: 'Bring Your Own Key',
      description: 'Plug in your own xAI Grok API key on any plan — at no extra cost — for higher rate limits and complete privacy.',
    },
  ];

  const steps = [
    {
      n: '1',
      title: 'You prompt Nova',
      body: 'Describe your task in plain English. Clone a repo, build a feature, fix a bug, write a script — anything.',
    },
    {
      n: '2',
      title: 'Grok 4 plans & executes',
      body: 'Grok generates a complete execution plan and runs it step-by-step inside your dedicated Linux sandbox.',
    },
    {
      n: '3',
      title: 'Live preview, instantly',
      body: 'Your dev server starts, a stable preview URL appears. Share it with anyone, iterate, and ship.',
    },
  ];

  const testimonials = [
    {
      quote: "I used to spend $80/month on a VPS I barely touched. Nova Cloud gives me a smarter, always-on dev environment for a fraction of the cost.",
      name: 'Jamie L.',
      role: 'Indie hacker',
      initials: 'JL',
    },
    {
      quote: "The persistent sandbox is a game-changer. I pause mid-task, close my laptop, come back the next day and everything is exactly where I left it.",
      name: 'Arjun K.',
      role: 'Senior engineer',
      initials: 'AK',
    },
    {
      quote: "Live preview URLs mean I can share a running dev server with a client in 10 seconds. Used to take half an hour of ngrok gymnastics.",
      name: 'Sofia R.',
      role: 'Freelance developer',
      initials: 'SR',
    },
  ];

  const faqs = [
    {
      q: 'Do my files persist when I close the browser?',
      a: 'Yes. Your sandbox is backed by persistent object storage mounted as a real filesystem. Files, installed packages, and git repositories survive across sessions and sandbox restarts.',
    },
    {
      q: 'How is this different from buying a Mac Mini?',
      a: 'No hardware purchase (save $1,000+), no electricity bill, no maintenance, no physical security risk. Nova Cloud gives you an always-on Linux sandbox ready in seconds, accessible from any device.',
    },
    {
      q: 'Is my sandbox isolated from other users?',
      a: 'Completely. Every user gets a dedicated container with scoped object storage. No shared filesystems, no cross-user data access. Audit logging records every command and file operation.',
    },
    {
      q: 'Can I use my own AI API key?',
      a: 'Yes, on any plan at no extra cost. Add your own xAI Grok key to get higher rate limits and keep your key completely private.',
    },
    {
      q: 'What happens if I cancel?',
      a: 'You keep full access until the end of your billing period. We also offer a 14-day money-back guarantee — no questions asked.',
    },
    {
      q: 'What languages and runtimes are supported?',
      a: 'The sandbox runs a full Linux environment. Any language, any runtime — Node, Bun, Python, Go, Rust, Ruby. If it runs on Linux, it runs in Nova Cloud.',
    },
  ];
</script>

<!-- ─── Navigation ──────────────────────────────────────────── -->
<nav class="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
  <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
    <NovaLogo class="gap-1.5 text-xl font-extrabold tracking-tight select-none" />

    <div class="hidden items-center gap-7 text-sm font-medium md:flex">
      <a href="#features"     class="text-muted-foreground hover:text-foreground transition-colors">Features</a>
      <a href="#how-it-works" class="text-muted-foreground hover:text-foreground transition-colors">How it works</a>
      <a href="/pricing"      class="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
      <a href="#faq"          class="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
    </div>

    <div class="flex items-center gap-2">
      <ModeToggle />
      {#if isLoggedIn}
        <Button size="sm" href="/app">Dashboard</Button>
        <Button variant="ghost" size="sm" onclick={() => userStore.logout()}>Logout</Button>
      {:else}
        <a href="/auth/sign-in"><Button variant="ghost" size="sm">Sign in</Button></a>
        <a href="/auth/sign-up"><Button size="sm">Get started</Button></a>
      {/if}
    </div>
  </div>
</nav>

<!-- ─── Hero ───────────────────────────────────────────────── -->
<section class="relative overflow-hidden bg-foreground text-background">
  <!-- Subtle dot-grid overlay -->
  <div
    class="pointer-events-none absolute inset-0 opacity-[0.04]"
    style="background-image: radial-gradient(circle, currentColor 1px, transparent 1px); background-size: 28px 28px;"
  ></div>

  <div class="relative mx-auto max-w-7xl px-6 py-28 text-center lg:py-36">
    <Badge class="mb-6 border-primary/30 bg-primary/15 text-primary hover:bg-primary/25">
      Hosted workspaces · Optional Nova AI credits
    </Badge>

    <h1 class="mx-auto max-w-4xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
      Your AI agent.<br />
      <span class="text-primary">Always on.</span> Always yours.
    </h1>

    <p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-background/65">
      A fully managed cloud sandbox — persistent Linux environment, GitHub integration,
      live preview URLs — without buying a $1,000+ Mac Mini or managing a single server.
    </p>

      <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        {#if isLoggedIn}
         <a href="/app">
            <Button size="lg" class="px-8 text-base shadow-lg">
              Open Dashboard
            </Button>
          </a>
          <a href="/app/settings">
            <Button size="lg" variant="outline" class="border-background/25 px-8 text-base text-background hover:bg-background/10 hover:text-background">
              Manage Account
            </Button>
          </a>
        {:else}
          <a href="/auth/sign-up">
            <Button size="lg" class="px-8 text-base shadow-lg">
              Start with a workspace
            </Button>
          </a>
          <a href="#how-it-works">
            <Button
              size="lg"
              variant="outline"
              class="border-background/25 px-8 text-base text-background hover:bg-background/10 hover:text-background"
            >
              See how it works
            </Button>
          </a>
        {/if}
      </div>

    <p class="mt-5 text-sm text-background/35">14-day money-back guarantee · Cancel anytime</p>
  </div>
</section>

<!-- ─── Social proof strip ─────────────────────────────────── -->
<div class="border-b border-border bg-muted/30 py-5">
  <div class="mx-auto max-w-4xl px-6 text-center">
    <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      The fastest path from idea to running code — no hardware required
    </p>
  </div>
</div>

<!-- ─── Comparison ─────────────────────────────────────────── -->
<section class="border-b border-border bg-muted/20 py-20">
  <div class="mx-auto max-w-5xl px-6">
    <p class="mb-10 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
      The old way vs. Nova Cloud
    </p>
    <div class="grid gap-5 md:grid-cols-3">
      <!-- Old way -->
      <Card.Root class="border-destructive/25 bg-destructive/5">
        <Card.Header>
          <Card.Title class="text-base">The Old Way</Card.Title>
          <Card.Description>Mac Mini / local Docker</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-2 text-sm text-muted-foreground">
          <p>❌ $1,000+ hardware purchase</p>
          <p>❌ Power bills & maintenance</p>
          <p>❌ Only accessible from home</p>
          <p>❌ Single machine, no scaling</p>
          <p>❌ You manage security updates</p>
          <p>❌ Setup takes hours</p>
        </Card.Content>
      </Card.Root>

      <!-- Nova Cloud -->
      <Card.Root class="relative border-primary/40 bg-primary/5 shadow-md">
        <Card.Header>
          <Badge class="mb-1 w-fit bg-primary text-primary-foreground">Nova Cloud</Badge>
          <Card.Title class="text-base">Cloud-Native Agent</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-2 text-sm">
          <p>✅ Workspaces start at $5/mo</p>
          <p class="font-medium">✅ Files persist across sessions</p>
          <p>✅ Access from any device</p>
          <p>✅ Multiple agents & workspaces</p>
          <p>✅ Managed security and runtime updates</p>
          <p>✅ Zero setup, zero maintenance</p>
        </Card.Content>
      </Card.Root>

      <!-- Included -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="text-base">Every plan includes</Card.Title>
          <Card.Description>No hidden extras</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-2 text-sm text-muted-foreground">
          <p>🐧 Full Linux sandbox</p>
          <p>📁 Persistent object filesystem</p>
          <p>🔗 Live preview URLs</p>
          <p>🧠 Semantic memory</p>
          <p>🔑 BYOK at no extra cost</p>
          <p>🛡 Per-user isolated container</p>
        </Card.Content>
      </Card.Root>
    </div>
  </div>
</section>

<!-- ─── Features ───────────────────────────────────────────── -->
<section id="features" class="py-24">
  <div class="mx-auto max-w-7xl px-6">
    <div class="mb-16 text-center">
      <Badge variant="outline" class="mb-4">Features</Badge>
      <h2 class="text-4xl font-bold tracking-tight">Everything you need. Nothing you don't.</h2>
      <p class="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
        Nova Cloud handles the infrastructure so you can focus on what you're building.
      </p>
    </div>

    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {#each features as f}
        <Card.Root class="transition-shadow hover:shadow-md">
          <Card.Header>
            <div class="mb-2 text-3xl">{f.icon}</div>
            <Card.Title class="text-base">{f.title}</Card.Title>
          </Card.Header>
          <Card.Content>
            <p class="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  </div>
</section>

<!-- ─── How it works ──────────────────────────────────────── -->
<section id="how-it-works" class="border-y border-border bg-muted/30 py-24">
  <div class="mx-auto max-w-4xl px-6">
    <div class="mb-16 text-center">
      <Badge variant="outline" class="mb-4">How it works</Badge>
      <h2 class="text-4xl font-bold tracking-tight">From prompt to live preview in seconds.</h2>
    </div>

    <!-- Steps -->
    <div class="grid gap-10 md:grid-cols-3">
      {#each steps as step, i}
        <div class="flex flex-col items-center text-center">
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
            {step.n}
          </div>
          {#if i < steps.length - 1}
            <!-- connector line visible on md+ -->
          {/if}
          <h3 class="mb-2 font-semibold">{step.title}</h3>
          <p class="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        </div>
      {/each}
    </div>

    <!-- Code teaser -->
    <div class="mt-14 overflow-x-auto rounded-xl border border-border bg-foreground px-6 py-5 font-mono text-sm text-background">
      <p class="mb-2 text-background/40"># Nova executes inside your dedicated sandbox</p>
      <p><span class="text-primary">$</span> git clone https://github.com/you/project /workspace/project</p>
      <p><span class="text-primary">$</span> bun install &amp;&amp; bun run dev --host</p>
      <p class="mt-3 text-background/50">✓ Dev server running on port 3000</p>
      <p class="text-primary/80">✓ Live preview → <span class="underline underline-offset-2">https://preview-abc123.nova.cloud</span></p>
    </div>
  </div>
</section>

<!-- ─── Pricing ────────────────────────────────────────────── -->
<section id="pricing" class="py-24">
  <div class="mx-auto max-w-6xl px-6">
    <div class="mb-12 text-center">
      <Badge variant="outline" class="mb-4">Pricing</Badge>
      <h2 class="text-4xl font-bold tracking-tight">Start small. Add only what your workspace needs.</h2>
      <p class="mx-auto mt-4 max-w-2xl text-muted-foreground">
        Studios are free. Pay for live workspaces, business add-ons, optional sandbox runtime, and optional Nova AI credits.
      </p>
    </div>

    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card.Root class="flex flex-col">
        <Card.Header>
          <Card.Title>Studio</Card.Title>
          <Card.Description>Organize work freely</Card.Description>
          <div class="pt-3">
            <span class="text-4xl font-extrabold">Free</span>
          </div>
        </Card.Header>
        <Card.Content class="flex-1 space-y-1.5 text-sm text-muted-foreground">
          <p>Chats, memory, skills, integrations, and workspace planning.</p>
        </Card.Content>
      </Card.Root>

      <Card.Root class="relative flex flex-col border-primary shadow-lg ring-2 ring-primary">
        <div class="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <Badge class="bg-primary text-primary-foreground shadow-sm">Start here</Badge>
        </div>
        <Card.Header>
          <Card.Title>Workspace</Card.Title>
          <Card.Description>Host the public app</Card.Description>
          <div class="pt-3">
            <span class="text-4xl font-extrabold">$5</span>
            <span class="text-muted-foreground"> /mo</span>
          </div>
        </Card.Header>
        <Card.Content class="flex-1 space-y-1.5 text-sm text-muted-foreground">
          <p>Hosted website, app, store, portal, or product surface.</p>
        </Card.Content>
      </Card.Root>

      <Card.Root class="flex flex-col">
        <Card.Header>
          <Card.Title>Add-ons</Card.Title>
          <Card.Description>Business capabilities</Card.Description>
          <div class="pt-3">
            <span class="text-4xl font-extrabold">$10+</span>
            <span class="text-muted-foreground"> /mo</span>
          </div>
        </Card.Header>
        <Card.Content class="flex-1 space-y-1.5 text-sm text-muted-foreground">
          <p>CMS, commerce, automation, forms, memberships, and more.</p>
        </Card.Content>
      </Card.Root>

      <Card.Root class="flex flex-col">
        <Card.Header>
          <Card.Title>Nova AI</Card.Title>
          <Card.Description>Optional hosted models</Card.Description>
          <div class="pt-3">
            <span class="text-4xl font-extrabold">$5+</span>
            <span class="text-muted-foreground"> /mo</span>
          </div>
        </Card.Header>
        <Card.Content class="flex-1 space-y-1.5 text-sm text-muted-foreground">
          <p>Use BYOK for no AI markup, or buy monthly and top-up credits.</p>
        </Card.Content>
      </Card.Root>
    </div>

    <div class="mt-10 flex justify-center">
      <Button href="/pricing" size="lg">Explore full pricing</Button>
    </div>
  </div>
</section>

<!-- ─── Testimonials ──────────────────────────────────────── -->
<section class="border-y border-border bg-muted/30 py-24">
  <div class="mx-auto max-w-6xl px-6">
    <div class="mb-16 text-center">
      <Badge variant="outline" class="mb-4">Early access</Badge>
      <h2 class="text-4xl font-bold tracking-tight">Builders love Nova Cloud.</h2>
    </div>
    <div class="grid gap-6 md:grid-cols-3">
      {#each testimonials as t}
        <Card.Root>
          <Card.Content class="pt-6">
            <p class="mb-5 text-sm italic leading-relaxed text-muted-foreground">"{t.quote}"</p>
            <Separator class="mb-4" />
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {t.initials}
              </div>
              <div>
                <p class="text-sm font-semibold">{t.name}</p>
                <p class="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>
  </div>
</section>

<!-- ─── FAQ ───────────────────────────────────────────────── -->
<section id="faq" class="py-24">
  <div class="mx-auto max-w-3xl px-6">
    <div class="mb-14 text-center">
      <Badge variant="outline" class="mb-4">FAQ</Badge>
      <h2 class="text-4xl font-bold tracking-tight">Questions? We have answers.</h2>
    </div>

    <Accordion.Root type="multiple" class="space-y-2">
      {#each faqs as faq, i}
        <Accordion.Item value="faq-{i}" class="rounded-lg border border-border px-4">
          <Accordion.Trigger class="py-4 text-left font-medium hover:no-underline">
            {faq.q}
          </Accordion.Trigger>
          <Accordion.Content class="pb-4 text-sm leading-relaxed text-muted-foreground">
            {faq.a}
          </Accordion.Content>
        </Accordion.Item>
      {/each}
    </Accordion.Root>
  </div>
</section>

<!-- ─── CTA Banner ────────────────────────────────────────── -->
<section class="bg-foreground py-24 text-background">
  <div class="mx-auto max-w-3xl px-6 text-center">
    <h2 class="mb-4 text-4xl font-extrabold tracking-tight">
      Ready to ditch the hardware?
    </h2>
    <p class="mb-10 text-lg leading-relaxed text-background/65">
      Your cloud agent is ready in seconds. No setup. No server management.<br />
      Real value from day one.
    </p>
    <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
      {#if isLoggedIn}
        <a href="/app">
           <Button size="lg" class="px-10 text-base shadow-lg">Open Dashboard</Button>
        </a>
        <a href="/app/settings">
          <Button size="lg" variant="outline" class="border-background/25 px-10 text-base text-background hover:bg-background/10 hover:text-background">
            Manage Account
          </Button>
        </a>
      {:else}
        <a href="/auth/sign-up">
          <Button size="lg" class="px-10 text-base shadow-lg">Start with a workspace</Button>
        </a>
        <a href="/pricing">
          <Button
            size="lg"
            variant="outline"
            class="border-background/25 px-10 text-base text-background hover:bg-background/10 hover:text-background"
          >
            View pricing
          </Button>
        </a>
      {/if}
    </div>
    <p class="mt-6 text-sm text-background/35">14-day money-back guarantee · No credit card required to start</p>
  </div>
</section>

<!-- ─── Footer ────────────────────────────────────────────── -->
<footer class="border-t border-border bg-background py-12">
  <div class="mx-auto max-w-7xl px-6">
    <div class="flex flex-col items-center justify-between gap-6 md:flex-row">
  <NovaLogo class="gap-1.5 text-lg font-extrabold tracking-tight" />
      <nav class="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
        <a href="#features"     class="hover:text-foreground transition-colors">Features</a>
        <a href="/pricing"      class="hover:text-foreground transition-colors">Pricing</a>
        <a href="#faq"          class="hover:text-foreground transition-colors">FAQ</a>
        <a href="/about"        class="hover:text-foreground transition-colors">About</a>
        {#if !isLoggedIn}
          <a href="/auth/sign-in" class="hover:text-foreground transition-colors">Sign in</a>
        {/if}
      </nav>
      <div class="flex items-center gap-3">
        <ModeToggle />
        <p class="text-xs text-muted-foreground">© 2026 Nova Cloud</p>
      </div>
    </div>
  </div>
</footer>
