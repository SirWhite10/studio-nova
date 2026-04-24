# Skills Chat Integration

**Goal**: Add slash commands, autocomplete, and explicit skill invocation to the chat interface.

---

## Overview

Users should be able to:

1. Type `/` in chat input to see available skills
2. Select a skill from autocomplete dropdown
3. Force-include a specific skill via `/skill-name` command
4. Browse and select skills via a skill picker UI

---

## Current State

- Skills are **automatically** injected based on semantic search (top 3)
- No way for users to **explicitly** invoke a skill
- No autocomplete or command system in chat input
- Chat input is in `src/routes/chat-next/[id]/+page.svelte` using `PromptInput` component

---

## Architecture

### Component Structure

```
src/lib/components/skills/
├── SkillAutocomplete.svelte    # Dropdown for / commands
└── SkillPicker.svelte          # Modal for browsing skills

src/lib/components/prompt-kit/prompt-input/
├── PromptInputTextarea.svelte  # Modified to trigger autocomplete
└── prompt-input-context.svelte.ts
```

### Data Flow

```
User types "/"
    ↓
PromptInputTextarea detects trigger
    ↓
Fetches skills from GET /api/skills
    ↓
Shows SkillAutocomplete dropdown
    ↓
User selects skill
    ↓
Input becomes "/skill-name "
    ↓
User sends message
    ↓
Agent parses "/skill-name"
    ↓
Forces that skill into system prompt
```

---

## Implementation Phases

### Phase 1: SkillAutocomplete Component

**File**: `src/lib/components/skills/SkillAutocomplete.svelte`

A dropdown component that:

- Receives `query` string (text after `/`)
- Receives `skills` array (fetched from API)
- Filters skills by query
- Emits `select` event with selected skill

```svelte
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

  const filteredSkills = $derived(
    skills.filter(s =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.description?.toLowerCase().includes(query.toLowerCase())
    )
  );

  const selectedIndex = $state(0);
</script>

<div
  class="absolute z-50 bg-popover border rounded-md shadow-lg"
  style="left: {position.x}px; top: {position.y}px;"
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
            <span class="font-medium">{skill.name}</span>
            {#if skill.description}
              <span class="text-muted-foreground text-sm">{skill.description}</span>
            {/if}
          </Command.Item>
        {/each}
      {/if}
    </Command.List>
  </Command.Root>
</div>
```

### Phase 2: Chat Input Integration

**File**: `src/lib/components/prompt-kit/prompt-input/PromptInputTextarea.svelte`

Modifications:

1. Track cursor position
2. Detect `/` at start of line
3. Show/hide autocomplete dropdown
4. Handle keyboard navigation

```svelte
<script lang="ts">
  import SkillAutocomplete from '$lib/components/skills/SkillAutocomplete.svelte';
  import type { Skill } from '$lib/skills/types';

  let textarea: HTMLTextAreaElement;
  let value = $state('');
  let showAutocomplete = $state(false);
  let autocompleteQuery = $state('');
  let cursorPosition = $state({ x: 0, y: 0 });
  let skills: Skill[] = $state([]);

  async function loadSkills() {
    const res = await fetch('/api/skills');
    skills = await res.json();
  }

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    value = target.value;

    // Check for / at start
    if (value.startsWith('/')) {
      autocompleteQuery = value.slice(1);
      showAutocomplete = true;
      updateCursorPosition();
    } else {
      showAutocomplete = false;
    }
  }

  function updateCursorPosition() {
    // Calculate dropdown position based on textarea
    const rect = textarea.getBoundingClientRect();
    cursorPosition = { x: rect.left, y: rect.bottom + 4 };
  }

  function selectSkill(skill: Skill) {
    // Convert skill name to slug
    const slug = skill.name.toLowerCase().replace(/\s+/g, '-');
    value = `/${slug} `;
    showAutocomplete = false;
    textarea.focus();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (showAutocomplete) {
      if (e.key === 'Escape') {
        showAutocomplete = false;
        e.preventDefault();
      }
      // Arrow key navigation handled in autocomplete component
    }
  }

  $effect(() => {
    loadSkills();
  });
</script>

<div class="relative">
  <textarea
    bind:this={textarea}
    {value}
    oninput={handleInput}
    onkeydown={handleKeydown}
    placeholder="Ask anything... (type / for skills)"
  />

  {#if showAutocomplete}
    <SkillAutocomplete
      query={autocompleteQuery}
      {skills}
      position={cursorPosition}
      onSelect={selectSkill}
      onClose={() => showAutocomplete = false}
    />
  {/if}
</div>
```

### Phase 3: API Enhancement

**File**: `src/lib/skills/manager.ts`

Add method to get skill by slug:

```typescript
getBySlug(slug: string): Skill | undefined {
  const skills = storeGetAll();
  return skills.find(s => {
    const skillSlug = s.name.toLowerCase().replace(/\s+/g, '-');
    return skillSlug === slug || s.id === slug;
  });
}
```

**File**: `src/routes/api/skills/autocomplete/+server.ts` (optional)

Lightweight endpoint for autocomplete:

```typescript
import { json } from "@sveltejs/kit";
import { getSkillManager } from "$lib/skills";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get("q") || "";
  const manager = getSkillManager();
  await manager.initialize();

  const skills = manager.listEnabledSkills();

  if (!query) {
    return json(skills.slice(0, 10));
  }

  const filtered = skills.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));

  return json(filtered.slice(0, 10));
};
```

### Phase 4: Agent Integration

**File**: `src/lib/agent/index.ts`

Parse slash commands from user message and force-include skills:

