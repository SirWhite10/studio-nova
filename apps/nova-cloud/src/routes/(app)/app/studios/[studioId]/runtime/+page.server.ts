import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { normalizeRouteParam } from "$lib/server/surreal-records";

export const load: PageServerLoad = async (event) => {
  const studioId = normalizeRouteParam(event.params.studioId);
  throw redirect(307, `/app/studios/${studioId}/sandbox`);
};
