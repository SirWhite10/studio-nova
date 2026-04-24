# Chat Rename Feature Implementation Plan

## Overview

Add ability for users to rename chat sessions from both the sidebar and the chat page header, with inline editing, toast notifications, document title updates, and persistence to `data/chats.json`.

---

## Requirements

- ✅ Rename from sidebar (inline edit)
- ✅ Rename from chat page header (button → inline edit)
- ✅ Update browser tab title dynamically
- ✅ Show toast notifications (success/error)
- ✅ No empty titles allowed
- ✅ Persist to `data/chats.json`
- ✅ Reusable component for both `/chat/[id]` and `/chat-next/[id]`
- ✅ Brand name: "Nova" in document title

---

## Current State Analysis

### Data Layer

- `src/lib/server/chat-store.ts` manages `ChatSession[]` with:
  - `id: string`
  - `title: string`
  - `updatedAt: number`
- Already has: `getChatSessions()`, `addChatSession()`, `deleteChatSession()`
- Persists to `./data/chats.json`

### API Layer

- `GET /api/chats` → returns all sessions
- `POST /api/chats` → creates new chat
- `DELETE /api/chats/[id]` → deletes chat
- **Missing:** `PATCH /api/chats/[id]` for updates

### UI Components

- `src/lib/components/chat-sidebar.svelte` – chat list with delete button
- `src/routes/chat/[id]/+page.svelte` – uses `FullChatApp` (no header title)
- `src/routes/chat-next/[id]/+page.svelte` – custom streaming chat (no header title)
- Toast system: `svelte-sonner` is available; `Toaster` component exists at `src/lib/components/ui/sonner/sonner.svelte`
- Document title: managed via `<svelte:head>` or `document.title`

---

## Implementation Steps

### 1. Server: Add update function

**File:** `src/lib/server/chat-store.ts`

```ts
export async function updateChatSessionTitle(
  id: string,
  title: string,
): Promise<ChatSession | null> {
  await loadChats();
  const index = chatSessions.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Title cannot be empty");
  }
  if (trimmed.length > 100) {
    throw new Error("Title too long (max 100 characters)");
  }

  chatSessions[index] = {
    ...chatSessions[index],
    title: trimmed,
    updatedAt: Date.now(), // bump for sorting
  };
  await saveChats();
  return chatSessions[index];
}
```

### 2. API: PATCH endpoint

**File:** `src/routes/api/chats/[id]/+server.ts`

```ts
import { updateChatSessionTitle } from "$lib/server/chat-store";

export const PATCH: RequestHandler = async ({ params, request }) => {
  const { title }: { title?: string } = await request.json();
  if (!title || !title.trim()) {
    return json({ error: "Title cannot be empty" }, { status: 400 });
  }
  try {
    const updated = await updateChatSessionTitle(params.id, title);
    if (!updated) {
      return json({ error: "Chat not found" }, { status: 404 });
    }
    return json(updated);
  } catch (error: any) {
    console.error("Failed to update chat title:", error);
    const message = error?.message || "Failed to update title";
    // Return 400 for validation errors (empty/length), 500 for others
    const status = message.includes("empty") || message.includes("long") ? 400 : 500;
    return json({ error: message }, { status });
  }
};
```

### 3. Global Toaster

**File:** `src/routes/+layout.svelte`

Add import and component inside `<Sidebar.Inset>`:

```svelte
<script lang="ts">
  import { Toaster } from "$lib/components/ui/sonner";
  // ... other imports
</script>

<Sidebar.Provider>
  <AppSidebar data={sidebarData} />
  <Toaster />
  <Sidebar.Inset title="title">
    <!-- existing header and content -->
```

### 4. Create Reusable Rename Component

**File:** `src/lib/components/chat-rename.svelte`

