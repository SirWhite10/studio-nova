import { spawn } from "node:child_process";

export type KubectlResult = {
  command: string[];
  stdout: string;
  stderr: string;
  exitCode: number;
};

export class KubectlError extends Error {
  result: KubectlResult;

  constructor(result: KubectlResult) {
    super(`kubectl failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`);
    this.name = "KubectlError";
    this.result = result;
  }
}

export class Kubectl {
  private readonly binary: string;

  constructor(binary = "kubectl") {
    this.binary = binary;
  }

  run(args: string[], input?: string): Promise<KubectlResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.binary, args, {
        stdio: ["pipe", "pipe", "pipe"],
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];

      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
      child.on("error", reject);
      child.on("close", (exitCode) => {
        const result: KubectlResult = {
          command: [this.binary, ...args],
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
          exitCode: exitCode ?? 1,
        };
        if (result.exitCode === 0) {
          resolve(result);
        } else {
          reject(new KubectlError(result));
        }
      });

      if (input) child.stdin.end(input);
      else child.stdin.end();
    });
  }

  async getText(resource: string, args: string[] = []) {
    return this.run(["get", resource, ...args]);
  }

  async applyManifest(manifest: string) {
    return this.run(["apply", "-f", "-"], manifest);
  }

  async deleteNamespace(namespace: string) {
    return this.run(["delete", "namespace", namespace, "--ignore-not-found=true"]);
  }
}
