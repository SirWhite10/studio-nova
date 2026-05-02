import { StringRecordId, Table } from "surrealdb";
import { getSurreal } from "./surreal";
import { createStudioEvent } from "./surreal-studio-events";
import { getStudioForUser } from "./surreal-studios";
import { getSandboxForStudio } from "./surreal-sandbox";
import {
  ensureRecordPrefix,
  normalizeRouteParam,
  queryRows,
  withRecordIds,
} from "./surreal-records";

export type WorkspaceTemplateKind = "blog-react-vp";
export type WorkspaceFramework = "react";
export type WorkspaceStatus = "creating" | "ready" | "building" | "published" | "failed";
export type WorkspaceDeploymentStatus = "pending" | "building" | "ready" | "active" | "failed";

export type WorkspaceRow = {
  id: unknown;
  userId: string;
  studioId: string;
  sandboxId?: string | null;
  name: string;
  slug: string;
  templateKind: WorkspaceTemplateKind;
  framework: WorkspaceFramework;
  status: WorkspaceStatus;
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
  metadata?: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
};

type WorkspaceStoragePaths = {
  rootPath: string;
  sourcePath: string;
  buildPath: string;
  contentPath: string;
};

const WORKSPACE_ROOT_DOMAIN = "workspace.dlxstudios.com";
const DEFAULT_OUTPUT_DIR = "dist";

