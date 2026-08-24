import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData } from "@/lib/account-store";
import { getPlan, setPlan } from "@/lib/account-plan-store";
import { agencyIdFor, deleteInvite, readAgency, readInvite, setAccountAgency, writeAgency } from "@/lib/agency-store";
import { identityKey } from "@/lib/identity";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * Link this account to the agency and grant it Pro — the two things being on
 * the roster is supposed to mean. Called both the first time somebody joins
 * AND every time an already-member hits this route again (the invite arrived
 * twice, or was clicked twice): the roster write is what actually reserves
 * the seat, so a retry after THIS step failed would otherwise take the
 * "already a member" fast path and never come back to finish the job. Both
 * setters are themselves idempotent, so re-running them on somebody already
 * fully set up changes nothing.
 */
async function ensureMembership(accountEmail: string, agencyId: string, invitedBy: string): Promise<boolean> {
  const linked = await setAccountAgency(accountEmail, agencyId);
  const planned = await setPlan(accountEmail, "pro", `Joined via agency invite from ${invitedBy}`);
  if (!linked || !planned) {
    console.error(`[agency] ${accountEmail} is on ${agencyId}'s roster but not fully set up (linked=${linked}, plan=${planned})`);
  }
  return linked && planned;
}

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

  // The owner's own Advisor Pro is what this agency runs on. inviteProblem
  // (app/api/account/agency/route.ts) already refuses a NEW invite once that
  // has lapsed, and the billing webhook clears open invites the moment it
  // does — but a token issued before either of those ran, or one cleanup
  // simply hasn't reached yet, is still a valid-looking invite. Checked
  // fresh here rather than trusted from either of those, since accepting one
  // is the one place that would actually mint an unpaid Pro account.
  if ((await getPlan(agency.owner)) !== "pro") {
    return NextResponse.json(
      { error: "This agency's Advisor Pro subscription has ended — the owner needs to resubscribe before anybody can join." },
      { status: 403 },
    );
  }

  const existingAgencyId = await agencyIdFor(account.email);
  if (existingAgencyId && existingAgencyId !== agency.id) {
    return NextResponse.json({ error: "You already belong to a different agency. Leave it first." }, { status: 409 });
  }

  if (existingAgencyId === agency.id) {
    // Already a member — the invite arrived twice, or was accepted already
    // and clicked again. Re-run the membership setters rather than trusting
    // they succeeded the first time: if THIS is the retry after they failed
    // partway, this fast path is the only place left that would ever finish
    // the job.
    await ensureMembership(account.email, agency.id, invite.invitedBy);
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
    await ensureMembership(account.email, agency.id, invite.invitedBy);
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
  // The roster write above is what actually reserves the seat, so from here
  // on the invite is spent either way: leaving it live would let a second
  // click reserve a SECOND seat for the same person. If linking the account
  // or granting the plan below fails, ensureMembership logs it — the "already
  // a member" fast path above is what finishes the job on a retry.
  await ensureMembership(account.email, agency.id, invite.invitedBy);
  await deleteInvite(invite);

  return NextResponse.json({ ok: true });
}
