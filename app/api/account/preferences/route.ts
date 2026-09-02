import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { describeForAssistant } from "@/data/travel-preferences";
import { accountCookieName, getCurrentAccountData } from "@/lib/account-store";
import { sameOrigin } from "@/lib/secure-access";
import {
  forgetTravelPreferences,
  getTravelPreferences,
  saveTravelPreferences,
  travelPreferencesStoreAvailable,
} from "@/lib/travel-preferences-store";

export const dynamic = "force-dynamic";

/**
 * The traveller's own preferences — theirs to read, change and delete.
 *
 * OPEN TO ANY SIGNED-IN ACCOUNT, including the free one. This is the whole
 * point of having an account at all on this site, so it is not behind a plan.
 *
 * THE GET HANDS BACK `assistantSees` AS WELL AS THE VALUES. That string is the
 * exact text an assistant would be given, and it is shown to the traveller on
 * the same screen. Somebody who can read what the model is told has no reason
 * to wonder, which is the difference between a memory and a rumour.
 */
async function who(): Promise<string> {
  const account = await getCurrentAccountData((await cookies()).get(accountCookieName())?.value);
  return account?.email ?? "";
}

export async function GET() {
  const email = await who();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const preferences = await getTravelPreferences(email);
  return NextResponse.json({
    preferences,
    assistantSees: describeForAssistant(preferences),
    ready: travelPreferencesStoreAvailable(),
  });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await who();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  if (!travelPreferencesStoreAvailable()) {
    return NextResponse.json({ error: "The private store isn't connected." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { action?: unknown; preferences?: unknown } | null;

  if (body?.action === "forget") {
    const ok = await forgetTravelPreferences(email);
    return NextResponse.json({ ok }, { status: ok ? 200 : 503 });
  }

  // Everything in `preferences` is checked against the known lists before it is
  // stored — see cleanPreferences. A value that is not one of the options is
  // dropped rather than saved, so nothing typed here can become an instruction
  // in a model's prompt.
  const saved = await saveTravelPreferences(email, body?.preferences);
  if (!saved) return NextResponse.json({ error: "Could not save that just now." }, { status: 503 });
  return NextResponse.json({ ok: true, preferences: saved, assistantSees: describeForAssistant(saved) });
}
