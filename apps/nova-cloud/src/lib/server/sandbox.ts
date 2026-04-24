import type { RequestEvent } from "@sveltejs/kit";
import { Sandbox } from "e2b";
import { E2B_API_KEY } from "$env/static/private";
import {
  getSandboxForStudio as surrealGetSandboxForStudio,
  getSandboxForUser as surrealGetSandboxForUser,
  upsertSandbox,
  markSandboxExpired as surrealMarkSandboxExpired,
  touchSandboxLastUsed,
} from "$lib/server/surreal-sandbox";
import { getStudioForUser } from "$lib/server/surreal-studios";
import { assertRuntimeStartAllowed } from "$lib/server/runtime-limits";
import { createStudioEvent } from "$lib/server/surreal-studio-events";

const E2B_TEMPLATE = "nova-bun-agent";
const WORKSPACE_PATH = "/home/user/workspace";
const E2B_MAX_SANDBOX_TIMEOUT_MS = 60 * 60 * 1000;
const sandboxCreationLocks = new Map<string, Promise<Sandbox>>();

export class SandboxExpiredError extends Error {
  constructor(message = "Sandbox session expired. Please refresh to start a new session.") {
    super(message);
    this.name = "SandboxExpiredError";
  }
}

export interface SandboxRuntimeContext {
  event: RequestEvent;
  userId: string;
  studioId?: string;
  runId?: string;
}

async function connectIfRunning(sandboxId: string) {
  const sandbox = await Sandbox.connect(sandboxId, {
    apiKey: E2B_API_KEY,
  });

  if (!(await sandbox.isRunning())) {
    throw new Error("Sandbox is not running");
  }

  return sandbox;
}

async function getExistingSandboxRecord(userId: string, studioId?: string) {
  if (studioId) {
    return surrealGetSandboxForStudio(userId, studioId);
  }
  return surrealGetSandboxForUser(userId);
}

async function markSandboxExpired(userId: string, studioId?: string) {
  await surrealMarkSandboxExpired(userId, studioId);
}

function getSandboxLockKey(userId: string, studioId?: string) {
  return `${userId}:${studioId ?? "__user__"}`;
}

export function getProviderSandboxTimeoutMs(policyTimeoutMs: number) {
  return Math.min(policyTimeoutMs, E2B_MAX_SANDBOX_TIMEOUT_MS);
}

async function terminateSandboxById(sandboxId?: string | null) {
  if (!sandboxId) return;
  try {
    await Sandbox.kill(sandboxId, { apiKey: E2B_API_KEY });
  } catch (error) {
    console.warn(`[SANDBOX] Failed to terminate sandbox ${sandboxId}:`, error);
  }
}

async function expireAndTerminateSandbox(userId: string, studioId?: string) {
  const existing = await getExistingSandboxRecord(userId, studioId).catch(() => null);
  await terminateSandboxById(existing?.sandboxId);
  await markSandboxExpired(userId, studioId);
  if (studioId) {
    await createStudioEvent({
      userId,
      studioId,
      kind: "runtime.status",
      entityType: "sandbox",
      state: "expired",
      summary: "Studio runtime disconnected",
      payload: {
        sandboxId: existing?.sandboxId ?? null,
      },
    });
  }
}

export async function getConnectedSandbox(context: SandboxRuntimeContext): Promise<Sandbox | null> {
  const { userId, studioId } = context;
  const existing = await getExistingSandboxRecord(userId, studioId);

  if (!existing?.sandboxId || existing.status !== "active") {
    return null;
  }

  if (existing.templateId && existing.templateId !== E2B_TEMPLATE) {
    console.log(
      `[SANDBOX] Template mismatch: stored=${existing.templateId}, expected=${E2B_TEMPLATE}. Expiring stale sandbox.`,
    );
    await markSandboxExpired(userId, studioId);
    return null;
  }

  if (Date.now() > existing.expiresAt) {
    await markSandboxExpired(userId, studioId);
    return null;
  }

  try {
    const sandbox = await connectIfRunning(existing.sandboxId);
    await touchSandboxLastUsed(userId, studioId);
    return sandbox;
  } catch {
    await markSandboxExpired(userId, studioId);
    if (studioId) {
      await createStudioEvent({
        userId,
        studioId,
        kind: "runtime.status",
        entityType: "sandbox",
        state: "expired",
        summary: "Studio runtime expired",
        payload: {
          sandboxId: existing.sandboxId,
        },
      });
    }
    return null;
  }
}

