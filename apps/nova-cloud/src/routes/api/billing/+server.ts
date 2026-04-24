import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";

// TODO: Polar integration — implement the following endpoints:
//
// POST /api/billing/checkout
//   - Create a Polar checkout session for Pro plan ($49/mo)
//   - Return checkout URL for redirect
//   - Flow: User clicks "Upgrade to Pro" → frontend calls this → redirect to Polar hosted checkout
//
// POST /api/billing/portal
//   - Create a Polar customer portal session
//   - Return portal URL for redirect
//   - Flow: User clicks "Manage subscription" → frontend calls this → redirect to Polar portal
//
// POST /api/billing/webhook
//   - Handle Polar webhook events:
//     - subscription.created → plans.setUserPlan(userId, "pro")
//     - subscription.canceled → plans.setUserPlan(userId, "free")
//     - subscription.updated → update plan accordingly
//   - Verify webhook signature using Polar webhook secret
//   - Return 200 to acknowledge receipt

export const POST: RequestHandler = async () => {
  return json({ error: "Billing not yet implemented" }, { status: 501 });
};

export const GET: RequestHandler = async () => {
  return json({ error: "Billing not yet implemented" }, { status: 501 });
};
