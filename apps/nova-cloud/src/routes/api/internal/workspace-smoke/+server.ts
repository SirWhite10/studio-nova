import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { Table } from "surrealdb";
import { getPrivateEnv } from "$lib/server/env";
import { getSurreal } from "$lib/server/surreal";
import { createStudioForUser } from "$lib/server/surreal-studios";
import {
  buildWorkspaceRuntimeContract,
  createWorkspaceForStudio,
} from "$lib/server/surreal-workspaces";
import { provisionWorkspaceInSandbox, startWorkspacePreview } from "$lib/server/workspace-runner";

function isAuthorized(event: Parameters<RequestHandler>[0]) {
  const secret =
    (event.platform?.env as Record<string, string | undefined> | undefined)?.NOVA_CRON_SECRET ??
    getPrivateEnv("NOVA_CRON_SECRET");
  if (secret) {
    const header = event.request.headers.get("authorization") ?? "";
    return header === `Bearer ${secret}`;
  }

  return process.env.NODE_ENV !== "production";
}

async function ensureSyntheticUser(userId: string, email: string) {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS user SCHEMALESS");
  const [existing] = await db.query<[any[]]>("SELECT * FROM user WHERE id = $id LIMIT 1", {
    id: `user:${userId}`,
  });
  if ((existing ?? [])[0]) {
    return;
  }

  const now = new Date().toISOString();
  await db.create(new Table("user"), {
    id: `user:${userId}`,
    email,
    emailVerified: true,
    name: "Workspace Smoke User",
    image: null,
    createdAt: now,
    updatedAt: now,
  });
}

export const POST: RequestHandler = async (event) => {
  if (!isAuthorized(event)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await event.request.json().catch(() => ({}))) as {
    startPreview?: boolean;
    workspaceName?: string;
    studioName?: string;
  };

  const userId = `smoke-user-${Date.now()}`;
  const email = `${userId}@example.com`;
  await ensureSyntheticUser(userId, email);

  const studio = await createStudioForUser({
    userId,
    name: body.studioName?.trim() || "Workspace Smoke Studio",
    purpose: "coding",
    description: "Synthetic Studio created by the internal workspace smoke route.",
  });

  const created = await createWorkspaceForStudio({
    userId,
    studioId: studio._id,
    name: body.workspaceName?.trim() || "Workspace Smoke Blog",
    templateKind: "blog-react-vp",
    framework: "react",
  });

  const provisioned = await provisionWorkspaceInSandbox({
    event,
    userId,
    studioId: studio._id,
    workspaceId: created.workspace._id,
  });

  const createdRuntimeContract =
    created.runtimeContract ?? buildWorkspaceRuntimeContract(created.workspace, created.deployment);
  const provisionedRuntimeContract =
    provisioned.runtimeContract ??
    buildWorkspaceRuntimeContract(provisioned.workspace, provisioned.deployment);

  const preview = body.startPreview
    ? await startWorkspacePreview({
        event,
        userId,
        studioId: studio._id,
        workspaceId: created.workspace._id,
      })
    : null;

  return json({
    ok: true,
    user: {
      id: userId,
      email,
    },
    studio,
    workspace: provisioned.workspace,
    workspaceContract: createdRuntimeContract,
    runtimeContract: provisionedRuntimeContract,
    deployment: provisioned.deployment,
    artifact: provisioned.artifact,
    preview,
    build: {
      scaffoldStdout: null,
      scaffoldStderr: null,
      buildStdout: provisioned.buildResult.stdout,
      buildStderr: provisioned.buildResult.stderr,
    },
  });
};
