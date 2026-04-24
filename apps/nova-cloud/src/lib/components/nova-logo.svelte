<script lang="ts">
  interface Props {
    size?: 'sm' | 'md' | 'lg';
    class?: string;
  }

  let { size = 'md', class: className = '' } = $props();

  const textSize = $derived(size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl');
</script>

<a href="/" class="flex items-center gap-1.5 {textSize} font-extrabold tracking-tight select-none hover:scale-[1.02] transition-transform {className}">
  <span class="text-primary">Nova</span><span>Cloud</span>
</a>
