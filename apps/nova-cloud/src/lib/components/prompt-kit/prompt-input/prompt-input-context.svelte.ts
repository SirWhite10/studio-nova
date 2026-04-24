import { getContext, setContext } from "svelte";

export type PromptInputSchema = {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
};

export type SkillCommand = {
  id: string;
  name: string;
  start: number;
  end: number;
};

export class PromptInputClass {
  isLoading = $state(false);
  value = $state("");
  maxHeight = $state<number | string>(240);
  onSubmit = $state<(() => void) | undefined>(undefined);
  disabled = $state(false);
  textareaRef = $state<HTMLTextAreaElement | null>(null);
  onValueChange = $state<((value: string) => void) | undefined>(undefined);

  skillCommands = $state<SkillCommand[]>([]);
  onSkillCommandAdd?: (command: SkillCommand) => void;
  onSkillCommandRemove?: (commandId: string) => void;
  onSkillCommandsChange?: (commands: SkillCommand[]) => void;

  constructor(props: PromptInputSchema) {
    this.isLoading = props.isLoading ?? false;
    this.value = props.value ?? "";
    this.maxHeight = props.maxHeight ?? 240;
    this.onSubmit = props.onSubmit;
    this.disabled = props.disabled ?? false;
    this.onValueChange = props.onValueChange;
  }

  updateSkillCommands(text: string) {
    const commands: SkillCommand[] = [];
    const regex = /\/([a-zA-Z0-9][a-zA-Z0-9-]*)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      commands.push({
        id: `placeholder-${match.index}`,
        name: match[1],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    this.skillCommands = commands;
    this.onSkillCommandsChange?.(commands);
  }

  setValue(newValue: string) {
    this.value = newValue;
    this.onValueChange?.(newValue);
    this.updateSkillCommands(newValue);
  }

  addSkillCommand(skill: any, start: number, end: number) {
    this.skillCommands = this.skillCommands.filter(
      (c) => !(c.start === start && c.id.startsWith("placeholder-")),
    );
    this.skillCommands.push({
      id: skill.id,
      name: skill.name,
      start,
      end,
    });
    this.onSkillCommandAdd?.({ id: skill.id, name: skill.name, start, end });
  }

  removeSkillCommandById(id: string) {
    this.skillCommands = this.skillCommands.filter((c) => c.id !== id);
    this.onSkillCommandRemove?.(id);
  }
}

const PROMPT_INPUT_KEY = Symbol("prompt-input");

export function setPromptInputContext(contextInstance: PromptInputClass) {
  setContext(PROMPT_INPUT_KEY, contextInstance);
}

export function getPromptInputContext(): PromptInputClass {
  const context = getContext<PromptInputClass>(PROMPT_INPUT_KEY);

  if (!context) {
    throw new Error("PromptInput components must be used within PromptInput");
  }

  return context;
}
