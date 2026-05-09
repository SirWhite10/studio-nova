import { createServer } from "node:http";
import { loadConfig } from "./config.ts";
import { sendJson, sendText, requireBearerToken, readJson } from "./http.ts";
import { KubectlError } from "./kubectl.ts";
import { RuntimeControlService } from "./runtime/service.ts";

const config = loadConfig();
const service = new RuntimeControlService(config);

function routeStudioSmoke(pathname: string) {
  const match = pathname.match(/^\/runtimes\/([^/]+)\/smoke$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

function routeStudio(pathname: string) {
  const match = pathname.match(/^\/runtimes\/([^/]+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

function routeStudioAction(pathname: string) {
  const match = pathname.match(
    /^\/runtimes\/([^/]+)\/(exec|files\/read|files\/write|files\/list|files\/delete|preview\/start|preview\/stop)$/,
  );
  if (!match) return null;
  return {
    studioId: decodeURIComponent(match[1]),
    action: match[2],
  };
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        service: "nova-runtime-control",
        provider: "k3s",
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/cluster/summary") {
      const summary = await service.clusterSummary();
      sendJson(response, 200, summary);
      return;
    }

    const studioId = routeStudioSmoke(url.pathname);
    if (studioId && request.method === "GET") {
      sendText(response, 200, service.renderSmokeRuntime(studioId));
      return;
    }

    const runtimeStudioId = routeStudio(url.pathname);
    if (runtimeStudioId && ["GET", "POST", "DELETE"].includes(request.method ?? "")) {
      if (request.method !== "GET" && !requireBearerToken(request, config.token)) {
        sendJson(response, 401, { ok: false, error: "Unauthorized" });
        return;
      }

      const input = request.method === "POST" ? await readJson(request) : {};
      const result =
        request.method === "GET"
          ? await service.runtimeStatus(runtimeStudioId)
          : request.method === "POST"
            ? await service.startRuntime(runtimeStudioId, input as { systemPackages?: string[] })
            : await service.deleteRuntime(runtimeStudioId);
      sendJson(response, 200, {
        ok: true,
        result,
      });
      return;
    }

    const runtimeAction = routeStudioAction(url.pathname);
    if (runtimeAction && request.method === "POST") {
      if (!requireBearerToken(request, config.token)) {
        sendJson(response, 401, { ok: false, error: "Unauthorized" });
        return;
      }

      const input = await readJson(request);
      const result =
        runtimeAction.action === "exec"
          ? await service.execRuntime(runtimeAction.studioId, input)
          : runtimeAction.action === "files/read"
            ? await service.readRuntimeFile(runtimeAction.studioId, input)
            : runtimeAction.action === "files/write"
              ? await service.writeRuntimeFile(runtimeAction.studioId, input)
              : runtimeAction.action === "files/list"
                ? await service.listRuntimeFiles(runtimeAction.studioId, input)
                : runtimeAction.action === "preview/start"
                  ? await service.startRuntimePreview(runtimeAction.studioId, input)
                  : runtimeAction.action === "preview/stop"
                    ? await service.stopRuntimePreview(runtimeAction.studioId, input)
                    : await service.deleteRuntimeFile(runtimeAction.studioId, input);
      sendJson(response, 200, {
        ok: true,
        result,
      });
      return;
    }

    if (studioId && (request.method === "POST" || request.method === "DELETE")) {
      if (!requireBearerToken(request, config.token)) {
        sendJson(response, 401, { ok: false, error: "Unauthorized" });
        return;
      }

      const input = request.method === "POST" ? await readJson(request) : {};
      const result =
        request.method === "POST"
          ? await service.startSmokeRuntime(studioId, input as { systemPackages?: string[] })
          : await service.deleteSmokeRuntime(studioId);
      sendJson(response, 200, {
        ok: true,
        result,
      });
      return;
    }

    sendJson(response, 404, {
      ok: false,
      error: "Not found",
    });
  } catch (error) {
    if (error instanceof KubectlError) {
      sendJson(response, 502, {
        ok: false,
        error: error.message,
        command: error.result.command,
        stdout: error.result.stdout,
        stderr: error.result.stderr,
      });
      return;
    }

    sendJson(response, 500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(config.port, config.host, () => {
  console.log(`nova-runtime-control listening on http://${config.host}:${config.port}`);
});
