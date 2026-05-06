import type { Tool } from "ai";
import { z } from "zod";
import type { RequestEvent } from "@sveltejs/kit";
import {
  WORKSPACE_PATH,
  ensureSandboxForRuntime,
  getConnectedSandbox,
  type SandboxRuntimeContext,
  disconnectSandbox,
} from "$lib/server/sandbox";
import { updateChatRunStatus } from "$lib/server/surreal-chat-runs";
import {
  getPrimaryForStudio,
  upsertPrimaryForStudio,
  markPrimaryStopped,
} from "$lib/server/surreal-runtime-processes";
import { publishRunChunkByRunId } from "$lib/server/chat-run-registry";

type RuntimeContext = Omit<SandboxRuntimeContext, "event"> & { event: RequestEvent };

const MAX_RUNTIME_TOOL_TIMEOUT_MS = 60 * 60 * 1000;
const MIN_RUNTIME_TOOL_TIMEOUT_MS = 1000;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeRuntimeTimeoutMs(timeout: number | undefined, fallback: number) {
  if (typeof timeout !== "number" || !Number.isFinite(timeout)) return fallback;
  return Math.min(
    Math.max(Math.round(timeout), MIN_RUNTIME_TOOL_TIMEOUT_MS),
    MAX_RUNTIME_TOOL_TIMEOUT_MS,
  );
}

function normalizeCwd(cwd?: string): string {
  if (!cwd) return WORKSPACE_PATH;
  if (cwd.startsWith("/")) return cwd;
  return `${WORKSPACE_PATH}/${cwd}`.replace(/\/+/g, "/");
}

function normalizePath(path: string): string {
  if (path.startsWith("/")) return path;
  return `${WORKSPACE_PATH}/${path}`.replace(/\/+/g, "/");
}

async function recordRuntimeEvent(
  context: RuntimeContext,
  event: {
    runId?: string;
    action: "started" | "reused" | "stopped" | "tool" | "preview";
    sandboxId?: string;
    toolName?: string;
    previewUrl?: string;
    artifact?: Record<string, unknown>;
  },
) {
  if (!event.runId) return;
  publishRunChunkByRunId(event.runId, {
    type: "runtime",
    id: `runtime:${event.action}:${event.sandboxId ?? event.previewUrl ?? Date.now()}`,
    action:
      event.action === "started"
        ? "start"
        : event.action === "reused"
          ? "reuse"
          : event.action === "stopped"
            ? "stop"
            : event.action === "preview"
              ? "preview"
              : "status",
    sandboxId: event.sandboxId,
    previewUrl: event.previewUrl,
    detail:
      event.action === "preview"
        ? event.previewUrl
        : event.action === "stopped"
          ? "Studio runtime stopped"
          : event.sandboxId
            ? `Sandbox ${event.sandboxId}`
            : undefined,
    artifact: event.artifact,
  });
  const statusMap: Record<string, "running" | "completed" | "failed"> = {
    started: "running",
    reused: "running",
    stopped: "completed",
    tool: "running",
    preview: "running",
  };
  await updateChatRunStatus(event.runId, statusMap[event.action] ?? "running", {
    liveAttachable: event.action !== "stopped",
  }).catch(() => {});
}

async function doUpsertPrimaryProcess(
  context: RuntimeContext,
  process: {
    sandboxId: string;
    label: string;
    command: string;
    cwd: string;
    pid: number;
    port?: number;
    previewUrl?: string;
    status: "starting" | "running" | "stopped" | "failed";
    logSummary?: string;
  },
) {
  if (!context.studioId) return;
  await upsertPrimaryForStudio(context.userId, context.studioId, process);
  if (process.previewUrl) {
    await recordRuntimeEvent(context, {
      runId: context.runId,
      action: "preview",
      sandboxId: process.sandboxId,
      previewUrl: process.previewUrl,
      artifact: {
        kind: "preview",
        title: process.label || "Primary Preview",
        status: "ready",
        url: process.previewUrl,
        source: "runtime-process",
        updatedAt: Date.now(),
        metadata: {
          sandboxId: process.sandboxId,
          pid: process.pid,
          port: process.port ?? null,
        },
      },
    });
  }
}

