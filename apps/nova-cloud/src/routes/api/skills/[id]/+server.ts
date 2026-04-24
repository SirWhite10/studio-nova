import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { requireUserId } from "$lib/server/surreal-query";
import {
  deleteSkillForUser,
  getSkillByIdForUser,
  upsertSkillForUser,
} from "$lib/server/surreal-skills";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const { params } = event;
  const { id } = params as { id: string };
  try {
    const skill = await getSkillByIdForUser(userId, id);
    if (!skill) return json({ error: "Skill not found" }, { status: 404 });
    return json(skill);
  } catch {
    return json({ error: "Failed to get skill" }, { status: 500 });
  }
};

export const PUT: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const { params, request } = event;
  const { id } = params as { id: string };
  const body = await request.json();
  const { content, description } = body;

  if (!id || !id.trim()) {
    return json({ error: "Skill ID is required" }, { status: 400 });
  }

  try {
    await upsertSkillForUser(userId, {
      id,
      name: body.name || id,
      content: content || "",
      description,
      source: "json",
      readonly: false,
    });
    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update skill";
    return json({ error: message }, { status: 400 });
  }
};

export const DELETE: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const { params } = event;
  const { id } = params as { id: string };
  if (!id || !id.trim()) {
    return json({ error: "Skill ID is required" }, { status: 400 });
  }

  try {
    await deleteSkillForUser(userId, id);
    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete skill";
    return json({ error: message }, { status: 500 });
  }
};
