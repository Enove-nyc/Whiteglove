import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData, getCurrentAccountSummary, readSessionEmail } from "@/lib/account-store";
import { planOf } from "@/lib/account-plans";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(accountCookieName())?.value;
  // A valid signed session is the source of truth for "signed in", separate
  // from whether the saved record can be read this moment.
  const sessionEmail = readSessionEmail(cookie);
  const summary = await getCurrentAccountSummary(cookie);
  const account = await getCurrentAccountData(cookie);
  // The advisor-tool links in AccountMenu need this to know which ones to
  // show — read off the record already fetched above rather than a second
  // round-trip through the plan store.
  const plan = planOf(account?.record);
  // On any paid plan, however they came by it. The header reads this to turn
  // the hand in the logo gold for the member — a quiet mark of a paid
  // account, seen only in their own view.
  const paid = plan !== "free";
  return NextResponse.json(
    {
      signedIn: Boolean(sessionEmail),
      sessionEmail,
      account: summary,
      data: account?.data ?? null,
      plan,
      paid,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
