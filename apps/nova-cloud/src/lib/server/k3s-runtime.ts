import { assertRuntimeStartAllowed } from "./runtime-limits";
import {
  callRuntimeControl,
  deleteRuntimeControlFile,
  execRuntimeControl,
  getRuntimeControlStatus,
  listRuntimeControlFiles,
  readRuntimeControlFile,
  runtimeControlConfigured,
  runtimeControlStudioId,
  runtimePreviewServiceHost,
  writeRuntimeControlFile,
} from "./nova-runtime-control";

export const K3S_WORKSPACE_PATH = "/workspace";
const DEFAULT_START_PACKAGES = ["git"];

type RuntimeContext = {
  event: unknown;
  userId: string;
  studioId: string;
};

type RuntimeCommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut?: boolean;
};

function workspacePath(relativePath: string) {
  return `${K3S_WORKSPACE_PATH}/${relativePath}`.replace(/\/+/g, "/");
}

function unwrapRuntimeResult(response: {
  ok: true;
  result: { success: boolean; result?: RuntimeCommandResult; error?: string };
}) {
  if (!response.result.success) {
    throw new Error(response.result.error || "Runtime command failed");
  }
  return response.result.result as RuntimeCommandResult;
}

async function waitForRuntime(controlStudioId: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await execRuntimeControl(controlStudioId, {
        command: "echo runtime-ready",
        timeoutMs: 5_000,
      });
      const result = unwrapRuntimeResult(response);
      if (result.stdout.includes("runtime-ready")) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error("Timed out waiting for k3s runtime to become ready");
}

function runtimeIsReady(status: unknown) {
  if (!status || typeof status !== "object" || !("result" in status)) return false;
  const result = (status as { result?: { pods?: unknown } }).result;
  const pods = typeof result?.pods === "string" ? result.pods : "";
  return /Running/i.test(pods);
}

export async function ensureK3sRuntime(context: RuntimeContext) {
  if (!runtimeControlConfigured()) {
    throw new Error("NOVA runtime control is not configured");
  }

  const controlStudioId = runtimeControlStudioId(context.userId, context.studioId);
  await assertRuntimeStartAllowed(context.userId, context.studioId);
  const existingStatus = await getRuntimeControlStatus(controlStudioId).catch(() => null);
  if (!runtimeIsReady(existingStatus)) {
    await callRuntimeControl(controlStudioId, {
      action: "start",
      systemPackages: DEFAULT_START_PACKAGES,
    });
    await waitForRuntime(controlStudioId);
  }

  const files = {
    async read(path: string) {
      const response = await readRuntimeControlFile(controlStudioId, path);
      const content = response.result?.result?.content;
      if (typeof content !== "string") {
        throw new Error(`Runtime file read failed for ${path}`);
      }
      return content;
    },
    async write(path: string, content: string) {
      await writeRuntimeControlFile(controlStudioId, { path, content });
    },
    async makeDir(path: string) {
      const command = `mkdir -p ${JSON.stringify(path)}`;
      unwrapRuntimeResult(
        await execRuntimeControl(controlStudioId, {
          command,
          timeoutMs: 10_000,
        }),
      );
    },
    async list(path: string) {
      const response = await listRuntimeControlFiles(controlStudioId, path);
      return response.result?.result?.entries ?? [];
    },
    async remove(path: string) {
      await deleteRuntimeControlFile(controlStudioId, path);
    },
  };

  const commands = {
    async run(
      command: string,
      options: {
        cwd?: string;
        timeoutMs?: number;
        background?: boolean;
        envs?: Record<string, string>;
      } = {},
    ) {
      const envPrefix = Object.entries(options.envs ?? {})
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(" ");
      const shellCommand = options.background
        ? `${envPrefix ? `${envPrefix} ` : ""}sh -lc ${JSON.stringify(`mkdir -p /workspace/.tmp && cd ${options.cwd || "."} && ${command} >/workspace/.tmp/nova-preview.log 2>&1 & echo $!`)}`
        : `${envPrefix ? `${envPrefix} ` : ""}sh -lc ${JSON.stringify(`cd ${options.cwd || "."} && ${command}`)}`;
      const response = await execRuntimeControl(controlStudioId, {
        command: shellCommand,
        timeoutMs: options.timeoutMs,
      });
      const result = unwrapRuntimeResult(response);
      if (options.background) {
        const pid = Number.parseInt(result.stdout.trim().split(/\s+/).at(-1) ?? "", 10);
        return {
          pid: Number.isFinite(pid) ? pid : 0,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        };
      }
      return result;
    },
  };

  return {
    sandboxId: controlStudioId,
    controlStudioId,
    workspaceRoot: K3S_WORKSPACE_PATH,
    files,
    commands,
    getHost(port: number) {
      return runtimePreviewServiceHost(controlStudioId, port);
    },
    workspacePath,
  };
}
