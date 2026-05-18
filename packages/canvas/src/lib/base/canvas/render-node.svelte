<script lang="ts">
	import { SvelteMap } from "svelte/reactivity";
	import type {
		CanvasActionContext,
		CanvasActionRef,
		CanvasComponentCatalog,
		CanvasNode,
		CanvasProviderActions,
		CanvasProviderData,
		CanvasBinding,
		ComponentRegistryValue,
		RenderComponentFn,
	} from "./types.js";
	import { Text } from "$lib/base/text/index.js";
	import { View } from "$lib/base/view/index.js";
	import CanvasRenderNodes from "./render-nodes.svelte";

	let {
		node,
		path = [],
		componentCatalog = {},
		customComponents = new SvelteMap(),
		providerData = {},
		providerActions = {},
		renderComponent = undefined,
		renderCurrentComponent = true,
	}: {
		node: CanvasNode;
		path?: string[];
		componentCatalog?: CanvasComponentCatalog;
		customComponents?: SvelteMap<string, ComponentRegistryValue>;
		providerData?: CanvasProviderData;
		providerActions?: CanvasProviderActions;
		renderComponent?: RenderComponentFn;
		renderCurrentComponent?: boolean;
	} = $props();

	const builtInComponents = {
		Box: View,
		View,
		Text,
	} satisfies Record<string, ComponentRegistryValue>;

	function resolveBindingValue(
		binding: CanvasBinding,
		sources: CanvasProviderData,
	): unknown {
		let current: unknown = sources[binding.source];

		if (current === undefined) {
			return binding.fallback;
		}

		for (const segment of binding.path ?? []) {
			if (current == null || typeof current !== "object") {
				return binding.fallback;
			}
			current = (current as Record<string, unknown>)[segment];
		}

		return current ?? binding.fallback;
	}

	function invokeAction(
		actionProp: string,
		actionRef: CanvasActionRef,
		args: unknown[],
	) {
		const handler = providerActions[actionRef.source]?.[actionRef.action];
		if (!handler) {
			return undefined;
		}

		const context: CanvasActionContext = {
			node,
			actionProp,
			args,
			providerData,
		};

		return handler(actionRef.payload, context);
	}

	const catalogEntry = $derived(componentCatalog[node.type]);
	const componentClass = $derived(
		catalogEntry?.component
			?? customComponents.get(node.type)
			?? builtInComponents[node.type as keyof typeof builtInComponents],
	);
	const resolvedProps = $derived.by(() => {
		const mergedProps: Record<string, unknown> = { ...node.props };

		for (const [propName, binding] of Object.entries(node.bindings ?? {})) {
			mergedProps[propName] = resolveBindingValue(binding, providerData);
		}

		for (const [propName, actionRef] of Object.entries(node.actions ?? {})) {
			mergedProps[propName] = (...args: unknown[]) =>
				invokeAction(propName, actionRef, args);
		}

		return mergedProps;
	});
	const slotNodes = $derived.by<Record<string, CanvasNode[]>>(() =>
		Object.fromEntries(
			Object.entries(node.slots ?? {}).map(([slotName, slot]) => [
				slotName,
				slot.children,
			]),
		),
	);
</script>

{#if !node || !node.type}
	<div class="canvas-error">Invalid component</div>
{:else if renderComponent && renderCurrentComponent}
	{@render renderComponent(node, path)}
{:else if componentClass}
	{@const ComponentClass = componentClass}
	{#if catalogEntry?.acceptsCanvasRuntime}
		<ComponentClass
			{...resolvedProps}
			nodePath={path}
			nodeSlots={slotNodes}
			componentCatalog={componentCatalog}
			customComponents={customComponents}
			providerData={providerData}
			providerActions={providerActions}
			{renderComponent}
		>
			<CanvasRenderNodes
				nodes={node.children ?? []}
				basePath={path}
				{componentCatalog}
				{customComponents}
				{providerData}
				{providerActions}
				{renderComponent}
			/>
		</ComponentClass>
	{:else}
		<ComponentClass {...resolvedProps}>
			<CanvasRenderNodes
				nodes={node.children ?? []}
				basePath={path}
				{componentCatalog}
				{customComponents}
				{providerData}
				{providerActions}
				{renderComponent}
			/>
		</ComponentClass>
	{/if}
{:else}
	<div class="canvas-error">
		Component type '{node.type}' not found
	</div>
{/if}
