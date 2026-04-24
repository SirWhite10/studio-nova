# Nova Chat — Convex + Better Auth + Cloudflare Sandbox Migration Plan

**Date:** 2025-03-17
**Status:** Approved for Implementation
**Target Stack:** SvelteKit 2 + Convex + Better Auth (via @convex-dev/better-auth) + Cloudflare Sandbox SDK

---

## Executive Summary

This plan outlines the migration of Nova Chat from a flat-file backend (data/\*.json) to a cloud-native stack using **Convex** for data persistence and **Better Auth** for authentication, with **Cloudflare Sandbox SDK** as the secure code execution environment for AI agent tools.

**Key outcomes:**

- Multi-user support with per-user data isolation
- Real-time streaming chat via Convex reactive subscriptions (no SSE)
- Scalable vector search for memory and skills (Convex Vectorize)
- Persistent skills system with filesystem-based installation workflow
- Production-ready deployment on Cloudflare Workers

---

## Current Architecture Assessment

### What exists today

- SvelteKit 2 with Svelte 5 runes, Tailwind v4, shadcn-svelte
- Flat JSON files: `data/chats.json`, `data/chat-messages.json`, `data/skills.json`, `data/memory.json`
- Server-side `chatStore` class with manual SSE streaming loop
- Skill folder scanning (`~/.agents/skills/`) with `fs.watch` hot-reload
- `@xenova/transformers` for local embeddings (384-dim, O(n) cosine search)
- AI streaming via `/api/primitives/full-chat-app` → SSE → client parsing
- No authentication (hardcoded user)

### Key limitations

- No concurrency safety — last write wins on JSON files
- Memory grows unbounded, O(n) search will degrade
- `fs.watch` not serverless-compatible
- `@xenova/transformers` won't run in Convex or edge environments
- Single-user only (no real user accounts)
- Bun adapter limits deployment options

---

## Target Architecture

### Components

1. **Convex** — Cloud database + serverless functions
   - Tables: `chats`, `messages`, `skills`, `memory`, `users` (Better Auth manages)
   - Reactive queries via `convex-svelte` hooks
   - Vector search for semantic memory/skill lookup
   - Streaming via `DeltaStreamer` + `syncStreams` (reactive delta updates)

2. **Better Auth** (via `@convex-dev/better-auth` component)
   - Email/password auth out of the box
   - OAuth providers (GitHub, Google) configurable
   - Session management with cookies
   - Runs as a Convex component (native integration)
   - SvelteKit integration through `@mmailaender/convex-better-auth-svelte`

3. **Cloudflare Sandbox SDK**
   - Per-user isolated Linux containers for AI tool execution
   - `shell` and `filesystem` tools run inside user's sandbox
   - Skill installation workflow: `bunx skills-sh add <skill>` runs inside sandbox → writes to `~/.agents/skills/` → Nova syncs to Convex
   - Optional R2 bucket mount for persistent workspace across sandbox restarts

4. **SvelteKit App**
   - Deployed as Cloudflare Worker (adapter: `@sveltejs/adapter-cloudflare`) or Node server
   - SSR enabled for Better Auth session hydration
   - All data access through Convex client (`useQuery`, `useMutation`, `useAction`)
   - No `/api/*` routes except `/api/auth/[...all]` proxy

### Data flow

```
User request → SvelteKit (SSR) → Better Auth hook → Convex DB
                     ↓
         Streaming chat via Convex delta subscription
                     ↓
         AI tools execute in Cloudflare Sandbox (per-user)
                     ↓
         Skills installed to sandbox → synced to Convex
```

---

## Implementation Phases

### Phase 0: Prerequisites & Planning (Immediate)

**Decision:**

- [x] Enable SSR globally (remove `ssr = false`)
- [x] Use external embedding API (OpenAI `text-embedding-3-small`) from Convex action
- [x] Streaming moves entirely to Convex (`DeltaStreamer`)
- [x] Multi-user per-user data isolation
- [x] Sandbox for tool execution (not app hosting)

**Environment setup:**

```bash
# Install dependencies
bun add convex @mmailaender/convex-svelte
bun add @convex-dev/better-auth @mmailaender/convex-better-auth-svelte
bun add better-auth@1.5.3 --exact
bun add @convex-dev/agent
bun add @cloudflare/sandbox  # for future tool execution (Phase 6+)
```

---

### Phase 1: Convex Project Initialization

