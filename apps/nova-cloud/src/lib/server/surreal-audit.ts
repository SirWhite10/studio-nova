import { randomUUID } from "node:crypto";

import { isSecretReference } from "@studio-nova/data-contracts";
import { StringRecordId } from "surrealdb";

import { getSurreal } from "./surreal";
import {
  normalizeRouteParam,
  normalizeSurrealRow,
  normalizeSurrealRows,
  queryRows,
  tableRecordId,
} from "./surreal-records";

export type AuditActorType = "user" | "service" | "node" | "system";
export type AuditOutcome = "started" | "succeeded" | "failed" | "denied";

export type AuditEventRow = {
  id: unknown;
  _id: string;
  actorType: AuditActorType;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  studioId?: string | null;
  outcome: AuditOutcome;
  requestId?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: Date | string;
};

const SENSITIVE_KEY =
  /(?:^|_)(?:api[-_]?key|authorization|cookie|credential|password|private[-_]?key|secret|signing[-_]?key|token)(?:$|_)/i;
const SENSITIVE_VALUE = /(?:\bBearer\s+[A-Za-z0-9._~+/=-]+|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

function redactValue(value: unknown, key = "", seen = new WeakSet<object>()): unknown {
  if (SENSITIVE_KEY.test(key) && !isSecretReference(value)) return "[REDACTED]";
  if (typeof value === "string") {
    if (isSecretReference(value)) return value;
    return SENSITIVE_VALUE.test(value) ? "[REDACTED]" : value;
  }
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[REDACTED:CIRCULAR]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, key, seen));
  return Object.fromEntries(
    Object.entries(value).map(([childKey, childValue]) => [
      childKey,
      redactValue(childValue, childKey, seen),
    ]),
  );
}

export function redactAuditDetails(details: Record<string, unknown> | undefined) {
  if (!details) return undefined;
  return redactValue(details) as Record<string, unknown>;
}

function requiredLabel(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

export async function appendAuditEvent(input: {
  actorType: AuditActorType;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  studioId?: string;
  outcome: AuditOutcome;
  requestId?: string;
  details?: Record<string, unknown>;
}) {
  const db = await getSurreal();
  const key = randomUUID().replaceAll("-", "");
  const created = (await db.create(new StringRecordId(`audit_event:${key}`)).content({
    actorType: input.actorType,
    actorId: requiredLabel(input.actorId, "actorId"),
    action: requiredLabel(input.action, "action"),
    targetType: requiredLabel(input.targetType, "targetType"),
    targetId: requiredLabel(input.targetId, "targetId"),
    ...(input.studioId
      ? { studioId: tableRecordId("studio", normalizeRouteParam(input.studioId)) }
      : {}),
    outcome: input.outcome,
    ...(input.requestId ? { requestId: input.requestId.trim() } : {}),
    ...(input.details ? { details: redactAuditDetails(input.details) } : {}),
    createdAt: new Date(),
  })) as unknown as AuditEventRow;
  return normalizeSurrealRow<AuditEventRow>(created);
}

export async function listAuditEventsForTarget(targetType: string, targetId: string, limit = 100) {
  const db = await getSurreal();
  const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  const rows = await queryRows<AuditEventRow>(
    db,
    `SELECT * FROM audit_event WHERE targetType = $targetType AND targetId = $targetId ORDER BY createdAt DESC LIMIT ${safeLimit}`,
    { targetType, targetId },
  );
  return normalizeSurrealRows<AuditEventRow>(rows);
}
