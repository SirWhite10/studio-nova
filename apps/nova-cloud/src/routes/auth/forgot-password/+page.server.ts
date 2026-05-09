import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { surrealRequestPasswordReset } from "$lib/server/surreal-better-auth";
import { config } from "$lib/server/env";

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const emailValue = form.get("email");
    const email = typeof emailValue === "string" ? emailValue.trim() : "";

    if (!email) {
      return { error: "Enter your email address." };
    }

    try {
      await surrealRequestPasswordReset({
        email,
        redirectTo: new URL(
          "/auth/reset-password",
          config.PUBLIC_SITE_URL ||
            (process.env.NODE_ENV === "production"
              ? "https://nova.dlxstudios.com"
              : "https://devnova.dlxstudios.com"),
        ).toString(),
        headers: event.request.headers,
      });
    } catch (err) {
      console.error("Forgot password error:", err);
      return { error: "Unable to send reset instructions right now." };
    }

    return { sent: true };
  },
};

export const load: PageServerLoad = async (event) => {
  if (event.locals.userId) {
    throw redirect(303, "/app");
  }

  return {};
};
