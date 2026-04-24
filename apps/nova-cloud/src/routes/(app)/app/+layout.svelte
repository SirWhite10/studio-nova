<script lang="ts">
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import { setFileUploadManager } from "$lib/files/upload-manager.svelte";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { page } from '$app/state';
  import { onMount } from "svelte";
  import StudioCreateDialog from '$lib/components/studios/studio-create-dialog.svelte';
  import { studioCreateDialog } from '$lib/studios/create-dialog-state.svelte';

  setFileUploadManager();

  let { children, data }: { children?: any; data?: { data?: any } } = $props();

  const initialSidebarData = $derived(data?.data);
  let sidebarData = $state.raw(initialSidebarData);

  async function refreshSidebarState() {
    const params = new URLSearchParams();
    const requestedStudioId = page.params.studioId ?? page.url.searchParams.get('studio');
    if (requestedStudioId) {
      params.set('studioId', requestedStudioId);
    }
    const query = params.toString();
    const res = await fetch(`/api/app/sidebar-state${query ? `?${query}` : ''}`);
    if (!res.ok) return;
    sidebarData = await res.json();
  }

  let showLayoutHeader = $state(true);
  $effect(() => {
    const path = page.url.pathname;
    showLayoutHeader = !path.includes('/chat/');
  });

  $effect(() => {
    sidebarData = initialSidebarData ?? sidebarData;
  });

  $effect(() => {
    const hue = sidebarData?.currentStudio?.themeHue;
    const root = document.documentElement;
    if (hue != null && typeof hue === 'number') {
      root.style.setProperty('--primary', `oklch(0.55 0.22 ${hue})`);
      root.style.setProperty('--primary-foreground', `oklch(0.98 0.01 ${hue})`);
      root.style.setProperty('--ring', `oklch(0.65 0.18 ${hue})`);
      root.style.setProperty('--sidebar-primary', `oklch(0.55 0.22 ${hue})`);
      root.style.setProperty('--sidebar-primary-foreground', `oklch(0.98 0.01 ${hue})`);
      root.style.setProperty('--chart-1', `oklch(0.75 0.15 ${hue})`);
      root.style.setProperty('--chart-2', `oklch(0.60 0.18 ${hue + 15})`);
      root.style.setProperty('--chart-3', `oklch(0.55 0.20 ${hue + 30})`);
      root.style.setProperty('--chart-4', `oklch(0.50 0.18 ${hue + 45})`);
      root.style.setProperty('--chart-5', `oklch(0.45 0.15 ${hue + 60})`);
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-primary-foreground');
      root.style.removeProperty('--chart-1');
      root.style.removeProperty('--chart-2');
      root.style.removeProperty('--chart-3');
      root.style.removeProperty('--chart-4');
      root.style.removeProperty('--chart-5');
    }
  });

  const sidebarRouteKey = $derived(
    `${page.params.studioId ?? ''}|${page.url.searchParams.get('studio') ?? ''}`,
  );

  $effect(() => {
    const routeKey = sidebarRouteKey;
    if (routeKey !== undefined) {
      void refreshSidebarState();
    }
  });

  onMount(() => {
    void refreshSidebarState();
  });

  $effect(() => {
    const studioId = sidebarData?.currentStudio?.id;
    if (!studioId) return;

    const source = new EventSource(`/api/studios/${studioId}/events/stream`);
    const refresh = () => {
      void refreshSidebarState();
    };

    for (const eventName of [
      'studio.updated',
      'integration.updated',
      'runtime.status',
      'runtime.preview',
      'artifact.upserted',
      'deploy.updated',
      'job.updated',
      'job.run-started',
      'job.run-failed',
    ]) {
      source.addEventListener(eventName, refresh);
    }

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  });
</script>

<Sidebar.Provider>
  <AppSidebar data={sidebarData} oncreate={() => studioCreateDialog.openDialog()} />
  <Sidebar.Inset title="title" class="min-h-[100dvh]">
    {#if showLayoutHeader}
      <header class="flex h-16 shrink-0 items-center gap-2">
        <div class="flex items-center gap-2 px-4">
          <Sidebar.Trigger class="-ms-1" />
          <Separator
            orientation="vertical"
            class="me-2 data-[orientation=vertical]:h-4"
          />
        </div>
      </header>
    {/if}
    {@render children()}
  </Sidebar.Inset>
</Sidebar.Provider>

<StudioCreateDialog bind:open={studioCreateDialog.open} />
