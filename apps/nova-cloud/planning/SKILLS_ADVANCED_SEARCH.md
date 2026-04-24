# Skills Advanced Search

**Goal**: Improve skill search with thresholds, hybrid ranking, keyword triggers, and conditional activation.

---

## Overview

Current limitations:

- Returns top N results regardless of similarity score
- No way to filter out irrelevant skills
- No keyword boost for exact matches
- No conditional activation rules
- Duplicated cosine similarity code

Target features:

- Similarity threshold (only inject if score > 0.4)
- Return scores for transparency
- Keyword trigger matching (boost on exact words)
- Hybrid search (semantic + keyword)
- Conditional activation rules
- Usage tracking for ranking boost

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

  // Advanced search fields
  triggers?: string[]; // Keywords that boost this skill
  contexts?: string[]; // Only activate in these contexts
  priority?: number; // Manual boost: 0-10, default 5
  useCount?: number; // How many times activated
  lastUsedAt?: string; // For recency boost
}

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  tags?: string[];
  category?: string;
  triggers?: string[]; // e.g., ["review", "pr", "code"]
  contexts?: string[]; // e.g., ["chat", "code", "research"]
  priority?: number; // 0-10, default 5
}

// Search result with scores
export interface SkillSearchResult {
  skill: Skill;
  score: number; // Final combined score (0-1)
  semanticScore: number; // Embedding similarity
  keywordScore: number; // Trigger match score
  matchedTriggers?: string[]; // Which triggers matched
}

// Search options
export interface SkillSearchOptions {
  limit?: number; // Default: 3
  threshold?: number; // Minimum score, default: 0.4
  context?: string; // Filter by context
  includeScores?: boolean; // Return SearchResult instead of Skill
}
```

---

## Implementation Phases

### Phase 1: Threshold and Score Returns

**File**: `src/lib/skills/manager.ts`

Refactor `searchSkills` to support thresholds and return scores:

```typescript
import type { Skill, SkillSearchResult, SkillSearchOptions } from './types';

// Consolidated cosine similarity (remove duplicate from embeddings.ts)
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// Keyword matching score
function calculateKeywordScore(query: string, triggers: string[] = []): {
  score: number;
  matched: string[];
} {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  const matched: string[] = [];
  let matchCount = 0;

  for (const trigger of triggers) {
    const triggerLower = trigger.toLowerCase();

    // Exact match
    if (queryLower.includes(triggerLower)) {
      matched.push(trigger);
      matchCount += 1;
    }
    // Word-level match
    else if (queryWords.some(w => w === triggerLower)) {
      matched.push(trigger);
      matchCount += 0.5;
    }
  }

  // Score based on how many triggers matched
  const score = triggers.length > 0
    ? Math.min(1, matchCount / triggers.length)
    : 0;

  return { score, matched };
}

