"use server";

import { accountInvitationOwner } from "@/lib/account-invitation-owner";
import { openSupportTripCode, type SupportTripSnapshot } from "@/lib/account-store";
import { rateLimit } from "@/lib/rate-limit";

export async function viewSupportTrip(_state: { error: string } | { snapshot: SupportTripSnapshot } | null, form: FormData) {
  const owner = await accountInvitationOwner();
  if (!owner) return { error: "Log in with the verified owner account." };
  const gate = await rateLimit("admin:support-trip", { limit: 60, windowSeconds: 3600 });
  if (!gate.ok) return { error: "Try again later." };
  const code = String(form.get("code") || "").trim();
  const snapshot = await openSupportTripCode(code, owner);
  return snapshot
    ? { snapshot }
    : { error: "That support code is invalid, expired, revoked, or already used." };
}
