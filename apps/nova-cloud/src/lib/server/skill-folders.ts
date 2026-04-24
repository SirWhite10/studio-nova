import { readdir, readFile } from "fs/promises";
import { existsSync, watch, type FSWatcher } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { Skill, SkillSource } from "$lib/skills/types";
import { parseSkillMarkdown, hashContent, generateSkillId } from "$lib/skills/types";

export interface SkillFolderConfig {
  path: string;
  source: SkillSource;
  priority: number;
}

const SKILL_FOLDERS: SkillFolderConfig[] = [
  { path: join(homedir(), ".nova", "skills"), source: "home-nova", priority: 1 },
  { path: join(process.cwd(), ".nova", "skills"), source: "project-nova", priority: 2 },
  { path: join(homedir(), ".agents", "skills"), source: "agents", priority: 3 },
];

const watchers: FSWatcher[] = [];
let reloadCallback: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function getSkillFolders(): SkillFolderConfig[] {
  return SKILL_FOLDERS.filter((f) => existsSync(f.path));
}

export async function scanFolderSkill(
  folderPath: string,
  source: SkillSource,
): Promise<Skill | null> {
  const skillFile = join(folderPath, "SKILL.md");

  if (!existsSync(skillFile)) {
    return null;
  }

  try {
    const content = await readFile(skillFile, "utf-8");
    const parsed = parseSkillMarkdown(content);

    if (!parsed || !parsed.name) {
      console.warn(`[skill-folders] Invalid SKILL.md in ${folderPath}: missing name`);
      return null;
    }

    const fileHash = await hashContent(content);
    const now = new Date().toISOString();

    const skill: Skill = {
      id: generateSkillId(),
      name: parsed.name,
      description: parsed.description,
      content: content,
      enabled: true,
      current_version: 1,
      usage_count: 0,
      success_count: 0,
      failure_count: 0,
      source,
      folder_path: folderPath,
      file_hash: fileHash,
      readonly: true,
      createdAt: now,
      updatedAt: now,
    };

    return skill;
  } catch (error) {
    console.error(`[skill-folders] Error reading ${skillFile}:`, error);
    return null;
  }
}

export async function scanAllSkillFolders(): Promise<Skill[]> {
  const seenNames = new Map<string, { priority: number; skill: Skill }>();

  for (const folder of SKILL_FOLDERS) {
    if (!existsSync(folder.path)) {
      continue;
    }

    try {
      const entries = await readdir(folder.path, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillPath = join(folder.path, entry.name);
        const skill = await scanFolderSkill(skillPath, folder.source);

        if (skill) {
          const existing = seenNames.get(skill.name);
          if (!existing || existing.priority > folder.priority) {
            seenNames.set(skill.name, { priority: folder.priority, skill });
          }
        }
      }
    } catch (error) {
      console.error(`[skill-folders] Error scanning ${folder.path}:`, error);
    }
  }

  return Array.from(seenNames.values()).map(({ skill }) => skill);
}

export function startSkillWatchers(onChange: () => void): void {
  stopSkillWatchers();
  reloadCallback = onChange;

  for (const folder of SKILL_FOLDERS) {
    if (!existsSync(folder.path)) {
      continue;
    }

    try {
      const watcher = watch(folder.path, { recursive: true }, (event, filename) => {
        if (filename && (filename.endsWith("SKILL.md") || filename.includes("SKILL.md"))) {
          debouncedReload();
        }
      });

      watcher.on("error", (error) => {
        console.error(`[skill-folders] Watcher error for ${folder.path}:`, error);
      });

      watchers.push(watcher);
      console.log(`[skill-folders] Watching ${folder.path}`);
    } catch (error) {
      console.error(`[skill-folders] Failed to watch ${folder.path}:`, error);
    }
  }
}

export function stopSkillWatchers(): void {
  for (const watcher of watchers) {
    try {
      watcher.close();
    } catch {
      // Ignore close errors
    }
  }
  watchers.length = 0;
  reloadCallback = null;
}

function debouncedReload(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (reloadCallback) {
      console.log("[skill-folders] Reloading skills due to file change...");
      reloadCallback();
    }
  }, 100);
}

export function getFolderSkillByPath(folderPath: string): Promise<Skill | null> {
  const folder = SKILL_FOLDERS.find((f) => folderPath.startsWith(f.path));
  if (!folder) return Promise.resolve(null);
  return scanFolderSkill(folderPath, folder.source);
}