```svelte
<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { Pencil, Loader2 } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { cn } from '$lib/utils';

  interface Props {
    chatId: string;
    initialTitle: string; // will be used with bind:initialTitle in parent
    class?: string;
    onupdate?: () => void; // optional callback for side effects (refetch list, etc.)
  }

  let { chatId, initialTitle = $bindable(''), class: className, onupdate }: Props = $props();

  let isEditing = $state(false);
  let editTitle = $state('');
  let isLoading = $state(false);
  let inputEl: HTMLInputElement;

  // Keep editTitle in sync when initialTitle changes from parent
  $effect(() => {
    if (!isEditing) {
      editTitle = initialTitle;
    }
  });

  async function startEdit() {
    editTitle = initialTitle;
    isEditing = true;
    // Focus after DOM update
    $effect(() => {
      if (isEditing && inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    });
  }

  async function saveTitle() {
    const newTitle = editTitle.trim();
    if (!newTitle || newTitle === initialTitle) {
      isEditing = false;
      return;
    }
    if (newTitle.length > 100) {
      toast.error('Title too long (max 100 characters)');
      return;
    }
    isLoading = true;
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        const updated = await res.json();
        // Update document title
        document.title = `${updated.title} - Nova`;
        toast.success('Chat renamed');
        // Two-way binding: automatically updates parent's variable
        initialTitle = updated.title;
        isEditing = false;
        onupdate?.(); // optional: refetch list, close menus, etc.
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to rename chat');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      isLoading = false;
    }
  }

  function cancelEdit() {
    isEditing = false;
    editTitle = initialTitle;
  }

  function handleBlur() {
    if (isEditing) {
      saveTitle();
    }
  }
</script>

<span class={cn('flex items-center gap-1', className)}>
  {#if isEditing}
    <input
      bind:this={inputEl}
      type="text"
      bind:value={editTitle}
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveTitle();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
      }}
      onblur={handleBlur}
      class="text-sm font-medium bg-transparent border rounded px-1 py-0.5 min-w-[120px]"
      disabled={isLoading}
    />
    {#if isLoading}
      <Loader2 class="size-4 animate-spin" />
    {/if}
  {:else}
    <span class="truncate text-sm font-medium">{initialTitle}</span>
    <Button
      size="icon"
      variant="ghost"
      class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
      onclick={startEdit}
      title="Rename chat"
    >
      <Pencil class="size-3" />
    </Button>
  {/if}
</span>
```

### 5. Sidebar: Use ChatRename

**File:** `src/lib/components/chat-sidebar.svelte`

Modify the chat item rendering:

```svelte
<script lang="ts">
  import { MessageSquare, Plus, Trash2 } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import ChatRename from "$lib/components/chat-rename.svelte";

  // ... existing code ...

  async function deleteChat(id: string, e: Event) {
    e.preventDefault();
    e.stopPropagation();
    sessions = sessions.filter((s) => s.id !== id);
  }

  function handleChatUpdated() {
    // Refetch sessions to get updated order (updatedAt changed)
    fetchSessions();
  }

  $effect(() => {
    fetchSessions();
  });
</script>

{#each sessions as session (session.id)}
  <a
    href="/chat/{session.id}"
    class="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted group"
  >
    <div class="flex items-center gap-2 flex-1 min-w-0">
      <ChatRename
        chatId={session.id}
        bind:initialTitle={session.title}
        onupdate={handleChatUpdated}
      />
    </div>
    <Button
      size="icon"
      variant="ghost"
      class="h-6 w-6 opacity-0 group-hover:opacity-100"
      onclick={(e) => deleteChat(session.id, e)}
    >
      <Trash2 size={12} />
    </Button>
  </a>
{/each}
```

### 6. Chat Page Header for `/chat/[id]`

**File:** `src/routes/chat/[id]/+page.server.ts`

Add import and return `chatTitle`:

```ts
import { getChatSessions } from "$lib/server/chat-store";

export const load: PageServerLoad = async ({ params }) => {
  // ... existing memory loading code ...
  const sessions = await getChatSessions();
  const chatSession = sessions.find((s) => s.id === params.id);
  const chatTitle = chatSession?.title || "Chat";
  return { initialMessages, chatId: params.id, chatTitle };
};
```

**File:** `src/routes/chat/[id]/+page.svelte`

Wrap `FullChatApp` with header:

```svelte
<script lang="ts">
  import FullChatApp from "$lib/components/prompt-kit-primitives/full-chat-app/FullChatApp.svelte";
  import ChatRename from "$lib/components/chat-rename.svelte";

  let { data }: { data: { chatId: string; initialMessages: any[]; chatTitle: string } } = $props();
  let chatTitle = $state(data.chatTitle);

  // Update document title when chatTitle changes
  $effect(() => {
    document.title = `${chatTitle} - Nova`;
  });
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex h-14 items-center border-b px-4">
    <ChatRename chatId={data.chatId} bind:initialTitle={chatTitle} />
  </div>

  <!-- Chat content -->
  <div class="flex-1 overflow-hidden">
    <FullChatApp chatId={data.chatId} initialMessages={data.initialMessages} />
  </div>
</div>
```

