import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData } from "@/lib/account-store";
import { setPlan } from "@/lib/account-plan-store";
import { agencyIdFor, deleteInvite, readAgency, readInvite, setAccountAgency, writeAgency } from "@/lib/agency-store";
import { identityKey } from "@/lib/identity";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * Accepting an agency invite.
 *
 * A POST, DELIBERATELY, NEVER A GET. The link in the email is a page that
 * shows who invited them and asks them to press a button — a bare GET here
 * would let a link-preview crawler consume the invite before the person it
 * was for ever saw it. See app/agency/join/page.tsx.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  if (!account) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = String(body?.token ?? "").trim();
  if (!token) return NextResponse.json({ error: "No invite named." }, { status: 400 });

  const invite = await readInvite(token);
  if (!invite) return NextResponse.json({ error: "That invite could not be found." }, { status: 404 });
  if (Date.parse(invite.expiresAt) < Date.now()) {
    await deleteInvite(invite);
    return NextResponse.json({ error: "That invite has expired. Ask for a new one." }, { status: 410 });
  }
  if (identityKey(invite.email) !== identityKey(account.email)) {
    return NextResponse.json(
      { error: `This invite was sent to a different address. Sign in as ${invite.email} to accept it.` },
      { status: 403 },
    );
  }

  const agency = await readAgency(invite.agencyId);
  if (!agency) {
    await deleteInvite(invite);
    return NextResponse.json({ error: "That agency could not be found." }, { status: 404 });
  }

  const existingAgencyId = await agencyIdFor(account.email);
  if (existingAgencyId && existingAgencyId !== agency.id) {
    return NextResponse.json({ error: "You already belong to a different agency. Leave it first." }, { status: 409 });
  }

  if (existingAgencyId === agency.id) {
    // Already a member — the invite arrived twice, or was accepted already
    // and clicked again. Consuming it quietly is the honest answer: nothing
    // is wrong, there is simply nothing left to do.
    await deleteInvite(invite);
    return NextResponse.json({ ok: true });
  }

  if (agency.members.length >= agency.seatsPurchased) {
    return NextResponse.json({ error: "This agency has no free seat right now — ask for one to be added." }, { status: 409 });
  }

  // Read again, right here, right before writing. Two people accepting the
  // last open seat within the same instant would both pass the check above
  // against the same stale snapshot; re-reading narrows that window from the
  // whole request down to one read and one write. It does not close it
  // completely — Upstash's REST API has no compare-and-swap primitive to do
  // that without a second counter kept in sync with the members list by
  // hand, which trades a rare double-accept for a permanent risk of drift.
  const fresh = await readAgency(agency.id);
  if (!fresh) return NextResponse.json({ error: "That agency could not be found." }, { status: 404 });
  if (fresh.members.some((m) => identityKey(m.account) === identityKey(account.email))) {
    await deleteInvite(invite);
    return NextResponse.json({ ok: true });
  }
  if (fresh.members.length >= fresh.seatsPurchased) {
    return NextResponse.json({ error: "This agency has no free seat right now — ask for one to be added." }, { status: 409 });
  }

  const next = {
    ...fresh,
    members: [...fresh.members, { account: account.email, role: "advisor" as const, joinedAt: new Date().toISOString() }],
    updatedAt: new Date().toISOString(),
  };
  if (!(await writeAgency(next))) {
    return NextResponse.json({ error: "That could not be saved. Try again." }, { status: 503 });
  }
  await setAccountAgency(account.email, agency.id);
  await setPlan(account.email, "pro", `Joined via agency invite from ${invite.invitedBy}`);
  await deleteInvite(invite);

  return NextResponse.json({ ok: true });
}
