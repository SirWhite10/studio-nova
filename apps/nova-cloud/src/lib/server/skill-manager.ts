import { SkillManager } from "$lib/skills/manager";

let instance: SkillManager | null = null;

export function getSkillManager(): SkillManager {
  if (!instance) {
    instance = new SkillManager();
  }
  return instance;
}
