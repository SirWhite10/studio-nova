<script lang="ts">
  import Logo from '$lib/ui/landing/logo.svelte';
  import { routeLinks } from '$lib/data/catalog';
  import type { Snippet } from 'svelte';

  interface Props {
    eyebrow?: string;
    title: string;
    description: string;
    children: Snippet;
  }

  let { eyebrow = 'Pricing', title, description, children }: Props = $props();
</script>

<div class="min-h-screen bg-background text-on-surface">
  <nav
    class="sticky top-0 z-50 border-b border-outline/20 bg-background/70 backdrop-blur-xl"
  >
    <div
      class="mx-auto flex max-w-container-max items-center justify-between px-section-padding py-4"
    >
      <a href="/" aria-label="DLX Studios home">
        <Logo size="sm" />
      </a>
      <div class="hidden items-center gap-5 text-sm font-medium lg:flex">
        {#each routeLinks as link}
          <a
            href={link.href}
            class="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors"
          >
            {link.label}
          </a>
        {/each}
      </div>
      <div class="flex items-center gap-4">
        <a
          href="/auth/sign-in"
          class="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors"
        >
          Sign in
        </a>
        <a
          href="/auth/sign-up"
          class="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-caps text-label-caps px-5 py-2.5 rounded-full"
        >
          Get started
        </a>
      </div>
    </div>
    <div class="border-t border-outline/10 lg:hidden">
      <div
        class="mx-auto flex max-w-container-max gap-2 overflow-x-auto px-section-padding py-2 text-sm"
      >
        {#each routeLinks as link}
          <a
            href={link.href}
            class="shrink-0 rounded-full px-3 py-1.5 font-label-caps text-label-caps text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            {link.label}
          </a>
        {/each}
      </div>
    </div>
  </nav>

  <main>
    <section class="border-b border-outline/10 bg-surface-container-lowest/50">
      <div class="mx-auto max-w-container-max px-section-padding py-16 sm:py-20">
        <p
          class="font-label-caps text-label-caps text-primary uppercase tracking-[0.3em]"
        >
          {eyebrow}
        </p>
        <div
          class="mt-5 grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)] lg:items-end"
        >
          <div>
            <h1
              class="font-headline-xl max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              {title}
            </h1>
            <p
              class="mt-5 max-w-3xl font-body-lg text-body-lg text-on-surface-variant"
            >
              {description}
            </p>
          </div>
          <div class="glass-panel rounded-lg p-5">
            <p class="text-sm font-semibold text-on-surface">Core rule</p>
            <p class="mt-2 text-sm leading-6 text-on-surface-variant">
              Studios are free. Pay for live workspaces, business add-ons,
              optional sandbox runtime, and optional Studio Nova AI credits.
            </p>
          </div>
        </div>
      </div>
    </section>

    {@render children()}
  </main>

  <footer class="border-t border-outline/10 bg-surface-container-lowest py-10">
    <div
      class="mx-auto flex max-w-container-max flex-col gap-5 px-section-padding md:flex-row md:items-center md:justify-between"
    >
      <Logo size="sm" href={null} />
      <nav class="flex flex-wrap gap-5 text-sm text-on-surface-variant">
        {#each routeLinks as link}
          <a href={link.href} class="hover:text-primary transition-colors">
            {link.label}
          </a>
        {/each}
        <a href="/about" class="hover:text-primary transition-colors">About</a>
      </nav>
      <p class="text-xs text-on-surface-variant">
        &copy; {new Date().getFullYear()} DLX Studios
      </p>
    </div>
  </footer>
</div>
