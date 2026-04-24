# Chat Integration Implementation Plan

**Feature**: Slack/Notion-Style Skill Chips in Chat Input
**Status**: Ready to Implement
**Created**: 2025-03-12
**Priority**: P1

---

## Overview

Add slash commands (`/skill-name`) with autocomplete dropdown and inline chip visualization to the chat input. Users can explicitly invoke skills by typing `/` and selecting from a dropdown. Selected skills appear as removable inline chips, and the `/skill-name` command is sent with the message, forcing that skill into the agent's context.

---

## Design Specifications

- **Trigger**: `/` after whitespace or at start of input (Slack/Notion style)
- **Autocomplete**: Dropdown with skill suggestions filtered by query
- **Insertion**: Selected skill inserts `/skill-name ` as plain text (editable)
- **Chips**: Overlay system renders pill-style chips at command positions
- **Chip interaction**: Shows skill name + × button; clicking selects text; × removes command
- **Agent integration**: Parses `/skill-name` from message and forces that skill into system prompt
- **Persistence**: `/skill-name` remains visible in sent message (transparency)

---

## Technical Architecture

### Principle

The native `<textarea>` maintains raw text including `/skill-name` commands. A separate overlay `<div>` renders visual chips positioned precisely over the corresponding text using hidden span measurement. The overlay is reactive and updates on text changes, cursor movement, and scrolling.

### Component Tree

```
PromptInput
├── PromptInputTextarea
│   ├── Textarea (native)
│   ├── SkillChipOverlay (new)
│   └── SkillAutocomplete (new)
└── PromptInputActions
    └── SkillPicker button → SkillPicker (new modal)
```

---

## Implementation Phases

### Phase 1: Backend API & Agent (Day 1)

#### 1.1 SkillManager.getBySlug()

**File**: `src/lib/skills/manager.ts`

Add method to look up skills by slugified name or ID:

```typescript
getBySlug(slug: string): Skill | undefined {
  const skills = storeGetAll();
  return skills.find(s => {
    const skillSlug = s.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return skillSlug === slug || s.id === slug;
  });
}
```

#### 1.2 Autocomplete API

**File**: `src/routes/api/skills/autocomplete/+server.ts` (NEW)

GET endpoint returning enabled skills, optionally filtered by query:

```typescript
import { json } from "@sveltejs/kit";
import { getSkillManager } from "$lib/skills";

export const GET = async ({ url }) => {
  const query = url.searchParams.get("q")?.toLowerCase() || "";
  const manager = getSkillManager();
  await manager.initialize();

  const allSkills = await manager.getAllSkills();
  const enabledSkills = allSkills.filter((s) => s.enabled);

  if (query) {
    const filtered = enabledSkills.filter(
      (s) => s.name.toLowerCase().includes(query) || s.description?.toLowerCase().includes(query),
    );
    return json(filtered.slice(0, 10));
  }

  return json(enabledSkills.slice(0, 10));
};
```

#### 1.3 Agent Command Parsing

**File**: `src/lib/agent/index.ts`

Add `parseSkillCommands()` and integrate into `processMessage()`:

```typescript
function parseSkillCommands(message: string): string[] {
  const regex = /\/([a-zA-Z0-9][a-zA-Z0-9-]*)/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(message)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

// In processMessage(), replace skill injection code:
const skillCommands = parseSkillCommands(userMessage);
const forcedSkills: any[] = [];

if (skillCommands.length > 0) {
  const skillManager = getSkillManager();
  await skillManager.initialize();

  for (const slug of skillCommands) {
    const skill = skillManager.getBySlug(slug);
    if (skill && skill.enabled && !forcedSkills.find((s) => s.id === skill.id)) {
      forcedSkills.push(skill);
    }
  }
}

// Combine with semantic search
const semanticSkills = await skillManager.searchSkills(userMessage, 3);
const allSkills = [...forcedSkills];
for (const skill of semanticSkills) {
  if (!allSkills.find((s) => s.id === skill.id)) {
    allSkills.push(skill);
  }
}

// Build skillsContext using allSkills
if (allSkills.length > 0) {
  skillsContext =
    "\n\nAvailable specialized skills:\n" +
    allSkills.map((s) => `--- Skill: ${s.name} ---\n${s.content}\n---`).join("\n\n");
}
```

