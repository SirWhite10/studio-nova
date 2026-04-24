# Skills File-Based Loading

**Goal**: Load skills from `~/.nova/skills/*.md` files instead of a single JSON file, with hot reload on file changes.

---

## Overview

Current state:

- Skills stored in single `${NOVA_DATA_DIR}/skills.json` file
- No way to edit skills outside Nova UI
- No version control friendliness
- No hot reload

Target state:

- Each skill is a standalone markdown file
- Files can be edited with any text editor
- Git-friendly (users can version their skills)
- Automatic reload when files change

---

## Directory Structure

```
~/.nova/
├── skills/
│   ├── code-reviewer.md
│   ├── api-helper.md
│   ├── python-expert.md
│   └── writing-assistant.md
└── skills-meta.json      # Metadata only (enabled status, timestamps)
```

### Skill File Format

Each `.md` file has YAML frontmatter:

```markdown
---
name: Code Reviewer
description: Reviews code for issues and improvements
tags:
  - code
  - review
triggers:
  - review
  - pr
  - pull request
---

You are a code reviewer. When asked to review code:

1. Check for bugs and logic errors
2. Suggest improvements for readability
3. Identify potential performance issues
4. Ensure code follows best practices

Always be constructive and explain your reasoning.
```

### Metadata File Format

`skills-meta.json` stores only non-content metadata:

```json
{
  "code-reviewer": {
    "enabled": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:22:00Z",
    "useCount": 12
  },
  "api-helper": {
    "enabled": false,
    "createdAt": "2024-01-10T08:00:00Z",
    "updatedAt": "2024-01-10T08:00:00Z",
    "useCount": 3
  }
}
```

---

## Architecture

### Module Structure

```
src/lib/server/
├── skill-file-loader.ts     # Scans and parses skill files
├── skill-store.ts           # Modified to use files
└── skill-watcher.ts         # File system watcher

src/lib/skills/
├── manager.ts               # Modified to use file loader
└── types.ts                 # Extended interfaces
```

### Data Flow

```
Server Start
    ↓
skill-file-loader.scanSkillsDirectory()
    ↓
For each *.md file:
  - Read file
  - Parse frontmatter
  - Generate embedding (if changed)
  - Merge with metadata
    ↓
Store in memory (SkillManager)
    ↓
File Watcher starts
    ↓
On file change:
  - Re-scan changed file
  - Update embedding if content changed
  - Notify connected clients (optional)
```

---

## Implementation Phases

### Phase 1: File Scanner Module

**File**: `src/lib/server/skill-file-loader.ts`

