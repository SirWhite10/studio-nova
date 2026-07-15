export type RecordId<Table extends string = string> = `${Table}:${string}`;

const TABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function recordId<Table extends string>(table: Table, value: string): RecordId<Table> {
  if (!TABLE_NAME.test(table)) {
    throw new Error(`Invalid SurrealDB table name: ${table}`);
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(":")) {
    throw new Error("A record key must be non-empty and cannot contain a colon");
  }

  return `${table}:${trimmed}`;
}

export function parseRecordId(value: string): { table: string; key: string } {
  const separator = value.indexOf(":");
  const table = value.slice(0, separator);
  const key = value.slice(separator + 1);

  if (separator < 1 || !TABLE_NAME.test(table) || !key) {
    throw new Error(`Invalid SurrealDB record id: ${value}`);
  }

  return { table, key };
}

export function isRecordId<Table extends string>(
  value: unknown,
  table?: Table,
): value is RecordId<Table> {
  if (typeof value !== "string") return false;

  try {
    const parsed = parseRecordId(value);
    return table ? parsed.table === table : true;
  } catch {
    return false;
  }
}
