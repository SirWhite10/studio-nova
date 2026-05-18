<script lang="ts">
	import { CanvasApp, canvasComponentCatalog, type CanvasProviderActions } from "$lib/index.js";
	import { formDocument } from "./document.js";

	let formState = $state({
		message: "Ready to publish.",
		submits: 0,
		cancels: 0,
	});

	const providerActions: CanvasProviderActions = {
		form: {
			submit: (_payload, context) => {
				const event = context.args[0] as SubmitEvent | undefined;
				event?.preventDefault();
				formState = {
					...formState,
					submits: formState.submits + 1,
					message: `Published ${formState.submits + 1} time${formState.submits === 0 ? "" : "s"}.`,
				};
			},
			cancel: () => {
				formState = {
					...formState,
					cancels: formState.cancels + 1,
					message: `Discarded ${formState.cancels + 1} time${formState.cancels === 0 ? "" : "s"}.`,
				};
			},
		},
	};
</script>

<CanvasApp
	document={formDocument}
	componentCatalog={canvasComponentCatalog}
	providerData={{ form: formState }}
	{providerActions}
/>
