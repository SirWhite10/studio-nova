<script lang="ts">
  import ModeToggle from "$lib/components/mode-toggle.svelte";
  import NovaLogo from "$lib/components/nova-logo.svelte";
  import { Button } from "$lib/components/ui/button";
  import { routeLinks } from "$lib/pricing/catalog";

  let {
    eyebrow = "Pricing",
    title,
    description,
    children,
  }: {
    eyebrow?: string;
    title: string;
    description: string;
    children: import("svelte").Snippet;
  } = $props();
</script>

<div class="min-h-screen bg-background text-foreground">
  <nav class="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
      <a href="/" aria-label="Nova Cloud home">
        <NovaLogo class="gap-1.5 text-xl font-extrabold tracking-tight" href={null} />
      </a>
      <div class="hidden items-center gap-5 text-sm font-medium lg:flex">
        {#each routeLinks as link}
          <a class="text-muted-foreground transition-colors hover:text-foreground" href={link.href}>
            {link.label}
          </a>
        {/each}
      </div>
      <div class="flex items-center gap-2">
        <ModeToggle />
        <Button href="/auth/sign-in" size="sm" variant="ghost">Sign in</Button>
        <Button href="/auth/sign-up" size="sm">Get started</Button>
      </div>
    </div>
    <div class="border-t border-border/70 lg:hidden">
      <div class="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-6 py-2 text-sm">
        {#each routeLinks as link}
          <a class="shrink-0 rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" href={link.href}>
            {link.label}
          </a>
        {/each}
      </div>
    </div>
  </nav>

  <main>
    <section class="border-b border-border bg-muted/25">
      <div class="mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
        <div class="mt-5 grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)] lg:items-end">
          <div>
            <h1 class="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
            <p class="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>
          </div>
          <div class="rounded-lg border border-border bg-background p-5">
            <p class="text-sm font-semibold">Core rule</p>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">
              Studios are free. Pay for live workspaces, business add-ons, optional sandbox runtime, and optional Nova AI credits.
            </p>
          </div>
        </div>
      </div>
    </section>

    {@render children()}
  </main>

  <footer class="border-t border-border bg-background py-10">
    <div class="mx-auto flex max-w-7xl flex-col gap-5 px-6 md:flex-row md:items-center md:justify-between">
      <NovaLogo class="gap-1.5 text-lg font-extrabold tracking-tight" />
      <nav class="flex flex-wrap gap-5 text-sm text-muted-foreground">
        {#each routeLinks as link}
          <a class="hover:text-foreground" href={link.href}>{link.label}</a>
        {/each}
        <a class="hover:text-foreground" href="/about">About</a>
      </nav>
      <p class="text-xs text-muted-foreground">© 2026 Nova Cloud</p>
    </div>
  </footer>
</div>
