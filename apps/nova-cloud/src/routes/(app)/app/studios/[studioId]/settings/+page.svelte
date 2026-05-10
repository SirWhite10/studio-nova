<script lang="ts">
	import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
	import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
	import CheckCircleIcon from "@lucide/svelte/icons/check-circle";
	import CheckIcon from "@lucide/svelte/icons/check";
	import Clock3Icon from "@lucide/svelte/icons/clock-3";
	import CopyIcon from "@lucide/svelte/icons/copy";
	import CrownIcon from "@lucide/svelte/icons/crown";
	import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
	import Globe2Icon from "@lucide/svelte/icons/globe-2";
	import InfinityIcon from "@lucide/svelte/icons/infinity";
	import LinkIcon from "@lucide/svelte/icons/link";
	import PaletteIcon from "@lucide/svelte/icons/palette";
	import PanelLeftIcon from "@lucide/svelte/icons/panel-left";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import RocketIcon from "@lucide/svelte/icons/rocket";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import ZapIcon from "@lucide/svelte/icons/zap";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import StudioPageShell from "$lib/components/studios/studio-page-shell.svelte";
	import StudioIcon from "$lib/components/studios/studio-icon.svelte";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import * as Tabs from "$lib/components/ui/tabs";
	import { Textarea } from "$lib/components/ui/textarea";
	import { toast } from "svelte-sonner";
	import type { WorkspaceDomain, WorkspaceDomainSettings } from "$lib/domains/workspace-domains";
	import { COLOR_PRESETS } from "$lib/studios/constants";
	import {
		STUDIO_SIDEBAR_SECTION_IDS,
		defaultStudioAppearanceSettings,
		defaultStudioNavigationProfile,
		type StudioAppearanceAccentScale,
		type StudioAppearanceBrandContrast,
		type StudioAppearanceSurfaceMode,
		type StudioNavigationProfile,
		type StudioSidebarSectionId,
	} from "$lib/studios/types";

	type SettingsTab =
		| "general"
		| "appearance"
		| "navigation"
		| "domains"
		| "plan"
		| "danger";

	type StudioSettingsSnapshot = {
		id: string | null;
		name: string;
		description: string;
		themeHue: number;
		appearanceSettings: ReturnType<typeof defaultStudioAppearanceSettings>;
		navigationProfile: StudioNavigationProfile;
	};

	type NavigationItemDefinition = {
		id: string;
		label: string;
		icon: string;
	};

	type NavigationSectionDefinition = {
		id: StudioSidebarSectionId;
		label: string;
		description: string;
		icon: string;
		items: NavigationItemDefinition[];
	};

	let { data }: { data: any } = $props();
	const initialStudioSnapshot = snapshotStudioSettings(data?.studio);
	const initialPlan = data?.studioPlan?.plan ?? "free";
	const initialDomains = data?.domains;

	const navigationSections: NavigationSectionDefinition[] = [
		{
			id: "agent",
			label: "Agent",
			description: "Chat, skills, memory, jobs, and agent management entry points.",
			icon: "sparkles",
			items: [
				{ id: "overview", label: "Overview", icon: "waypoints" },
				{ id: "chats", label: "Chats", icon: "message-square" },
				{ id: "skills", label: "Skills", icon: "sparkles" },
				{ id: "agents", label: "Agents", icon: "bot" },
				{ id: "memory", label: "Memory", icon: "brain" },
				{ id: "jobs", label: "Jobs", icon: "calendar-clock" },
			],
		},
		{
			id: "workspace-sandbox",
			label: "Workspace & Sandbox",
			description: "Runtime and workspace management surfaces.",
			icon: "blocks",
			items: [
				{ id: "deployments", label: "Deployments", icon: "blocks" },
				{ id: "sandbox", label: "Sandbox", icon: "wrench" },
			],
		},
		{
			id: "integrations",
			label: "Integrations",
			description: "Installed integrations and marketplace access.",
			icon: "plug-zap",
			items: [],
		},
		{
			id: "content",
			label: "Content",
			description: "Files and CMS-oriented content surfaces.",
			icon: "folder",
			items: [
				{ id: "files", label: "Files", icon: "folder" },
				{ id: "collections", label: "Collections", icon: "layers" },
				{ id: "media", label: "Media", icon: "image" },
			],
		},
	];

	function normalizeNavigationProfile(
		profile?: Partial<StudioNavigationProfile> | null,
	): StudioNavigationProfile {
		const defaults = defaultStudioNavigationProfile();
		const sectionOrder = [
			...(profile?.sectionOrder ?? []),
			...defaults.sectionOrder,
		].filter((sectionId, index, list): sectionId is StudioSidebarSectionId => {
			return (
				typeof sectionId === "string" &&
				STUDIO_SIDEBAR_SECTION_IDS.includes(sectionId as StudioSidebarSectionId) &&
				list.indexOf(sectionId) === index
			);
		});

		const sectionConfigs = { ...defaults.sectionConfigs };
		for (const sectionId of STUDIO_SIDEBAR_SECTION_IDS) {
			const existing = profile?.sectionConfigs?.[sectionId];
			if (!existing) continue;
			sectionConfigs[sectionId] = {
				itemOrder: [...(existing.itemOrder ?? [])].filter(
					(itemId, index, list) =>
						typeof itemId === "string" && list.indexOf(itemId) === index,
				),
				collapsed: Boolean(existing.collapsed),
			};
		}

		return {
			version: profile?.version ?? defaults.version,
			sectionOrder,
			sectionConfigs,
		};
	}

	function snapshotStudioSettings(studio: any): StudioSettingsSnapshot {
		const appearanceSettings =
			studio?.appearanceSettings ??
			defaultStudioAppearanceSettings(studio?.themeHue ?? 25);
		return {
			id: studio?.id ?? studio?._id ?? null,
			name: studio?.name ?? "",
			description: studio?.description ?? "",
			themeHue: studio?.themeHue ?? appearanceSettings.themeHue ?? 25,
			appearanceSettings: {
				themeHue: appearanceSettings.themeHue ?? studio?.themeHue ?? 25,
				accentScale: appearanceSettings.accentScale ?? "balanced",
				surfaceMode: appearanceSettings.surfaceMode ?? "obsidian",
				brandContrast: appearanceSettings.brandContrast ?? "balanced",
			},
			navigationProfile: normalizeNavigationProfile(studio?.navigationProfile),
		};
	}

	function cloneNavigationProfile(profile: StudioNavigationProfile) {
		return normalizeNavigationProfile(JSON.parse(JSON.stringify(profile)));
	}

	function cloneStudioSnapshot(snapshot: StudioSettingsSnapshot): StudioSettingsSnapshot {
		return {
			...snapshot,
			appearanceSettings: { ...snapshot.appearanceSettings },
			navigationProfile: cloneNavigationProfile(snapshot.navigationProfile),
		};
	}

	let activeTab = $state<SettingsTab>("general");
	let isRefreshing = $state(false);
	let isSavingGeneral = $state(false);
	let isSavingAppearance = $state(false);
	let isSavingNavigation = $state(false);
	let isUpgrading = $state(false);
	let isDeleting = $state(false);
	let deleteConfirmOpen = $state(false);
	let isAddingDomain = $state(false);
	let activeDomainHost = $state<string | null>(null);

	let studioSnapshot = $state<StudioSettingsSnapshot>(initialStudioSnapshot);
	let originalStudioSnapshot = $state<StudioSettingsSnapshot>(
		cloneStudioSnapshot(initialStudioSnapshot),
	);

	let studioName = $state(initialStudioSnapshot.name);
	let studioDescription = $state(initialStudioSnapshot.description);
	let selectedHue = $state(initialStudioSnapshot.appearanceSettings.themeHue);
	let accentScale = $state<StudioAppearanceAccentScale>(
		initialStudioSnapshot.appearanceSettings.accentScale,
	);
	let surfaceMode = $state<StudioAppearanceSurfaceMode>(
		initialStudioSnapshot.appearanceSettings.surfaceMode,
	);
	let brandContrast = $state<StudioAppearanceBrandContrast>(
		initialStudioSnapshot.appearanceSettings.brandContrast,
	);
	let navigationProfileDraft = $state<StudioNavigationProfile>(
		cloneNavigationProfile(initialStudioSnapshot.navigationProfile),
	);

	let currentPlan = $state(initialPlan);
	let customDomain = $state("");
	let domainSettings = $state<WorkspaceDomainSettings | undefined>(initialDomains);

	const studioId = $derived(page.params.studioId);
	const isPro = $derived(currentPlan === "pro");
	const planLabel = $derived(isPro ? "Pro" : "Free");
	const planDesc = $derived(
		isPro
			? "24hr persistent sandbox runtime per session"
			: "1hr sandbox runtime per session",
	);
	const displayedCustomDomains = $derived<WorkspaceDomain[]>(
		domainSettings?.customDomains ?? [],
	);
	const endpointRows = $derived([
		["Create workspace", domainSettings?.endpoints?.createWorkspace],
		["List domains", domainSettings?.endpoints?.listDomains],
		["Add domain", domainSettings?.endpoints?.addDomain],
		["Verify domain", domainSettings?.endpoints?.verifyDomain],
		["Remove domain", domainSettings?.endpoints?.removeDomain],
		["Smoke test", domainSettings?.endpoints?.smokeTest],
	]);
	const visibleEndpointRows = $derived(endpointRows.filter((row) => row[1]));
	const dnsRecords = $derived([
		...(domainSettings?.defaultDomain?.records ?? []),
		...displayedCustomDomains.flatMap((domain) => domain.records ?? []),
	]);
	const domainRoutingHints = $derived(
		displayedCustomDomains
			.map((domain) => domain.routingHint)
			.filter((hint): hint is string => Boolean(hint)),
	);
	const appearanceDraft = $derived({
		themeHue: selectedHue,
		accentScale,
		surfaceMode,
		brandContrast,
	});
	const orderedNavigationSections = $derived(
		navigationProfileDraft.sectionOrder
			.map((sectionId) =>
				navigationSections.find((section) => section.id === sectionId),
			)
			.filter((section): section is NavigationSectionDefinition => Boolean(section)),
	);
	const hasGeneralChanges = $derived(
		studioName !== originalStudioSnapshot.name ||
			studioDescription !== originalStudioSnapshot.description,
	);
	const hasAppearanceChanges = $derived(
		JSON.stringify(appearanceDraft) !==
			JSON.stringify(originalStudioSnapshot.appearanceSettings),
	);
	const hasNavigationChanges = $derived(
		JSON.stringify(navigationProfileDraft) !==
			JSON.stringify(originalStudioSnapshot.navigationProfile),
	);

	function applyStudioSnapshot(snapshot: StudioSettingsSnapshot) {
		studioSnapshot = cloneStudioSnapshot(snapshot);
		originalStudioSnapshot = cloneStudioSnapshot(snapshot);
		studioName = snapshot.name;
		studioDescription = snapshot.description;
		selectedHue = snapshot.appearanceSettings.themeHue;
		accentScale = snapshot.appearanceSettings.accentScale;
		surfaceMode = snapshot.appearanceSettings.surfaceMode;
		brandContrast = snapshot.appearanceSettings.brandContrast;
		navigationProfileDraft = cloneNavigationProfile(snapshot.navigationProfile);
	}

	function resetGeneral() {
		studioName = originalStudioSnapshot.name;
		studioDescription = originalStudioSnapshot.description;
	}

	function resetAppearance() {
		selectedHue = originalStudioSnapshot.appearanceSettings.themeHue;
		accentScale = originalStudioSnapshot.appearanceSettings.accentScale;
		surfaceMode = originalStudioSnapshot.appearanceSettings.surfaceMode;
		brandContrast = originalStudioSnapshot.appearanceSettings.brandContrast;
	}

	function resetNavigation() {
		navigationProfileDraft = cloneNavigationProfile(
			originalStudioSnapshot.navigationProfile,
		);
	}

	function sectionItemOrder(sectionId: StudioSidebarSectionId) {
		const defaults = defaultStudioNavigationProfile();
		const itemOrder =
			navigationProfileDraft.sectionConfigs[sectionId]?.itemOrder ??
			defaults.sectionConfigs[sectionId]?.itemOrder ??
			[];
		return [...itemOrder];
	}

	function reorderValues<T>(values: T[], fromIndex: number, toIndex: number) {
		if (
			fromIndex < 0 ||
			toIndex < 0 ||
			fromIndex >= values.length ||
			toIndex >= values.length
		) {
			return values;
		}

		const next = [...values];
		const [moved] = next.splice(fromIndex, 1);
		next.splice(toIndex, 0, moved);
		return next;
	}

	function moveSection(
		sectionId: StudioSidebarSectionId,
		direction: "up" | "down",
	) {
		const index = navigationProfileDraft.sectionOrder.indexOf(sectionId);
		const targetIndex = direction === "up" ? index - 1 : index + 1;
		navigationProfileDraft = {
			...navigationProfileDraft,
			sectionOrder: reorderValues(
				navigationProfileDraft.sectionOrder,
				index,
				targetIndex,
			),
		};
	}

	function moveSectionItem(
		sectionId: StudioSidebarSectionId,
		itemId: string,
		direction: "up" | "down",
	) {
		const currentOrder = sectionItemOrder(sectionId);
		const index = currentOrder.indexOf(itemId);
		const targetIndex = direction === "up" ? index - 1 : index + 1;
		navigationProfileDraft = {
			...navigationProfileDraft,
			sectionConfigs: {
				...navigationProfileDraft.sectionConfigs,
				[sectionId]: {
					...(navigationProfileDraft.sectionConfigs[sectionId]
						? navigationProfileDraft.sectionConfigs[sectionId]
						: {}),
					itemOrder: reorderValues(currentOrder, index, targetIndex),
				},
			},
		};
	}

	function statusClass(status: string) {
		if (status === "active" || status === "available") {
			return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
		}
		if (status === "pending" || status === "verifying" || status === "verified") {
			return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
		}
		return "border-border bg-muted text-muted-foreground";
	}

	async function copyText(value: string | undefined) {
		if (!value) return;
		await navigator.clipboard.writeText(value);
		toast.success("Copied");
	}

	async function refreshStudioState(showToast = false) {
		isRefreshing = true;
		try {
			const [studioRes, domainsRes] = await Promise.all([
				fetch(`/api/studios/${studioId}`),
				fetch(`/api/studios/${studioId}/domains`),
			]);

			if (!studioRes.ok) {
				throw new Error("Failed to refresh Studio state");
			}

			const studio = await studioRes.json();
			applyStudioSnapshot(snapshotStudioSettings(studio));

			if (domainsRes.ok) {
				const body = await domainsRes.json();
				domainSettings = body.domains ?? domainSettings;
			}

			if (showToast) toast.success("Studio settings refreshed");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to refresh settings",
			);
		} finally {
			isRefreshing = false;
		}
	}

	async function saveGeneral() {
		if (!studioName.trim() || isSavingGeneral) return;
		isSavingGeneral = true;
		try {
			const res = await fetch(`/api/studios/${studioId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: studioName.trim(),
					description: studioDescription.trim(),
				}),
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || "Failed to save Studio");
			applyStudioSnapshot(snapshotStudioSettings(body));
			toast.success("Studio details saved");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to save");
		} finally {
			isSavingGeneral = false;
		}
	}

	async function saveAppearance() {
		if (isSavingAppearance) return;
		isSavingAppearance = true;
		try {
			const res = await fetch(`/api/studios/${studioId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					appearanceSettings: appearanceDraft,
					themeHue: selectedHue,
				}),
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || "Failed to save appearance");
			applyStudioSnapshot(snapshotStudioSettings(body));
			toast.success("Studio appearance updated");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to save appearance",
			);
		} finally {
			isSavingAppearance = false;
		}
	}

	async function saveNavigation() {
		if (isSavingNavigation) return;
		isSavingNavigation = true;
		try {
			const res = await fetch(`/api/studios/${studioId}/navigation`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(navigationProfileDraft),
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || "Failed to save navigation");
			const nextProfile = normalizeNavigationProfile(body.navigationProfile);
			studioSnapshot = {
				...studioSnapshot,
				navigationProfile: cloneNavigationProfile(nextProfile),
			};
			originalStudioSnapshot = {
				...originalStudioSnapshot,
				navigationProfile: cloneNavigationProfile(nextProfile),
			};
			navigationProfileDraft = cloneNavigationProfile(nextProfile);
			toast.success("Sidebar navigation saved");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to save navigation",
			);
		} finally {
			isSavingNavigation = false;
		}
	}

	async function addCustomDomain() {
		const host = customDomain.trim().toLowerCase();
		if (!host) {
			toast.error("Enter a domain");
			return;
		}

		isAddingDomain = true;
		try {
			const res = await fetch(`/api/studios/${studioId}/domains`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ host }),
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || "Failed to add domain");
			customDomain = "";
			toast.success("Domain queued for verification");
			await refreshStudioState(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to add domain",
			);
		} finally {
			isAddingDomain = false;
		}
	}

	async function verifyCustomDomain(host: string) {
		activeDomainHost = host;
		try {
			const res = await fetch(
				`/api/studios/${studioId}/domains/${encodeURIComponent(host)}/verify`,
				{ method: "POST" },
			);
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || "Failed to verify domain");
			toast.success(body.activated ? "Domain activated" : "Verification checked");
			await refreshStudioState(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to verify domain",
			);
		} finally {
			activeDomainHost = null;
		}
	}

	async function removeCustomDomain(host: string) {
		activeDomainHost = host;
		try {
			const res = await fetch(
				`/api/studios/${studioId}/domains/${encodeURIComponent(host)}`,
				{ method: "DELETE" },
			);
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || "Failed to remove domain");
			toast.success("Domain removed");
			await refreshStudioState(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to remove domain",
			);
		} finally {
			activeDomainHost = null;
		}
	}

	async function upgradeToPro() {
		if (!data.userId || isUpgrading) {
			if (!data.userId) toast.error("Unable to identify user");
			return;
		}

		isUpgrading = true;
		try {
			const res = await fetch("/api/user-plans", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ plan: "pro" }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || "Failed to upgrade");
			currentPlan = "pro";
			toast.success("Upgraded to Pro");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Upgrade failed");
		} finally {
			isUpgrading = false;
		}
	}

	async function downgradeToFree() {
		if (!data.userId || isUpgrading) return;

		isUpgrading = true;
		try {
			const res = await fetch("/api/user-plans", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ plan: "free" }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || "Failed to downgrade");
			currentPlan = "free";
			toast.success("Switched back to Free");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to switch plan");
		} finally {
			isUpgrading = false;
		}
	}

	async function deleteStudio() {
		isDeleting = true;
		try {
			const res = await fetch(`/api/studios/${studioId}`, {
				method: "DELETE",
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || "Failed to delete Studio");
			toast.success("Studio deleted");
			await goto("/app");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to delete Studio");
		} finally {
			isDeleting = false;
		}
	}
</script>

<StudioPageShell containerClass="max-w-6xl">
	<div class="space-y-6">
		<section class="studio-shell-panel">
			<div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div class="space-y-3">
					<div class="flex flex-wrap items-center gap-2">
						<Badge
							class="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground"
						>
							Studio settings
						</Badge>
						<Badge
							variant="outline"
							class="rounded-full text-[11px] uppercase tracking-[0.18em]"
						>
							{planLabel} plan
						</Badge>
						<Badge
							variant="outline"
							class="rounded-full text-[11px] uppercase tracking-[0.18em]"
						>
							Per-studio sidebar
						</Badge>
					</div>
					<div>
						<h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">
							{studioSnapshot.name || "Studio"} settings
						</h1>
						<p class="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
							Manage Studio identity, appearance, sidebar layout, domains,
							plan controls, and destructive actions from one tabbed settings surface.
						</p>
					</div>
				</div>
				<div class="flex flex-wrap gap-3">
					<Button
						variant="outline"
						class="rounded-full px-5"
						onclick={() => refreshStudioState(true)}
						disabled={isRefreshing}
					>
						{isRefreshing ? "Refreshing..." : "Refresh"}
					</Button>
					<Button
						variant="outline"
						class="rounded-full px-5"
						href={`/app/studios/${studioId}`}
					>
						Open Studio
					</Button>
				</div>
			</div>
		</section>

		<Tabs.Root bind:value={activeTab} class="gap-6">
			<Tabs.List
				variant="line"
				class="h-auto w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-background/85 p-2 shadow-sm backdrop-blur"
			>
				<Tabs.Trigger value="general" class="h-10 flex-none rounded-xl px-4">
					<InfinityIcon class="size-4" />
					General
				</Tabs.Trigger>
				<Tabs.Trigger value="appearance" class="h-10 flex-none rounded-xl px-4">
					<PaletteIcon class="size-4" />
					Appearance
				</Tabs.Trigger>
				<Tabs.Trigger value="navigation" class="h-10 flex-none rounded-xl px-4">
					<PanelLeftIcon class="size-4" />
					Navigation
				</Tabs.Trigger>
				<Tabs.Trigger value="domains" class="h-10 flex-none rounded-xl px-4">
					<Globe2Icon class="size-4" />
					Domains
				</Tabs.Trigger>
				<Tabs.Trigger value="plan" class="h-10 flex-none rounded-xl px-4">
					<CrownIcon class="size-4" />
					Plan
				</Tabs.Trigger>
				<Tabs.Trigger
					value="danger"
					class="h-10 flex-none rounded-xl px-4 text-destructive"
				>
					<Trash2Icon class="size-4" />
					Danger
				</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="general" class="space-y-5">
				<section class="studio-shell-panel">
					<div class="flex items-center gap-3">
						<div
							class="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"
						>
							<InfinityIcon class="size-5" />
						</div>
						<div>
							<h2 class="text-lg font-semibold">Studio identity</h2>
							<p class="text-sm text-muted-foreground">
								Name, description, and how the Studio is described across the shell.
							</p>
						</div>
					</div>

					<div class="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
						<div
							class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5"
						>
							<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">
								Shell preview
							</p>
							<div class="mt-4 flex items-start gap-4">
								<div
									class="flex size-14 items-center justify-center rounded-[1.5rem] text-white shadow-sm"
									style={`background: oklch(0.55 0.22 ${selectedHue})`}
								>
									<InfinityIcon class="size-6" />
								</div>
								<div class="min-w-0">
									<p class="truncate text-lg font-semibold">
										{studioName || "Untitled Studio"}
									</p>
									<p class="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">
										{studioDescription ||
											"Add a concise Studio description to help anchor the shell and overview pages."}
									</p>
								</div>
							</div>
						</div>

						<div class="space-y-4 rounded-[1.75rem] border border-border/60 bg-background/80 p-5">
							<div class="space-y-2">
								<label for="studio-name" class="text-sm font-medium">Studio name</label>
								<Input id="studio-name" bind:value={studioName} placeholder="My Studio" />
							</div>
							<div class="space-y-2">
								<label for="studio-description" class="text-sm font-medium">
									Description
								</label>
								<Textarea
									id="studio-description"
									class="min-h-32 resize-y"
									bind:value={studioDescription}
									placeholder="Describe what this Studio manages, builds, or publishes."
								/>
							</div>
						</div>
					</div>
				</section>

				<div class="flex items-center justify-end gap-3">
					<Button
						variant="outline"
						class="rounded-full px-5"
						onclick={resetGeneral}
						disabled={!hasGeneralChanges}
					>
						Cancel
					</Button>
					<Button
						class="rounded-full px-5"
						onclick={saveGeneral}
						disabled={!hasGeneralChanges || !studioName.trim() || isSavingGeneral}
					>
						{isSavingGeneral ? "Saving..." : "Save changes"}
					</Button>
				</div>
			</Tabs.Content>

			<Tabs.Content value="appearance" class="space-y-5">
				<section class="studio-shell-panel">
					<div class="flex items-center gap-3">
						<div
							class="flex size-11 items-center justify-center rounded-2xl text-white shadow-sm"
							style={`background: oklch(0.55 0.22 ${selectedHue})`}
						>
							<PaletteIcon class="size-5" />
						</div>
						<div>
							<h2 class="text-lg font-semibold">Studio appearance</h2>
							<p class="text-sm text-muted-foreground">
								Adjust hue and the finer-grained shell treatment used to match a
								Studio brand.
							</p>
						</div>
					</div>

					<div class="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
						<div class="space-y-5 rounded-[1.75rem] border border-border/60 bg-background/80 p-5">
							<div>
								<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">
									Primary hue
								</p>
								<div class="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-8">
									{#each COLOR_PRESETS as preset (preset.hue)}
										<button
											type="button"
											class={`group relative flex h-12 items-center justify-center rounded-xl border-2 transition-transform hover:scale-[1.03] ${
												selectedHue === preset.hue
													? "border-foreground ring-2 ring-foreground/15"
													: "border-border hover:border-foreground/30"
											}`}
											style={`background: oklch(0.55 0.22 ${preset.hue})`}
											onclick={() => (selectedHue = preset.hue)}
											title={preset.name}
										>
											{#if selectedHue === preset.hue}
												<CheckIcon class="size-4 text-white drop-shadow-sm" />
											{/if}
										</button>
									{/each}
								</div>
							</div>

							<div class="grid gap-4 md:grid-cols-3">
								<div class="space-y-2">
									<label class="text-sm font-medium" for="accent-scale">
										Accent scale
									</label>
									<select
										id="accent-scale"
										class="border-input bg-background ring-offset-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-xl border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
										bind:value={accentScale}
									>
										<option value="subtle">Subtle</option>
										<option value="balanced">Balanced</option>
										<option value="vivid">Vivid</option>
									</select>
								</div>
								<div class="space-y-2">
									<label class="text-sm font-medium" for="surface-mode">
										Surface mode
									</label>
									<select
										id="surface-mode"
										class="border-input bg-background ring-offset-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-xl border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
										bind:value={surfaceMode}
									>
										<option value="system">System</option>
										<option value="obsidian">Obsidian</option>
										<option value="champagne">Champagne</option>
									</select>
								</div>
								<div class="space-y-2">
									<label class="text-sm font-medium" for="brand-contrast">
										Brand contrast
									</label>
									<select
										id="brand-contrast"
										class="border-input bg-background ring-offset-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-xl border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
										bind:value={brandContrast}
									>
										<option value="soft">Soft</option>
										<option value="balanced">Balanced</option>
										<option value="high">High</option>
									</select>
								</div>
							</div>
						</div>

						<div
							class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5"
						>
							<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">
								Preview
							</p>
							<div
								class="mt-4 rounded-[1.5rem] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_55%)] p-5"
							>
								<div class="flex items-start justify-between gap-4">
									<div class="space-y-3">
										<div
											class="flex size-12 items-center justify-center rounded-2xl text-white shadow-md"
											style={`background: oklch(0.55 0.22 ${selectedHue})`}
										>
											<InfinityIcon class="size-5" />
										</div>
										<div>
											<p class="font-semibold">{studioName || "Studio preview"}</p>
											<p class="mt-1 text-sm text-muted-foreground">
												{surfaceMode} surface, {accentScale} accents, {brandContrast}
												contrast
											</p>
										</div>
									</div>
									<Badge
										class="rounded-full px-3 py-1 text-white"
										style={`background: oklch(0.55 0.22 ${selectedHue})`}
									>
										Primary
									</Badge>
								</div>
								<div class="mt-5 flex flex-wrap gap-2">
									<span
										class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
										style={`border-color: oklch(0.55 0.22 ${selectedHue} / 0.35); color: oklch(0.45 0.15 ${selectedHue})`}
									>
										Outline treatment
									</span>
									<span
										class="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
									>
										Neutral surface
									</span>
								</div>
							</div>
						</div>
					</div>
				</section>

				<div class="flex items-center justify-end gap-3">
					<Button
						variant="outline"
						class="rounded-full px-5"
						onclick={resetAppearance}
						disabled={!hasAppearanceChanges}
					>
						Cancel
					</Button>
					<Button
						class="rounded-full px-5"
						onclick={saveAppearance}
						disabled={!hasAppearanceChanges || isSavingAppearance}
					>
						{isSavingAppearance ? "Saving..." : "Save appearance"}
					</Button>
				</div>
			</Tabs.Content>

			<Tabs.Content value="navigation" class="space-y-5">
				<section class="studio-shell-panel">
					<div class="flex items-center gap-3">
						<div
							class="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"
						>
							<PanelLeftIcon class="size-5" />
						</div>
						<div>
							<h2 class="text-lg font-semibold">Sidebar navigation</h2>
							<p class="text-sm text-muted-foreground">
								Reorder the Studio sidebar sections and their primary items.
								Changes are saved per Studio.
							</p>
						</div>
					</div>

					<div class="mt-6 space-y-4">
						{#each orderedNavigationSections as section, sectionIndex (section.id)}
							<div
								class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5"
							>
								<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
									<div class="min-w-0 flex items-start gap-4">
										<div
											class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground"
										>
											<StudioIcon name={section.icon} class="size-5" />
										</div>
										<div class="min-w-0">
											<div class="flex flex-wrap items-center gap-2">
												<h3 class="font-semibold">{section.label}</h3>
												<Badge
													variant="outline"
													class="rounded-full text-[11px] uppercase tracking-[0.16em]"
												>
													Section {sectionIndex + 1}
												</Badge>
											</div>
											<p class="mt-1 text-sm leading-6 text-muted-foreground">
												{section.description}
											</p>
										</div>
									</div>

									<div class="flex shrink-0 gap-2">
										<Button
											variant="outline"
											size="icon"
											class="rounded-full"
											disabled={sectionIndex === 0}
											aria-label={`Move ${section.label} up`}
											onclick={() => moveSection(section.id, "up")}
										>
											<ArrowUpIcon class="size-4" />
										</Button>
										<Button
											variant="outline"
											size="icon"
											class="rounded-full"
											disabled={sectionIndex === orderedNavigationSections.length - 1}
											aria-label={`Move ${section.label} down`}
											onclick={() => moveSection(section.id, "down")}
										>
											<ArrowDownIcon class="size-4" />
										</Button>
									</div>
								</div>

								{#if section.items.length > 0}
									<div class="mt-5 space-y-3">
										{#each sectionItemOrder(section.id) as itemId, itemIndex (itemId)}
											{@const item = section.items.find((candidate) => candidate.id === itemId)}
											{#if item}
												<div class="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
													<div class="flex min-w-0 items-center gap-3">
														<div class="flex size-9 items-center justify-center rounded-xl bg-background text-foreground">
															<StudioIcon name={item.icon} class="size-4" />
														</div>
														<div class="min-w-0">
															<p class="truncate font-medium">{item.label}</p>
															<p class="text-xs text-muted-foreground">
																Item {itemIndex + 1}
															</p>
														</div>
													</div>
													<div class="flex gap-2">
														<Button
															variant="outline"
															size="icon"
															class="rounded-full"
															disabled={itemIndex === 0}
															aria-label={`Move ${item.label} up`}
															onclick={() => moveSectionItem(section.id, item.id, "up")}
														>
															<ArrowUpIcon class="size-4" />
														</Button>
														<Button
															variant="outline"
															size="icon"
															class="rounded-full"
															disabled={itemIndex === sectionItemOrder(section.id).length - 1}
															aria-label={`Move ${item.label} down`}
															onclick={() => moveSectionItem(section.id, item.id, "down")}
														>
															<ArrowDownIcon class="size-4" />
														</Button>
													</div>
												</div>
											{/if}
										{/each}
									</div>
								{:else}
									<div class="mt-5 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
										Installed integrations appear here automatically. The section
										order still applies, and integration item ordering will follow
										the saved profile once integrations are present.
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</section>

				<div class="flex items-center justify-end gap-3">
					<Button
						variant="outline"
						class="rounded-full px-5"
						onclick={resetNavigation}
						disabled={!hasNavigationChanges}
					>
						Cancel
					</Button>
					<Button
						class="rounded-full px-5"
						onclick={saveNavigation}
						disabled={!hasNavigationChanges || isSavingNavigation}
					>
						{isSavingNavigation ? "Saving..." : "Save navigation"}
					</Button>
				</div>
			</Tabs.Content>

			<Tabs.Content value="domains" class="space-y-5">
				<section class="studio-shell-panel">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div class="flex items-center gap-3">
							<div
								class="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"
							>
								<Globe2Icon class="size-5" />
							</div>
							<div>
								<h2 class="text-lg font-semibold">Workspace domains</h2>
								<p class="text-sm text-muted-foreground">
									Generated Nova hostnames, custom domains, DNS records, and
									domain-control endpoints.
								</p>
							</div>
						</div>
						<Badge
							variant="outline"
							class={`w-fit rounded-full ${statusClass(domainSettings?.defaultDomain?.https ?? "available")}`}
						>
							<ShieldCheckIcon class="mr-1.5 size-3.5" />
							HTTPS ready
						</Badge>
					</div>

					<div class="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
						<div
							class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5"
						>
							<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div class="min-w-0">
									<div class="flex items-center gap-2">
										<LinkIcon class="size-4 text-muted-foreground" />
										<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">
											Nova URL
										</p>
									</div>
									<p class="mt-3 break-all font-mono text-sm font-semibold sm:text-base">
										{domainSettings?.defaultDomain?.host}
									</p>
									<p class="mt-2 text-sm leading-6 text-muted-foreground">
										Every workspace gets this generated Nova hostname by default.
									</p>
								</div>
								<div class="flex shrink-0 gap-2">
									<Button
										variant="outline"
										size="icon"
										class="rounded-full"
										aria-label="Copy Nova workspace URL"
										onclick={() => copyText(`https://${domainSettings?.defaultDomain?.host}`)}
									>
										<CopyIcon class="size-4" />
									</Button>
									<a
										class="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent"
										href={`https://${domainSettings?.defaultDomain?.host}`}
										target="_blank"
										rel="noreferrer"
										aria-label="Open Nova workspace URL"
									>
										<ExternalLinkIcon class="size-4" />
									</a>
								</div>
							</div>
							<div class="mt-4 flex flex-wrap gap-2">
								<Badge
									variant="outline"
									class={`rounded-full ${statusClass(domainSettings?.defaultDomain?.status ?? "available")}`}
								>
									Available
								</Badge>
								<Badge
									variant="outline"
									class={`rounded-full ${statusClass(domainSettings?.defaultDomain?.https ?? "available")}`}
								>
									Certificate managed
								</Badge>
							</div>
						</div>

						<div
							class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5"
						>
							<div class="flex items-center gap-2">
								<ShieldCheckIcon class="size-4 text-muted-foreground" />
								<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">
									FRP API
								</p>
							</div>
							<p class="mt-3 break-all font-mono text-sm font-semibold">
								{domainSettings?.apiOrigin}
							</p>
							<p class="mt-2 text-sm leading-6 text-muted-foreground">
								Workspace domain requests target the Nova FRP domain-control API.
							</p>
							<Button
								variant="outline"
								size="sm"
								class="mt-4 rounded-full"
								onclick={() => copyText(domainSettings?.apiOrigin)}
							>
								<CopyIcon class="mr-2 size-4" />
								Copy endpoint
							</Button>
						</div>
					</div>

					<div
						class="mt-4 rounded-[1.75rem] border border-border/60 bg-background/80 p-5"
					>
						<div class="flex flex-col gap-4 lg:flex-row lg:items-end">
							<div class="min-w-0 flex-1 space-y-2">
								<label for="custom-domain" class="text-sm font-medium">
									Custom domain
								</label>
								<Input
									id="custom-domain"
									bind:value={customDomain}
									placeholder="supremesolutionsusa.com"
									onkeydown={(event) => {
										if (event.key === "Enter") addCustomDomain();
									}}
								/>
							</div>
							<Button
								class="rounded-full px-5"
								onclick={addCustomDomain}
								disabled={isAddingDomain || !customDomain.trim()}
							>
								<PlusIcon class="mr-2 size-4" />
								{isAddingDomain ? "Adding..." : "Add domain"}
							</Button>
						</div>

						<div class="mt-5 space-y-3">
							{#if displayedCustomDomains.length}
								{#each displayedCustomDomains as domain (domain.host)}
									<div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
										<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
											<div class="min-w-0">
												<p class="break-all font-mono text-sm font-semibold">
													{domain.host}
												</p>
												<p class="mt-1 break-all text-sm text-muted-foreground">
													Target: {domain.target}
												</p>
												{#if domain.routingHint}
													<p class="mt-2 text-sm leading-6 text-muted-foreground">
														{domain.routingHint}
													</p>
												{/if}
											</div>
											<div class="flex shrink-0 flex-wrap gap-2">
												<Badge
													variant="outline"
													class={`rounded-full ${statusClass(domain.status)}`}
												>
													{domain.status}
												</Badge>
												<Badge
													variant="outline"
													class={`rounded-full ${statusClass(domain.https)}`}
												>
													HTTPS {domain.https}
												</Badge>
												{#if domain.status !== "active"}
													<Button
														variant="outline"
														size="sm"
														class="rounded-full"
														disabled={activeDomainHost === domain.host}
														onclick={() => verifyCustomDomain(domain.host)}
													>
														{activeDomainHost === domain.host ? "Checking..." : "Verify"}
													</Button>
												{/if}
												<Button
													variant="outline"
													size="icon"
													class="rounded-full"
													disabled={activeDomainHost === domain.host}
													aria-label="Remove custom domain"
													onclick={() => removeCustomDomain(domain.host)}
												>
													<Trash2Icon class="size-4" />
												</Button>
											</div>
										</div>
									</div>
								{/each}
							{:else}
								<div class="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
									No custom domains are attached to this workspace yet.
								</div>
							{/if}
						</div>
					</div>

					<div class="mt-4 grid gap-4 lg:grid-cols-2">
						<div
							class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5"
						>
							<h3 class="font-semibold">Subdomain routing</h3>
							<p class="mt-1 text-sm text-muted-foreground">
								Use a standard CNAME when the customer is routing a subdomain
								like <span class="font-mono">app.customer.com</span>.
							</p>
							<div class="mt-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
								<p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">
									Target
								</p>
								<p class="mt-2 break-all font-mono text-sm font-semibold">
									domain.dlx.studio
								</p>
							</div>
						</div>

						<div
							class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5"
						>
							<h3 class="font-semibold">Apex routing</h3>
							<p class="mt-1 text-sm text-muted-foreground">
								Root domains like <span class="font-mono">customer.com</span>
								need ALIAS, ANAME, or CNAME flattening support from the DNS
								provider.
							</p>
							{#if domainRoutingHints.length}
								<div class="mt-4 space-y-3">
									{#each domainRoutingHints as hint}
										<div class="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
											{hint}
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<div class="mt-4 grid gap-4 lg:grid-cols-2">
						<div
							class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5"
						>
							<h3 class="font-semibold">DNS records</h3>
							<p class="mt-1 text-sm text-muted-foreground">
								Expected records for generated and custom domains.
							</p>
							<div class="mt-4 space-y-3">
								{#each dnsRecords as record (`${record.type}-${record.name}-${record.value}`)}
									<div class="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-start">
										<Badge variant="outline" class="w-fit rounded-full">
											{record.type}
										</Badge>
										<div class="min-w-0 space-y-1">
											<p class="break-all font-mono text-xs font-semibold">
												{record.name}
											</p>
											<p class="break-all font-mono text-xs text-muted-foreground">
												{record.value}
											</p>
											<p class="text-xs text-muted-foreground">{record.purpose}</p>
										</div>
										<Button
											variant="outline"
											size="icon"
											class="rounded-full"
											aria-label="Copy DNS record value"
											onclick={() => copyText(record.value)}
										>
											<CopyIcon class="size-4" />
										</Button>
									</div>
								{/each}
							</div>
						</div>

						<div
							class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5"
						>
							<h3 class="font-semibold">Workspace API endpoints</h3>
							<p class="mt-1 text-sm text-muted-foreground">
								Local Studio endpoints backed by Nova domain-control and
								runtime-control.
							</p>
							<div class="mt-4 space-y-3">
								{#each visibleEndpointRows as row (row[0])}
									<div class="rounded-2xl border border-border/60 bg-muted/20 p-4">
										<div class="flex items-start justify-between gap-3">
											<div class="min-w-0">
												<p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">
													{row[0]}
												</p>
												<p class="mt-2 break-all font-mono text-xs font-semibold">
													{row[1]}
												</p>
											</div>
											<Button
												variant="outline"
												size="icon"
												class="shrink-0 rounded-full"
												aria-label={`Copy ${row[0]} endpoint`}
												onclick={() => copyText(row[1])}
											>
												<CopyIcon class="size-4" />
											</Button>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</section>
			</Tabs.Content>

			<Tabs.Content value="plan" class="space-y-5">
				<section class="studio-shell-panel">
					<div class="flex items-center gap-3">
						<div
							class="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"
						>
							<CrownIcon class="size-5" />
						</div>
						<div>
							<h2 class="text-lg font-semibold">Plan and runtime</h2>
							<p class="text-sm text-muted-foreground">
								Manage sandbox runtime limits and upgrade controls for this
								Studio owner account.
							</p>
						</div>
					</div>

					<div class="mt-6 grid gap-4 sm:grid-cols-2">
						<div
							class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5"
						>
							<div class="flex items-center gap-2">
								<Clock3Icon class="size-4 text-muted-foreground" />
								<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">
									Current plan
								</p>
							</div>
							<p class="mt-3 text-xl font-semibold">{planLabel}</p>
							<p class="mt-2 text-sm leading-6 text-muted-foreground">{planDesc}</p>
						</div>

						<div
							class="rounded-[1.75rem] border border-border/60 bg-background/80 p-5"
						>
							<div class="flex items-center gap-2">
								<InfinityIcon class="size-4 text-muted-foreground" />
								<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">
									Studios
								</p>
							</div>
							<p class="mt-3 text-xl font-semibold">Unlimited</p>
							<p class="mt-2 text-sm leading-6 text-muted-foreground">
								Create as many Studios as you need on any plan.
							</p>
						</div>
					</div>

					<div
						class="mt-5 rounded-[1.75rem] border border-border/60 bg-background/80 p-5"
					>
						{#if isPro}
							<div class="rounded-[1.5rem] border border-primary/20 bg-primary/5 p-5">
								<div class="flex items-center gap-2">
									<CheckCircleIcon class="size-5 text-primary" />
									<h3 class="font-semibold">You're on Pro</h3>
								</div>
								<ul class="mt-3 space-y-2 text-sm text-muted-foreground">
									<li class="flex items-center gap-2">
										<CheckCircleIcon class="size-3.5 text-primary" />
										24hr persistent sandbox runtime
									</li>
									<li class="flex items-center gap-2">
										<CheckCircleIcon class="size-3.5 text-primary" />
										Unlimited Studios
									</li>
									<li class="flex items-center gap-2">
										<CheckCircleIcon class="size-3.5 text-primary" />
										Long-running dev servers with hot reload
									</li>
									<li class="flex items-center gap-2">
										<CheckCircleIcon class="size-3.5 text-primary" />
										Priority sandbox provisioning
									</li>
								</ul>
								<div class="mt-4 flex gap-3">
									<Button variant="outline" size="sm" class="rounded-full" disabled>
										Manage subscription
									</Button>
									<Button
										variant="ghost"
										size="sm"
										class="rounded-full text-muted-foreground"
										onclick={downgradeToFree}
										disabled={isUpgrading}
									>
										Switch to Free
									</Button>
								</div>
							</div>
						{:else}
							<div class="rounded-[1.5rem] border border-border/70 bg-background/80 p-5">
								<div class="flex items-center gap-2">
									<RocketIcon class="size-5 text-primary" />
									<h3 class="font-semibold">Upgrade to Pro</h3>
									<Badge class="ml-2 rounded-full bg-primary/10 px-2 text-[10px] text-primary">
										$49/mo
									</Badge>
								</div>
								<ul class="mt-3 space-y-2 text-sm text-muted-foreground">
									<li class="flex items-center gap-2">
										<ZapIcon class="size-3.5 text-primary" />
										24hr persistent sandbox runtime instead of 1hr sessions
									</li>
									<li class="flex items-center gap-2">
										<ZapIcon class="size-3.5 text-primary" />
										Long-running dev servers that stay alive overnight
									</li>
									<li class="flex items-center gap-2">
										<ZapIcon class="size-3.5 text-primary" />
										Priority sandbox provisioning
									</li>
								</ul>
								<Button
									class="mt-4 rounded-full px-6"
									onclick={upgradeToPro}
									disabled={isUpgrading}
								>
									{isUpgrading ? "Upgrading..." : "Upgrade to Pro"}
								</Button>
								<p class="mt-2 text-xs text-muted-foreground">
									Payment integration is still pending, so this switches
									instantly for now.
								</p>
							</div>
						{/if}
					</div>
				</section>
			</Tabs.Content>

			<Tabs.Content value="danger" class="space-y-5">
				<section class="rounded-[2rem] border border-destructive/30 bg-destructive/5 p-6 shadow-sm sm:p-8">
					<div class="flex items-center gap-3">
						<div
							class="flex size-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"
						>
							<Trash2Icon class="size-5" />
						</div>
						<div>
							<h2 class="text-lg font-semibold">Danger zone</h2>
							<p class="text-sm text-muted-foreground">
								Irreversible destructive actions for this Studio.
							</p>
						</div>
					</div>

					<div class="mt-6 rounded-[1.5rem] border border-destructive/20 bg-background/80 p-5">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h3 class="font-semibold">Delete this Studio</h3>
								<p class="mt-1 text-sm text-muted-foreground">
									Permanently remove this Studio, its chats, sandbox, files,
									extensions, and related data. This cannot be undone.
								</p>
							</div>
							<AlertDialog.Root bind:open={deleteConfirmOpen}>
								<AlertDialog.Trigger>
									{#snippet child({ props })}
										<Button variant="destructive" class="shrink-0 rounded-full" {...props}>
											Delete Studio
										</Button>
									{/snippet}
								</AlertDialog.Trigger>
								<AlertDialog.Content>
									<AlertDialog.Header>
										<AlertDialog.Title>Delete this Studio?</AlertDialog.Title>
										<AlertDialog.Description>
											This will permanently remove the Studio, its chats,
											messages, runtime processes, files, domains, and
											integrations. This action cannot be undone.
										</AlertDialog.Description>
									</AlertDialog.Header>
									<AlertDialog.Footer>
										<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
										<AlertDialog.Action>
											{#snippet child({ props })}
												<Button
													variant="destructive"
													class="rounded-full"
													{...props}
													onclick={deleteStudio}
													disabled={isDeleting}
												>
													{isDeleting ? "Deleting..." : "Yes, delete Studio"}
												</Button>
											{/snippet}
										</AlertDialog.Action>
									</AlertDialog.Footer>
								</AlertDialog.Content>
							</AlertDialog.Root>
						</div>
					</div>
				</section>
			</Tabs.Content>
		</Tabs.Root>
	</div>
</StudioPageShell>
