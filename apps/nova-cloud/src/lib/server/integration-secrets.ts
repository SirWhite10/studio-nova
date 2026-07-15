import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import {
  assertSecretReference,
  isSecretReference,
  type SecretReference,
} from "@studio-nova/data-contracts";

import { getPrivateEnv } from "./env";

function getSecretKey() {
  const source = getPrivateEnv("INTEGRATION_CONFIG_SECRET") ?? getPrivateEnv("BETTER_AUTH_SECRET");
  if (!source && process.env.NODE_ENV === "production") {
    throw new Error("INTEGRATION_CONFIG_SECRET is required in production");
  }
  const keySource = source ?? "dev-only-integration-secret-change-me";
  return createHash("sha256").update(keySource).digest();
}

const SENSITIVE_KEY =
  /(?:authorization|cookie|credential|password|privatekey|secret|signingkey|token|apikey)/;
const SENSITIVE_VALUE =
  /(?:^enc1:|\bBearer\s+[A-Za-z0-9._~+/=-]+|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;

function referenceSegment(value: string, label: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) throw new Error(`${label} is required for a secret reference`);
  return normalized.slice(0, 128);
}

export function integrationSecretReference(input: {
  studioId: string;
  integrationKey: string;
  fieldKey: string;
}): SecretReference {
  return assertSecretReference(
    `secret://integration/${referenceSegment(input.studioId.replace(/^studio:/, ""), "studioId")}/${referenceSegment(input.integrationKey, "integrationKey")}/${referenceSegment(input.fieldKey, "fieldKey")}`,
  );
}

function sensitiveKey(value: string) {
  return SENSITIVE_KEY.test(value.replace(/[^a-z0-9]/gi, "").toLowerCase());
}

export function redactBoundarySecrets(
  value: unknown,
  key = "",
  seen = new WeakSet<object>(),
): unknown {
  if (isSecretReference(value)) return value;
  if (sensitiveKey(key) && value !== null && value !== undefined) return "[REDACTED]";
  if (typeof value === "string") return SENSITIVE_VALUE.test(value) ? "[REDACTED]" : value;
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[REDACTED:CIRCULAR]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((entry) => redactBoundarySecrets(entry, key, seen));
  return Object.fromEntries(
    Object.entries(value).map(([childKey, entry]) => [
      childKey,
      redactBoundarySecrets(entry, childKey, seen),
    ]),
  );
}

export function serializeRedactedBoundary(value: unknown) {
  return JSON.stringify(redactBoundarySecrets(value));
}

export function encryptIntegrationValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getSecretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc1:${iv.toString("base64")}:${encrypted.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptIntegrationValue(payload: string) {
  if (!payload.startsWith("enc1:")) return payload;
  const [, ivBase64, dataBase64, tagBase64] = payload.split(":");
  if (!ivBase64 || !dataBase64 || !tagBase64) {
    throw new Error("Malformed encrypted integration config value");
  }

  const decipher = createDecipheriv("aes-256-gcm", getSecretKey(), Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataBase64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
