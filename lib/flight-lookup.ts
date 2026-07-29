// Reading a real flight schedule into the shape the planner uses.
//
// Kept apart from the API route so the part that can be wrong — which airport
// is the destination, which day it lands, how long the connection is — can be
// tested against real schedule shapes instead of only being watched in a
// browser with a live key.
//
// Nothing here invents a flight. Given nothing usable it returns null, and the
// route says so rather than filling the form with a guess.

export type LookupStop = { airport: string; arriveTime?: string; departTime?: string; overnight?: boolean };

export type LookupFlight = {
  airline: string;
  flightNo: string;
  from: string;
  to: string;
  date: string;
  departTime: string;
  arriveTime: string;
  /** Set only when it lands on a later day than it left. */
  arriveDate: string;
  /** Connections along the way, in order. Empty for a direct flight. */
  stops: LookupStop[];
};

/** "2024-05-02 00:50+03:00" or "2024-05-02T00:50:00+03:00" → date + HH:MM. */
export function parseLocal(value?: string): { date: string; time: string } | null {
  if (!value || value.length < 16) return null;
  const date = value.slice(0, 10);
  const time = value.slice(11, 16);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  return { date, time };
}

/** "LY1" / "BA 2490" → carrier code + number. */
export function splitFlightNumber(flightNumber: string): { carrierCode: string; number: string } | null {
  const m = /^([0-9A-Z]{2})\s*(\d{1,4})$/.exec(flightNumber.toUpperCase().trim());
  return m ? { carrierCode: m[1], number: m[2] } : null;
}

export type AmadeusTiming = { value?: string };
export type AmadeusPoint = {
  iataCode?: string;
  departure?: { timings?: AmadeusTiming[] };
  arrival?: { timings?: AmadeusTiming[] };
};
export type AmadeusDated = {
  flightPoints?: AmadeusPoint[];
  flightDesignator?: { carrierCode?: string; flightNumber?: number };
};

/**
 * The journey a schedule describes, end to end.
 *
 * One flight number can cover more than two airports — JFK–CDG–TLV is one
 * flight with one stop. So the journey starts at the FIRST point that departs
 * and ends at the LAST that arrives. Reading the first arrival instead treats
 * the stopover as the destination: the wrong city, the wrong landing time, and
 * a night booked in a place the traveler never leaves the airport of.
 *
 * Everything between the two ends is carried through as a connection, so the
 * planner knows a night spent airside is a night accounted for.
 */
export function readAmadeusFlight(
  dated: AmadeusDated | undefined,
  fallback: { carrierCode: string; number: string; date: string },
): LookupFlight | null {
  const points = dated?.flightPoints ?? [];
  const depIndex = points.findIndex((p) => p.departure?.timings?.length);
  let arrIndex = -1;
  for (let i = points.length - 1; i > depIndex; i -= 1) {
    if (points[i].arrival?.timings?.length) {
      arrIndex = i;
      break;
    }
  }
  if (depIndex < 0 || arrIndex < 0) return null;

  const depPoint = points[depIndex];
  const arrPoint = points[arrIndex];
  const dep = parseLocal(depPoint.departure?.timings?.[0]?.value);
  const arr = parseLocal(arrPoint.arrival?.timings?.[0]?.value);

  const carrier = dated?.flightDesignator?.carrierCode || fallback.carrierCode;

  const stops: LookupStop[] = points
    .slice(depIndex + 1, arrIndex)
    .map((p) => {
      const landed = parseLocal(p.arrival?.timings?.[0]?.value);
      const left = parseLocal(p.departure?.timings?.[0]?.value);
      return {
        airport: p.iataCode || "",
        arriveTime: landed?.time,
        departTime: left?.time,
        // Held into the next calendar day. The planner also treats a wait of
        // eight hours or more as a night, so this is the explicit case only.
        overnight: Boolean(landed && left && left.date > landed.date),
      };
    })
    .filter((s) => s.airport);

  return {
    airline: carrier,
    flightNo: `${carrier}${dated?.flightDesignator?.flightNumber ?? fallback.number}`,
    from: depPoint.iataCode || "",
    to: arrPoint.iataCode || "",
    date: dep?.date || fallback.date,
    departTime: dep?.time || "",
    arriveTime: arr?.time || "",
    // Only when it genuinely lands on a later day. An empty string means "same
    // day", which the planner then works out from the times itself.
    arriveDate: arr && dep && arr.date > dep.date ? arr.date : "",
    stops,
  };
}
