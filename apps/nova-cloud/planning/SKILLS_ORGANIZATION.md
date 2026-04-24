# Skills Organization

**Goal**: Add categories, tags, import/export, and templates to help users manage growing skill collections.

---

## Overview

Current limitations:

- No way to group or categorize skills
- No tagging system for filtering
- No import/export functionality
- No pre-built skill templates

Target features:

- Tags (multi-value) for flexible grouping
- Categories (single-value) for broad organization
- Import/Export for backup and sharing
- Template library for quick skill creation
- Bulk operations for efficiency

---

## Schema Changes

### Extended Skill Interface

**File**: `src/lib/skills/types.ts`

```typescript
export interface Skill {
  id: string;
  name: string;
  description?: string;
  content: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  embedding?: number[];

  // New fields
  tags?: string[]; // e.g., ["code", "review", "python"]
  category?: string; // e.g., "development", "writing", "analysis"
  templateId?: string; // Reference if created from template
  useCount?: number; // Track usage for sorting
}

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  tags?: string[];
  category?: string;
  triggers?: string[];
  priority?: number;
}

// Pre-defined categories
export const SKILL_CATEGORIES = [
  { id: "development", label: "Development", icon: "code" },
  { id: "writing", label: "Writing", icon: "pen" },
  { id: "analysis", label: "Analysis", icon: "chart" },
  { id: "productivity", label: "Productivity", icon: "zap" },
  { id: "creative", label: "Creative", icon: "palette" },
  { id: "research", label: "Research", icon: "search" },
  { id: "other", label: "Other", icon: "folder" },
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number]["id"];
```

---

## Implementation Phases

### Phase 1: UI Filters and Search

**File**: `src/routes/skills/+page.svelte`

Add filtering capabilities:

```svelte
<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import * as Select from '$lib/components/ui/select';
  import { SKILL_CATEGORIES, type Skill } from '$lib/skills/types';

  let skills: Skill[] = $state([]);
  let searchQuery = $state('');
  let selectedCategory = $state<string>('');
  let selectedTags = $state<string[]>([]);

  // Get all unique tags from skills
  const allTags = $derived(() => {
    const tags = new Set<string>();
    for (const skill of skills) {
      skill.tags?.forEach(t => tags.add(t));
    }
    return Array.from(tags).sort();
  });

  // Filtered skills
  const filteredSkills = $derived(() => {
    let result = [...skills];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter(s => s.category === selectedCategory);
    }

    // Tags filter (AND logic - must have all selected tags)
    if (selectedTags.length > 0) {
      result = result.filter(s =>
        selectedTags.every(tag => s.tags?.includes(tag))
      );
    }

    return result;
  });

  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter(t => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
  }

  function clearFilters() {
    searchQuery = '';
    selectedCategory = '';
    selectedTags = [];
  }
</script>

<div class="space-y-4">
  <!-- Filter Bar -->
  <div class="flex flex-wrap gap-2 items-center">
    <Input
      placeholder="Search skills..."
      bind:value={searchQuery}
      class="w-64"
    />

    <Select.Root value={selectedCategory} onValueChange={(v) => selectedCategory = v}>
      <Select.Trigger class="w-40">
        <Select.Value placeholder="Category" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="">All Categories</Select.Item>
        {#each SKILL_CATEGORIES as cat}
          <Select.Item value={cat.id}>{cat.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>

    {#if selectedCategory || selectedTags.length > 0}
      <Button variant="ghost" size="sm" onclick={clearFilters}>
        Clear filters
      </Button>
    {/if}
  </div>

  <!-- Tag Pills -->
  {#if allTags.length > 0}
    <div class="flex flex-wrap gap-1">
      {#each allTags as tag}
        <Badge
          variant={selectedTags.includes(tag) ? 'default' : 'outline'}
          class="cursor-pointer"
          onclick={() => toggleTag(tag)}
        >
          {tag}
        </Badge>
      {/each}
    </div>
  {/if}

  <!-- Skills Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each filteredSkills as skill (skill.id)}
      <!-- Skill card -->
    {/each}
  </div>
</div>
```

### Phase 2: Skill Editor Enhancement

**File**: `src/routes/skills/+page.svelte` (in modal)

Add category and tags fields to the editor:

