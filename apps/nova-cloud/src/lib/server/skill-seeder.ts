import { listSkillsByUser, upsertSkillForUser } from "$lib/server/surreal-skills";
import * as path from "path";
import { readFile, readdir } from "fs/promises";

const SKILL_PATHS = [
  path.join(process.env.HOME || "/root", ".agents", "skills"),
  path.join(process.cwd(), ".nova", "skills"),
  path.join(process.env.HOME || "/root", ".nova", "skills"),
];

async function hash(content: string): Promise<string> {
  return content.length.toString();
}

export async function scanAndSeedSkills() {
  for (const base of SKILL_PATHS) {
    try {
      const subdirs = await readdir(base, { withFileTypes: true });
      for (const dir of subdirs) {
        if (!dir.isDirectory()) continue;
        const skillMdPath = path.join(base, dir.name, "SKILL.md");
        try {
          const content = await readFile(skillMdPath, "utf-8");
          const fileHash = await hash(content);
          const nameMatch = content.match(/^#\s+(.+)$/m) ?? content.match(/^name:\s*(.+)$/m);
          const name = nameMatch ? nameMatch[1].trim() : dir.name;
          const descMatch = content.match(/^description:\s*(.+)$/m);
          const description = descMatch ? descMatch[1].trim() : undefined;

          const existing = await listSkillsByUser("seeder");
          const existingSkill = existing.find((s: any) => s.name === name && s.source === "agents");

          if (!existingSkill || (existingSkill as any).fileHash !== fileHash) {
            await upsertSkillForUser("seeder", {
              name,
              description,
              content,
              source: "agents",
              readonly: true,
            });
            console.log(`Seeded skill: ${name}`);
          }
        } catch {
          // Skip invalid skill folder
        }
      }
    } catch {
      // Skip missing path
    }
  }
}
