import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  accountCookieName,
  createTrip,
  deleteTrip,
  duplicateTrip,
  getCurrentAccountData,
  getTrips,
  importTrip,
  renameTrip,
  setTripClient,
  switchTrip,
} from "@/lib/account-store";
import { mayBrandOwnItinerary } from "@/lib/account-limits";
import { getPlan } from "@/lib/account-plan-store";
import { sameOrigin } from "@/lib/secure-access";
import type { Itinerary } from "@/data/itinerary";

export const dynamic = "force-dynamic";

async function signedInEmail() {
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  return account?.email ?? null;
}

export async function GET() {
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const trips = await getTrips(email);
  return NextResponse.json({ trips, activeId: trips.find((t) => t.active)?.id ?? null });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { action?: string; id?: string; name?: string; client?: string; itinerary?: Itinerary }
    | null;

  switch (body?.action) {
    case "create": {
      const result = await createTrip(email, body.name);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "import": {
      // Adding a shared trip. It becomes a trip of its own; nothing already in
      // the account is touched.
      if (!body.itinerary) return NextResponse.json({ ok: false, error: "Nothing to add." }, { status: 400 });
      const result = await importTrip(email, body.itinerary, body.name);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "rename": {
      if (!body.id) return NextResponse.json({ ok: false, error: "Name the trip." }, { status: 400 });
      const result = await renameTrip(email, body.id, body.name ?? "");
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "switch": {
      if (!body.id) return NextResponse.json({ ok: false, error: "Name the trip." }, { status: 400 });
      const result = await switchTrip(email, body.id);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "client": {
      // Saying who a trip is for is part of a Business account — it exists for
      // somebody planning on other people's behalf, and it is the name that
      // goes on the document their client is handed. Checked here rather than
      // only in the panel, because a hidden field is not a closed door.
      if (!body.id) return NextResponse.json({ ok: false, error: "Name the trip." }, { status: 400 });
      if (!mayBrandOwnItinerary(await getPlan(email))) {
        return NextResponse.json(
          { ok: false, error: "Planning trips for named clients is part of a Business account." },
          { status: 403 },
        );
      }
      const result = await setTripClient(email, body.id, body.client ?? "");
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "duplicate": {
      if (!body.id) return NextResponse.json({ ok: false, error: "Name the trip." }, { status: 400 });
      const result = await duplicateTrip(email, body.id);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "delete": {
      if (!body.id) return NextResponse.json({ ok: false, error: "Name the trip." }, { status: 400 });
      const result = await deleteTrip(email, body.id);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    default:
      return NextResponse.json({ ok: false, error: "Say what to do with the trip." }, { status: 400 });
  }
}
