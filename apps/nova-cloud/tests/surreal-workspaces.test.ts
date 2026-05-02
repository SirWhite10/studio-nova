import { describe, expect, it } from "vite-plus/test";
import {
  buildWorkspaceBuildCommand,
  buildWorkspaceDefaultHost,
  buildWorkspaceInstallCommand,
  buildWorkspaceScaffoldCommand,
  buildWorkspaceServeCommand,
  buildWorkspaceStoragePaths,
  workspaceSlug,
} from "../src/lib/server/surreal-workspaces";

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

  it("records the real vp react scaffold and build commands", () => {
    expect(buildWorkspaceScaffoldCommand("workspace/workspace-123/source")).toContain(
      'vp create vite --package-manager pnpm --no-interactive -- "workspace/workspace-123/source" --template "react"',
    );
    expect(
      buildWorkspaceInstallCommand("/home/user/workspace/workspace/workspace-123/source"),
    ).toBe('cd "/home/user/workspace/workspace/workspace-123/source" && vp install');
    expect(buildWorkspaceBuildCommand("/home/user/workspace/workspace/workspace-123/source")).toBe(
      'cd "/home/user/workspace/workspace/workspace-123/source" && mkdir -p public/content && rm -rf public/content/* && cp -R ../content/. ./public/content/ && mkdir -p ../build && rm -rf ../build/* && vp build --outDir ../build',
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
