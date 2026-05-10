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
  "DEFINE TABLE IF NOT EXISTS runtime_process SCHEMAFULL",
  "DEFINE TABLE IF NOT EXISTS artifact SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS workspace SCHEMAFULL",
  "DEFINE TABLE IF NOT EXISTS workspace_deployment SCHEMAFULL",
  "DEFINE TABLE IF NOT EXISTS skills SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS integrations SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS integration_config SCHEMALESS",
  "DEFINE TABLE IF NOT EXISTS sandbox SCHEMAFULL",
  "DEFINE TABLE IF NOT EXISTS memory SCHEMALESS",
  "DEFINE FIELD IF NOT EXISTS userId ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS studioId ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS sandboxId ON TABLE workspace TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS name ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS slug ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS templateKind ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS framework ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS status ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS runtimeKind ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS lifecycleMode ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS runCommand ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS healthCheckPath ON TABLE workspace TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS publicHost ON TABLE workspace TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS statePath ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS runtimeImage ON TABLE workspace TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS rootPath ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS sourcePath ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS buildPath ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS contentPath ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS outputDir ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS scaffoldCommand ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS installCommand ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS buildCommand ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS serveCommand ON TABLE workspace TYPE string",
  "DEFINE FIELD IF NOT EXISTS defaultHost ON TABLE workspace TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS activeDeploymentId ON TABLE workspace TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS createdAt ON TABLE workspace TYPE number",
  "DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE workspace TYPE number",
  "DEFINE INDEX IF NOT EXISTS workspace_user_idx ON TABLE workspace FIELDS userId",
  "DEFINE INDEX IF NOT EXISTS workspace_studio_idx ON TABLE workspace FIELDS studioId",
  "DEFINE INDEX IF NOT EXISTS workspace_slug_idx ON TABLE workspace FIELDS studioId, slug UNIQUE",
  "DEFINE INDEX IF NOT EXISTS workspace_status_idx ON TABLE workspace FIELDS status",
  "DEFINE INDEX IF NOT EXISTS workspace_active_deployment_idx ON TABLE workspace FIELDS activeDeploymentId",
  "DEFINE FIELD IF NOT EXISTS userId ON TABLE workspace_deployment TYPE string",
  "DEFINE FIELD IF NOT EXISTS studioId ON TABLE workspace_deployment TYPE string",
  "DEFINE FIELD IF NOT EXISTS workspaceId ON TABLE workspace_deployment TYPE string",
  "DEFINE FIELD IF NOT EXISTS status ON TABLE workspace_deployment TYPE string",
  "DEFINE FIELD IF NOT EXISTS revision ON TABLE workspace_deployment TYPE int",
  "DEFINE FIELD IF NOT EXISTS artifactPath ON TABLE workspace_deployment TYPE string",
  "DEFINE FIELD IF NOT EXISTS outputDir ON TABLE workspace_deployment TYPE string",
  "DEFINE FIELD IF NOT EXISTS buildCommand ON TABLE workspace_deployment TYPE string",
  "DEFINE FIELD IF NOT EXISTS serveCommand ON TABLE workspace_deployment TYPE string",
  "DEFINE FIELD IF NOT EXISTS runtimeKind ON TABLE workspace_deployment TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS lifecycleMode ON TABLE workspace_deployment TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS runCommand ON TABLE workspace_deployment TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS healthCheckPath ON TABLE workspace_deployment TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS publicHost ON TABLE workspace_deployment TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS statePath ON TABLE workspace_deployment TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS runtimeImage ON TABLE workspace_deployment TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS activatedAt ON TABLE workspace_deployment TYPE option<number>",
  "DEFINE FIELD OVERWRITE metadata ON TABLE workspace_deployment TYPE option<object> FLEXIBLE",
  "DEFINE FIELD IF NOT EXISTS createdAt ON TABLE workspace_deployment TYPE number",
  "DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE workspace_deployment TYPE number",
  "DEFINE INDEX IF NOT EXISTS workspace_deployment_user_idx ON TABLE workspace_deployment FIELDS userId",
  "DEFINE INDEX IF NOT EXISTS workspace_deployment_studio_idx ON TABLE workspace_deployment FIELDS studioId",
  "DEFINE INDEX IF NOT EXISTS workspace_deployment_workspace_idx ON TABLE workspace_deployment FIELDS workspaceId",
  "DEFINE INDEX IF NOT EXISTS workspace_deployment_status_idx ON TABLE workspace_deployment FIELDS status",
  "DEFINE INDEX IF NOT EXISTS workspace_deployment_revision_idx ON TABLE workspace_deployment FIELDS workspaceId, revision UNIQUE",
  "DEFINE FIELD IF NOT EXISTS userId ON TABLE runtime_process TYPE string",
  "DEFINE FIELD IF NOT EXISTS studioId ON TABLE runtime_process TYPE string",
  "DEFINE FIELD IF NOT EXISTS workspaceId ON TABLE runtime_process TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS sandboxId ON TABLE runtime_process TYPE string",
  "DEFINE FIELD IF NOT EXISTS label ON TABLE runtime_process TYPE string",
  "DEFINE FIELD IF NOT EXISTS command ON TABLE runtime_process TYPE string",
  "DEFINE FIELD IF NOT EXISTS cwd ON TABLE runtime_process TYPE string",
  "DEFINE FIELD IF NOT EXISTS pid ON TABLE runtime_process TYPE int",
  "DEFINE FIELD IF NOT EXISTS port ON TABLE runtime_process TYPE option<int>",
  "DEFINE FIELD IF NOT EXISTS previewUrl ON TABLE runtime_process TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS runtimeKind ON TABLE runtime_process TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS lifecycleMode ON TABLE runtime_process TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS runCommand ON TABLE runtime_process TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS healthCheckPath ON TABLE runtime_process TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS publicHost ON TABLE runtime_process TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS statePath ON TABLE runtime_process TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS runtimeImage ON TABLE runtime_process TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS status ON TABLE runtime_process TYPE string",
  "DEFINE FIELD IF NOT EXISTS logSummary ON TABLE runtime_process TYPE option<string>",
  "DEFINE FIELD OVERWRITE metadata ON TABLE runtime_process TYPE option<object> FLEXIBLE",
  "DEFINE FIELD IF NOT EXISTS createdAt ON TABLE runtime_process TYPE number",
  "DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE runtime_process TYPE number",
  "DEFINE INDEX IF NOT EXISTS runtime_process_user_idx ON TABLE runtime_process FIELDS userId",
  "DEFINE INDEX IF NOT EXISTS runtime_process_studio_idx ON TABLE runtime_process FIELDS studioId",
  "DEFINE INDEX IF NOT EXISTS runtime_process_workspace_idx ON TABLE runtime_process FIELDS workspaceId",
  "DEFINE INDEX IF NOT EXISTS runtime_process_status_idx ON TABLE runtime_process FIELDS status",
  "DEFINE INDEX IF NOT EXISTS runtime_process_sandbox_idx ON TABLE runtime_process FIELDS sandboxId",
  "DEFINE FIELD IF NOT EXISTS userId ON TABLE sandbox TYPE string",
  "DEFINE FIELD IF NOT EXISTS studioId ON TABLE sandbox TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS workspaceId ON TABLE sandbox TYPE option<string>",
  "DEFINE FIELD IF NOT EXISTS sandboxId ON TABLE sandbox TYPE string",
  "DEFINE FIELD IF NOT EXISTS templateId ON TABLE sandbox TYPE string",
  "DEFINE FIELD IF NOT EXISTS status ON TABLE sandbox TYPE string",
  "DEFINE FIELD IF NOT EXISTS lastUsedAt ON TABLE sandbox TYPE number",
  "DEFINE FIELD IF NOT EXISTS expiresAt ON TABLE sandbox TYPE number",
  "DEFINE FIELD IF NOT EXISTS createdAt ON TABLE sandbox TYPE number",
  "DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE sandbox TYPE number",
  "DEFINE INDEX IF NOT EXISTS sandbox_user_idx ON TABLE sandbox FIELDS userId",
  "DEFINE INDEX IF NOT EXISTS sandbox_studio_idx ON TABLE sandbox FIELDS studioId",
  "DEFINE INDEX IF NOT EXISTS sandbox_workspace_idx ON TABLE sandbox FIELDS workspaceId",
  "DEFINE INDEX IF NOT EXISTS sandbox_sandbox_idx ON TABLE sandbox FIELDS sandboxId UNIQUE",
];

let ensured = false;
let ensurePromise: Promise<void> | null = null;

export async function ensureTables() {
  if (ensured) return;
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const db = await getSurreal();
    for (const ddl of TABLE_DEFINITIONS) {
      await db.query(ddl);
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
