import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData } from "@/lib/account-store";
import { getPlan } from "@/lib/account-plan-store";
import { mayUseCompanionApp } from "@/lib/account-limits";
import { getAppPrefs, setAppPrefs } from "@/lib/app-prefs-store";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

async function ownerEmail() {
  const cookie = (await cookies()).get(accountCookieName())?.value;
  return (await getCurrentAccountData(cookie))?.email ?? null;
}

export async function GET() {
  const email = await ownerEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  return NextResponse.json({ prefs: await getAppPrefs(email) });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await ownerEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  // The app's own settings — the same gate the app itself reads: a Gold
  // traveler carrying their own trip, or a Business account handing it out.
  if (!mayUseCompanionApp(await getPlan(email))) {
    return NextResponse.json({ error: "The app is part of a Gold or Business account." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { kosherFeatures?: unknown } | null;
  const ok = await setAppPrefs(email, { kosherFeatures: Boolean(body?.kosherFeatures) });
  if (!ok) return NextResponse.json({ error: "Could not save that." }, { status: 503 });
  return NextResponse.json({ prefs: await getAppPrefs(email) });
}
