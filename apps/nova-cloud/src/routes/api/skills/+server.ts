import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/surreal-query";
import { listSkillsByUser, upsertSkillForUser } from "$lib/server/surreal-skills";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const enabledOnly = event.url.searchParams.get("enabled") === "true";
  const skills = await listSkillsByUser(userId, enabledOnly);
  return json(skills);
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const { request } = event;
  const { name, description, content } = await request.json();
  if (!name || !content) {
    return json({ error: "Name and content are required" }, { status: 400 });
  }
  try {
    const skill = await upsertSkillForUser(userId, {
      name,
      description,
      content,
      source: "json",
      readonly: false,
    });
    return json({ id: skill.id, skill }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create skill";
    return json({ error: message }, { status: 400 });
  }
};