async function doMarkPrimaryProcessStopped(context: RuntimeContext) {
  if (!context.studioId) return;
  await markPrimaryStopped(context.userId, context.studioId);
}

async function getRuntimeSandbox(context: RuntimeContext) {
  const existing = await getConnectedSandbox(context);
  if (existing) {
    await recordRuntimeEvent(context, {
      runId: context.runId,
      action: "reused",
      sandboxId: existing.sandboxId,
    });
    return existing;
  }

  const sandbox = await ensureSandboxForRuntime(context);
  await recordRuntimeEvent(context, {
    runId: context.runId,
    action: "started",
    sandboxId: sandbox.sandboxId,
  });
  return sandbox;
}

async function resolveSandbox(context: RuntimeContext, createIfMissing: boolean) {
  if (createIfMissing) {
    return getRuntimeSandbox(context);
  }

  return getConnectedSandbox(context);
}

const RuntimeStatusInputSchema = z.object({
  autoStart: z.boolean().default(false),
});

const RuntimeLifecycleInputSchema = z.object({
  returnStatus: z.boolean().default(true),
});

export function createRuntimeStatusTool(context: RuntimeContext): Tool {
  return {
    description:
      "Check whether the studio runtime sandbox is available. Optionally start it if needed.",
    inputSchema: RuntimeStatusInputSchema,
    execute: async ({ autoStart }) => {
      try {
        const sandbox = autoStart
          ? await getRuntimeSandbox(context)
          : await resolveSandbox(context, false);
        return {
          success: true,
          result: {
            available: !!sandbox,
            autoStarted: !!(autoStart && sandbox),
            sandboxId: sandbox?.sandboxId ?? null,
            workspacePath: WORKSPACE_PATH,
          },
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: errorMessage(error),
        };
      }
    },
  };
}

export function createRuntimeStartTool(context: RuntimeContext): Tool {
  return {
    description:
      "Start or attach to the Studio runtime workspace and return its availability details.",
    inputSchema: RuntimeLifecycleInputSchema,
    execute: async () => {
      try {
        const sandbox = await getRuntimeSandbox(context);
        return {
          success: true,
          result: {
            available: true,
            action: "started",
            sandboxId: sandbox.sandboxId,
            workspacePath: WORKSPACE_PATH,
          },
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: errorMessage(error),
        };
      }
    },
  };
}

export function createRuntimeStopTool(context: RuntimeContext): Tool {
  return {
    description:
      "Mark the Studio runtime workspace as expired so it can stop being reused until explicitly started again.",
    inputSchema: RuntimeLifecycleInputSchema,
    execute: async () => {
      try {
        await disconnectSandbox(context.userId, context.event.locals.token, context.studioId);
        await recordRuntimeEvent(context, {
          runId: context.runId,
          action: "stopped",
        });
        return {
          success: true,
          result: {
            available: false,
            action: "stopped",
            studioId: context.studioId ?? null,
          },
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: errorMessage(error),
        };
      }
    },
  };
}

const RuntimeShellInputSchema = z.object({
  command: z.string(),
  cwd: z.string().optional(),
  timeout: z.number().default(60000),
});

export function createRuntimeShellTool(context: RuntimeContext): Tool {
  return {
    description:
      "Execute shell commands in the on-demand Studio runtime. Starts the runtime if needed.",
    inputSchema: RuntimeShellInputSchema,
    execute: async ({ command, cwd, timeout }) => {
      try {
        const sandbox = await getRuntimeSandbox(context);
        const result = await sandbox.commands.run(command, {
          cwd: normalizeCwd(cwd),
          timeoutMs: normalizeRuntimeTimeoutMs(timeout, 60_000),
        });

        return {
          success: true,
          result: {
            sandboxId: sandbox.sandboxId,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
          },
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: errorMessage(error),
        };
      }
    },
  };
}

