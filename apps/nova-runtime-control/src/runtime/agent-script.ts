export const runtimeAgentScript = String.raw`
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

const workspace = process.env.NOVA_WORKSPACE || "/workspace";
const token = process.env.NOVA_RUNTIME_AGENT_TOKEN || "";
const port = Number.parseInt(process.env.NOVA_RUNTIME_AGENT_PORT || "8788", 10);

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2) + "\n");
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function isAuthorized(request) {
  if (!token) return false;
  return request.headers.authorization === "Bearer " + token;
}

function workspacePath(inputPath = ".") {
  const fullPath = resolve(workspace, inputPath || ".");
  if (fullPath !== workspace && !fullPath.startsWith(workspace + sep)) {
    throw new Error("Path escapes workspace");
  }
  return fullPath;
}

function runCommand(input) {
  return new Promise((resolveCommand) => {
    const command = String(input.command || "");
    if (!command.trim()) {
      resolveCommand({ success: false, error: "Missing command" });
      return;
    }

    const cwd = workspacePath(input.cwd || ".");
    const timeoutMs = Math.max(1000, Math.min(Number(input.timeoutMs || 60000), 60 * 60 * 1000));
    const child = spawn(command, {
      cwd,
      shell: "/bin/sh",
      env: {
        ...process.env,
        HOME: "/home/node",
      },
    });
    const stdout = [];
    const stderr = [];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2000).unref();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      resolveCommand({ success: false, error: error.message });
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolveCommand({
        success: !timedOut && exitCode === 0,
        result: {
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
          exitCode: exitCode ?? 1,
          timedOut,
        },
      });
    });
  });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://runtime-agent.local");

    if (url.pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        service: "nova-runtime-agent",
        workspace,
      });
      return;
    }

    if (!isAuthorized(request)) {
      sendJson(response, 401, { ok: false, error: "Unauthorized" });
      return;
    }

    const input = await readJson(request);

    if (request.method === "POST" && url.pathname === "/exec") {
      sendJson(response, 200, await runCommand(input));
      return;
    }

    if (request.method === "POST" && url.pathname === "/files/read") {
      const content = await readFile(workspacePath(input.path), "utf8");
      sendJson(response, 200, { success: true, result: { content } });
      return;
    }

    if (request.method === "POST" && url.pathname === "/files/write") {
      const targetPath = workspacePath(input.path);
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, String(input.content ?? ""), "utf8");
      sendJson(response, 200, { success: true, result: { path: input.path } });
      return;
    }

    if (request.method === "POST" && url.pathname === "/files/list") {
      const entries = await readdir(workspacePath(input.path || "."), { withFileTypes: true });
      sendJson(response, 200, {
        success: true,
        result: {
          entries: entries.map((entry) => ({
            name: entry.name,
            type: entry.isDirectory() ? "dir" : "file",
          })),
        },
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/files/delete") {
      await rm(workspacePath(input.path), { recursive: true, force: true });
      sendJson(response, 200, { success: true, result: { path: input.path } });
      return;
    }

    sendJson(response, 404, { ok: false, error: "Not found" });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("nova-runtime-agent listening on 127.0.0.1:" + port);
});
`;
