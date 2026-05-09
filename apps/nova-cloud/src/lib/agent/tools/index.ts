import type { RequestEvent } from "@sveltejs/kit";
import { createConfiguredIntegrationTools, createStudioIntegrationsTool } from "./integrations";
import { createShellTool } from "./shell";
import { createFilesystemTool } from "./filesystem";
import { createMemoryTool } from "./memory";
import { createSkillsTool } from "./skills-tool";
import { createSearchSkillsTool } from "./search-skills-tool";
import { createUseSkillTool } from "./use-skill-tool";
import {
  createWorkspaceActionTool,
  createWorkspaceContractTool,
  createWorkspaceCreateTool,
  createWorkspaceListTool,
} from "./workspaces";
import {
  createRuntimeBrowserTool,
  createRuntimeContext7Tool,
  createRuntimeDevLogsTool,
  createRuntimeDevStartTool,
  createRuntimeDevStopTool,
  createRuntimeFirecrawlTool,
  createRuntimeFilesystemTool,
  createRuntimePreviewStatusTool,
  createRuntimeStartTool,
  createRuntimeStopTool,
  createRuntimeSvelteCreateTool,
  createRuntimeShellTool,
  createRuntimeStatusTool,
  createRuntimeViteCreateTool,
} from "./runtime";
import type { ToolSet } from "ai";
import { listResolvedStudioIntegrations } from "$lib/server/surreal-integrations";
import type { ensureK3sRuntime } from "$lib/server/k3s-runtime";

type RuntimeAdapter = Awaited<ReturnType<typeof ensureK3sRuntime>>;

// Legacy orchestrator compatibility. The current app path builds tools per request.
export const tools: ToolSet = {};

export function createCoreTools(token: string | null, userId: string) {
  return {
    memory: createMemoryTool(token, userId),
    skills: createSkillsTool(token, userId),
    search_skills: createSearchSkillsTool(token, userId),
    use_skill: createUseSkillTool(token, userId),
  };
}

export function createLazyRuntimeTools(
  event: RequestEvent,
  userId: string,
  studioId?: string,
  runId?: string,
) {
  const runtimeContext = { event, userId, studioId, runId };

  return {
    runtime_status: createRuntimeStatusTool(runtimeContext),
    runtime_start: createRuntimeStartTool(runtimeContext),
    runtime_stop: createRuntimeStopTool(runtimeContext),
    runtime_shell: createRuntimeShellTool(runtimeContext),
    runtime_filesystem: createRuntimeFilesystemTool(runtimeContext),
    runtime_browser: createRuntimeBrowserTool(runtimeContext),
    runtime_firecrawl: createRuntimeFirecrawlTool(runtimeContext),
    runtime_context7: createRuntimeContext7Tool(runtimeContext),
    runtime_vite_create: createRuntimeViteCreateTool(runtimeContext),
    runtime_svelte_create: createRuntimeSvelteCreateTool(runtimeContext),
    runtime_dev_start: createRuntimeDevStartTool(runtimeContext),
    runtime_dev_stop: createRuntimeDevStopTool(runtimeContext),
    runtime_dev_logs: createRuntimeDevLogsTool(runtimeContext),
    runtime_preview_status: createRuntimePreviewStatusTool(runtimeContext),
  };
}

export function createWorkspaceTools(event: RequestEvent, studioId?: string) {
  return {
    workspace_list: createWorkspaceListTool({ event, studioId }),
    workspace_contract: createWorkspaceContractTool({ event, studioId }),
    workspace_create: createWorkspaceCreateTool({ event, studioId }),
    workspace_action: createWorkspaceActionTool({ event, studioId }),
  };
}

export async function createAgentTools(
  event: RequestEvent,
  userId: string,
  studioId?: string,
  runId?: string,
) {
  const token = (event.locals as any)?.token ?? null;
  const resolvedIntegrations = studioId
    ? await listResolvedStudioIntegrations(userId, studioId).catch(() => [])
    : [];

  return {
    ...createCoreTools(token, userId),
    studio_integrations: createStudioIntegrationsTool(resolvedIntegrations),
    ...createConfiguredIntegrationTools(resolvedIntegrations),
    ...createWorkspaceTools(event, studioId),
    ...createLazyRuntimeTools(event, userId, studioId, runId),
  };
}

// New: Create tools with Sandbox instance and token for use in streaming endpoint
export function createToolsWithSandbox(sandbox: RuntimeAdapter, userId: string, token?: string) {
  return {
    shell: createShellTool(sandbox, userId),
    filesystem: createFilesystemTool(sandbox, userId),
    memory: createMemoryTool(token || null, userId),
    skills: createSkillsTool(token || null, userId),
    search_skills: createSearchSkillsTool(token || null, userId),
    use_skill: createUseSkillTool(token || null, userId),
  };
}

// Legacy function kept for backward compatibility
export function createTools(event: RequestEvent, userId: string) {
  return createAgentTools(event, userId);
}

export type ToolName = "shell" | "filesystem" | "memory" | "skills" | "search_skills" | "use_skill";

export interface ToolInvocation {
  name: ToolName;
  args: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  result?: unknown;
  error?: string;
}
