import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  accountCookieName,
  ensureFormShare,
  getCurrentAccountData,
  getFormResponses,
  getFormTemplate,
  getTripItinerary,
  resolveBusinessOwner,
  saveFormTemplate,
} from "@/lib/account-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { PLAN_LABELS } from "@/lib/account-plans";
import { getPlan } from "@/lib/account-plan-store";
import { sameOrigin } from "@/lib/secure-access";
import type { ClientFormTemplate } from "@/data/client-form";

export const dynamic = "force-dynamic";

/**
 * The planner's own side of a client's pre-trip form — building the
 * template, sending its link, and the only place the answers can be read
 * back. ADVISOR STARTER AND UP, the same gate as a proposal or the library.
 */

/** The business a staff login is linked to, or the account itself. */
async function signedInEmail() {
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  return account?.email ? resolveBusinessOwner(account.email) : null;
}

export async function GET(request: NextRequest) {
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const wanted = request.nextUrl.searchParams.get("trip") ?? undefined;
  const trip = await getTripItinerary(email, wanted);
  if (!trip) return NextResponse.json({ error: "No trip to build a form for yet." }, { status: 404 });
  const [template, responses] = await Promise.all([getFormTemplate(email, trip.tripId), getFormResponses(email, trip.tripId)]);
  return NextResponse.json({ template, responses, tripId: trip.tripId, tripName: trip.tripName || trip.itinerary.title });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  if (!mayServeCompanionClients(await getPlan(email))) {
    return NextResponse.json({ error: `A client form is part of ${PLAN_LABELS.starter} and up.` }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { action?: string; tripId?: string; template?: ClientFormTemplate }
    | null;
  const tripId = body?.tripId;
  if (!tripId) return NextResponse.json({ ok: false, error: "Which trip?" }, { status: 400 });

  switch (body?.action) {
    case "save": {
      if (!body.template) return NextResponse.json({ ok: false, error: "Nothing to save." }, { status: 400 });
      const ok = await saveFormTemplate(email, tripId, body.template);
      if (!ok) return NextResponse.json({ ok: false, error: "Could not save the form." }, { status: 503 });
      return NextResponse.json({ ok: true, template: await getFormTemplate(email, tripId) });
    }
    case "share": {
      const shareId = await ensureFormShare(email, tripId);
      if (!shareId) return NextResponse.json({ ok: false, error: "Could not create the link." }, { status: 503 });
      return NextResponse.json({ ok: true, shareId });
    }
    default:
      return NextResponse.json({ ok: false, error: "Say what to do with the form." }, { status: 400 });
  }
}
