import {
  getAllSkills as getStoreSkills,
  createSkill as storeCreateSkill,
  updateSkill as storeUpdateSkill,
  deleteSkill as storeDeleteSkill,
  toggleSkillEnabled as storeToggleEnabled,
  getSkillById as storeGetSkillById,
  getEnabledSkills as storeGetEnabled,
  setSkillEmbedding as storeSetEmbedding,
  setSkillEnabled as storeSetEnabled,
} from "../server/skill-store";
import { parseSkillMarkdown } from "./types";
import { embeddingsGenerator } from "$lib/memory/embeddings";
import type { Skill } from "./types";

export class SkillManager {
  async initialize(): Promise<void> {
    await this.ensureEmbeddings();
  }

  private async ensureEmbeddings(): Promise<void> {
    const skills = await getStoreSkills();
    for (const skill of skills) {
      if (!skill.embedding) {
        try {
          const embedding = await embeddingsGenerator.generate(skill.content);
          await storeSetEmbedding(skill.id, embedding);
        } catch (error) {
          console.error(`Failed to generate embedding for skill ${skill.id}:`, error);
        }
      }
    }
  }

  async createSkill(name: string, content: string): Promise<Skill> {
    const frontmatter = parseSkillMarkdown(content);
    if (!frontmatter || !frontmatter.name) {
      throw new Error("Invalid skill markdown: missing frontmatter with name");
    }

    const skill = await storeCreateSkill({
      name: frontmatter.name,
      description: frontmatter.description,
      content,
      enabled: true,
    });

    try {
      const embedding = await embeddingsGenerator.generate(content);
      await storeSetEmbedding(skill.id, embedding);
    } catch (error) {
      console.error("Failed to generate embedding:", error);
    }

    return skill;
  }

  async updateSkill(
    id: string,
    updates: {
      content?: string;
      name?: string;
      description?: string;
      enabled?: boolean;
    },
  ): Promise<Skill | null> {
    const existing = await storeGetSkillById(id);
    if (!existing) {
      return null;
    }
    if (existing.readonly) {
      throw new Error("Cannot update readonly skill");
    }

    const finalUpdates: any = { ...updates };

    if (updates.content) {
      const frontmatter = parseSkillMarkdown(updates.content);
      if (!frontmatter) {
        throw new Error("Invalid skill markdown");
      }
      if (frontmatter.name) finalUpdates.name = frontmatter.name;
      if (frontmatter.description !== undefined) finalUpdates.description = frontmatter.description;
    }

    const skill = await storeUpdateSkill(id, finalUpdates);
    if (skill && updates.content) {
      try {
        const embedding = await embeddingsGenerator.generate(updates.content);
        await storeSetEmbedding(id, embedding);
      } catch (error) {
        console.error("Failed to update embedding:", error);
      }
    }
    return skill;
  }

  async deleteSkill(id: string): Promise<boolean> {
    const existing = await storeGetSkillById(id);
    if (!existing) {
      return false;
    }
    if (existing.readonly) {
      throw new Error("Cannot delete readonly skill");
    }
    return storeDeleteSkill(id);
  }

  async toggleEnabled(id: string): Promise<boolean> {
    return storeToggleEnabled(id);
  }

  async setEnabled(id: string, enabled: boolean): Promise<boolean> {
    return storeSetEnabled(id, enabled);
  }

  async searchSkills(query: string, limit: number = 3): Promise<Skill[]> {
    if (!query.trim()) return [];

    const skills = await storeGetEnabled();
    const skillsWithEmbedding = skills.filter((s) => s.embedding);
    if (skillsWithEmbedding.length === 0) return [];

    try {
      const queryEmbedding = await embeddingsGenerator.generate(query);

      const scored = skillsWithEmbedding.map((skill) => ({
        skill,
        score: cosineSimilarity(queryEmbedding, skill.embedding!),
      }));

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).map((s) => s.skill);
    } catch (error) {
      console.error("Search failed:", error);
      return [];
    }
  }

  async getBySlug(slug: string): Promise<Skill | undefined> {
    const skills = await getStoreSkills();
    return skills.find((s) => {
      const skillSlug = s.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return skillSlug === slug || s.id === slug;
    });
  }

  async getAllSkills(): Promise<Skill[]> {
    return await getStoreSkills();
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
