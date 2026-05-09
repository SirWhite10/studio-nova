<script lang="ts">
  import NotificationBar from '$lib/ui/landing/notification-bar.svelte';
  import Header from '$lib/ui/landing/header.svelte';
  import Footer from '$lib/ui/landing/footer.svelte';
  import SectionHeading from '$lib/ui/shared/section-heading.svelte';
  import FeatureCard from '$lib/ui/landing/feature-card.svelte';
  import FaqAccordion from '$lib/ui/landing/faq-accordion.svelte';
  import TestimonialCard from '$lib/ui/landing/testimonial-card.svelte';
  import CtaBanner from '$lib/ui/landing/cta-banner.svelte';
  import PricingCard from '$lib/ui/pricing/pricing-card.svelte';
  import {
    Database,
    Cpu,
    Globe,
    Bot,
    Brain,
    KeyRound,
  } from '@lucide/svelte';

  const features = [
    {
      title: 'Persistent Workspaces',
      description:
        'Your files, repos, and dev servers survive across sessions. No rebuilding from scratch every time you log in.',
    },
    {
      title: 'GitHub Clone & Dev Servers',
      description:
        'Clone any repo, run any language, start dev servers with hot reload — all inside your isolated cloud workspace.',
    },
    {
      title: 'Live Preview URLs',
      description:
        'Expose your running dev server to the world instantly. Share a stable preview URL with clients or your team.',
    },
    {
      title: 'Multi-Agent Studios',
      description:
        'Run multiple independent AI agents in parallel, each with its own isolated workspace, filesystem, and memory.',
    },
    {
      title: 'Semantic Memory',
      description:
        'Studio Nova remembers context across conversations. Relevant past sessions are surfaced automatically when you need them.',
    },
    {
      title: 'Bring Your Own Key',
      description:
        'Plug in your own AI API key on any plan — at no extra cost — for higher rate limits and complete privacy.',
    },
  ];

  const steps = [
    {
      n: '1',
      title: 'You prompt Studio Nova',
      body: 'Describe your task in plain English. Clone a repo, build a feature, fix a bug, write a script — anything.',
    },
    {
      n: '2',
      title: 'AI plans & executes',
      body: 'Studio Nova generates a complete execution plan and runs it step-by-step inside your dedicated workspace.',
    },
    {
      n: '3',
      title: 'Live preview, instantly',
      body: 'Your dev server starts, a stable preview URL appears. Share it with anyone, iterate, and ship.',
    },
  ];

  const testimonials = [
    {
      quote:
        "I used to spend $80/month on a VPS I barely touched. DLX Studios gives me a smarter, always-on dev environment for a fraction of the cost.",
      name: 'Jamie L.',
      role: 'Indie hacker',
      initials: 'JL',
    },
    {
      quote:
        "The persistent workspace is a game-changer. I pause mid-task, close my laptop, come back the next day and everything is exactly where I left it.",
      name: 'Arjun K.',
      role: 'Senior engineer',
      initials: 'AK',
    },
    {
      quote:
        "Live preview URLs mean I can share a running dev server with a client in 10 seconds. Used to take half an hour of ngrok gymnastics.",
      name: 'Sofia R.',
      role: 'Freelance developer',
      initials: 'SR',
    },
  ];

  const faqs = [
    {
      q: 'Do my files persist when I close the browser?',
      a: 'Yes. Your workspace is backed by persistent storage mounted as a real filesystem. Files, installed packages, and git repositories survive across sessions.',
    },
    {
      q: 'How is this different from buying a Mac Mini?',
      a: 'No hardware purchase (save $1,000+), no electricity bill, no maintenance, no physical security risk. DLX Studios gives you an always-on workspace ready in seconds, accessible from any device.',
    },
    {
      q: 'Is my workspace isolated from other users?',
      a: 'Completely. Every user gets a dedicated container with scoped storage. No shared filesystems, no cross-user data access.',
    },
    {
      q: 'Can I use my own AI API key?',
      a: 'Yes, on any plan at no extra cost. Add your own key to get higher rate limits and keep it completely private.',
    },
    {
      q: 'What happens if I cancel?',
      a: 'You keep full access until the end of your billing period. We also offer a 14-day money-back guarantee — no questions asked.',
    },
    {
      q: 'What languages and runtimes are supported?',
      a: 'The workspace runs a full Linux environment. Any language, any runtime — Node, Bun, Python, Go, Rust, Ruby. If it runs on Linux, it runs in DLX Studios.',
    },
  ];

  const pricingCards = [
    {
      name: 'Studio',
      description: 'Organize work freely',
      price: 'Free',
      cadence: '',
      detail: 'Chats, memory, skills, integrations, and workspace planning.',
    },
    {
      name: 'Workspace',
      description: 'Host the public app',
      price: '$5',
      cadence: '/mo',
      detail: 'Hosted website, app, store, portal, or product surface.',
      highlight: true,
    },
    {
      name: 'Add-ons',
      description: 'Business capabilities',
      price: '$10+',
      cadence: '/mo',
      detail: 'CMS, commerce, automation, forms, memberships, and more.',
    },
    {
      name: 'Studio Nova AI',
      description: 'Optional hosted models',
      price: '$5+',
      cadence: '/mo',
      detail: 'Use BYOK for no AI markup, or buy monthly and top-up credits.',
    },
  ];
