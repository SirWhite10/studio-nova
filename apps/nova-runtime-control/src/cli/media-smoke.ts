import { setTimeout as delay } from "node:timers/promises";
import { loadConfig } from "../config.ts";
import { Kubectl } from "../kubectl.ts";
import { runtimeNamespace } from "../runtime/names.ts";
import { RuntimeControlService } from "../runtime/service.ts";

type RuntimeExecResponse = {
  success?: boolean;
  error?: string;
  result?: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    timedOut?: boolean;
  };
};

function readOption(name: string) {
  const flagIndex = process.argv.indexOf(`--${name}`);
  if (flagIndex === -1) return null;
  return process.argv[flagIndex + 1] ?? null;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

const kubectlOverride = readOption("kubectl");
if (kubectlOverride) {
  process.env.NOVA_RUNTIME_KUBECTL = kubectlOverride;
}

const config = loadConfig();
const kubectl = new Kubectl(config.kubectl);
const service = new RuntimeControlService(config);
const studioId =
  readOption("studio-id") ??
  process.env.NOVA_RUNTIME_MEDIA_SMOKE_STUDIO_ID ??
  `studio-media-smoke-${Date.now()}`;
const namespace = runtimeNamespace(config.namespacePrefix, studioId);
const keepRuntime = hasFlag("keep") || process.env.NOVA_RUNTIME_MEDIA_SMOKE_KEEP === "1";
const mediaCommand = [
  "ffmpeg -version | head -1",
  "magick -version | head -1",
  "magick -size 32x32 xc:red red.png",
  "identify red.png",
  "ffmpeg -hide_banner -f lavfi -i testsrc=size=64x64:rate=1 -frames:v 1 -y frame.png",
  "identify frame.png",
  "ls -lh red.png frame.png",
].join(" && ");

function isExecResponse(value: unknown): value is RuntimeExecResponse {
  return typeof value === "object" && value !== null;
}

function assertExecSuccess(label: string, response: unknown) {
  if (!isExecResponse(response) || response.success !== true) {
    throw new Error(`${label} failed: ${JSON.stringify(response, null, 2)}`);
  }

  console.log(`\n${label}`);
  console.log(response.result?.stdout?.trim() || "(no stdout)");
  if (response.result?.stderr?.trim()) {
    console.log("\nstderr:");
    console.log(response.result.stderr.trim());
  }
}

async function waitForRuntime() {
  const deadline = Date.now() + 180_000;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const response = await service.execRuntime(studioId, {
        command: "true",
        timeoutMs: 5_000,
      });
      if (isExecResponse(response) && response.success === true) return;
      lastError = JSON.stringify(response);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(2_000);
  }

  throw new Error(`Runtime did not become ready in time: ${lastError}`);
}

async function startRuntime() {
  await service.startRuntime(studioId, {
    systemPackages: ["ffmpeg", "imagemagick"],
  });
  await waitForRuntime();
}

try {
  console.log(`Creating media smoke runtime: ${namespace}`);
  await startRuntime();

  const initial = await service.execRuntime(studioId, {
    command: mediaCommand,
    timeoutMs: 60_000,
  });
  assertExecSuccess("Initial media smoke passed", initial);

  console.log("\nDeleting runtime pod to verify PVC-backed package and file persistence");
  await kubectl.run(["delete", "pod", "runtime", "-n", namespace, "--ignore-not-found=true"]);
  await startRuntime();

  const persistence = await service.execRuntime(studioId, {
    command:
      "ffmpeg -version | head -1 && magick -version | head -1 && identify red.png frame.png && ls -lh red.png frame.png",
    timeoutMs: 30_000,
  });
  assertExecSuccess("Persistence media smoke passed", persistence);
} finally {
  if (keepRuntime) {
    console.log(`\nKeeping runtime namespace for inspection: ${namespace}`);
  } else {
    console.log(`\nCleaning up runtime namespace: ${namespace}`);
    await kubectl.run([
      "delete",
      "namespace",
      namespace,
      "--ignore-not-found=true",
      "--wait=false",
    ]);
  }
}
