import type { Itinerary, ItinActivity, ItinLodging } from "@/data/itinerary";

/**
 * An advisor's own trip, saved as a shape to start again for somebody else.
 *
 * WHAT SURVIVES, AND WHAT DOESN'T. The places, the order, the notes, the
 * pacing, where to sleep — everything that makes the trip worth reusing —
 * survives. Everything that belonged to the one client it was built for does
 * not: no traveler names, emails or phones; no flights (a different client
 * flies from a different city, on different dates, with a different
 * confirmation number); no booking references or attachments; no room
 * assignments; no record of how that trip actually ran. What is kept is the
 * shape of the trip, not the file on one family.
 *
 * DATES ARE KEPT, NOT DROPPED — anchored to a fixed date rather than turned
 * into relative day numbers, so every date field and every date helper this
 * codebase already has keeps working on a template unmodified. Saving and
 * starting a template is the same arithmetic lib/trip-setup.ts already does
 * when a site template's stops are dropped onto a trip: shift every date by
 * the same number of days.
 */

/** An arbitrary date. Only its distance from another date is ever used. */
const TEMPLATE_EPOCH = "2000-01-03";

function shiftDate(date: string | undefined, deltaDays: number): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const t = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(t)) return "";
  return new Date(t + deltaDays * 86_400_000).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

function shiftGuideNotes(notes: Record<string, string> | undefined, deltaDays: number): Record<string, string> | undefined {
  if (!notes) return undefined;
  const out: Record<string, string> = {};
  for (const [date, note] of Object.entries(notes)) {
    const shifted = shiftDate(date, deltaDays);
    if (shifted) out[shifted] = note;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Move a whole trip's dates by the same number of days, keeping its shape. */
function shiftItinerary(itin: Itinerary, deltaDays: number, uid: () => string): Itinerary {
  const lodging: ItinLodging[] = itin.lodging.map((l) => ({
    ...l,
    id: uid(),
    checkIn: shiftDate(l.checkIn, deltaDays),
    checkOut: shiftDate(l.checkOut, deltaDays),
  }));

  const activities: ItinActivity[] = itin.activities.map((a) => ({
    ...a,
    id: uid(),
    date: a.date ? shiftDate(a.date, deltaDays) : "",
  }));

  return {
    ...itin,
    startDate: shiftDate(itin.startDate, deltaDays),
    endDate: shiftDate(itin.endDate, deltaDays),
    lodging,
    activities,
    guideNotes: shiftGuideNotes(itin.guideNotes, deltaDays),
  };
}

/**
 * A real trip, generalized into a template — dates anchored to the fixed
 * epoch, and everything specific to the one client it was built for removed.
 */
export function templateFromTrip(itin: Itinerary, name: string, uid: () => string): Itinerary {
  const anchor = itin.startDate && /^\d{4}-\d{2}-\d{2}$/.test(itin.startDate) ? itin.startDate : TEMPLATE_EPOCH;
  const delta = daysBetween(anchor, TEMPLATE_EPOCH);
  const shifted = shiftItinerary(itin, delta, uid);

  const lodging: ItinLodging[] = shifted.lodging.map((l) => ({
    id: l.id,
    type: l.type,
    name: l.name,
    address: l.address,
    coordinates: l.coordinates,
    phone: l.phone,
    checkIn: l.checkIn,
    checkOut: l.checkOut,
    notes: l.notes,
  }));

  const activities: ItinActivity[] = shifted.activities.map((a) => ({
    id: a.id,
    name: a.name,
    yiddishName: a.yiddishName,
    address: a.address,
    coordinates: a.coordinates,
    date: a.date,
    startTime: a.startTime,
    durationMins: a.durationMins,
    order: a.order,
    href: a.href,
    phone: a.phone,
    keverSlug: a.keverSlug,
    country: a.country,
    notes: a.notes,
  }));

  return {
    title: name,
    travelers: [],
    startDate: shifted.startDate,
    endDate: shifted.endDate,
    flights: [],
    lodging,
    activities,
    roadTimes: itin.roadTimes,
    roadTimeSources: itin.roadTimeSources,
    dayStartTime: itin.dayStartTime,
    showZmanim: itin.showZmanim,
    notes: itin.notes,
    guideNotes: shifted.guideNotes,
  };
}

/**
 * A saved template, brought back as a real trip on the dates a new client
 * actually needs — the same day-by-day shape, moved onto their calendar.
 */
export function tripFromTemplate(template: Itinerary, name: string, newStartDate: string, uid: () => string): Itinerary {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(newStartDate);
  const delta = valid ? daysBetween(template.startDate || TEMPLATE_EPOCH, newStartDate) : 0;
  const shifted = shiftItinerary(template, delta, uid);
  return { ...shifted, title: name, travelers: [], flights: [] };
}
