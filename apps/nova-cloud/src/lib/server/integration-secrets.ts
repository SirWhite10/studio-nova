import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getPrivateEnv } from "./env";

function getSecretKey() {
  const source =
    getPrivateEnv("INTEGRATION_CONFIG_SECRET") ??
    getPrivateEnv("BETTER_AUTH_SECRET") ??
    "dev-only-integration-secret-change-me";
  return createHash("sha256").update(source).digest();
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
