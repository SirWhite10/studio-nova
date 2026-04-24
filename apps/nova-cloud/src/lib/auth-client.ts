import { createAuthClient } from "better-auth/svelte";

const serverBaseURL =
  import.meta.env.PUBLIC_SITE_URL || import.meta.env.SITE_URL || "http://localhost:8105";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? `${window.location.origin}/api/surreal-auth`
      : `${serverBaseURL}/api/surreal-auth`,
});
