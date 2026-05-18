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
  type BreadcrumbItem = {
    label: string;
    href?: string;
  };

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

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  function normalizeBreadcrumbItem(item: unknown): BreadcrumbItem | null {
    if (typeof item === 'string') {
      return item.trim() ? { label: item } : null;
    }

    if (!isRecord(item) || typeof item.label !== 'string' || !item.label.trim()) {
      return null;
    }

    const breadcrumb: BreadcrumbItem = { label: item.label };
    if (typeof item.href === 'string' && item.href.trim()) {
      breadcrumb.href = item.href;
    }

    return breadcrumb;
  }

  function getExplicitBreadcrumbs(): BreadcrumbItem[] | null {
    if (!isRecord(page.data) || !Array.isArray(page.data.breadcrumbs)) {
      return null;
    }

    const breadcrumbs = page.data.breadcrumbs
      .map((item) => normalizeBreadcrumbItem(item))
      .filter((item): item is BreadcrumbItem => item !== null);

    return breadcrumbs.length > 0 ? breadcrumbs : null;
  }

  function getDetailLabel(section: string, pageData: Record<string, unknown>) {
    if (section === 'chat' && typeof pageData.chatTitle === 'string' && pageData.chatTitle.trim()) {
      return pageData.chatTitle;
    }

    const integration = pageData.integration;
    if (section === 'integrations' && isRecord(integration) && typeof integration.title === 'string' && integration.title.trim()) {
      return integration.title;
    }

    if (section === 'agents') {
      if (typeof pageData.agentTitle === 'string' && pageData.agentTitle.trim()) {
        return pageData.agentTitle;
      }

      const agent = pageData.agent;
      if (isRecord(agent) && typeof agent.title === 'string' && agent.title.trim()) {
        return agent.title;
      }
    }

    if (section === 'jobs') {
      if (typeof pageData.jobTitle === 'string' && pageData.jobTitle.trim()) {
        return pageData.jobTitle;
      }

      const job = pageData.job;
      if (isRecord(job) && typeof job.title === 'string' && job.title.trim()) {
        return job.title;
      }
    }

    return null;
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
    const explicitBreadcrumbs = getExplicitBreadcrumbs();
    if (explicitBreadcrumbs) {
      return explicitBreadcrumbs;
    }

    const studioId = page.params.studioId ?? page.url.searchParams.get('studio') ?? sidebarData?.currentStudio?.id ?? null;
    const pageData = isRecord(page.data) ? page.data : {};
    const pathSegments = page.url.pathname.split('/').filter(Boolean);

    if (pathSegments[0] !== 'app') {
      return [];
    }

    if (pathSegments.length === 1) {
      return [];
    }

    if (pathSegments[1] === 'chats') {
      return [
        {
          label: formatSegmentLabel('chats'),
          href: pathSegments.length > 2 ? '/app/chats' : undefined,
        },
      ];
    }

    if (pathSegments[1] === 'studios') {
      const studioLabel = sidebarData?.currentStudio?.name ?? 'Studio';
      const studioHref = studioId ? `/app/studios/${studioId}` : undefined;
      const remaining = pathSegments.slice(3);

      if (remaining.length === 0) {
        return [
          {
            label: studioLabel,
          },
        ];
      }

      const studioSegments = remaining[0] === 'chat' && remaining.length > 1 ? remaining.slice(1) : remaining;
      const section = studioSegments[0];

      return studioSegments.map((segment, index) => {
        const isLast = index === studioSegments.length - 1;
        const label =
          isLast
            ? getDetailLabel(section, pageData) ?? formatSegmentLabel(segment)
            : formatSegmentLabel(segment);
        const href =
          !isLast && studioHref
            ? `${studioHref}/${studioSegments.slice(0, index + 1).join('/')}`
            : undefined;

        return { label, href };
      });
    }

    return pathSegments.slice(1).map((segment, index) => {
      const last = index === pathSegments.length - 2;
      return {
        label: formatSegmentLabel(segment),
        href: last ? undefined : `/${pathSegments.slice(0, index + 2).join('/')}`,
      };
    });
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
  <Sidebar.Inset class="relative flex h-dvh min-h-[100dvh] w-full flex-1 flex-col overflow-hidden overflow-x-hidden bg-background md:peer-data-[variant=inset]:!m-0 md:peer-data-[variant=inset]:!rounded-none md:peer-data-[variant=inset]:!shadow-none">
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {#if showLayoutHeader}
        <header class="studio-shell-header sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border/60 bg-background px-4">
          <div class="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <Sidebar.Trigger class="-ms-1" />
            {#if headerBreadcrumbs.length > 0}
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
            {/if}
          </div>
        </header>
      {/if}
      <div class="flex min-h-0 flex-1 flex-col">
        {@render children()}
      </div>
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>

<StudioCreateDialog bind:open={studioCreateDialog.open} />
