import { StringRecordId, Table } from "surrealdb";
import { getIntegrationCapability } from "$lib/integrations/catalog";
import { createStudioEvent } from "./surreal-studio-events";
import { decryptIntegrationValue, encryptIntegrationValue } from "./integration-secrets";
import { getSurreal } from "./surreal";
import {
  ensureRecordPrefix,
  normalizeRouteParam,
  queryRows,
  recordIdToString,
  withRecordIds,
} from "./surreal-records";

type IntegrationConfigRow = {
  id: unknown;
  userId: string;
  studioId: string;
  integrationKey: string;
  values: Record<string, string>;
  configuredAt?: number | null;
  createdAt: number;
  updatedAt: number;
};

async function ensureIntegrationConfigTable() {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS integration_config SCHEMALESS").collect();
  return db;
}

async function getIntegrationConfigRow(userId: string, studioId: string, integrationKey: string) {
  const db = await ensureIntegrationConfigTable();
  const fullStudioId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  const rows = await queryRows<IntegrationConfigRow>(
    db,
    "SELECT * FROM integration_config WHERE userId = $userId AND studioId = $studioId AND integrationKey = $integrationKey LIMIT 1",
    { userId, studioId: fullStudioId, integrationKey },
  );
  return rows[0] ? withRecordIds(rows[0]) : null;
}

function maskSecret(value: string) {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return `${"•".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

function decodeValues(values: Record<string, string> | undefined) {
  const decoded: Record<string, string> = {};
  for (const [key, value] of Object.entries(values ?? {})) {
    decoded[key] = decryptIntegrationValue(value);
  }
  return decoded;
}

function parseProviders(raw: string | undefined) {
  return (raw ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function getIntegrationConfigSummary(
  userId: string,
  studioId: string,
  integrationKey: string,
) {
  const capability = getIntegrationCapability(integrationKey);
  if (!capability) return null;

  const row = await getIntegrationConfigRow(userId, studioId, integrationKey);
  const decodedValues = decodeValues(row?.values);
  const enabledProviders = parseProviders(decodedValues.providers);

  const fields = capability.configFields.map((field) => {
    const required =
      field.required === true ||
      (field.requiredWhenProviders ?? []).some((provider) => enabledProviders.includes(provider));

    return {
      key: field.key,
      label: field.label,
      type: field.type,
      placeholder: field.placeholder,
      helpText: field.helpText,
      secret: field.secret ?? false,
      required,
      value: field.secret ? "" : (decodedValues[field.key] ?? ""),
      hasValue: !!decodedValues[field.key],
      maskedValue:
        field.secret && decodedValues[field.key] ? maskSecret(decodedValues[field.key]) : null,
    };
  });

  return {
    configured: fields
      .filter((field) => field.required)
      .every((field) => field.hasValue || (!!field.value && field.value.trim() !== "")),
    updatedAt: row?.updatedAt ?? null,
    configuredAt: row?.configuredAt ?? null,
    fields,
  };
}

export async function saveIntegrationConfig(
  userId: string,
  studioId: string,
  integrationKey: string,
  values: Record<string, string>,
) {
  const capability = getIntegrationCapability(integrationKey);
  if (!capability) throw new Error(`Unknown integration capability: ${integrationKey}`);

  const db = await ensureIntegrationConfigTable();
  const fullStudioId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  const existing = await getIntegrationConfigRow(userId, studioId, integrationKey);
  const existingDecoded = decodeValues(existing?.values);

  const nextDecoded: Record<string, string> = {};
  for (const field of capability.configFields) {
    const raw = typeof values[field.key] === "string" ? values[field.key].trim() : "";
    if (field.secret && raw === "" && existingDecoded[field.key]) {
      nextDecoded[field.key] = existingDecoded[field.key];
      continue;
    }
    nextDecoded[field.key] = raw;
  }

  const nextEncoded = Object.fromEntries(
    Object.entries(nextDecoded)
      .filter(([, value]) => value !== "")
      .map(([key, value]) => [key, encryptIntegrationValue(value)]),
  );

  const now = Date.now();
  if (existing) {
    const updated = await db
      .update<IntegrationConfigRow>(new StringRecordId(recordIdToString(existing.id)))
      .merge({
        values: nextEncoded,
        configuredAt: existing.configuredAt ?? now,
        updatedAt: now,
      });
    const row = withRecordIds(
      (Array.isArray(updated) ? updated[0] : updated) as IntegrationConfigRow,
    );
    await createStudioEvent({
      userId,
      studioId,
      kind: "integration.updated",
      entityType: "integration",
      entityId: integrationKey,
      state: "configured",
      summary: `${integrationKey} configuration saved`,
      payload: {
        key: integrationKey,
        configuredAt: row.configuredAt ?? now,
        updatedAt: row.updatedAt,
      },
    });
    return row;
  }

  const created = await db.create(new Table("integration_config")).content({
    userId,
    studioId: fullStudioId,
    integrationKey,
    values: nextEncoded,
    configuredAt: now,
    createdAt: now,
    updatedAt: now,
  });
  const row = withRecordIds(
    (Array.isArray(created) ? created[0] : created) as IntegrationConfigRow,
  );
  await createStudioEvent({
    userId,
    studioId,
    kind: "integration.updated",
    entityType: "integration",
    entityId: integrationKey,
    state: "configured",
    summary: `${integrationKey} configuration saved`,
    payload: {
      key: integrationKey,
      configuredAt: row.configuredAt ?? now,
      updatedAt: row.updatedAt,
    },
  });
  return row;
}