1. Create `convex.json`:

   ```json
   { "functions": "src/convex/" }
   ```

2. Start Convex dev:

   ```bash
   npx convex dev
   ```

   Follow GitHub login, create project, keep running.

3. Set secrets (Convex env):

   ```bash
   npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
   npx convex env set SITE_URL http://localhost:5173
   npx convex env set OPENAI_API_KEY=sk-...  # for embeddings
   ```

4. Add to `.env.local`:

   ```
   PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud
   PUBLIC_CONVEX_SITE_URL=https://<deployment>.convex.site
   PUBLIC_SITE_URL=http://localhost:5173
   ```

5. Update `svelte.config.js`:

   ```js
   import adapter from "@sveltejs/adapter-cloudflare"; // or adapter-auto
   const config = {
     kit: {
       adapter: adapter(),
       alias: { $convex: "./src/convex" },
     },
   };
   ```

6. Update `vite.config.ts`:
   ```ts
   ssr: {
     noExternal: ["@convex-dev/better-auth"];
   }
   ```

---

### Phase 2: Better Auth Convex Component Setup

**Files to create:**

1. `src/convex/convex.config.ts`:

   ```ts
   import { defineApp } from "convex/server";
   import betterAuth from "@convex-dev/better-auth/convex.config";
   const app = defineApp();
   app.use(betterAuth);
   export default app;
   ```

2. `src/convex/auth.config.ts`:

   ```ts
   import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
   export default { providers: [getAuthConfigProvider()] };
   ```

3. `src/convex/auth.ts`:

   ```ts
   import { createClient, type GenericCtx } from "@convex-dev/better-auth";
   import { convex } from "@convex-dev/better-auth/plugins";
   import { betterAuth } from "better-auth/minimal";
   import { components } from "./_generated/api";
   import authConfig from "./auth.config";

   export const authComponent = createClient(components.betterAuth);

   export const createAuth = (ctx: GenericCtx) =>
     betterAuth({
       baseURL: process.env.SITE_URL!,
       database: authComponent.adapter(ctx),
       emailAndPassword: { enabled: true, requireEmailVerification: false },
       plugins: [convex({ authConfig })],
     });

   export const getCurrentUser = query({
     args: {},
     handler: async (ctx) => authComponent.getAuthUser(ctx),
   });
   ```

4. `src/convex/http.ts`:

   ```ts
   import { httpRouter } from "convex/server";
   import { authComponent, createAuth } from "./auth";
   const http = httpRouter();
   authComponent.registerRoutes(http, createAuth);
   export default http;
   ```

5. `src/routes/api/auth/[...all]/+server.ts`:
   ```ts
   import { createSvelteKitHandler } from "@mmailaender/convex-better-auth-svelte/sveltekit";
   export const { GET, POST } = createSvelteKitHandler();
   ```

---

### Phase 3: Convex Schema & Core Tables

