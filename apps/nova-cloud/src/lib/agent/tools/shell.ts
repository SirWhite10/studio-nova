import { type Tool } from "ai";
import { z } from "zod";
import { K3S_WORKSPACE_PATH } from "$lib/server/k3s-runtime";

type RuntimeShell = {
  commands: {
    run(
      command: string,
      options?: { cwd?: string; timeoutMs?: number },
    ): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  };
};

const ShellInputSchema = z.object({
  command: z.string(),
  cwd: z.string().optional(),
  timeout: z.number().default(60000),
});

export function createShellTool(sandbox: RuntimeShell | null, _userId?: string): Tool {
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
          cwd: cwd ? `${K3S_WORKSPACE_PATH}/${cwd}` : K3S_WORKSPACE_PATH,
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
