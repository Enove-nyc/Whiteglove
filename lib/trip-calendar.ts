import { DateTime } from "luxon";
import { AIRPORTS } from "@/data/airports";
import { type Itinerary } from "@/data/itinerary";
import { coordinatesToPoint } from "@/data/route-utils";
import { timeZoneAt } from "@/lib/place-lookup";

type CalendarEvent = { id: string; summary: string; start: string; end?: string; location?: string };
const encoder = new TextEncoder();

function dateValue(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && DateTime.fromISO(value, { zone: "UTC" }).isValid
    ? value.replaceAll("-", "") : null;
}

function timeValue(date: string, time?: string, zone?: string) {
  if (!dateValue(date) || !time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  if (!zone) return date.replaceAll("-", "") + "T" + time.replace(":", "") + "00";
  const instant = DateTime.fromISO(`${date}T${time}`, { zone });
  return instant.isValid ? instant.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'") : null;
}

function airportZone(value: string) {
  const code = /\(([A-Z]{3})\)$/.exec(value.trim())?.[1] ?? value.trim().toUpperCase();
  const airport = AIRPORTS.find((entry) => entry.code === code);
  return airport ? timeZoneAt(airport.lat, airport.lng) ?? undefined : undefined;
}

function escapeText(value: string) {
  return value.replaceAll("\\", "\\\\").replace(/\r\n|\r|\n/g, "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}

function foldLine(line: string) {
  let bytes = 0;
  let result = "";
  for (const character of line) {
    const width = encoder.encode(character).length;
    if (bytes + width > 75) {
      result += "\r\n ";
      bytes = 1;
    }
    result += character;
    bytes += width;
  }
  return result;
}

export function tripCalendar(itinerary: Itinerary, scope: string, generatedAt = new Date()) {
  const events: CalendarEvent[] = [];
  for (const flight of (itinerary.flights ?? [])) {
    const day = dateValue(flight.date);
    if (!day) continue;
    const fromZone = airportZone(flight.from);
    const toZone = airportZone(flight.to);
    const start = fromZone ? timeValue(flight.date, flight.departTime, fromZone) : null;
    const end = start && toZone ? timeValue(flight.arriveDate || flight.date, flight.arriveTime, toZone) : null;
    const route = [flight.from, flight.to].filter(Boolean).join(" → ");
    events.push({ id: `flight-${flight.id}`, summary: [flight.airline || "Flight", flight.flightNo, route].filter(Boolean).join(" "),
      start: start ?? day, end: end && start && end > start ? end : undefined, location: flight.from });
  }
  for (const stay of (itinerary.lodging ?? [])) {
    const day = dateValue(stay.checkIn);
    if (!day) continue;
    const checkOut = dateValue(stay.checkOut);
    events.push({ id: `stay-${stay.id}`, summary: `Check in: ${stay.name || "Lodging"}`, start: day,
      end: checkOut && checkOut > day ? checkOut : undefined, location: stay.address });
  }
  for (const activity of (itinerary.activities ?? [])) {
    const day = dateValue(activity.date);
    if (!day) continue;
    const point = coordinatesToPoint(activity.coordinates);
    const zone = point ? timeZoneAt(point.lat, point.lng) ?? undefined : undefined;
    const start = timeValue(activity.date, activity.startTime, zone);
    const duration = activity.durationMins;
    const end = start && typeof duration === "number" && Number.isFinite(duration) && duration > 0
      ? DateTime.fromFormat(start.replace(/Z$/, ""), "yyyyMMdd'T'HHmmss", { zone: "UTC" })
        .plus({ minutes: duration }).toFormat(start.endsWith("Z") ? "yyyyMMdd'T'HHmmss'Z'" : "yyyyMMdd'T'HHmmss")
      : undefined;
    events.push({ id: `activity-${activity.id}`, summary: activity.name, start: start ?? day, end, location: activity.address });
  }

  const stamp = generatedAt.toISOString().replace(/[-:]|\.\d{3}/g, "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//White Glove Itineraries//Trip Calendar//EN", "CALSCALE:GREGORIAN",
    ...events.flatMap((event) => {
      const type = event.start.includes("T") ? "" : ";VALUE=DATE";
      return [
        "BEGIN:VEVENT",
        `UID:${escapeText(scope + "-" + event.id)}@whitegloveitineraries.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART${type}:${event.start}`,
        ...(event.end ? [`DTEND${type}:${event.end}`] : []),
        `SUMMARY:${escapeText(event.summary)}`,
        ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR", "",
  ].map(foldLine).join("\r\n");
}

export async function tripCalendarResponse(itinerary: Itinerary | null, shareId: string) {
  const privacy = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (!itinerary) return new Response("This itinerary is unavailable.", { status: 404, headers: privacy });
  // Stable per itinerary link without placing that link's access code in a calendar file.
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(shareId));
  const scope = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return new Response(tripCalendar(itinerary, scope), { headers: {
    ...privacy,
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": 'attachment; filename="white-glove-trip.ics"',
  } });
}
