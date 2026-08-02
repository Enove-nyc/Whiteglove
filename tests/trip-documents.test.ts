import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ItinAttachment, Itinerary } from "@/data/itinerary";
import {
  documentSummary,
  documentsByDay,
  documentsForDay,
  ownerWord,
  tripDocuments,
} from "@/lib/trip-documents";

/**
 * Every pass and ticket on a trip, read by the day it is needed.
 *
 * They are kept on the stop they belong to, which is right while you are
 * planning. It is the wrong shape at half past five at the airport, when the
 * question is not "where in my itinerary is the pass" but "give me the pass".
 *
 * The one that must be right: a red-eye is BOARDED on the day it leaves. A
 * pass filed under the landing date is a pass on the day after it was needed.
 */

function att(over: Partial<ItinAttachment> = {}): ItinAttachment {
  return {
    id: over.id ?? "att-1",
    kind: over.kind ?? "boarding-pass",
    name: over.name ?? "KRK-TLV.pdf",
    contentType: over.contentType ?? "application/pdf",
    bytes: over.bytes ?? 1024,
    addedAt: over.addedAt ?? "2026-08-01T09:00:00.000Z",
  };
}

function trip(over: Partial<Itinerary> = {}): Itinerary {
  return {
    title: "Poland",
    startDate: "2026-08-10",
    endDate: "2026-08-14",
    flights: over.flights ?? [],
    lodging: over.lodging ?? [],
    activities: over.activities ?? [],
  };
}

describe("gathering a trip's documents", () => {
  it("finds them on flights, hotels and stops alike", () => {
    const documents = tripDocuments(
      trip({
        flights: [{ id: "f1", from: "JFK", to: "KRK", date: "2026-08-10", attachments: [att({ id: "a" })] }],
        lodging: [{ id: "l1", name: "Hotel Stary", checkIn: "2026-08-11", checkOut: "2026-08-14", type: "hotel", attachments: [att({ id: "b", kind: "booking" })] }],
        activities: [{ id: "s1", name: "Lizhensk", date: "2026-08-12", attachments: [att({ id: "c", kind: "ticket" })] }],
      }),
    );
    assert.deepEqual(documents.map((d) => d.ownerKind), ["flight", "hotel", "stop"]);
    assert.deepEqual(documents.map((d) => d.date), ["2026-08-10", "2026-08-11", "2026-08-12"]);
    assert.match(documents[0].belongsTo, /JFK/);
    assert.equal(documents[1].belongsTo, "Hotel Stary");
    assert.equal(documents[2].belongsTo, "Lizhensk");
  });

  it("files a red-eye's pass on the day it takes off, not the day it lands", () => {
    // You board on the departure day. Filing it forward puts the pass on the
    // day after it was needed.
    const documents = tripDocuments(
      trip({
        flights: [
          { id: "f1", from: "JFK", to: "KRK", date: "2026-08-10", departTime: "22:40", arriveTime: "13:15", arriveDate: "2026-08-11", attachments: [att()] },
        ],
      }),
    );
    assert.equal(documents[0].date, "2026-08-10");
  });

  it("is empty for a trip with nothing attached, and for no trip at all", () => {
    assert.deepEqual(tripDocuments(trip({ activities: [{ id: "s1", name: "Uman", date: "2026-08-12" }] })), []);
    assert.deepEqual(tripDocuments(undefined), []);
    assert.deepEqual(tripDocuments(null), []);
  });

  it("names a hotel that has no name rather than showing a blank", () => {
    const [document] = tripDocuments(
      trip({ lodging: [{ id: "l1", name: "", checkIn: "2026-08-11", checkOut: "2026-08-12", type: "hotel", attachments: [att()] }] }),
    );
    assert.equal(document.belongsTo, "Where you sleep");
  });
});

describe("grouped by the day they are needed", () => {
  const documents = tripDocuments(
    trip({
      flights: [{ id: "f1", from: "JFK", to: "KRK", date: "2026-08-14", attachments: [att({ id: "late" })] }],
      activities: [
        { id: "s1", name: "Lizhensk", date: "2026-08-11", attachments: [att({ id: "early" })] },
        { id: "s2", name: "Somewhere unplaced", date: "", attachments: [att({ id: "nowhere" })] },
        { id: "s3", name: "Also Lizhensk", date: "2026-08-11", attachments: [att({ id: "same-day" })] },
      ],
    }),
  );

  it("puts the earliest day first", () => {
    const days = documentsByDay(documents);
    assert.deepEqual(days.map((d) => d.date), ["2026-08-11", "2026-08-14", null]);
  });

  it("keeps a day's documents together", () => {
    const [first] = documentsByDay(documents);
    assert.deepEqual(first.documents.map((d) => d.attachment.id), ["early", "same-day"]);
  });

  it("puts anything with no day last, rather than dropping it or guessing", () => {
    // A ticket for a stop nobody has placed yet is still a ticket, and
    // inventing a date would file it on a day the traveller is elsewhere.
    const last = documentsByDay(documents).at(-1)!;
    assert.equal(last.date, null);
    assert.deepEqual(last.documents.map((d) => d.attachment.id), ["nowhere"]);
  });

  it("has no undated group when everything has a day", () => {
    const dated = documentsByDay(documents.filter((d) => d.date));
    assert.ok(!dated.some((group) => group.date === null));
  });

  it("picks out one day", () => {
    assert.deepEqual(documentsForDay(documents, "2026-08-11").map((d) => d.attachment.id), ["early", "same-day"]);
    assert.deepEqual(documentsForDay(documents, "2026-08-13"), []);
  });
});

describe("what the panel says", () => {
  it("counts them, and says who can open them", () => {
    assert.match(documentSummary([{ attachment: att(), belongsTo: "x", ownerKind: "stop" }]), /^One thing to have on your phone/);
    assert.match(
      documentSummary([
        { attachment: att(), belongsTo: "x", ownerKind: "stop" },
        { attachment: att({ id: "b" }), belongsTo: "y", ownerKind: "flight" },
      ]),
      /^2 things to have on your phone/,
    );
    assert.match(documentSummary([{ attachment: att(), belongsTo: "x", ownerKind: "stop" }]), /not in a shared link/);
  });

  it("says how to fill it rather than just that it is empty", () => {
    assert.match(documentSummary([]), /Put the boarding passes and tickets on the flights and stops/);
  });

  it("names what a document hangs on", () => {
    assert.equal(ownerWord("flight"), "Flight");
    assert.equal(ownerWord("hotel"), "Where you sleep");
    assert.equal(ownerWord("stop"), "Stop");
  });
});
