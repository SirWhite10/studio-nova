import type { RequestHandler } from "@sveltejs/kit";
import { getStudioForUser } from "$lib/server/surreal-studios";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { listStudioEventsSince } from "$lib/server/surreal-studio-events";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioParam = event.params.studioId;
  if (!studioParam) {
    return new Response(JSON.stringify({ error: "Missing studioId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const studioId = normalizeRouteParam(studioParam);
  const studio = await getStudioForUser(userId, studioId);

  if (!studio) {
    return new Response(JSON.stringify({ error: "Studio not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      let cursor = Date.now() - 10_000;
      const seenIds = new Set<string>();

      const safeEnqueue = (chunk: string) => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(chunk));
          return true;
        } catch {
          closed = true;
          return false;
        }
      };

      const send = (eventName: string, payload: unknown) => {
        return safeEnqueue(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
      };

      const safeClose = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {}
      };

      send("ready", { studioId, connectedAt: Date.now() });

      const pump = async () => {
        while (!closed) {
          try {
            const rows = await listStudioEventsSince(userId, studioId, cursor, 50);
            let emitted = false;

            for (const row of rows) {
              if (seenIds.has(row._id)) continue;
              send(row.kind, row);
              seenIds.add(row._id);
              cursor = Math.max(cursor, row.createdAt);
              emitted = true;

              if (seenIds.size > 200) {
                const oldest = seenIds.values().next().value;
                if (oldest) seenIds.delete(oldest);
              }
            }

            if (!emitted) {
              safeEnqueue(": keepalive\n\n");
            }

            await sleep(2000);
          } catch (error) {
            if (closed) {
              break;
            }
            send("error", {
              message: error instanceof Error ? error.message : "Studio event stream failed",
            });
            safeClose();
          }
        }
      };

      void pump();

      event.request.signal.addEventListener("abort", () => {
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
