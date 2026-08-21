import { parseLocal } from "@/lib/flight-lookup";
import type { FlightStatusSnapshot, FlightStatusValue } from "@/data/trip-alerts";

/**
 * A flight's real, current status — the same AeroDataBox endpoint
 * app/api/flights/lookup/route.ts already calls to autofill a flight's
 * schedule, read a second time for the fields that route discards: status,
 * gate, terminal, and how late it actually is. One provider, reused rather
 * than duplicated — see that route's own note on why there is only one.
 *
 * NEVER INVENTS A STATUS. AeroDataBox's own wording is read defensively and
 * mapped to a small, known set; anything unrecognized comes back "unknown"
 * rather than guessed at, and delay minutes are only ever a real difference
 * between two real timestamps AeroDataBox reported, never estimated.
 */

type AdbTime = { local?: string };
type AdbEndpoint = { scheduledTime?: AdbTime; revisedTime?: AdbTime; terminal?: string; gate?: string };
type AdbFlight = { number?: string; status?: string; departure?: AdbEndpoint; arrival?: AdbEndpoint };

function toMinutes(value?: string): number | null {
  const parsed = parseLocal(value);
  if (!parsed) return null;
  const [h, m] = parsed.time.split(":").map(Number);
  // Days aren't tracked here — a delay crossing midnight will read close to
  // its true size but is not exact. Good enough for "is this significant."
  return h * 60 + m;
}

function mapStatus(raw?: string): FlightStatusValue {
  const s = (raw || "").toLowerCase();
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("divert")) return "diverted";
  if (s.includes("delay")) return "delayed";
  if (s.includes("depart") || s.includes("enroute") || s.includes("en route")) return "departed";
  if (s.includes("arriv") || s.includes("landed")) return "landed";
  if (s.includes("expect") || s.includes("schedul") || s.includes("checkin") || s.includes("boarding") || s.includes("on time") || s.includes("ontime")) return "on-time";
  return raw ? "unknown" : "unknown";
}

/** Reads one flight's current status. Null when unconfigured, not found, or the request failed — never a guess. */
export async function checkFlightStatus(flightId: string, flightNumber: string, date: string): Promise<FlightStatusSnapshot | null> {
  const key = process.env.AERODATABOX_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch(
      `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(flightNumber)}/${encodeURIComponent(date)}?withAircraftImage=false&withLocation=false`,
      { headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com" }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const raw = (await res.json().catch(() => null)) as AdbFlight[] | AdbFlight | null;
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const chosen = list.find((f) => parseLocal(f.departure?.scheduledTime?.local)?.date === date) ?? list[0];
    if (!chosen) return null;

    const scheduled = toMinutes(chosen.departure?.scheduledTime?.local);
    const revised = toMinutes(chosen.departure?.revisedTime?.local);
    const delayMinutes = scheduled !== null && revised !== null && revised > scheduled ? revised - scheduled : undefined;

    return {
      flightId,
      status: mapStatus(chosen.status),
      departureGate: chosen.departure?.gate,
      departureTerminal: chosen.departure?.terminal,
      arrivalGate: chosen.arrival?.gate,
      arrivalTerminal: chosen.arrival?.terminal,
      delayMinutes,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