**File: `src/convex/schema.ts`**

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chats: defineTable({
    userId: v.string(),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    chatId: v.id("chats"),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("tool")),
    content: v.string(),
    parts: v.optional(v.array(v.any())),
    createdAt: v.number(),
  })
    .index("by_chat", ["chatId"])
    .index("by_user", ["userId"]),

  skills: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    enabled: v.boolean(),
    source: v.union(
      v.literal("json"),
      v.literal("home-nova"),
      v.literal("project-nova"),
      v.literal("agents"),
    ),
    readonly: v.boolean(),
    embedding: v.optional(v.array(v.float64())),
    fileHash: v.optional(v.string()),
    folderPath: v.optional(v.string()),
    usageCount: v.number(),
    currentVersion: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_name", ["name", "userId"], { unique: true })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId"],
    }),

  memory: defineTable({
    userId: v.string(),
    content: v.string(),
    embedding: v.array(v.float64()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId"],
    }),

  skillExecutions: defineTable({
    userId: v.string(),
    skillId: v.id("skills"),
    toolName: v.string(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    durationMs: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_skill", ["skillId"]),
});
```

---

### Phase 4: Convex Functions

Split into files in `src/convex/`:

#### `src/convex/chats.ts` — CRUD

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { GetCurrentUser } from "./auth";

export const listChats = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    return ctx.db.query("chats").filter(q => q.eq("userId", user?.id)).collect();
  },
});

export const createChat = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, { title }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const id = ctx.db.insert("chats").({
      userId: user.id,
      title: title || "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return id;
  },
});

export const updateChat = mutation({
  args: { chatId: v.id("chats"), title: v.optional(v.string()) },
  handler: async (ctx, { chatId, title }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");
    if (title) ctx.db.patch(chatId, { title, updatedAt: Date.now() });
  },
});

export const deleteChat = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");
    ctx.db.delete(chatId);
    // Cascade: delete messages
    const messages = ctx.db.query("messages").filter(q => q.eq("chatId", chatId)).collect();
    for (const msg of messages) ctx.db.delete(msg._id);
  },
});
```

#### `src/convex/messages.ts` — CRUD

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getMessages = query({
  args: { chatId: v.id("chats"), limit: v.optional(v.number()) },
  handler: async (ctx, { chatId, limit = 100 }) => {
    return ctx.db.query("messages")
      .filter(q => q.eq("chatId", chatId))
      .order("asc", ["createdAt"])
      .take(limit)
      .collect();
  },
});

export const addMessage = mutation({
  args: { chatId: v.id("chats"), role: v.string(), content: v.string(), parts: v.optional(v.array(v.any())) },
  handler: async (ctx, { chatId, role, content, parts }) => {
    const id = ctx.db.insert("messages").({
      chatId,
      userId: (await authComponent.getAuthUser(ctx))?.id!,
      role,
      content,
      parts: parts || [],
      createdAt: Date.now(),
    });
    // Update chat's updatedAt
    ctx.db.patch(chatId, { updatedAt: Date.now() });
    return id;
  },
});

export const saveMessages = mutation({
  args: { chatId: v.id("chats"), messages: v.array(v.any()) },
  handler: async (ctx, { chatId, messages }) => {
    // Overwrite all messages for this chat (simplified from current bulk persist)
    const existing = ctx.db.query("messages").filter(q => q.eq("chatId", chatId)).collect();
    for (const msg of existing) ctx.db.delete(msg._id);
    for (const msg of messages) {
      ctx.db.insert("messages").({
        chatId,
        userId: msg.userId || (await authComponent.getAuthUser(ctx))?.id!,
        role: msg.role,
        content: msg.content,
        parts: msg.parts || [],
        createdAt: msg.createdAt,
      });
    }
    ctx.db.patch(chatId, { updatedAt: Date.now() });
  },
});
```

#### `src/convex/embeddings.ts` — OpenAI embedding action

```ts
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const generateEmbedding = internalAction({
  args: { text: v.string() },
  handler: async (_, { text }): Promise<number[]> => {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: text, model: "text-embedding-3-small" }),
    });
    const { data } = await res.json();
    return data[0].embedding; // 1536-dim
  },
});
```

#### `src/convex/memory.ts` — store & vector search

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { generateEmbedding } from "./embeddings";

export const addMemory = mutation({
  args: { content: v.string(), metadata: v.optional(v.any()) },
  handler: async (ctx, { content, metadata }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const embedding = await ctx.runAction(generateEmbedding, { text: content });
    return ctx.db.insert("memory").({
      userId: user.id,
      content,
      embedding,
      metadata,
      createdAt: Date.now(),
    });
  },
});

export const searchMemory = query({
  args: { query: v.string(), limit: v.optional(v.number()), threshold: v.optional(v.number()) },
  handler: async (ctx, { query, limit = 5, threshold = 0.7 }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const queryEmbedding = await ctx.runAction(generateEmbedding, { text: query });
    const results = await ctx.db.vectorSearch("memory", "by_embedding", {
      vector: queryEmbedding,
      filter: q => q.eq("userId", user.id),
      limit,
      metric: "cosine",
    });
    return results.filter(r => r.similarity >= threshold).map(r => ({
      entry: r.document,
      score: r.similarity,
    }));
  },
});
```

#### `src/convex/skills.ts` — CRUD + search

```ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { generateEmbedding } from "./embeddings";

export const listSkills = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");
    return ctx.db.query("skills").filter(q => q.eq("userId", user.id)).collect();
  },
});

export const upsertSkill = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    source: v.string(),
    readonly: v.boolean(),
    fileHash: v.optional(v.string()),
    folderPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Check if skill with same name+userId exists
    const existing = ctx.db.query("skills")
      .filter(q => q.and(q.eq("name", args.name), q.eq("userId", user.id)))
      .first();

    const now = Date.now();
    const embeddingPromise = args.content.includes("---")
      ? ctx.runAction(generateEmbedding, { text: extractFrontmatterContent(args.content) })
      : Promise.resolve(null);

    const embedding = await embeddingPromise;

    if (existing) {
      ctx.db.patch(existing._id, {
        description: args.description,
        content: args.content,
        enabled: existing.enabled, // preserve
        source: args.source,
        readonly: args.readonly,
        fileHash: args.fileHash,
        folderPath: args.folderPath,
        embedding,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return ctx.db.insert("skills").({
        userId: user.id,
        name: args.name,
        description: args.description,
        content: args.content,
        enabled: true,
        source: args.source,
        readonly: args.readonly,
        fileHash: args.fileHash,
        folderPath: args.folderPath,
        embedding,
        usageCount: 0,
        currentVersion: 1,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const deleteSkill = mutation({
  args: { skillId: v.id("skills") },
  handler: async (ctx, { skillId }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const skill = ctx.db.get(skillId);
    if (skill.userId !== user.id) throw new Error("Forbidden");
    ctx.db.delete(skillId);
  },
});

export const toggleSkillEnabled = mutation({
  args: { skillId: v.id("skills"), enabled: v.boolean() },
  handler: async (ctx, { skillId, enabled }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Forbidden");
    const skill = ctx.db.get(skillId);
    if (skill.userId !== user.id) throw new Error("Forbidden");
    ctx.db.patch(skillId, { enabled, updatedAt: Date.now() });
  },
});

export const searchSkills = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { query, limit = 5 }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const embedding = await ctx.runAction(generateEmbedding, { text: query });
    const results = await ctx.db.vectorSearch("skills", "by_embedding", {
      vector: embedding,
      filter: q => q.and(q.eq("userId", user.id), q.eq("enabled", true)),
      limit,
      metric: "cosine",
    });
    return results.map(r => ({ skill: r.document, score: r.similarity }));
  },
});

export const getEnabledSkills = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");
    return ctx.db.query("skills")
      .filter(q => q.and(q.eq("userId", user.id), q.eq("enabled", true)))
      .collect();
  },
});
```

#### `src/convex/chat-stream.ts` — streaming with DeltaStreamer

```ts
import { action, mutation, query, internal } from "./_generated/server";
import { v } from "convex/values";
import { DeltaStreamer, vStreamArgs, syncStreams } from "@convex-dev/agent";
import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { components } from "./_generated/api";
import { getEnabledSkills } from "./skills";
import { searchMemory } from "./memory";

// Start a streaming chat action
export const startStreamChat = action({
  args: {
    chatId: v.id("chats"),
    messages: v.array(v.any()),
  },
  handler: async (ctx, { chatId, messages }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // 1. Generate threadId (use chatId as threadId) and order
    const threadId = chatId.toString();
    const order = Date.now();

    // 2. Store user message if not already stored
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    if (lastUserMsg) {
      await ctx.runMutation(internal.messages.addMessage, {
        chatId,
        role: "user",
        content: lastUserMsg.content,
      });
    }

    // 3. Search memory for relevant context
    const memoryResults = await ctx.runQuery(searchMemory, {
      query: lastUserMsg?.content || "",
      limit: 5,
      threshold: 0.4,
    });
    const memoryContext = memoryResults.map((r) => r.entry.content).join("\n---\n");

    // 4. Get enabled skills
    const skills = await ctx.runQuery(getEnabledSkills, {});
    const skillContext = skills.map((s) => `# ${s.name}\n${s.content}`).join("\n\n");

    // 5. Build system prompt
    const systemPrompt = `You are Nova, an AI assistant with access to tools.\n\n## Skills\n${skillContext}\n\n## Relevant Memories\n${memoryContext}`;

    // 6. Prepare messages with system prompt
    const allMessages = [{ role: "system", content: systemPrompt }, ...messages];

    // 7. Create DeltaStreamer
    const streamer = new DeltaStreamer(
      components.agent,
      ctx,
      {
        throttleMs: 50,
      },
      {
        threadId,
        format: "UIMessageChunk",
        order,
        stepOrder: 0,
        userId: identity.subject,
      },
    );

    // 8. Call OpenRouter
    const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! });
    const result = streamText({
      model: openrouter("x-ai/grok-4.1-fast"),
      messages: allMessages,
      abortSignal: streamer.abortController.signal,
      maxSteps: 5,
      tools: [
        /* your 6 tools: filesystem, shell, memory, skills, search_skills, use_skill */
      ],
      onError: (e) => streamer.fail(String(e)),
    });

    // 9. Consume stream asynchronously
    void streamer.consumeStream(result.toUIMessageStream());

    // 10. Store memory of user's message after streaming starts
    if (lastUserMsg) {
      await ctx.runMutation(internal.memory.addMemory, {
        content: lastUserMsg.content,
        metadata: { type: "conversation", chatId, timestamp: Date.now() },
      });
    }

    return { threadId, order };
  },
});

