# Nova Skills System Implementation Plan

**Goal**: Add a skills system to Nova where users can create custom AI capabilities via markdown files that are automatically indexed and available to all chats.

---

## Core Concept

- Skills live in `~/.nova/skills/<skill-name>/SKILL.md`
- On Nova startup: discover, parse, embed, store in memory (SkillManager)
- On each chat: semantically search skills → top 3 added to system prompt
- Users can manually invoke skills via `/skill-name` slash commands
- UI at `/skills` to create, edit, enable/disable skills
- No versioning in v1 (keep it simple)

---

## Architecture Decisions

### Storage

- Skills stored in user home: `~/.nova/skills/`
- Each skill: directory containing `SKILL.md`
- **Not** stored in memory.json - kept separate in SkillManager's in-memory Map
- Rationale: Skills are global knowledge, not conversation-specific facts; separate from evictable memory

### Indexing & Discovery

- On startup: scan `~/.nova/skills/**/SKILL.md`
- Parse YAML frontmatter + markdown body
- Generate embedding using existing `embeddingsGenerator` from memory module
- Store in `SkillManager.skills: Map<string, Skill>`
- Compute file hash for change detection (for future file watching)

### Search

- SkillsManager.searchSkills(query, limit=3):
  - Generate query embedding
  - Compute cosine similarity against all **enabled** skill embeddings
  - Return top K by score

### Agent Integration

- Before processing user message:
  ```typescript
  const relevantSkills = await skillManager.searchSkills(userMessage, 3);
  const skillsPrompt = relevantSkills.map((s) => `SKILL: ${s.name}\n${s.content}`).join("\n\n");
  systemMessage.content += `\n\n${skillsPrompt}`;
  ```
- Also register each enabled skill as a tool: `{ name: skill_${id}, description, execute() }`
- Tool execution just acknowledges (skill instructions already in context)

### Enable/Disable

- UI toggle per skill
- Stored in `skills-index.json` or in-memory only
- Disabled skills: not returned by search, not registered as tools

### No Versioning (v1)

- Skip history/versioning to keep simple
- Users can use git in `~/.nova/skills/` if they want history

---

## File Structure

```
src/lib/skills/
├── types.ts        # Skill interface, SkillManager class
└── index.ts        # Export singleton

src/routes/skills/
└── +page.svelte    # Skills UI: list, create, edit, toggle

src/lib/components/skills/
├── SkillCard.svelte      # Individual skill card
└── SkillEditorModal.svelte # Create/edit modal

src/routes/chat/[id]/+page.svelte (modify) # Add slash autocomplete

~/.nova/
├── skills/                # User's skills (created by user)
│   ├── solid-js/
│   │   └── SKILL.md
│   └── crypto-api/
│       └── SKILL.md
└── skills-index.json      # { "solid-js": { enabled: true, hash: "..." } }
```

---

## Detailed Component Specs

### 1. Skill Types (`src/lib/skills/types.ts`)

```typescript
export interface Skill {
  id: string; // directory name (slug)
  name: string; // from frontmatter or id
  description: string; // from frontmatter
  content: string; // markdown body (without frontmatter)
  enabled: boolean;
  embedding?: number[]; // 384-dim vector
  filePath: string; // absolute path to SKILL.md
  lastModified: number;
}

export interface SkillFrontmatter {
  name?: string;
  description: string;
  // Future: argumentHint?, disableModelInvocation?, allowedTools?, context?
}

export class SkillManager {
  private skills: Map<string, Skill> = new Map();
  private skillsDir: string;
  private indexPath: string;

  constructor(novaDir = expandPath("~/.nova")) {
    this.skillsDir = path.join(novaDir, "skills");
    this.indexPath = path.join(novaDir, "skills-index.json");
  }

  async initialize(): Promise<void>;
  async loadAllSkills(): Promise<void>;
  async searchSkills(query: string, limit?: number): Promise<Skill[]>;
  getSkill(id: string): Skill | undefined;
  async createSkill(
    skill: Omit<Skill, "id" | "filePath" | "embedding" | "lastModified">,
  ): Promise<Skill>;
  async updateSkill(
    id: string,
    updates: Partial<Pick<Skill, "name" | "description" | "content">>,
  ): Promise<void>;
  async deleteSkill(id: string): Promise<void>;
  async toggleEnabled(id: string, enabled: boolean): Promise<void>;
  async reindexSkill(id: string): Promise<void>;
  listEnabledSkills(): Skill[];
}
```

### 2. Skill Manager (`src/lib/skills/manager.ts`)

**Key Methods**:

