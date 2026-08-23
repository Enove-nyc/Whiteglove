import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getAccountData, getCurrentAccountData, savePipelineStage, withTrips } from "@/lib/account-store";
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
  updatedAt: string;
  /** What this trip still owes, when a balance has actually been set up. */
  outstandingCents?: number;
  currency?: string;
};

/**
 * The planner's whole business, one row per trip/client — the Planner CRM /
 * Trip Pipeline. Reads three things that already exist rather than keeping a
 * fourth in sync with them: each trip's own proposal status, its own dates,
 * and its chat thread's read marker (lib/companion-chat-store.ts, the same
 * one the advisor inbox already reads). BUSINESS-ONLY, same door as the
 * client inbox and the proposal/library/form pages — a Gold account has the
 * app for its own trips and no clients to run a pipeline of.
 */
export async function GET() {
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  if (!account?.email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  if (!mayServeCompanionClients(await getPlan(account.email))) {
    return NextResponse.json({ error: "The trip pipeline is part of a Business account." }, { status: 403 });
  }

  const data = await getAccountData(account.email);
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
        updatedAt: t.updatedAt,
        ...(t.balance && hasBalance(t.balance) ? { outstandingCents: outstandingCents(t.balance), currency: t.balance.currency } : {}),
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
  if (!mayServeCompanionClients(await getPlan(account.email))) {
    return NextResponse.json({ error: "The trip pipeline is part of a Business account." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { tripId?: string; stage?: string } | null;
  const tripId = body?.tripId?.trim();
  const stage = body?.stage;
  if (!tripId || (stage !== "inquiry" && stage !== "planning")) {
    return NextResponse.json({ error: "Provide a trip and either inquiry or planning." }, { status: 400 });
  }
  const ok = await savePipelineStage(account.email, tripId, stage as ManualTripStage);
  if (!ok) return NextResponse.json({ error: "Could not save that." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