// Query to fetch streaming deltas
export const listStreams = query({
  args: { threadId: v.string(), streamArgs: vStreamArgs },
  handler: async (ctx, args) => {
    const streams = await syncStreams(ctx, components.agent, {
      ...args,
      includeStatuses: ["streaming", "aborted", "finished"],
    });
    return { streams };
  },
});
```

---

### Phase 5: SvelteKit Frontend Auth Integration

#### `src/lib/auth-client.ts`

```ts
import { createAuthClient } from "better-auth/svelte";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [convexClient()],
});
```

#### `src/hooks.server.ts` (new, replaces dead `src/routes/hooks.server.ts`)

```ts
import type { Handle } from "@sveltejs/kit";
import { createAuth } from "$convex/auth.js";
import { getToken } from "@mmailaender/convex-better-auth-svelte/sveltekit";
import { withServerConvexToken } from "@mmailaender/convex-svelte/sveltekit/server";

export const handle: Handle = async ({ event, resolve }) => {
  const token = await getToken(createAuth, event.cookies);
  event.locals.token = token;
  return withServerConvexToken(token, () => resolve(event));
};
```

#### `src/app.d.ts` (add Locals)

```ts
declare global {
  namespace App {
    interface Locals {
      token: string | undefined;
    }
    interface Platform {
      server: {
        upgrade(request: Request): Promise<void>;
      };
      request: Request;
    }
  }
}
export {};
```

#### `src/routes/+layout.svelte` (auth provider)

```svelte
<script lang="ts">
  import '../app.css';
  import { createSvelteAuthClient } from '@mmailaender/convex-better-auth-svelte/svelte';
  import { authClient } from '$lib/auth-client';
  import { Toaster } from '$lib/components/ui/sonner';
  import AppSidebar from '$lib/components/app-sidebar.svelte';
  import { SidebarProvider } from '$lib/components/ui/sidebar/index.js';

  let { children, data } = $props();

  // Pass server auth state to prevent loading flash
  createSvelteAuthClient({
    authClient,
    getServerState: () => data?.authState || { isLoading: false, isAuthenticated: false },
    options: { expectAuth: false } // set true after all routes protected
  });
</script>

<Sidebar.Provider>
  <AppSidebar data={data?.data} />
  <Toaster />
  <Sidebar.Inset>
    {@render children()}
  </Sidebar.Inset>
</Sidebar.Provider>
```

#### `src/routes/+layout.server.ts` (auth + data load)

```ts
import type { LayoutServerLoad } from "./$types";
import {
  getAuthState,
  createConvexHttpClient,
} from "@mmailaender/convex-better-auth-svelte/sveltekit";
import { api } from "$convex/_generated/api";

export const load: LayoutServerLoad = async () => {
  const authState = getAuthState();

  // Load chats if authenticated
  let novaChats = [];
  let currentUser: any = null;
  if (authState.isAuthenticated) {
    const client = createConvexHttpClient();
    currentUser = await client.query(api.auth.getCurrentUser, {});
    const chats = await client.query(api.chats.list, {});
    novaChats = chats.map((chat: any) => ({
      id: chat._id,
      title: chat.title,
      description: "Last updated: " + new Date(chat.updatedAt).toLocaleDateString(),
      imageUrl: `https://placehold.co/400x300?text=${encodeURIComponent(chat.title)}`,
      url: `/chat/${chat._id}`,
    }));
  }

  return {
    authState,
    currentUser,
    data: {
      user: currentUser || { name: "Guest", email: "", avatar: "" },
      navMain: [],
      navSecondary: [
        { title: "Sign In", url: "/sign-in", icon: null },
        { title: "Support", url: "#", icon: null },
        { title: "Feedback", url: "#", icon: null },
      ],
      projects: [],
      novaChats,
    },
  };
};
// Remove: export const ssr = false;
```

---

### Phase 6: Auth Pages

#### `src/routes/sign-in/+page.svelte`

```svelte
<script lang="ts">
  import { authClient, useSession } from '$lib/auth-client';
  const session = useSession();

  let email = $state('');
  let password = $state('');
  let error = $state('');

  async function signIn() {
    try {
      await authClient.signIn.email({ email, password });
    } catch (e: any) {
      error = e.message || 'Sign in failed';
    }
  }
