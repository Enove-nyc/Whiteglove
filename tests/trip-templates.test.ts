import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyItinerary, type Itinerary } from "@/data/itinerary";
import { templateFromTrip, tripFromTemplate } from "@/lib/trip-templates";

/**
 * Saving an advisor's trip as a reusable shape, and starting a new one from
 * it — the two things that have to be true for this to be safe:
 *
 *   1. Nothing that belonged to the client it was built for survives —
 *      names, flights, booking references, attachments.
 *   2. The day-by-day shape survives exactly — an activity on day 3 of the
 *      original trip lands on day 3 of the new one, whatever dates either
 *      trip actually has.
 */

let counter = 0;
const uid = () => `test-${(counter += 1)}`;

function realTrip(): Itinerary {
  return {
    ...emptyItinerary(),
    title: "The Cohens — Rome",
    travelers: [{ id: "t1", name: "Dovid Cohen", kind: "adult", email: "dovid@example.com", phone: "555-1234" }],
    startDate: "2026-10-25",
    endDate: "2026-11-01",
    flights: [{ id: "f1", from: "JFK", to: "FCO", date: "2026-10-25", confirmation: "ABC123" }],
    lodging: [
      { id: "l1", type: "hotel", name: "Hotel Artemide", address: "Via Nazionale 22", checkIn: "2026-10-25", checkOut: "2026-11-01", confirmation: "HTL999" },
    ],
    activities: [
      { id: "a1", name: "The Colosseum", date: "2026-10-27", startTime: "09:30", bookedOnSite: true },
      { id: "a2", name: "The Vatican Museums", date: "2026-10-28", startTime: "09:00" },
    ],
    notes: "Confirm kashrus close to the dates.",
  };
}

describe("templateFromTrip", () => {
  it("drops everything specific to the client", () => {
    const template = templateFromTrip(realTrip(), "Rome, a week", uid);
    assert.equal(template.travelers?.length, 0);
    assert.equal(template.flights.length, 0);
    assert.equal(template.lodging[0].confirmation, undefined);
    assert.equal(template.activities[0].bookedOnSite, undefined);
    assert.equal(template.title, "Rome, a week");
  });

  it("keeps what makes the trip worth reusing", () => {
    const template = templateFromTrip(realTrip(), "Rome, a week", uid);
    assert.equal(template.lodging[0].name, "Hotel Artemide");
    assert.equal(template.lodging[0].address, "Via Nazionale 22");
    assert.equal(template.activities[0].name, "The Colosseum");
    assert.equal(template.activities[0].startTime, "09:30");
    assert.equal(template.notes, "Confirm kashrus close to the dates.");
  });

  it("keeps the day-by-day shape — day 3 stays day 3", () => {
    const original = realTrip();
    const template = templateFromTrip(original, "Rome, a week", uid);
    // The Colosseum was on the third day of the original trip (25, 26, 27).
    const originalDay = daysBetween(original.startDate, original.activities[0].date!);
    const templateDay = daysBetween(template.startDate, template.activities[0].date!);
    assert.equal(templateDay, originalDay);
    assert.equal(originalDay, 2);
  });
});

describe("tripFromTemplate", () => {
  it("moves the whole shape onto a new start date, unchanged in structure", () => {
    const template = templateFromTrip(realTrip(), "Rome, a week", uid);
    const started = tripFromTemplate(template, "For the Friedmans", "2027-03-14", uid);

    assert.equal(started.title, "For the Friedmans");
    assert.equal(started.startDate, "2027-03-14");
    // The original trip's end date is 7 days after its start (25 Oct -> 1 Nov).
    assert.equal(started.endDate, "2027-03-21");
    // The Colosseum was on day 3 of the template — still day 3 here.
    assert.equal(daysBetween(started.startDate, started.activities[0].date!), 2);
    assert.equal(started.activities[0].name, "The Colosseum");
    assert.equal(started.lodging[0].name, "Hotel Artemide");
    assert.equal(started.lodging[0].checkIn, "2027-03-14");
    assert.equal(started.lodging[0].checkOut, "2027-03-21");
  });

  it("starts fresh — no travelers or flights carried over from the template", () => {
    const template = templateFromTrip(realTrip(), "Rome, a week", uid);
    const started = tripFromTemplate(template, "For the Friedmans", "2027-03-14", uid);
    assert.equal(started.travelers?.length, 0);
    assert.equal(started.flights.length, 0);
  });

  it("gives every activity and lodging row a fresh id", () => {
    const template = templateFromTrip(realTrip(), "Rome, a week", uid);
    const started = tripFromTemplate(template, "For the Friedmans", "2027-03-14", uid);
    assert.notEqual(started.activities[0].id, template.activities[0].id);
    assert.notEqual(started.lodging[0].id, template.lodging[0].id);
  });
});

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
