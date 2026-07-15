import { assertOpaqueSecretReferences, isSecretReference } from "@studio-nova/data-contracts";
import { afterAll, describe, expect, it } from "vite-plus/test";

import {
  decryptIntegrationValue,
  encryptIntegrationValue,
  integrationSecretReference,
  redactBoundarySecrets,
  serializeRedactedBoundary,
} from "./integration-secrets";
import { closeSurreal, getSurreal } from "./surreal";
import {
  putIntegrationSecretMaterial,
  resolveIntegrationSecretMaterial,
} from "./surreal-secret-material";

describe("integration secret boundaries", () => {
  it("creates strict tenant-scoped opaque references", () => {
    const reference = integrationSecretReference({
      studioId: "studio:Studio One",
      integrationKey: "Stripe Connect",
      fieldKey: "API Key",
    });
    expect(reference).toBe("secret://integration/studio-one/stripe-connect/api-key");
    expect(isSecretReference(reference)).toBe(true);
    expect(isSecretReference("secret://" + "bad?token=value")).toBe(false);
  });

  it("round-trips material only through authenticated encryption", () => {
    const encrypted = encryptIntegrationValue("sk_live_do-not-log");
    expect(encrypted).toMatch(/^enc1:/);
    expect(encrypted).not.toContain("sk_live_do-not-log");
    expect(decryptIntegrationValue(encrypted)).toBe("sk_live_do-not-log");
  });

  it("rejects inline credentials while accepting references at a boundary", () => {
    const reference = "secret://integration/studio-one/stripe/api-key";
    expect(() =>
      assertOpaqueSecretReferences({ signingKey: reference, nested: { apiToken: reference } }),
    ).not.toThrow();
    expect(() => assertOpaqueSecretReferences({ signingKey: "inline-signing-key" })).toThrow(
      "inline secret material",
    );
  });

  it("redacts values recursively without hiding opaque references", () => {
    const reference = "secret://integration/studio-one/stripe/api-key";
    const payload = {
      artifact: { uri: "s3://release/object" },
      apiKey: "sk_live_do-not-log",
      nested: { authorization: "Bearer credential", reference },
      encrypted: encryptIntegrationValue("private"),
    };
    expect(redactBoundarySecrets(payload)).toEqual({
      artifact: { uri: "s3://release/object" },
      apiKey: "[REDACTED]",
      nested: { authorization: "[REDACTED]", reference },
      encrypted: "[REDACTED]",
    });
    const serialized = serializeRedactedBoundary(payload);
    expect(serialized).not.toContain("sk_live_do-not-log");
    expect(serialized).not.toContain("Bearer credential");
    expect(serialized).toContain(reference);
  });
});

const integration = process.env.SECRET_MATERIAL_INTEGRATION === "1" ? describe : describe.skip;

integration("integration secret material repository", () => {
  afterAll(async () => closeSurreal());

  it("stores only ciphertext and enforces tenant-scoped resolution", async () => {
    const value = `sk_integration_${Date.now()}`;
    const reference = await putIntegrationSecretMaterial({
      userId: "fixture-user",
      studioId: "studio_one",
      integrationKey: "stripe",
      fieldKey: "apiKey",
      value,
    });
    expect(
      await resolveIntegrationSecretMaterial({
        userId: "fixture-user",
        studioId: "studio_one",
        reference,
      }),
    ).toBe(value);
    await expect(
      resolveIntegrationSecretMaterial({
        userId: "other-user",
        studioId: "studio_one",
        reference,
      }),
    ).rejects.toThrow("unavailable for this tenant");

    const db = await getSurreal();
    const [rows] = await db.query<[{ ciphertext: string; reference: string }[]]>(
      "SELECT ciphertext, reference FROM integration_secret_material WHERE reference = $reference",
      { reference },
    );
    expect(rows[0]?.reference).toBe(reference);
    expect(rows[0]?.ciphertext).toMatch(/^enc1:/);
    expect(rows[0]?.ciphertext).not.toContain(value);
    expect(JSON.stringify(rows[0])).not.toContain(value);
  });
});