// Hybrid search combining semantic + keyword
async function hybridSearch(
  query: string,
  skills: Skill[],
  options: SkillSearchOptions = {}
): Promise<SkillSearchResult[]> {
  const {
    threshold = 0.4,
    context,
  } = options;

  // Filter by context if specified
  let candidateSkills = skills;
  if (context) {
    candidateSkills = skills.filter(s =>
      !s.contexts || s.contexts.length === 0 || s.contexts.includes(context)
    );
  }

  // Filter to skills with embeddings
  const skillsWithEmbedding = candidateSkills.filter(s => s.embedding);
  if (skillsWithEmbedding.length === 0) {
    return [];
  }

  // Generate query embedding
  const queryEmbedding = await embeddingsGenerator.generate(query);

  // Score each skill
  const results: SkillSearchResult[] = [];

  for (const skill of skillsWithEmbedding) {
    // Semantic score (cosine similarity)
    const semanticScore = cosineSimilarity(queryEmbedding, skill.embedding!);

    // Keyword score (trigger matching)
    const { score: keywordScore, matched } = calculateKeywordScore(
      query,
      skill.triggers
    );

    // Priority boost (0-10 scale normalized to 0-0.2)
    const priorityBoost = ((skill.priority ?? 5) - 5) / 25; // -0.2 to +0.2

    // Usage boost (logarithmic, caps at +0.1)
    const usageBoost = Math.min(0.1, Math.log10((skill.useCount ?? 0) + 1) * 0.05);

    // Combined score
    const finalScore = Math.min(1, Math.max(0,
      0.6 * semanticScore +
      0.2 * keywordScore +
      priorityBoost +
      usageBoost
    ));

    // Only include if above threshold
    if (finalScore >= threshold) {
      results.push({
        skill,
        score: finalScore,
        semanticScore,
        keywordScore,
        matchedTriggers: matched.length > 0 ? matched : undefined,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

// Updated searchSkills method
async searchSkills(
  query: string,
  options: SkillSearchOptions | number = {}
): Promise<Skill[] | SkillSearchResult[]> {
  // Backward compatibility: number param = limit
  const opts: SkillSearchOptions = typeof options === 'number'
    ? { limit: options }
    : options;

  const { limit = 3, includeScores = false } = opts;

  if (!query.trim()) {
    return [];
  }

  const skills = storeGetEnabled();
  const results = await hybridSearch(query, skills, opts);

  if (includeScores) {
    return results.slice(0, limit);
  }

  return results.slice(0, limit).map(r => r.skill);
}

// Get search results with scores
async searchSkillsWithScores(
  query: string,
  options: SkillSearchOptions = {}
): Promise<SkillSearchResult[]> {
  return this.searchSkills(query, { ...options, includeScores: true }) as Promise<SkillSearchResult[]>;
}
```

### Phase 2: Context-Based Activation

**File**: `src/lib/skills/types.ts`

Define available contexts:

```typescript
export const SKILL_CONTEXTS = [
  { id: "chat", label: "General Chat", description: "Default conversation mode" },
  { id: "code", label: "Code Discussion", description: "Discussing or writing code" },
  { id: "research", label: "Research", description: "Finding and analyzing information" },
  { id: "writing", label: "Writing", description: "Creating documents or content" },
  { id: "debug", label: "Debugging", description: "Troubleshooting issues" },
  { id: "planning", label: "Planning", description: "Project or task planning" },
] as const;

export type SkillContext = (typeof SKILL_CONTEXTS)[number]["id"];
```

**File**: `src/lib/agent/index.ts`

Detect context from conversation and pass to skill search:

````typescript
function detectContext(messages: Message[]): string | undefined {
  // Simple heuristics for context detection
  const recentMessages = messages.slice(-5);
  const text = recentMessages
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  // Code context indicators
  if (/```|function|class|import|export|def |const |let |var /.test(text)) {
    return "code";
  }

  // Debug context indicators
  if (/error|bug|fix|debug|exception|stack trace|not working/.test(text)) {
    return "debug";
  }

  // Research context indicators
  if (/research|find|search|look up|what is|explain/.test(text)) {
    return "research";
  }

  // Writing context indicators
  if (/write|draft|document|article|blog|email/.test(text)) {
    return "writing";
  }

  // Planning context indicators
  if (/plan|roadmap|schedule|task|todo|next steps/.test(text)) {
    return "planning";
  }

  return undefined;
}

// In processMessage():
const context = detectContext(messages);
const relevantSkills = await skillManager.searchSkills(userMessage, {
  limit: 3,
  threshold: 0.4,
  context,
});
````

### Phase 3: Usage Tracking

**File**: `src/lib/skills/manager.ts`

Track skill usage:

```typescript
async recordSkillUsage(skillId: string): Promise<void> {
  const skill = storeGetById(skillId);
  if (!skill) return;

  skill.useCount = (skill.useCount ?? 0) + 1;
  skill.lastUsedAt = new Date().toISOString();

  // Persist to store
  await storeUpdate(skillId, {
    useCount: skill.useCount,
    lastUsedAt: skill.lastUsedAt,
  });
}
```

**File**: `src/lib/agent/index.ts`

Record usage when skill is activated:

```typescript
// After building skills context
for (const skill of relevantSkills) {
  await skillManager.recordSkillUsage(skill.id);
}
```

### Phase 4: Search API Enhancement

**File**: `src/routes/api/skills/search/+server.ts`

```typescript
import { json } from "@sveltejs/kit";
import { getSkillManager } from "$lib/skills";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get("q") || "";
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);
  const threshold = parseFloat(url.searchParams.get("threshold") || "0.3");
  const context = url.searchParams.get("context") || undefined;
  const includeScores = url.searchParams.get("scores") === "true";

  const manager = getSkillManager();
  await manager.initialize();

  const results = await manager.searchSkills(query, {
    limit,
    threshold,
    context,
    includeScores,
  });

  return json(results);
};
```

Example requests:

```
GET /api/skills/search?q=review&threshold=0.5&scores=true
GET /api/skills/search?q=python&context=code&limit=5
```

### Phase 5: Deduplication of Cosine Similarity

**File**: `src/lib/memory/embeddings.ts`

Remove the duplicate implementation, export from one place:

```typescript
// Keep only the class method, add a standalone export
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// In EmbeddingsGenerator class, use the standalone function
class EmbeddingsGenerator {
  // ... other methods

  cosineSimilarity(a: number[], b: number[]): number {
    return cosineSimilarity(a, b);
  }
}
```

**File**: `src/lib/skills/manager.ts`

Import from embeddings instead of duplicating:

```typescript
import { cosineSimilarity } from "$lib/memory/embeddings";
```

---

## Scoring Algorithm

### Final Score Formula

```
finalScore = 0.6 * semanticScore
           + 0.2 * keywordScore
           + priorityBoost
           + usageBoost

Where:
- semanticScore: 0-1 (cosine similarity)
- keywordScore: 0-1 (% of triggers matched)
- priorityBoost: -0.2 to +0.2 (priority 0-10, centered at 5)
- usageBoost: 0 to 0.1 (logarithmic based on useCount)
```

### Example Calculation

Skill: "Code Reviewer"

- triggers: ["review", "pr", "code"]
- priority: 7
- useCount: 15

Query: "please review my pull request"

```
semanticScore: 0.72 (good semantic match)
keywordScore: 2/3 = 0.67 (matched "review", "pr")
priorityBoost: (7-5)/25 = 0.08
usageBoost: log10(16) * 0.05 = 0.06

finalScore = 0.6 * 0.72 + 0.2 * 0.67 + 0.08 + 0.06
           = 0.432 + 0.134 + 0.08 + 0.06
           = 0.706
```

---

## Key Files Summary

| File                                      | Action   | Description                                |
| ----------------------------------------- | -------- | ------------------------------------------ |
| `src/lib/skills/types.ts`                 | Modify   | Add triggers, contexts, priority, useCount |
| `src/lib/skills/manager.ts`               | Refactor | Hybrid search, threshold, scores           |
| `src/lib/memory/embeddings.ts`            | Modify   | Export standalone cosineSimilarity         |
| `src/routes/api/skills/search/+server.ts` | Modify   | Add threshold, context, scores params      |
| `src/lib/agent/index.ts`                  | Modify   | Context detection, usage tracking          |
| `src/lib/server/skill-store.ts`           | Modify   | Store new fields                           |

---

## Trade-offs

### Threshold Value

| Value | Behavior                                |
| ----- | --------------------------------------- |
| 0.3   | Permissive, more false positives        |
| 0.4   | Balanced (recommended)                  |
| 0.5   | Strict, fewer skills injected           |
| 0.6   | Very strict, might miss relevant skills |

**Recommendation**: 0.4 default, configurable via environment variable

### Score Weights

Current weights:

- Semantic: 60%
- Keyword: 20%
- Priority: ±20%
- Usage: 0-10%

**Alternative**: Make weights configurable per deployment

### Context Detection

**Option A**: Simple keyword matching (implemented)

- Pros: Fast, predictable
- Cons: May misclassify

**Option B**: LLM-based classification

- Pros: More accurate
- Cons: Adds latency, cost

**Recommendation**: Start with keywords, add LLM option later

---

## Testing Checklist

- [ ] Search returns scores when requested
- [ ] Threshold filters low-scoring skills
- [ ] Keyword triggers boost score
- [ ] Priority affects ranking
- [ ] Usage count affects ranking
- [ ] Context filter excludes mismatched skills
- [ ] Context detection identifies code/debug/research
- [ ] Usage is recorded on skill activation
- [ ] API accepts threshold and scores params
- [ ] Backward compatible (number param = limit)
- [ ] cosineSimilarity is not duplicated

---

## Future Enhancements

- **Recency boost**: Recently used skills get slight boost
- **Negative triggers**: Keywords that reduce score
- **Skill exclusivity**: Skills that shouldn't activate together
- **A/B testing**: Compare search algorithm variants
- **Analytics dashboard**: Visualize skill activation patterns
- **Personalized weights**: Learn user preferences over time
