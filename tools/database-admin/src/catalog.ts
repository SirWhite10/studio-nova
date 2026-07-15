import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import type { DatabaseConfig } from "./config.ts";
import { queryResult, querySurreal } from "./surreal-http.ts";

export type DefinitionKind = "table" | "field" | "index" | "event";

export interface Definition {
  key: string;
  kind: DefinitionKind;
  table: string;
  name: string;
  statement: string;
  source?: string;
}

export interface Catalog {
  definitions: Record<string, Definition>;
  tables: string[];
}

interface InfoForDatabase {
  tables?: Record<string, string>;
}

interface InfoForTable {
  events?: Record<string, string>;
  fields?: Record<string, string>;
  indexes?: Record<string, string>;
}

const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const INTERNAL_TABLES = new Set(["__entity", "__rollout"]);

function definitionKey(kind: DefinitionKind, table: string, name: string): string {
  if (kind === "table") return `table:${table}`;
  return `${kind}:${table}:${name}`;
}

export function normalizeStatement(statement: string): string {
  return statement
    .replace(/\bIF\s+NOT\s+EXISTS\b/gi, "")
    .replace(/\bOVERWRITE\b/gi, "")
    .replace(/\bON\s+TABLE\b/gi, "ON")
    .replace(/\bIN\s+(?=\[)/gi, "INSIDE ")
    .replace(/\bNOT\s*INSIDE\b/gi, "NOT INSIDE")
    .replace(/;\s*}/g, " }")
    .replace(/\s+PERMISSIONS\s+FULL\s*$/i, "")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s*;\s*$/, "")
    .trim();
}

function addDefinition(catalog: Catalog, definition: Omit<Definition, "key">): void {
  const key = definitionKey(definition.kind, definition.table, definition.name);
  if (catalog.definitions[key]) {
    throw new Error(`Duplicate ${key} definition in ${definition.source ?? "catalog"}`);
  }
  catalog.definitions[key] = { ...definition, key };
  if (definition.kind === "table" && !catalog.tables.includes(definition.table)) {
    catalog.tables.push(definition.table);
    catalog.tables.sort();
  }
}

function allSurqlFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...allSurqlFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".surql")) files.push(path);
  }
  return files.sort();
}

export function splitSurqlStatements(content: string): string[] {
  const statements: string[] = [];
  let statement = "";
  let blockDepth = 0;
  let quote: "'" | '"' | "`" | null = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index] ?? "";
    const next = content[index + 1] ?? "";

    if (lineComment) {
      if (character === "\n") {
        lineComment = false;
        statement += character;
      }
      continue;
    }

    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
        statement += " ";
      }
      continue;
    }

    if (quote) {
      statement += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }

    if ((character === "-" && next === "-") || (character === "/" && next === "/")) {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      statement += character;
      continue;
    }
    if (character === "{") blockDepth += 1;
    else if (character === "}") blockDepth = Math.max(0, blockDepth - 1);

    if (character === ";" && blockDepth === 0) {
      const trimmed = statement.trim();
      if (trimmed) statements.push(trimmed);
      statement = "";
      continue;
    }

    statement += character;
  }

  const trailing = statement.trim();
  if (trailing) statements.push(trailing);
  return statements;
}

export function parseSchemaDirectory(schemaDirectory: string, repoRoot = schemaDirectory): Catalog {
  const catalog: Catalog = { definitions: {}, tables: [] };

  for (const path of allSurqlFiles(schemaDirectory)) {
    const source = relative(repoRoot, path);
    const content = readFileSync(path, "utf8");
    const statements = splitSurqlStatements(content);

    for (const rawStatement of statements) {
      const statement = normalizeStatement(rawStatement);
      const tableMatch = statement.match(
        /^DEFINE TABLE\s+(?:IF NOT EXISTS\s+|OVERWRITE\s+)?([A-Za-z_][A-Za-z0-9_]*)\b/i,
      );
      if (tableMatch?.[1]) {
        addDefinition(catalog, {
          kind: "table",
          table: tableMatch[1],
          name: tableMatch[1],
          statement,
          source,
        });
        continue;
      }

      const fieldMatch = statement.match(
        /^DEFINE FIELD\s+(?:IF NOT EXISTS\s+|OVERWRITE\s+)?([A-Za-z_][A-Za-z0-9_]*)\s+ON(?:\s+TABLE)?\s+([A-Za-z_][A-Za-z0-9_]*)\b/i,
      );
      if (fieldMatch?.[1] && fieldMatch[2]) {
        addDefinition(catalog, {
          kind: "field",
          table: fieldMatch[2],
          name: fieldMatch[1],
          statement,
          source,
        });
        continue;
      }

      const indexMatch = statement.match(
        /^DEFINE INDEX\s+(?:IF NOT EXISTS\s+|OVERWRITE\s+)?([A-Za-z_][A-Za-z0-9_]*)\s+ON(?:\s+TABLE)?\s+([A-Za-z_][A-Za-z0-9_]*)\b/i,
      );
      if (indexMatch?.[1] && indexMatch[2]) {
        addDefinition(catalog, {
          kind: "index",
          table: indexMatch[2],
          name: indexMatch[1],
          statement,
          source,
        });
        continue;
      }

      const eventMatch = statement.match(
        /^DEFINE EVENT\s+(?:IF NOT EXISTS\s+|OVERWRITE\s+)?([A-Za-z_][A-Za-z0-9_]*)\s+ON(?:\s+TABLE)?\s+([A-Za-z_][A-Za-z0-9_]*)\b/i,
      );
      if (eventMatch?.[1] && eventMatch[2]) {
        addDefinition(catalog, {
          kind: "event",
          table: eventMatch[2],
          name: eventMatch[1],
          statement,
          source,
        });
        continue;
      }

      throw new Error(`Unsupported schema statement in ${source}: ${statement.slice(0, 120)}`);
    }
  }

  return catalog;
}

export async function fetchLiveCatalog(config: DatabaseConfig): Promise<Catalog> {
  const databaseInfo = await queryResult<InfoForDatabase>(config, "INFO FOR DB;");
  const tableStatements = databaseInfo.tables ?? {};
  const tables = Object.keys(tableStatements)
    .filter((table) => !INTERNAL_TABLES.has(table))
    .sort();

  for (const table of tables) {
    if (!SAFE_IDENTIFIER.test(table)) throw new Error(`Unsafe live table identifier: ${table}`);
  }

  const tableInfoResults = tables.length
    ? await querySurreal(config, tables.map((table) => `INFO FOR TABLE ${table};`).join("\n"))
    : [];
  const catalog: Catalog = { definitions: {}, tables: [] };

  tables.forEach((table, index) => {
    addDefinition(catalog, {
      kind: "table",
      table,
      name: table,
      statement: normalizeStatement(tableStatements[table] ?? ""),
    });

    const info = tableInfoResults[index]?.result as InfoForTable | undefined;
    for (const [name, statement] of Object.entries(info?.fields ?? {}).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      // SurrealDB derives these entries from typed array fields. The parent
      // definition remains the source-controlled schema contract.
      if (name.endsWith(".*")) continue;
      addDefinition(catalog, {
        kind: "field",
        table,
        name,
        statement: normalizeStatement(statement),
      });
    }
    for (const [name, statement] of Object.entries(info?.indexes ?? {}).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      addDefinition(catalog, {
        kind: "index",
        table,
        name,
        statement: normalizeStatement(statement),
      });
    }
    for (const [name, statement] of Object.entries(info?.events ?? {}).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      addDefinition(catalog, {
        kind: "event",
        table,
        name,
        statement: normalizeStatement(statement),
      });
    }
  });

  return catalog;
}
