#!/usr/bin/env node

import { isAbsolute, join, resolve } from "node:path";

import { createBackup } from "./backup.ts";
import { runBackfill, verifyBackfill } from "./backfill.ts";
import { fetchLiveCatalog, parseSchemaDirectory } from "./catalog.ts";
import { checkCompatibility } from "./compatibility.ts";
import { compareCatalogs } from "./compare-live.ts";
import { findRepoRoot, loadDatabaseConfig, publicConnectionInfo } from "./config.ts";
import { runVerticalSliceSmoke } from "./smoke.ts";
import { validateRepositorySchema } from "./validate.ts";

interface ParsedArguments {
  command?: string;
  values: Map<string, string>;
  flags: Set<string>;
}

function parseArguments(argv: string[]): ParsedArguments {
  const command = argv[0];
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument?.startsWith("--")) throw new Error(`Unexpected argument: ${argument}`);
    const name = argument.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) flags.add(name);
    else {
      values.set(name, next);
      index += 1;
    }
  }

  return { command, values, flags };
}

function applyConnectionOverrides(args: ParsedArguments): void {
  const mappings = [
    ["host", "SURREALDB_HOST"],
    ["namespace", "SURREALDB_NAMESPACE"],
    ["database", "SURREALDB_NAME"],
    ["user", "SURREALDB_USER"],
    ["password", "SURREALDB_PASSWORD"],
    ["auth-level", "SURREALDB_AUTH_LEVEL"],
  ] as const;
  for (const [option, environment] of mappings) {
    const value = args.values.get(option);
    if (value) process.env[environment] = value;
  }
}

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function help(): void {
  process.stdout.write(`database-admin <command> [options]

Commands:
  catalog           Read and normalize the live catalog
  compare-live      Compare repository desired state with the live catalog
  backup            Export a checksummed logical backup
  validate          Validate repository schema files without a connection
  compatibility     Check the live schema release marker
  backfill          Backfill legacy records (requires --dry-run unless --apply)
  verify-backfill   Report new-model record counts
  smoke             Exercise the full graph on an explicitly disposable database

Connection options:
  --environment <name>  Select .env.<name> files (default: local)
  --host <url>          Override SURREALDB_HOST/SURREALDB_URL
  --namespace <name>    Override the namespace
  --database <name>     Override the database
  --user <name>         Override the database user
  --password <value>    Override the database password

Safety options:
  --strict              Treat missing additive definitions as comparison failure
  --dry-run             Plan a backfill without writes
  --apply               Explicitly permit idempotent backfill writes
  --output <directory>  Backup output directory
  --confirm-disposable  Required safety acknowledgement for vertical-slice smoke
`);
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  if (!args.command || args.flags.has("help") || args.command === "help") {
    help();
    return;
  }

  applyConnectionOverrides(args);
  const environment = args.values.get("environment") ?? "local";

  if (args.command === "validate") {
    const report = validateRepositorySchema(findRepoRoot(process.cwd()));
    print({
      valid: report.valid,
      tableCount: report.tableCount,
      definitionCount: report.definitionCount,
      errors: report.errors,
    });
    if (!report.valid) process.exitCode = 1;
    return;
  }

  const config = loadDatabaseConfig({ environment });

  switch (args.command) {
    case "catalog": {
      const catalog = await fetchLiveCatalog(config);
      print({ connection: publicConnectionInfo(config), ...catalog });
      return;
    }
    case "compare-live": {
      const validation = validateRepositorySchema(config.repoRoot);
      if (!validation.valid) throw new Error(validation.errors.join("; "));
      const desired = parseSchemaDirectory(
        join(config.repoRoot, "database/schema"),
        config.repoRoot,
      );
      const live = await fetchLiveCatalog(config);
      const comparison = compareCatalogs(desired, live);
      print({
        connection: publicConnectionInfo(config),
        compatible: comparison.compatible,
        summary: {
          desiredDefinitions: Object.keys(desired.definitions).length,
          liveDefinitions: Object.keys(live.definitions).length,
          additiveMissing: comparison.missing.length,
          unexpectedLive: comparison.extra.length,
          changed: comparison.changed.length,
        },
        missing: comparison.missing.map(({ key, source }) => ({ key, source })),
        extra: comparison.extra.map(({ key, statement }) => ({ key, statement })),
        changed: comparison.changed,
      });
      if (!comparison.compatible || (args.flags.has("strict") && comparison.missing.length)) {
        process.exitCode = 2;
      }
      return;
    }
    case "backup": {
      const configuredOutput = args.values.get("output");
      const outputDirectory = configuredOutput
        ? isAbsolute(configuredOutput)
          ? configuredOutput
          : resolve(config.repoRoot, configuredOutput)
        : undefined;
      const result = await createBackup(config, outputDirectory);
      print({ connection: publicConnectionInfo(config), ...result });
      return;
    }
    case "compatibility": {
      const requiredVersion = Number.parseInt(args.values.get("required-version") ?? "1", 10);
      const service = args.values.get("service") ?? "database-admin";
      const report = await checkCompatibility(config, { requiredVersion, service });
      print({ connection: publicConnectionInfo(config), ...report });
      if (!report.compatible) process.exitCode = 2;
      return;
    }
    case "backfill": {
      if (!args.flags.has("dry-run") && !args.flags.has("apply")) {
        throw new Error("Backfill requires --dry-run or the explicit --apply flag");
      }
      const result = await runBackfill(config, { dryRun: !args.flags.has("apply") });
      print({ connection: publicConnectionInfo(config), ...result });
      return;
    }
    case "verify-backfill": {
      const counts = await verifyBackfill(config);
      print({ connection: publicConnectionInfo(config), counts });
      return;
    }
    case "smoke": {
      const result = await runVerticalSliceSmoke(config, {
        confirmedDisposable: args.flags.has("confirm-disposable"),
      });
      print({ connection: publicConnectionInfo(config), ...result });
      return;
    }
    default:
      throw new Error(`Unknown command: ${args.command}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`database-admin: ${message}\n`);
  process.exitCode = 1;
});
