import { describe, expect, it } from "vite-plus/test";
import {
  buildWorkspaceBuildCommand,
  buildWorkspaceDefaultHost,
  buildWorkspaceLifecycleMode,
  buildWorkspaceInstallCommand,
  buildWorkspaceRunCommand,
  buildWorkspaceScaffoldCommand,
  buildWorkspaceServeCommand,
  buildWorkspaceStatePath,
  buildWorkspaceRuntimeKind,
  buildWorkspaceRuntimeContract,
  buildWorkspaceStoragePaths,
  workspaceSlug,
} from "../src/lib/server/surreal-workspaces";
import type { WorkspaceRow } from "../src/lib/server/surreal-workspaces";

describe("surreal-workspaces helpers", () => {
  it("builds deterministic storage paths under workspace/<workspaceId>", () => {
    expect(buildWorkspaceStoragePaths("workspace-123")).toEqual({
      rootPath: "workspace/workspace-123/",
      sourcePath: "workspace/workspace-123/source/",
      buildPath: "workspace/workspace-123/build/",
      contentPath: "workspace/workspace-123/content/",
    });
  });

  it("builds the default workspace host from the workspace id", () => {
    expect(buildWorkspaceDefaultHost("workspace-123")).toBe(
      "ws-workspace-123.workspace.dlxstudios.com",
    );
  });

  it("records the runtime contract for on-demand workspaces", () => {
    expect(buildWorkspaceRuntimeKind()).toBe("node-server");
    expect(buildWorkspaceLifecycleMode()).toBe("on-demand");
    expect(buildWorkspaceStatePath("workspace-123")).toBe("workspace/workspace-123/");
    expect(buildWorkspaceRunCommand("workspace/workspace-123/build/")).toBe(
      'cd "workspace/workspace-123/source" && vp preview --host 0.0.0.0 --outDir "../build"',
    );
  });

  it("builds a runtime contract payload for the agent and UI", () => {
    const workspace = {
      _id: "workspace-123",
      id: "workspace-123",
      userId: "user-1",
      studioId: "studio-1",
      sandboxId: "sandbox-1",
      name: "Blog",
      slug: "blog",
      templateKind: "blog-react-vp",
      framework: "react",
      status: "ready",
      runtimeKind: "node-server",
      lifecycleMode: "on-demand",
      runCommand:
        'cd "workspace/workspace-123/source" && vp preview --host 0.0.0.0 --outDir "../build"',
      healthCheckPath: "/",
      publicHost: "ws-workspace-123.workspace.dlxstudios.com",
      statePath: "workspace/workspace-123/",
      runtimeImage: null,
      rootPath: "workspace/workspace-123/",
      sourcePath: "workspace/workspace-123/source/",
      buildPath: "workspace/workspace-123/build/",
      contentPath: "workspace/workspace-123/content/",
      outputDir: "dist",
      scaffoldCommand: "scaffold",
      installCommand: "install",
      buildCommand: "build",
      serveCommand: "serve",
      defaultHost: "ws-workspace-123.workspace.dlxstudios.com",
      activeDeploymentId: null,
      createdAt: 0,
      updatedAt: 0,
    } as WorkspaceRow;
    const runtime = buildWorkspaceRuntimeContract(workspace);
    expect(runtime.workspaceId).toBe("workspace-123");
    expect(runtime.api.runtimePath).toBe("/api/studios/studio-1/workspaces/workspace-123/runtime");
    expect(runtime.commands.runCommand).toContain("vp preview");
    expect(runtime.database.tables).toContain("workspace_deployment");
  });

  it("records the real vp react scaffold and build commands", () => {
    expect(buildWorkspaceScaffoldCommand("workspace/workspace-123/source")).toContain(
      'vp create vite --package-manager pnpm --no-interactive -- "workspace/workspace-123/source" --template "react"',
    );
    expect(
      buildWorkspaceInstallCommand("/home/user/workspace/workspace/workspace-123/source"),
    ).toBe('cd "/home/user/workspace/workspace/workspace-123/source" && vp install');
    expect(buildWorkspaceBuildCommand("/home/user/workspace/workspace/workspace-123/source")).toBe(
      'cd "/home/user/workspace/workspace/workspace-123/source" && mkdir -p public/content && rm -rf public/content/* && cp -R ../content/. ./public/content/ && mkdir -p ../build && rm -rf ../build/* && vp build --outDir ../build --emptyOutDir',
    );
    expect(buildWorkspaceServeCommand("workspace/workspace-123/build/")).toBe(
      'cd "workspace/workspace-123/source" && vp preview --host 0.0.0.0 --outDir "../build"',
    );
  });

  it("creates a stable slug for workspace names", () => {
    expect(workspaceSlug("  My Blog Workspace  ")).toBe("my-blog-workspace");
    expect(workspaceSlug("!!!")).toBe("workspace");
  });
});
