import { afterAll, describe, expect, it } from "vite-plus/test";

import { closeSurreal, getSurreal } from "./surreal";
import { appendAuditEvent, listAuditEventsForTarget, redactAuditDetails } from "./surreal-audit";

describe("lifecycle audit redaction", () => {
  it("redacts credentials recursively while preserving opaque secret references", () => {
    expect(
      redactAuditDetails({
        password: "plain-text",
        nested: { apiKey: "key-value", reference: "secret://integrations/stripe" },
        authorization: "Bearer abc.def.ghi",
        safe: "visible",
      }),
    ).toEqual({
      password: "[REDACTED]",
      nested: { apiKey: "[REDACTED]", reference: "secret://integrations/stripe" },
      authorization: "[REDACTED]",
      safe: "visible",
    });
  });
});

const integration = process.env.INFRASTRUCTURE_INTEGRATION === "1" ? describe : describe.skip;

integration("append-only audit repository integration", () => {
  afterAll(async () => closeSurreal());

  it("persists redacted events and rejects update/delete mutations", async () => {
    const targetId = `audit-target-${Date.now()}`;
    const event = await appendAuditEvent({
      actorType: "service",
      actorId: "integration-test",
      action: "test.audit.append",
      targetType: "integration_fixture",
      targetId,
      outcome: "succeeded",
      details: { token: "must-not-persist", secretRef: "secret://test/value" },
    });
    expect(event.details).toEqual({
      token: "[REDACTED]",
      secretRef: "secret://test/value",
    });
    const rows = await listAuditEventsForTarget("integration_fixture", targetId);
    expect(rows[0]?._id).toBe(event._id);

    const db = await getSurreal();
    await expect(
      db.query("UPDATE type::record('audit_event', $eventId) SET outcome = 'failed'", {
        eventId: event._id,
      }),
    ).rejects.toThrow("append-only");
    await expect(
      db.query("DELETE type::record('audit_event', $eventId)", { eventId: event._id }),
    ).rejects.toThrow("append-only");
  });
});
