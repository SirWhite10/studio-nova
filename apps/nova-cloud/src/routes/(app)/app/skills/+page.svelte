<script lang="ts">
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Card } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import {
    Plus,
    Pencil,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Eye,
  } from "@lucide/svelte";

  let skills: any[] = $state([]);
  let isLoading = $state(true);
  let createOpen = $state(false);
  let editOpen = $state<{ skill: any } | null>(null);
  let deleteOpen = $state(false);
  let deleteSkillId = $state<string | null>(null);
  let formData = $state({ name: "", description: "", content: "" });

  async function refreshSkills() {
    isLoading = true;
    try {
      const res = await fetch("/api/skills");
      if (res.ok) {
        skills = await res.json();
      } else {
        console.error("Failed to fetch skills:", res.status, res.statusText);
        skills = [];
      }
    } catch (error) {
      console.error("Failed to fetch skills:", error);
      skills = [];
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    refreshSkills();
  });

  async function handleSubmit() {
    try {
      if (editOpen?.skill) {
        await fetch(`/api/skills/${editOpen.skill.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: formData.content }),
        });
      } else {
        await fetch("/api/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            content: formData.content,
          }),
        });
      }
      createOpen = false;
      editOpen = null;
      formData = { name: "", description: "", content: "" };
      await refreshSkills();
    } catch (error: any) {
      alert(error.message || "Failed to save skill");
    }
  }

  function openCreate() {
    editOpen = null;
    formData = { name: "", description: "", content: "" };
    createOpen = true;
  }

  function openView(skill: any) {
    editOpen = { skill };
    formData = {
      name: skill.name,
      description: skill.description || "",
      content: skill.content,
    };
    createOpen = true;
  }

  function openEdit(skill: any) {
    editOpen = { skill };
    formData = {
      name: skill.name,
      description: skill.description || "",
      content: skill.content,
    };
    createOpen = true;
  }

  async function toggleSkill(id: string, currentEnabled: boolean) {
    try {
      await fetch(`/api/skills/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      await refreshSkills();
    } catch (error) {
      alert("Failed to toggle skill");
    }
  }

  async function confirmDelete(id: string) {
    deleteSkillId = id;
    deleteOpen = true;
  }

  async function executeDelete() {
    if (deleteSkillId) {
      try {
        await fetch(`/api/skills/${deleteSkillId}`, { method: "DELETE" });
        await refreshSkills();
      } catch (error) {
        alert("Failed to delete skill");
      }
      deleteSkillId = null;
      deleteOpen = false;
    }
  }

  function cancelDelete() {
    deleteSkillId = null;
    deleteOpen = false;
  }

  function truncateContent(content: string, maxLength = 150): string {
    return content.length > maxLength
      ? content.substring(0, maxLength) + "..."
      : content;
  }
</script>

<div class="container mx-auto p-6">
  <div class="flex justify-between items-center mb-6">
    <div>
      <h1 class="text-3xl font-bold">Skills</h1>
      <p class="text-muted-foreground mt-1">
        Create and manage AI skills. Skills are automatically used in chat when
        relevant.
      </p>
    </div>
    <Dialog.Root>
      <Dialog.Trigger
        type="button"
        class={buttonVariants({ variant: "default" })}
      >
        <Plus class="w-4 h-4 mr-2" /> Create Skill
      </Dialog.Trigger>
    </Dialog.Root>
  </div>

  {#if isLoading}
    <div class="text-center py-12">
      <p class="text-muted-foreground">Loading skills...</p>
    </div>
  {:else if skills.length === 0}
    <Card class="p-12 text-center">
      <div class="flex flex-col items-center gap-4">
        <div class="p-4 bg-muted rounded-full">
          <Plus class="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h3 class="font-semibold text-lg">No skills created yet</h3>
          <p class="text-muted-foreground mt-1">
            Create your first skill to customize Nova's behavior.
          </p>
        </div>
        <Dialog.Root>
          <Dialog.Trigger
            type="button"
            class={buttonVariants({ variant: "default" })}
          >
            Create Skill
          </Dialog.Trigger>
        </Dialog.Root>
      </div></Card
    >
  {:else}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each skills as skill (skill.id)}
        <Card class="p-4 flex flex-col gap-3" data-skill-id={skill.id}>
          <div class="flex justify-between items-start gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-semibold truncate">{skill.name}</h3>
                {#if skill.source && skill.source !== "json"}
                  <span
                    class="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                  >
                    {skill.source}
                  </span>
                {/if}
              </div>
              {#if skill.description}
                <p class="text-sm text-muted-foreground line-clamp-1">
                  {skill.description}
                </p>
              {/if}
            </div>
            <button
              class="flex-shrink-0"
              onclick={() => toggleSkill(skill.id, skill.enabled)}
              title={skill.enabled ? "Disable skill" : "Enable skill"}
            >
              {#if skill.enabled}
                <ToggleRight class="w-5 h-5 text-primary" />
              {:else}
                <ToggleLeft class="w-5 h-5 text-muted-foreground" />
              {/if}
            </button>
          </div>

          <div
            class="text-sm text-muted-foreground bg-muted/50 rounded p-3 font-mono line-clamp-4"
          >
            {truncateContent(skill.content)}
          </div>

          <div class="flex gap-2 mt-auto pt-2 border-t">
            {#if skill.readonly}
              <Button
                variant="outline"
                size="sm"
                class="flex-1"
                onclick={() => openView(skill)}
              >
                <Eye class="w-3 h-3 mr-2" /> View
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled
                title="Cannot delete readonly skill"
              >
                <Trash2 class="w-3 h-3" />
              </Button>
            {:else}
              <Button
                variant="outline"
                size="sm"
                class="flex-1"
                onclick={() => openEdit(skill)}
              >
                <Pencil class="w-3 h-3 mr-2" /> Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onclick={() => confirmDelete(skill.id)}
              >
                <Trash2 class="w-3 h-3" />
              </Button>
            {/if}
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>

  <Dialog.Root bind:open={createOpen}>
    <Dialog.Content class="sm:max-w-2xl">
      <form onsubmit={handleSubmit} class="space-y-4">
        <Dialog.Header>
          <Dialog.Title>
            {editOpen?.skill
              ? editOpen.skill.readonly
                ? "View Skill"
                : "Edit Skill"
              : "Create New Skill"}
          </Dialog.Title>
          <Dialog.Description>
            {editOpen?.skill
              ? editOpen.skill.readonly
                ? "Viewing read-only skill from filesystem."
                : "Update the skill content below."
              : "Create a new skill to extend Nova's capabilities."}
          </Dialog.Description>
        </Dialog.Header>

        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label for="skill-name">Name</Label>
            <Input
              id="skill-name"
              bind:value={formData.name}
              placeholder="e.g., Code Reviewer"
              disabled={!!editOpen?.skill}
            />
            {#if editOpen?.skill}
              <p class="text-xs text-muted-foreground">
                {#if editOpen.skill.readonly}
                  Read-only skill: name cannot be changed
                {:else}
                  Name cannot be changed after creation
                {/if}
              </p>
            {/if}
          </div>

          <div class="grid gap-2">
            <Label for="skill-description">Description (optional)</Label>
            <Input
              id="skill-description"
              bind:value={formData.description}
              placeholder="Brief description of what this skill does"
              disabled={!!editOpen?.skill?.readonly}
            />
          </div>

          <div class="grid gap-2">
            <Label for="skill-content">Content (Markdown)</Label>
            <Textarea
              id="skill-content"
              bind:value={formData.content}
              placeholder={`---
name: My Skill
description: Optional description
---
Skill instructions in markdown...`}
              class="h-64 font-mono text-sm"
              disabled={!!editOpen?.skill?.readonly}
            />
            <p class="text-xs text-muted-foreground">
              Start with YAML frontmatter (name and description), then add
              instructions.
            </p>
          </div>
        </div>

        <Dialog.Footer>
          <Dialog.Close
            type="button"
            class={buttonVariants({ variant: "outline" })}
          >
            Close
          </Dialog.Close>
          {#if !editOpen?.skill?.readonly}
            <Button type="submit">
              {editOpen?.skill ? "Save Changes" : "Create Skill"}
            </Button>
          {/if}
        </Dialog.Footer>
      </form>
    </Dialog.Content>
  </Dialog.Root>

<Dialog.Root bind:open={deleteOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Delete Skill?</Dialog.Title>
      <Dialog.Description>
        This action cannot be undone. The skill will be permanently removed.
      </Dialog.Description>
    </Dialog.Header>
    <div class="py-4">
      <p class="text-sm text-muted-foreground">
        Are you sure you want to delete this skill? This action cannot be
        undone.
      </p>
    </div>
    <Dialog.Footer>
      <Dialog.Close
        type="button"
        class={buttonVariants({ variant: "outline" })}
      >
        Cancel
      </Dialog.Close>
      <Button variant="destructive" onclick={executeDelete}>Delete</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
