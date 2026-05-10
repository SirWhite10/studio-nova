import { StringRecordId, Table } from "surrealdb";
import { INTEGRATION_CAPABILITIES, type IntegrationCapabilityKey } from "$lib/integrations/catalog";
import type { StudioIntegration } from "$lib/studios/types";
import { createStudioEvent } from "./surreal-studio-events";
import { getIntegrationConfigSummary } from "./surreal-integration-configs";
import { getSurreal } from "./surreal";
import {
  ensureRecordPrefix,
  normalizeRouteParam,
  normalizeSurrealRow,
  normalizeSurrealRows,
  queryRows,
  recordIdToString,
  stripRecordPrefix,
} from "./surreal-records";

type IntegrationRow = {
  id: unknown;
  userId: string;
  studioId: string;
  key: IntegrationCapabilityKey;
  title: string;
  route: string;
  icon: string;
  category: string;
  summary: string;
  docsUrl: string;
  statusLabel: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

type StoredIntegration = IntegrationRow & {
  id: string;
  _id: string;
  studioId: string;
};

const integrationSeedLocks = new Map<string, Promise<StoredIntegration[]>>();

async function ensureDefaultIntegrations(
  userId: string,
  studioId: string,
): Promise<StoredIntegration[]> {
  const lockKey = `${userId}:${normalizeRouteParam(studioId)}`;
  const existingLock = integrationSeedLocks.get(lockKey);
  if (existingLock) return existingLock;

  const run = (async () => {
    const db = await getSurreal();
    await db.query("DEFINE TABLE IF NOT EXISTS integrations SCHEMALESS");

    const fullStudioId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));

    const existing = await queryRows<IntegrationRow>(
      db,
      "SELECT * FROM integrations WHERE userId = $userId AND studioId = $studioId",
      { userId, studioId: fullStudioId },
    );

    const bareStudioId = stripRecordPrefix(fullStudioId);
    const now = Date.now();
    const canonicalByKey = new Map<IntegrationCapabilityKey, IntegrationRow>();
    const duplicateRows: IntegrationRow[] = [];
    for (const row of existing) {
      if (!canonicalByKey.has(row.key)) {
        canonicalByKey.set(row.key, row);
        continue;
      }
      duplicateRows.push(row);
    }

    for (const duplicate of duplicateRows) {
      await db.delete(new StringRecordId(recordIdToString(duplicate.id)));
    }

    for (const integration of INTEGRATION_CAPABILITIES) {
      if (canonicalByKey.has(integration.key)) continue;
      await db.create(new Table("integrations")).content({
        userId,
        studioId: fullStudioId,
        key: integration.key,
        title: integration.title,
        route: `/app/studios/${bareStudioId}/integrations/${integration.key}`,
        icon: integration.icon,
        category: integration.category,
        summary: integration.summary,
        docsUrl: integration.docsUrl,
        statusLabel: integration.statusLabel,
        enabled: integration.defaultEnabled,
        createdAt: now,
        updatedAt: now,
      });
    }

    const created = await queryRows<IntegrationRow>(
      db,
      "SELECT * FROM integrations WHERE userId = $userId AND studioId = $studioId ORDER BY createdAt ASC",
      { userId, studioId: fullStudioId },
    );
    const resolvedByKey = new Map<IntegrationCapabilityKey, IntegrationRow>();
    for (const row of created) {
      if (!resolvedByKey.has(row.key)) {
        resolvedByKey.set(row.key, row);
      }
    }
    return normalizeSurrealRows<IntegrationRow>(Array.from(resolvedByKey.values())).map(
      (row) => row as StoredIntegration,
    );
  })();

  integrationSeedLocks.set(lockKey, run);
  try {
    return await run;
  } finally {
    integrationSeedLocks.delete(lockKey);
  }
}

export async function listStudioIntegrations(userId: string, studioId: string) {
  return ensureDefaultIntegrations(userId, studioId);
}

export async function listResolvedStudioIntegrations(
  userId: string,
  studioId: string,
): Promise<StudioIntegration[]> {
  const integrations = await ensureDefaultIntegrations(userId, studioId);
  const configSummaries = await Promise.all(
    integrations.map((integration) =>
      getIntegrationConfigSummary(userId, studioId, integration.key).catch(() => null),
    ),
  );

  return integrations.map((integration, index) => {
    const summary = configSummaries[index];
    const missingFields = (summary?.fields ?? [])
      .filter((field) => field.required && !field.hasValue && !(field.value?.trim?.() ?? ""))
      .map((field) => field.label);

    return {
      ...integration,
      configured: summary?.configured ?? false,
      missingFields,
    };
  });
}

export async function enableStudioIntegration(userId: string, studioId: string, key: string) {
  const db = await getSurreal();
  const existingRows = await ensureDefaultIntegrations(userId, studioId);
  const target = existingRows.find((row) => row.key === key);
  if (!target) throw new Error(`Integration not found: ${key}`);

  const now = Date.now();
  const [row] = await queryRows<IntegrationRow>(
    db,
    `UPDATE ${ensureRecordPrefix("integrations", target.id)} SET enabled = true, updatedAt = $updatedAt RETURN AFTER`,
    { updatedAt: now },
  );
  if (!row) {
    throw new Error(`Failed to enable integration: ${key}`);
  }
  await createStudioEvent({
    userId,
    studioId,
    kind: "integration.updated",
    entityType: "integration",
    entityId: key,
    state: "enabled",
    summary: `${key} integration enabled`,
    payload: {
      key,
      enabled: true,
    },
  });
  return normalizeSurrealRow<IntegrationRow>(row) as StoredIntegration;
}
