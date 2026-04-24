import type { RequestEvent } from "@sveltejs/kit";

export async function POST({ cookies }: RequestEvent) {
  const allCookies = cookies.getAll();
  for (const c of allCookies) {
    if (c.name.includes("auth") || c.name.includes("session") || c.name.includes("token")) {
      cookies.delete(c.name, { path: "/" });
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