```typescript
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { parseSkillMarkdown, type Skill, type SkillFrontmatter } from "$lib/skills/types";
import { embeddingsGenerator } from "$lib/memory/embeddings";
import { existsSync } from "fs";

export const SKILLS_DIR = join(homedir(), ".nova", "skills");
export const META_FILE = join(homedir(), ".nova", "skills-meta.json");

export interface SkillFile {
  slug: string;
  path: string;
  content: string;
  frontmatter: SkillFrontmatter;
  mtime: number;
}

export interface SkillMeta {
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  useCount: number;
}

export interface SkillsMetaIndex {
  [slug: string]: SkillMeta;
}

export async function ensureSkillsDirectory(): Promise<void> {
  if (!existsSync(SKILLS_DIR)) {
    await import("fs/promises").then((fs) => fs.mkdir(SKILLS_DIR, { recursive: true }));
  }

  const novaDir = join(homedir(), ".nova");
  if (!existsSync(novaDir)) {
    await import("fs/promises").then((fs) => fs.mkdir(novaDir, { recursive: true }));
  }
}

export async function scanSkillFiles(): Promise<SkillFile[]> {
  await ensureSkillsDirectory();

  const files: SkillFile[] = [];
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const filePath = join(SKILLS_DIR, entry.name);
    const slug = entry.name.replace(/\.md$/, "");

    try {
      const content = await readFile(filePath, "utf-8");
      const stats = await stat(filePath);
      const { frontmatter, body } = parseSkillMarkdown(content);

      files.push({
        slug,
        path: filePath,
        content: body,
        frontmatter: {
          name: frontmatter.name || slug,
          description: frontmatter.description || "",
          tags: frontmatter.tags,
          triggers: frontmatter.triggers,
        },
        mtime: stats.mtimeMs,
      });
    } catch (error) {
      console.error(`Failed to load skill file ${filePath}:`, error);
    }
  }

  return files;
}

export async function loadMetaIndex(): Promise<SkillsMetaIndex> {
  try {
    if (!existsSync(META_FILE)) {
      return {};
    }
    const content = await readFile(META_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export async function saveMetaIndex(meta: SkillsMetaIndex): Promise<void> {
  await import("fs/promises").then((fs) => fs.writeFile(META_FILE, JSON.stringify(meta, null, 2)));
}

export async function buildSkillFromFile(
  file: SkillFile,
  meta: SkillMeta,
  existingEmbedding?: number[],
): Promise<Skill> {
  // Only regenerate embedding if content changed
  let embedding = existingEmbedding;
  if (!embedding) {
    try {
      embedding = await embeddingsGenerator.generate(file.content);
    } catch (error) {
      console.error(`Failed to generate embedding for ${file.slug}:`, error);
      embedding = undefined;
    }
  }

  return {
    id: file.slug,
    name: file.frontmatter.name || file.slug,
    description: file.frontmatter.description,
    content: file.content,
    enabled: meta.enabled ?? true,
    tags: file.frontmatter.tags,
    triggers: file.frontmatter.triggers,
    createdAt: meta.createdAt || new Date().toISOString(),
    updatedAt: meta.updatedAt || new Date().toISOString(),
    embedding,
  };
}

export async function writeSkillFile(
  slug: string,
  frontmatter: SkillFrontmatter,
  content: string,
): Promise<void> {
  await ensureSkillsDirectory();

  const filePath = join(SKILLS_DIR, `${slug}.md`);
  const frontmatterYaml = Object.entries(frontmatter)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        return `${k}:\n${v.map((i) => `  - ${i}`).join("\n")}`;
      }
      return `${k}: ${JSON.stringify(v)}`;
    })
    .join("\n");

  const fileContent = `---\n${frontmatterYaml}\n---\n\n${content}`;

  await import("fs/promises").then((fs) => fs.writeFile(filePath, fileContent));
}

export async function deleteSkillFile(slug: string): Promise<void> {
  const filePath = join(SKILLS_DIR, `${slug}.md`);
  if (existsSync(filePath)) {
    await import("fs/promises").then((fs) => fs.unlink(filePath));
  }
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
```

### Phase 2: Refactor Skill Store

**File**: `src/lib/server/skill-store.ts`

Major refactor to use file-based storage:

