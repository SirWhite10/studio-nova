<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils';
  import Textarea from '$lib/components/ui/textarea/textarea.svelte';
  import { getPromptInputContext } from './prompt-input-context.svelte.js';
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { watch } from 'runed';
  import SkillAutocomplete from '$lib/components/skills/SkillAutocomplete.svelte';
  import SkillChipOverlay from '$lib/components/skills/SkillChipOverlay.svelte';

  const context = getPromptInputContext();

  let {
    class: className,
    onkeydown,
    disableAutosize = false,
    ...restProps
  }: HTMLTextareaAttributes & {
    disableAutosize?: boolean;
  } = $props();

  let textareaRef = $state<HTMLTextAreaElement | null>(null);
  let autocompleteRef = $state<HTMLDivElement | null>(null);
  let skills: any[] = $state([]);
  let showAutocomplete = $state(false);
  let autocompleteQuery = $state('');
  let autocompletePosition = $state({ x: 0, y: 0 });

  onMount(async () => {
    try {
      const res = await fetch('/api/skills/autocomplete');
      if (res.ok) {
        skills = await res.json();
      }
    } catch (e) {
      console.error('Failed to load skills for autocomplete:', e);
    }
  });

  function handleKeyDown(e: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      context.onSubmit?.();
    }
    onkeydown?.(e);
  }

  function handleInput(e: Event & { currentTarget: HTMLTextAreaElement }) {
    const value = e.currentTarget.value;
    context.setValue(value);

    const cursorPos = e.currentTarget.selectionStart || 0;
    const textUpToCursor = value.slice(0, cursorPos);

    const lastSpace = textUpToCursor.lastIndexOf(' ');
    const lastNewline = textUpToCursor.lastIndexOf('\n');
    const lastWhitespace = Math.max(lastSpace, lastNewline);

    const textAfterWhitespace = textUpToCursor.slice(lastWhitespace + 1);

    if (textAfterWhitespace.startsWith('/')) {
      autocompleteQuery = textAfterWhitespace.slice(1);
      showAutocomplete = true;
      updateAutocompletePosition(e.currentTarget);
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

  // Auto-resize functionality
  watch([() => context.value, () => context.maxHeight, () => disableAutosize], () => {
    if (disableAutosize) return;
    if (!context.textareaRef) return;

    if (context.textareaRef.scrollTop === 0) {
      context.textareaRef.style.height = "auto";
    }

    context.textareaRef.style.height =
      typeof context.maxHeight === "number"
        ? `${Math.min(context.textareaRef.scrollHeight, context.maxHeight)}px`
        : `min(${context.textareaRef.scrollHeight}px, ${context.maxHeight})`;
  });
</script>

<div class="relative">
  <Textarea
    bind:ref={textareaRef}
    value={context.value}
    oninput={handleInput}
    onkeydown={handleKeyDown}
    class={cn(
      "text-primary min-h-[44px] w-full resize-none border-none !bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
      className
    )}
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
      bind:this={autocompleteRef}
    >
      <SkillAutocomplete
        query={autocompleteQuery}
        {skills}
        position={autocompletePosition}
        onSelect={selectSkill}
        onClose={() => showAutocomplete = false}
      />
    </div>
  {/if}
</div>
