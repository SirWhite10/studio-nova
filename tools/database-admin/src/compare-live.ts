import type { Catalog, Definition } from "./catalog.ts";
import { normalizeStatement } from "./catalog.ts";

export interface ChangedDefinition {
  key: string;
  expected: string;
  actual: string;
  source?: string;
}

export interface CatalogComparison {
  missing: Definition[];
  extra: Definition[];
  changed: ChangedDefinition[];
  compatible: boolean;
}

export function compareCatalogs(expected: Catalog, actual: Catalog): CatalogComparison {
  const missing: Definition[] = [];
  const extra: Definition[] = [];
  const changed: ChangedDefinition[] = [];

  for (const [key, expectedDefinition] of Object.entries(expected.definitions)) {
    const actualDefinition = actual.definitions[key];
    if (!actualDefinition) {
      missing.push(expectedDefinition);
      continue;
    }

    if (
      normalizeStatement(expectedDefinition.statement).toLowerCase() !==
      normalizeStatement(actualDefinition.statement).toLowerCase()
    ) {
      changed.push({
        key,
        expected: expectedDefinition.statement,
        actual: actualDefinition.statement,
        source: expectedDefinition.source,
      });
    }
  }

  for (const [key, actualDefinition] of Object.entries(actual.definitions)) {
    if (!expected.definitions[key]) extra.push(actualDefinition);
  }

  missing.sort((a, b) => a.key.localeCompare(b.key));
  extra.sort((a, b) => a.key.localeCompare(b.key));
  changed.sort((a, b) => a.key.localeCompare(b.key));

  return {
    missing,
    extra,
    changed,
    // Missing desired definitions are the expected input to an additive rollout.
    compatible: extra.length === 0 && changed.length === 0,
  };
}
