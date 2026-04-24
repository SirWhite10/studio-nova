# Skills System Testing Plan

## Overview

End-to-end testing strategy for the Skills system using Playwright and git worktrees for isolated test environments.

---

## 1. Architecture

### Worktree Structure

```
nova-sveltekit/              # Main development worktree (port 5173)
nova-sveltekit-test/        # Single persisted test worktree (port 5174)
```

### Data Isolation

- Test worktree uses separate `NOVA_DATA_DIR` environment variable
- Path: `~/.nova-test-skills/` (Linux/Mac) or `%APPDATA%/nova-test-skills/` (Windows)
- Each test file creates/cleans its own test skills with unique names

### Rationale: Single Persisted Worktree

- **Speed**: No worktree creation overhead (10-15s savings per run)
- **Simplicity**: One dev server to manage, one cleanup procedure
- **Isolation**: Test data isolation via NOVA_DATA_DIR + unique skill names
- **Flexibility**: Tests can share state if needed (e.g., UI test creates skill, chat test uses it)

---

## 2. Prerequisites

### Required Dependencies

Already in `package.json`:

- `@playwright/test` v1.58.2
- `playwright` v1.58.2

### Install Playwright Browsers

```bash
npx playwright install chromium
```

### Git Worktree Setup (One-time)

```bash
# Create persistent test worktree from current branch
cd /home/sir/Nova_Projects
git worktree add -B test/skills-e2e nova-sveltekit-test

# Enter test worktree
cd nova-sveltekit-test

# Install dependencies (same as main)
npm install
```

---

## 3. Playwright Configuration

### Update `playwright.config.ts`

Add multi-project configuration:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "../nova-sveltekit/tests", // Relative to worktree root
  fullyParallel: false, // Sequential execution to share state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
    screenshot: "on",
  },
  projects: [
    {
      name: "skills-ui",
      testMatch: "skills-ui.spec.ts",
    },
    {
      name: "skills-search",
      testMatch: "skills-search.spec.ts",
    },
    {
      name: "skills-chat",
      testMatch: "skills-chat.spec.ts",
    },
  ],
});
```

**Note:** All tests run against `localhost:5174` (test worktree dev server). Use `testMatch` to assign each spec to a project.

---

## 4. Environment Management

### Test Worktree Dev Server

Create `scripts/serve-test.sh`:

```bash
#!/bin/bash
# Start dev server on port 5174 with isolated data dir
export NOVA_DATA_DIR="${HOME}/.nova-test-skills"
export PORT=5174
cd "$(dirname "$0")/../nova-sveltekit-test"
npm run dev
```

Or use environment override directly:

```bash
NOVA_DATA_DIR=~/.nova-test-skills PORT=5174 npm run dev
```

### CI/CD

Set `NOVA_DATA_DIR` in GitHub Actions workflow:

```yaml
- name: Start test server
  run: |
    NOVA_DATA_DIR=/tmp/nova-test-data PORT=5174 npm run dev &
    sleep 5  # Wait for server
```

---

## 5. Test Data Isolation Strategy

### Unique Skill Names

Each test generates unique skill names using timestamps or UUIDs:

```typescript
const uniqueName = `test-skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

### Lifecycle: Create → Test → Cleanup

```typescript
test.describe("Skills CRUD", () => {
  let createdSkillIds: string[] = [];

  test.beforeEach(async () => {
    // Create fresh test skill for each test
    const skill = await createTestSkill(uniqueName());
    createdSkillIds.push(skill.id);
  });

  test.afterEach(async () => {
    // Clean up only what we created
    for (const id of createdSkillIds) {
      await deleteTestSkill(id);
    }
    createdSkillIds = [];
  });

  test("should create and display skill", async ({ page }) => {
    // Test uses freshly created skill
  });
});
```

### API Helper Functions

Create `tests/skills/fixtures/api.ts` with typed wrappers:

```typescript
export async function createTestSkill(name: string, content?: string) {
  const response = await fetch("http://localhost:5174/api/skills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, content: content ?? defaultSkillContent(name) }),
  });
  return await response.json();
}