async function ensureWorkspaceTables() {
  const db = await getSurreal();
  await db.query("DEFINE TABLE IF NOT EXISTS workspace SCHEMALESS").collect();
  await db.query("DEFINE TABLE IF NOT EXISTS workspace_deployment SCHEMALESS").collect();
  return db;
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

export function buildWorkspaceScaffoldCommand(projectDirName: string) {
  return `vp create vite --package-manager pnpm --no-interactive -- ${JSON.stringify(projectDirName)} --template ${JSON.stringify("react")}`;
}

export function buildWorkspaceInstallCommand(projectRoot: string) {
  return `cd ${JSON.stringify(projectRoot)} && vp install`;
}

export function buildWorkspaceBuildCommand(projectRoot: string) {
  return `cd ${JSON.stringify(projectRoot)} && mkdir -p public/content && rm -rf public/content/* && cp -R ../content/. ./public/content/ && mkdir -p ../build && rm -rf ../build/* && vp build --outDir ../build`;
}

export function buildWorkspaceServeCommand(buildPath: string) {
  const sourceRoot = buildPath.replace(/build\/?$/, "source").replace(/\/$/, "");
  return `cd ${JSON.stringify(sourceRoot)} && vp preview --host 0.0.0.0 --outDir "../build"`;
}

export async function listWorkspacesForStudio(userId: string, studioId: string) {
  const db = await ensureWorkspaceTables();
  const fullStudioId = ensureRecordPrefix("studio", normalizeRouteParam(studioId));
  const rows = await queryRows<WorkspaceRow>(
    db,
    "SELECT * FROM workspace WHERE userId = $userId AND studioId = $studioId ORDER BY updatedAt DESC",
    { userId, studioId: fullStudioId },
  );
  return rows.map((row) => withRecordIds(row));
}

export async function getWorkspaceForStudio(userId: string, studioId: string, workspaceId: string) {
  const db = await ensureWorkspaceTables();
  const fullId = ensureRecordPrefix("workspace", normalizeRouteParam(workspaceId));
  try {
    const selected = await db.select<WorkspaceRow>(new StringRecordId(fullId));
    const row = Array.isArray(selected) ? selected[0] : selected;
    if (!row || row.userId !== userId) return null;
    if (normalizeRouteParam(row.studioId) !== normalizeRouteParam(studioId)) return null;
    return withRecordIds(row);
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
  return rows.map((row) => withRecordIds(row));
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

  const created = await db.create(new Table("workspace")).content({
    userId: input.userId,
    studioId: ensureRecordPrefix("studio", normalizeRouteParam(input.studioId)),
    sandboxId: sandbox?.sandboxId ?? null,
    name: input.name.trim() || "Workspace",
    slug,
    templateKind,
    framework,
    status: "creating",
    rootPath: "",
    sourcePath: "",
    buildPath: "",
    contentPath: "",
    outputDir: DEFAULT_OUTPUT_DIR,
    scaffoldCommand: "",
    installCommand: "",
    buildCommand: "",
    serveCommand: "",
    defaultHost: null,
    activeDeploymentId: null,
    createdAt: now,
    updatedAt: now,
  });

  const row = withRecordIds((Array.isArray(created) ? created[0] : created) as WorkspaceRow);
  const paths = buildWorkspaceStoragePaths(row._id);
  const projectRoot = `/home/user/workspace/${paths.sourcePath}`.replace(/\/+$/g, "");
  const projectDirName = paths.sourcePath.replace(/\/$/g, "");
  const fullWorkspaceId = ensureRecordPrefix("workspace", row._id);

  const updated = await db.update<WorkspaceRow>(new StringRecordId(fullWorkspaceId)).merge({
    rootPath: paths.rootPath,
    sourcePath: paths.sourcePath,
    buildPath: paths.buildPath,
    contentPath: paths.contentPath,
    scaffoldCommand: buildWorkspaceScaffoldCommand(projectDirName),
    installCommand: buildWorkspaceInstallCommand(projectRoot),
    buildCommand: buildWorkspaceBuildCommand(projectRoot),
    serveCommand: buildWorkspaceServeCommand(paths.buildPath),
    defaultHost: buildWorkspaceDefaultHost(row._id),
    updatedAt: Date.now(),
  });

  const workspace = withRecordIds((Array.isArray(updated) ? updated[0] : updated) as WorkspaceRow);

  const deployment = await db.create(new Table("workspace_deployment")).content({
    userId: input.userId,
    studioId: ensureRecordPrefix("studio", normalizeRouteParam(input.studioId)),
    workspaceId: fullWorkspaceId,
    status: "pending",
    revision: 1,
    artifactPath: `${studio.prefix ?? ""}${paths.buildPath}`,
    outputDir: DEFAULT_OUTPUT_DIR,
    buildCommand: workspace.buildCommand,
    serveCommand: workspace.serveCommand,
    activatedAt: null,
    metadata: {
      templateKind,
      framework,
      studioPrefix: studio.prefix ?? null,
    },
    createdAt: now,
    updatedAt: now,
  });

  const deploymentRow = withRecordIds(
    (Array.isArray(deployment) ? deployment[0] : deployment) as WorkspaceDeploymentRow,
  );

  const activatedWorkspace = await db
    .update<WorkspaceRow>(new StringRecordId(fullWorkspaceId))
    .merge({
      status: "ready",
      activeDeploymentId: deploymentRow._id,
      updatedAt: Date.now(),
    });

  const finalWorkspace = withRecordIds(
    (Array.isArray(activatedWorkspace)
      ? activatedWorkspace[0]
      : activatedWorkspace) as WorkspaceRow,
  );

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
      defaultHost: finalWorkspace.defaultHost ?? null,
      activeDeploymentId: deploymentRow._id,
    },
  });

  return {
    workspace: finalWorkspace,
    deployment: deploymentRow,
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

  const updatedDeployment = await db
    .update<WorkspaceDeploymentRow>(new StringRecordId(fullDeploymentId))
    .merge({
      status: input.deploymentStatus,
      activatedAt: input.activated ? now : null,
      metadata: input.metadata ?? null,
      updatedAt: now,
    });

  const deployment = withRecordIds(
    (Array.isArray(updatedDeployment)
      ? updatedDeployment[0]
      : updatedDeployment) as WorkspaceDeploymentRow,
  );

  const workspacePatch: Record<string, unknown> = {
    updatedAt: now,
  };
  if (input.workspaceStatus) workspacePatch.status = input.workspaceStatus;
  if (input.activated) workspacePatch.activeDeploymentId = deployment._id;
  const updatedWorkspace = await db
    .update<WorkspaceRow>(new StringRecordId(fullWorkspaceId))
    .merge(workspacePatch);

  const workspace = withRecordIds(
    (Array.isArray(updatedWorkspace) ? updatedWorkspace[0] : updatedWorkspace) as WorkspaceRow,
  );

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
    },
  });

  return { workspace, deployment };
}
