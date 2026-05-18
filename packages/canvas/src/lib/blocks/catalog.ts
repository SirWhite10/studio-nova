import type { CanvasComponentCatalog, CanvasNodeKind } from "$lib/base/canvas/types.js";
import Hero1 from "./hero/hero-1.svelte";

const blockKind: CanvasNodeKind = "block";
const allKinds: CanvasNodeKind[] = ["primitive", "component", "block", "widget"];

export const blockComponentCatalog = {
	"Hero.1": {
		type: "Hero.1",
		component: Hero1,
		kind: blockKind,
		category: "hero",
		label: "Hero 1",
		description: "Landing-page hero preset with granular slots for text, actions, media, and overlay content.",
		slots: {
			eyebrow: {
				label: "Eyebrow",
				allowedKinds: allKinds,
				multiple: true,
			},
			title: {
				label: "Title",
				allowedKinds: allKinds,
				multiple: true,
			},
			description: {
				label: "Description",
				allowedKinds: allKinds,
				multiple: true,
			},
			actions: {
				label: "Actions",
				allowedKinds: allKinds,
				multiple: true,
			},
			media: {
				label: "Media",
				allowedKinds: allKinds,
				multiple: true,
			},
			mediaOverlay: {
				label: "Media Overlay",
				allowedKinds: allKinds,
				multiple: true,
			},
		},
		acceptsCanvasRuntime: true,
	},
} satisfies CanvasComponentCatalog;
