import { type ItinAttachment, type Itinerary, flightRouteLabel } from "@/data/itinerary";

/**
 * Every boarding pass and ticket on a trip, in one list.
 *
 * They are kept on the stop they belong to, which is right when you are
 * planning: the pass is beside the flight, the ticket beside the kever. It is
 * the wrong shape at half past five in the morning at the airport, when the
 * question is not "where in my itinerary is the pass" but "give me the pass".
 *
 * So the same files, read the other way round — by the day they are needed.
 *
 * NOTHING IS FETCHED HERE. These are the references the itinerary already
 * holds; each one is opened by the account that uploaded it and by nobody
 * else. This file only decides what to list and in what order.
 */

export type DocumentOwnerKind = "flight" | "hotel" | "stop";

export type TripDocument = {
  attachment: ItinAttachment;
  /** What it belongs to, as the traveller would name it. */
  belongsTo: string;
  ownerKind: DocumentOwnerKind;
  /** The day it is needed, YYYY-MM-DD. Absent when the item has no date. */
  date?: string;
};

const OWNER_WORDS: Record<DocumentOwnerKind, string> = {
  flight: "Flight",
  hotel: "Where you sleep",
  stop: "Stop",
};

export function ownerWord(kind: DocumentOwnerKind): string {
  return OWNER_WORDS[kind];
}

/**
 * Everything attached to a trip, flattened.
 *
 * A flight's documents are filed under the day it LEAVES, not the day it
 * lands. The pass is wanted at the airport, and a red-eye that lands on the
 * 11th is boarded on the 10th — filing it forward would put it on the day
 * after it was needed.
 */
export function tripDocuments(itinerary: Itinerary | undefined | null): TripDocument[] {
  if (!itinerary) return [];
  const out: TripDocument[] = [];

  for (const flight of itinerary.flights ?? []) {
    for (const attachment of flight.attachments ?? []) {
      out.push({ attachment, belongsTo: flightRouteLabel(flight), ownerKind: "flight", date: flight.date });
    }
  }
  for (const bed of itinerary.lodging ?? []) {
    for (const attachment of bed.attachments ?? []) {
      out.push({ attachment, belongsTo: bed.name || "Where you sleep", ownerKind: "hotel", date: bed.checkIn });
    }
  }
  for (const stop of itinerary.activities ?? []) {
    for (const attachment of stop.attachments ?? []) {
      out.push({ attachment, belongsTo: stop.name, ownerKind: "stop", date: stop.date });
    }
  }
  return out;
}

/**
 * Grouped by the day they are needed, earliest first.
 *
 * Anything with no date goes last under its own heading rather than being
 * dropped or guessed at a day — a ticket for a stop nobody has placed yet is
 * still a ticket, and inventing a date for it would file it on a day the
 * traveller is somewhere else.
 */
export function documentsByDay(documents: TripDocument[]): Array<{ date: string | null; documents: TripDocument[] }> {
  const groups = new Map<string, TripDocument[]>();
  const undated: TripDocument[] = [];

  for (const document of documents) {
    if (!document.date) {
      undated.push(document);
      continue;
    }
    const found = groups.get(document.date);
    if (found) found.push(document);
    else groups.set(document.date, [document]);
  }

  const out = [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, rows]) => ({ date: date as string | null, documents: rows }));
  if (undated.length) out.push({ date: null, documents: undated });
  return out;
}

/** The ones needed on one day. */
export function documentsForDay(documents: TripDocument[], date: string): TripDocument[] {
  return documents.filter((document) => document.date === date);
}

/**
 * The one line at the top.
 *
 * Counted rather than listed, because the list is right underneath and saying
 * it twice is how a panel stops being read.
 */
export function documentSummary(documents: TripDocument[]): string {
  if (!documents.length) {
    return "Nothing attached yet. Put the boarding passes and tickets on the flights and stops in the planner, and they gather here.";
  }
  const n = documents.length;
  return `${n === 1 ? "One thing" : `${n} things`} to have on your phone. Only you can open them — they are not in a shared link or the printed copy.`;
}
