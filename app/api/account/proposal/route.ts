import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  accountCookieName,
  convertProposalToItinerary,
  ensureProposalShare,
  getCurrentAccountData,
  getProposal,
  getTripItinerary,
  saveProposal,
} from "@/lib/account-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { PLAN_LABELS } from "@/lib/account-plans";
import { getPlan } from "@/lib/account-plan-store";
import { sameOrigin } from "@/lib/secure-access";
import type { Proposal } from "@/data/proposal";

export const dynamic = "force-dynamic";

/**
 * The planner's own side of a proposal — reading and editing it, sending it,
 * and converting the approved option into the trip's real itinerary.
 *
 * ADVISOR STARTER AND UP, the same gate as handing a trip to a client at all
 * (mayServeCompanionClients) — a proposal exists to be sent to somebody
 * else, which is exactly what that entitlement already means. The public
 * side a client actually opens is a separate route, and reads nothing here.
 */

async function signedInEmail() {
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  return account?.email ?? null;
}

export async function GET(request: NextRequest) {
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  // No ?trip= means "whichever trip is open" — the same default the
  // itinerary route itself falls back to, so this reads the same trip the
  // builder is showing without the caller having to already know its id.
  const wanted = request.nextUrl.searchParams.get("trip") ?? undefined;
  const trip = await getTripItinerary(email, wanted);
  if (!trip) return NextResponse.json({ error: "No trip to build a proposal for yet." }, { status: 404 });
  const proposal = await getProposal(email, trip.tripId);
  return NextResponse.json({ proposal, tripId: trip.tripId, tripName: trip.tripName || trip.itinerary.title });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { action?: string; tripId?: string; proposal?: Proposal }
    | null;
  const tripId = body?.tripId;
  if (!tripId) return NextResponse.json({ ok: false, error: "Which trip?" }, { status: 400 });

  if (!mayServeCompanionClients(await getPlan(email))) {
    return NextResponse.json(
      { ok: false, error: `Sending a proposal to a client is part of ${PLAN_LABELS.starter} and up.` },
      { status: 403 },
    );
  }

  switch (body?.action) {
    case "save": {
      if (!body.proposal) return NextResponse.json({ ok: false, error: "Nothing to save." }, { status: 400 });
      const ok = await saveProposal(email, tripId, body.proposal);
      if (!ok) return NextResponse.json({ ok: false, error: "Could not save the proposal." }, { status: 503 });
      const proposal = await getProposal(email, tripId);
      return NextResponse.json({ ok: true, proposal });
    }
    case "send": {
      const current = await getProposal(email, tripId);
      if (!current || current.options.length === 0) {
        return NextResponse.json({ ok: false, error: "Add at least one option before sending." }, { status: 400 });
      }
      const shareId = await ensureProposalShare(email, tripId);
      if (!shareId) return NextResponse.json({ ok: false, error: "Could not create the link." }, { status: 503 });
      const now = new Date().toISOString();
      const sent: Proposal = { ...current, status: "sent", sentAt: now, updatedAt: now };
      const ok = await saveProposal(email, tripId, sent);
      if (!ok) return NextResponse.json({ ok: false, error: "Could not save the proposal." }, { status: 503 });
      return NextResponse.json({ ok: true, proposal: sent, shareId });
    }
    case "share": {
      const shareId = await ensureProposalShare(email, tripId);
      if (!shareId) return NextResponse.json({ ok: false, error: "Could not create the link." }, { status: 503 });
      return NextResponse.json({ ok: true, shareId });
    }
    case "convert": {
      const ok = await convertProposalToItinerary(email, tripId);
      if (!ok) {
        return NextResponse.json(
          { ok: false, error: "Nothing is selected yet — the client needs to pick an option first." },
          { status: 400 },
        );
      }
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ ok: false, error: "Say what to do with the proposal." }, { status: 400 });
  }
}
