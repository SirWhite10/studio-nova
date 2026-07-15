import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { normalizeStatement, parseSchemaDirectory, type Catalog } from "../src/catalog.ts";
import { compareCatalogs } from "../src/compare-live.ts";

describe("schema catalogs", () => {
  it("parses tables, fields, indexes, and block events into stable keys", () => {
    const root = mkdtempSync(join(tmpdir(), "database-admin-catalog-"));
    const schema = join(root, "schema");
    mkdirSync(schema);
    writeFileSync(
      join(schema, "widget.surql"),
      `DEFINE TABLE widget SCHEMAFULL;
DEFINE FIELD name ON widget TYPE string;
DEFINE INDEX widget_name ON widget FIELDS name UNIQUE;
DEFINE EVENT OVERWRITE widget_immutable ON TABLE widget
WHEN $event = 'DELETE'
THEN {
  THROW 'widgets are immutable; create another';
};
`,
    );

    const catalog = parseSchemaDirectory(schema, root);

    expect(catalog.tables).toEqual(["widget"]);
    expect(Object.keys(catalog.definitions)).toEqual([
      "table:widget",
      "field:widget:name",
      "index:widget:widget_name",
      "event:widget:widget_immutable",
    ]);
    expect(catalog.definitions["event:widget:widget_immutable"]?.statement).toContain(
      "THROW 'widgets are immutable; create another'",
    );
  });

  it("normalizes safe definition modifiers and whitespace", () => {
    expect(
      normalizeStatement(" DEFINE FIELD IF NOT EXISTS name ON TABLE widget TYPE string; "),
    ).toBe("DEFINE FIELD name ON widget TYPE string");
  });

  it("normalizes SurrealDB field defaults and assertion aliases", () => {
    const desired = normalizeStatement(
      "DEFINE FIELD status ON widget TYPE string ASSERT $value IN ['ready'];",
    );
    const live = normalizeStatement(
      "DEFINE FIELD status ON widget TYPE string ASSERT $value INSIDE ['ready'] PERMISSIONS FULL",
    );

    expect(desired).toBe(live);
  });

  it("normalizes SurrealDB event body and NOTINSIDE serialization", () => {
    const desired = normalizeStatement(
      "DEFINE EVENT immutable ON widget WHEN ( $after.status NOT IN ['ready'] ) THEN { THROW 'immutable'; };",
    );
    const live = normalizeStatement(
      "DEFINE EVENT immutable ON widget WHEN ($after.status NOTINSIDE ['ready']) THEN { THROW 'immutable' }",
    );

    expect(desired).toBe(live);
  });

  it("classifies additive missing definitions separately from live drift", () => {
    const definition = (key: string, statement: string) => ({
      key,
      kind: "table" as const,
      table: key.slice(6),
      name: key.slice(6),
      statement,
    });
    const expected: Catalog = {
      tables: ["existing", "new_table"],
      definitions: {
        "table:existing": definition("table:existing", "DEFINE TABLE existing SCHEMALESS"),
        "table:new_table": definition("table:new_table", "DEFINE TABLE new_table SCHEMAFULL"),
      },
    };
    const actual: Catalog = {
      tables: ["existing"],
      definitions: {
        "table:existing": definition("table:existing", "DEFINE TABLE existing SCHEMALESS"),
      },
    };

    const comparison = compareCatalogs(expected, actual);

    expect(comparison.compatible).toBe(true);
    expect(comparison.missing.map(({ key }) => key)).toEqual(["table:new_table"]);
    expect(comparison.extra).toEqual([]);
    expect(comparison.changed).toEqual([]);
  });
});