```svelte
<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';
  import { Badge } from '$lib/components/ui/badge';
  import * as Select from '$lib/components/ui/select';
  import { SKILL_CATEGORIES } from '$lib/skills/types';

  let formData = $state({
    name: '',
    description: '',
    content: '',
    category: '',
    tags: [] as string[],
  });

  let newTag = $state('');

  function addTag() {
    const tag = newTag.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      formData.tags = [...formData.tags, tag];
    }
    newTag = '';
  }

  function removeTag(tag: string) {
    formData.tags = formData.tags.filter(t => t !== tag);
  }

  function handleTagKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  }
</script>

<form class="space-y-4">
  <div>
    <Label for="name">Name</Label>
    <Input id="name" bind:value={formData.name} required />
  </div>

  <div>
    <Label for="description">Description</Label>
    <Input id="description" bind:value={formData.description} />
  </div>

  <div>
    <Label for="category">Category</Label>
    <Select.Root value={formData.category} onValueChange={(v) => formData.category = v}>
      <Select.Trigger>
        <Select.Value placeholder="Select category" />
      </Select.Trigger>
      <Select.Content>
        {#each SKILL_CATEGORIES as cat}
          <Select.Item value={cat.id}>{cat.label}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <div>
    <Label>Tags</Label>
    <div class="flex gap-2 mb-2 flex-wrap">
      {#each formData.tags as tag}
        <Badge variant="secondary" class="cursor-pointer" onclick={() => removeTag(tag)}>
          {tag} ×
        </Badge>
      {/each}
    </div>
    <div class="flex gap-2">
      <Input
        placeholder="Add tag..."
        bind:value={newTag}
        onkeydown={handleTagKeydown}
      />
      <Button type="button" variant="outline" onclick={addTag}>Add</Button>
    </div>
  </div>

  <div>
    <Label for="content">Content</Label>
    <Textarea
      id="content"
      bind:value={formData.content}
      rows={10}
      class="font-mono"
    />
  </div>
</form>
```

### Phase 3: Import/Export

**File**: `src/routes/api/skills/export/+server.ts`

```typescript
import { json } from "@sveltejs/kit";
import { getAllSkills } from "$lib/server/skill-store";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  const skills = getAllSkills();

  // Remove embeddings from export (too large, regenerated on import)
  const exportData = skills.map(({ embedding, ...skill }) => skill);

  const timestamp = new Date().toISOString().split("T")[0];

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="nova-skills-${timestamp}.json"`,
    },
  });
};
```

**File**: `src/routes/api/skills/import/+server.ts`

```typescript
import { json } from "@sveltejs/kit";
import { createSkill } from "$lib/server/skill-store";
import type { RequestHandler } from "./$types";

interface ImportSkill {
  name: string;
  description?: string;
  content: string;
  tags?: string[];
  category?: string;
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const skills: ImportSkill[] = Array.isArray(body) ? body : [body];

  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const skill of skills) {
    try {
      await createSkill(
        skill.name,
        skill.content,
        skill.description,
        skill.tags,
        undefined, // triggers
      );
      results.imported++;
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        results.skipped++;
      } else {
        results.errors.push(`${skill.name}: ${error}`);
      }
    }
  }

  return json(results);
};
```

**UI Component**: `src/lib/components/skills/SkillImportExport.svelte`

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { toast } from 'svelte-sonner';

  let fileInput: HTMLInputElement;
  let isImporting = $state(false);

  async function exportSkills() {
    try {
      const res = await fetch('/api/skills/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nova-skills-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Skills exported successfully');
    } catch (error) {
      toast.error('Failed to export skills');
    }
  }

  async function importSkills(files: FileList) {
    if (!files.length) return;

    isImporting = true;
    try {
      const file = files[0];
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch('/api/skills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      toast.success(`Imported ${result.imported} skills`);
      if (result.skipped > 0) {
        toast.info(`Skipped ${result.skipped} duplicates`);
      }
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} errors during import`);
      }

      // Refresh skills list
      window.location.reload();
    } catch (error) {
      toast.error('Failed to import skills');
    } finally {
      isImporting = false;
    }
  }
</script>

<div class="flex gap-2">
  <Button variant="outline" onclick={exportSkills}>
    <Download class="h-4 w-4 mr-2" />
    Export
  </Button>

  <Button variant="outline" onclick={() => fileInput.click()}>
    <Upload class="h-4 w-4 mr-2" />
    Import
  </Button>

  <input
    type="file"
    accept=".json"
    bind:this={fileInput}
    class="hidden"
    onchange={(e) => importSkills(e.currentTarget.files)}
  />
</div>
```

### Phase 4: Skill Templates

**File**: `src/lib/data/skill-templates.ts`

```typescript
export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
}

