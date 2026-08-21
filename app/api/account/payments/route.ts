import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData, getTripItinerary, getBalance, saveBalance } from "@/lib/account-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { getPlan } from "@/lib/account-plan-store";
import { sameOrigin } from "@/lib/secure-access";
import { getConnectAccount, saveConnectAccount } from "@/lib/stripe-connect-store";
import { canAcceptPayments, canConnectAccounts, createConnectAccount, onboardingLinkFor, refreshAccountStatus } from "@/lib/stripe-connect";
import { assignOpen, emptyTripBalance, splitEqually, type TripBalance } from "@/data/trip-payments";
import { emptyItinerary, unitsOf } from "@/data/itinerary";

export const dynamic = "force-dynamic";

async function signedInEmail() {
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  return account?.email ?? null;
}

/**
 * The planner's own side of Payments: connecting a Stripe account, and
 * setting up one trip's balance and split. BUSINESS ONLY, the same gate as
 * every other client-facing feature — a trip balance exists to be paid by
 * somebody else. The public side a traveler actually pays from is a separate
 * route (app/api/pay/[shareId]/route.ts) and never reads a planner's own
 * connected-account details beyond the one destination id it needs.
 */
export async function GET(request: NextRequest) {
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const wanted = request.nextUrl.searchParams.get("trip") ?? undefined;
  const trip = await getTripItinerary(email, wanted);
  const [connect, balance] = await Promise.all([
    getConnectAccount(email),
    trip ? getBalance(email, trip.tripId) : Promise.resolve(null),
  ]);
  return NextResponse.json({
    canConnect: canConnectAccounts(),
    canAcceptPayments: canAcceptPayments(),
    connect,
    tripId: trip?.tripId ?? null,
    tripName: trip?.tripName || trip?.itinerary.title || "",
    units: trip ? unitsOf({ ...emptyItinerary(), ...trip.itinerary }) : [],
    balance,
  });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  if (!mayServeCompanionClients(await getPlan(email))) {
    return NextResponse.json({ ok: false, error: "Taking payment on a trip is part of a Business account." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        action?: string;
        tripId?: string;
        totalCents?: number;
        splitMode?: TripBalance["splitMode"];
        assignments?: TripBalance["assignments"];
        schedule?: TripBalance["schedule"];
        showTotalToTravelers?: boolean;
        origin?: string;
      }
    | null;

  switch (body?.action) {
    case "connect": {
      if (!canConnectAccounts()) {
        return NextResponse.json({ ok: false, error: "Payments aren't configured on this deployment yet." }, { status: 503 });
      }
      let connect = await getConnectAccount(email);
      if (!connect) {
        const created = await createConnectAccount(email);
        if ("error" in created) return NextResponse.json({ ok: false, error: created.error }, { status: 502 });
        const saved = await saveConnectAccount(email, { accountId: created.accountId });
        if (!saved) return NextResponse.json({ ok: false, error: "Could not save the connected account." }, { status: 503 });
        connect = await getConnectAccount(email);
      }
      if (!connect) return NextResponse.json({ ok: false, error: "Could not create a connected account." }, { status: 503 });
      const origin = body.origin?.trim() || new URL(request.url).origin;
      const link = await onboardingLinkFor(connect.accountId, `${origin}/payments`, `${origin}/payments`);
      if ("error" in link) return NextResponse.json({ ok: false, error: link.error }, { status: 502 });
      return NextResponse.json({ ok: true, url: link.url });
    }
    case "refresh-status": {
      const connect = await getConnectAccount(email);
      if (!connect) return NextResponse.json({ ok: false, error: "Nothing connected yet." }, { status: 400 });
      const status = await refreshAccountStatus(connect.accountId);
      if (!status) return NextResponse.json({ ok: false, error: "Could not reach Stripe." }, { status: 502 });
      await saveConnectAccount(email, status);
      return NextResponse.json({ ok: true, connect: await getConnectAccount(email) });
    }
    case "save-balance": {
      const tripId = body.tripId;
      if (!tripId) return NextResponse.json({ ok: false, error: "Which trip?" }, { status: 400 });
      const trip = await getTripItinerary(email, tripId);
      if (!trip) return NextResponse.json({ ok: false, error: "Trip not found." }, { status: 404 });
      const existing = (await getBalance(email, tripId)) ?? emptyTripBalance();
      const totalCents = typeof body.totalCents === "number" && body.totalCents >= 0 ? Math.round(body.totalCents) : existing.totalCents;
      const splitMode = body.splitMode ?? existing.splitMode;
      let assignments = existing.assignments;
      if (Array.isArray(body.assignments)) {
        assignments = body.assignments
          .filter((a) => a && typeof a.unitKey === "string" && typeof a.amountCents === "number" && a.amountCents >= 0)
          .map((a) => ({ unitKey: a.unitKey, label: String(a.label ?? a.unitKey).slice(0, 120), amountCents: Math.round(a.amountCents) }));
      } else if (splitMode === "equal" && typeof totalCents === "number") {
        assignments = splitEqually(totalCents, unitsOf({ ...emptyItinerary(), ...trip.itinerary }));
      } else if (splitMode === "open" && typeof totalCents === "number") {
        assignments = assignOpen(totalCents);
      }
      const schedule = Array.isArray(body.schedule)
        ? body.schedule
            .filter((s) => s && typeof s.label === "string" && typeof s.amountCents === "number")
            .map((s) => ({ id: s.id || `sched-${Math.random().toString(36).slice(2)}`, label: s.label.slice(0, 80), amountCents: Math.round(s.amountCents), dueDate: s.dueDate }))
        : existing.schedule;
      const next: TripBalance = {
        ...existing,
        totalCents,
        currency: existing.currency || "USD",
        splitMode,
        assignments,
        schedule,
        showTotalToTravelers: typeof body.showTotalToTravelers === "boolean" ? body.showTotalToTravelers : existing.showTotalToTravelers,
      };
      const ok = await saveBalance(email, tripId, next);
      if (!ok) return NextResponse.json({ ok: false, error: "Could not save the balance." }, { status: 503 });
      return NextResponse.json({ ok: true, balance: next });
    }
    default:
      return NextResponse.json({ ok: false, error: "Say what to do with payments." }, { status: 400 });
  }
}
