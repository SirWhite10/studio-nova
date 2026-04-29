<script lang="ts">
  interface Props {
    size?: 'sm' | 'md' | 'lg';
    class?: string;
    href?: string | null;
  }

  let { size = 'md', class: className = '', href = '/' } = $props();

  const textSize = $derived(size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl');
</script>

{#if href}
  <a href={href} class="flex items-center gap-1.5 {textSize} font-extrabold tracking-tight select-none transition-transform hover:scale-[1.02] {className}">
    <span class="text-primary">Nova</span><span>Cloud</span>
  </a>
{:else}
  <div class="flex items-center gap-1.5 {textSize} font-extrabold tracking-tight select-none {className}">
    <span class="text-primary">Nova</span><span>Cloud</span>
  </div>
{/if}