export async function ensureSandboxForRuntime(context: SandboxRuntimeContext): Promise<Sandbox> {
  const { userId, studioId } = context;
  const existing = await getConnectedSandbox(context);
  if (existing) return existing;

  const lockKey = getSandboxLockKey(userId, studioId);
  const inFlight = sandboxCreationLocks.get(lockKey);
  if (inFlight) {
    return inFlight;
  }

  const createPromise = (async () => {
    const rechecked = await getConnectedSandbox(context);
    if (rechecked) return rechecked;

    const staleRecord = await getExistingSandboxRecord(userId, studioId).catch(() => null);
    if (staleRecord?.sandboxId) {
      await terminateSandboxById(staleRecord.sandboxId);
      await markSandboxExpired(userId, studioId);
    }

    if (!E2B_API_KEY) {
      console.error("[SANDBOX] CRITICAL: E2B_API_KEY is missing from environment");
      throw new Error("E2B_API_KEY environment variable is not set. Check your .env.local file.");
    }

    const policy = await assertRuntimeStartAllowed(userId, studioId);
    const timeoutMs = getProviderSandboxTimeoutMs(policy.sandboxTimeoutMs);
    if (timeoutMs !== policy.sandboxTimeoutMs) {
      console.warn(
        `[SANDBOX] Capping requested sandbox timeout from ${policy.sandboxTimeoutMs}ms to ${timeoutMs}ms for provider limits.`,
      );
    }

    const sandbox = await Sandbox.create(E2B_TEMPLATE, {
      apiKey: E2B_API_KEY,
      timeoutMs,
      envs: {
        PATH: "/usr/local/go/bin:/home/user/.bun/bin:/home/user/.deno/bin:/home/user/.vite-plus/bin:/home/user/.npm-global/bin:/home/user/.cargo/bin:/home/user/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        GOPATH: "/home/user/go",
      },
    });

    await sandbox.files.makeDir(WORKSPACE_PATH);

    const platformEnv = (context.event.platform as any)?.env;
    if (platformEnv?.STORAGE && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
      let prefix: string | undefined;
      if (studioId) {
        const studio = await getStudioForUser(userId, studioId);
        prefix = studio?.prefix;
      }
      await mountR2Bucket(sandbox, userId, platformEnv, prefix);
    }

    await upsertSandbox({
      userId,
      studioId,
      sandboxId: sandbox.sandboxId,
      templateId: E2B_TEMPLATE,
      status: "active",
      expiresAt: Date.now() + timeoutMs,
    });

    if (studioId) {
      await createStudioEvent({
        userId,
        studioId,
        kind: "runtime.status",
        entityType: "sandbox",
        state: "active",
        summary: "Studio runtime is active",
        payload: {
          sandboxId: sandbox.sandboxId,
          expiresAt: Date.now() + timeoutMs,
        },
      });
    }

    return sandbox;
  })();

  sandboxCreationLocks.set(lockKey, createPromise);
  try {
    return await createPromise;
  } finally {
    if (sandboxCreationLocks.get(lockKey) === createPromise) {
      sandboxCreationLocks.delete(lockKey);
    }
  }
}

export async function getSandboxForUser(event: RequestEvent, userId: string): Promise<Sandbox> {
  return ensureSandboxForRuntime({ event, userId });
}

async function mountR2Bucket(
  sandbox: Sandbox,
  userId: string,
  env: any,
  prefix?: string,
): Promise<void> {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = "nova-cloud-storage";

  if (!accountId || !accessKey || !secretKey) {
    console.warn("R2 credentials not configured, skipping bucket mount");
    return;
  }

  await sandbox.files.write("/root/.passwd-s3fs", `${accessKey}:${secretKey}`);
  await sandbox.commands.run("chmod 600 /root/.passwd-s3fs");

  const prefixArg = prefix ? ` -o prefix=${prefix}` : "";
  const mountCmd = `s3fs -o url=https://${accountId}.r2.cloudflarestorage.com -o allow_other -o use_path_request_style${prefixArg} ${bucketName} ${WORKSPACE_PATH}`;

  try {
    await sandbox.commands.run(mountCmd);
  } catch (error) {
    console.error("Failed to mount R2 bucket:", error);
  }
}

export async function disconnectSandbox(
  userId: string,
  _token?: string,
  studioId?: string,
): Promise<void> {
  try {
    await expireAndTerminateSandbox(userId, studioId);
  } catch (e) {
    console.warn("Failed to mark sandbox as expired:", e);
  }
}

export { WORKSPACE_PATH };