const RuntimeFilesystemInputSchema = z.object({
  operation: z.enum(["read", "write", "list", "mkdir", "delete"]),
  path: z.string(),
  content: z.string().optional(),
  encoding: z.enum(["utf-8", "base64"]).default("utf-8"),
});

export function createRuntimeFilesystemTool(context: RuntimeContext): Tool {
  return {
    description:
      "Read, write, and manage files in the on-demand Studio runtime workspace. Starts the runtime if needed.",
    inputSchema: RuntimeFilesystemInputSchema,
    execute: async ({ operation, path, content }) => {
      try {
        const sandbox = await getRuntimeSandbox(context);
        const workspacePath = normalizePath(path);

        switch (operation) {
          case "read": {
            const result = await sandbox.files.read(workspacePath);
            return { success: true, result: { sandboxId: sandbox.sandboxId, content: result } };
          }
          case "write": {
            await sandbox.files.write(workspacePath, content ?? "");
            return {
              success: true,
              result: { sandboxId: sandbox.sandboxId, message: `Written to ${path}` },
            };
          }
          case "list": {
            const entries = await sandbox.files.list(workspacePath);
            const formatted = entries
              .map((entry) => `${entry.type === "dir" ? "d" : "-"} ${entry.name}`)
              .join("\n");
            return { success: true, result: { sandboxId: sandbox.sandboxId, entries: formatted } };
          }
          case "mkdir": {
            await sandbox.files.makeDir(workspacePath);
            return {
              success: true,
              result: { sandboxId: sandbox.sandboxId, message: `Created directory ${path}` },
            };
          }
          case "delete": {
            await sandbox.files.remove(workspacePath);
            return {
              success: true,
              result: { sandboxId: sandbox.sandboxId, message: `Deleted ${path}` },
            };
          }
        }
      } catch (error: unknown) {
        return {
          success: false,
          error: errorMessage(error),
        };
      }

      return { success: false, error: `Unknown operation: ${operation}` };
    },
  };
}

const RuntimeCommandInputSchema = z.object({
  args: z.array(z.string()).default([]),
  cwd: z.string().optional(),
  timeout: z.number().default(60000),
});

function createCommandWrapperTool(
  context: RuntimeContext,
  config: { name: string; executable: string; description: string },
): Tool {
  const runtimeShell = createRuntimeShellTool(context);
  const executeRuntimeShell = runtimeShell.execute as
    | ((input: { command: string; cwd?: string; timeout: number }) => Promise<unknown>)
    | undefined;

  return {
    description: config.description,
    inputSchema: RuntimeCommandInputSchema,
    execute: async ({ args, cwd, timeout }) => {
      const escapedArgs = args.map((arg: string) => JSON.stringify(arg)).join(" ");
      const command = `${config.executable}${escapedArgs ? ` ${escapedArgs}` : ""}`;
      if (!executeRuntimeShell) {
        return { success: false, error: `${config.name} runtime tool is unavailable` };
      }
      return executeRuntimeShell({ command, cwd, timeout });
    },
  };
}

export function createRuntimeBrowserTool(context: RuntimeContext): Tool {
  return createCommandWrapperTool(context, {
    name: "runtime_browser",
    executable: "agent-browser",
    description:
      "Run the agent-browser CLI in the Studio runtime for browser automation tasks like opening pages, snapshots, clicks, fills, and screenshots.",
  });
}

export function createRuntimeFirecrawlTool(context: RuntimeContext): Tool {
  return createCommandWrapperTool(context, {
    name: "runtime_firecrawl",
    executable: "firecrawl",
    description:
      "Run the Firecrawl CLI in the Studio runtime for scraping, crawling, and web data extraction workflows.",
  });
}

