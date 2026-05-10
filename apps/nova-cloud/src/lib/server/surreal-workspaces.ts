import { StringRecordId, Table } from "surrealdb";
import { ensureTables } from "./surreal-tables";
import { getSurreal } from "./surreal";
import { createStudioEvent } from "./surreal-studio-events";
import { getStudioForUser } from "./surreal-studios";
import { getSandboxForStudio } from "./surreal-sandbox";
import {
  ensureRecordPrefix,
  normalizeRouteParam,
  normalizeSurrealRow,
  normalizeSurrealRows,
  queryRows,
} from "./surreal-records";

export type WorkspaceTemplateKind = "blog-react-vp";
export type WorkspaceFramework = "react";
export type WorkspaceRuntimeKind = "node-server" | "container" | "static" | "job";
export type WorkspaceLifecycleMode = "on-demand";
export type WorkspaceStatus = "creating" | "ready" | "building" | "published" | "failed";
export type WorkspaceDeploymentStatus = "pending" | "building" | "ready" | "active" | "failed";

export type WorkspaceRow = {
  _id: string;
  id: unknown;
  userId: string;
  studioId: string;
  sandboxId?: string | null;
  name: string;
  slug: string;
  templateKind: WorkspaceTemplateKind;
  framework: WorkspaceFramework;
  status: WorkspaceStatus;
  runtimeKind: WorkspaceRuntimeKind;
  lifecycleMode: WorkspaceLifecycleMode;
  runCommand: string;
  healthCheckPath?: string | null;
  publicHost?: string | null;
  statePath: string;
  runtimeImage?: string | null;
  rootPath: string;
  sourcePath: string;
  buildPath: string;
  contentPath: string;
  outputDir: string;
  scaffoldCommand: string;
  installCommand: string;
  buildCommand: string;
  serveCommand: string;
  defaultHost?: string | null;
  activeDeploymentId?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceDeploymentRow = {
  _id: string;
  id: unknown;
  userId: string;
  studioId: string;
  workspaceId: string;
  status: WorkspaceDeploymentStatus;
  revision: number;
  artifactPath: string;
  outputDir: string;
  buildCommand: string;
  serveCommand: string;
  activatedAt?: number | null;
  runtimeKind?: WorkspaceRuntimeKind | null;
  lifecycleMode?: WorkspaceLifecycleMode | null;
  runCommand?: string | null;
  healthCheckPath?: string | null;
  publicHost?: string | null;
  statePath?: string | null;
  runtimeImage?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceRuntimeContract = {
  studioId: string;
  workspaceId: string;
  sandboxId: string | null;
  templateKind: WorkspaceTemplateKind;
  framework: WorkspaceFramework;
  status: WorkspaceStatus;
  runtimeKind: WorkspaceRuntimeKind;
  lifecycleMode: WorkspaceLifecycleMode;
  runCommand: string;
  healthCheckPath: string | null;
  publicHost: string | null;
  statePath: string;
  runtimeImage: string | null;
  defaultHost: string | null;
  storage: WorkspaceStoragePaths;
  commands: {
    scaffoldCommand: string;
    installCommand: string;
    buildCommand: string;
    serveCommand: string;
    runCommand: string;
  };
  deployment: WorkspaceDeploymentRow | null;
  api: {
    basePath: string;
    runtimePath: string;
    previewPath: string;
  };
  database: {
    tables: string[];
  };
};

type WorkspaceStoragePaths = {
  rootPath: string;
  sourcePath: string;
  buildPath: string;
  contentPath: string;
};

const WORKSPACE_ROOT_DOMAIN = "dlx.studio";
const DEFAULT_OUTPUT_DIR = "dist";

async function ensureWorkspaceTables() {
  await ensureTables();
  return getSurreal();
}

export function workspaceSlug(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "workspace";
}

export function buildWorkspaceStoragePaths(workspaceId: string): WorkspaceStoragePaths {
  const cleanId = normalizeRouteParam(workspaceId);
  const rootPath = `workspace/${cleanId}/`;
  return {
    rootPath,
    sourcePath: `${rootPath}source/`,
    buildPath: `${rootPath}build/`,
    contentPath: `${rootPath}content/`,
  };
}

export function buildWorkspaceDefaultHost(workspaceId: string) {
  const cleanId = normalizeRouteParam(workspaceId).toLowerCase();
  return `ws-${cleanId}.${WORKSPACE_ROOT_DOMAIN}`;
}

export function buildWorkspaceRuntimeKind() {
  return "node-server" as const;
}

export function buildWorkspaceLifecycleMode() {
  return "on-demand" as const;
}

export function buildWorkspaceStatePath(workspaceId: string) {
  return buildWorkspaceStoragePaths(workspaceId).rootPath;
}

export function buildWorkspaceScaffoldCommand(projectDirName: string) {
  return `vp create vite --package-manager pnpm --no-interactive -- ${JSON.stringify(projectDirName)} --template ${JSON.stringify("react")}`;
}

export function buildWorkspaceInstallCommand(projectRoot: string) {
  return `cd ${JSON.stringify(projectRoot)} && vp install`;
}

export function buildWorkspaceBuildCommand(projectRoot: string) {
  return `cd ${JSON.stringify(projectRoot)} && mkdir -p public/content && rm -rf public/content/* && cp -R ../content/. ./public/content/ && mkdir -p ../build && rm -rf ../build/* && vp build --outDir ../build --emptyOutDir`;
}

export function normalizeWorkspaceBuildCommand(command: string, projectRoot: string) {
  const expected = buildWorkspaceBuildCommand(projectRoot);
  if (command.includes("--emptyOutDir")) return command;
  return expected;
}

export function buildWorkspaceServeCommand(buildPath: string) {
  const sourceRoot = buildPath.replace(/build\/?$/, "source").replace(/\/$/, "");
  return `cd ${JSON.stringify(sourceRoot)} && vp preview --host 0.0.0.0 --outDir "../build"`;
}

export function buildWorkspaceRunCommand(buildPath: string) {
  return buildWorkspaceServeCommand(buildPath);
}

export function buildWorkspaceRuntimeContract(
  workspace: WorkspaceRow,
  deployment: WorkspaceDeploymentRow | null = null,
): WorkspaceRuntimeContract {
  const storage = buildWorkspaceStoragePaths(workspace._id);
  const studioId = normalizeRouteParam(workspace.studioId);
  const defaultHost = workspace.defaultHost ?? buildWorkspaceDefaultHost(workspace._id);
  return {
    studioId,
    workspaceId: workspace._id,
    sandboxId: workspace.sandboxId ?? null,
    templateKind: workspace.templateKind,
    framework: workspace.framework,
    status: workspace.status,
    runtimeKind: workspace.runtimeKind,
    lifecycleMode: workspace.lifecycleMode,
    runCommand: workspace.runCommand,
    healthCheckPath: workspace.healthCheckPath ?? null,
    publicHost: workspace.publicHost ?? defaultHost,
    statePath: workspace.statePath,
    runtimeImage: workspace.runtimeImage ?? null,
    defaultHost,
    storage,
    commands: {
      scaffoldCommand: workspace.scaffoldCommand,
      installCommand: workspace.installCommand,
      buildCommand: workspace.buildCommand,
      serveCommand: workspace.serveCommand,
      runCommand: workspace.runCommand,
    },
    deployment,
    api: {
      basePath: `/api/studios/${studioId}/workspaces/${workspace._id}`,
      runtimePath: `/api/studios/${studioId}/workspaces/${workspace._id}/runtime`,
      previewPath: `/api/studios/${studioId}/workspaces/${workspace._id}`,
    },
    database: {
      tables: ["workspace", "workspace_deployment", "runtime_process", "sandbox"],
    },
  };
}

export async function listWorkspacesForStudio(userId: string, studioId: string) {
  const db = await ensureWorkspaceTables();
  const fullStudioId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  const rows = await queryRows<WorkspaceRow>(
    db,
    "SELECT * FROM workspace WHERE userId = $userId AND studioId = $studioId ORDER BY updatedAt DESC",
    { userId, studioId: fullStudioId },
  );
  return normalizeSurrealRows<WorkspaceRow>(rows);
}

export async function getWorkspaceForStudio(userId: string, studioId: string, workspaceId: string) {
  const db = await ensureWorkspaceTables();
  const fullId = ensureRecordPrefix("workspace", normalizeRouteParam(workspaceId));
  try {
    const selected = await db.select<WorkspaceRow>(new StringRecordId(fullId));
    const row = Array.isArray(selected) ? selected[0] : selected;
    if (!row || row.userId !== userId) return null;
    if (normalizeRouteParam(row.studioId) !== normalizeRouteParam(studioId)) return null;
    return normalizeSurrealRow<WorkspaceRow>(row);
  } catch {
    return null;
  }
}

export async function listDeploymentsForWorkspace(
  userId: string,
  studioId: string,
  workspaceId: string,
) {
  const db = await ensureWorkspaceTables();
  const fullStudioId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  const fullWorkspaceId = ensureRecordPrefix("workspace", normalizeRouteParam(workspaceId));
  const rows = await queryRows<WorkspaceDeploymentRow>(
    db,
    "SELECT * FROM workspace_deployment WHERE userId = $userId AND studioId = $studioId AND workspaceId = $workspaceId ORDER BY createdAt DESC",
    { userId, studioId: fullStudioId, workspaceId: fullWorkspaceId },
  );
  return normalizeSurrealRows<WorkspaceDeploymentRow>(rows);
}

export async function createWorkspaceForStudio(input: {
  userId: string;
  studioId: string;
  name: string;
  templateKind?: WorkspaceTemplateKind;
  framework?: WorkspaceFramework;
}) {
  const db = await ensureWorkspaceTables();
  const studio = await getStudioForUser(input.userId, input.studioId);
  if (!studio) {
    throw new Error("Studio not found");
  }

  const sandbox = await getSandboxForStudio(input.userId, input.studioId).catch(() => null);
  const now = Date.now();
  const templateKind = input.templateKind ?? "blog-react-vp";
  const framework = input.framework ?? "react";
  const slug = workspaceSlug(input.name);

  const workspaceContent: Record<string, unknown> = {
    userId: input.userId,
    studioId: ensureRecordPrefix("studio", normalizeRouteParam(input.studioId)),
    ...(sandbox?.sandboxId ? { sandboxId: sandbox.sandboxId } : {}),
    name: input.name.trim() || "Workspace",
    slug,
    templateKind,
    framework,
    status: "creating",
    runtimeKind: buildWorkspaceRuntimeKind(),
    lifecycleMode: buildWorkspaceLifecycleMode(),
    runCommand: "",
    healthCheckPath: "/",
    statePath: "",
    rootPath: "",
    sourcePath: "",
    buildPath: "",
    contentPath: "",
    outputDir: DEFAULT_OUTPUT_DIR,
    scaffoldCommand: "",
    installCommand: "",
    buildCommand: "",
    serveCommand: "",
    createdAt: now,
    updatedAt: now,
  };

  const [created] = await db.create(new Table("workspace")).content(workspaceContent);
  const row = normalizeSurrealRow<WorkspaceRow>(created);
  const paths = buildWorkspaceStoragePaths(row._id);
  const projectRoot = `/home/user/workspace/${paths.sourcePath}`.replace(/\/+$/g, "");
  const projectDirName = paths.sourcePath.replace(/\/$/g, "");
  const fullWorkspaceId = ensureRecordPrefix("workspace", row._id);

  const updated = await db.update(new StringRecordId(fullWorkspaceId)).merge({
    rootPath: paths.rootPath,
    sourcePath: paths.sourcePath,
    buildPath: paths.buildPath,
    contentPath: paths.contentPath,
    statePath: buildWorkspaceStatePath(row._id),
    scaffoldCommand: buildWorkspaceScaffoldCommand(projectDirName),
    installCommand: buildWorkspaceInstallCommand(projectRoot),
    buildCommand: buildWorkspaceBuildCommand(projectRoot),
    serveCommand: buildWorkspaceServeCommand(paths.buildPath),
    runCommand: buildWorkspaceRunCommand(paths.buildPath),
    runtimeKind: buildWorkspaceRuntimeKind(),
    lifecycleMode: buildWorkspaceLifecycleMode(),
    healthCheckPath: "/",
    publicHost: buildWorkspaceDefaultHost(row._id),
    defaultHost: buildWorkspaceDefaultHost(row._id),
    updatedAt: Date.now(),
  });

  const workspace = normalizeSurrealRow<WorkspaceRow>(updated);

  const deploymentContent: Record<string, unknown> = {
    userId: input.userId,
    studioId: ensureRecordPrefix("studio", normalizeRouteParam(input.studioId)),
    workspaceId: fullWorkspaceId,
    status: "pending",
    revision: 1,
    artifactPath: `${studio.prefix ?? ""}${paths.buildPath}`,
    outputDir: DEFAULT_OUTPUT_DIR,
    buildCommand: workspace.buildCommand,
    serveCommand: workspace.serveCommand,
    runtimeKind: workspace.runtimeKind,
    lifecycleMode: workspace.lifecycleMode,
    runCommand: workspace.runCommand,
    healthCheckPath: workspace.healthCheckPath ?? "/",
    publicHost: workspace.publicHost ?? workspace.defaultHost ?? null,
    statePath: workspace.statePath,
    metadata: {
      templateKind,
      framework,
      studioPrefix: studio.prefix ?? null,
    },
    createdAt: now,
    updatedAt: now,
  };

  if (workspace.runtimeImage) {
    deploymentContent.runtimeImage = workspace.runtimeImage;
  }

  const [deployment] = await db
    .create(new Table("workspace_deployment"))
    .content(deploymentContent);

  const deploymentRow = normalizeSurrealRow<WorkspaceDeploymentRow>(deployment);

  const activatedWorkspace = await db.update(new StringRecordId(fullWorkspaceId)).merge({
    status: "ready",
    activeDeploymentId: deploymentRow._id,
    updatedAt: Date.now(),
  });

  const finalWorkspace = normalizeSurrealRow<WorkspaceRow>(activatedWorkspace);

  await createStudioEvent({
    userId: input.userId,
    studioId: input.studioId,
    kind: "deploy.updated",
    entityType: "workspace",
    entityId: finalWorkspace._id,
    state: finalWorkspace.status,
    summary: `${finalWorkspace.name} workspace created`,
    payload: {
      templateKind: finalWorkspace.templateKind,
      framework: finalWorkspace.framework,
      rootPath: finalWorkspace.rootPath,
      sourcePath: finalWorkspace.sourcePath,
      buildPath: finalWorkspace.buildPath,
      statePath: finalWorkspace.statePath,
      runtimeKind: finalWorkspace.runtimeKind,
      lifecycleMode: finalWorkspace.lifecycleMode,
      runCommand: finalWorkspace.runCommand,
      defaultHost: finalWorkspace.defaultHost ?? null,
      publicHost: finalWorkspace.publicHost ?? null,
      activeDeploymentId: deploymentRow._id,
    },
  });

  return {
    workspace: finalWorkspace,
    deployment: deploymentRow,
    runtimeContract: buildWorkspaceRuntimeContract(finalWorkspace, deploymentRow),
  };
}

export async function markWorkspaceDeploymentStatus(input: {
  userId: string;
  studioId: string;
  workspaceId: string;
  deploymentId: string;
  workspaceStatus?: WorkspaceStatus;
  deploymentStatus: WorkspaceDeploymentStatus;
  metadata?: Record<string, unknown> | null;
  activated?: boolean;
}) {
  const db = await ensureWorkspaceTables();
  const fullDeploymentId = ensureRecordPrefix(
    "workspace_deployment",
    normalizeRouteParam(input.deploymentId),
  );
  const fullWorkspaceId = ensureRecordPrefix("workspace", normalizeRouteParam(input.workspaceId));
  const now = Date.now();

  const updatedDeployment = await db.update(new StringRecordId(fullDeploymentId)).merge({
    status: input.deploymentStatus,
    updatedAt: now,
    ...(input.activated ? { activatedAt: now } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });

  const deployment = normalizeSurrealRow<WorkspaceDeploymentRow>(updatedDeployment);

  const workspacePatch: Record<string, unknown> = {
    updatedAt: now,
  };
  if (input.workspaceStatus) workspacePatch.status = input.workspaceStatus;
  if (input.activated) workspacePatch.activeDeploymentId = deployment._id;
  const updatedWorkspace = await db
    .update(new StringRecordId(fullWorkspaceId))
    .merge(workspacePatch);

  const workspace = normalizeSurrealRow<WorkspaceRow>(updatedWorkspace);

  await createStudioEvent({
    userId: input.userId,
    studioId: input.studioId,
    kind: "deploy.updated",
    entityType: "workspace",
    entityId: workspace._id,
    state: workspace.status,
    summary: `${workspace.name} deployment marked ${deployment.status}`,
    payload: {
      deploymentId: deployment._id,
      deploymentStatus: deployment.status,
      workspaceStatus: workspace.status,
      artifactPath: deployment.artifactPath,
      runtimeKind: deployment.runtimeKind ?? null,
      lifecycleMode: deployment.lifecycleMode ?? null,
      runCommand: deployment.runCommand ?? null,
      healthCheckPath: deployment.healthCheckPath ?? null,
      publicHost: deployment.publicHost ?? null,
    },
  });

  return { workspace, deployment };
}
