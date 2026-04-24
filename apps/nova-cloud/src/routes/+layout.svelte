<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import { Toaster } from "$lib/components/ui/sonner";
  import { userStore } from "$lib/user-store.svelte";
  import { onMount } from "svelte";

  let { children } = $props();


  onMount(() => {
    userStore.load();
  });
</script>

<ModeWatcher defaultMode="system" />
<Toaster richColors />
{@render children()}
