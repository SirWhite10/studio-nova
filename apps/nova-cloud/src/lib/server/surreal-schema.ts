import { getSurreal } from "./surreal";

const REQUIRED_LEGACY_TABLES = [
  "account",
  "chat",
  "chat_message",
  "chat_run",
  "session",
  "studio",
  "user",
  "verification",
  "workspace",
  "workspace_deployment",
] as const;

export type SurrealSchemaMode = "legacy" | "versioned";

export interface SurrealSchemaReport {
  compatible: boolean;
  mode: SurrealSchemaMode;
  service: "nova-cloud";
  requiredVersion: number;
  version?: number;
  releaseKey?: string;
  phase?: string;
  missingTables: string[];
  reason?: string;
  checkedAt: string;
}

interface DatabaseInfo {
  tables?: Record<string, string>;
}

interface SchemaReleaseRow {
  key?: string;
  version?: number;
  phase?: string;
  compatibleServices?: string[];
}

const REQUIRED_VERSION = 1;
let schemaPromise: Promise<SurrealSchemaReport> | null = null;

function incompatible(
  mode: SurrealSchemaMode,
  reason: string,
  missingTables: string[] = [],
  release?: SchemaReleaseRow,
): SurrealSchemaReport {
  return {
    compatible: false,
    mode,
    service: "nova-cloud",
    requiredVersion: REQUIRED_VERSION,
    version: release?.version,
    releaseKey: release?.key,
    phase: release?.phase,
    missingTables,
    reason,
    checkedAt: new Date().toISOString(),
  };
}

async function inspectSurrealSchema(): Promise<SurrealSchemaReport> {
  const db = await getSurreal();
  const [databaseInfo] = await db.query<[DatabaseInfo]>("INFO FOR DB");
  const tables = databaseInfo?.tables ?? {};
  const missingTables = REQUIRED_LEGACY_TABLES.filter((table) => !tables[table]);

  if (missingTables.length) {
    return incompatible(
      "legacy",
      `Required SurrealDB tables are missing: ${missingTables.join(", ")}`,
      missingTables,
    );
  }

  if (!tables.schema_release) {
    return {
      compatible: true,
      mode: "legacy",
      service: "nova-cloud",
      requiredVersion: REQUIRED_VERSION,
      missingTables: [],
      reason: "Version marker not installed; running the additive legacy compatibility path",
      checkedAt: new Date().toISOString(),
    };
  }

  const [releases] = await db.query<[SchemaReleaseRow[]]>(
    "SELECT key, version, phase, compatibleServices FROM schema_release ORDER BY version DESC LIMIT 1",
  );
  const release = releases?.[0];
  if (!release || !Number.isSafeInteger(release.version) || release.version! < REQUIRED_VERSION) {
    return incompatible(
      "versioned",
      `SurrealDB schema version ${release?.version ?? "missing"} is below ${REQUIRED_VERSION}`,
      [],
      release,
    );
  }
  if (release.compatibleServices?.length && !release.compatibleServices.includes("nova-cloud")) {
    return incompatible(
      "versioned",
      `Schema release ${release.key ?? "unknown"} does not support nova-cloud`,
      [],
      release,
    );
  }

  return {
    compatible: true,
    mode: "versioned",
    service: "nova-cloud",
    requiredVersion: REQUIRED_VERSION,
    version: release.version,
    releaseKey: release.key,
    phase: release.phase,
    missingTables: [],
    checkedAt: new Date().toISOString(),
  };
}

export function getSurrealSchemaReport(options: { refresh?: boolean } = {}) {
  if (options.refresh) schemaPromise = null;
  schemaPromise ??= inspectSurrealSchema().catch((error: unknown) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

export async function assertSurrealSchemaCompatible(): Promise<SurrealSchemaReport> {
  const report = await getSurrealSchemaReport();
  if (!report.compatible) throw new Error(report.reason ?? "SurrealDB schema is incompatible");
  return report;
}
