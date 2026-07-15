import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseSchemaDirectory, type Catalog } from "./catalog.ts";

const REQUIRED_LEGACY_TABLES = [
  "account",
  "artifact",
  "chat",
  "chat_message",
  "chat_run",
  "frp_client",
  "integration_config",
  "integrations",
  "memory",
  "proxy_domain",
  "rateLimit",
  "runtime_process",
  "sandbox",
  "scheduled_job",
  "session",
  "skills",
  "studio",
  "studio_event",
  "user",
  "user_plan",
  "verification",
  "workspace",
  "workspace_deployment",
  "workspace_proxy",
] as const;

const REQUIRED_NEW_TABLES = [
  "schema_release",
  "constellation",
  "infrastructure_node",
  "workbench",
  "workbench_instance",
  "build_target_profile",
  "build_job",
  "release",
  "release_artifact",
  "deployment",
  "runtime_instance",
  "tunnel_connector",
  "domain_binding",
  "deployment_route",
  "audit_event",
] as const;

export interface ValidationReport {
  valid: boolean;
  tableCount: number;
  definitionCount: number;
  errors: string[];
  catalog: Catalog;
}

export function validateRepositorySchema(repoRoot: string): ValidationReport {
  const schemaDirectory = join(repoRoot, "database/schema");
  const catalog = parseSchemaDirectory(schemaDirectory, repoRoot);
  const errors: string[] = [];

  for (const table of [...REQUIRED_LEGACY_TABLES, ...REQUIRED_NEW_TABLES]) {
    if (!catalog.definitions[`table:${table}`]) errors.push(`Missing required table: ${table}`);
  }

  const referencedTables = new Set<string>();
  for (const definition of Object.values(catalog.definitions)) {
    for (const match of definition.statement.matchAll(/record<([A-Za-z_][A-Za-z0-9_]*)>/g)) {
      if (match[1]) referencedTables.add(match[1]);
    }
  }
  for (const table of [...referencedTables].sort()) {
    if (!catalog.definitions[`table:${table}`]) {
      errors.push(`Record field references undefined table: ${table}`);
    }
  }

  const schemaText = Object.values(catalog.definitions)
    .map((definition) => definition.statement)
    .join("\n");
  if (/\bREMOVE\s+(?:TABLE|FIELD|INDEX)\b/i.test(schemaText)) {
    errors.push("Desired-state schema contains a destructive REMOVE statement");
  }

  const rolloutPolicy = readFileSync(join(repoRoot, "database/rollouts/README.md"), "utf8");
  if (!rolloutPolicy.includes("must not remove or narrow")) {
    errors.push("Initial rollout policy does not explicitly forbid legacy removal/narrowing");
  }

  return {
    valid: errors.length === 0,
    tableCount: catalog.tables.length,
    definitionCount: Object.keys(catalog.definitions).length,
    errors,
    catalog,
  };
}
