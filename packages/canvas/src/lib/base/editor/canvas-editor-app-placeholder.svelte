<script lang="ts">
	import type { EditorAppSection } from "./types.js";

	let {
		section = "theme",
	}: {
		section?: Exclude<EditorAppSection, "app-settings">;
	} = $props();

	const title = $derived(
		section === "theme"
			? "Theme"
			: section === "providers"
				? "Providers"
				: section === "seo"
					? "SEO"
					: "Metadata",
	);
	const description = $derived(
		section === "theme"
			? "Theme editing is available under App Settings today. This shortcut will later open a focused app theme workspace."
			: section === "providers"
				? "Provider configuration will live here so app data sources and runtime actions stay separate from editor settings."
				: section === "seo"
					? "SEO settings will live here for search, social, and indexation details across the app."
					: "App metadata will live here for identity, manifests, and structured runtime metadata.",
	);
</script>

<div class="grid gap-3 rounded-xl border p-4 [border-color:var(--editor-border)] [background:var(--editor-panel-muted)]">
	<h3 class="text-sm font-semibold">{title}</h3>
	<p class="text-sm leading-6 [color:var(--editor-fg-muted)]">{description}</p>
</div>
