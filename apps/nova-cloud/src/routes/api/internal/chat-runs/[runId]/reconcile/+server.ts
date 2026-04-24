import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  abortRunSession,
  failRunSession,
  getRunSessionSnapshot,
} from "$lib/server/chat-run-registry";
import {
  getChatRunForUser,
  type RunStatus,
  updateChatRunStatus,
} from "$lib/server/surreal-chat-runs";
import { requireUserId } from "$lib/server/surreal-query";
import { isSuperAdmin } from "$lib/server/super-admin";

type ReconcileAction = "reconcile" | "abort" | "mark_failed";

function terminalStatusFromSnapshot(snapshot: ReturnType<typeof getRunSessionSnapshot>) {
  if (!snapshot?.finalChunk) return null;
  if (snapshot.finalChunk.type === "done") {
    return snapshot.finalChunk.status as RunStatus;
  }
  if (snapshot.finalChunk.type === "error") {
    return "failed" as const;
  }
  return null;
}

export const POST: RequestHandler = async (event) => {
  if (!(await isSuperAdmin(event))) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = requireUserId(event.locals);
  const runId = event.params.runId as string;
  const body = (await event.request.json().catch(() => ({}))) as {
    action?: ReconcileAction;
    reason?: string;
  };
  const action = body.action ?? "reconcile";

  const run = await getChatRunForUser(userId, runId);
  if (!run) {
    return json({ error: "Run not found" }, { status: 404 });
  }

  const snapshotBefore = getRunSessionSnapshot(run._id, run.streamKey);
  let actionSummary = "No reconciliation needed";

  if (action === "abort") {
    abortRunSession(run._id, run.streamKey);
    await updateChatRunStatus(run._id, "aborted", {
      liveAttachable: false,
      endedAt: Date.now(),
      error: null,
    });
    actionSummary = "Force-aborted run";
  } else if (action === "mark_failed") {
    const reason = body.reason?.trim() || "Marked failed by super-admin reconciliation";
    failRunSession(run._id, run.streamKey, reason);
    await updateChatRunStatus(run._id, "failed", {
      liveAttachable: false,
      endedAt: Date.now(),
      error: reason,
    });
    actionSummary = "Marked run failed";
  } else {
    const terminalStatus = terminalStatusFromSnapshot(snapshotBefore);
    if (terminalStatus) {
      await updateChatRunStatus(run._id, terminalStatus, {
        liveAttachable: false,
        endedAt: Date.now(),
        error:
          terminalStatus === "failed" && snapshotBefore?.finalChunk?.type === "error"
            ? snapshotBefore.finalChunk.error
            : null,
      });
      actionSummary = `Synchronized persisted run to ${terminalStatus}`;
    } else if (
      (run.status === "queued" || run.status === "preparing" || run.status === "running") &&
      (!snapshotBefore || !snapshotBefore.attachable)
    ) {
      const reason = "Reconciled stale active run with no live in-memory session";
      await updateChatRunStatus(run._id, "failed", {
        liveAttachable: false,
        endedAt: Date.now(),
        error: reason,
      });
      actionSummary = "Marked stale active run failed";
    } else {
      actionSummary = "Run and live session were already consistent";
    }
  }

  const updatedRun = await getChatRunForUser(userId, run._id);
  const snapshotAfter = getRunSessionSnapshot(run._id, run.streamKey);

  return json({
    ok: true,
    action,
    summary: actionSummary,
    run: updatedRun
      ? {
          runId: updatedRun._id,
          status: updatedRun.status,
          streamKey: updatedRun.streamKey,
          liveAttachable: updatedRun.liveAttachable,
          error: updatedRun.error ?? null,
        }
      : null,
    snapshotBefore,
    snapshotAfter,
  });
};
