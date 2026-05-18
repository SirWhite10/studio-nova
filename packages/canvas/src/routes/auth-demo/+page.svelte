<script lang="ts">
	import { Canvas, canvasComponentCatalog, type CanvasProviderActions } from "$lib/index.js";
	import { authDocument } from "./document.js";

	let authState = $state({
		title: "Login to your account",
		description: "Enter your email below to login to your account",
		submissions: 0,
	});

	const providerActions: CanvasProviderActions = {
		auth: {
			submit: (_payload, context) => {
				const event = context.args[0] as SubmitEvent | undefined;
				event?.preventDefault();
				authState = {
					...authState,
					submissions: authState.submissions + 1,
					description: `Submitted ${authState.submissions + 1} time${authState.submissions === 0 ? "" : "s"}.`,
				};
			},
		},
	};
</script>

<Canvas
	document={authDocument}
	componentCatalog={canvasComponentCatalog}
	providerData={{ auth: authState }}
	{providerActions}
/>
