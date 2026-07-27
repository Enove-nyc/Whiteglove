import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Look up a real flight by its number + date so the itinerary planner can
// auto-fill the airline, airports, and times. Backed by AeroDataBox (free tier
// via RapidAPI). We never fabricate flight details: without a key, or when the
// flight is not found, we say so and return nothing to fill.

type AdbAirport = { iata?: string; icao?: string; name?: string; shortName?: string };
type AdbTime = { local?: string; utc?: string };
type AdbEndpoint = { airport?: AdbAirport; scheduledTime?: AdbTime; terminal?: string };
type AdbFlight = {
  number?: string;
  airline?: { name?: string; iata?: string };
  departure?: AdbEndpoint;
  arrival?: AdbEndpoint;
};

// AeroDataBox local times look like "2024-05-02 00:50+03:00".
function splitLocal(local?: string): { date: string; time: string } | null {
  if (!local || local.length < 16) return null;
  const date = local.slice(0, 10);
  const time = local.slice(11, 16);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  return { date, time };
}

const airportLabel = (a?: AdbAirport) => a?.iata || a?.icao || a?.shortName || a?.name || "";

export async function POST(request: Request) {
  const key = process.env.AERODATABOX_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({
      available: false,
      reason: "Flight lookup is off. Add a free AERODATABOX_API_KEY (RapidAPI) in the site settings to enable it.",
    });
  }

  const body = (await request.json().catch(() => null)) as { flightNumber?: string; date?: string } | null;
  const flightNumber = String(body?.flightNumber || "").toUpperCase().replace(/\s+/g, "");
  const date = String(body?.date || "").trim();
  if (!/^[A-Z0-9]{3,8}$/.test(flightNumber)) {
    return NextResponse.json({ available: false, reason: "Enter a flight number like LY1 or BA2490." });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ available: false, reason: "Choose the flight date first." });
  }

  try {
    const res = await fetch(
      `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(flightNumber)}/${encodeURIComponent(date)}?withAircraftImage=false&withLocation=false`,
      { headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com" }, cache: "no-store" },
    );
    if (res.status === 204 || res.status === 404) {
      return NextResponse.json({ available: false, reason: `No flight ${flightNumber} found on ${date}. Check the number and date.` });
    }
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ available: false, reason: "The flight-lookup key was rejected. Check AERODATABOX_API_KEY." });
    }
    if (res.status === 429) {
      return NextResponse.json({ available: false, reason: "Flight lookups are rate-limited right now — try again in a minute, or enter the details by hand." });
    }
    if (!res.ok) {
      return NextResponse.json({ available: false, reason: `Flight lookup returned HTTP ${res.status}.` });
    }

    const data = (await res.json().catch(() => null)) as AdbFlight[] | AdbFlight | null;
    const list = Array.isArray(data) ? data : data ? [data] : [];
    // Prefer a leg whose departure is on the requested date.
    const chosen = list.find((f) => splitLocal(f.departure?.scheduledTime?.local)?.date === date) ?? list[0];
    if (!chosen) {
      return NextResponse.json({ available: false, reason: `No flight ${flightNumber} found on ${date}. Check the number and date.` });
    }

    const dep = splitLocal(chosen.departure?.scheduledTime?.local);
    const arr = splitLocal(chosen.arrival?.scheduledTime?.local);
    const flight = {
      airline: chosen.airline?.name || "",
      flightNo: (chosen.number || flightNumber).replace(/\s+/g, ""),
      from: airportLabel(chosen.departure?.airport),
      to: airportLabel(chosen.arrival?.airport),
      date: dep?.date || date,
      departTime: dep?.time || "",
      arriveTime: arr?.time || "",
      // Only a red-eye (lands on a later date) sets arriveDate.
      arriveDate: arr && dep && arr.date > dep.date ? arr.date : "",
    };
    return NextResponse.json({ available: true, flight, moreResults: Math.max(0, list.length - 1) });
  } catch {
    return NextResponse.json({ available: false, reason: "Could not reach the flight-lookup service." });
  }
}
