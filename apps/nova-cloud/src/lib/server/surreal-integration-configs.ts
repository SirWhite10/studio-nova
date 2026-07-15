import { StringRecordId, Table } from "surrealdb";
import { getIntegrationCapability } from "$lib/integrations/catalog";
import { isSecretReference, type SecretReference } from "@studio-nova/data-contracts";
import { createStudioEvent } from "./surreal-studio-events";
import { decryptIntegrationValue, encryptIntegrationValue } from "./integration-secrets";
import { getSurreal } from "./surreal";
import {
  ensureRecordPrefix,
  normalizeRouteParam,
  normalizeSurrealRow,
  queryRows,
  recordIdToString,
} from "./surreal-records";
import { putIntegrationSecretMaterial } from "./surreal-secret-material";

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
  return getSurreal();
}

async function getIntegrationConfigRow(userId: string, studioId: string, integrationKey: string) {
  const db = await ensureIntegrationConfigTable();
  const fullStudioId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  const rows = await queryRows<IntegrationConfigRow>(
    db,
    "SELECT * FROM integration_config WHERE userId = $userId AND studioId = $studioId AND integrationKey = $integrationKey LIMIT 1",
    { userId, studioId: fullStudioId, integrationKey },
  );
  return rows[0] ? normalizeSurrealRow<IntegrationConfigRow>(rows[0]) : null;
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
        field.secret && decodedValues[field.key]
          ? isSecretReference(decodedValues[field.key])
            ? "Configured"
            : maskSecret(decodedValues[field.key])
          : null,
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

  const nextEncoded: Record<string, string> = {};
  for (const field of capability.configFields) {
    const raw = typeof values[field.key] === "string" ? values[field.key].trim() : "";
    if (field.secret) {
      const previous = existingDecoded[field.key];
      if (raw) {
        nextEncoded[field.key] = await putIntegrationSecretMaterial({
          userId,
          studioId,
          integrationKey,
          fieldKey: field.key,
          value: raw,
        });
      } else if (isSecretReference(previous)) {
        nextEncoded[field.key] = previous;
      } else if (previous) {
        nextEncoded[field.key] = await putIntegrationSecretMaterial({
          userId,
          studioId,
          integrationKey,
          fieldKey: field.key,
          value: previous,
        });
      }
      continue;
    }
    if (raw) nextEncoded[field.key] = encryptIntegrationValue(raw);
  }

  const now = Date.now();
  if (existing) {
    const updated = await db.update(new StringRecordId(recordIdToString(existing.id))).merge({
      values: nextEncoded,
      configuredAt: existing.configuredAt ?? now,
      updatedAt: now,
    });
    const row = normalizeSurrealRow<IntegrationConfigRow>(updated);
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

  const [created] = await db.create(new Table("integration_config")).content({
    userId,
    studioId: fullStudioId,
    integrationKey,
    values: nextEncoded,
    configuredAt: now,
    createdAt: now,
    updatedAt: now,
  });
  const row = normalizeSurrealRow<IntegrationConfigRow>(created);
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

export async function getIntegrationSecretReferences(
  userId: string,
  studioId: string,
  integrationKey: string,
): Promise<Record<string, SecretReference>> {
  const capability = getIntegrationCapability(integrationKey);
  if (!capability) throw new Error(`Unknown integration capability: ${integrationKey}`);
  const row = await getIntegrationConfigRow(userId, studioId, integrationKey);
  if (!row) return {};
  const decoded = decodeValues(row.values);
  const references: Record<string, SecretReference> = {};
  let migrated = false;
  for (const field of capability.configFields.filter((candidate) => candidate.secret)) {
    const value = decoded[field.key];
    if (!value) continue;
    if (isSecretReference(value)) {
      references[field.key] = value;
      continue;
    }
    references[field.key] = await putIntegrationSecretMaterial({
      userId,
      studioId,
      integrationKey,
      fieldKey: field.key,
      value,
    });
    row.values[field.key] = references[field.key];
    migrated = true;
  }
  if (migrated) {
    const db = await getSurreal();
    await db
      .update(new StringRecordId(recordIdToString(row.id)))
      .merge({ values: row.values, updatedAt: Date.now() });
  }
  return references;
}
