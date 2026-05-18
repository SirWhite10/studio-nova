<script lang="ts">
	import {
		type ColumnPinningState,
		createTable,
		getCoreRowModel,
		getPaginationRowModel,
		type ColumnDef,
		type PaginationState,
		type RowSelectionState,
		type VisibilityState,
	} from "@tanstack/table-core";
	import LayoutColumnsIcon from "@tabler/icons-svelte/icons/layout-columns";
	import ChevronDownIcon from "@tabler/icons-svelte/icons/chevron-down";
	import PlusIcon from "@tabler/icons-svelte/icons/plus";
	import ChevronsLeftIcon from "@tabler/icons-svelte/icons/chevrons-left";
	import ChevronLeftIcon from "@tabler/icons-svelte/icons/chevron-left";
	import ChevronRightIcon from "@tabler/icons-svelte/icons/chevron-right";
	import ChevronsRightIcon from "@tabler/icons-svelte/icons/chevrons-right";
	import GripVerticalIcon from "@tabler/icons-svelte/icons/grip-vertical";
	import DotsHorizontalIcon from "@tabler/icons-svelte/icons/dots";
	import { IsMobile } from "$lib/hooks/is-mobile.svelte.js";
	import { View } from "$lib/base/view/index.js";
	import { Text } from "$lib/base/text/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import { Button } from "$lib/components/view-ui/button/index.js";
	import { Badge } from "$lib/components/view-ui/badge/index.js";
	import * as DropdownMenu from "$lib/components/view-ui/dropdown-menu/index.js";
	import { Label } from "$lib/components/view-ui/label/index.js";
	import * as Select from "$lib/components/view-ui/select/index.js";
	import * as Table from "$lib/components/view-ui/table/index.js";
	import * as Tabs from "$lib/components/view-ui/tabs/index.js";

	type DashboardRow = {
		id: number;
		header: string;
		type: string;
		status: string;
		target: string;
		limit: string;
		reviewer: string;
	};

	let { data = [] }: { data?: DashboardRow[] } = $props();
	const mobileQuery = new IsMobile(1024);
	const isMobile = $derived(mobileQuery.current);
	let viewportWidth = $state(1280);
	const horizontalPadding = $derived(viewportWidth >= 1024 ? 6 : 4);

	const views = [
		{ id: "outline", label: "Outline", badge: 0 },
		{ id: "past-performance", label: "Past Performance", badge: 3 },
		{ id: "key-personnel", label: "Key Personnel", badge: 2 },
		{ id: "focus-documents", label: "Focus Documents", badge: 0 },
	] as const;

	let view = $state("outline");
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let rowSelection = $state<RowSelectionState>({});
	let columnVisibility = $state<VisibilityState>({});
	let columnPinning = $state<ColumnPinningState>({ left: [], right: [] });

	const selectedCount = $derived(Object.values(rowSelection).filter(Boolean).length);
	const totalRowCount = $derived(data.length);
	const viewLabel = $derived(views.find((item) => item.id === view)?.label ?? "Select a view");

	const columns: ColumnDef<DashboardRow>[] = [
		{ id: "drag", header: "", cell: () => null, enableHiding: false },
		{ id: "select", header: "", cell: () => null, enableHiding: false },
		{ accessorKey: "header", header: "Header", enableHiding: false },
		{ accessorKey: "type", header: "Section Type" },
		{ accessorKey: "status", header: "Status" },
		{ accessorKey: "target", header: "Target" },
		{ accessorKey: "limit", header: "Limit" },
		{ accessorKey: "reviewer", header: "Reviewer" },
		{ id: "actions", header: "", cell: () => null, enableHiding: false },
	];

	const table = createTable<DashboardRow>({
		get data() {
			return data;
		},
		columns,
		state: {
			get pagination() {
				return pagination;
			},
			get rowSelection() {
				return rowSelection;
			},
			get columnVisibility() {
				return columnVisibility;
			},
			get columnPinning() {
				return columnPinning;
			},
		},
		getRowId: (row) => row.id.toString(),
		enableRowSelection: true,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onPaginationChange: (updater) => {
			pagination = typeof updater === "function" ? updater(pagination) : updater;
		},
		onRowSelectionChange: (updater) => {
			rowSelection = typeof updater === "function" ? updater(rowSelection) : updater;
		},
		onColumnVisibilityChange: (updater) => {
			columnVisibility = typeof updater === "function" ? updater(columnVisibility) : updater;
		},
		onColumnPinningChange: (updater) => {
			columnPinning = typeof updater === "function" ? updater(columnPinning) : updater;
		},
	});

	function checkboxToggle(value: boolean, onChange: (next: boolean) => void) {
		return () => onChange(!value);
	}

	function badgeVariant(type: string) {
		return type === "Narrative" ? "secondary" : "outline";
	}

	function statusTone(status: string) {
		return status === "Done" ? "#067647" : "#b54708";
	}

	function checkboxAppearance(checked: boolean) {
		return checked
			? `appearance: none; width: 1rem; height: 1rem; border-radius: 0.25rem; border: 1px solid color-mix(in srgb, ${canvasTheme.colors.foreground} 18%, transparent); background: ${canvasTheme.colors.foreground}; box-shadow: inset 0 0 0 2px white; cursor: pointer;`
			: `appearance: none; width: 1rem; height: 1rem; border-radius: 0.25rem; border: 1px solid color-mix(in srgb, ${canvasTheme.colors.foreground} 18%, transparent); background: white; cursor: pointer;`;
	}

	const placeholderHeight = "18rem";
