<script lang="ts">
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { setFileUploadManager } from "$lib/files/upload-manager.svelte";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import type { StudioSidebarState } from "$lib/studios/types";
  import { page } from '$app/state';
  import { onMount } from "svelte";
  import StudioCreateDialog from '$lib/components/studios/studio-create-dialog.svelte';
  import { studioCreateDialog } from '$lib/studios/create-dialog-state.svelte';

  setFileUploadManager();

  let { children, data }: { children?: any; data?: { data?: StudioSidebarState | null } } = $props();

  let sidebarData = $state.raw<StudioSidebarState | null>(null);

  const breadcrumbLabelMap: Record<string, string> = {
    agents: 'Agents',
    chats: 'Chats',
    collections: 'Collections',
    deployments: 'Deployments',
    files: 'Files',
    integrations: 'Integrations',
    media: 'Media',
    memory: 'Memory',
    runtime: 'Sandbox',
    sandbox: 'Sandbox',
    jobs: 'Jobs',
    skills: 'Skills',
    settings: 'Settings',
    navigation: 'Navigation',
    marketplace: 'Marketplace',
    chat: 'Chat',
  };

  function formatSegmentLabel(segment: string) {
    return breadcrumbLabelMap[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

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
    const incomingSidebarData = data?.data;
    if (incomingSidebarData) {
      sidebarData = incomingSidebarData;
    }
  });

  $effect(() => {
    const hue = sidebarData?.currentStudio?.themeHue;
    const root = document.documentElement;
    if (hue != null && typeof hue === 'number') {
      root.style.setProperty('--primary', `oklch(0.55 0.22 ${hue})`);
      root.style.setProperty('--primary-foreground', `oklch(0.98 0.01 ${hue})`);
      root.style.setProperty('--ring', `oklch(0.65 0.18 ${hue})`);
      root.style.setProperty('--accent', `oklch(0.55 0.22 ${hue})`);
      root.style.setProperty('--accent-foreground', `oklch(0.98 0.01 ${hue})`);
      root.style.setProperty('--sidebar-primary', `oklch(0.55 0.22 ${hue})`);
      root.style.setProperty('--sidebar-primary-foreground', `oklch(0.98 0.01 ${hue})`);
      root.style.setProperty('--sidebar-accent', `oklch(0.55 0.22 ${hue})`);
      root.style.setProperty('--sidebar-accent-foreground', `oklch(0.98 0.01 ${hue})`);
      root.style.setProperty('--sidebar-ring', `oklch(0.65 0.18 ${hue})`);
      root.style.setProperty('--chart-1', `oklch(0.75 0.15 ${hue})`);
      root.style.setProperty('--chart-2', `oklch(0.60 0.18 ${hue + 15})`);
      root.style.setProperty('--chart-3', `oklch(0.55 0.20 ${hue + 30})`);
      root.style.setProperty('--chart-4', `oklch(0.50 0.18 ${hue + 45})`);
      root.style.setProperty('--chart-5', `oklch(0.45 0.15 ${hue + 60})`);
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-foreground');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-primary-foreground');
      root.style.removeProperty('--sidebar-accent');
      root.style.removeProperty('--sidebar-accent-foreground');
      root.style.removeProperty('--sidebar-ring');
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

  const headerBreadcrumbs = $derived.by(() => {
    const studioId = page.params.studioId ?? page.url.searchParams.get('studio') ?? sidebarData?.currentStudio?.id ?? null;
    const pathSegments = page.url.pathname.split('/').filter(Boolean);
    const breadcrumbs: Array<{ label: string; href?: string }> = [{ label: 'App', href: '/app' }];

    if (pathSegments[1] === 'chats') {
      breadcrumbs.push({ label: 'Chats' });
      return breadcrumbs;
    }

    if (pathSegments[1] === 'studios') {
      const studioLabel = sidebarData?.currentStudio?.name ?? 'Studio';
      const studioHref = studioId ? `/app/studios/${studioId}` : undefined;
      breadcrumbs.push({ label: studioLabel, href: studioHref });

      const remaining = pathSegments.slice(3).filter((segment) => segment !== 'chat');
      for (let index = 0; index < remaining.length; index += 1) {
        const segment = remaining[index];
        const last = index === remaining.length - 1;
        breadcrumbs.push({
          label: formatSegmentLabel(segment),
          href: last || !studioHref ? undefined : `${studioHref}/${remaining.slice(0, index + 1).join('/')}`,
        });
      }

      return breadcrumbs;
    }

    for (let index = 1; index < pathSegments.length; index += 1) {
      const segment = pathSegments[index];
      const last = index === pathSegments.length - 1;
      breadcrumbs.push({
        label: formatSegmentLabel(segment),
        href: last ? undefined : `/${pathSegments.slice(0, index + 1).join('/')}`,
      });
    }

    return breadcrumbs;
  });

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
  <Sidebar.Inset title="title" class="relative min-h-[100dvh] overflow-x-hidden">
    {#if showLayoutHeader}
      <header class="studio-shell-header sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border/60 bg-background/90 px-4 backdrop-blur">
        <div class="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <Sidebar.Trigger class="-ms-1" />
          <Separator
            orientation="vertical"
            class="me-2 data-[orientation=vertical]:h-4"
          />
          <div class="min-w-0 flex-1 overflow-x-auto">
            <Breadcrumb.Root>
              <Breadcrumb.List class="flex-nowrap whitespace-nowrap">
                {#each headerBreadcrumbs as crumb, index (index)}
                  <Breadcrumb.Item>
                    {#if crumb.href}
                      <Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
                    {:else}
                      <Breadcrumb.Page>{crumb.label}</Breadcrumb.Page>
                    {/if}
                  </Breadcrumb.Item>
                  {#if index < headerBreadcrumbs.length - 1}
                    <Breadcrumb.Separator />
                  {/if}
                {/each}
              </Breadcrumb.List>
            </Breadcrumb.Root>
          </div>
        </div>
      </header>
    {/if}
    {@render children()}
  </Sidebar.Inset>
</Sidebar.Provider>

<StudioCreateDialog bind:open={studioCreateDialog.open} />
