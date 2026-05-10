import { StringRecordId, Table } from "surrealdb";
import {
  defaultStudioAppearanceSettings,
  defaultStudioNavigationProfile,
  type StudioAppearanceSettings,
  type StudioNavigationProfile,
} from "$lib/studios/types";
import { getSurreal } from "./surreal";
import {
  ensureRecordPrefix,
  normalizeRouteParam,
  normalizeSurrealRow,
  normalizeSurrealRows,
  queryRows,
} from "./surreal-records";

export type StudioRow = {
  id: unknown;
  userId: string;
  name: string;
  description?: string;
  purpose?: string;
  icon?: string;
  color?: string;
  themeHue?: number;
  appearanceSettings?: StudioAppearanceSettings;
  navigationProfile?: StudioNavigationProfile;
  isDefault?: boolean;
  prefix?: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
};

const PURPOSE_ICON: Record<string, string> = {
  coding: "code",
  research: "search",
  content: "pen",
  general: "sparkles",
};

const PURPOSE_COLOR: Record<string, string> = {
  coding: "from-sky-500/80 via-blue-500/70 to-indigo-500/80",
  research: "from-emerald-500/80 via-teal-500/70 to-cyan-500/80",
  content: "from-fuchsia-500/80 via-pink-500/70 to-rose-500/80",
  general: "from-amber-400/80 via-orange-500/70 to-rose-500/80",
};

export async function listStudiosForUser(userId: string) {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS studio SCHEMALESS");
  const rows = await queryRows<StudioRow>(
    db,
    "SELECT * FROM studio WHERE userId = $userId ORDER BY lastOpenedAt DESC, createdAt DESC",
    { userId },
  );
  return normalizeSurrealRows<StudioRow>(rows);
}

export async function getStudioForUser(userId: string, studioId: string) {
  const db = await getSurreal();
  const fullId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  try {
    const row = await db.select<StudioRow>(new StringRecordId(fullId));
    if (!row || row.userId !== userId) return null;
    return normalizeSurrealRow<StudioRow>(row);
  } catch {
    return null;
  }
}

export async function createStudioForUser(input: {
  userId: string;
  name: string;
  description?: string;
  purpose?: string;
  themeHue?: number;
}) {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS studio SCHEMALESS");

  const existing = await listStudiosForUser(input.userId);
  const now = Date.now();
  const purpose = input.purpose || "general";

  const [created] = await db.create(new Table("studio")).content({
    userId: input.userId,
    name: input.name,
    description: input.description || null,
    purpose,
    themeHue: input.themeHue ?? 25,
    appearanceSettings: defaultStudioAppearanceSettings(input.themeHue ?? 25),
    navigationProfile: defaultStudioNavigationProfile(),
    icon: PURPOSE_ICON[purpose] || "sparkles",
    color: PURPOSE_COLOR[purpose] || PURPOSE_COLOR.general,
    isDefault: existing.length === 0,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  });

  const record = normalizeSurrealRow<StudioRow>(created);

  const studioId = record._id;
  const prefix = `user-${input.userId}-studio-${studioId}/`;
  const fullId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  await db.update(new StringRecordId(fullId)).merge({ prefix });

  return { ...record, prefix };
}

export async function updateStudio(
  userId: string,
  studioId: string,
  updates: Partial<
    Pick<
      StudioRow,
      | "name"
      | "description"
      | "themeHue"
      | "purpose"
      | "icon"
      | "color"
      | "appearanceSettings"
      | "navigationProfile"
    >
  >,
) {
  const db = await getSurreal();
  const fullId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  const now = Date.now();
  const updated = await db.update(new StringRecordId(fullId)).merge({
    ...updates,
    updatedAt: now,
  });
  return normalizeSurrealRow<StudioRow>(updated);
}

export async function touchStudio(studioId: string) {
  const db = await getSurreal();
  const fullId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  await db.update(new StringRecordId(fullId)).merge({
    lastOpenedAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function deleteStudioForUser(userId: string, studioId: string) {
  const db = await getSurreal();
  const fullId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));

  const existing = await getStudioForUser(userId, studioId);
  if (!existing) {
    throw new Error("Studio not found or you do not have permission to delete it.");
  }

  try {
    await db.delete(new StringRecordId(fullId));
  } catch (e) {
    throw new Error(
      `Failed to delete studio record: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const relatedTables = [
    "chat",
    "chat_message",
    "chat_run",
    "integrations",
    "runtime_process",
    "sandbox",
  ];
  const cleanupErrors: string[] = [];

  for (const table of relatedTables) {
    try {
      await db.query(`DELETE FROM ${table} WHERE userId = $userId AND studioId = $studioId`, {
        userId,
        studioId: fullId,
      });
    } catch (e) {
      cleanupErrors.push(`${table}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (cleanupErrors.length > 0) {
    console.warn(
      `[deleteStudioForUser] Partial cleanup failures for studio ${studioId}: ${cleanupErrors.join("; ")}`,
    );
  }

  return true;
}
