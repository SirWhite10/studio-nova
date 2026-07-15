import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { DatabaseConfig } from "./config.ts";
import { publicConnectionInfo } from "./config.ts";
import { exportSurreal } from "./surreal-http.ts";

export interface BackupResult {
  backupPath: string;
  metadataPath: string;
  sha256: string;
  bytes: number;
  createdAt: string;
}

function safeTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export async function createBackup(
  config: DatabaseConfig,
  outputDirectory = join(config.repoRoot, "database/backups"),
): Promise<BackupResult> {
  const bytes = await exportSurreal(config);
  if (bytes.byteLength === 0) throw new Error("SurrealDB export was empty");

  const createdAt = new Date().toISOString();
  const baseName = `${config.environment}-${safeTimestamp(new Date(createdAt))}`;
  const backupPath = join(outputDirectory, `${baseName}.surql`);
  const metadataPath = join(outputDirectory, `${baseName}.json`);
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
  writeFileSync(backupPath, bytes, { mode: 0o600 });
  writeFileSync(
    metadataPath,
    `${JSON.stringify(
      {
        createdAt,
        sha256,
        bytes: bytes.byteLength,
        connection: publicConnectionInfo(config),
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );

  return { backupPath, metadataPath, sha256, bytes: bytes.byteLength, createdAt };
}
