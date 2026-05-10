import { json, type RequestHandler } from "@sveltejs/kit";
import { getSurreal } from "$lib/server/surreal";
import { ensureTables } from "$lib/server/surreal-tables";
import { queryRows } from "$lib/server/surreal-records";

type UserEmailRow = {
  id: unknown;
  email?: string | null;
};

export const GET: RequestHandler = async (event) => {
  const rawEmail = event.url.searchParams.get("email") ?? "";
  const email = rawEmail.trim().toLowerCase();

  if (!email) {
    return json({ exists: false, error: "Missing email" }, { status: 400 });
  }

  await ensureTables();
  const db = await getSurreal();
  const rows = await queryRows<UserEmailRow>(
    db,
    "SELECT id, email FROM user WHERE email != NONE AND string::lowercase(email) = $email LIMIT 1",
    { email },
  );

  return json({ exists: rows.length > 0 });
};
