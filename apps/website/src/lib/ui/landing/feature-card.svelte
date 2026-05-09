<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    icon: Snippet;
    title: string;
    description: string;
    class?: string;
    children?: Snippet;
  }

  let { icon, title, description, class: className = '', children }: Props = $props();
</script>

<div
  class="glass-panel rounded-2xl p-8 flex flex-col justify-between group hover:bg-surface-container/40 transition-colors duration-500 relative overflow-hidden {className}"
>
  <div>
    <div class="mb-4">
      {@render icon()}
    </div>
    <h3
      class="font-headline-lg text-xl font-bold text-on-surface mb-2"
    >
      {title}
    </h3>
    <p class="text-on-surface-variant text-sm leading-relaxed">
      {description}
    </p>
  </div>
  {#if children}
    {@render children()}
  {/if}
</div>