- `initialize()`: Ensure `~/.nova/` exists, load `skills-index.json` (or create empty), call `loadAllSkills()`
- `loadAllSkills()`:
  - Scan `this.skillsDir` for directories containing `SKILL.md`
  - For each: read file → parseFrontmatter() → create Skill object
  - Compute embedding (use `embeddingsGenerator.generate(skill.content)`)
  - Check `skills-index.json` for `enabled` flag (default true)
  - Store in `this.skills` map
- `searchSkills(query, limit=3)`:
  - Generate query embedding
  - Filter to `enabled` skills
  - Compute cosine similarity for each
  - Sort desc, return top K
- `createSkill()`:
  - Validate name (slug), create directory `~/.nova/skills/<slug>/`
  - Write `SKILL.md` with frontmatter + content
  - Call `reindexSkill(slug)`
  - Add to `skills-index.json` with `enabled: true`
- `updateSkill()`: Write new content to `SKILL.md`, call `reindexSkill()`
- `deleteSkill()`: Remove directory, remove from index, remove from map
- `toggleEnabled()`: Update `skills-index.json`, if disabling remove from map (or keep but filter in search)

**Helper**:

- `parseSkillFile(filePath)`: reads file, extracts frontmatter (YAML between `---`) and body, returns `{ frontmatter, content }`
- `computeEmbedding(text)`: wrapper around `embeddingsGenerator.generate()`
- `saveIndex()`: serializes `skills-index.json`

### 3. Memory Extension - NOT NEEDED

Since we're keeping skills separate, no changes to memory system.

### 4. Agent Integration (`src/lib/agent/index.ts`)

Modify `AgentOrchestrator`:

- Inject `SkillManager` dependency:
  ```typescript
  import { getSkillManager } from "$lib/skills";
  ```
- In `processMessage()` before streaming:

  ```typescript
  const skillManager = getSkillManager();
  const relevantSkills = await skillManager.searchSkills(userMessage, 3);

  let skillsContext = "";
  if (relevantSkills.length > 0) {
    skillsContext =
      "\n\nRelevant skills:\n" +
      relevantSkills.map((s) => `- ${s.name}: ${s.description}\n${s.content}`).join("\n");
  }

  const systemMessage = {
    role: "system",
    content: `You are a helpful AI assistant.${skillsContext}`,
  };
  ```

- Dynamically build tools including skill tools:

  ```typescript
  const skillTools = skillManager.listEnabledSkills().map((skill) => ({
    name: `skill_${skill.id}`,
    description: `Use skill: ${skill.description}`,
    parameters: { type: "object", properties: { args: { type: "string" } } },
  }));

  const allTools = { ...tools, ...skillTools };
  ```

- When streaming, handle tool calls: if toolName starts with `skill_`, just acknowledge

  ```typescript
  onStepFinish: async (step) => {
    for (const toolCall of step.toolCalls || []) {
      if (toolCall.toolName.startsWith("skill_")) {
        console.log(`Skill invoked: ${toolCall.toolName}`);
        // No actual execution needed - skill instructions already in context
      }
    }
  };
  ```

### 5. Skills UI (`src/routes/skills/+page.svelte`)

**State**:

- `skills: Skill[]` (sorted by name)
- `editingSkill: Skill | null` (or 'new')
- `showEditor: boolean`

**UI Layout**:

- Header: "Skills" + "Create Skill" button
- Grid of SkillCard components

**SkillCard**:

- Name (heading)
- Description (paragraph)
- Table row: Enabled | Edit | Delete
- Toggle switch for enabled state

**SkillEditorModal** (dialog):

- Fields:
  - Name (text, slugified, required)
  - Description (text, required, single line)
  - Content (textarea with markdown preview toggle)
- Buttons: Cancel, Save & Enable, Save
- Validation: name unique, required fields

**Actions**:

- Create: POST to `/api/skills` (or call skillManager directly)
- Edit: load into modal, save updates
- Delete: confirm → delete
- Toggle: call `skillManager.toggleEnabled()`

**API Route** (optional, if we want server-side):
`src/routes/api/skills/+server.ts` - but simpler to call SkillManager directly from Svelte since it's all file-based

### 6. Slash Autocomplete (`src/routes/chat/[id]/+page.svelte`)

In chat input component:

- Listen for `/` at start of message
- Show dropdown with `skillManager.listEnabledSkills()`
- Filter by input text after `/`
- Keyboard nav: arrow keys, enter to select
- Insert `/skill-name ` into input

Implementation:

```svelte
<script>
  import { skillManager } from '$lib/skills';
  let inputValue = '';
  let showSkills = false;

  function handleKeydown(e) {
    if (e.key === '/') {
      showSkills = true;
    }
    if (showSkills) {
      // filter skills by inputValue.slice(1)
      // show dropdown, handle selection
    }
  }
</script>

<input bind:value={inputValue} on:keydown={handleKeydown} />

{#if showSkills}
  <div class="dropdown">
    {#each filteredSkills as skill}
      <div on:click={() => selectSkill(skill)}>{skill.name}</div>
    {/each}
  </div>
{/if}
```

