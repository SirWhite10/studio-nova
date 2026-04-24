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
    if (typeof key === "string" && key.endsWith("Id") && key !== "userId") {
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

export function normalizeRouteParam(raw: string): string {
  return stripRecordPrefix(decodeURIComponent(stripWrappingQuotes(raw.trim())));
}

export async function queryRows<T>(
  db: {
    query: <R = unknown>(
      query: string,
      vars?: Record<string, unknown>,
    ) => { collect: () => Promise<R> };
  },
  query: string,
  vars?: Record<string, unknown>,
): Promise<T[]> {
  const result = await db.query<[T[]]>(query, vars).collect();
  return result[0] ?? [];
}
