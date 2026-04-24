import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { attachRunListener, getRunSessionSnapshot } from "$lib/server/chat-run-registry";
import { getChatRunForUser } from "$lib/server/surreal-chat-runs";
import { requireUserId } from "$lib/server/surreal-query";

async function waitForSession(runId: string, streamKey: string, attempts = 10, delayMs = 150) {
  for (let index = 0; index < attempts; index += 1) {
    const snapshot = getRunSessionSnapshot(runId, streamKey);
    if (snapshot?.attachable) return snapshot;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return getRunSessionSnapshot(runId, streamKey);
}

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const runId = event.params.runId as string;
  const streamKey = event.url.searchParams.get("key");

  if (!streamKey) {
    return json({ error: "Missing stream key" }, { status: 400 });
  }

  const run = await getChatRunForUser(userId, runId);
  if (!run) {
    return json({ error: "Run not found" }, { status: 404 });
  }

  if (run.streamKey !== streamKey) {
    return json({ error: "Invalid stream key" }, { status: 403 });
  }

  const snapshot = await waitForSession(run._id, streamKey);
  if (!snapshot || !snapshot.attachable) {
    return json(
      {
        status: run.status,
        attachable: false,
        fallback: "status-only",
      },
      { status: 409 },
    );
  }

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const safeClose = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {}
      };

      const encoder = new TextEncoder();
      const send = (eventName: string, payload: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`),
        );
      };

      const unsubscribe = attachRunListener(run._id, streamKey, (chunk) => {
        switch (chunk.type) {
          case "start":
            send("start", chunk);
            break;
          case "thinking":
            send("thinking", chunk);
            break;
          case "text":
            send("text", chunk);
            break;
          case "tool":
            send("tool", chunk);
            break;
          case "runtime":
            send("runtime", chunk);
            break;
          case "tool-result":
            send("tool-result", chunk);
            break;
          case "done":
            send("done", chunk);
            safeClose();
            break;
          case "error":
            send("error", chunk);
            safeClose();
            break;
        }
      });

      if (!unsubscribe) {
        send("status", {
          status: run.status,
          attachable: false,
          fallback: "status-only",
        });
        safeClose();
        return;
      }

      event.request.signal.addEventListener("abort", () => {
        unsubscribe();
        safeClose();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