---

## Implementation Order

**Day 1**:

1. Create `src/lib/skills/types.ts` - define interfaces
2. Create `src/lib/skills/manager.ts` - implement SkillManager (load, parse, embed, CRUD, search)
3. Add `getSkillManager()` singleton in `src/lib/skills/index.ts`
4. Test: create sample skills in `~/.nova/skills/`, console.log search results

**Day 2**: 5. Modify `src/lib/agent/index.ts` - integrate skill search into system prompt, add skill tools 6. Test: chat with skill-relevant query, verify skill appears in system prompt 7. Create `src/routes/skills/+page.svelte` - skills list UI 8. Create `src/lib/components/skills/SkillCard.svelte` 9. Create simple modal for create/edit (inline in page for now)

**Day 3**: 10. Implement skill creation/editing UI with form validation 11. Connect UI to skillManager CRUD methods 12. Add enable/disable toggle functionality 13. Refresh skill list on changes

**Day 4**: 14. Add slash autocomplete to chat input (`src/routes/chat/[id]/+page.svelte`) 15. Test complete flow: create skill → chat uses it automatically → slash command works 16. Basic error handling and loading states 17. Directory creation: ensure `~/.nova/` exists on first run

**Day 5**: 18. Polish: empty states, better UI, keyboard shortcuts 19. Add skill count badge somewhere 20. Documentation: README section on skills 21. Example skills to include in repo? (maybe in `docs/example-skills/`)

---

## Open Questions / Future Enhancements

- **Versioning**: Add later if users want it. Implementation: copy SKILL.md to `~/.nova/skills-history/<skill>/<timestamp>.md` on each save.
- **Dynamic commands**: Support `` `shell cmd` `` in skill content? Would need to execute and replace before sending to LLM.
- **allowed-tools**: Restrict which tools a skill can use? Probably not needed.
- **context: fork**: Run skill in isolated subagent? Keep simple for now.
- **Supporting files**: Allow skills to have `templates/`, `examples/` directories? Later.
- **Skill templates**: Pre-built skill templates in UI wizard? Later.
- **Import/Export**: UI to import skill from file? Nice to have.

---

## Success Criteria

- [ ] User can create `~/.nova/skills/test/SKILL.md` manually and Nova loads it automatically
- [ ] Relevant skills appear in system prompt (verified in UI or logs)
- [ ] `/test` autocomplete works and inserts command
- [ ] UI at `/skills` shows all skills, can create/edit/delete/toggle
- [ ] No performance regression in chat (< 100ms added)
- [ ] Works on Nova first start (creates ~/.nova if missing)
- [ ] Simple and maintainable (< 500 lines total new code)

---

## Notes

- Use existing `embeddingsGenerator` from `src/lib/memory/embeddings.ts` to generate skill embeddings
- Reuse `gray-matter` if available for frontmatter parsing (check package.json)
- All file operations should be in Node context (server-side). UI calls server via load/actions.
- Skills are **global** to Nova instance, not per-chat
- No database needed - all file-based

---

## Minimal Code Sketch

**SkillManager.loadAllSkills()**:

```typescript
const skillsDir = path.join(os.homedir(), ".nova", "skills");
const entries = await fs.readdir(skillsDir, { withFileTypes: true });
for (const entry of entries) {
  if (entry.isDirectory()) {
    const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
    if (await fs.fileExists(skillFile)) {
      const content = await fs.readText(skillFile);
      const { frontmatter, body } = parseFrontmatter(content);
      const embedding = await embeddingsGenerator.generate(body);
      const indexEntry = this.index[entry.name] || { enabled: true };
      this.skills.set(entry.name, {
        id: entry.name,
        name: frontmatter.name || entry.name,
        description: frontmatter.description,
        content: body,
        enabled: indexEntry.enabled,
        embedding,
        filePath: skillFile,
        lastModified: (await fs.stat(skillFile)).mtimeMs,
      });
    }
  }
}
```

**AgentOrchestrator.processMessage() snippet**:

```typescript
const skillManager = getSkillManager();
const relevantSkills = await skillManager.searchSkills(userMessage, 3);
const skillsBlock = relevantSkills.length
  ? `\n\nSkills available:\n${relevantSkills.map((s) => `${s.name}: ${s.description}\n${s.content}`).join("\n\n")}`
  : "";
const systemMsg = { role: "system", content: BASE_SYSTEM + skillsBlock };
```

---

That's the complete plan. Implementation should be straightforward following these specs.
