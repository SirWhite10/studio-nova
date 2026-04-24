-- Nova Cloud SurrealDB Schema
-- Reference only. Tables are auto-created on server start via ensureTables() in hooks.server.ts.
-- To apply manually: surreal import --conn <url> --ns main --db main schema.surql

-- ============================================================
-- Studios (workspaces)
-- ============================================================
DEFINE TABLE IF NOT EXISTS studio SCHEMALESS;
DEFINE FIELD userId      ON studio TYPE string;
DEFINE FIELD name        ON studio TYPE string;
DEFINE FIELD description ON studio TYPE option<string>;
DEFINE FIELD icon        ON studio TYPE option<string>;
DEFINE FIELD color       ON studio TYPE option<string>;
DEFINE FIELD purpose     ON studio TYPE option<string>;
DEFINE FIELD themeHue    ON studio TYPE option<int>;
DEFINE FIELD isDefault   ON studio TYPE bool DEFAULT false;
DEFINE FIELD prefix      ON studio TYPE option<string>;
DEFINE FIELD createdAt   ON studio TYPE number;
DEFINE FIELD updatedAt   ON studio TYPE number;
DEFINE FIELD lastOpenedAt ON studio TYPE option<number>;
DEFINE INDEX idx_studio_user ON studio FIELDS userId;

-- ============================================================
-- Chats
-- ============================================================
DEFINE TABLE IF NOT EXISTS chat SCHEMALESS;
DEFINE FIELD studioId  ON chat TYPE option<string>;
DEFINE FIELD userId    ON chat TYPE string;
DEFINE FIELD title     ON chat TYPE string;
DEFINE FIELD createdAt ON chat TYPE number;
DEFINE FIELD updatedAt ON chat TYPE number;
DEFINE FIELD metadata  ON chat TYPE option<object>;
DEFINE INDEX idx_chat_user ON chat FIELDS userId;

-- ============================================================
-- Messages (supports tool-call and tool-result parts)
-- ============================================================
DEFINE TABLE IF NOT EXISTS chat_message SCHEMALESS;
DEFINE FIELD chatId    ON chat_message TYPE string;
DEFINE FIELD userId    ON chat_message TYPE string;
DEFINE FIELD role      ON chat_message TYPE string;
DEFINE FIELD content   ON chat_message TYPE string;
DEFINE FIELD parts     ON chat_message TYPE option<array>;
DEFINE FIELD createdAt ON chat_message TYPE number;
DEFINE FIELD metadata  ON chat_message TYPE option<object>;
DEFINE INDEX idx_chat_message_chat ON chat_message FIELDS chatId;

-- ============================================================
-- Chat Runs (execution tracking for streamed responses)
-- ============================================================
DEFINE TABLE IF NOT EXISTS chat_run SCHEMALESS;
DEFINE FIELD chatId         ON chat_run TYPE string;
DEFINE FIELD studioId       ON chat_run TYPE option<string>;
DEFINE FIELD userId         ON chat_run TYPE string;
DEFINE FIELD status         ON chat_run TYPE string;
DEFINE FIELD streamKey      ON chat_run TYPE string;
DEFINE FIELD liveAttachable ON chat_run TYPE bool DEFAULT true;
DEFINE FIELD model          ON chat_run TYPE option<string>;
DEFINE FIELD error          ON chat_run TYPE option<string>;
DEFINE FIELD startedAt      ON chat_run TYPE number;
DEFINE FIELD endedAt        ON chat_run TYPE option<number>;
DEFINE FIELD createdAt      ON chat_run TYPE number;
DEFINE FIELD updatedAt      ON chat_run TYPE number;
DEFINE INDEX idx_chat_run_chat ON chat_run FIELDS chatId;
DEFINE INDEX idx_chat_run_user ON chat_run FIELDS userId;

-- ============================================================
-- Skills
-- ============================================================
DEFINE TABLE IF NOT EXISTS skills SCHEMALESS;
DEFINE FIELD userId        ON skills TYPE string;
DEFINE FIELD name          ON skills TYPE string;
DEFINE FIELD description   ON skills TYPE option<string>;
DEFINE FIELD content       ON skills TYPE string;
DEFINE FIELD enabled       ON skills TYPE bool DEFAULT true;
DEFINE FIELD source        ON skills TYPE string;
DEFINE FIELD readonly      ON skills TYPE bool DEFAULT false;
DEFINE FIELD embedding     ON skills TYPE option<array>;
DEFINE FIELD fileHash      ON skills TYPE option<string>;
DEFINE FIELD folderPath    ON skills TYPE option<string>;
DEFINE FIELD usageCount    ON skills TYPE option<number>;
DEFINE FIELD currentVersion ON skills TYPE option<number>;
DEFINE FIELD createdAt     ON skills TYPE number;
DEFINE FIELD updatedAt     ON skills TYPE number;
DEFINE INDEX idx_skills_user      ON skills FIELDS userId;
DEFINE INDEX idx_skills_name_user ON skills FIELDS name, userId;

