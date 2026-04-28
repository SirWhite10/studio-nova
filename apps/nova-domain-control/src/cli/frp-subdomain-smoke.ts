import { createServer, request as httpRequest, type Server } from "node:http";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { createConnection } from "node:net";
import type { AddressInfo } from "node:net";
import { createDomainControlServer } from "../server.ts";
import { MemoryDomainStore } from "../store.ts";
import type { DomainControlConfig } from "../config.ts";

const SUBDOMAIN_HOST = "workspaces.test";
const WORKSPACE_HOST = `ws-smoke.${SUBDOMAIN_HOST}`;
const PROXY_NAME = "studio-smoke-primary";
const FRP_AUTH_TOKEN = "frp-smoke-auth-token";
const FRP_PLUGIN_TOKEN = "frp-smoke-plugin-token";

function listen(server: Server, host = "127.0.0.1") {
  return new Promise<number>((resolve) => {
    server.listen(0, host, () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

function close(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function freePort() {
  const server = createServer();
  const port = await listen(server);
  await close(server);
  return port;
}

function spawnLogged(name: string, command: string, args: string[], cwd: string) {
  const child = spawn(command, args, {
    cwd,
    detached: true,
    env: { ...process.env, GOTOOLCHAIN: process.env.GOTOOLCHAIN || "auto" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr?.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  return child;
}

function stopProcess(child: ChildProcess | null) {
  if (!child || child.killed) return;
  if (child.pid) {
    try {
      process.kill(-child.pid, "SIGTERM");
      return;
    } catch {
      // Fall back to killing the direct child below.
    }
  }
  child.kill("SIGTERM");
}

async function waitForTCP(port: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = createConnection({ host: "127.0.0.1", port });
        socket.once("connect", () => {
          socket.end();
          resolve();
        });
        socket.once("error", reject);
      });
      return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function requestWorkspace(port: number) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const request = httpRequest(
      {
        host: "127.0.0.1",
        port,
        path: "/",
        method: "GET",
        headers: {
          Host: WORKSPACE_HOST,
        },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolve({ status: response.statusCode ?? 0, body }));
      },
    );
    request.on("error", reject);
    request.end();
  });
}

async function waitForWorkspace(port: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await requestWorkspace(port);
      if (response.status >= 200 && response.status < 300) return response;
      lastError = new Error(`HTTP ${response.status}: ${response.body}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main() {
  const repoRoot = new URL("../../../..", import.meta.url).pathname;
  const frpRoot = join(repoRoot, "apps/nova-frp");
  const workDir = await mkdir(join(tmpdir(), `nova-frp-smoke-${process.pid}`), {
    recursive: true,
  }).then(() => join(tmpdir(), `nova-frp-smoke-${process.pid}`));

  let frps: ChildProcess | null = null;
  let frpc: ChildProcess | null = null;

  const target = createServer((request, response) => {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end(`workspace ok host=${request.headers.host}\n`);
  });

  const domainStore = new MemoryDomainStore();
  const domainServer = createDomainControlServer(
    {
      host: "127.0.0.1",
      port: 0,
      token: null,
      frpToken: FRP_PLUGIN_TOKEN,
      subdomainHost: SUBDOMAIN_HOST,
      surreal: {
        url: "memory",
        namespace: "main",
        database: "main",
        username: "root",
        password: "root",
        connectTimeoutMs: 1000,
      },
    } satisfies DomainControlConfig,
    domainStore,
  );

  try {
    const targetPort = await listen(target);
    const domainPort = await listen(domainServer);
    const frpsPort = await freePort();
    const vhostPort = await freePort();

    await domainStore.upsertProxy(
      {
        userId: "smoke-user",
        studioId: "smoke-studio",
        proxyName: PROXY_NAME,
        localPort: targetPort,
        subdomain: "ws-smoke",
      },
      SUBDOMAIN_HOST,
    );

    const frpsConfig = join(workDir, "frps.toml");
    const frpcConfig = join(workDir, "frpc.toml");
    await writeFile(
      frpsConfig,
      [
        'bindAddr = "127.0.0.1"',
        `bindPort = ${frpsPort}`,
        `vhostHTTPPort = ${vhostPort}`,
        `subDomainHost = "${SUBDOMAIN_HOST}"`,
        'auth.method = "token"',
        `auth.token = "${FRP_AUTH_TOKEN}"`,
        'log.to = "console"',
        'log.level = "info"',
        "",
        "[[httpPlugins]]",
        'name = "nova-domain-control"',
        `addr = "127.0.0.1:${domainPort}"`,
        'path = "/frp/handler"',
        'ops = ["Login", "NewProxy", "CloseProxy", "Ping", "NewUserConn"]',
        "",
      ].join("\n"),
    );
    await writeFile(
      frpcConfig,
      [
        'serverAddr = "127.0.0.1"',
        `serverPort = ${frpsPort}`,
        'auth.method = "token"',
        `auth.token = "${FRP_AUTH_TOKEN}"`,
        `metadatas.token = "${FRP_PLUGIN_TOKEN}"`,
        "loginFailExit = true",
        "transport.tls.enable = false",
        'log.to = "console"',
        'log.level = "info"',
        "",
        "[[proxies]]",
        `name = "${PROXY_NAME}"`,
        'type = "http"',
        'localIP = "127.0.0.1"',
        `localPort = ${targetPort}`,
        'subdomain = "ws-smoke"',
        `metadatas.token = "${FRP_PLUGIN_TOKEN}"`,
        "",
      ].join("\n"),
    );

    frps = spawnLogged(
      "frps",
      "go",
      ["run", "-tags", "noweb", "./cmd/frps", "-c", frpsConfig],
      frpRoot,
    );
    await waitForTCP(frpsPort, 30_000);
    frpc = spawnLogged(
      "frpc",
      "go",
      ["run", "-tags", "noweb", "./cmd/frpc", "-c", frpcConfig],
      frpRoot,
    );

    const response = await waitForWorkspace(vhostPort, 30_000);
    const body = response.body;
    if (!body.includes("workspace ok")) {
      throw new Error(`Unexpected smoke response: ${body}`);
    }

    console.log(`Smoke passed: http://${WORKSPACE_HOST} -> ${body.trim()}`);
  } finally {
    stopProcess(frpc);
    stopProcess(frps);
    await close(target).catch(() => {});
    await close(domainServer).catch(() => {});
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

await main();
