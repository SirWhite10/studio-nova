<script lang="ts">
	import {
		Canvas,
		canvasComponentCatalog,
		type CanvasProviderActions,
	} from "$lib/index.js";
	import { createDocumentDemo } from "./document.js";

	const document = createDocumentDemo();

	let workspace = $state({
		title: "Canvas Document Runtime",
		description:
			"Structured nodes, named slots, bindings, and provider-backed actions rendered through Canvas.",
		statusLabel: "Draft mode",
		statusTone: "rgba(245, 158, 11, 0.18)",
		statusBorder: "rgba(245, 158, 11, 0.45)",
		statusText: "#92400e",
		reviewer: "Reviewer: Eddie Lake",
		revisionCount: "3 revisions",
		note:
			"Use the action buttons below to mutate provider state without changing the document tree.",
	});

	const providerActions: CanvasProviderActions = {
		workspace: {
			"toggle-status": () => {
				const isDraft = workspace.statusLabel === "Draft mode";
				workspace = {
					...workspace,
					statusLabel: isDraft ? "Approved" : "Draft mode",
					statusTone: isDraft
						? "rgba(16, 185, 129, 0.18)"
						: "rgba(245, 158, 11, 0.18)",
					statusBorder: isDraft
						? "rgba(16, 185, 129, 0.45)"
						: "rgba(245, 158, 11, 0.45)",
					statusText: isDraft ? "#065f46" : "#92400e",
					note: isDraft
						? "The provider action updated both tone and supporting copy."
						: "Use the action buttons below to mutate provider state without changing the document tree.",
				};
			},
			"increment-revisions": () => {
				const count = Number.parseInt(workspace.revisionCount, 10) || 0;
				workspace = {
					...workspace,
					revisionCount: `${count + 1} revisions`,
				};
			},
		},
	};
</script>

<div class="document-demo-page">
	<div class="document-demo-header">
		<h1>Canvas Document Demo</h1>
		<p>
			This route renders a `CanvasDocument` using the catalog-backed `Card.*`
			family, structured bindings, and provider-backed actions.
		</p>
	</div>

	<Canvas
		{document}
		componentCatalog={canvasComponentCatalog}
		providerData={{ workspace }}
		{providerActions}
	/>
</div>

<style>
	.document-demo-page {
		min-height: 100%;
		padding: 1.5rem;
		background:
			radial-gradient(circle at top, rgba(148, 163, 184, 0.14), transparent 35%),
			#f8fafc;
	}

	.document-demo-header {
		max-width: 64rem;
		margin: 0 auto 1rem;
	}

	.document-demo-header h1 {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
		line-height: 1.2;
	}

	.document-demo-header p {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.5;
		color: rgba(15, 23, 42, 0.72);
	}
</style>