-- ============================================================
-- Memory (agent long-term memory)
-- ============================================================
DEFINE TABLE IF NOT EXISTS memory SCHEMALESS;
DEFINE FIELD userId    ON memory TYPE string;
DEFINE FIELD content   ON memory TYPE string;
DEFINE FIELD embedding ON memory TYPE option<array>;
DEFINE FIELD metadata  ON memory TYPE option<object>;
DEFINE FIELD createdAt ON memory TYPE number;
DEFINE INDEX idx_memory_user ON memory FIELDS userId;

-- ============================================================
-- Sandboxes (E2B runtime sessions)
-- ============================================================
DEFINE TABLE IF NOT EXISTS sandbox SCHEMALESS;
DEFINE FIELD studioId   ON sandbox TYPE option<string>;
DEFINE FIELD userId     ON sandbox TYPE string;
DEFINE FIELD sandboxId  ON sandbox TYPE string;
DEFINE FIELD templateId ON sandbox TYPE option<string>;
DEFINE FIELD status     ON sandbox TYPE string;
DEFINE FIELD createdAt  ON sandbox TYPE number;
DEFINE FIELD lastUsedAt ON sandbox TYPE option<number>;
DEFINE FIELD expiresAt  ON sandbox TYPE option<number>;
DEFINE INDEX idx_sandbox_user   ON sandbox FIELDS userId;
DEFINE INDEX idx_sandbox_id    ON sandbox FIELDS sandboxId;
DEFINE INDEX idx_sandbox_studio ON sandbox FIELDS studioId;

-- ============================================================
-- Runtime Processes (dev server tracking)
-- ============================================================
DEFINE TABLE IF NOT EXISTS runtime_process SCHEMALESS;
DEFINE FIELD sandboxId  ON runtime_process TYPE string;
DEFINE FIELD userId     ON runtime_process TYPE string;
DEFINE FIELD studioId   ON runtime_process TYPE option<string>;
DEFINE FIELD command    ON runtime_process TYPE string;
DEFINE FIELD port       ON runtime_process TYPE option<number>;
DEFINE FIELD status     ON runtime_process TYPE string;
DEFINE FIELD pid        ON runtime_process TYPE option<string>;
DEFINE FIELD previewUrl ON runtime_process TYPE option<string>;
DEFINE FIELD createdAt  ON runtime_process TYPE number;
DEFINE FIELD updatedAt  ON runtime_process TYPE number;
DEFINE INDEX idx_runtime_process_sandbox ON runtime_process FIELDS sandboxId;

-- ============================================================
-- Integrations (studio-connected capabilities)
-- ============================================================
DEFINE TABLE IF NOT EXISTS integrations SCHEMALESS;
DEFINE FIELD studioId  ON integrations TYPE string;
DEFINE FIELD userId    ON integrations TYPE string;
DEFINE FIELD key       ON integrations TYPE string;
DEFINE FIELD title     ON integrations TYPE string;
DEFINE FIELD route     ON integrations TYPE option<string>;
DEFINE FIELD icon      ON integrations TYPE option<string>;
DEFINE FIELD enabled   ON integrations TYPE bool DEFAULT true;
DEFINE FIELD config    ON integrations TYPE option<object>;
DEFINE FIELD createdAt ON integrations TYPE number;
DEFINE FIELD updatedAt ON integrations TYPE number;
DEFINE INDEX idx_integrations_studio     ON integrations FIELDS studioId;
DEFINE INDEX idx_integrations_studio_key ON integrations FIELDS studioId, key;

-- ============================================================
-- User Plans (subscription tier)
-- ============================================================
DEFINE TABLE IF NOT EXISTS user_plan SCHEMALESS;
DEFINE FIELD userId    ON user_plan TYPE string;
DEFINE FIELD plan      ON user_plan TYPE string;
DEFINE FIELD updatedAt ON user_plan TYPE number;
DEFINE INDEX idx_user_plan_user ON user_plan FIELDS userId UNIQUE;
