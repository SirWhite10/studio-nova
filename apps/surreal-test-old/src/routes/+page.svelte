<script lang="ts">
	import { getDb } from "$lib/surreal";
	import { Table } from "surrealdb";
	import type { RecordId } from "surrealdb";

	interface Project {
		id: RecordId;
		name: string;
		description: string;
		status: string;
		priority: string;
		tags: string[];
		created_at: Date;
	}

	let projects = $state<Project[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	let name = $state("");
	let description = $state("");
	let status = $state("in_progress");
	let priority = $state("medium");
	let tags = $state("");

	async function fetchProjects() {
		loading = true;
		error = null;
		try {
			const db = await getDb();
			projects = await db.select<Project>(new Table("project"));
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	async function createProject() {
		if (!name.trim()) return;
		error = null;
		try {
			const db = await getDb();
			await db.create(new Table("project")).content({
				name: name.trim(),
				description: description.trim(),
				status,
				priority,
				tags: tags
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean),
				created_at: new Date(),
			});
			name = "";
			description = "";
			tags = "";
			await fetchProjects();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	async function deleteProject(id: RecordId) {
		error = null;
		try {
			const db = await getDb();
			await db.delete(id);
			await fetchProjects();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	async function updateStatus(id: RecordId, newStatus: string) {
		error = null;
		try {
			const db = await getDb();
			await db.update(id).merge({ status: newStatus });
			await fetchProjects();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	async function runCustomQuery() {
		error = null;
		try {
			const db = await getDb();
			const result = await db
				.query<[Project[]]>("SELECT * FROM project WHERE priority = $priority", {
					priority: "high",
				})
				.collect();
			projects = result[0] ?? [];
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}
</script>

<main>
	<h1>SurrealDB Project Manager</h1>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<section>
		<h2>Create Project</h2>
		<form onsubmit={(e) => { e.preventDefault(); createProject(); }}>
			<label>
				Name
				<input bind:value={name} placeholder="Project name" required />
			</label>
			<label>
				Description
				<input bind:value={description} placeholder="Description" />
			</label>
			<label>
				Status
				<select bind:value={status}>
					<option value="in_progress">In Progress</option>
					<option value="completed">Completed</option>
					<option value="paused">Paused</option>
				</select>
			</label>
			<label>
				Priority
				<select bind:value={priority}>
					<option value="low">Low</option>
					<option value="medium">Medium</option>
					<option value="high">High</option>
				</select>
			</label>
			<label>
				Tags (comma-separated)
				<input bind:value={tags} placeholder="e.g. typescript, react" />
			</label>
			<button type="submit">Create</button>
		</form>
	</section>

	<section>
		<h2>Projects</h2>
		<div class="actions">
			<button onclick={fetchProjects} disabled={loading}>
				{loading ? "Loading..." : "Fetch All"}
			</button>
			<button onclick={runCustomQuery}>Query High Priority</button>
		</div>

		{#if projects.length === 0}
			<p>No projects found. Create one or fetch from the database.</p>
		{:else}
			<ul>
				{#each projects as project}
					<li>
						<strong>{project.name}</strong> — {project.description}
						<br />
						<span class="meta">
							Status: {project.status} | Priority: {project.priority} | Tags: {project.tags?.join(", ") ?? "none"}
						</span>
						<div class="item-actions">
							{#if project.status !== "completed"}
								<button onclick={() => updateStatus(project.id, "completed")}>Mark Complete</button>
							{:else}
								<button onclick={() => updateStatus(project.id, "in_progress")}>Reopen</button>
							{/if}
							<button class="danger" onclick={() => deleteProject(project.id)}>Delete</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>

<style>
	main {
		max-width: 700px;
		margin: 2rem auto;
		font-family: system-ui, sans-serif;
	}

	section {
		margin-bottom: 2rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-weight: 500;
	}

	input,
	select {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-weight: normal;
	}

	button {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		background: #2563eb;
		color: white;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.5;
	}

	button.danger {
		background: #dc2626;
	}

	.error {
		padding: 0.75rem;
		background: #fef2f2;
		color: #dc2626;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	ul {
		list-style: none;
		padding: 0;
	}

	li {
		padding: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		margin-bottom: 0.5rem;
	}

	.meta {
		font-size: 0.85rem;
		color: #6b7280;
	}

	.item-actions {
		margin-top: 0.5rem;
		display: flex;
		gap: 0.5rem;
	}
</style>
