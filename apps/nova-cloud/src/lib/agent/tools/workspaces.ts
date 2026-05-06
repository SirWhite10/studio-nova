import type { Tool } from "ai";
import { z } from "zod";
import type { RequestEvent } from "@sveltejs/kit";

const WorkspaceCreateSchema = z.object({
  name: z.string().min(1).default("Blog Workspace"),
  templateKind: z.literal("blog-react-vp").default("blog-react-vp"),
  framework: z.literal("react").default("react"),
});

const WorkspaceActionSchema = z.object({
  workspaceId: z.string().min(1),
  action: z.enum(["provision", "preview"]),
  port: z.number().int().positive().optional(),
});

const WorkspaceContractSchema = z.object({
  workspaceId: z.string().min(1),
});

function workspaceBaseUrl(event: RequestEvent, studioId: string) {
  return new URL(`/api/studios/${studioId}/workspaces`, event.url.origin);
}

function workspaceDetailUrl(event: RequestEvent, studioId: string, workspaceId: string) {
  return new URL(`/api/studios/${studioId}/workspaces/${workspaceId}`, event.url.origin);
}

function workspaceRuntimeUrl(event: RequestEvent, studioId: string, workspaceId: string) {
  return new URL(`/api/studios/${studioId}/workspaces/${workspaceId}/runtime`, event.url.origin);
}

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : `Workspace request failed with ${response.status}`,
    );
  }
  return payload;
}

export function createWorkspaceListTool(context: { event: RequestEvent; studioId?: string }): Tool {
  return {
    description: "List the Studio's workspaces and their current deployment state.",
    inputSchema: z.object({}),
    execute: async () => {
      if (!context.studioId) return { success: false, error: "Studio not available" };
      try {
        const response = await context.event.fetch(
          workspaceBaseUrl(context.event, context.studioId),
        );
        const payload = await parseResponse(response);
        return { success: true, result: payload };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

export function createWorkspaceContractTool(context: {
  event: RequestEvent;
  studioId?: string;
}): Tool {
  return {
    description:
      "Fetch a workspace runtime contract with commands, storage paths, hostnames, and runtime metadata.",
    inputSchema: WorkspaceContractSchema,
    execute: async ({ workspaceId }) => {
      if (!context.studioId) return { success: false, error: "Studio not available" };
      try {
        const response = await context.event.fetch(
          workspaceRuntimeUrl(context.event, context.studioId, workspaceId),
        );
        const payload = await parseResponse(response);
        return { success: true, result: payload };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

export function createWorkspaceCreateTool(context: {
  event: RequestEvent;
  studioId?: string;
}): Tool {
  return {
    description: "Create a new Studio workspace contract for the blog React template.",
    inputSchema: WorkspaceCreateSchema,
    execute: async ({ name, templateKind, framework }) => {
      if (!context.studioId) return { success: false, error: "Studio not available" };
      try {
        const response = await context.event.fetch(
          workspaceBaseUrl(context.event, context.studioId),
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name, templateKind, framework }),
          },
        );
        const payload = await parseResponse(response);
        return { success: true, result: payload };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

export function createWorkspaceActionTool(context: {
  event: RequestEvent;
  studioId?: string;
}): Tool {
  return {
    description:
      "Provision a workspace build or start a workspace preview using the active contract.",
    inputSchema: WorkspaceActionSchema,
    execute: async ({ workspaceId, action, port }) => {
      if (!context.studioId) return { success: false, error: "Studio not available" };
      try {
        const response = await context.event.fetch(
          workspaceDetailUrl(context.event, context.studioId, workspaceId),
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action,
              port: action === "preview" ? port : undefined,
            }),
          },
        );
        const payload = await parseResponse(response);
        return { success: true, result: payload };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}