export const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    description: "Reviews code for bugs, style, and improvements",
    category: "development",
    tags: ["code", "review", "quality"],
    content: `You are a code reviewer. Analyze code for:

1. **Bugs and Logic Errors**: Identify potential bugs, edge cases, and logical issues
2. **Code Quality**: Check for readability, maintainability, and clean code principles
3. **Performance**: Flag potential performance issues or optimizations
4. **Security**: Identify security vulnerabilities or concerns
5. **Best Practices**: Ensure adherence to language/framework best practices

Format your review with clear sections and actionable suggestions.`,
  },
  {
    id: "technical-writer",
    name: "Technical Writer",
    description: "Helps write clear technical documentation",
    category: "writing",
    tags: ["documentation", "writing", "technical"],
    content: `You are a technical writer specializing in software documentation.

When helping with documentation:
- Use clear, concise language
- Include code examples where helpful
- Structure with headings and bullet points
- Consider the target audience (developers, end users, etc.)
- Add "See also" links for related topics
- Include practical examples and use cases

Formats: README, API docs, tutorials, guides, changelogs.`,
  },
  {
    id: "api-designer",
    name: "API Designer",
    description: "Helps design REST and GraphQL APIs",
    category: "development",
    tags: ["api", "rest", "graphql", "design"],
    content: `You are an API design expert. Help design clean, intuitive APIs.

Principles:
- RESTful conventions and resource naming
- Consistent error handling and status codes
- Versioning strategies
- Authentication and authorization patterns
- Pagination, filtering, and sorting
- Rate limiting considerations

Output in OpenAPI/Swagger format when appropriate.`,
  },
  {
    id: "debugging-assistant",
    name: "Debugging Assistant",
    description: "Helps debug code systematically",
    category: "development",
    tags: ["debug", "troubleshoot", "errors"],
    content: `You are a debugging assistant. Help users systematically debug issues.

Approach:
1. **Understand the Problem**: What's expected vs actual behavior?
2. **Gather Information**: Error messages, logs, reproduction steps
3. **Hypothesize**: What could cause this?
4. **Test**: Suggest debugging steps to verify hypotheses
5. **Fix**: Provide the solution

Ask clarifying questions when needed. Suggest debugging tools and techniques.`,
  },
  {
    id: "git-expert",
    name: "Git Expert",
    description: "Helps with Git commands and workflows",
    category: "development",
    tags: ["git", "version-control", "workflow"],
    content: `You are a Git expert. Help users with:

- Common Git commands and their options
- Branch strategies and workflows (GitFlow, trunk-based, etc.)
- Merge conflicts resolution
- Rebasing and cherry-picking
- Undoing mistakes (reset, revert, reflog)
- GitHub/GitLab/Bitbucket specifics

Always explain what commands do before suggesting them.`,
  },
  {
    id: "research-assistant",
    name: "Research Assistant",
    description: "Helps research and summarize information",
    category: "research",
    tags: ["research", "summary", "analysis"],
    content: `You are a research assistant. Help users:

- Find relevant information on topics
- Summarize long documents or articles
- Compare and contrast options
- Create structured research notes
- Identify key points and insights
- Suggest additional sources to explore

Be thorough but concise. Cite sources when possible.`,
  },
];

