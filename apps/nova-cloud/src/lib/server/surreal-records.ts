import { StringRecordId } from "surrealdb";
import type { Surreal } from "surrealdb";

export function recordIdToString(id: unknown): string {
  if (!id) return "";
  if (typeof id === "string") return id;
  if (typeof id === "number" || typeof id === "bigint") return `${id}`;
  if (typeof id === "object") {
    const record = id as { tb?: unknown; id?: unknown };
    if (typeof record.tb === "string" && record.id !== undefined) {
      if (
        typeof record.id === "string" ||
        typeof record.id === "number" ||
        typeof record.id === "bigint"
      ) {
        return `${record.tb}:${record.id}`;
      }
      return `${record.tb}:${JSON.stringify(record.id)}`;
    }
    return JSON.stringify(id);
  }
  return "";
}

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function stripRecordPrefix(id: string): string {
  const cleaned = stripWrappingQuotes(id);
  const colonIdx = cleaned.indexOf(":");
  if (colonIdx > 0) return cleaned.slice(colonIdx + 1);
  return cleaned;
}

export function ensureRecordPrefix(table: string, id: string): string {
  const cleaned = stripWrappingQuotes(id);
  const prefix = `${table}:`;
  if (cleaned.startsWith(prefix)) return cleaned;
  return `${prefix}${cleaned}`;
}

export function tableRecordId(table: string, id: unknown) {
  return new StringRecordId(ensureRecordPrefix(table, recordIdToString(id)));
}

function normalizeStringValue(value: unknown): unknown {
  if (typeof value === "string") {
    return stripRecordPrefix(stripWrappingQuotes(value));
  }
  if (value && typeof value === "object") {
    const record = value as { tb?: unknown; id?: unknown };
    if (typeof record.tb === "string" && record.id !== undefined) {
      return stripRecordPrefix(recordIdToString(value));
    }
  }
  return value;
}

export function withRecordIds<T extends { id?: unknown }>(row: T) {
  const id = stripRecordPrefix(stripWrappingQuotes(recordIdToString(row.id)));
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    if (key === "id") continue;
    if (typeof key === "string" && key.endsWith("Id") && key !== "userId" && key !== "sandboxId") {
      normalized[key] = normalizeStringValue(value);
    }
  }
  return {
    ...row,
    ...normalized,
    id,
    _id: id,
  };
}

export type SurrealNormalizedRow<T> = T & { id: string; _id: string };

export function normalizeSurrealRow<T extends { id?: unknown }>(
  row: unknown,
): SurrealNormalizedRow<T> {
  return withRecordIds(row as T) as SurrealNormalizedRow<T>;
}

export function normalizeSurrealRows<T extends { id?: unknown }>(
  rows: unknown[],
): Array<SurrealNormalizedRow<T>> {
  return rows.map((row) => normalizeSurrealRow<T>(row));
}

export function normalizeRouteParam(raw: string): string {
  return stripRecordPrefix(decodeURIComponent(stripWrappingQuotes(raw.trim())));
}

export async function queryRows<T>(
  db: Pick<Surreal, "query">,
  query: string,
  vars?: Record<string, unknown>,
): Promise<T[]> {
  const result = await db.query<[T[]]>(query, vars);
  return result[0] ?? [];
}