</script>

<svelte:window bind:innerWidth={viewportWidth} />

<Tabs.Root bind:value={view} style="display: flex; flex-direction: column; gap: 1.5rem;">
	<View
		display="flex"
		alignItems="center"
		justifyContent="space-between"
		gap={3}
		paddingLeft={horizontalPadding}
		paddingRight={horizontalPadding}
	>
			<View display="flex" alignItems="center" gap={2}>
				<Label for="view-selector" style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0);">
					View
				</Label>
				{#if isMobile}
					<Select.Root type="single" bind:value={view}>
						<Select.Trigger id="view-selector" size="sm" style="width: fit-content; min-width: 8rem;">
							{viewLabel}
						</Select.Trigger>
						<Select.Content>
							{#each views as item (item.id)}
								<Select.Item value={item.id}>{item.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{:else}
					<Tabs.List variant="line">
						{#each views as item (item.id)}
						<Tabs.Trigger value={item.id}>
							{item.label}
							{#if item.badge > 0}
								<Badge variant="secondary">{item.badge}</Badge>
							{/if}
						</Tabs.Trigger>
					{/each}
				</Tabs.List>
			{/if}
		</View>
		<View display="flex" alignItems="center" gap={2}>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button variant="outline" size="sm" {...props}>
							<LayoutColumnsIcon size={16} />
							<Text size="sm">{isMobile ? "Columns" : "Customize Columns"}</Text>
							<ChevronDownIcon size={16} />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" style="width: 14rem;">
					{#each table.getAllColumns().filter((column) => column.getCanHide()) as column (column.id)}
						<DropdownMenu.CheckboxItem
							checked={column.getIsVisible()}
							onCheckedChange={(value) => column.toggleVisibility(!!value)}
						>
							{column.id}
						</DropdownMenu.CheckboxItem>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<Button variant="outline" size="sm">
				<PlusIcon size={16} />
				<Text size="sm">{isMobile ? "Add" : "Add Section"}</Text>
			</Button>
		</View>
	</View>

	<Tabs.Content value="outline">
		<View
			display="flex"
			flexDirection="column"
			gap={4}
			paddingLeft={horizontalPadding}
			paddingRight={horizontalPadding}
		>
			<View overflow="hidden" border={`1px solid color-mix(in srgb, ${canvasTheme.colors.foreground} 10%, transparent)`} borderRadius={canvasTheme.radius.lg}>
				<Table.Root>
					<Table.Header style={`background: ${canvasTheme.colors.muted};`}>
						{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
							<Table.Row>
								{#each headerGroup.headers as header (header.id)}
									<Table.Head colspan={header.colSpan}>
									{#if !header.isPlaceholder}
										{#if header.column.id === "select"}
											<View
												as="input"
												type="checkbox"
												checked={table.getIsAllPageRowsSelected()}
												aria-label="Select all"
												onchange={(event: Event) =>
													table.toggleAllPageRowsSelected(
														(event.currentTarget as HTMLInputElement).checked,
													)}
												style={checkboxAppearance(table.getIsAllPageRowsSelected())}
											/>
										{:else if header.column.id === "drag" || header.column.id === "actions"}
										{:else}
											{typeof header.column.columnDef.header === "string" ? header.column.columnDef.header : ""}
										{/if}
										{/if}
									</Table.Head>
								{/each}
							</Table.Row>
						{/each}
					</Table.Header>
					<Table.Body>
						{#if table.getRowModel().rows.length}
							{#each table.getRowModel().rows as row (row.id)}
								<Table.Row data-state={row.getIsSelected() ? "selected" : undefined}>
									{#each row.getVisibleCells() as cell (cell.id)}
										<Table.Cell>
										{#if cell.column.id === "drag"}
											<Button variant="ghost" size="icon-sm" aria-label="Drag to reorder">
												<GripVerticalIcon size={16} />
											</Button>
										{:else if cell.column.id === "select"}
											<View
												as="input"
												type="checkbox"
												checked={row.getIsSelected()}
												aria-label="Select row"
												onchange={(event: Event) =>
													row.toggleSelected((event.currentTarget as HTMLInputElement).checked)}
												style={checkboxAppearance(row.getIsSelected())}
											/>
										{:else if cell.column.id === "header"}
											<Button variant="ghost" size="sm" style="padding-inline: 0; min-height: auto; justify-content: flex-start;">
												<Text size="sm" weight="normal">{row.original.header}</Text>
											</Button>
										{:else if cell.column.id === "type"}
											<Badge variant={badgeVariant(row.original.type)}>{row.original.type}</Badge>
										{:else if cell.column.id === "status"}
											<Badge variant="outline">
												<View as="span" width="0.5rem" height="0.5rem" borderRadius="999px" background={statusTone(row.original.status)} />
												<Text size="sm">{row.original.status}</Text>
											</Badge>
										{:else if cell.column.id === "target"}
											<Text size="sm">{row.original.target}</Text>
										{:else if cell.column.id === "limit"}
											<Text size="sm">{row.original.limit}</Text>
										{:else if cell.column.id === "reviewer"}
											{#if row.original.reviewer === "Reviewer" || row.original.reviewer === "Assign reviewer"}
												<Button variant="outline" size="sm" style="justify-content: flex-start; min-width: 6.5rem;">
													<Text size="sm">{row.original.reviewer}</Text>
												</Button>
											{:else}
												<Text size="sm">{row.original.reviewer}</Text>
											{/if}
										{:else if cell.column.id === "actions"}
											<DropdownMenu.Root>
												<DropdownMenu.Trigger>
													{#snippet child({ props })}
														<Button variant="ghost" size="icon-sm" {...props} aria-label="Open menu">
															<DotsHorizontalIcon size={16} />
														</Button>
													{/snippet}
												</DropdownMenu.Trigger>
													<DropdownMenu.Content align="end">
														<DropdownMenu.Item>Edit</DropdownMenu.Item>
														<DropdownMenu.Item>Duplicate</DropdownMenu.Item>
														<DropdownMenu.Separator />
														<DropdownMenu.Item variant="destructive">Delete</DropdownMenu.Item>
													</DropdownMenu.Content>
												</DropdownMenu.Root>
											{:else}
												<Text size="sm">{cell.getValue() as string}</Text>
											{/if}
										</Table.Cell>
									{/each}
								</Table.Row>
							{/each}
						{:else}
							<Table.Row>
								<Table.Cell colspan={columns.length} style="height: 6rem; text-align: center;">
									No results.
								</Table.Cell>
							</Table.Row>
						{/if}
					</Table.Body>
				</Table.Root>
			</View>

			<View display="flex" alignItems="center" justifyContent="space-between" gap={4} paddingInline={4}>
				{#if !isMobile}
					<Text size="sm" color={canvasTheme.colors.mutedForeground}>
						{selectedCount} of {totalRowCount} row(s) selected.
					</Text>
				{/if}
				<View display="flex" alignItems="center" gap={isMobile ? 3 : 8} style={isMobile ? "width: 100%; justify-content: space-between;" : ""}>
					{#if !isMobile}
						<View display="flex" alignItems="center" gap={2}>
						<Label for="rows-per-page">Rows per page</Label>
						<Select.Root
							type="single"
							value={`${table.getState().pagination.pageSize}`}
							onValueChange={(value) => table.setPageSize(Number(value))}
						>
							<Select.Trigger id="rows-per-page" size="sm" style="width: 5rem;">
								{table.getState().pagination.pageSize}
							</Select.Trigger>
							<Select.Content side="top">
								{#each [10, 20, 30, 40, 50] as pageSize (pageSize)}
									<Select.Item value={pageSize.toString()}>{pageSize}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						</View>
					{/if}
					<Text size="sm" weight="medium">
						Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
					</Text>
					<View display="flex" alignItems="center" gap={2}>
						{#if !isMobile}
							<Button
								variant="outline"
								size="icon"
								onclick={() => table.setPageIndex(0)}
								disabled={!table.getCanPreviousPage()}
								aria-label="Go to first page"
							>
								<ChevronsLeftIcon size={16} />
							</Button>
						{/if}
						<Button
							variant="outline"
							size="icon"
							onclick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
							aria-label="Go to previous page"
						>
							<ChevronLeftIcon size={16} />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onclick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
							aria-label="Go to next page"
						>
							<ChevronRightIcon size={16} />
						</Button>
						{#if !isMobile}
							<Button
								variant="outline"
								size="icon"
								onclick={() => table.setPageIndex(table.getPageCount() - 1)}
								disabled={!table.getCanNextPage()}
								aria-label="Go to last page"
							>
								<ChevronsRightIcon size={16} />
							</Button>
						{/if}
					</View>
				</View>
			</View>
		</View>
	</Tabs.Content>

	{#each views.filter((item) => item.id !== "outline") as item (item.id)}
		<Tabs.Content value={item.id}>
			<View paddingLeft={4} paddingRight={4}>
				<View
					border={`1px dashed color-mix(in srgb, ${canvasTheme.colors.foreground} 18%, transparent)`}
					borderRadius={canvasTheme.radius.lg}
					width="100%"
					style={`aspect-ratio: 16 / 9; min-height: ${placeholderHeight};`}
				/>
			</View>
		</Tabs.Content>
	{/each}
</Tabs.Root>
