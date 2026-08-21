import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildDays, emptyItinerary, type Itinerary } from "@/data/itinerary";
import { itineraryToCompanionTrip } from "@/lib/companion-trip";
import { SAMPLE_ITINERARY } from "@/data/sample-itinerary";
import { zmanimRequestFor } from "@/lib/trip-zmanim";
import { zmanimForDay } from "@/lib/zmanim-day-calculate";
import { curatedKosherPlacesNear } from "@/lib/curated-kosher";
import { hechsherLabel } from "@/data/hechsherim";
import { coordinatesToPoint } from "@/data/route-utils";
import type { ZmanimDay } from "@/lib/zmanim-day";

/**
 * The one place a planner trip becomes an app trip. These hold the wiring
 * together: what a real trip carries, and — just as much — what it must never
 * fabricate.
 */
describe("a planner trip, wired into the app", () => {
  const itin: Itinerary = { ...emptyItinerary(), ...SAMPLE_ITINERARY };
  const days = buildDays(itin);
  const trip = itineraryToCompanionTrip(itin, days, { today: itin.startDate, tripName: "Rome week" });

  it("carries the real days, in order, one per calendar day", () => {
    assert.equal(trip.days.length, days.length);
    assert.ok(trip.days.length >= 7, "the sample is a week");
    assert.equal(trip.days[0].dom, "25"); // 25 October
    assert.equal(trip.days[0].dow, "Sun");
  });

  it("opens on today when the trip is on now, and the first day otherwise", () => {
    // today === startDate here, so it opens on day one.
    assert.equal(trip.todayIndex, 0);
    assert.equal(trip.days[trip.todayIndex].today, true);
    assert.equal(trip.tripFinished, false, "not over — never claim it is");

    // Before the trip starts: day one is a fine place to open, and this is
    // NOT "finished" — that word is reserved for a trip already in the past.
    const early = itineraryToCompanionTrip(itin, days, { today: "2000-01-01" });
    assert.equal(early.todayIndex, 0);
    assert.equal(early.tripFinished, false);
  });

  it("says the trip has finished rather than pretending it is day one, once its last day has passed", () => {
    const lastDay = itin.endDate;
    assert.ok(lastDay, "the sample trip has an end date");
    const dayAfter = new Date(`${lastDay}T12:00:00Z`);
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
    const after = itineraryToCompanionTrip(itin, days, { today: dayAfter.toISOString().slice(0, 10) });
    assert.equal(after.tripFinished, true);
    assert.match(after.homeKicker, /Trip finished/);
    assert.doesNotMatch(after.homeKicker, /day 1 of/i);
    // Still opens somewhere sane to browse from, just not claimed as "today".
    assert.equal(after.todayIndex, 0);
    assert.equal(after.days.every((d) => !d.today), true, "no day is marked today once the trip is over");
  });

  it("puts the real flights and stay in the wallet", () => {
    const flights = trip.walletGroups.find((g) => g.name === "Flights");
    assert.ok(flights, "there is a flights group");
    assert.ok(flights!.rows.some((r) => /JFK|New York/.test(r.title)), "the outbound flight is there");

    const stay = trip.walletGroups.find((g) => g.name === "Where you are staying");
    assert.ok(stay && stay.rows.length > 0, "the hotel is there");
  });

  it("NEVER fabricates the advisor side on a wired trip", () => {
    assert.equal(trip.concierge, false, "no live advisor is claimed");
    assert.equal(trip.swaps, undefined, "no held-for-you weather swap is invented");
    assert.equal(trip.messages, undefined, "no advisor thread is invented");
    assert.equal(trip.handledSteps, undefined, "no handled-for-you log is invented");
    assert.equal(trip.advisorTrips, undefined, "no advisor trip list is invented");
  });

  it("reads the dates and the travellers off the itinerary", () => {
    assert.match(trip.tripDates, /October/);
    assert.match(trip.tripDates, /2026/);
    assert.match(trip.homeKicker, /day 1 of/);
    assert.ok(trip.family.length > 0);
  });

  it("carries the kosher and Shabbos layer when it is handed one", () => {
    const zmanimByDate: Record<string, ZmanimDay> = {};
    for (const request of zmanimRequestFor(days)) zmanimByDate[request.date] = zmanimForDay(request);
    const cc =
      itin.lodging.find((l) => l.coordinates?.trim())?.coordinates ??
      itin.activities.find((a) => a.coordinates?.trim())?.coordinates;
    const center = coordinatesToPoint(cc);
    const kosher = center
      ? curatedKosherPlacesNear({ lat: center.lat, lng: center.lng }, 25).slice(0, 6).map((k) => ({
          name: k.name,
          city: k.city,
          kind: k.category,
          diet: k.diet,
          hechsher: hechsherLabel(k.hechsher),
          km: k.km,
        }))
      : [];

    const withLayer = itineraryToCompanionTrip(itin, days, {
      today: itin.startDate,
      layer: { zmanimByDate, kosher },
    });

    // Erev Shabbos carries a real candle-lighting time, not a weekday guess.
    const friday = withLayer.days.find((d) => d.dow === "Fri");
    assert.ok(friday, "the week has a Friday");
    assert.match(friday!.shabbosLabel ?? "", /Candle-lighting \d{1,2}:\d{2}/);

    // Shabbos knows when it ends.
    const shabbos = withLayer.days.find((d) => d.dow === "Sat");
    assert.match(shabbos!.shabbosNote ?? "", /Shabbos ends about \d{1,2}:\d{2}/);

    // The guide fills with the site's own records.
    const names = withLayer.guideSections.map((s) => s.name);
    assert.ok(names.includes("Shabbos here"), "a Shabbos section");
    assert.ok(names.includes("Kosher, near you"), "a kosher section");
    assert.ok(withLayer.kosherTitle, "an Eating today line on the home screen");

    // And still never invents the advisor side.
    assert.equal(withLayer.concierge, false);
  });

  it("drops the whole kosher and Shabbos layer when it is turned off", () => {
    const zmanimByDate: Record<string, ZmanimDay> = {};
    for (const request of zmanimRequestFor(days)) zmanimByDate[request.date] = zmanimForDay(request);
    const off = itineraryToCompanionTrip(itin, days, {
      today: itin.startDate,
      kosher: false,
      layer: { zmanimByDate, kosher: [{ name: "Ba'Ghetto", city: "Rome", kind: "Restaurant", hechsher: "x", km: 0 }] },
    });
    assert.equal(off.guideSections.length, 0, "no guide sections");
    assert.equal(off.kosherTitle, undefined, "no Eating today line");
    const friday = off.days.find((d) => d.dow === "Fri");
    assert.equal(friday?.shabbosLabel, undefined, "no Shabbos label on a plain itinerary");
  });

  it("shows the advisor as the client's contact, and never invents one", () => {
    const withAdvisor = itineraryToCompanionTrip(itin, days, { today: itin.startDate, advisorName: "Sarah Klein" });
    assert.equal(withAdvisor.contactName, "Sarah Klein");
    assert.equal(withAdvisor.concierge, false);
    // No advisor named → no contact card, not a default one.
    assert.equal(trip.contactName, undefined);
  });

  it("falls back to a weekday Shabbos note when no zmanim are handed in", () => {
    // No layer at all — the guide is empty and the note is the weekday one.
    assert.equal(trip.guideSections.length, 0);
    const friday = trip.days.find((d) => d.dow === "Fri");
    assert.equal(friday?.shabbosLabel, "Erev Shabbos");
  });

  it("puts a departing flight's landing time with When, not Where", () => {
    const oneFlight: Itinerary = {
      ...emptyItinerary(),
      startDate: "2026-06-01",
      endDate: "2026-06-01",
      flights: [
        {
          id: "f1",
          from: "Rome (FCO)",
          to: "New York (JFK)",
          date: "2026-06-01",
          departTime: "11:20",
          arriveTime: "15:10",
          arriveDate: "2026-06-02",
          airline: "El Al",
          flightNo: "007",
        },
      ],
    };
    const oneDays = buildDays(oneFlight);
    const wired = itineraryToCompanionTrip(oneFlight, oneDays, { today: "2026-06-01" });
    const flightItem = wired.days[0].items.find((it) => it.title === "Rome (FCO) → New York (JFK)");
    assert.ok(flightItem, "the departing flight is on the day");
    assert.equal(flightItem!.place, "El Al 007", "Where holds the flight, not a landing time");
    assert.equal(flightItem!.arriveNote, "Lands 15:10 next day");
    assert.doesNotMatch(flightItem!.place, /Lands/);
  });

  it("stands up an empty trip without throwing", () => {
    const empty: Itinerary = { ...emptyItinerary(), startDate: "2026-05-01", endDate: "2026-05-03" };
    const emptyDays = buildDays(empty);
    const wired = itineraryToCompanionTrip(empty, emptyDays, { today: "2026-05-01" });
    assert.equal(wired.days.length, 3);
    // Every day still has at least one item — an open day rather than a blank.
    assert.ok(wired.days.every((d) => d.items.length > 0));
    assert.equal(wired.concierge, false);
  });
});