</script>

<div class="flex h-screen items-center justify-center">
  <form onsubmit={signIn} class="w-full max-w-md space-y-4 p-8 border rounded">
    <h1 class="text-2xl font-bold">Sign In</h1>
    {#if error}<p class="text-red-500">{error}</p>{/if}
    <input type="email" bind:value={email} placeholder="Email" required class="w-full p-2 border rounded" />
    <input type="password" bind:value={password} placeholder="Password" required class="w-full p-2 border rounded" />
    <button type="submit" class="w-full p-2 bg-blue-600 text-white rounded">Sign In</button>
    <p>
      Don't have an account? <a href="/sign-up" class="text-blue-600">Sign up</a>
    </p>
  </form>
</div>
```

#### `src/routes/sign-up/+page.svelte` (similar, uses `authClient.signUp.email({ name, email, password })`)

---

### Phase 7: Migrate Chat Store to Convex

#### New `src/lib/convex-client.ts` wrapper

```ts
import { createConvexClient } from "@mmailaender/convex-svelte";
import { PUBLIC_CONVEX_URL } from "$env/static/public";
import { authClient } from "$lib/auth-client";

// This client is created once and used for mutations/actions
export const convex = createConvexClient(PUBLIC_CONVEX_URL);
```

Create new store-like class or just use Svelte 5 runes directly in components. Simpler: **replace `chatStore` class with composable functions**.

#### `src/routes/chat/[id]/+page.server.ts`

```ts
import type { PageServerLoad } from "./$types";
import { createConvexHttpClient } from "@mmailaender/convex-better-auth-svelte/sveltekit";
import { api } from "$convex/_generated/api";

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.token) throw redirect(302, "/sign-in");

  const client = createConvexHttpClient();
  const chatId = params.id;

  // Verify chat belongs to user (optional)
  const chat = await client.query(api.chats.get, { chatId });
  if (!chat) throw error(404, "Chat not found");

  const messages = await client.query(api.messages.get, { chatId });

  return {
    chatId,
    chatTitle: chat.title,
    initialMessages: messages,
  };
};
```

#### `src/routes/chat/[id]/+page.svelte` updates

Replace `chatStore.sendMessage()` with:

```svelte
<script lang="ts">
  import { useAction, useQuery } from '@mmailaender/convex-svelte';
  import { api } from '$convex/_generated/api';
  import { authClient } from '$lib/auth-client';

  let { data } = $props();

  const messages = useQuery(api.messages.get, { chatId: data.chatId });
  const startStream = useAction(api.chat.startStream);

  async function sendMessage(content: string) {
    const msgs = [...$messages, { role: 'user' as const, content }];
    await startStream({ chatId: data.chatId, messages: msgs });
    // Streaming deltas will update automatically via separate query
  }

  // Subscribe to streaming deltas
  const streams = useQuery(api.chat.listStreams, { threadId: data.chatId });
  // Derive full message list from streams (merge deltas into base messages)
  // This logic similar to current chatStore.applyChunk but reactive
</script>
```

The streaming UI stays the same; just replace `chatStore.messages` with a derived array from `streams`.

---

### Phase 8: Skills System Migration

#### Remove all old server modules

Delete:

- `src/lib/server/skill-store.ts`
- `src/lib/server/skill-manager.ts`
- `src/lib/server/skill-folders.ts`
- `src/lib/server/skills.ts`
- `src/lib/skills/manager.ts`

Update `src/routes/skills/+page.svelte`:

- Replace `fetch("/api/skills")` with `useQuery(api.skills.list)`
- Replace create/edit calls with `useMutation(api.skills.upsertSkill)`
- Replace delete with `useMutation(api.skills.deleteSkill)`
- Replace toggle with `useMutation(api.skills.toggleSkillEnabled)`

The read-only flag logic remains: skills with `source !== "json"` are `readonly`. They can be viewed but not edited.

---

### Phase 9: Skill Folder Sync on Startup (Sandbox Intention)

Even though Nova Chat runs on Cloudflare Workers (not in a sandbox itself), we preserve the `~/.agents/skills/` convention for **developer ergonomics**.

Add to `src/hooks.server.ts` after auth:

```ts
// Skill folder seeding — runs once on server boot
import { scanAndSeedSkills } from "$lib/server/skill-seeder";