---

### Phase 2: PromptInput Context & Autocomplete (Day 2)

#### 2.1 Context Extension

**File**: `src/lib/components/prompt-kit/prompt-input/prompt-input-context.svelte.ts`

Add skill command tracking:

```typescript
export type SkillCommand = {
  id: string;
  name: string;
  start: number;
  end: number;
};

class PromptInputClass {
  // ... existing properties ...

  skillCommands = $state<SkillCommand[]>([]);
  onSkillCommandAdd?: (command: SkillCommand) => void;
  onSkillCommandRemove?: (commandId: string) => void;
  onSkillCommandsChange?: (commands: SkillCommand[]) => void;

  updateSkillCommands(text: string) {
    const commands: SkillCommand[] = [];
    const regex = /\/([a-zA-Z0-9][a-zA-Z0-9-]*)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      commands.push({
        id: `placeholder-${match.index}`,
        name: match[1],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    this.skillCommands = commands;
    this.onSkillCommandsChange?.(commands);
  }

  setValue(newValue: string) {
    this.value = newValue;
    this.onValueChange?.(newValue);
    this.updateSkillCommands(newValue);
  }

  addSkillCommand(skill: any, start: number, end: number) {
    this.skillCommands = this.skillCommands.filter(
      (c) => !(c.start === start && c.id.startsWith("placeholder-")),
    );
    this.skillCommands.push({
      id: skill.id,
      name: skill.name,
      start,
      end,
    });
    this.onSkillCommandAdd?.({ id: skill.id, name: skill.name, start, end });
  }

  removeSkillCommandById(id: string) {
    this.skillCommands = this.skillCommands.filter((c) => c.id !== id);
    this.onSkillCommandRemove?.(id);
  }
}
```

#### 2.2 SkillAutocomplete Component

**File**: `src/lib/components/skills/SkillAutocomplete.svelte` (NEW)

