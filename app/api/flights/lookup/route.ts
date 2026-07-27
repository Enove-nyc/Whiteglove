import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Look up a real flight by its number + date so the itinerary planner can
// auto-fill the airline, airports, and times. We never fabricate flight
// details: without a configured provider, or when the flight is not found,
// we say so and return nothing to fill.
//
// Two free providers are supported; whichever is configured is used.
//   1. Amadeus for Developers  (AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET)
//      — email sign-up, no RapidAPI, and its schedule API covers future dates.
//   2. AeroDataBox via RapidAPI (AERODATABOX_API_KEY).

type Flight = {
  airline: string;
  flightNo: string;
  from: string;
  to: string;
  date: string;
  departTime: string;
  arriveTime: string;
  arriveDate: string;
};
type LookupResult = { flight?: Flight; reason?: string; moreResults?: number };

// Parse "2024-05-02 00:50+03:00" or "2024-05-02T00:50:00+03:00" → date + HH:MM.
function parseLocal(value?: string): { date: string; time: string } | null {
  if (!value || value.length < 16) return null;
  const date = value.slice(0, 10);
  const time = value.slice(11, 16);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  return { date, time };
}

// Split "LY1" / "BA 2490" into carrier code + numeric part for Amadeus.
function splitFlightNumber(flightNumber: string): { carrierCode: string; number: string } | null {
  const m = /^([0-9A-Z]{2})\s*(\d{1,4})$/.exec(flightNumber);
  return m ? { carrierCode: m[1], number: m[2] } : null;
}

async function lookupAmadeus(flightNumber: string, date: string): Promise<LookupResult> {
  const clientId = process.env.AMADEUS_CLIENT_ID?.trim();
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET?.trim();
  const host = process.env.AMADEUS_HOSTNAME?.trim() || "test.api.amadeus.com";
  if (!clientId || !clientSecret) return { reason: "unconfigured" };

  const parts = splitFlightNumber(flightNumber);
  if (!parts) return { reason: "Enter a flight number like LY1 or BA2490." };

  const tokenRes = await fetch(`https://${host}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    cache: "no-store",
  });
  if (!tokenRes.ok) return { reason: "The flight-lookup key was rejected. Check AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET." };
  const token = ((await tokenRes.json().catch(() => null)) as { access_token?: string } | null)?.access_token;
  if (!token) return { reason: "The flight-lookup service did not return a token." };

  const res = await fetch(
    `https://${host}/v2/schedule/flights?carrierCode=${encodeURIComponent(parts.carrierCode)}&flightNumber=${encodeURIComponent(parts.number)}&scheduledDepartureDate=${encodeURIComponent(date)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (res.status === 429) return { reason: "Flight lookups are rate-limited right now — try again shortly, or enter the details by hand." };
  if (!res.ok) return { reason: `No flight ${flightNumber} found on ${date}. Check the number and date.` };

  type Timing = { value?: string };
  type Point = { iataCode?: string; departure?: { timings?: Timing[] }; arrival?: { timings?: Timing[] } };
  type Dated = { flightPoints?: Point[]; flightDesignator?: { carrierCode?: string; flightNumber?: number } };
  const data = ((await res.json().catch(() => null)) as { data?: Dated[] } | null)?.data ?? [];
  const dated = data[0];
  const points = dated?.flightPoints ?? [];
  const depPoint = points.find((p) => p.departure?.timings?.length);
  const arrPoint = points.find((p) => p.arrival?.timings?.length);
  if (!depPoint || !arrPoint) return { reason: `No flight ${flightNumber} found on ${date}. Check the number and date.` };

  const dep = parseLocal(depPoint.departure?.timings?.[0]?.value);
  const arr = parseLocal(arrPoint.arrival?.timings?.[0]?.value);
  return {
    flight: {
      airline: dated?.flightDesignator?.carrierCode || parts.carrierCode,
      flightNo: `${dated?.flightDesignator?.carrierCode || parts.carrierCode}${dated?.flightDesignator?.flightNumber ?? parts.number}`,
      from: depPoint.iataCode || "",
      to: arrPoint.iataCode || "",
      date: dep?.date || date,
      departTime: dep?.time || "",
      arriveTime: arr?.time || "",
      arriveDate: arr && dep && arr.date > dep.date ? arr.date : "",
    },
    moreResults: Math.max(0, data.length - 1),
  };
}

type AdbAirport = { iata?: string; icao?: string; name?: string; shortName?: string };
type AdbEndpoint = { airport?: AdbAirport; scheduledTime?: { local?: string } };
type AdbFlight = { number?: string; airline?: { name?: string }; departure?: AdbEndpoint; arrival?: AdbEndpoint };

async function lookupAeroDataBox(flightNumber: string, date: string): Promise<LookupResult> {
  const key = process.env.AERODATABOX_API_KEY?.trim();
  if (!key) return { reason: "unconfigured" };
  const res = await fetch(
    `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(flightNumber)}/${encodeURIComponent(date)}?withAircraftImage=false&withLocation=false`,
    { headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com" }, cache: "no-store" },
  );
  if (res.status === 204 || res.status === 404) return { reason: `No flight ${flightNumber} found on ${date}. Check the number and date.` };
  if (res.status === 401 || res.status === 403) return { reason: "The flight-lookup key was rejected. Check AERODATABOX_API_KEY." };
  if (res.status === 429) return { reason: "Flight lookups are rate-limited right now — try again shortly, or enter the details by hand." };
  if (!res.ok) return { reason: `Flight lookup returned HTTP ${res.status}.` };

  const raw = (await res.json().catch(() => null)) as AdbFlight[] | AdbFlight | null;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const chosen = list.find((f) => parseLocal(f.departure?.scheduledTime?.local)?.date === date) ?? list[0];
  if (!chosen) return { reason: `No flight ${flightNumber} found on ${date}. Check the number and date.` };
  const dep = parseLocal(chosen.departure?.scheduledTime?.local);
  const arr = parseLocal(chosen.arrival?.scheduledTime?.local);
  const label = (a?: AdbAirport) => a?.iata || a?.icao || a?.shortName || a?.name || "";
  return {
    flight: {
      airline: chosen.airline?.name || "",
      flightNo: (chosen.number || flightNumber).replace(/\s+/g, ""),
      from: label(chosen.departure?.airport),
      to: label(chosen.arrival?.airport),
      date: dep?.date || date,
      departTime: dep?.time || "",
      arriveTime: arr?.time || "",
      arriveDate: arr && dep && arr.date > dep.date ? arr.date : "",
    },
    moreResults: Math.max(0, list.length - 1),
  };
}

export async function POST(request: Request) {
  const hasAmadeus = Boolean(process.env.AMADEUS_CLIENT_ID?.trim() && process.env.AMADEUS_CLIENT_SECRET?.trim());
  const hasAeroDataBox = Boolean(process.env.AERODATABOX_API_KEY?.trim());
  if (!hasAmadeus && !hasAeroDataBox) {
    return NextResponse.json({
      available: false,
      reason: "Flight lookup is off. Add free Amadeus keys (AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET) in the site settings to enable it.",
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
    const result = hasAmadeus ? await lookupAmadeus(flightNumber, date) : await lookupAeroDataBox(flightNumber, date);
    if (result.flight) {
      return NextResponse.json({ available: true, flight: result.flight, moreResults: result.moreResults ?? 0 });
    }
    return NextResponse.json({ available: false, reason: result.reason && result.reason !== "unconfigured" ? result.reason : `No flight ${flightNumber} found on ${date}.` });
  } catch {
    return NextResponse.json({ available: false, reason: "Could not reach the flight-lookup service." });
  }
}
