import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, acceptTeamInvite, getCurrentAccountData } from "@/lib/account-store";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * Accept a staff invite — see app/team/join/[token]/page.tsx, the only page
 * that calls this. The SIGNED-IN account is the one linked, never anything
 * the request body could claim; see lib/account-store.ts's
 * acceptTeamInvite for why that is safe even though the invite named a
 * specific email when it was sent.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  if (!account?.email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim();
  if (!token) return NextResponse.json({ error: "That invite link looks incomplete." }, { status: 400 });

  const result = await acceptTeamInvite(token, account.email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