export function getTemplatesByCategory(): Record<string, SkillTemplate[]> {
  const result: Record<string, SkillTemplate[]> = {};
  for (const template of SKILL_TEMPLATES) {
    if (!result[template.category]) {
      result[template.category] = [];
    }
    result[template.category].push(template);
  }
  return result;
}
```

**UI Component**: `src/lib/components/skills/SkillTemplateGallery.svelte`

```svelte
<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { SKILL_TEMPLATES, getTemplatesByCategory, type SkillTemplate } from '$lib/data/skill-templates';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (template: SkillTemplate) => void;
  }

  let { open, onOpenChange, onSelect }: Props = $props();

  let selectedCategory = $state<string | null>(null);
  const templatesByCategory = getTemplatesByCategory();
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Content class="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
    <Dialog.Header>
      <Dialog.Title>Choose a Template</Dialog.Title>
      <Dialog.Description>
        Start with a pre-built skill template
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex gap-2 mb-4 flex-wrap">
      <Button
        variant={selectedCategory === null ? 'default' : 'outline'}
        size="sm"
        onclick={() => selectedCategory = null}
      >
        All
      </Button>
      {#each Object.keys(templatesByCategory) as category}
        <Button
          variant={selectedCategory === category ? 'default' : 'outline'}
          size="sm"
          onclick={() => selectedCategory = category}
        >
          {category}
        </Button>
      {/each}
    </div>

    <div class="flex-1 overflow-auto">
      <div class="grid gap-3">
        {#each SKILL_TEMPLATES as template}
          {#if !selectedCategory || template.category === selectedCategory}
            <button
              class="text-left p-4 border rounded-lg hover:bg-accent transition-colors"
              onclick={() => {
                onSelect(template);
                onOpenChange(false);
              }}
            >
              <div class="font-medium mb-1">{template.name}</div>
              <div class="text-sm text-muted-foreground mb-2">
                {template.description}
              </div>
              <div class="flex gap-1 flex-wrap">
                {#each template.tags as tag}
                  <Badge variant="secondary" class="text-xs">{tag}</Badge>
                {/each}
              </div>
            </button>
          {/if}
        {/each}
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
```

### Phase 5: Bulk Operations

**File**: `src/routes/skills/+page.svelte`

Add bulk selection and actions:

```svelte
<script lang="ts">
  let selectedIds = $state<Set<string>>(new Set());
  let isBulkMode = $state(false);

  function toggleSelectAll() {
    if (selectedIds.size === filteredSkills.length) {
      selectedIds = new Set();
    } else {
      selectedIds = new Set(filteredSkills.map(s => s.id));
    }
  }

  function toggleSelect(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    selectedIds = newSet;
  }

  async function bulkEnable(enabled: boolean) {
    for (const id of selectedIds) {
      await fetch(`/api/skills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
    }
    selectedIds = new Set();
    await loadSkills();
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} skills?`)) return;

    for (const id of selectedIds) {
      await fetch(`/api/skills/${id}`, { method: 'DELETE' });
    }
    selectedIds = new Set();
    await loadSkills();
  }
</script>

<!-- Bulk actions bar -->
{#if selectedIds.size > 0}
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex gap-2 items-center">
    <span>{selectedIds.size} selected</span>
    <Button variant="secondary" size="sm" onclick={() => bulkEnable(true)}>
      Enable
    </Button>
    <Button variant="secondary" size="sm" onclick={() => bulkEnable(false)}>
      Disable
    </Button>
    <Button variant="destructive" size="sm" onclick={bulkDelete}>
      Delete
    </Button>
    <Button variant="ghost" size="sm" onclick={() => selectedIds = new Set()}>
      Cancel
    </Button>
  </div>
{/if}
```

---

## Key Files Summary

| File                                                    | Action | Description                    |
| ------------------------------------------------------- | ------ | ------------------------------ |
| `src/lib/skills/types.ts`                               | Modify | Add tags, category, templateId |
| `src/lib/server/skill-store.ts`                         | Modify | Store new fields               |
| `src/routes/skills/+page.svelte`                        | Modify | Add filters, bulk ops          |
| `src/routes/api/skills/export/+server.ts`               | Create | Export endpoint                |
| `src/routes/api/skills/import/+server.ts`               | Create | Import endpoint                |
| `src/lib/components/skills/SkillImportExport.svelte`    | Create | Import/export UI               |
| `src/lib/components/skills/SkillTemplateGallery.svelte` | Create | Template picker                |
| `src/lib/data/skill-templates.ts`                       | Create | Built-in templates             |

---

## Trade-offs

### Tags vs Categories

- **Tags**: Multi-value, flexible, user-defined
- **Categories**: Single-value, pre-defined, broad grouping

**Recommendation**: Use both - categories for broad grouping, tags for detailed filtering

### Template Storage

**Option A**: Built-in templates in code

- Pros: Always available, version controlled
- Cons: Can't add custom templates

**Option B**: Templates as regular skills in separate folder

- Pros: User can customize
- Cons: More complex

**Recommendation**: Start with built-in (Option A), add custom templates later

### Import Behavior

**Option A**: Skip duplicates silently

- Pros: Simple, no conflicts
- Cons: Can't update existing

**Option B**: Prompt for each duplicate

- Pros: User control
- Cons: Tedious for large imports

**Option C**: Overwrite duplicates

- Pros: Easy updates
- Cons: Can lose changes

**Recommendation**: Skip by default, add "overwrite" option

---

## Testing Checklist

- [ ] Search filters skills correctly
- [ ] Category filter works
- [ ] Tag filter (AND logic) works
- [ ] Multiple filters combine correctly
- [ ] Clear filters resets all
- [ ] Export downloads JSON file
- [ ] Import creates new skills
- [ ] Import skips duplicates
- [ ] Template gallery shows templates
- [ ] Template selection populates form
- [ ] Bulk select all/deselect all
- [ ] Bulk enable/disable works
- [ ] Bulk delete with confirmation

---

## Future Enhancements

- **Skill collections**: Group skills into shareable packages
- **Remote templates**: Load templates from URL/gist
- **Smart suggestions**: Suggest tags based on content
- **Tag management**: Rename/merge tags across skills
- **Export formats**: Markdown, YAML in addition to JSON
- **Skill analytics**: Track which skills are most useful
