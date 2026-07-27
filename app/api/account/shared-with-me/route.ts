import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData, listSharedWithMe } from "@/lib/account-store";

export const dynamic = "force-dynamic";

// Trips other people have shared with the signed-in traveler.
export async function GET() {
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  if (!account) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const trips = await listSharedWithMe(account.email);
  return NextResponse.json({ trips });
}
