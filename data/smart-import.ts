// Smart Import: turning a pasted confirmation or an uploaded confirmation PDF
// into itinerary rows, without retyping it by hand. Pure data model — no
// Node, no browser, no AI call — the same discipline data/itinerary.ts and
// data/proposal.ts keep, so a test can build a result by hand and the
// extraction call, the preview UI, and the itinerary merge can all import it
// without pulling in anything they don't need.
//
// AN IMPORTED ITEM IS NOT YET AN ITINERARY ROW. It is a preview the planner
// reviews, edits and approves — see mergeImportedItems below — never
// something written to a trip on its own. And it is never padded: a field the
// source text did not actually contain is left out here, not guessed at, so
// the preview shows the planner exactly what was — and was not — read.

import type { Itinerary, ItinActivity, ItinFlight, ItinLodging } from "@/data/itinerary";

export type ImportedItemKind = "flight" | "lodging" | "activity";

export const IMPORTED_KIND_LABEL: Record<ImportedItemKind, string> = {
  flight: "Flight",
  lodging: "Hotel / stay",
  // Car service, transfers, restaurant reservations and tours all land here —
  // the itinerary itself has no separate row type for them; a stop is a stop.
  activity: "Stop (car, restaurant, tour, transfer…)",
};

/**
 * One booking or reservation found in the source text, before it is placed on
 * a trip. Every field below is optional on purpose — only what the source
 * text actually said is ever filled in.
 */
export type ImportedItem = {
  /** Assigned when the extraction runs; stable for the life of the preview. */
  id: string;
  kind: ImportedItemKind;
  /** The exact sentence(s) this item was read from, so the planner can check it against the source. */
  sourceExcerpt?: string;

  // flight
  airline?: string;
  flightNo?: string;
  from?: string;
  to?: string;
  arriveTime?: string; // HH:MM
  arriveDate?: string; // YYYY-MM-DD

  // shared: flight departure / activity date; lodging check-in
  date?: string; // YYYY-MM-DD
  departTime?: string; // HH:MM — flight departure, or activity start time

  // lodging
  name?: string; // hotel name, or activity/stop name
  address?: string;
  phone?: string;
  checkIn?: string; // YYYY-MM-DD
  checkOut?: string; // YYYY-MM-DD

  confirmation?: string;
  notes?: string;
};

export type SmartImportResult = {
  items: ImportedItem[];
  /**
   * Anything the source text seemed to reference but the extraction could not
   * read confidently — a second passenger, a date that did not parse, a
   * partial confirmation number. Shown to the planner, never silently
   * dropped, so "we could not read this part" is always said out loud rather
   * than left as a gap nobody was told about.
   */
  warnings: string[];
};

export function emptySmartImportResult(): SmartImportResult {
  return { items: [], warnings: [] };
}

/**
 * One imported item → the same rows the itinerary builder already edits,
 * appended to whatever the itinerary already holds. Mirrors
 * proposalOptionToItinerary in data/proposal.ts: never replaces a stop the
 * planner already entered by hand, and never invents a date — an item with no
 * date lands exactly as bare as it was in the preview.
 */
export function addImportedItemsToItinerary(items: ImportedItem[], base: Itinerary): Itinerary {
  const flights: ItinFlight[] = [...base.flights];
  const lodging: ItinLodging[] = [...base.lodging];
  const activities: ItinActivity[] = [...base.activities];

  for (const it of items) {
    const id = `import-${it.id}`;
    if (it.kind === "flight") {
      flights.push({
        id,
        airline: it.airline,
        flightNo: it.flightNo,
        from: it.from || "",
        to: it.to || "",
        date: it.date || "",
        departTime: it.departTime,
        arriveTime: it.arriveTime,
        arriveDate: it.arriveDate,
        confirmation: it.confirmation,
        notes: it.notes,
      });
    } else if (it.kind === "lodging") {
      lodging.push({
        id,
        type: "hotel",
        name: it.name || "Hotel",
        address: it.address,
        phone: it.phone,
        checkIn: it.checkIn || it.date || "",
        checkOut: it.checkOut || "",
        confirmation: it.confirmation,
        notes: it.notes,
      });
    } else {
      activities.push({
        id,
        name: it.name || "Reservation",
        address: it.address,
        phone: it.phone,
        date: it.date || "",
        startTime: it.departTime,
        notes: [it.notes, it.confirmation ? `Confirmation: ${it.confirmation}` : undefined].filter(Boolean).join(" — ") || undefined,
      });
    }
  }

  return { ...base, flights, lodging, activities };
}
