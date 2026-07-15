import { createHash } from "node:crypto";

import { assertSecretReference, type SecretReference } from "@studio-nova/data-contracts";
import { StringRecordId } from "surrealdb";

import {
  decryptIntegrationValue,
  encryptIntegrationValue,
  integrationSecretReference,
} from "./integration-secrets";
import { getSurreal } from "./surreal";
import { appendAuditEvent } from "./surreal-audit";
import {
  normalizeRouteParam,
  normalizeSurrealRow,
  queryRows,
  tableRecordId,
} from "./surreal-records";

type IntegrationSecretMaterialRow = {
  id: unknown;
  _id: string;
  userId: string;
  studioId: string;
  reference: SecretReference;
  integrationKey: string;
  fieldKey: string;
  provider: "local-encrypted";
  ciphertext: string;
  status: "active" | "revoked";
  createdAt: Date | string;
  updatedAt: Date | string;
};

function recordKey(reference: SecretReference) {
  return createHash("sha256").update(reference).digest("hex");
}

async function getSecretMaterial(reference: SecretReference) {
  const db = await getSurreal();
  const rows = await queryRows<IntegrationSecretMaterialRow>(
    db,
    "SELECT * FROM integration_secret_material WHERE reference = $reference LIMIT 1",
    { reference },
  );
  return rows[0] ? normalizeSurrealRow<IntegrationSecretMaterialRow>(rows[0]) : null;
}

export async function putIntegrationSecretMaterial(input: {
  userId: string;
  studioId: string;
  integrationKey: string;
  fieldKey: string;
  value: string;
}) {
  if (!input.value) throw new Error("Secret material cannot be empty");
  const reference = integrationSecretReference(input);
  const existing = await getSecretMaterial(reference);
  if (
    existing &&
    (existing.userId !== input.userId ||
      normalizeRouteParam(existing.studioId) !== normalizeRouteParam(input.studioId))
  ) {
    throw new Error("Secret reference belongs to a different tenant");
  }
  const db = await getSurreal();
  const now = new Date();
  const content = {
    userId: input.userId,
    studioId: tableRecordId("studio", normalizeRouteParam(input.studioId)),
    reference,
    integrationKey: input.integrationKey,
    fieldKey: input.fieldKey,
    provider: "local-encrypted" as const,
    ciphertext: encryptIntegrationValue(input.value),
    status: "active" as const,
    updatedAt: now,
  };
  const material = existing
    ? normalizeSurrealRow<IntegrationSecretMaterialRow>(
        await db.update(tableRecordId("integration_secret_material", existing._id)).merge(content),
      )
    : normalizeSurrealRow<IntegrationSecretMaterialRow>(
        (await db
          .create(new StringRecordId(`integration_secret_material:${recordKey(reference)}`))
          .content({ ...content, createdAt: now })) as unknown as IntegrationSecretMaterialRow,
      );
  await appendAuditEvent({
    actorType: "user",
    actorId: input.userId,
    action: existing ? "integration.secret.rotated" : "integration.secret.stored",
    targetType: "integration_secret_material",
    targetId: material._id,
    studioId: input.studioId,
    outcome: "succeeded",
    details: { reference, integrationKey: input.integrationKey, fieldKey: input.fieldKey },
  });
  return reference;
}

export async function resolveIntegrationSecretMaterial(input: {
  userId: string;
  studioId: string;
  reference: unknown;
}) {
  const reference = assertSecretReference(input.reference);
  const material = await getSecretMaterial(reference);
  if (
    !material ||
    material.status !== "active" ||
    material.userId !== input.userId ||
    normalizeRouteParam(material.studioId) !== normalizeRouteParam(input.studioId)
  ) {
    throw new Error("Secret reference is unavailable for this tenant");
  }
  return decryptIntegrationValue(material.ciphertext);
}
