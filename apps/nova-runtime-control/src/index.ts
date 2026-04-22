import { createServer } from "node:http";
import { loadConfig } from "./config.ts";
import { sendJson, sendText, requireBearerToken } from "./http.ts";
import { KubectlError } from "./kubectl.ts";
import { RuntimeControlService } from "./runtime/service.ts";

const config = loadConfig();
const service = new RuntimeControlService(config);

function routeStudioSmoke(pathname: string) {
  const match = pathname.match(/^\/runtimes\/([^/]+)\/smoke$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
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

    if (studioId && (request.method === "POST" || request.method === "DELETE")) {
      if (!requireBearerToken(request, config.token)) {
        sendJson(response, 401, { ok: false, error: "Unauthorized" });
        return;
      }

      const result =
        request.method === "POST"
          ? await service.startSmokeRuntime(studioId)
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
