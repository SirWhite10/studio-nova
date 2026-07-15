import { createServer } from "node:http";
import { assertRuntimeSecretBoundary, loadConfig, RuntimeBoundaryError } from "./config.ts";
import { DeploymentControlService } from "./deployments/service.ts";
import {
  parseDeploymentRoute,
  parseWorkbenchRoute,
  readJson,
  requireBearerToken,
  sendJson,
  sendText,
} from "./http.ts";
import { KubectlError } from "./kubectl.ts";
import { RuntimeControlService } from "./runtime/service.ts";
import { WorkbenchControlService } from "./workbench/service.ts";

const config = loadConfig();
const service = new RuntimeControlService(config);
const workbenchService = new WorkbenchControlService(config);
const deploymentService = new DeploymentControlService(config);

function textInput(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

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
      const identity = {
        constellationKey: process.env.NOVA_CONSTELLATION_KEY || null,
        habitatNodeId: process.env.NOVA_HABITAT_NODE_ID || null,
      };
      try {
        await service.clusterSummary();
        sendJson(response, identity.habitatNodeId ? 200 : 503, {
          ok: Boolean(identity.habitatNodeId),
          service: "nova-runtime-control",
          provider: "k3s",
          checks: {
            identity: { ok: Boolean(identity.habitatNodeId), ...identity },
            runtime: { ok: true },
          },
        });
      } catch (error) {
        sendJson(response, 503, {
          ok: false,
          service: "nova-runtime-control",
          provider: "k3s",
          checks: {
            identity: { ok: Boolean(identity.habitatNodeId), ...identity },
            runtime: {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            },
          },
        });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/cluster/summary") {
      const summary = await service.clusterSummary();
      sendJson(response, 200, summary);
      return;
    }

    const deploymentRoute = parseDeploymentRoute(url.pathname);
    if (deploymentRoute && ["GET", "POST", "DELETE"].includes(request.method ?? "")) {
      if (!requireBearerToken(request, config.token)) {
        sendJson(response, 401, { ok: false, error: "Unauthorized" });
        return;
      }
      const body =
        request.method === "POST"
          ? ((await readJson(request)) as Record<string, unknown> | null)
          : null;
      assertRuntimeSecretBoundary(body);
      const studioId = textInput(body?.studioId ?? url.searchParams.get("studioId"));
      if (!studioId) {
        sendJson(response, 400, { ok: false, error: "studioId is required" });
        return;
      }
      const action = request.method === "DELETE" ? "stop" : deploymentRoute.action;
      const artifact = body?.artifact as
        | { kind: string; uri: string; sha256: string; sizeBytes: number }
        | undefined;
      const reconcileInput = {
        studioId,
        releaseId: textInput(body?.releaseId),
        artifact: artifact!,
        runtimeImage: textInput(body?.runtimeImage) || undefined,
        port: typeof body?.port === "number" ? body.port : undefined,
        healthPath: textInput(body?.healthPath) || undefined,
      };
      const result =
        action === "status"
          ? await deploymentService.status(deploymentRoute.deploymentId, { studioId })
          : action === "verify"
            ? await deploymentService.verify(deploymentRoute.deploymentId, reconcileInput)
            : action === "drain"
              ? await deploymentService.drain(deploymentRoute.deploymentId, { studioId })
              : action === "stop"
                ? await deploymentService.stop(deploymentRoute.deploymentId, { studioId })
                : action === "rollback"
                  ? await deploymentService.rollback(deploymentRoute.deploymentId, reconcileInput)
                  : await deploymentService.provision(deploymentRoute.deploymentId, reconcileInput);
      sendJson(response, 200, { ok: true, result });
      return;
    }

    const workbenchRoute = parseWorkbenchRoute(url.pathname);
    if (workbenchRoute && ["GET", "POST", "DELETE"].includes(request.method ?? "")) {
      if (request.method !== "GET" && !requireBearerToken(request, config.token)) {
        sendJson(response, 401, { ok: false, error: "Unauthorized" });
        return;
      }

      const body =
        request.method === "POST"
          ? ((await readJson(request)) as Record<string, unknown> | null)
          : null;
      assertRuntimeSecretBoundary(body);
      const studioId = textInput(body?.studioId ?? url.searchParams.get("studioId"));
      const sourceVolumeKey = textInput(
        body?.sourceVolumeKey ?? url.searchParams.get("sourceVolumeKey"),
      );
      const systemPackages = Array.isArray(body?.systemPackages)
        ? body.systemPackages.filter((value): value is string => typeof value === "string")
        : undefined;
      if (!studioId || !sourceVolumeKey) {
        sendJson(response, 400, {
          ok: false,
          error: "studioId and sourceVolumeKey are required",
        });
        return;
      }

      const reconcileInput = { studioId, sourceVolumeKey, systemPackages };
      const action =
        request.method === "DELETE"
          ? "stop"
          : request.method === "POST" && workbenchRoute.action === "status"
            ? "allocate"
            : workbenchRoute.action;
      const result =
        action === "status"
          ? await workbenchService.status(workbenchRoute.workbenchId, reconcileInput)
          : action === "stop"
            ? await workbenchService.stop(workbenchRoute.workbenchId, reconcileInput)
            : action === "resume"
              ? await workbenchService.resume(workbenchRoute.workbenchId, reconcileInput)
              : await workbenchService.allocate(workbenchRoute.workbenchId, reconcileInput);
      sendJson(response, 200, { ok: true, result });
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
      assertRuntimeSecretBoundary(input);
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
      assertRuntimeSecretBoundary(input);
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
      assertRuntimeSecretBoundary(input);
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
    if (error instanceof RuntimeBoundaryError) {
      sendJson(response, 400, { ok: false, error: error.message });
      return;
    }
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