Dropdown component with keyboard navigation:

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

  let selectedIndex = $state(0);

  const filteredSkills = $derived(() => {
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
      selectedIndex = Math.min(selectedIndex + 1, filteredSkills().length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSkills()[selectedIndex]) {
        onSelect(filteredSkills()[selectedIndex]);
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
  class="absolute z-50 bg-popover border rounded-md shadow-lg w-72"
  style="left: {position.x}px; top: {position.y}px;"
  onkeydown={handleKeydown}
>
  <Command.Root>
    <Command.List>
      {#if filteredSkills().length === 0}
        <Command.Empty>No skills found</Command.Empty>
      {:else}
        {#each filteredSkills() as skill, i (skill.id)}
          <Command.Item
            value={skill.name}
            class={i === selectedIndex ? 'bg-accent' : ''}
            onclick={() => onSelect(skill)}
          >
            <div class="flex flex-col">
              <span class="font-medium">{skill.name}</span>
              {#if skill.description}
                <span class="text-muted-foreground text-xs">{skill.description}</span>
              {/if}
            </div>
          </Command.Item>
        {/each}
      {/if}
    </Command.List>
  </Command.Root>
</div>
```

---

### Phase 3: SkillChipOverlay (Day 3-4)

#### 3.1 Chip Overlay Component

**File**: `src/lib/components/skills/SkillChipOverlay.svelte` (NEW)

Renders inline pill-style chips over the textarea:

```svelte
<script lang="ts">
  import { cn } from '$lib/utils';
  import { getSkillManager } from '$lib/skills';
  import type { SkillCommand } from './prompt-input-context.svelte.js';

  interface Props {
    commands: SkillCommand[];
    textarea: HTMLTextAreaElement | null;
    onChipClick: (command: SkillCommand) => void;
  }

  let { commands, textarea, onChipClick }: Props = $props();

  let chipPositions = $state<Map<string, { x: number; y: number }>>(new Map());
  let skillCache = $state<Map<string, any>>(new Map());

  async function getSkill(slugOrId: string): Promise<any> {
    if (skillCache.has(slugOrId)) {
      return skillCache.get(slugOrId);
    }

    const manager = getSkillManager();
    await manager.initialize();

    let skill = manager.getBySlug(slugOrId);
    if (!skill) {
      const allSkills = await manager.getAllSkills();
      skill = allSkills.find(s => s.id === slugOrId);
    }

    if (skill) {
      skillCache.set(slugOrId, skill);
    }

    return skill;
  }

  function measurePosition(text: string, textarea: HTMLTextAreaElement): { x: number; y: number } {
    const style = getComputedStyle(textarea);
    const span = document.createElement('span');
    span.style.cssText = `
      font: ${style.font};
      letter-spacing: ${style.letterSpacing};
      white-space: pre;
      position: absolute;
      visibility: hidden;
      top: 0;
      left: 0;
      padding: 0;
      margin: 0;
    `;
    span.textContent = text;
    document.body.appendChild(span);
    const rect = span.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    document.body.removeChild(span);

    return {
      x: rect.left - textareaRect.left,
      y: rect.top - textareaRect.top
    };
  }

  $effect(() => {
    if (!textarea || commands.length === 0) {
      chipPositions = new Map();
      return;
    }

    const newPositions = new Map<string, { x: number; y: number }>();
    const text = textarea.value;
    const scrollTop = textarea.scrollTop;

    for (const cmd of commands) {
      const textBefore = text.slice(0, cmd.start);
      const pos = measurePosition(textBefore, textarea);

      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
      const linesBefore = (textBefore.match(/\n/g) || []).length;
      const y = pos.y - textarea.scrollTop + (linesBefore * lineHeight);

      newPositions.set(cmd.id, { x: pos.x, y });
    }

    chipPositions = newPositions;
  });

  let lineHeight = $derived(() => {
    if (!textarea) return 20;
    const lh = parseInt(getComputedStyle(textarea).lineHeight);
    return isNaN(lh) ? 20 : lh;
  });
</script>

<svelte:window onscroll={() => {}} />

<div class="absolute inset-0 pointer-events-none overflow-hidden">
  {#each commands as command (command.id)}
    {@const pos = chipPositions.get(command.id)}
    {#if pos && textarea}
      {@const skill = skillCache.get(command.name) || skillCache.get(command.id)}
      <div
        class="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary border border-primary/20 cursor-pointer hover:bg-primary/20 whitespace-nowrap transition-colors"
        style="position: absolute; left: {pos.x}px; top: {pos.y}px; line-height: {lineHeight}px;"
        onclick={() => onChipClick(command)}
        title={skill ? skill.description : command.name}
      >
        <span>{command.name}</span>
        <button
          type="button"
          class="ml-0.5 rounded-full hover:bg-primary/30 p-0.5 flex items-center justify-center min-w-[1rem] h-4 aspect-square"
          onclick={(e) => {
            e.stopPropagation();
            const start = command.start;
            const end = command.end;
            if (!textarea) return;
            const newValue = textarea.value.slice(0, start) + textarea.value.slice(end);
            textarea.value = newValue;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    {/if}
  {/each}
</div>

<style>
  div[style*="position: absolute"] {
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    letter-spacing: inherit;
    word-spacing: inherit;
  }
</style>
```

---

### Phase 4: PromptInputTextarea Integration (Day 5)

#### 4.1 Modified Textarea Component

**File**: `src/lib/components/prompt-kit/prompt-input/PromptInputTextarea.svelte`

Integrate autocomplete and chip overlay:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { getPromptInputContext } from './prompt-input-context.svelte.js';
  import Textarea from '$lib/components/ui/textarea/textarea.svelte';
  import SkillAutocomplete from '$lib/components/skills/SkillAutocomplete.svelte';
  import SkillChipOverlay from '$lib/components/skills/SkillChipOverlay.svelte';

  const context = getPromptInputContext();

  let textareaRef = $state<HTMLTextAreaElement | null>(null);
  let autocompleteRef = $state<HTMLDivElement | null>(null);
  let skills: any[] = $state([]);
  let showAutocomplete = $state(false);
  let autocompleteQuery = $state('');
  let autocompletePosition = $state({ x: 0, y: 0 });

  onMount(async () => {
    const res = await fetch('/api/skills/autocomplete');
    skills = await res.json();
  });

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    const value = target.value;
    context.setValue(value);

    const cursorPos = target.selectionStart || 0;
    const textUpToCursor = value.slice(0, cursorPos);

    const lastSpace = textUpToCursor.lastIndexOf(' ');
    const lastNewline = textUpToCursor.lastIndexOf('\n');
    const lastWhitespace = Math.max(lastSpace, lastNewline);

    const textAfterWhitespace = textUpToCursor.slice(lastWhitespace + 1);

    if (textAfterWhitespace.startsWith('/')) {
      autocompleteQuery = textAfterWhitespace.slice(1);
      showAutocomplete = true;
      updateAutocompletePosition(target);
    } else {
      showAutocomplete = false;
    }
  }

  function updateAutocompletePosition(textarea: HTMLTextAreaElement) {
    const rect = textarea.getBoundingClientRect();
    autocompletePosition = {
      x: rect.left,
      y: rect.bottom + 4
    };
  }

  function selectSkill(skill: any) {
    if (!textareaRef) return;

    const cursorPos = textareaRef.selectionStart || 0;
    const value = context.value;

    const textUpToCursor = value.slice(0, cursorPos);
    const lastSpace = textUpToCursor.lastIndexOf(' ');
    const lastNewline = textUpToCursor.lastIndexOf('\n');
    const lastWhitespace = Math.max(lastSpace, lastNewline);

    const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const before = value.slice(0, lastWhitespace + 1);
    const after = value.slice(cursorPos);
    const newValue = `${before}/${slug} ${after}`;

    context.setValue(newValue);
    showAutocomplete = false;

    const newCursorPos = lastWhitespace + 1 + slug.length + 1;
    setTimeout(() => {
      if (textareaRef) {
        textareaRef.selectionStart = textareaRef.selectionEnd = newCursorPos;
        textareaRef.focus();
      }
    }, 0);
  }

  function handleChipClick(command: any) {
    if (!textareaRef) return;
    textareaRef.focus();
    textareaRef.selectionStart = command.start;
    textareaRef.selectionEnd = command.end;
  }
</script>

<div class="relative">
  <Textarea
    bind:ref={textareaRef}
    value={context.value}
    oninput={handleInput}
    class="min-h-[44px] bg-transparent"
    rows={1}
    disabled={context.disabled}
    {...restProps}
  />

  {#if textareaRef}
    <SkillChipOverlay
      textarea={textareaRef}
      commands={context.skillCommands}
      onChipClick={handleChipClick}
    />
  {/if}

  {#if showAutocomplete}
    <div
      class="absolute z-50"
      style="left: {autocompletePosition.x}px; top: {autocompletePosition.y}px;"
    >
      <SkillAutocomplete
        query={autocompleteQuery}
        {skills}
        onSelect={selectSkill}
        onClose={() => showAutocomplete = false}
      />
    </div>
  {/if}
</div>
```

---

### Phase 5: SkillPicker Modal & Chat Integration (Day 6)

#### 5.1 SkillPicker Component

**File**: `src/lib/components/skills/SkillPicker.svelte` (NEW)

Dialog with command palette for skill selection:

```svelte
<script lang="ts">
  import { Dialog } from '$lib/components/ui/dialog';
  import * as Command from '$lib/components/ui/command';
  import { Button } from '$lib/components/ui/button';
  import { Search } from '@lucide/svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (skill: any) => void;
  }

  let { open, onOpenChange, onSelect }: Props = $props();

  let searchQuery = $state('');
  let skills: any[] = $state([]);
  let loading = $state(false);

  async function loadSkills() {
    loading = true;
    try {
      const res = await fetch('/api/skills?enabled=true');
      skills = await res.json();
    } catch (e) {
      console.error('Failed to load skills:', e);
      skills = [];
    } finally {
      loading = false;
    }
  }

  const filteredSkills = $derived(() => {
    if (!searchQuery) return skills;
    const q = searchQuery.toLowerCase();
    return skills.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
  });

  function handleSelect(skill: any) {
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
            {#each filteredSkills as skill (skill.id)}
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
```

#### 5.2 Chat Page Integration

**File**: `src/routes/chat-next/[id]/+page.svelte`

Add skill picker button and modal:

```svelte
<script lang="ts">
  import { ArrowUp, Lightbulb, Wrench, Check, AlertCircle, Sparkles } from '@lucide/svelte';
  import SkillPicker from '$lib/components/skills/SkillPicker.svelte';

  // ... existing code ...

  let showSkillPicker = $state(false);
</script>

<!-- Inside PromptInputActions -->
<PromptInputActions class="justify-between">
  <div>
    <Button
      variant="ghost"
      size="icon"
      type="button"
      onclick={() => showSkillPicker = true}
      title="Insert a skill"
    >
      <Sparkles class="h-4 w-4" />
    </Button>
  </div>
  <Button
    size="icon"
    class="rounded-full"
    disabled={!inputValue.trim()}
  >
    {#if chatStore.isLoading}
      <span class="h-3 w-3 rounded-xs bg-white"></span>
    {:else}
      <ArrowUp size={18} />
    {/if}
  </Button>
</PromptInputActions>

<SkillPicker
  open={showSkillPicker}
  onOpenChange={(v) => showSkillPicker = v}
  onSelect={(skill) => {
    const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const cursorPos = (textarea as any).selectionStart || inputValue.length;
      inputValue = inputValue.slice(0, cursorPos) + `/${slug} ` + inputValue.slice(cursorPos);
      setTimeout(() => {
        (textarea as any).selectionStart = (textarea as any).selectionEnd = cursorPos + slug.length + 2;
        textarea.focus();
      }, 0);
    } else {
      inputValue = `/${slug} `;
    }
  }}
/>
```

---

### Phase 6: Testing & Validation (Day 7)

#### 6.1 Unit Tests (Bun)

- `getBySlug()`: test slugification and ID matching
- `parseSkillCommands()`: test regex with various inputs
- Semantic search integration

#### 6.2 E2E Tests (Playwright)

**File**: `tests/skills/skills-chat.spec.ts` (NEW)

Test scenarios:

1. Type `/` → autocomplete appears
2. Arrow keys navigate dropdown
3. Enter selects skill → `/skill-name` inserted
4. Backspace removes command and chip disappears
5. Chip × button removes command
6. Chip click selects text
7. Multiple chips at different positions work
8. Skill picker modal opens via button
9. Picker selection inserts `/skill-name`
10. Message with `/skill-name` sends and agent uses forced skill
11. Invalid skill name handled gracefully
12. Long skill names truncated in chip
13. Multi-line text with chips positions correctly
14. Textarea scroll updates chip positions

Run: `bun run test:e2e:skills:chat`

#### 6.3 Manual Testing

```bash
# Start dev server
bun run dev

# Create test skill via API or UI
curl -X POST http://localhost:5173/api/skills \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Skill","description":"A test skill","content":"---\nname: Test Skill\n---\nContent"}'

# Open chat page, test full flow
```

---

## File Change Summary

| File                                                                        | Type   | Priority | Day |
| --------------------------------------------------------------------------- | ------ | -------- | --- |
| `src/lib/skills/manager.ts`                                                 | Modify | P1       | 1   |
| `src/routes/api/skills/autocomplete/+server.ts`                             | Create | P1       | 1   |
| `src/lib/agent/index.ts`                                                    | Modify | P1       | 1   |
| `src/lib/components/prompt-kit/prompt-input/prompt-input-context.svelte.ts` | Modify | P2       | 2   |
| `src/lib/components/skills/SkillAutocomplete.svelte`                        | Create | P2       | 2   |
| `src/lib/components/skills/SkillChipOverlay.svelte`                         | Create | P3       | 3-4 |
| `src/lib/components/prompt-kit/prompt-input/PromptInputTextarea.svelte`     | Modify | P3       | 5   |
| `src/lib/components/skills/SkillPicker.svelte`                              | Create | P4       | 6   |
| `src/routes/chat-next/[id]/+page.svelte`                                    | Modify | P4       | 6   |
| `tests/skills/skills-chat.spec.ts`                                          | Create | P5       | 7   |

---

## Edge Cases & Solutions

| Edge Case                        | Solution                                                                 |
| -------------------------------- | ------------------------------------------------------------------------ |
| Long skill names                 | Truncate with CSS (`truncate`), show full name in `title` attribute      |
| Multi-line text                  | Count newlines, multiply by line-height for Y offset                     |
| Textarea scroll                  | Subtract `scrollTop` from chip Y positions in overlay                    |
| Font mismatch                    | Use `getComputedStyle(textarea)` to copy exact font properties           |
| Many chips                       | Debounce overlay updates (25ms throttle) if performance issues           |
| Partial deletion                 | Context updates on every input, removes chips whose commands are deleted |
| Unknown skill (deleted/disabled) | Chip shows name anyway (from placeholder), still removable ×             |
| Mobile viewport                  | Autocomplete width matches textarea; chips scale with font-size          |
| Copy/paste                       | Raw text includes `/slug` → paste works naturally                        |
| Undo/redo                        | Native textarea handles it; chips follow value changes automatically     |
| IME input                        | Native textarea preserves IME behavior (overlay doesn't interfere)       |
| Resize                           | Re-measure on window resize (add resize listener if needed)              |

---

## Acceptance Criteria

- [ ] `/` triggers autocomplete after whitespace or at start
- [ ] Autocomplete shows up to 10 matching skills (name/description)
- [ ] Keyboard nav: ↑↓ navigates, Enter selects, Escape closes
- [ ] Selecting skill inserts `/skill-name ` at cursor position
- [ ] Chip overlay displays pill-style chips at command positions
- [ ] Chip shows skill name + × button
- [ ] Clicking chip selects corresponding text in textarea
- [ ] × button removes command from textarea
- [ ] Backspace naturally deletes `/skill-name` text (chip disappears)
- [ ] Multiple chips can be added at different positions
- [ ] Skill picker modal opens with Sparkles button
- [ ] Picker search filters skills
- [ ] Picker selection inserts `/skill-name` at cursor
- [ ] Agent parses `/skill-name` and forces that skill in context
- [ ] Invalid skill names are ignored (no forced skill)
- [ ] No console errors during normal operation
- [ ] Mobile: virtual keyboard works, chips visible, dropdown scrollable

---

## Risk Mitigation

| Risk                                        | Impact | Mitigation                                                                              |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| Chip positioning inaccurate on varied fonts | High   | Use exact computed styles; test with different zoom/browser                             |
| Performance with many chips/updates         | Medium | Debounce overlay updates; limit chip count display                                      |
| Mobile browser quirks                       | Medium | Test on actual device; ensure touch interacts with chips                                |
| IME interference                            | High   | Ensure overlay is `pointer-events-none` except on chips; test with Asian language input |
| Scroll sync issues                          | Medium | Recalculate on scroll event; test with long content                                     |

---

## Estimated Timeline

- **Day 1**: Backend API + Agent (3-4 hours)
- **Day 2**: Context + Autocomplete component (3 hours)
- **Day 3-4**: SkillChipOverlay (6 hours) - most complex, may need iteration
- **Day 5**: PromptInputTextarea integration (4 hours)
- **Day 6**: SkillPicker + chat page (3 hours)
- **Day 7**: Testing + bug fixes (4 hours)

**Total**: ~23 hours spread across 1 week

---

## Success Metrics

- User can invoke any skill via `/` command within 3 keystrokes
- Chip overlay renders without visual glitches across browsers
- No performance degradation (overlay updates < 16ms)
- All E2E tests passing
- Zero console errors in production build

---

## Next Steps

1. Get approval on this plan
2. Implement Phase 1 (Backend + Agent)
3. Test API endpoints manually with curl
4. Proceed sequentially through phases
5. Write tests alongside implementation (TDD-ish)
6. Debug overlay positioning iteratively
7. Final integration testing
8. Document feature in README

---

## Appendix: Slugification Rules

```typescript
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
```

Examples:

- "Python Helper" → "python-helper"
- "React Tutorial" → "react-tutorial"
- "Svelte5 Components" → "svelte5-components"

---

**Ready to implement.**
