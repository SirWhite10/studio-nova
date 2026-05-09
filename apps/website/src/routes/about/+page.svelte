<script lang="ts">
  import NotificationBar from '$lib/ui/landing/notification-bar.svelte';
  import Header from '$lib/ui/landing/header.svelte';
  import Footer from '$lib/ui/landing/footer.svelte';
</script>

<svelte:head>
  <title>About · DLX Studios</title>
  <meta
    name="description"
    content="About DLX Studios — the all-in-one AI-powered workspace management platform."
  />
</svelte:head>

<NotificationBar />
<Header />

<main class="flex-grow flex flex-col relative w-full overflow-hidden">
  <section
    class="relative pt-32 pb-24 px-section-padding flex flex-col items-center justify-center text-center w-full max-w-container-max mx-auto hero-glow z-10"
  >
    <div class="max-w-3xl flex flex-col items-center gap-8 relative z-20">
      <h1
        class="font-headline-xl text-[64px] leading-[1.05] tracking-[-0.03em] font-extrabold text-on-surface"
      >
        About <span class="text-gradient-gold">DLX Studios</span>
      </h1>
      <p class="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
        DLX Studios is the all-in-one AI-powered workspace management platform.
        Studio Nova brings persistent workspaces, intelligent AI agents, and
        modular business capabilities together in one seamless experience.
      </p>
    </div>
  </section>

  <section class="py-16 px-section-padding w-full max-w-container-max mx-auto">
    <div class="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
      <div class="glass-panel rounded-2xl p-8">
        <h2
          class="font-headline-lg text-2xl font-bold text-on-surface mb-4"
        >
          Our Mission
        </h2>
        <p class="text-on-surface-variant leading-relaxed">
          We believe building digital products should be as simple as describing
          what you want. Studio Nova makes that possible — AI agents that
          understand your intent, workspaces that persist your progress, and
          modular capabilities that grow with your needs.
        </p>
      </div>

      <div class="glass-panel rounded-2xl p-8">
        <h2
          class="font-headline-lg text-2xl font-bold text-on-surface mb-4"
        >
          Built for Builders
        </h2>
        <p class="text-on-surface-variant leading-relaxed">
          Whether you're an indie hacker launching your first SaaS, a freelancer
          building client portals, or a team managing multiple products — DLX
          Studios gives you the AI-powered infrastructure to ship faster without
          the ops overhead.
        </p>
      </div>

      <div class="glass-panel rounded-2xl p-8">
        <h2
          class="font-headline-lg text-2xl font-bold text-on-surface mb-4"
        >
          Open Foundation
        </h2>
        <p class="text-on-surface-variant leading-relaxed">
          The core platform is built on open technologies. While Studio Nova is
          closed-source and commercially licensed, we invest in the ecosystem
          and contribute to the tools that make DLX Studios possible.
        </p>
      </div>

      <div class="glass-panel rounded-2xl p-8">
        <h2
          class="font-headline-lg text-2xl font-bold text-on-surface mb-4"
        >
          Based on Nova Cloud
        </h2>
        <p class="text-on-surface-variant leading-relaxed">
          DLX Studios builds on the Nova Cloud platform — the same powerful
          workspace management, sandbox runtime, and AI agent infrastructure
          that powers production workloads for teams and businesses.
        </p>
      </div>
    </div>
  </section>
</main>

<Footer />
