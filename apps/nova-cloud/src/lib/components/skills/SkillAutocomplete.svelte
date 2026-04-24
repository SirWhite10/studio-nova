<script lang="ts">
  import * as Command from '$lib/components/ui/command';
  import type { Skill } from '$lib/skills/types';

  interface Props {
    query: string;
    skills: Skill[];
    position: { x: number; y: number };
    onSelect: (skill: Skill) => void;
    onClose: () => void;
  }

  let { query, skills, position, onSelect, onClose }: Props = $props();

  let selectedIndex = $state(0);

  const filteredSkills = $derived.by(() => {
    if (!query) return skills.slice(0, 10);
    const q = query.toLowerCase();
    return skills.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    ).slice(0, 10);
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredSkills.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredSkills[selectedIndex];
      if (selected) {
        onSelect(selected);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  $effect(() => {
    selectedIndex = 0;
  });
</script>

<div
  class="absolute z-50 bg-popover border rounded-md shadow-lg w-72 max-h-60 overflow-hidden"
  style="left: {position.x}px; top: {position.y}px;"
  role="listbox"
  tabindex="0"
  onkeydown={handleKeydown}
>
  <Command.Root>
    <Command.List>
      {#if filteredSkills.length === 0}
        <Command.Empty>No skills found</Command.Empty>
      {:else}
        {#each filteredSkills as skill, i (skill.id)}
          <Command.Item
            value={skill.name}
            class={i === selectedIndex ? 'bg-accent' : ''}
            onclick={() => onSelect(skill)}
          >
            <div class="flex flex-col">
              <span class="font-medium">{skill.name}</span>
              {#if skill.description}
                <span class="text-muted-foreground text-xs truncate">{skill.description}</span>
              {/if}
            </div>
          </Command.Item>
        {/each}
      {/if}
    </Command.List>
  </Command.Root>
</div>
