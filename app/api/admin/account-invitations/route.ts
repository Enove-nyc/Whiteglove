import { NextRequest, NextResponse } from "next/server";
import { accountInvitationOwner } from "@/lib/account-invitation-owner";
import { createAccountInvitation, listAccountInvitations, revokeAccountInvitation } from "@/lib/account-invitations";
import { getAccountRecord } from "@/lib/account-store";
import { normalizeIdentity } from "@/lib/identity";
import { BRAND_ORIGIN } from "@/lib/site-brand-core";
import { sameOrigin } from "@/lib/secure-access";
import { smsConfigured } from "@/lib/sms";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!(await accountInvitationOwner())) return NextResponse.json({ error: "Log in as the owner to manage invitations." }, { status: 403, headers });
  try { return NextResponse.json({ invitations: await listAccountInvitations() }, { headers }); }
  catch { return NextResponse.json({ error: "Invitations could not be loaded. Please try again." }, { status: 503, headers }); }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "That request did not come from this site." }, { status: 403, headers });
  const owner = await accountInvitationOwner();
  if (!owner) return NextResponse.json({ error: "Log in as the owner to manage invitations." }, { status: 403, headers });
  const body = await request.json().catch(() => null) as { action?: unknown; identity?: unknown; brand?: unknown; id?: unknown } | null;
  try {
    if (body?.action === "revoke") {
      const revoked = typeof body.id === "string" && await revokeAccountInvitation(body.id);
      return NextResponse.json(revoked ? { ok: true } : { error: "That invitation is no longer available to revoke." }, { status: revoked ? 200 : 409, headers });
    }
    if (body?.action !== "create") return NextResponse.json({ error: "Choose an invitation action." }, { status: 400, headers });
    const identity = typeof body.identity === "string" ? normalizeIdentity(body.identity) : null;
    if (!identity) return NextResponse.json({ error: "Enter a valid email address or phone number." }, { status: 400, headers });
    if (identity.kind === "phone" && !smsConfigured()) return NextResponse.json({ error: "Use an email address; text verification is not configured." }, { status: 400, headers });
    if (body.brand !== "kosher" && body.brand !== "itineraries") return NextResponse.json({ error: "Choose one of the two websites." }, { status: 400, headers });
    if (await getAccountRecord(identity.value)) return NextResponse.json({ error: "This account already exists. They can log in." }, { status: 409, headers });
    const result = await createAccountInvitation(identity.value, owner);
    const link = `${BRAND_ORIGIN[body.brand]}/join#invite=${result.token}`;
    return NextResponse.json({ ok: true, invitation: result.invitation, link }, { headers });
  } catch { return NextResponse.json({ error: "The invitation could not be saved. Please try again." }, { status: 503, headers }); }
}
