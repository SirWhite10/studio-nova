import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getPrivateEnv } from "$lib/server/env";
import { runDueScheduledJobs } from "$lib/server/scheduled-job-runner";

function isAuthorized(event: Parameters<RequestHandler>[0]) {
  const secret =
    (event.platform?.env as Record<string, string | undefined> | undefined)?.NOVA_CRON_SECRET ??
    getPrivateEnv("NOVA_CRON_SECRET");
  if (!secret) {
    console.warn("[scheduled-jobs] NOVA_CRON_SECRET is not configured");
    return false;
  }
  const header = event.request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export const POST: RequestHandler = async (event) => {
  if (!isAuthorized(event)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const limit = Number(event.url.searchParams.get("limit") ?? "10");
  const summary = await runDueScheduledJobs(event, Number.isFinite(limit) ? limit : 10);
  return json({ ok: true, ...summary });
};
