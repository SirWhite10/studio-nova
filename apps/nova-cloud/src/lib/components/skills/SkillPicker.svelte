<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Command from '$lib/components/ui/command';
  import { Search } from '@lucide/svelte';

  interface Skill {
    _id: string;
    name: string;
    description?: string;
    content: string;
    enabled?: boolean;
  }

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (skill: Skill) => void;
  }

  let { open, onOpenChange, onSelect }: Props = $props();

  let searchQuery = $state('');
  let skills = $state<Skill[]>([]);
  let loading = $state(false);

  async function loadSkills() {
    loading = true;
    try {
      const res = await fetch('/api/skills?enabled=true');
      if (res.ok) {
        skills = await res.json();
      }
    } catch (e) {
      console.error('Failed to load skills:', e);
      skills = [];
    } finally {
      loading = false;
    }
  }

  const filteredSkills = $derived.by(() => {
    if (!searchQuery) return skills;
    const q = searchQuery.toLowerCase();
    return skills.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
  });

  function handleSelect(skill: Skill) {
    onSelect(skill);
    onOpenChange(false);
    searchQuery = '';
  }

  $effect(() => {
    if (open) {
      loadSkills();
    }
  });
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Content class="max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Select a Skill</Dialog.Title>
    </Dialog.Header>

    <div class="relative">
      <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Command.Root>
        <Command.Input
          placeholder="Search skills..."
          bind:value={searchQuery}
          class="pl-9"
        />
        <Command.List class="max-h-64 overflow-auto">
          {#if loading}
            <Command.Loading>Loading...</Command.Loading>
          {:else if filteredSkills.length === 0}
            <Command.Empty>No skills found</Command.Empty>
          {:else}
            {#each filteredSkills as skill (skill._id)}
              <Command.Item
                value={skill.name}
                onSelect={() => handleSelect(skill)}
              >
                <div class="flex flex-col">
                  <span class="font-medium">{skill.name}</span>
                  {#if skill.description}
                    <span class="text-muted-foreground text-xs truncate">
                      {skill.description}
                    </span>
                  {/if}
                </div>
              </Command.Item>
            {/each}
          {/if}
        </Command.List>
      </Command.Root>
    </div>
  </Dialog.Content>
</Dialog.Root>