### 7. Chat Page Header for `/chat-next/[id]`

**File:** `src/routes/chat-next/[id]/+page.server.ts`

Add import and return `chatTitle` (similar to above).

**File:** `src/routes/chat-next/[id]/+page.svelte`

Wrap the entire existing chat content with a header:

```svelte
<script lang="ts">
  // ... existing imports ...
  import ChatRename from '$lib/components/chat-rename.svelte';

  let { data }: { data: { initialMessages: UIMessage[]; chatId: string; chatTitle: string } } = $props();
  let chatTitle = $state(data.chatTitle);

  // Update document title when chatTitle changes
  $effect(() => {
    document.title = `${chatTitle} - Nova`;
  });

  // ... rest of existing script (messages, inputValue, etc.)
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex h-14 items-center border-b px-4">
    <ChatRename chatId={data.chatId} bind:initialTitle={chatTitle} />
  </div>

  <!-- Existing chat UI (wrap in flex-1 overflow-hidden) -->
  <div class="flex-1 overflow-hidden">
    <!-- Existing template starting from <Conversation> to the end -->
  </div>
</div>
```

---

## Edge Cases & Validation

- **Empty title**: Blocked in component; if user clears input, blur will cancel or show error
- **Max length**: 100 characters check with error toast
- **Loading state**: Input disabled, spinner shown
- **Cancel**: Escape key or clicking outside cancels (blur with unchanged value also cancels)
- **Duplicate titles**: Allowed
- **Race conditions**: Multiple rapid edits – last wins; `updatedAt` bumps to top of list
- **Network errors**: Show error toast; keep edit mode open for retry

---

## Testing Checklist

### Manual

1. Sidebar rename:
   - Hover chat item, click pencil
   - Edit title, press Enter
   - Toast success appears
   - Title updates in sidebar
   - Chat moves to top (updatedAt)
   - Refresh page – title persists
2. Chat page header rename:
   - Click pencil in header
   - Change title, save
   - Browser tab title updates to "Title - Nova"
   - Sidebar reflects new title
   - Refresh page – persists
3. Cancel/error flows:
   - Press Escape to cancel
   - Try empty title → error toast
   - Try title > 100 chars → error toast
   - Disconnect network → error toast
4. Both `/chat` and `/chat-next` work identically

### Playwright (optional)

- Create test that:
  - Creates new chat
  - Navigates to chat page
  - Clicks rename button, enters new title, presses Enter
  - Waits for toast
  - Verifies sidebar title updated via GET `/api/chats`
  - Checks `document.title`

---

## Files to Modify

1. `src/lib/server/chat-store.ts` – add `updateChatSessionTitle`
2. `src/routes/api/chats/[id]/+server.ts` – add `PATCH` handler
3. `src/routes/+layout.svelte` – add `<Toaster />`
4. `src/lib/components/chat-rename.svelte` – **new component**
5. `src/lib/components/chat-sidebar.svelte` – use `ChatRename`
6. `src/routes/chat/[id]/+page.server.ts` – return `chatTitle`
7. `src/routes/chat/[id]/+page.svelte` – add header with `ChatRename`
8. `src/routes/chat-next/[id]/+page.server.ts` – return `chatTitle`
9. `src/routes/chat-next/[id]/+page.svelte` – add header with `ChatRename`

---

## Notes

- The `ChatRename` component is self-contained and reusable.
- It uses two‑way binding: parent passes `bind:initialTitle={localTitle}` and the component updates it automatically on successful rename.
- It updates `document.title` on success; parent pages don't need to handle that.
- Optional `onupdate` callback: parent can pass `onupdate` to perform side effects (e.g., refetch sessions list to reflect new `updatedAt` order).
- The component uses `svelte-sonner` for toasts; ensure `Toaster` is in root layout.
- Document title format: `{title} - Nova` (confirm "Nova" brand name).

---

## Questions Answered

- **Toaster placement**: Root layout (`+layout.svelte`)
- **Brand name**: "Nova"
- **Allow renaming from chat page**: Yes, both `/chat` and `/chat-next`
- **Reusable component**: Yes, `ChatRename.svelte`
- **No empty titles**: Enforced in component validation

---

**Status:** Ready for implementation
