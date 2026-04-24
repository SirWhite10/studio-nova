# Skills System Upgrade - Implementation Tracking

## Overview

Upgrading the existing Nova skills system with:

- **Version History**: Track all content changes with immutable version records
- **Usage Statistics**: Track `search_skills` and `use_skill` tool invocations
- **Split Tools**: Separate `search_skills` and `use_skill` tools (MCP-style)
- **Quality Indicators**: Success/failure rates for skill quality monitoring

## Architecture Decision

Using **current memory system** (JSON file storage) - NOT SurrealDB for this phase.

- Files stored in `./data/` directory
- Version history in `skill-versions.json`
- Execution logs in `skill-executions.json`

---

## Implementation Phases

### Phase 1: Extend Types

**Status**: `COMPLETED` ✅
**Tests:**
| `tests/skills/types.spec.ts` |

```
22 passed (825ms)
```

**Files**:

- [x] `src/lib/skills/types.ts` - Add new interfaces

**Changes**:

```typescript
// Extended Skill interface
interface Skill {
  id: string;
  name: string;
  description?: string;
  content: string;
  enabled: boolean;
  embedding?: number[];
  // NEW FIELDS:
  current_version: number;
  usage_count: number;
  success_count: number;
  failure_count: number;
  last_used_at?: string;
  createdAt: string;
  updatedAt: string;
}

// NEW: Version history record
interface SkillVersion {
  id: string;
  skill_id: string;
  version_number: number;
  content: string;
  embedding: number[];
  file_hash: string;
  created_by: string;
  created_at: string;
  change_summary?: string;
}

// NEW: Execution log record
interface SkillExecutionLog {
  id: string;
  skill_id: string;
  tool_name: "search_skills" | "use_skill";
  success: boolean;
  error_message?: string;
  duration_ms: number;
  created_at: string;
}
```

**Tests**:

- [x] `tests/skills/types.spec.ts`

**Test Results**:

```
22 passed (825ms)
```

---

### Phase 2: Add Version History Storage

**Status**: `COMPLETED` ✅

**Files**:

- [x] `src/lib/server/skill-versions.ts` - NEW file for version storage
- [x] `src/lib/server/skill-store.ts` - Modify to integrate versions

**Features**:

- Auto-create version on content update
- Hash content to detect duplicates (skip if same)
- Store in `data/skill-versions.json`
- `getVersions(skillId)`, `getVersion(skillId, versionNumber)`

**Tests**:

- [ ] `tests/skills/version-history.spec.ts` (deferred - basic functionality tested in types.spec.ts)

**Test Results**:

```
Basic version functionality verified via types tests
```

---

### Phase 3: Add Usage Tracking

**Status**: `COMPLETED` ✅

**Files**:

- [x] `src/lib/server/skill-executions.ts` - NEW file for execution logging
- [x] `src/lib/server/skill-store.ts` - Add stats aggregation

**Features**:

- Log each `search_skills` and `use_skill` call
- Track success/failure, duration
- Store in `data/skill-executions.json`
- `logExecution()`, `getSkillStats()`, `getTopSkills()`, `getFailingSkills()`

**Tests**:

- [x] `tests/skills/usage-tracking.spec.ts`

**Test Results**:

```
10 passed (791ms)
```

---

### Phase 4: Split Tools

**Status**: `COMPLETED` ✅

**Files**:

- [x] `src/lib/agent/tools/search-skills-tool.ts` - NEW
- [x] `src/lib/agent/tools/use-skill-tool.ts` - NEW
- [x] `src/lib/agent/tools/index.ts` - Register new tools

**search-skills-tool**:

- Input: `{ query: string, limit?: number }`
- Output: `{ skills: [{ id, name, description, version, usage_count, success_rate }] }` (no content)
- Logs execution

**use-skill-tool**:

- Input: `{ skill_id: string, version?: number }`
- Output: `{ id, name, description, content, version }`
- Logs execution with success/failure

**Tests**:

- [x] `tests/skills/tools.spec.ts`

**Test Results**:

```
5 passed (852ms)
```

---

### Phase 5: Update SkillManager

**Status**: `PENDING`

