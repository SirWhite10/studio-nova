import { describe, expect, it } from "vite-plus/test";

import { isRecordId, parseRecordId, recordId } from "../src/ids.js";

describe("record ids", () => {
  it("creates and parses stable table-qualified ids", () => {
    const id = recordId("workbench", "alpha-1");

    expect(id).toBe("workbench:alpha-1");
    expect(parseRecordId(id)).toEqual({ table: "workbench", key: "alpha-1" });
    expect(isRecordId(id, "workbench")).toBe(true);
    expect(isRecordId(id, "studio")).toBe(false);
  });

  it("rejects malformed table names and keys", () => {
    expect(() => recordId("not-valid!", "id")).toThrow("Invalid SurrealDB table name");
    expect(() => recordId("studio", "contains:colon")).toThrow("cannot contain a colon");
    expect(() => parseRecordId("missing-table-separator")).toThrow("Invalid SurrealDB record id");
  });
});
