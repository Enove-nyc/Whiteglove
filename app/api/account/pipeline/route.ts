import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getAccountData, getCurrentAccountData, resolveBusinessOwner, savePipelineStage, withTrips } from "@/lib/account-store";
import { getPlan } from "@/lib/account-plan-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { readChat, readMarkers } from "@/lib/companion-chat-store";
import { needsAttention, tripStage, type ManualTripStage, type TripStage } from "@/data/trip-pipeline";
import { hasBalance, outstandingCents } from "@/data/trip-payments";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

export type PipelineRow = {
  id: string;
  name: string;
  client: string;
  advisor: string;
  startDate: string;
  endDate: string;
  stage: TripStage;
  needsAttention: boolean;
  shareId?: string;
  /** True when the client's last word in the thread hasn't been read yet. */
  unread: boolean;
  /** Absent when no balance has been set up. Zero once it's fully paid. */
  outstandingCents?: number;
  currency?: string;
  updatedAt: string;
};

/**
 * The planner's whole business, one row per trip/client — the Planner CRM /
 * Trip Pipeline. Reads things that already exist rather than keeping copies
 * in sync with them: each trip's own proposal status, its own dates, its
 * chat thread's read marker (lib/companion-chat-store.ts, the same one the
 * advisor inbox already reads), and its own payment balance
 * (data/trip-payments.ts) — the same balance /payments shows, not a second
 * number kept alongside it. BUSINESS-ONLY, same door as the client inbox and
 * the proposal/library/form pages — a Gold account has the app for its own
 * trips and no clients to run a pipeline of.
 */
export async function GET() {
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  if (!account?.email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  // A staff login works against the business it's linked to, not its own
  // (otherwise empty) account — see lib/account-store.ts's resolveBusinessOwner.
  // An account with no team just resolves to itself, same as always.
  const owner = await resolveBusinessOwner(account.email);
  if (!mayServeCompanionClients(await getPlan(owner))) {
    return NextResponse.json({ error: "The trip pipeline is part of a Business account." }, { status: 403 });
  }

  const data = await getAccountData(owner);
  const { trips } = withTrips(data);
  const today = new Date().toISOString().slice(0, 10);

  const rows: PipelineRow[] = await Promise.all(
    trips.map(async (t) => {
      let unread = false;
      if (t.shareId) {
        const [messages, markers] = await Promise.all([readChat(t.shareId), readMarkers(t.shareId)]);
        const last = messages[messages.length - 1];
        unread = Boolean(last && last.from === "client" && (!markers.advisor || last.at > markers.advisor));
      }
      return {
        id: t.id,
        name: t.name,
        client: t.client?.trim() ?? "",
        advisor: t.advisor?.trim() ?? "",
        startDate: t.itinerary?.startDate ?? "",
        endDate: t.itinerary?.endDate ?? "",
        stage: tripStage(
          { pipelineStage: t.pipelineStage, proposal: t.proposal, startDate: t.itinerary?.startDate, endDate: t.itinerary?.endDate },
          today,
        ),
        needsAttention: needsAttention(t.proposal),
        shareId: t.shareId,
        unread,
        outstandingCents: t.balance && hasBalance(t.balance) ? outstandingCents(t.balance) : undefined,
        currency: t.balance?.currency,
        updatedAt: t.updatedAt,
      };
    }),
  );

  return NextResponse.json({ rows, today });
}

/** Move a trip between "Inquiry" and "Planning" — the only stage a planner sets by hand. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  if (!account?.email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const owner = await resolveBusinessOwner(account.email);
  if (!mayServeCompanionClients(await getPlan(owner))) {
    return NextResponse.json({ error: "The trip pipeline is part of a Business account." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { tripId?: string; stage?: string } | null;
  const tripId = body?.tripId?.trim();
  const stage = body?.stage;
  if (!tripId || (stage !== "inquiry" && stage !== "planning")) {
    return NextResponse.json({ error: "Provide a trip and either inquiry or planning." }, { status: 400 });
  }
  const ok = await savePipelineStage(owner, tripId, stage as ManualTripStage);
  if (!ok) return NextResponse.json({ error: "Could not save that." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
