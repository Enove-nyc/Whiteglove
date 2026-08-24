import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  accountCookieName,
  getAccountRecord,
  getCurrentAccountData,
  inviteTeamMember,
  listTeamMembers,
  removeTeamMember,
} from "@/lib/account-store";
import { limitsFor, mayServeCompanionClients } from "@/lib/account-limits";
import { getLimitOverrides } from "@/lib/account-limits-store";
import { getPlan } from "@/lib/account-plan-store";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * A Business account's own staff — see data/team.ts and
 * lib/account-store.ts's invite/accept/remove functions.
 *
 * OWNER ONLY. A staff login sees the same trips, pipeline and library the
 * owner does (every other /api/account/* route resolves through
 * resolveBusinessOwner), but managing WHO is on the team — inviting,
 * removing — stays with the one account the subscription is actually on.
 * Checked by reading the signed-in identity's OWN record directly, never
 * resolved through resolveBusinessOwner the way business data is: this is
 * the one place that must tell an owner and a member apart rather than
 * treat them the same.
 */
async function ownerEmail(): Promise<{ email: string } | { error: string; status: number }> {
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  if (!account?.email) return { error: "Please log in first.", status: 401 };
  const record = await getAccountRecord(account.email);
  if (record?.teamOwnerEmail) return { error: "Only the account owner manages the team.", status: 403 };
  if (!mayServeCompanionClients(await getPlan(account.email))) {
    return { error: "A team is part of a Business account.", status: 403 };
  }
  return { email: account.email };
}

export async function GET() {
  const who = await ownerEmail();
  if ("error" in who) return NextResponse.json({ error: who.error }, { status: who.status });
  const [team, overrides] = await Promise.all([listTeamMembers(who.email), getLimitOverrides()]);
  const limits = limitsFor(await getPlan(who.email), overrides);
  return NextResponse.json({ team, staffSeats: limits.staffSeats });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const who = await ownerEmail();
  if ("error" in who) return NextResponse.json({ error: who.error }, { status: who.status });

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim();
  if (!email) return NextResponse.json({ error: "Enter an email address or a phone number." }, { status: 400 });

  const result = await inviteTeamMember(who.email, email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, joinPath: `/team/join/${result.token}` });
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const who = await ownerEmail();
  if ("error" in who) return NextResponse.json({ error: who.error }, { status: who.status });

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim();
  if (!email) return NextResponse.json({ error: "Which person?" }, { status: 400 });

  const result = await removeTeamMember(who.email, email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
