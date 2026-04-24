import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { surrealSignUpEmail } from "$lib/server/surreal-better-auth";

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const email = form.get("email") as string;
    const password = form.get("password") as string;
    const name = (form.get("name") as string) || email.split("@")[0];

    try {
      await surrealSignUpEmail({
        email,
        password,
        name,
        headers: event.request.headers,
      });
    } catch (err: any) {
      console.error("Sign-up error:", err);
      return { error: "Failed to create account" };
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
