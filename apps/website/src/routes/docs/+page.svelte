<script lang="ts">
  import NotificationBar from '$lib/ui/landing/notification-bar.svelte';
  import Header from '$lib/ui/landing/header.svelte';
  import Footer from '$lib/ui/landing/footer.svelte';
  import SectionHeading from '$lib/ui/shared/section-heading.svelte';
  import {
    BookOpen,
    Code,
    Rocket,
    Puzzle,
    Terminal,
    Layers,
  } from '@lucide/svelte';

  const quickStart = [
    {
      icon: Rocket,
      title: 'Quick Start',
      description:
        'Get your first workspace running in under 5 minutes. Clone a template, start dev server, share the preview URL.',
      href: '/docs#quick-start',
    },
    {
      icon: Code,
      title: 'API Reference',
      description:
        'Complete reference for the DLX Studios API — workspaces, files, runtime, integrations, and webhooks.',
      href: '/docs#api',
    },
    {
      icon: Puzzle,
      title: 'Integrations',
      description:
        'Connect Stripe, GitHub, Notion, email, and more to your Studio for powerful business workflows.',
      href: '/docs#integrations',
    },
  ];

  const guides = [
    {
      icon: BookOpen,
      title: 'Workspace Setup',
      description: 'Create and configure hosted workspaces with custom domains, SSL, and deployment.',
    },
    {
      icon: Terminal,
      title: 'Studio Nova AI',
      description: 'Use AI agents with BYOK or credit-based hosted models for autonomous task execution.',
    },
    {
      icon: Layers,
      title: 'Add-ons & Modules',
      description: 'Enable CMS, commerce, and automation capabilities on any workspace as needed.',
    },
  ];
</script>

<svelte:head>
  <title>Documentation · DLX Studios</title>
  <meta
    name="description"
    content="DLX Studios documentation — quick start guides, API reference, integration docs, and workspace setup."
  />
</svelte:head>

<NotificationBar />
<Header />

<main class="flex-grow flex flex-col relative w-full overflow-hidden">
  <section
    class="relative pt-32 pb-24 px-section-padding flex flex-col items-center justify-center text-center w-full max-w-container-max mx-auto hero-glow z-10"
  >
    <div class="max-w-4xl flex flex-col items-center gap-8 relative z-20">
      <h1
        class="font-headline-xl text-[64px] leading-[1.05] tracking-[-0.03em] font-extrabold text-on-surface"
      >
        Documentation
      </h1>
      <p class="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
        Everything you need to build, deploy, and manage workspaces with Studio
        Nova.
      </p>
    </div>
  </section>

  <!-- Quick Start Cards -->
  <section class="py-16 px-section-padding w-full max-w-container-max mx-auto">
    <SectionHeading eyebrow="Get started" title="Start building in minutes" />

    <div class="grid gap-6 md:grid-cols-3 mt-12">
      {#each quickStart as item}
        <a
          href={item.href}
          class="glass-panel rounded-2xl p-8 flex flex-col group hover:bg-surface-container/40 transition-colors duration-500"
        >
          <item.icon size={32} class="text-primary mb-4" />
          <h3
            class="font-headline-lg text-xl font-bold text-on-surface mb-2 group-hover:text-primary transition-colors"
          >
            {item.title}
          </h3>
          <p class="text-on-surface-variant text-sm leading-relaxed flex-1">
            {item.description}
          </p>
        </a>
      {/each}
    </div>
  </section>

  <!-- Guides -->
  <section class="border-y border-outline/10 bg-surface-container-lowest/50 py-16 px-section-padding">
    <div class="max-w-container-max mx-auto">
      <SectionHeading
        eyebrow="Guides"
        title="Platform guides"
        description="Deep dives into workspace management, AI agents, and business capabilities."
      />

      <div class="grid gap-6 md:grid-cols-3 mt-12">
        {#each guides as guide}
          <div
            class="glass-panel rounded-2xl p-8 flex flex-col"
          >
            <guide.icon size={32} class="text-primary mb-4" />
            <h3
              class="font-headline-lg text-xl font-bold text-on-surface mb-2"
            >
              {guide.title}
            </h3>
            <p class="text-on-surface-variant text-sm leading-relaxed flex-1">
              {guide.description}
            </p>
          </div>
        {/each}
      </div>
    </div>
  </section>
</main>

<Footer />
