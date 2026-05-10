import { describe, expect, it } from "vite-plus/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("studio shell layout invariants", () => {
  it("keeps the shell header sticky and guards page-level horizontal overflow", () => {
    const layoutSource = readSource("src/routes/(app)/app/+layout.svelte");

    expect(layoutSource).toContain("studio-shell-header sticky top-0");
    expect(layoutSource).toContain("overflow-x-hidden");
    expect(layoutSource).toContain("overflow-x-auto");
  });

  it("keeps content/file surfaces overflow-safe for long paths and large payloads", () => {
    const filesSource = readSource("src/routes/(app)/app/studios/[studioId]/files/+page.svelte");

    expect(filesSource).toContain("overflow-x-auto");
    expect(filesSource).toContain("min-w-0");
    expect(filesSource).toContain("truncate");
  });
});
