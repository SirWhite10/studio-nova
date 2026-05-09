<script lang="ts">
  import Logo from './logo.svelte';

  interface Props {
    links: { href: string; label: string }[];
    onclose: () => void;
  }

  let { links, onclose }: Props = $props();
</script>

<div class="md:hidden border-t border-outline/20 bg-background/95 backdrop-blur-xl">
  <div class="px-margin-mobile py-6 flex flex-col gap-4">
    {#each links as link}
      <a
        href={link.href}
        class="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors py-2"
        onclick={onclose}
      >
        {link.label}
      </a>
    {/each}

    <div class="border-t border-outline/20 pt-4 mt-2 flex flex-col gap-3">
      <a
        href="/auth/sign-in"
        class="font-label-caps text-label-caps text-on-surface hover:text-primary transition-colors"
      >
        Sign In
      </a>
      <a
        href="/auth/sign-up"
        class="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-full text-center"
      >
        Get Started
      </a>
    </div>
  </div>
</div>
