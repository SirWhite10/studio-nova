import type { CanvasComponentCatalog } from "$lib/base/canvas/types.js";
import Image from "./image.svelte";

export const imageComponentCatalog = {
	Image: {
		type: "Image",
		component: Image,
		kind: "primitive",
		category: "media",
		label: "Image",
		description: "Responsive image element for Canvas documents and block media slots.",
		defaultProps: {
			src: "https://placehold.co/800x450/png",
			alt: "",
		},
		editorConfig: {
			fields: {
				src: {
					type: "text",
					label: "Source",
				},
				alt: {
					type: "text",
					label: "Alt text",
				},
				width: {
					type: "number",
					label: "Width",
				},
				height: {
					type: "number",
					label: "Height",
				},
				class: {
					type: "text",
					label: "Class",
				},
			},
		},
	},
} satisfies CanvasComponentCatalog;
