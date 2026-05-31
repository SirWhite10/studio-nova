import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, url }) => {
  const segments = (params.segments ?? "").split("/").filter(Boolean).join("/");
  const suffix = segments ? `/${segments}` : "/";
  const query = url.searchParams.toString();
  throw redirect(308, `${suffix}${query ? `?${query}` : ""}`);
};
