import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { APP_DASHBOARD_URL } from "$lib/app-links";

export const load: PageServerLoad = async () => {
  throw redirect(308, APP_DASHBOARD_URL);
};