export function createRuntimeContext7Tool(context: RuntimeContext): Tool {
  return createCommandWrapperTool(context, {
    name: "runtime_context7",
    executable: "ctx7",
    description:
      "Run the Context7 CLI in the Studio runtime to search for current library documentation and fetch docs by library id.",
  });
}

const RuntimeScaffoldInputSchema = z.object({
  projectName: z.string(),
  cwd: z.string().optional(),
  template: z.string().optional(),
  packageManager: z.string().optional(),
  install: z.boolean().default(true),
});

function sanitizeProjectName(name: string) {
  return name.trim().replace(/[^a-zA-Z0-9-_./]/g, "-");
}

export function createRuntimeViteCreateTool(context: RuntimeContext): Tool {
  return {
    description:
      "Create a new Vite or Vite+ app with structured arguments. Uses vp create inside the Studio runtime.",
    inputSchema: RuntimeScaffoldInputSchema,
    execute: async ({ projectName, cwd, template, packageManager, install }) => {
      try {
        const sandbox = await getRuntimeSandbox(context);
        await recordRuntimeEvent(context, {
          runId: context.runId,
          action: "tool",
          sandboxId: sandbox.sandboxId,
          toolName: "runtime_vite_create",
        });
        const args = ["create", sanitizeProjectName(projectName)];
        if (template) args.push("--template", template);
        if (packageManager) args.push("--package-manager", packageManager);
        if (!install) args.push("--no-install");
        const result = await sandbox.commands.run(
          `vp ${args.map((arg) => JSON.stringify(arg)).join(" ")}`,
          {
            cwd: normalizeCwd(cwd),
            timeoutMs: 120000,
          },
        );
        return {
          success: true,
          result: {
            sandboxId: sandbox.sandboxId,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
          },
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: errorMessage(error),
        };
      }
    },
  };
}

export function createRuntimeSvelteCreateTool(context: RuntimeContext): Tool {
  return {
    description:
      "Create a new SvelteKit app with structured arguments. Uses sv create inside the Studio runtime.",
    inputSchema: RuntimeScaffoldInputSchema,
    execute: async ({ projectName, cwd, template, packageManager, install }) => {
      try {
        const sandbox = await getRuntimeSandbox(context);
        await recordRuntimeEvent(context, {
          runId: context.runId,
          action: "tool",
          sandboxId: sandbox.sandboxId,
          toolName: "runtime_svelte_create",
        });
        const args = ["create", sanitizeProjectName(projectName)];
        if (template) args.push("--template", template);
        if (packageManager) args.push("--package-manager", packageManager);
        if (!install) args.push("--no-install");
        const result = await sandbox.commands.run(
          `sv ${args.map((arg) => JSON.stringify(arg)).join(" ")}`,
          {
            cwd: normalizeCwd(cwd),
            timeoutMs: 120000,
          },
        );
        return {
          success: true,
          result: {
            sandboxId: sandbox.sandboxId,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
          },
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: errorMessage(error),
        };
      }
    },
  };
}

const RuntimeDevStartInputSchema = z.object({
  command: z.string(),
  cwd: z.string(),
  port: z.number(),
  label: z.string().default("Primary Preview"),
});

export function createRuntimeDevStartTool(context: RuntimeContext): Tool {
  return {
    description:
      "Start one primary Studio dev server in the background, capture its process metadata, and expose a preview URL.",
    inputSchema: RuntimeDevStartInputSchema,
    execute: async ({ command, cwd, port, label }) => {
      try {
        const sandbox = await getRuntimeSandbox(context);
        await recordRuntimeEvent(context, {
          runId: context.runId,
          action: "tool",
          sandboxId: sandbox.sandboxId,
          toolName: "runtime_dev_start",
        });

        const handle = await sandbox.commands.run(command, {
          cwd: normalizeCwd(cwd),
          background: true,
          timeoutMs: 60_000,
        });

        const previewUrl = `https://${sandbox.getHost(port)}`;
        await doUpsertPrimaryProcess(context, {
          sandboxId: sandbox.sandboxId,
          label,
          command,
          cwd,
          pid: handle.pid,
          port,
          previewUrl,
          status: "running",
          logSummary: `Started ${label} on port ${port}`,
        });

        return {
          success: true,
          result: {
            sandboxId: sandbox.sandboxId,
            pid: handle.pid,
            port,
            previewUrl,
            label,
          },
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: errorMessage(error),
        };
      }
    },
  };
}

