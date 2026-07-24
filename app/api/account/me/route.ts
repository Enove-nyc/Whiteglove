import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData, getCurrentAccountSummary } from "@/lib/account-store";

export async function GET() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(accountCookieName())?.value;
  const summary = await getCurrentAccountSummary(cookie);
  const account = await getCurrentAccountData(cookie);
  return NextResponse.json({ account: summary, data: account?.data ?? null });
}
