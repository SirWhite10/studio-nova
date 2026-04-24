import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import type { SkillVersion } from "$lib/skills/types";
import { generateVersionId, hashContent } from "$lib/skills/types";

// const EMBEDDING_DIMENSIONS = 384; // unused

const DATA_DIR = process.env.NOVA_DATA_DIR || join(process.cwd(), "data");
const VERSIONS_FILE = join(DATA_DIR, "skill-versions.json");

let versions: SkillVersion[] = [];
let isLoaded = false;

export async function getAllVersions(): Promise<SkillVersion[]> {
  await loadVersions();
  return [...versions];
}

export async function getVersions(skillId: string): Promise<SkillVersion[]> {
  await loadVersions();
  return versions.filter((v) => v.skill_id === skillId) ?? [];
}

export async function getVersion(
  skillId: string,
  versionNumber: number,
): Promise<SkillVersion | null> {
  const versions = await getVersions(skillId);
  return versions.find((v) => v.skill_id === skillId && v.version_number === versionNumber) ?? null;
}

export async function createVersion(
  skillId: string,
  content: string,
  createdBy: string = "system",
  changeSummary?: string,
): Promise<SkillVersion> {
  const versions = await getVersions(skillId);

  if (versions.length === 0) {
    const newVersion: SkillVersion = {
      id: generateVersionId(),
      skill_id: skillId,
      version_number: 1,
      content,
      embedding: [],
      file_hash: await hashContent(content),
      created_by: createdBy,
      created_at: new Date().toISOString(),
      change_summary: changeSummary,
    };
    versions.push(newVersion);
    await saveVersions();
    return newVersion;
  }

  const contentHash = await hashContent(content);
  const existingVersion = versions.find((v) => v.file_hash === contentHash);

  if (existingVersion) {
    return existingVersion;
  }

  const newVersionNumber = Math.max(...versions.map((v) => v.version_number), 0) + 1;
  const newVersion: SkillVersion = {
    id: generateVersionId(),
    skill_id: skillId,
    version_number: newVersionNumber,
    content,
    embedding: [],
    file_hash: contentHash,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    change_summary: changeSummary,
  };
  versions.push(newVersion);
  await saveVersions();
  return newVersion;
}

export async function getLatestVersion(skillId: string): Promise<SkillVersion | null> {
  const versions = await getVersions(skillId);
  if (versions.length === 0) return null;
  return versions.reduce((latest, current) =>
    latest.version_number > current.version_number ? latest : current,
  );
}

async function loadVersions(): Promise<void> {
  if (isLoaded) return;
  try {
    if (existsSync(VERSIONS_FILE)) {
      const data = await readFile(VERSIONS_FILE, "utf-8");
      versions = JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load skill versions:", error);
    versions = [];
  }
  isLoaded = true;
}

async function saveVersions(): Promise<void> {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    await writeFile(VERSIONS_FILE, JSON.stringify(versions, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save skill versions:", error);
  }
}
