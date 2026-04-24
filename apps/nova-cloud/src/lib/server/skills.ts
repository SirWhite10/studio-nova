import { SkillManager } from "$lib/skills/manager";
import type { Skill, SkillVersion, SkillExecutionLog, SkillStats } from "$lib/skills/types";

let instance: SkillManager | null = null;

export function getSkillManager(): SkillManager {
  if (!instance) {
    instance = new SkillManager();
  }
  return instance;
}

export type { Skill, SkillVersion, SkillExecutionLog, SkillStats };
export {
  parseSkillMarkdown,
  createDefaultSkillStats,
  hashContent,
  generateSkillId,
  generateVersionId,
  generateExecutionId,
} from "$lib/skills/types";
