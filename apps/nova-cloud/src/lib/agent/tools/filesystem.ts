import { type Tool } from "ai";
import { z } from "zod";
import type { Sandbox } from "e2b";
import { WORKSPACE_PATH } from "$lib/server/sandbox";

const FilesystemInputSchema = z.object({
  operation: z.enum(["read", "write", "list", "mkdir", "delete"]),
  path: z.string(),
  content: z.string().optional(),
  encoding: z.enum(["utf-8", "base64"]).default("utf-8"),
});

export function createFilesystemTool(sandbox: Sandbox | null, _userId?: string): Tool {
  return {
    description:
      "Read, write, and manipulate files in the active Studio runtime workspace. Supports reading files, writing content, listing directories, creating directories, and deleting files.",
    inputSchema: FilesystemInputSchema,
    execute: async ({ operation, path, content }) => {
      if (!sandbox) {
        return { success: false, error: "Sandbox not available" };
      }

      try {
        const workspacePath = `${WORKSPACE_PATH}/${path.replace(/^\//, "")}`;

        switch (operation) {
          case "read": {
            const result = await sandbox.files.read(workspacePath);
            return { success: true, result };
          }
          case "write": {
            await sandbox.files.write(workspacePath, content ?? "");
            return { success: true, result: `Written to ${path}` };
          }
          case "list": {
            const entries = await sandbox.files.list(workspacePath);
            const formatted = entries
              .map((e) => `${e.type === "dir" ? "d" : "-"} ${e.name}`)
              .join("\n");
            return { success: true, result: formatted };
          }
          case "mkdir": {
            await sandbox.files.makeDir(workspacePath);
            return { success: true, result: `Created directory ${path}` };
          }
          case "delete": {
            await sandbox.files.remove(workspacePath);
            return { success: true, result: `Deleted ${path}` };
          }
          default:
            return { success: false, error: `Unknown operation: ${operation}` };
        }
      } catch (error: unknown) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