```typescript
import type { Skill, SkillFrontmatter } from "$lib/skills/types";
import {
  scanSkillFiles,
  loadMetaIndex,
  saveMetaIndex,
  buildSkillFromFile,
  writeSkillFile,
  deleteSkillFile,
  slugify,
  type SkillMeta,
  type SkillsMetaIndex,
} from "./skill-file-loader";

let skills: Skill[] = [];
let metaIndex: SkillsMetaIndex = {};
let isLoaded = false;

export async function loadSkills(): Promise<void> {
  if (isLoaded) return;

  const files = await scanSkillFiles();
  metaIndex = await loadMetaIndex();

  skills = [];
  for (const file of files) {
    const meta: SkillMeta = metaIndex[file.slug] || {
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      useCount: 0,
    };

    const skill = await buildSkillFromFile(file, meta);
    skills.push(skill);
  }

  isLoaded = true;
}

export function getAllSkills(): Skill[] {
  return [...skills];
}

export function getEnabledSkills(): Skill[] {
  return skills.filter((s) => s.enabled);
}

export function getSkillById(id: string): Skill | undefined {
  return skills.find((s) => s.id === id);
}

export async function createSkill(
  name: string,
  content: string,
  description?: string,
  tags?: string[],
  triggers?: string[],
): Promise<Skill> {
  const slug = slugify(name);

  // Check for duplicate
  if (skills.find((s) => s.id === slug)) {
    throw new Error(`Skill with slug "${slug}" already exists`);
  }

  const frontmatter: SkillFrontmatter = {
    name,
    description: description || "",
    tags,
    triggers,
  };

  await writeSkillFile(slug, frontmatter, content);

  const now = new Date().toISOString();
  const meta: SkillMeta = {
    enabled: true,
    createdAt: now,
    updatedAt: now,
    useCount: 0,
  };

  metaIndex[slug] = meta;
  await saveMetaIndex(metaIndex);

  // Build skill with embedding
  const files = await scanSkillFiles();
  const file = files.find((f) => f.slug === slug);
  if (!file) throw new Error("Failed to read created skill");

  const skill = await buildSkillFromFile(file, meta);
  skills.push(skill);

  return skill;
}

export async function updateSkill(
  id: string,
  updates: {
    name?: string;
    description?: string;
    content?: string;
    tags?: string[];
    triggers?: string[];
  },
): Promise<Skill | undefined> {
  const existing = skills.find((s) => s.id === id);
  if (!existing) return undefined;

  const frontmatter: SkillFrontmatter = {
    name: updates.name || existing.name,
    description: updates.description ?? existing.description,
    tags: updates.tags ?? existing.tags,
    triggers: updates.triggers ?? existing.triggers,
  };

  await writeSkillFile(id, frontmatter, updates.content || existing.content);

  // Update meta
  metaIndex[id] = {
    ...metaIndex[id],
    updatedAt: new Date().toISOString(),
  };
  await saveMetaIndex(metaIndex);

  // Reload the skill
  const files = await scanSkillFiles();
  const file = files.find((f) => f.slug === id);
  if (!file) return undefined;

  const newSkill = await buildSkillFromFile(
    file,
    metaIndex[id],
    // Reuse embedding if content didn't change
    updates.content ? undefined : existing.embedding,
  );

  // Update in-memory array
  const index = skills.findIndex((s) => s.id === id);
  skills[index] = newSkill;

  return newSkill;
}

export async function deleteSkill(id: string): Promise<boolean> {
  const index = skills.findIndex((s) => s.id === id);
  if (index === -1) return false;

  await deleteSkillFile(id);
  delete metaIndex[id];
  await saveMetaIndex(metaIndex);

  skills.splice(index, 1);
  return true;
}

export async function setSkillEnabled(id: string, enabled: boolean): Promise<boolean> {
  const skill = skills.find((s) => s.id === id);
  if (!skill) return false;

  skill.enabled = enabled;
  metaIndex[id] = {
    ...metaIndex[id],
    enabled,
    updatedAt: new Date().toISOString(),
  };
  await saveMetaIndex(metaIndex);

  return true;
}

export async function reloadSkill(id: string): Promise<Skill | undefined> {
  const files = await scanSkillFiles();
  const file = files.find((f) => f.slug === id);
  if (!file) return undefined;

  const meta = metaIndex[id] || {
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    useCount: 0,
  };

  const existing = skills.find((s) => s.id === id);
  const skill = await buildSkillFromFile(file, meta, existing?.embedding);

  const index = skills.findIndex((s) => s.id === id);
  if (index >= 0) {
    skills[index] = skill;
  } else {
    skills.push(skill);
  }

  return skill;
}

export function resetStore(): void {
  skills = [];
  metaIndex = {};
  isLoaded = false;
}
```

### Phase 3: File Watcher

**File**: `src/lib/server/skill-watcher.ts`

```typescript
import { watch, type FSWatcher } from "fs";
import { SKILLS_DIR } from "./skill-file-loader";
import { reloadSkill, loadSkills } from "./skill-store";
import { existsSync } from "fs";

let watcher: FSWatcher | null = null;

export function startSkillWatcher(onChange?: (slug: string) => void): void {
  if (watcher) return;

  if (!existsSync(SKILLS_DIR)) {
    console.log("Skills directory does not exist, skipping watcher");
    return;
  }

  watcher = watch(
    SKILLS_DIR,
    { persistent: false, recursive: false },
    async (eventType, filename) => {
      if (!filename || !filename.endsWith(".md")) return;

      const slug = filename.replace(/\.md$/, "");
      console.log(`Skill file changed: ${slug} (${eventType})`);

      try {
        if (eventType === "rename") {
          // File added or removed - full reload
          await loadSkills();
        } else {
          // File changed - reload just this skill
          await reloadSkill(slug);
        }

        onChange?.(slug);
      } catch (error) {
        console.error(`Failed to reload skill ${slug}:`, error);
      }
    },
  );

  watcher.on("error", (error) => {
    console.error("Skill watcher error:", error);
  });

  console.log("Skill file watcher started");
}

export function stopSkillWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log("Skill file watcher stopped");
  }
}
```

### Phase 4: Server Hook Integration

**File**: `src/hooks.server.ts`

Start the watcher on server startup:

```typescript
import { startSkillWatcher } from "$lib/server/skill-watcher";
import { ensureSkillsDirectory } from "$lib/server/skill-file-loader";

// Run on server start
async function initialize() {
  await ensureSkillsDirectory();
  startSkillWatcher((slug) => {
    console.log(`Skill ${slug} reloaded`);
  });
}

initialize().catch(console.error);
```

**File**: `vite.config.ts`

Add skills directory to watch ignore (prevent Vite from reloading):

```typescript
export default defineConfig({
  // ... existing config
  server: {
    watch: {
      ignored: ["**/.nova/**", "**/data/**"],
    },
  },
});
```

### Phase 5: Migration Script

