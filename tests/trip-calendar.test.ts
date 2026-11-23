import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyItinerary, redactForTraveler } from "@/data/itinerary";
import { tripCalendar, tripCalendarResponse } from "@/lib/trip-calendar";

test("exports time-zone-aware flights, all-day stays, and visible scheduled activities", async () => {
  const trip = {
    ...emptyItinerary(),
    travelers: [{ id: "a", name: "Traveler A", notes: "Private notes" }, { id: "b", name: "Traveler B" }],
    flights: [{ id: "f1", from: "JFK", to: "LHR", date: "2027-07-01", departTime: "20:00", arriveTime: "08:00", arriveDate: "2027-07-02" }],
    lodging: [{ id: "h1", type: "hotel" as const, name: "Hotel, London", checkIn: "2027-07-02", checkOut: "2027-07-04" }],
    activities: [
      { id: "x1", name: "Museum", date: "2027-07-02", startTime: "10:00", durationMins: 90, coordinates: "51.5,-0.1" },
      { id: "x2", name: "Unscheduled", date: "" },
    ],
  };
  const calendar = tripCalendar(redactForTraveler(trip, "a", { individual: true }), "test");
  assert.match(calendar, /DTSTART:20270702T000000Z\r\nDTEND:20270702T070000Z/);
  assert.match(calendar, /DTSTART;VALUE=DATE:20270702\r\nDTEND;VALUE=DATE:20270704/);
  assert.match(calendar, /SUMMARY:Check in: Hotel\\, London/);
  assert.match(calendar, /DTSTART:20270702T090000Z\r\nDTEND:20270702T103000Z/);
  assert.doesNotMatch(calendar, /Private notes|Unscheduled/);
  const response = await tripCalendarResponse(trip, "private-test-code");
  assert.equal(response.headers.get("content-type"), "text/calendar; charset=utf-8");
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.doesNotMatch(await response.text(), /private-test-code/);
  assert.equal((await tripCalendarResponse(null, "revoked-test-code")).status, 404);
});
