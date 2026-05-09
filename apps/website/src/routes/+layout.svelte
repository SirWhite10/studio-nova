<script lang="ts">
  import '@fontsource/manrope/400.css';
  import '@fontsource/manrope/600.css';
  import '@fontsource/manrope/700.css';
  import '@fontsource/manrope/800.css';
  import '@fontsource/hanken-grotesk/400.css';
  import '@fontsource/hanken-grotesk/600.css';
  import '@fontsource/geist/400.css';
  import '@fontsource/geist/600.css';
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
