import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
  if (event.locals.userId) {
    throw redirect(303, "/app");
  }

  return {};
};
