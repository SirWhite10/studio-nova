import type { RequestEvent } from "@sveltejs/kit";

function parseEmailList(value: string | undefined) {
  return (value ?? "")
    .split(/[,\n]/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function getConfiguredSuperAdminEmails() {
  return parseEmailList(process.env.NOVA_SUPER_ADMIN_EMAILS ?? process.env.SUPER_ADMIN_EMAILS);
}

export async function isSuperAdmin(event: RequestEvent) {
  const configuredEmails = getConfiguredSuperAdminEmails();

  if (configuredEmails.length === 0) {
    return process.env.NODE_ENV !== "production";
  }

  const email = event.locals.session?.user?.email?.trim().toLowerCase();
  if (!email) return false;

  return configuredEmails.includes(email);
}
