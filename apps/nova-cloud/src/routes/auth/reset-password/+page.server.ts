import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { surrealResetPassword } from "$lib/server/surreal-better-auth";

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const tokenValue = form.get("token");
    const newPasswordValue = form.get("newPassword");
    const confirmPasswordValue = form.get("confirmPassword");
    const token = typeof tokenValue === "string" ? tokenValue.trim() : "";
    const newPassword = typeof newPasswordValue === "string" ? newPasswordValue : "";
    const confirmPassword = typeof confirmPasswordValue === "string" ? confirmPasswordValue : "";

    if (!token) {
      return { error: "Missing reset token." };
    }

    if (!newPassword || !confirmPassword) {
      return { error: "Fill in both password fields." };
    }

    if (newPassword !== confirmPassword) {
      return { error: "Passwords do not match." };
    }

    try {
      await surrealResetPassword({
        token,
        newPassword,
        headers: event.request.headers,
      });
    } catch (err) {
      console.error("Reset password error:", err);
      return { error: "Unable to update your password right now." };
    }

    throw redirect(303, "/auth/sign-in?reset=1");
  },
};

export const load: PageServerLoad = async (event) => {
  if (event.locals.userId) {
    throw redirect(303, "/app");
  }

  return {
    token: event.url.searchParams.get("token") ?? "",
    error: event.url.searchParams.get("error") ?? "",
  };
};
