import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import type { Skill } from "$lib/skills/types";
import { scanAllSkillFolders } from "./skill-folders";

const DATA_DIR = process.env.NOVA_DATA_DIR || join(process.cwd(), "data");
const SKILLS_FILE = join(DATA_DIR, "skills.json");

type StoredSkill = Skill;

let skills: StoredSkill[] = [];
let isLoaded = false;
let isWatching = false;

async function loadJsonSkills(): Promise<StoredSkill[]> {
  try {
    if (existsSync(SKILLS_FILE)) {
      const data = await readFile(SKILLS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load skills.json:", error);
  }
  return [];
}

async function saveSkillsInternal(): Promise<void> {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    await writeFile(SKILLS_FILE, JSON.stringify(skills, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save skills:", error);
  }
}

async function mergeSkills(): Promise<void> {
  const jsonSkills = await loadJsonSkills();
  const folderSkills = await scanAllSkillFolders();

  const mergedMap = new Map<string, StoredSkill>();

  for (const skill of jsonSkills) {
    if (!skill.source || skill.source === "json") {
      mergedMap.set(skill.name, { ...skill, source: "json", readonly: false });
    }
  }

  for (const folderSkill of folderSkills) {
    const existing = mergedMap.get(folderSkill.name);

    if (existing) {
      if (existing.file_hash !== folderSkill.file_hash) {
        mergedMap.set(folderSkill.name, {
          ...folderSkill,
          id: existing.id,
          embedding: existing.embedding,
          usage_count: existing.usage_count,
          success_count: existing.success_count,
          failure_count: existing.failure_count,
          last_used_at: existing.last_used_at,
          createdAt: existing.createdAt,
        });
      }
    } else {
      mergedMap.set(folderSkill.name, folderSkill);
    }
  }

  skills = Array.from(mergedMap.values());
  await saveSkillsInternal();
}

export async function loadSkills(): Promise<void> {
  if (isLoaded) return;
  await reloadSkills();
  isLoaded = true;
}

export async function reloadSkills(): Promise<void> {
  await mergeSkills();
}

export async function getAllSkills(): Promise<Skill[]> {
  await loadSkills();
  return [...skills];
}

export async function getSkillById(id: string): Promise<Skill | undefined> {
  await loadSkills();
  return skills.find((s) => s.id === id);
}

export async function createSkill(data: {
  name: string;
  description?: string;
  content: string;
  enabled?: boolean;
  current_version?: number;
  usage_count?: number;
  success_count?: number;
  failure_count?: number;
}): Promise<Skill> {
  await loadSkills();
  const now = new Date().toISOString();
  const newSkill: StoredSkill = {
    id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: data.name,
    description: data.description,
    content: data.content,
    enabled: data.enabled ?? true,
    current_version: data.current_version ?? 1,
    usage_count: data.usage_count ?? 0,
    success_count: data.success_count ?? 0,
    failure_count: data.failure_count ?? 0,
    source: "json",
    readonly: false,
    createdAt: now,
    updatedAt: now,
  };
  skills.push(newSkill);
  await saveSkillsInternal();
  return newSkill;
}

export async function updateSkill(
  id: string,
  updates: {
    name?: string;
    description?: string;
    content?: string;
    enabled?: boolean;
  },
): Promise<Skill | null> {
  await loadSkills();
  const index = skills.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const skill = skills[index];
  if (skill.readonly) {
    console.warn(`[skill-store] Cannot update readonly skill: ${skill.name}`);
    return null;
  }

  skills[index] = {
    ...skills[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await saveSkillsInternal();
  return skills[index];
}

export async function deleteSkill(id: string): Promise<boolean> {
  await loadSkills();
  const skill = skills.find((s) => s.id === id);
  if (!skill) return false;

  if (skill.readonly) {
    console.warn(`[skill-store] Cannot delete readonly skill: ${skill.name}`);
    return false;
  }

  const initialLength = skills.length;
  skills = skills.filter((s) => s.id !== id);
  if (skills.length !== initialLength) {
    await saveSkillsInternal();
    return true;
  }
  return false;
}

export async function toggleSkillEnabled(id: string): Promise<boolean> {
  await loadSkills();
  const skill = skills.find((s) => s.id === id);
  if (!skill) return false;

  if (skill.readonly) {
    console.warn(`[skill-store] Cannot toggle readonly skill: ${skill.name}`);
    return false;
  }

  skill.enabled = !skill.enabled;
  skill.updatedAt = new Date().toISOString();
  await saveSkillsInternal();
  return skill.enabled;
}

export async function setSkillEnabled(id: string, enabled: boolean): Promise<boolean> {
  await loadSkills();
  const skill = skills.find((s) => s.id === id);
  if (!skill) return false;

  if (skill.readonly) {
    console.warn(`[skill-store] Cannot modify readonly skill: ${skill.name}`);
    return false;
  }

  skill.enabled = enabled;
  skill.updatedAt = new Date().toISOString();
  await saveSkillsInternal();
  return true;
}

export async function setSkillEmbedding(id: string, embedding: number[]): Promise<void> {
  await loadSkills();
  const skill = skills.find((s) => s.id === id);
  if (skill) {
    skill.embedding = embedding;
    await saveSkillsInternal();
  }
}

export async function getEnabledSkills(): Promise<Skill[]> {
  await loadSkills();
  return skills.filter((s) => s.enabled);
}

export async function updateSkillStats(
  id: string,
  stats: {
    usage_count?: number;
    success_count?: number;
    failure_count?: number;
    last_used_at?: string;
  },
): Promise<void> {
  await loadSkills();
  const skill = skills.find((s) => s.id === id);
  if (skill) {
    Object.assign(skill, stats);
    skill.updatedAt = new Date().toISOString();
    await saveSkillsInternal();
  }
}

export function startWatching(onChange?: () => void): void {
  if (isWatching) return;
  isWatching = true;

  const { startSkillWatchers } = require("./skill-folders");
  startSkillWatchers(async () => {
    console.log("[skill-store] File change detected, reloading skills...");
    await reloadSkills();
    if (onChange) onChange();
  });
}
