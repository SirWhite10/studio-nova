import { getSurreal } from "./surreal";

const TABLE_DEFINITIONS = [
  "DEFINE TABLE IF NOT EXISTS user SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS session SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS account SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS verification SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS rateLimit SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS chat SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS chat_message SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS chat_run SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS scheduled_job SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS studio_event SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS studio SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS user_plan SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS runtime_process SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS artifact SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS workspace SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS workspace_deployment SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS skills SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS integrations SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS integration_config SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS sandbox SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS memory SCHEMALESS",
];

let ensured = false;
let ensurePromise: Promise<void> | null = null;

export async function ensureTables() {
  if (ensured) return;
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const db = await getSurreal();
    for (const ddl of TABLE_DEFINITIONS) {
      await db.query(ddl).collect();
    }
    ensured = true;
    console.log("[DB] Ensured all tables exist");
  })();

  try {
    await ensurePromise;
  } catch (err) {
    ensurePromise = null;
    console.error("[DB] Failed to ensure tables:", err);
    throw err;
  }
}