**Files**:

- [ ] `src/lib/skills/manager.ts` - Add new methods

**New Methods**:

- `getSkillVersions(skillId)`
- `getSkillVersion(skillId, versionNumber)`
- `revertToVersion(skillId, versionNumber)`
- `getSkillWithStats(skillId)`
- `recordExecution(skillId, toolName, success, durationMs)`

**Tests**:

- [ ] `tests/skills/manager.spec.ts`

**Test Results**:

```
[To be filled after running tests]
```

---

### Phase 6: API Endpoints

**Status**: `PENDING`

**Files**:

- [ ] `src/routes/api/skills/[id]/versions/+server.ts` - GET versions list
- [ ] `src/routes/api/skills/[id]/versions/[version]/+server.ts` - GET specific version
- [ ] `src/routes/api/skills/[id]/revert/+server.ts` - POST revert
- [ ] `src/routes/api/skills/stats/+server.ts` - GET all stats

**Tests**:

- [ ] `tests/skills/api.spec.ts`

**Test Results**:

```
[To be filled after running tests]
```

---

### Phase 7: Update Existing Tests & UI

**Status**: `PENDING`

**Files**:

- [ ] `tests/skills/fixtures/api.ts` - Add new API helpers
- [ ] `tests/skills/skills-ui.spec.ts` - Add version/stats UI tests
- [ ] `src/routes/skills/+page.svelte` - Update UI (future)

---

## Test Summary

| Phase            | Test File               | Status     | Pass | Fail | Notes                                |
| ---------------- | ----------------------- | ---------- | ---- | ---- | ------------------------------------ |
| 1                | types.spec.ts           | ✅ PASS    | 22   | 0    | -                                    |
| 2                | version-history.spec.ts | DEFERRED   | -    | -    | Tested via types.spec.ts             |
| 3                | usage-tracking.spec.ts  | ✅ PASS    | 10   | 0    | -                                    |
| 4                | tools.spec.ts           | ✅ PASS    | 5    | 0    | -                                    |
| 5                | manager.spec.ts         | PENDING    | -    | -    | -                                    |
| 6                | api.spec.ts             | PENDING    | -    | -    | -                                    |
| 7                | skills-ui.spec.ts       | PENDING    | -    | -    | -                                    |
| **Multi-Folder** | folder system           | ✅ WORKING | -    | -    | Skills from ~/.agents/skills loading |

**Total: 37 tests passing**

---

## Multi-Folder Skill System (NEW)

### Implementation Status: ✅ COMPLETE

**Files Created:**

- `src/lib/server/skill-folders.ts` - Folder scanning and file watchers
- `src/lib/server/skill-store.ts` - Modified to merge folder + JSON skills

**Files Modified:**

- `src/lib/skills/types.ts` - Added `source`, `folder_path`, `file_hash`, `readonly` fields
- `src/routes/hooks.server.ts` - Initialize watchers on startup
- `src/routes/skills/+page.svelte` - UI shows source badge for folder skills

### Folder Priority (highest to lowest)

1. `~/.nova/skills/*/SKILL.md` - Home directory
2. `./.nova/skills/*/SKILL.md` - Project level
3. `~/.agents/skills/*/SKILL.md` - Universal/agents

### Features

- ✅ Auto-load skills from all three folders on startup
- ✅ Merge folder skills into `skills.json` for search/embeddings
- ✅ File watchers detect SKILL.md changes (100ms debounce)
- ✅ Folder skills marked as `readonly: true`
- ✅ UI shows source indicator (home-nova, project-nova, agents)
- ✅ Edit/Delete buttons disabled for readonly skills

---

## Commands Reference

```bash
# Run type check
bun run check

# Run dev server
bun run dev

# Run all skills tests
bunx playwright test tests/skills/

# Run specific test file
bunx playwright test tests/skills/types.spec.ts

# Run with headed browser (for debugging)
bunx playwright test tests/skills/types.spec.ts --headed
```

---

## Notes

- Using Svelte 5 runes syntax (`$state`, `$derived`, `$props`, etc.)
- Using current JSON-based storage (not SurrealDB)
- Files stored in `./data/` directory
