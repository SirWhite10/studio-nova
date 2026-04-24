import { StringRecordId, Table } from "surrealdb";
import { getSurreal } from "./surreal";
import {
  ensureRecordPrefix,
  normalizeRouteParam,
  queryRows,
  recordIdToString,
  withRecordIds,
} from "./surreal-records";

export type SurrealSkill = {
  id: unknown;
  userId: string;
  name: string;
  description?: string;
  content: string;
  enabled: boolean;
  source: string;
  readonly: boolean;
  usageCount?: number;
  currentVersion?: number;
  createdAt: number;
  updatedAt: number;
};

type UpsertSkillInput = {
  id?: string;
  name: string;
  description?: string;
  content: string;
  source?: string;
  readonly?: boolean;
  enabled?: boolean;
};

function skillScore(
  skill: Pick<SurrealSkill, "name" | "description" | "content">,
  query: string,
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const title = skill.name.toLowerCase();
  const desc = (skill.description ?? "").toLowerCase();
  const body = skill.content.toLowerCase();
  let score = 0;
  if (title.includes(q)) score += 10;
  if (desc.includes(q)) score += 5;
  if (body.includes(q)) score += 2;
  for (const token of q.split(/\s+/).filter(Boolean)) {
    if (title.includes(token)) score += 2;
    if (desc.includes(token)) score += 1;
  }
  return score;
}

export async function listSkillsByUser(userId: string, enabledOnly = false) {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS skills SCHEMALESS").collect();

  const rows = await queryRows<SurrealSkill>(
    db,
    `SELECT * FROM skills WHERE userId = $userId ${enabledOnly ? "AND enabled = true" : ""} ORDER BY updatedAt DESC`,
    { userId },
  );
  return rows.map((row) => withRecordIds(row));
}

export async function getSkillByIdForUser(userId: string, skillId: string) {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS skills SCHEMALESS").collect();

  const fullId = ensureRecordPrefix("skills", normalizeRouteParam(skillId));
  const selected = await db.select<SurrealSkill>(new StringRecordId(fullId));
  const row = Array.isArray(selected) ? selected[0] : selected;
  if (!row || row.userId !== userId) return null;
  return withRecordIds(row);
}

export async function upsertSkillForUser(userId: string, input: UpsertSkillInput) {
  const db = await getSurreal();
  const now = Date.now();
  const payload = {
    name: input.name,
    description: input.description,
    content: input.content,
    source: input.source ?? "json",
    readonly: input.readonly ?? false,
    enabled: input.enabled ?? true,
    updatedAt: now,
  };

  if (input.id) {
    const existing = await getSkillByIdForUser(userId, input.id);
    if (!existing) throw new Error("Skill not found");
    const updated = await db.update(new StringRecordId(existing.id)).merge(payload);
    const row = Array.isArray(updated) ? updated[0] : updated;
    return withRecordIds(row as SurrealSkill);
  }

  const byName = await queryRows<SurrealSkill>(
    db,
    "SELECT * FROM skills WHERE userId = $userId AND name = $name LIMIT 1",
    { userId, name: input.name },
  );

  if (byName[0]) {
    const existingId = recordIdToString(byName[0].id);
    const updated = await db.update(new StringRecordId(existingId)).merge(payload);
    const row = Array.isArray(updated) ? updated[0] : updated;
    return withRecordIds(row as SurrealSkill);
  }

  const created = await db.create(new Table("skills")).content({
    userId,
    ...payload,
    usageCount: 0,
    currentVersion: 1,
    createdAt: now,
  });
  const row = Array.isArray(created) ? created[0] : created;
  return withRecordIds(row as SurrealSkill);
}

export async function deleteSkillForUser(userId: string, skillId: string) {
  const db = await getSurreal();
  const existing = await getSkillByIdForUser(userId, skillId);
  if (!existing) throw new Error("Skill not found");
  await db.delete(new StringRecordId(existing.id));
}

export async function searchSkillsForUser(userId: string, query: string, limit = 5) {
  const all = await listSkillsByUser(userId, true);
  return all
    .map((skill) => ({
      skill,
      score: skillScore(skill, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