</script>

<svelte:head>
  <title>DLX Studios — AI-Powered Workspace Management</title>
  <meta
    name="description"
    content="Studio Nova: Your AI agent, always on, always building. All-in-one workspace management SaaS with persistent workspaces, live preview, and intelligent agents."
  />
</svelte:head>

<NotificationBar />
<Header />

<main class="flex-grow flex flex-col relative w-full overflow-hidden">
  <!-- Hero Section -->
  <section
    class="relative pt-32 pb-48 px-section-padding flex flex-col items-center justify-center text-center w-full max-w-container-max mx-auto hero-glow z-10"
  >
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none -z-10 opacity-40 mix-blend-screen"
      style="background: radial-gradient(ellipse at top, rgba(212, 175, 55, 0.3) 0%, rgba(151, 176, 255, 0.1) 40%, transparent 70%);"
    ></div>

    <div
      class="max-w-4xl flex flex-col items-center gap-8 relative z-20"
    >
      <span
        class="font-label-caps text-label-caps bg-primary/15 text-primary border border-primary/20 px-3 py-1.5 rounded-full"
      >
        AI-Powered Workspaces &middot; Optional Nova AI credits
      </span>

      <h1
        class="font-headline-xl text-[72px] leading-[1.05] tracking-[-0.03em] font-extrabold text-on-surface"
      >
        Studio Nova.<br />
        <span class="text-gradient-gold">Your AI agent, always building.</span>
      </h1>

      <p
        class="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto"
      >
        A fully managed AI-powered workspace — persistent environments, GitHub
        integration, live preview URLs — without buying hardware or managing a
        single server.
      </p>

      <div class="flex items-center gap-6 mt-8">
        <a
          href="/auth/sign-up"
          class="bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold px-8 py-4 rounded-full text-lg hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all duration-300"
        >
          Start building
        </a>
        <a
          href="#how-it-works"
          class="border border-primary/50 text-primary font-bold px-8 py-4 rounded-full text-lg hover:bg-primary/10 transition-all duration-300"
        >
          See how it works
        </a>
      </div>
    </div>
  </section>

  <!-- Social Proof Strip -->
  <section
    class="w-full border-y border-outline/10 bg-surface-container-lowest/50 py-10 relative z-10"
  >
    <div
      class="max-w-container-max mx-auto px-section-padding text-center"
    >
      <p
        class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-[0.2em]"
      >
        The fastest path from idea to running code — no hardware required
      </p>
    </div>
  </section>

  <!-- Features Bento Grid -->
  <section id="features" class="py-32 px-section-padding w-full max-w-container-max mx-auto relative z-10">
    <SectionHeading
      eyebrow="Studio Nova"
      title="AI-powered workspace management for builders"
      description="Studio Nova handles the infrastructure so you can focus on what you're building. Persistent workspaces, intelligent agents, and instant deployment."
    />

    <div
      class="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]"
    >
      {#each features as f, i}
        {#if i === 0}
          <FeatureCard
            title={f.title}
            description={f.description}
            class="md:col-span-2 row-span-2 auto-rows-auto"
          >
            {#snippet icon()}
              <Database size={32} class="text-primary" />
            {/snippet}
            {#snippet children()}
              <div class="w-full h-48 mt-6 bg-surface-container-highest/30 rounded-xl border border-outline/10 flex items-center justify-center overflow-hidden relative">
                <div class="absolute inset-0 p-6 font-mono text-sm text-outline-variant opacity-70 leading-loose">
                  <span class="text-primary">$</span> git clone https://github.com/you/project /workspace<br />
                  <span class="text-primary">$</span> bun install && bun run dev --host<br />
                  <br />
                  <span class="text-on-surface-variant">✓ Dev server running on port 3000</span><br />
                  <span class="text-primary/80">✓ Live preview → <span class="underline underline-offset-2">https://preview-abc123.dlx.studio</span></span>
                </div>
              </div>
            {/snippet}
          </FeatureCard>
        {:else if i === 1}
          <FeatureCard title={f.title} description={f.description}>
            {#snippet icon()}
              <Cpu size={28} class="text-primary" />
            {/snippet}
          </FeatureCard>
        {:else if i === 2}
          <FeatureCard title={f.title} description={f.description}>
            {#snippet icon()}
              <Globe size={28} class="text-primary" />
            {/snippet}
          </FeatureCard>
        {:else if i === 3}
          <FeatureCard title={f.title} description={f.description}>
            {#snippet icon()}
              <Bot size={28} class="text-primary" />
            {/snippet}
          </FeatureCard>
        {:else if i === 4}
          <FeatureCard title={f.title} description={f.description}>
            {#snippet icon()}
              <Brain size={28} class="text-primary" />
            {/snippet}
          </FeatureCard>
        {:else}
          <FeatureCard title={f.title} description={f.description}>
            {#snippet icon()}
              <KeyRound size={28} class="text-primary" />
            {/snippet}
          </FeatureCard>
        {/if}
      {/each}
    </div>
  </section>

  <!-- How it Works -->
  <section
    id="how-it-works"
    class="border-y border-outline/10 bg-surface-container-lowest/50 py-24"
  >
    <div class="mx-auto max-w-4xl px-section-padding">
      <div class="flex flex-col items-center text-center mb-16">
        <span
          class="font-label-caps text-label-caps text-primary uppercase tracking-[0.3em] mb-6"
        >
          How it works
        </span>
        <h2
          class="font-headline-xl text-[48px] leading-tight font-bold text-on-surface"
        >
          From prompt to live preview in seconds.
        </h2>
      </div>

      <div class="grid gap-10 md:grid-cols-3">
        {#each steps as step}
          <div class="flex flex-col items-center text-center">
            <div
              class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary font-bold text-lg"
            >
              {step.n}
            </div>
            <h3
              class="mb-2 font-headline-lg text-lg font-bold text-on-surface"
            >
              {step.title}
            </h3>
            <p class="text-sm leading-relaxed text-on-surface-variant">
              {step.body}
            </p>
          </div>
        {/each}
      </div>

      <div
        class="mt-14 overflow-x-auto rounded-xl border border-outline/20 bg-surface-container-lowest px-6 py-5 font-mono text-sm text-on-surface"
      >
        <p class="mb-2 text-on-surface-variant/50">
          # Studio Nova executes inside your dedicated workspace
        </p>
        <p><span class="text-primary">$</span> git clone https://github.com/you/project /workspace/project</p>
        <p><span class="text-primary">$</span> bun install && bun run dev --host</p>
        <p class="mt-3 text-on-surface-variant/60">✓ Dev server running on port 3000</p>
        <p class="text-primary/80">✓ Live preview → <span class="underline underline-offset-2">https://preview-abc123.dlx.studio</span></p>
      </div>
    </div>
  </section>

  <!-- Pricing Preview -->
  <section id="pricing" class="py-24 px-section-padding">
    <div class="mx-auto max-w-6xl">
      <SectionHeading
        eyebrow="Pricing"
        title="Start small. Add only what your workspace needs."
        description="Studios are free. Pay for live workspaces, business add-ons, optional sandbox runtime, and optional Studio Nova AI credits."
      />

      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {#each pricingCards as card}
          <div
            class="flex flex-col glass-panel rounded-2xl p-8 {card.highlight ? 'border-primary/50 shadow-[0_0_20px_rgba(212,175,55,0.15)]' : ''}"
          >
            {#if card.highlight}
              <span
                class="self-center -mt-12 mb-4 font-label-caps text-label-caps bg-primary text-on-primary px-4 py-1.5 rounded-full"
              >
                Start here
              </span>
            {/if}
            <h3
              class="font-headline-lg text-xl font-bold text-on-surface"
            >
              {card.name}
            </h3>
            <p class="text-sm text-on-surface-variant mt-1">
              {card.description}
            </p>
            <div class="pt-4 mt-4">
              <span class="text-4xl font-extrabold text-gradient-gold">
                {card.price}
              </span>
              {#if card.cadence}
                <span class="text-sm text-on-surface-variant">
                  {card.cadence}
                </span>
              {/if}
            </div>
            <p class="mt-4 flex-1 text-sm text-on-surface-variant">
              {card.detail}
            </p>
          </div>
        {/each}
      </div>

      <div class="mt-10 flex justify-center">
        <a
          href="/pricing"
          class="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-caps text-label-caps px-8 py-3.5 rounded-full hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300"
        >
          Explore full pricing
        </a>
      </div>
    </div>
  </section>

  <!-- Testimonials -->
  <section
    class="border-y border-outline/10 bg-surface-container-lowest/50 py-24"
  >
    <div class="mx-auto max-w-6xl px-section-padding">
      <div class="mb-16 text-center">
        <span
          class="font-label-caps text-label-caps text-primary uppercase tracking-[0.3em] mb-6 inline-block"
        >
          Early access
        </span>
        <h2
          class="font-headline-xl text-[48px] leading-tight font-bold text-on-surface"
        >
          Builders love DLX Studios.
        </h2>
      </div>
      <div class="grid gap-6 md:grid-cols-3">
        {#each testimonials as t}
          <TestimonialCard {...t} />
        {/each}
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section id="faq" class="py-24 px-section-padding">
    <div class="mx-auto max-w-3xl">
      <div class="mb-14 text-center">
        <span
          class="font-label-caps text-label-caps text-primary uppercase tracking-[0.3em] mb-6 inline-block"
        >
          FAQ
        </span>
        <h2
          class="font-headline-xl text-[48px] leading-tight font-bold text-on-surface"
        >
          Questions? We have answers.
        </h2>
      </div>
      <FaqAccordion items={faqs} />
    </div>
  </section>

  <!-- CTA Banner -->
  <CtaBanner
    title="Ready to start building?"
    description="Your AI-powered workspace is ready in seconds. No setup. No server management. Real value from day one."
  >
    <a
      href="/auth/sign-up"
      class="bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold px-10 py-4 rounded-full text-lg hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all duration-300"
    >
      Start building
    </a>
    <a
      href="/pricing"
      class="border border-primary/50 text-primary font-bold px-10 py-4 rounded-full text-lg hover:bg-primary/10 transition-all duration-300"
    >
      View pricing
    </a>
  </CtaBanner>
</main>

<Footer />
