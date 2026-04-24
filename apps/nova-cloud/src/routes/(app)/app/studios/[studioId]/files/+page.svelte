<script lang="ts">
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import FileIcon from '@lucide/svelte/icons/file';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
	import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { useFileUploadManager } from '$lib/files/upload-manager.svelte';
	import { toast } from 'svelte-sonner';

	let { data }: { data: any } = $props();

	type FileEntry = {
		key: string;
		name: string;
		size: number;
		lastModified: string;
		isFolder: boolean;
	};

	const fileUploadManager = useFileUploadManager();

	let files = $state<FileEntry[]>([]);
	let isLoading = $state(true);
	let currentPath = $state('');
	let dragOver = $state(false);
	let showCreateFolder = $state(false);
	let createFolderName = $state('');
	let isCreatingFolder = $state(false);
	let fileInput: HTMLInputElement | undefined = $state();
	let refreshTokensByTarget = new Map<string, number>();

	const pathParts = $derived(
		currentPath
			? currentPath.split('/').filter(Boolean)
			: [],
	);

	const breadcrumbs = $derived([
		{ name: 'root', path: '' },
		...pathParts.map((part, i) => ({
			name: part,
			path: pathParts.slice(0, i + 1).join('/') + '/',
		})),
	]);

	const sortedFiles = $derived(
		[...files].sort((a, b) => {
			if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
			return a.name.localeCompare(b.name);
		}),
	);

	const totalSize = $derived(
		files.reduce((sum, f) => sum + (f.isFolder ? 0 : f.size), 0),
	);
	const currentUploadRefreshToken = $derived(
		fileUploadManager.getRefreshToken(data.studioId, currentPath),
	);
	const createFolderError = $derived(validateFolderName(createFolderName));

	function formatSize(bytes: number) {
		if (bytes === 0) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
	}

	function formatDate(iso: string) {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function normalizePath(path = '') {
		return path.replace(/^\/+|\/+$/g, '');
	}

	function refreshTargetKey(studioId: string, path = '') {
		return `${studioId}:${normalizePath(path)}`;
	}

	function validateFolderName(name: string) {
		const trimmed = name.trim();
		if (!trimmed) return 'Folder name is required';
		if (trimmed === '.' || trimmed === '..') return 'Invalid folder name';
		if (trimmed === '.nova-folder') return 'That folder name is reserved';
		if (trimmed.includes('/')) return "Folder name can't contain /";
		const nameTaken = files.some((file) => file.name === trimmed);
		if (nameTaken) return 'A file or folder with that name already exists here';
		return null;
	}

	async function loadFiles(path?: string) {
		isLoading = true;
		try {
			const params = new URLSearchParams();
			if (path) params.set('path', path);
			const res = await fetch(`/api/studios/${data.studioId}/files?${params}`);
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to load files');
			}
			const payload = await res.json();
			files = payload.files ?? [];
			currentPath = path ?? '';
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to load files');
			files = [];
		} finally {
			isLoading = false;
		}
	}

	async function navigateToFolder(folderKey: string) {
		await loadFiles(folderKey);
	}

	function navigateToBreadcrumb(path: string) {
		loadFiles(path || undefined);
	}

	async function handleUpload(fileList: FileList | null) {
		if (!fileList || fileList.length === 0) return;
		fileUploadManager.startUploadBatch({
			studioId: data.studioId,
			path: currentPath,
			files: Array.from(fileList),
		});
		if (fileInput) fileInput.value = '';
	}

	async function handleCreateFolder() {
		const folderName = createFolderName.trim();
		const errorMessage = validateFolderName(folderName);
		if (errorMessage) {
			toast.error(errorMessage);
			return;
		}

		isCreatingFolder = true;
		try {
			const res = await fetch(`/api/studios/${data.studioId}/files`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ folderName, path: currentPath }),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to create folder');
			}

			createFolderName = '';
			showCreateFolder = false;
			toast.success(`Created folder "${folderName}"`);
			await loadFiles(currentPath || undefined);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create folder');
		} finally {
			isCreatingFolder = false;
		}
	}

	async function handleDelete(filePath: string, isFolder: boolean) {
		try {
			const res = await fetch(`/api/studios/${data.studioId}/files`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path: filePath, isFolder }),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to delete');
			}

			const payload = await res.json().catch(() => ({}));
			if (isFolder) {
				const deletedFiles = typeof payload.deletedFiles === 'number' ? payload.deletedFiles : 0;
				toast.success(
					deletedFiles > 0
						? `Folder deleted with ${deletedFiles} file${deletedFiles === 1 ? '' : 's'}`
						: 'Empty folder deleted',
				);
			} else {
				toast.success('File deleted');
			}
			await loadFiles(currentPath || undefined);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : `${isFolder ? 'Folder' : 'File'} delete failed`);
		}
	}

	function handleDownload(filePath: string) {
		const params = new URLSearchParams({ download: filePath });
		window.open(`/api/studios/${data.studioId}/files?${params}`, '_blank');
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		if (e.dataTransfer?.files) {
			handleUpload(e.dataTransfer.files);
		}
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function onDragLeave() {
		dragOver = false;
	}

	$effect(() => {
		loadFiles();
	});

	$effect(() => {
		const token = currentUploadRefreshToken;
		const key = refreshTargetKey(data.studioId, currentPath);
		const seenToken = refreshTokensByTarget.get(key) ?? 0;
		if (!token || token <= seenToken) return;
		refreshTokensByTarget.set(key, token);
		void loadFiles(currentPath || undefined);
	});
</script>

<div class="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),transparent_26%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.12),transparent_26%)] px-6 py-8 sm:px-10">
	<div class="mx-auto max-w-5xl space-y-6">
		<section class="rounded-[2rem] border border-border/70 bg-background/85 p-8 shadow-sm backdrop-blur">
			<div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
				<div class="space-y-3">
					<div class="flex flex-wrap items-center gap-2">
						<Badge class="rounded-full bg-muted px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Storage</Badge>
						<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">{files.length} items</Badge>
						<Badge variant="outline" class="rounded-full text-[11px] uppercase tracking-[0.18em]">{formatSize(totalSize)}</Badge>
					</div>
					<h1 class="text-3xl font-semibold tracking-tight sm:text-5xl">{data.studio?.name ?? 'Studio'} files</h1>
					<p class="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
						Persistent file storage for this Studio. Files are stored in R2 and survive sandbox expiration. Drop files anywhere to upload.
					</p>
				</div>

				<div class="flex flex-wrap gap-3">
					<Button variant="outline" class="rounded-full px-5" onclick={() => fileInput?.click()}>
						<UploadIcon class="size-4" />
						Upload
					</Button>
					<Button
						variant="outline"
						class="rounded-full px-5"
						onclick={() => {
							showCreateFolder = !showCreateFolder;
							if (!showCreateFolder) createFolderName = '';
						}}
						disabled={isCreatingFolder}
					>
						<FolderPlusIcon class="size-4" />
						{showCreateFolder ? 'Cancel Folder' : 'New Folder'}
					</Button>
					<Button class="rounded-full px-5" onclick={() => loadFiles(currentPath || undefined)}>
						Refresh
					</Button>
				</div>
			</div>

			{#if showCreateFolder}
				<form
					class="mt-6 flex flex-col gap-3 rounded-[1.5rem] border border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-start"
					onsubmit={(event) => {
						event.preventDefault();
						void handleCreateFolder();
					}}
				>
					<div class="min-w-0 flex-1 space-y-2">
						<Input
							bind:value={createFolderName}
							placeholder="Folder name"
							autocomplete="off"
							maxlength={120}
							disabled={isCreatingFolder}
						/>
						{#if createFolderError}
							<p class="text-xs text-destructive">{createFolderError}</p>
						{:else}
							<p class="text-xs text-muted-foreground">
								Create a folder in {currentPath ? currentPath : 'the Studio root'}.
							</p>
						{/if}
					</div>
					<div class="flex gap-2">
						<Button type="submit" class="rounded-full px-5" disabled={!!createFolderError || isCreatingFolder}>
							{isCreatingFolder ? 'Creating...' : 'Create'}
						</Button>
						<Button
							type="button"
							variant="ghost"
							class="rounded-full px-4"
							onclick={() => {
								showCreateFolder = false;
								createFolderName = '';
							}}
							disabled={isCreatingFolder}
						>
							Close
						</Button>
					</div>
				</form>
			{/if}

			<input
				type="file"
				class="hidden"
				multiple
				bind:this={fileInput}
				onchange={(e) => handleUpload((e.target as HTMLInputElement).files)}
			/>
		</section>

		<section
			class="rounded-[2rem] border border-border/70 bg-background/85 shadow-sm backdrop-blur"
			ondrop={onDrop}
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			class:ring-2={dragOver}
			class:ring-primary={dragOver}
		>
			<nav class="flex items-center gap-1.5 overflow-x-auto border-b border-border/60 px-6 py-3">
				{#each breadcrumbs as crumb, i}
					{#if i > 0}
						<ChevronRightIcon class="size-3.5 shrink-0 text-muted-foreground" />
					{/if}
					<button
						class="shrink-0 rounded-full px-2.5 py-1 text-sm font-medium transition-colors hover:bg-muted {i === breadcrumbs.length - 1 ? 'text-foreground' : 'text-muted-foreground'}"
						onclick={() => navigateToBreadcrumb(crumb.path)}
					>
						{crumb.name === 'root' ? (data.studio?.name ?? 'Studio') : crumb.name}
					</button>
				{/each}
			</nav>

			{#if dragOver}
				<div class="flex min-h-[200px] items-center justify-center rounded-b-[2rem] border-2 border-dashed border-primary/50 bg-primary/5 px-6 py-12 text-center">
					<div>
						<UploadIcon class="mx-auto size-10 text-primary/60" />
						<p class="mt-3 text-sm font-medium text-foreground">Drop files here to upload</p>
					</div>
				</div>
			{:else if isLoading}
				<div class="flex min-h-[200px] items-center justify-center px-6 py-12">
					<div class="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground"></div>
				</div>
			{:else if sortedFiles.length === 0}
				<div class="flex min-h-[200px] items-center justify-center rounded-b-[2rem] px-6 py-12 text-center">
					<div>
						<FolderOpenIcon class="mx-auto size-10 text-muted-foreground/40" />
						<p class="mt-3 text-sm font-medium text-muted-foreground">
							{currentPath ? 'This folder is empty.' : 'No files yet. Upload files to get started.'}
						</p>
						<p class="mt-1 text-xs text-muted-foreground/60">
							Drag and drop files anywhere on this page, or use the Upload button.
						</p>
					</div>
				</div>
			{:else}
				<div class="divide-y divide-border/40">
					{#each sortedFiles as file (file.key)}
						<div class="group flex items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/30">
							<button
								class="flex min-w-0 flex-1 items-center gap-3 text-left"
								onclick={() => file.isFolder ? navigateToFolder(file.key) : undefined}
								disabled={!file.isFolder}
							>
								{#if file.isFolder}
									<div class="rounded-xl bg-amber-500/10 p-2 text-amber-700">
										<FolderIcon class="size-4" />
									</div>
								{:else}
									<div class="rounded-xl bg-muted p-2 text-muted-foreground">
										<FileIcon class="size-4" />
									</div>
								{/if}

								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium">{file.name}</p>
									{#if !file.isFolder}
										<p class="text-xs text-muted-foreground">{formatSize(file.size)}{file.lastModified ? ` · ${formatDate(file.lastModified)}` : ''}</p>
									{/if}
								</div>
							</button>

							{#if !file.isFolder}
								<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
									<Button variant="ghost" size="sm" class="size-8 rounded-full p-0" onclick={() => handleDownload(file.key)}>
										<DownloadIcon class="size-3.5" />
									</Button>
									<Button variant="ghost" size="sm" class="size-8 rounded-full p-0 text-destructive hover:text-destructive" onclick={() => handleDelete(file.key, false)}>
										<Trash2Icon class="size-3.5" />
									</Button>
								</div>
							{:else}
								<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
									<Button variant="ghost" size="sm" class="size-8 rounded-full p-0 text-destructive hover:text-destructive" onclick={() => handleDelete(file.key, true)}>
										<Trash2Icon class="size-3.5" />
									</Button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<section class="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
			<div class="mb-4 flex items-center gap-3">
				<div class="rounded-2xl bg-sky-500/10 p-3 text-sky-700">
					<FolderIcon class="size-5" />
				</div>
				<div>
					<p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Storage</p>
					<h2 class="text-lg font-semibold">How file persistence works</h2>
				</div>
			</div>
			<div class="grid gap-4 md:grid-cols-3 text-sm leading-7 text-muted-foreground">
				<p>Files uploaded here are stored in Cloudflare R2 under a unique prefix for this Studio, providing permanent storage.</p>
				<p>When the runtime is active, the sandbox mounts this same prefix at <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/home/user/workspace</code> so the agent can read and write files.</p>
				<p>Even after a sandbox expires, your files persist. Starting a new runtime automatically re-mounts the same storage.</p>
			</div>
		</section>
	</div>
</div>
