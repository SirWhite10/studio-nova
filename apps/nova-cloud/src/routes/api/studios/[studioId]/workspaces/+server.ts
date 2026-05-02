import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { createWorkspaceForStudio, listWorkspacesForStudio } from "$lib/server/surreal-workspaces";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const workspaces = await listWorkspacesForStudio(userId, studioId);
  return json({ workspaces });
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId);
  const body = (await event.request.json().catch(() => ({}))) as {
    name?: string;
    templateKind?: "blog-react-vp";
    framework?: "react";
  };

  const created = await createWorkspaceForStudio({
    userId,
    studioId,
    name: (body.name || "Blog Workspace").trim(),
    templateKind: body.templateKind ?? "blog-react-vp",
    framework: body.framework ?? "react",
  });

  return json(created, { status: 201 });
};