const RuntimeDevStopInputSchema = z.object({
  pid: z.number().optional(),
});

export function createRuntimeDevStopTool(context: RuntimeContext): Tool {
  return {
    description: "Stop the primary Studio dev server process and mark its preview as stopped.",
    inputSchema: RuntimeDevStopInputSchema,
    execute: async ({ pid }) => {
      try {
        const sandbox = await getRuntimeSandbox(context);
        const primary = context.studioId
          ? await getPrimaryForStudio(context.userId, context.studioId)
          : null;
        const processId = pid ?? primary?.pid;
        if (!processId) {
          return { success: false, error: "No primary dev server is registered for this Studio." };
        }
        await sandbox.commands.kill(processId);
        await doMarkPrimaryProcessStopped(context);
        return {
          success: true,
          result: {
            sandboxId: sandbox.sandboxId,
            pid: processId,
            stopped: true,
          },
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: errorMessage(error),
        };
      }
    },
  };
}

const RuntimeDevLogsInputSchema = z.object({
  pid: z.number().optional(),
  timeout: z.number().default(5000),
});

export function createRuntimeDevLogsTool(context: RuntimeContext): Tool {
  return {
    description:
      "Connect to the primary Studio dev server process and collect current logs/output.",
    inputSchema: RuntimeDevLogsInputSchema,
    execute: async ({ pid, timeout }) => {
      try {
        const sandbox = await getRuntimeSandbox(context);
        const primary = context.studioId
          ? await getPrimaryForStudio(context.userId, context.studioId)
          : null;
        const processId = pid ?? primary?.pid;
        if (!processId) {
          return { success: false, error: "No primary dev server is registered for this Studio." };
        }

        let stdout = "";
        let stderr = "";
        const timeoutMs = normalizeRuntimeTimeoutMs(timeout, 5000);
        const handle = await sandbox.commands.connect(processId, {
          timeoutMs,
          onStdout: (data) => {
            stdout += data;
          },
          onStderr: (data) => {
            stderr += data;
          },
        });

        await Promise.race([
          handle.wait(),
          new Promise((resolve) => setTimeout(resolve, timeoutMs)),
        ]);

        await doUpsertPrimaryProcess(context, {
          sandboxId: sandbox.sandboxId,
          label: primary?.label ?? "Primary Preview",
          command: primary?.command ?? "unknown",
          cwd: primary?.cwd ?? ".",
          pid: processId,
          port: primary?.port,
          previewUrl: primary?.previewUrl,
          status: primary?.status ?? "running",
          logSummary: (stdout || stderr).slice(-2000),
        });

        return {
          success: true,
          result: {
            pid: processId,
            stdout,
            stderr,
            previewUrl: primary?.previewUrl ?? null,
          },
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: errorMessage(error),
        };
      }
    },
  };
}

export function createRuntimePreviewStatusTool(context: RuntimeContext): Tool {
  return {
    description:
      "Return metadata for the single primary Studio preview/dev server if one is registered.",
    inputSchema: z.object({}),
    execute: async () => {
      if (!context.studioId) {
        return { success: false, error: "This runtime tool requires a Studio-scoped chat." };
      }
      const primary = await getPrimaryForStudio(context.userId, context.studioId);
      return {
        success: true,
        result: {
          primary,
        },
      };
    },
  };
}