**File**: `scripts/migrate-skills-to-files.ts`

One-time migration from JSON to files:

```typescript
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { existsSync } from "fs";

const OLD_FILE = "./data/skills.json";
const SKILLS_DIR = join(homedir(), ".nova", "skills");
const META_FILE = join(homedir(), ".nova", "skills-meta.json");

interface OldSkill {
  id: string;
  name: string;
  description?: string;
  content: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  embedding?: number[];
}

async function migrate() {
  if (!existsSync(OLD_FILE)) {
    console.log("No skills.json to migrate");
    return;
  }

  const content = await readFile(OLD_FILE, "utf-8");
  const skills: OldSkill[] = JSON.parse(content);

  if (skills.length === 0) {
    console.log("No skills to migrate");
    return;
  }

  await mkdir(SKILLS_DIR, { recursive: true });

  const metaIndex: Record<string, any> = {};

  for (const skill of skills) {
    // Write skill file
    const slug = skill.id.replace(/^skill_/, "").replace(/_\d+$/, "");
    const filePath = join(SKILLS_DIR, `${slug}.md`);

    const frontmatter = [
      `name: ${JSON.stringify(skill.name)}`,
      skill.description && `description: ${JSON.stringify(skill.description)}`,
    ]
      .filter(Boolean)
      .join("\n");

    const fileContent = `---\n${frontmatter}\n---\n\n${skill.content}`;

    await writeFile(filePath, fileContent);
    console.log(`Created: ${filePath}`);

    // Add to meta index
    metaIndex[slug] = {
      enabled: skill.enabled,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
    };
  }

  // Write meta file
  await writeFile(META_FILE, JSON.stringify(metaIndex, null, 2));
  console.log(`Created: ${META_FILE}`);

  // Backup old file
  await writeFile(`${OLD_FILE}.backup`, content);
  console.log(`Backed up: ${OLD_FILE}.backup`);

  console.log(`\nMigrated ${skills.length} skills to ${SKILLS_DIR}`);
}

migrate().catch(console.error);
```

---

## Key Files Summary

| File                                  | Action   | Description                       |
| ------------------------------------- | -------- | --------------------------------- |
| `src/lib/server/skill-file-loader.ts` | Create   | Scan/parse skill files            |
| `src/lib/server/skill-store.ts`       | Refactor | Use files instead of JSON         |
| `src/lib/server/skill-watcher.ts`     | Create   | File system watcher               |
| `src/hooks.server.ts`                 | Modify   | Start watcher on boot             |
| `vite.config.ts`                      | Modify   | Ignore .nova directory            |
| `scripts/migrate-skills-to-files.ts`  | Create   | One-time migration                |
| `src/lib/skills/types.ts`             | Modify   | Add tags, triggers to frontmatter |

---

## Trade-offs

### Flat vs Nested Structure

**Option A**: Flat `~/.nova/skills/*.md`

- Pros: Simple, easy to find files
- Cons: No supporting files per skill

**Option B**: Nested `~/.nova/skills/<name>/SKILL.md`

- Pros: Room for templates, examples per skill
- Cons: More complex navigation

**Recommendation**: Start with flat (Option A), add nested later if needed

### Authority Source

**Option A**: Files are authoritative, meta is secondary

- Pros: Users can edit files directly
- Cons: Need to sync meta carefully

**Option B**: JSON is authoritative, files are export

- Pros: Single source of truth
- Cons: Defeats purpose of file-based

**Recommendation**: Files are authoritative (Option A)

### Backward Compatibility

**Option A**: Auto-migrate existing skills.json

- Pros: Seamless upgrade
- Cons: Complex migration logic

**Option B**: Keep both systems, prefer files

- Pros: No data loss
- Cons: Confusion about which is used

**Recommendation**: Auto-migrate with backup (Option A)

---

## Testing Checklist

- [ ] Create skill writes .md file
- [ ] Update skill updates .md file
- [ ] Delete skill removes .md file
- [ ] Enable/disable updates meta only
- [ ] File changes are detected by watcher
- [ ] New files are auto-loaded
- [ ] Deleted files are removed from memory
- [ ] Frontmatter is parsed correctly
- [ ] Migration script preserves all data
- [ ] Old backup is created
- [ ] Embedding is regenerated on content change
- [ ] Embedding is reused if content unchanged

---

## Future Enhancements

- **Webhook sync**: Sync skills from git repo
- **Import from URL**: Load skill from gist/github
- **Skill packages**: Shareable skill collections
- **Schema validation**: Validate frontmatter fields
- **Draft skills**: `.draft.md` suffix for work-in-progress