export async function deleteTestSkill(id: string) {
  await fetch(`http://localhost:5174/api/skills/${id}`, { method: "DELETE" });
}
```

---

## 6. Test File Structure

```
tests/
├── skills/
│   ├── fixtures/
│   │   ├── api.ts             # API helper functions
│   │   ├── test-skills.ts     # Sample skill content templates
│   │   └── types.ts           # Shared TypeScript types
│   ├── skills-ui.spec.ts      # CRUD operations via UI
│   ├── skills-search.spec.ts  # Semantic search functionality
│   └── skills-chat.spec.ts    # Chat integration
├── test-debug-chat-next.spec.ts (existing)
├── test-chat-routing.spec.ts (existing)
└── routing-errors.spec.ts (existing)
```

---

## 7. Test Cases

### 7.1 skills-ui.spec.ts

**Purpose**: Verify UI can create, edit, delete, and toggle skills.

**Coverage**:

- [ ] Skills page loads with empty state when no skills exist
- [ ] "Create Skill" button opens modal
- [ ] Can create new skill with valid frontmatter (name, description, content)
- [ ] Skill appears in list after creation
- [ ] Validation: shows error for missing required frontmatter fields
- [ ] Edit button opens modal with pre-filled data
- [ ] Editing skill updates content and list reflects changes
- [ ] Delete confirmation modal appears
- [ ] Deleting skill removes it from list
- [ ] Enable/disable toggle instantly updates skill enabled state
- [ ] Pagination/infinite scroll (if implemented)

**Test Data**: Dynamic per-test creation; no pre-seeded data required.

---

### 7.2 skills-search.spec.ts

**Purpose**: Verify semantic search finds relevant skills.

**Coverage**:

- [ ] Search returns skills ranked by relevance
- [ ] Semantic matching works (e.g., "python" matches "javascript" via vector similarity)
- [ ] Search handles no results gracefully (shows "No skills found")
- [ ] Search is case-insensitive
- [ ] Search updates as user types (debounced)
- [ ] Search highlights matching text (if implemented)

**Test Data**:
Pre-create a set of diverse skills:

```typescript
await createTestSkill("python-expert", pythonSkillContent);
await createTestSkill("javascript-tutor", jsSkillContent);
await createTestSkill("code-reviewer", reviewSkillContent);
```

---

### 7.3 skills-chat.spec.ts

**Purpose**: Verify chat integration: skills injected into system prompt and used by LLM.

**Coverage**:

- [ ] When a relevant skill exists, it appears in the system prompt (inspect via API/mock)
- [ ] LLM follows skill instructions in its responses (assert on response content)
- [ ] Sentiment skill changes tone of responses
- [ ] Code reviewer skill analyzes code snippets
- [ ] `/skill-name` slash command manually invokes skill (even if not semantically relevant)
- [ ] Disabled skills are NOT injected into system prompt
- [ ] Multiple relevant skills are all injected (top 3)

**Test Data**:
Pre-create specific skills before chat tests:

```typescript
const codeReviewSkill = await createTestSkill("code-reviewer", codeReviewContent);
const pythonTutorSkill = await createTestSkill("python-tutor", pythonTutor);
```

**Mocking Strategy**:
Use real API calls to local LLM (OpenRouter or local model). If slow, mock only the embedding step, but keep full chat for realism.

---

## 8. NPM Scripts

Add to `package.json` (main worktree):

```json
{
  "scripts": {
    "test:e2e:skills": "cd ../nova-sveltekit-test && npx playwright test --project=skills-ui,skills-search,skills-chat",
    "test:e2e:skills:ui": "cd ../nova-sveltekit-test && npx playwright test skills-ui",
    "test:e2e:skills:search": "cd ../nova-sveltekit-test && npx playwright test skills-search",
    "test:e2e:skills:chat": "cd ../nova-sveltekit-test && npx playwright test skills-chat",
    "serve:test": "NOVA_DATA_DIR=~/.nova-test-skills PORT=5174 npm run dev",
    "test:e2e:setup": "git worktree add ../nova-sveltekit-test -B test/skills-e2e 2>/dev/null || echo 'Worktree already exists'"
  }
}
```

**Workflow**:

```bash
# 1. Setup worktree (once)
npm run test:e2e:setup
cd nova-sveltekit-test && npm install && cd ..

# 2. Start test server in one terminal
npm run serve:test

