import { type Tool } from "ai";
import { z } from "zod";
import type { Sandbox } from "e2b";
import { WORKSPACE_PATH } from "$lib/server/sandbox";

const ShellInputSchema = z.object({
  command: z.string(),
  cwd: z.string().optional(),
  timeout: z.number().default(60000),
});

export function createShellTool(sandbox: Sandbox | null, _userId?: string): Tool {
  return {
    description:
      "Execute shell commands in the active Studio runtime environment with user-specific file storage. Supports timeouts and working directory specification.",
    inputSchema: ShellInputSchema,
    execute: async ({ command, cwd, timeout }) => {
      if (!sandbox) {
        return { success: false, error: "Sandbox not available" };
      }

      try {
        const result = await sandbox.commands.run(command, {
          cwd: cwd ? `${WORKSPACE_PATH}/${cwd}` : WORKSPACE_PATH,
          timeoutMs: timeout,
        });

        return {
          success: true,
          result: {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
          },
        };
      } catch (error: unknown) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
