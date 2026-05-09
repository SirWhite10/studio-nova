<script lang="ts">
  import NotificationBar from '$lib/ui/landing/notification-bar.svelte';
  import Header from '$lib/ui/landing/header.svelte';
  import Footer from '$lib/ui/landing/footer.svelte';
  import SectionHeading from '$lib/ui/shared/section-heading.svelte';
  import {
    Database,
    Brain,
    HardDrive,
    Cloud,
    Zap,
    Blocks,
  } from '@lucide/svelte';

  const contextFeatures = [
    {
      icon: Database,
      title: 'Studio Nova Engine',
      description:
        'AI agent-powered workspace engine with persistent memory, multi-model support, and autonomous task execution.',
    },
    {
      icon: Brain,
      title: 'Agent Memory',
      description:
        'Persistent, queryable, autonomous semantic memory for AI workloads that persists across sessions.',
    },
  ];

  const storageFeatures = [
    {
      icon: HardDrive,
      title: 'Scalable Storage',
      description:
        'Horizontally scalable, fully consistent storage layer that grows with your workspaces.',
    },
    {
      icon: Cloud,
      title: 'DLX Studios Cloud',
      description:
        'Serverless deployment that automatically scales your workspaces as traffic grows.',
    },
  ];

  const ecosystemFeatures = [
    {
      icon: Zap,
      title: 'Real-time Subscriptions',
      description:
        'Listen to live queries and receive updates instantly over WebSockets.',
    },
    {
      icon: Blocks,
      title: 'Modular Architecture',
      description:
        'CMS, commerce, automation, and custom capabilities attach to workspaces as needed.',
    },
  ];
</script>

<svelte:head>
  <title>Overview · DLX Studios</title>
  <meta
    name="description"
    content="DLX Studios platform overview — AI-powered workspace management for builders and businesses."
  />
</svelte:head>

<NotificationBar />
<Header />

<main class="flex-grow flex flex-col relative w-full overflow-hidden">
  <!-- Hero -->
  <section
    class="relative pt-32 pb-48 px-section-padding flex flex-col items-center justify-center text-center w-full max-w-container-max mx-auto hero-glow z-10"
  >
    <div class="max-w-4xl flex flex-col items-center gap-8 relative z-20">
      <h1
        class="font-headline-xl text-[72px] leading-[1.05] tracking-[-0.03em] font-extrabold text-on-surface"
      >
        The AI-powered platform<br />
        <span class="text-gradient-gold">for builders</span>
      </h1>
      <p
        class="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto"
      >
        Studio Nova is the only platform where AI agents, persistent
        workspaces, and modular business capabilities are unified into one
        seamless, high-performance platform. Engineered for builders.
      </p>
      <div class="flex items-center gap-6">
        <a
          href="/auth/sign-up"
          class="bg-primary/10 border border-primary text-primary px-8 py-3 rounded font-label-caps text-label-caps hover:bg-primary/20 transition-colors duration-300"
        >
          Start Building
        </a>
        <a
          href="/pricing"
          class="border border-primary/50 text-primary font-bold px-8 py-3 rounded-full hover:bg-primary/10 transition-all duration-300"
        >
          View pricing
        </a>
      </div>
    </div>
  </section>

  <!-- Context & Memory -->
  <section class="py-32 px-section-padding w-full max-w-container-max mx-auto relative z-10">
    <SectionHeading
      eyebrow="Platform Architecture"
      title="One platform for everything you build"
      description="Stop stitching tools together. DLX Studios unifies AI agents, workspace hosting, and business capabilities in a single modular platform."
    />

    <div
      class="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      {#each [...contextFeatures, ...storageFeatures, ...ecosystemFeatures] as f}
        <div
          class="glass-panel rounded-2xl p-8 flex flex-col justify-between group hover:bg-surface-container/40 transition-colors duration-500"
        >
          <div>
            <f.icon size={32} class="text-primary mb-4" />
            <h3
              class="font-headline-lg text-xl font-bold text-on-surface mb-2"
            >
              {f.title}
            </h3>
            <p class="text-on-surface-variant text-sm leading-relaxed">
              {f.description}
            </p>
          </div>
        </div>
      {/each}
    </div>
  </section>
</main>

<Footer />
