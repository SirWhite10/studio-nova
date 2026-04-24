import { StringRecordId, Table } from "surrealdb";
import { getSurreal } from "./surreal";
import { queryRows, recordIdToString, withRecordIds } from "./surreal-records";

export type UserPlanRow = {
  id: unknown;
  userId: string;
  plan: "free" | "pro";
  createdAt: number;
  updatedAt: number;
};

async function ensurePlanTable() {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS user_plan SCHEMALESS").collect();
  return db;
}

export async function getUserPlan(userId: string): Promise<UserPlanRow | null> {
  const db = await ensurePlanTable();
  const rows = await queryRows<UserPlanRow>(
    db,
    "SELECT * FROM user_plan WHERE userId = $userId LIMIT 1",
    { userId },
  );
  const row = rows[0];
  if (!row) {
    return { id: "free", userId, plan: "free", createdAt: 0, updatedAt: 0 };
  }
  return withRecordIds(row);
}

export async function setUserPlan(userId: string, plan: "free" | "pro"): Promise<UserPlanRow> {
  const db = await ensurePlanTable();
  const now = Date.now();

  const existing = await queryRows<UserPlanRow>(
    db,
    "SELECT * FROM user_plan WHERE userId = $userId LIMIT 1",
    { userId },
  );

  if (existing[0]) {
    const rid = recordIdToString(existing[0].id);
    const updated = await db.update<UserPlanRow>(new StringRecordId(rid)).merge({
      plan,
      updatedAt: now,
    });
    return withRecordIds((Array.isArray(updated) ? updated[0] : updated) as UserPlanRow);
  }

  const created = await db.create(new Table("user_plan")).content({
    userId,
    plan,
    createdAt: now,
    updatedAt: now,
  });
  return withRecordIds((Array.isArray(created) ? created[0] : created) as UserPlanRow);
}
