import { resolveTxt } from "node:dns/promises";
import { randomBytes } from "node:crypto";
import type { DomainVerificationDetails } from "./types.ts";

export function generateVerificationToken() {
  return randomBytes(16).toString("hex");
}

export function buildVerificationRecordName(host: string, prefix: string) {
  return `${prefix}.${host}`;
}

export function buildVerificationRecordValue(token: string) {
  return `nova-domain=${token}`;
}

export async function resolveTxtValues(host: string) {
  try {
    const rows = await resolveTxt(host);
    return rows.map((parts) => parts.join("")).filter(Boolean);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ENOTIMP" || code === "SERVFAIL") {
      return [];
    }
    throw error;
  }
}

export async function verifyDomainToken(
  host: string,
  token: string,
  prefix: string,
): Promise<DomainVerificationDetails> {
  const recordName = buildVerificationRecordName(host, prefix);
  const expectedValue = buildVerificationRecordValue(token);
  const foundValues = await resolveTxtValues(recordName);
  return {
    host,
    recordName,
    expectedValue,
    foundValues,
    verified: foundValues.includes(expectedValue),
  };
}
