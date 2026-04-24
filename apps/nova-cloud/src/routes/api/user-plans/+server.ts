import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { requireUserId } from "$lib/server/surreal-query";
import { getUserPlan, setUserPlan } from "$lib/server/surreal-plans";

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const plan = await getUserPlan(userId);
  return json(plan);
};

export const PUT: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const { plan }: { plan: "free" | "pro" } = await event.request.json();
  if (!plan || (plan !== "free" && plan !== "pro")) {
    return json({ error: "Invalid plan. Must be 'free' or 'pro'." }, { status: 400 });
  }
  const updated = await setUserPlan(userId, plan);
  return json(updated);
};
