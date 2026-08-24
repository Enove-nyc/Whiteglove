import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData, getCurrentAccountSummary, readSessionEmail } from "@/lib/account-store";
import { getPlan } from "@/lib/account-plan-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(accountCookieName())?.value;
  // A valid signed session is the source of truth for "signed in", separate
  // from whether the saved record can be read this moment.
  const sessionEmail = readSessionEmail(cookie);
  const summary = await getCurrentAccountSummary(cookie);
  const account = await getCurrentAccountData(cookie);
  // On a paid tier (Gold or Business), however they came by it. The header
  // reads this to turn the hand in the logo gold for the member — a quiet mark
  // of a paid account, seen only in their own view.
  const who = summary?.email || sessionEmail || "";
  const paid = who ? (await getPlan(who).catch(() => "traveler")) !== "traveler" : false;
  return NextResponse.json(
    {
      signedIn: Boolean(sessionEmail),
      sessionEmail,
      account: summary,
      data: account?.data ?? null,
      paid,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