```typescript
// Parse /skill-name from message
function parseSkillCommands(message: string): string[] {
  const regex = /\/([a-z0-9-]+)/g;
  const matches = message.matchAll(regex);
  return Array.from(matches, (m) => m[1]);
}

// In processMessage():
const skillCommands = parseSkillCommands(userMessage);
let forcedSkills: Skill[] = [];

if (skillCommands.length > 0) {
  const manager = getSkillManager();
  await manager.initialize();

  forcedSkills = skillCommands
    .map((slug) => manager.getBySlug(slug))
    .filter((s): s is Skill => s !== undefined && s.enabled);
}

// Combine forced skills with semantic search results
const semanticSkills = await skillManager.searchSkills(userMessage, 3);
const allSkills = [...forcedSkills];

// Add semantic skills that aren't already forced
for (const skill of semanticSkills) {
  if (!allSkills.find((s) => s.id === skill.id)) {
    allSkills.push(skill);
  }
}

// Build context
if (allSkills.length > 0) {
  skillsContext =
    "\n\nSkills:\n" + allSkills.map((s) => `--- ${s.name} ---\n${s.content}\n---`).join("\n\n");
}
```

---

## Phase 5: Skill Picker UI (Optional)

A modal for browsing and selecting skills when you don't know the exact name.

**File**: `src/lib/components/skills/SkillPicker.svelte`

```svelte
<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Command from '$lib/components/ui/command';
  import { Button } from '$lib/components/ui/button';
  import type { Skill } from '$lib/skills/types';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (skill: Skill) => void;
  }

  let { open, onOpenChange, onSelect }: Props = $props();

  let searchQuery = $state('');
  let skills: Skill[] = $state([]);

  async function loadSkills() {
    const res = await fetch('/api/skills');
    skills = await res.json();
  }

  const filteredSkills = $derived(
    searchQuery
      ? skills.filter(s =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : skills
  );

  $effect(() => {
    if (open) loadSkills();
  });
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Select a Skill</Dialog.Title>
    </Dialog.Header>

    <Command.Root>
      <Command.Input
        placeholder="Search skills..."
        bind:value={searchQuery}
      />
      <Command.List class="max-h-64 overflow-auto">
        {#each filteredSkills as skill (skill.id)}
          <Command.Item
            onclick={() => {
              onSelect(skill);
              onOpenChange(false);
            }}
          >
            <div class="flex flex-col">
              <span class="font-medium">{skill.name}</span>
              {#if skill.description}
                <span class="text-sm text-muted-foreground">
                  {skill.description}
                </span>
              {/if}
            </div>
          </Command.Item>
        {/each}
      </Command.List>
    </Command.Root>
  </Dialog.Content>
</Dialog.Root>
```

Add trigger button to chat input:

```svelte
<!-- In PromptInput.svelte -->
<Button
  variant="ghost"
  size="icon"
  onclick={() => showSkillPicker = true}
>
  <Sparkles class="h-4 w-4" />
</Button>

<SkillPicker
  open={showSkillPicker}
  onOpenChange={(v) => showSkillPicker = v}
  onSelect={(skill) => {
    const slug = skill.name.toLowerCase().replace(/\s+/g, '-');
    inputValue = `/${slug} `;
  }}
/>
```

---

## Key Files Summary

| File                                                                    | Action | Description                  |
| ----------------------------------------------------------------------- | ------ | ---------------------------- |
| `src/lib/components/skills/SkillAutocomplete.svelte`                    | Create | Dropdown component           |
| `src/lib/components/skills/SkillPicker.svelte`                          | Create | Modal for browsing           |
| `src/lib/components/prompt-kit/prompt-input/PromptInputTextarea.svelte` | Modify | Add autocomplete trigger     |
| `src/routes/chat-next/[id]/+page.svelte`                                | Modify | Add skill picker button      |
| `src/lib/skills/manager.ts`                                             | Modify | Add `getBySlug()` method     |
| `src/lib/agent/index.ts`                                                | Modify | Parse `/skill-name` commands |
| `src/routes/api/skills/autocomplete/+server.ts`                         | Create | Lightweight autocomplete API |

---

## Trade-offs

### Trigger Position

**Option A**: `/` at start of message only

- Pros: Simpler, clear intent
- Cons: Can't invoke mid-message

**Option B**: `/` anywhere in message

- Pros: Flexible
- Cons: Could trigger on URLs, file paths

**Recommendation**: Start of message only for v1

### Insert Style

**Option A**: Insert `/skill-name ` (with trailing space)

- Pros: Ready to type message
- Cons: User sees internal format

**Option B**: Insert skill name without `/`

- Pros: Cleaner appearance
- Cons: Less clear it's a command

**Recommendation**: Option A - keep `/` visible

### Command Persistence

**Option A**: Remove `/skill-name` from message before sending

- Pros: Cleaner message history
- Cons: Less transparent

**Option B**: Keep `/skill-name` in message

- Pros: User sees what they sent
- Cons: Slightly cluttered

**Recommendation**: Option B - transparency over aesthetics

---

## Testing Checklist

- [ ] Type `/` shows autocomplete dropdown
- [ ] Typing filters skills correctly
- [ ] Arrow keys navigate dropdown
- [ ] Enter selects skill
- [ ] Escape closes dropdown
- [ ] Selected skill inserts `/skill-name `
- [ ] Message with `/skill-name` forces skill in context
- [ ] Invalid skill name is ignored gracefully
- [ ] Skill picker modal opens/closes
- [ ] Skill picker search works
- [ ] Skill picker selection inserts command

---

## Future Enhancements

- **Command arguments**: `/skill-name arg1 arg2`
- **Command chaining**: `/skill1 | /skill2`
- **Recent skills**: Show recently used first
- **Fuzzy matching**: Match partial names
- **Skill shortcuts**: Custom aliases for skills