# 3. Run tests in another terminal
npm run test:e2e:skills
```

---

## 9. Implementation Order

### Phase 1: Test Infrastructure (Day 0)

1. Create `nova-sveltekit-test` worktree
2. Install dependencies in worktree
3. Update `playwright.config.ts` in worktree (use project-based config)
4. Create test fixtures (`tests/skills/fixtures/`)
5. Add helper functions (`createTestSkill`, `deleteTestSkill`, etc.)
6. Verify `NOVA_DATA_DIR` override works with skills manager

### Phase 2: UI Tests (Day 1-2)

1. Write `skills-ui.spec.ts`
2. Test skill creation via API + verify UI updates
3. Test editing, deleting, toggling
4. Run full suite iteratively

### Phase 3: Search Tests (Day 3)

1. Write `skills-search.spec.ts`
2. Pre-create test skills with known embeddings
3. Test semantic search queries
4. Verify ranking and no-results cases

### Phase 4: Chat Integration (Day 4-5)

1. Write `skills-chat.spec.ts`
2. Create skill that modifies chat behavior
3. Send chat message and assert skill influenced response
4. Test slash command manual invocation
5. Test disabled skill exclusion

### Phase 5: CI/CD (Optional)

1. Add GitHub Actions workflow
2. Ensure worktree setup in CI
3. Cache npm dependencies
4. Parallelize if needed (multiple worktrees)

---

## 10. CI/CD Integration

### GitHub Actions Workflow

```yaml
name: E2E Skills Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Create test worktree
        run: |
          git worktree add -B test/e2e nova-sveltekit-test
          cd nova-sveltekit-test
          npm ci

      - name: Start test server
        run: |
          cd nova-sveltekit-test
          NOVA_DATA_DIR=/tmp/nova-test-data PORT=5174 npm run dev &
          echo $! > server.pid
          # Wait for server
          npx playwright install-deps
          npx playwright wait-for-server http://localhost:5174 --timeout=30000

      - name: Run E2E tests
        if: always()
        run: |
          cd nova-sveltekit-test
          NOVA_DATA_DIR=/tmp/nova-test-data npx playwright test --project=skills-ui,skills-search,skills-chat

      - name: Stop server
        if: always()
        run: |
          kill $(cat nova-sveltekit-test/server.pid) || true

      - name: Upload traces on failure
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-traces
          path: nova-sveltekit-test/playwright-report/
```

---

## 11. Debugging Tips

### Run Single Test with Debugger

```bash
cd nova-sveltekit-test
npx playwright test skills-chat.spec.ts --debug
```

### Visual Mode

```bash
npx playwright test --headed --slowmo=1000
```

### Inspect Test Data

Test data lives in `~/.nova-test-skills/skills/` (or custom `NOVA_DATA_DIR`). You can inspect files directly:

```bash
ls ~/.nova-test-skills/skills/
cat ~/.nova-test-skills/skills/<skill-id>/SKILL.md
```

### Reset Everything

```bash
# Remove test data
rm -rf ~/.nova-test-skills

# Remove worktree
git worktree remove nova-sveltekit-test

# Recreate
npm run test:e2e:setup
```

---

## 12. Future Improvements

- **Parallel testing**: If tests become fully isolated, run them in parallel with multiple worktrees on different ports
- **Video recording**: Add `video: 'on'` in Playwright config for failed tests
- **Test generation**: Use LLM to generate edge case skills automatically
- **Performance metrics**: Measure skill search latency, chat response times
- **Mock embeddings**: Speed up tests by mocking embedding generation in CI

---

## 13. Checklist Before Starting

- [ ] `git worktree add ../nova-sveltekit-test` succeeds
- [ ] `nova-sveltekit-test` dev server starts on port 5174
- [ ] `NOVA_DATA_DIR` override works (skills saved to `~/.nova-test-skills/`)
- [ ] Playwright config recognizes `testDir` outside worktree
- [ ] API endpoints for skills CRUD are stable (`/api/skills`)
- [ ] Skills manager initializes without errors in test environment
- [ ] Chat API route exists (`/api/chat/[id]`) and accepts messages

---

## 14. Success Criteria

- ✅ All UI tests pass: create/edit/delete/toggle work reliably
- ✅ Search tests return expected skills with correct ranking
- ✅ Chat integration: skills injected and followed by LLM
- ✅ Tests are isolated: no leftover test data affects subsequent runs
- ✅ CI runs tests in <10 minutes (with caching)
- ✅ Developer can run `npm run test:e2e:skills` and see green

---

## Appendix: Sample Fixture Code

### `tests/skills/fixtures/test-skills.ts`

```typescript
export function codeReviewerSkill(): string {
  return `---
name: Code Reviewer
description: Reviews code for issues
---
You are a senior code reviewer. For any code provided:
1. Check for security vulnerabilities
2. Suggest performance improvements
3. Ensure adherence to best practices
4. Recommend tests if missing

Be concise and actionable.`;
}

export function pythonTutorSkill(): string {
  return `---
name: Python Tutor
description: Explains Python concepts
---
You are a patient Python tutor. Explain concepts clearly with examples.
If the user provides code, explain what it does and suggest improvements.
Use simple language for beginners.`;
}
```

---

**Next Step**: Implement Phase 1 (Test Infrastructure) before starting Skills system implementation. This ensures we have test coverage from day 1.