let seeded = false;
if (!seeded) {
  seeded = true;
  scanAndSeedSkills().catch(console.error);
}
```

**`src/lib/server/skill-seeder.ts`** (only runs in Node environment, not in Workers):

```ts
import { createConvexHttpClient } from "@mmailaender/convex-svelte/sveltekit/server";
import { api } from "$convex/_generated/api";
import * as path from "path";
import { readFile, readdir } from "fs/promises";

const SKILL_PATHS = [
  path.join(process.env.HOME || "/root", ".agents", "skills"),
  path.join(process.cwd(), ".nova", "skills"),
  path.join(process.env.HOME || "/root", ".nova", "skills"),
];

async function hash(content: string): Promise<string> {
  // Simple hash; could use crypto.createHash('sha256')
  return content.length.toString(); // placeholder
}

export async function scanAndSeedSkills() {
  // Only run if we have a Convex deployment URL and token
  if (!process.env.PUBLIC_CONVEX_URL || !process.env.CONVEX_DEPLOYMENT) return;

  const client = createConvexHttpClient();

  for (const base of SKILL_PATHS) {
    try {
      const subdirs = await readdir(base, { withFileTypes: true });
      for (const dir of subdirs) {
        if (!dir.isDirectory()) continue;
        const skillDir = path.join(base, dir.name);
        const skillMdPath = path.join(skillDir, "SKILL.md");
        try {
          const content = await readFile(skillMdPath, "utf-8");
          const fileHash = await hash(content);
          // Parse name and description from frontmatter
          const nameMatch = content.match(/^#\s+(.+)$/m) ?? content.match(/^name:\s*(.+)$/m);
          const name = nameMatch ? nameMatch[1].trim() : dir.name;
          const descMatch = content.match(/^description:\s*(.+)$/m);
          const description = descMatch ? descMatch[1].trim() : undefined;

          // Check if skill exists already (by name+userId = system)
          const existing = await client.query(api.skills.list, {});
          const existingSkill = existing.find((s: any) => s.name === name && s.source === "agents");

          if (!existingSkill || existingSkill.fileHash !== fileHash) {
            await client.mutation(api.skills.upsertSkill, {
              name,
              description,
              content,
              source: "agents",
              readonly: true,
              fileHash,
            });
            console.log(`Seeded skill: ${name}`);
          }
        } catch (e) {
          // Skip invalid skill folder
        }
      }
    } catch (e) {
      // Skip missing path
    }
  }
}
```

This runs only in Node (Bun) environments. If deploying to Cloudflare Workers, this seeder won't run (Workers have no filesystem). In production, skills would be pre-baked into the container image or managed via UI.

---

### Phase 10: Remove Legacy Code

After verifying Convex functions work, delete:

- `src/lib/server/chat-store.ts`
- `src/lib/server/chat-message-store.ts`
- `src/lib/server/skill-store.ts`
- `src/lib/server/skill-manager.ts`
- `src/lib/server/skill-folders.ts`
- `src/lib/server/skills.ts`
- `src/lib/server/skill-executions.ts`
- `src/lib/server/skill-versions.ts`
- `src/routes/api/chats/+server.ts`
- `src/routes/api/chats/[id]/+server.ts`
- `src/routes/api/chats/[id]/messages/+server.ts`
- `src/routes/api/primitives/full-chat-app/+server.ts`
- `src/routes/api/skills/*/+server.ts`
- `src/lib/memory/` (index, embeddings, types)
- `src/lib/skills/manager.ts`
- `data/` directory (backup first if needed)
- `src/routes/hooks.server.ts` (the misplaced one)

Also clean up dead UI files: `Header.svelte`, `Counter.svelte`, `sverdle/`, `sidebar-08/`.

---

### Phase 11: Cloudflare Sandbox Integration (Phase 2+)

This is for future agent tool execution. Not needed for initial migration.

1. Add `wrangler.jsonc`:

   ```jsonc
   {
     "name": "nova-chat",
     "main": "src/entry.worker.ts",
     "compatibility_date": "2025-03-17",
     "vars": {
       "SANDBOX_TRANSPORT": "websocket",
     },
     "durable_objects": {
       "bindings": [
         {
           "class_name": "Sandbox",
           "name": "SANDBOX",
         },
       ],
     },
   }
   ```

2. `src/entry.worker.ts`:

   ```ts
   import { getSandbox } from "@cloudflare/sandbox";
   import { defineEntry } from "@mmailaender/convex-svelte/sveltekit/worker";

   export default defineEntry({
     async fetch(request, env) {
       // Your Worker logic here
     },
   });
   ```

3. Tools (`src/lib/agent/tools/shell.ts`, `filesystem.ts`) will call `getSandbox(env.SANDBOX, userId)`.

---

### Phase 12: Deployment

1. **Local dev**: `bun run dev` with `npx convex dev` running.
2. **Convex deploy**: `npx convex deploy` (creates production deployment)
3. **Cloudflare Worker deploy** (if using adapter-cloudflare):
   ```bash
   npx wrangler deploy
   ```
   Set env vars in Cloudflare dashboard: `OPENAI_API_KEY`, `BETTER_AUTH_SECRET`, `PUBLIC_CONVEX_URL`, etc.

---

## Testing Checklist

- [ ] Auth: sign up, sign in, sign out, session persistence
- [ ] Chat CRUD: create, rename, delete chats
- [ ] Streaming chat: send message, see stream, reasoning blocks, tool calls
- [ ] Memory: verify memories stored and retrieved (vector search)
- [ ] Skills: list, create, edit, delete, toggle enable
- [ ] Folder skills: `~/.agents/skills/` entries appear as read-only, viewable full content
- [ ] Multi-user isolation: user A cannot see user B's chats/skills/memory
- [ ] Protected routes: unauthenticated users redirected to `/sign-in`
- [ ] SSR hydration: no auth state flash (session hydrated from server)
- [ ] Error handling: invalid API keys, network failures, quota limits
- [ ] Convex limits: stay within 10MB response, 5MB document, etc.

---

## Risks & Mitigations

| Risk                                               | Impact         | Mitigation                                              |
| -------------------------------------------------- | -------------- | ------------------------------------------------------- |
| Zod v3 vs v4 conflict                              | Runtime errors | Test thoroughly; both versions can coexist              |
| OpenAI API costs                                   | Bill shock     | Add rate limiting, cache embeddings, set usage alerts   |
| Convex vector index sizing                         | Performance    | Monitor query latency; adjust `limit` and `threshold`   |
| Cloudflare Sandbox cold starts                     | Latency        | Keep alive for active users; batch operations           |
| Migration data loss                                | User data loss | Export `data/*.json` before wipe; provide import script |
| `@mmailaender/convex-better-auth-svelte` stability | Auth breaks    | Pin version; monitor for updates                        |

---

## Rollback Plan

1. Keep old code in git branch (`migration/convex`)
2. If critical failure, revert to `main` (still has flat-file backend)
3. Data in Convex can be cleared and re-migrated; flat files can be restored from backup

---

## Open Questions

1. **Skill versioning**: Deferred to Phase 2. For now, `currentVersion` field exists but no history table.
2. **R2 workspace persistence**: Optional enhancement after core migration.
3. **Embedding provider**: OpenAI used here; could swap to Cloudflare Workers AI embeddings (`@cloudflare/ai`).
4. **Adapter choice**: `@sveltejs/adapter-cloudflare` vs `adapter-auto`. Cloudflare gives best integration, but limits to Workers runtime. Node adapter is more flexible. Recommend Cloudflare for Nova Cloud.

---

## Success Criteria

- [ ] All routes load without errors
- [ ] Authentication works across the app
- [ ] Streaming chat functions with real-time updates
- [ ] Skills UI loads skills from Convex (including readonly folder skills)
- [ ] Memory search returns relevant results
- [ ] Data isolation enforced between users
- [ ] No console errors in normal usage
- [ ] Performance: page loads < 2s, chat stream < 1s latency
- [ ] Deploys successfully to Convex + Cloudflare

---

## Next Steps After Migration

1. Implement skill versioning (history table)
2. Add R2 workspace mount for sandbox persistence
3. Integrate Cloudflare Sandbox for tool execution (replace current shell/filesystem)
4. Build skill marketplace UI (`skills.sh` integration)
5. Add billing/stripe for Nova Cloud
6. Rate limiting, caching (AI Gateway)
7. Observability: logs, metrics, error tracking

---

**Approved by:** Nova Chat Team
**Target completion:** TBD
