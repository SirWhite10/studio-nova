<script lang="ts">
  import { cn } from '$lib/utils';
  import type { SkillCommand } from '$lib/components/prompt-kit/prompt-input/prompt-input-context.svelte';

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

    try {
      const response = await fetch(`/api/skills/${encodeURIComponent(slugOrId)}`);
      if (response.ok) {
        const skill = await response.json();
        skillCache.set(slugOrId, skill);
        return skill;
      }
    } catch (error) {
      console.error('Failed to fetch skill:', error);
    }

    return null;
  }

  function measureTextWidth(text: string, textarea: HTMLTextAreaElement): number {
    const style = getComputedStyle(textarea);
    const span = document.createElement('span');
    span.style.cssText = `
      font: ${style.font};
      font-size: ${style.fontSize};
      font-family: ${style.fontFamily};
      font-weight: ${style.fontWeight};
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
    const width = span.getBoundingClientRect().width;
    document.body.removeChild(span);
    return width;
  }

  function getTextMetrics(text: string, textarea: HTMLTextAreaElement): { x: number; y: number } {
    const style = getComputedStyle(textarea);
    const span = document.createElement('span');
    span.style.cssText = `
      font: ${style.font};
      font-size: ${style.fontSize};
      font-family: ${style.fontFamily};
      font-weight: ${style.fontWeight};
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
    const style = getComputedStyle(textarea);
    const lineHeight = parseFloat(style.lineHeight) || parseInt(style.fontSize) * 1.2 || 20;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingLeft = parseFloat(style.paddingLeft) || 0;

    for (const cmd of commands) {
      const textBefore = text.slice(0, cmd.start);
      const linesBefore = (textBefore.match(/\n/g) || []).length;

      // Get metrics for text before command
      const metrics = getTextMetrics(textBefore, textarea);

      // Calculate final position
      const x = metrics.x + paddingLeft;
      const y = metrics.y + paddingTop + (linesBefore * lineHeight) - textarea.scrollTop;

      newPositions.set(cmd.id, { x, y });
    }

    chipPositions = newPositions;
  });

  // Recalculate on scroll
  function handleScroll() {
    // Trigger reactivity by accessing textarea.scrollTop
    // The $effect will re-run because textarea.scrollTop is accessed
  }

  function handleChipKeydown(event: KeyboardEvent, command: SkillCommand) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onChipClick(command);
    }
  }
</script>

<svelte:window onscroll={handleScroll} />

{#if textarea}
  <div class="absolute inset-0 pointer-events-none overflow-hidden">
    {#each commands as command (command.id)}
      {@const pos = chipPositions.get(command.id)}
      {#if pos}
        {@const skill = skillCache.get(command.name) || skillCache.get(command.id)}
        <div
          class="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary border border-primary/20 cursor-pointer hover:bg-primary/20 whitespace-nowrap transition-colors"
          style="position: absolute; left: {pos.x}px; top: {pos.y}px;"
          role="button"
          tabindex="0"
          onclick={() => onChipClick(command)}
          onkeydown={(event) => handleChipKeydown(event, command)}
          title={skill ? skill.description : command.name}
        >
          <span>{command.name}</span>
          <button
            type="button"
            aria-label={`Remove ${command.name} skill command`}
            class="ml-0.5 rounded-full hover:bg-primary/30 p-0.5 flex items-center justify-center min-w-[1rem] h-4 aspect-square"
            onclick={(e) => {
              e.stopPropagation();
              if (!textarea) return;
              const start = command.start;
              const end = command.end;
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
{/if}

<style>
  div[style*="position: absolute"] {
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    letter-spacing: inherit;
  }
</style>
