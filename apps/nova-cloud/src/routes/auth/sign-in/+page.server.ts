import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { surrealSignInEmail } from "$lib/server/surreal-better-auth";

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    try {
      await surrealSignInEmail({
        email,
        password,
        headers: event.request.headers,
      });
    } catch (err: any) {
      console.error("Sign-in error:", err);
      return { error: "Invalid credentials" };
    }

    throw redirect(303, "/app");
  },
};

export const load: PageServerLoad = async (event) => {
  if (event.locals.userId) {
    throw redirect(303, "/app");
  }
  return {};
};
