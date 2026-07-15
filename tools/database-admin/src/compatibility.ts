import type { DatabaseConfig } from "./config.ts";
import { queryResult } from "./surreal-http.ts";

export interface SchemaReleaseRecord {
  key: string;
  version: number;
  phase: "baseline" | "expand" | "cutover" | "contract";
  compatibleServices?: string[];
  appliedAt?: string;
}

export interface CompatibilityReport {
  compatible: boolean;
  requiredVersion: number;
  service: string;
  release?: SchemaReleaseRecord;
  reason?: string;
}

export function evaluateCompatibility(
  release: SchemaReleaseRecord | undefined,
  requiredVersion: number,
  service: string,
): CompatibilityReport {
  if (!release) {
    return {
      compatible: false,
      requiredVersion,
      service,
      reason: "The schema_release marker is missing",
    };
  }
  if (!Number.isSafeInteger(release.version) || release.version < requiredVersion) {
    return {
      compatible: false,
      requiredVersion,
      service,
      release,
      reason: `Schema version ${release.version} is below required version ${requiredVersion}`,
    };
  }
  if (release.compatibleServices?.length && !release.compatibleServices.includes(service)) {
    return {
      compatible: false,
      requiredVersion,
      service,
      release,
      reason: `Schema release ${release.key} does not declare compatibility with ${service}`,
    };
  }
  return { compatible: true, requiredVersion, service, release };
}

export async function checkCompatibility(
  config: DatabaseConfig,
  options: { requiredVersion?: number; service?: string } = {},
): Promise<CompatibilityReport> {
  const requiredVersion = options.requiredVersion ?? 1;
  const service = options.service ?? "database-admin";

  try {
    const rows = await queryResult<SchemaReleaseRecord[]>(
      config,
      "SELECT key, version, phase, compatibleServices, appliedAt FROM schema_release ORDER BY version DESC LIMIT 1;",
    );
    return evaluateCompatibility(rows[0], requiredVersion, service);
  } catch (error) {
    return {
      compatible: false,
      requiredVersion,
      service,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
