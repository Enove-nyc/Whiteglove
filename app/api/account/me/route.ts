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
  return NextResponse.json(
    {
      signedIn: Boolean(sessionEmail),
      sessionEmail,
      account: summary,
      data: account?.data ?? null,
      // The advisor-tool links in AccountMenu need this to know which ones to
      // show — piggybacked here rather than a second round-trip, since this
      // route already reads the full record to build `account` above.
      plan: planOf(account?.record),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
