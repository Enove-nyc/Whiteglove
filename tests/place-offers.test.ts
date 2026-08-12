import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { Itinerary } from "@/data/itinerary";
import {
  NEVER_SENT,
  type TripPlace,
  fieldsSent,
  offerKey,
  offerTitle,
  placesInTrip,
  placesStillToAsk,
  siteAlreadyHas,
  submissionFor,
  submissionText,
  worthOffering,
} from "@/lib/place-offers";

/**
 * A place somebody put on their trip that the site does not have.
 *
 * The rule every test here is really about: an itinerary is a private
 * document, and the place is the only part of it that ever leaves. Their
 * dates, their notes, the name of the trip, who they are going with, the
 * reference number for the hotel — none of it goes, and the test at the bottom
 * checks the whole payload rather than the fields I remembered to think about.
 */

const trip = (over: Partial<Itinerary> = {}): Itinerary =>
  ({
    title: "Poland with the children, Elul",
    startDate: "2026-09-01",
    endDate: "2026-09-08",
    flights: [],
    lodging: [],
    activities: [],
    ...over,
  }) as Itinerary;

const place = (over: Partial<TripPlace> = {}): TripPlace => ({
  id: "a1",
  kind: "stop",
  name: "Muzeum Podkarpackie",
  address: "Krosno, Poland",
  ...over,
});

describe("what comes out of a trip", () => {
  it("takes the place and leaves the trip behind", () => {
    const places = placesInTrip(
      trip({
        activities: [
          {
            id: "a1",
            name: "Muzeum Podkarpackie",
            address: "Krosno, Poland",
            coordinates: "49.69,21.77",
            country: "Poland",
            href: "https://example.museum",
            phone: "+48 13 432 13 76",
            date: "2026-09-03",
            startTime: "10:30",
            durationMins: 90,
            notes: "Ask Chaim for the key. Mommy's yahrzeit is the 4th.",
          },
        ],
      }),
    );
    assert.equal(places.length, 1);
    assert.deepEqual(places[0], {
      id: "a1",
      kind: "stop",
      name: "Muzeum Podkarpackie",
      address: "Krosno, Poland",
      coordinates: "49.69,21.77",
      country: "Poland",
      href: "https://example.museum",
      phone: "+48 13 432 13 76",
    });
  });

  it("takes places to stay as well", () => {
    const places = placesInTrip(
      trip({
        lodging: [
          {
            id: "l1",
            type: "hotel",
            name: "Pensjonat u Anny",
            address: "Lezajsk, Poland",
            phone: "+48 17 242 00 00",
            checkIn: "2026-09-02",
            checkOut: "2026-09-04",
            confirmation: "ABC-99812",
            notes: "Paid already",
          },
        ],
      }),
    );
    assert.equal(places.length, 1);
    assert.equal(places[0].kind, "stay");
    assert.equal(places[0].name, "Pensjonat u Anny");
    assert.ok(!("confirmation" in places[0]), "a booking reference is not part of a place");
  });

  it("leaves a night on a coach alone", () => {
    // Not a place. It has no address and never will.
    const places = placesInTrip(
      trip({ lodging: [{ id: "l1", type: "overnight-transit", name: "", checkIn: "2026-09-02", checkOut: "2026-09-03" }] }),
    );
    assert.deepEqual(places, []);
  });

  it("does not go looking at flights", () => {
    // An airline and a number is not somewhere the site could list, and the
    // booking reference sits right beside it.
    const places = placesInTrip(
      trip({ flights: [{ id: "f1", airline: "LOT", flightNo: "LO282", from: "JFK", to: "WAW", date: "2026-09-01", confirmation: "XY7788" }] }),
    );
    assert.deepEqual(places, []);
  });
});

describe("whether it is a place at all", () => {
  it("offers something with a name and somewhere on earth", () => {
    assert.equal(worthOffering(place()), true);
    assert.equal(worthOffering(place({ address: undefined, coordinates: "49.69,21.77" })), true);
  });

  it("does not offer a line on a day that is not a place", () => {
    // "Lunch", "Rest", "Drive to Kraków" are real things to have on a day and
    // are not places anybody could add to a directory. Asking about them is a
    // question with no good answer.
    assert.equal(worthOffering(place({ name: "Lunch", address: undefined, coordinates: undefined })), false);
    assert.equal(worthOffering(place({ name: "Drive to Kraków", address: undefined, coordinates: undefined })), false);
    assert.equal(worthOffering(place({ name: "", address: "Somewhere" })), false);
    assert.equal(worthOffering(place({ name: "Go", address: "Somewhere" })), false);
  });
});

describe("a trip that was built before this question existed", () => {
  it("asks about the places already on it, in the order they were put there", () => {
    const museum = place({ id: "a1" });
    const lunch = place({ id: "a2", name: "Lunch", address: undefined, coordinates: undefined });
    const hotel = place({ id: "l1", kind: "stay", name: "Pensjonat u Anny", address: "Lezajsk, Poland" });
    const still = placesStillToAsk([museum, lunch, hotel], {});
    assert.deepEqual(still.map((p) => p.id), ["a1", "l1"]);
  });

  it("does not ask again about a place they already answered", () => {
    const museum = place();
    const still = placesStillToAsk([museum], { [offerKey(museum)]: true });
    assert.deepEqual(still, []);
  });

  it("is offered when the planner opens, not only when a stop is typed", () => {
    const builder = readFileSync("components/ItineraryBuilder.tsx", "utf8");
    const hook = readFileSync("components/usePlaceOffer.ts", "utf8");
    assert.match(builder, /considerExisting\(placesInTrip/, "opening a trip never looks at the places already on it");
    assert.match(hook, /considerExisting/, "the hook has nowhere to ask about an existing trip");
  });
});

describe("whether the site already has it", () => {
  it("says yes when the name really is the same place", () => {
    assert.equal(siteAlreadyHas("Lizhensk", ["Lizhensk"]), true);
    assert.equal(siteAlreadyHas("Lezajsk", ["Leżajsk"]), true, "the same town, spelled two ways");
    assert.equal(siteAlreadyHas("Hotel Sanz", ["Hotel Sanz Kraków"]), true, "the name inside a longer title");
  });

  it("says no when the search only matched loosely", () => {
    // The site's search is fuzzy on purpose — it has to find Lizhensk from
    // "lezajsk". That is far too loose to answer this question: "Hotel Sanz"
    // hits the TOWN of Sanz, and calling that a match would silently drop the
    // hotel and the traveller would never be asked.
    assert.equal(siteAlreadyHas("Hotel Sanz", ["Sanz"]), false);
    assert.equal(siteAlreadyHas("Muzeum Podkarpackie", ["Kraków", "Warsaw"]), false);
    assert.equal(siteAlreadyHas("Pensjonat u Anny", []), false);
  });

  it("would rather ask twice than decide wrongly that we have it", () => {
    // The two mistakes are not the same size. Offering something the site
    // turns out to have costs one dismissal. Deciding we have something we do
    // not costs the place, silently, and nobody ever finds out. So a site
    // entry with a SHORTER name than what was typed is not treated as a match,
    // even when it might be the same thing.
    assert.equal(siteAlreadyHas("Lezajsk beis hachaim", ["Leżajsk"]), false);
  });
});

describe("remembering an answer", () => {
  it("is keyed by the place, not by the stop", () => {
    // Somebody who says no to a hotel on their Poland trip should not be asked
    // again when they put the same hotel on next year's. It is the same
    // question and they have answered it.
    assert.equal(offerKey(place({ id: "a1" })), offerKey(place({ id: "different-stop" })));
    assert.equal(offerKey(place({ kind: "stop" })), offerKey(place({ kind: "stay" })));
  });

  it("tells two different places apart", () => {
    assert.notEqual(offerKey(place({ name: "One" })), offerKey(place({ name: "Two" })));
    assert.notEqual(offerKey(place({ address: "Krosno" })), offerKey(place({ address: "Kraków" })));
  });
});

describe("what the notice says, and what actually goes", () => {
  it("names every field that would be sent", () => {
    const fields = fieldsSent(place({ coordinates: "49.69,21.77", country: "Poland", href: "https://x.test", phone: "+48 13 432" }));
    assert.deepEqual(fields.map((f) => f.label), ["Name", "Address", "Coordinates", "Country", "Link", "Phone"]);
  });

  it("names the phone on its own, because it may be somebody's own", () => {
    // A number typed on a stop is as likely to be a friend's as a hotel's.
    // Whoever is deciding has to see which one they are about to send.
    const fields = fieldsSent(place({ phone: "+1 917 555 0100" }));
    assert.ok(fields.some((f) => f.label === "Phone" && f.value === "+1 917 555 0100"));
  });

  it("leaves out what was never filled in", () => {
    assert.deepEqual(fieldsSent(place({ address: undefined })).map((f) => f.label), ["Name"]);
  });

  it("says out loud what stays theirs", () => {
    // "We only send the place" is not a sentence anybody can check.
    assert.ok(NEVER_SENT.length >= 5);
    for (const line of NEVER_SENT) assert.ok(line.trim().length > 0);
  });
});

describe("the submission itself", () => {
  it("lands in the queue the owner already reads", () => {
    const sent = submissionFor(place(), { name: "Traveler", email: "traveler@example.com" });
    assert.equal(sent.targetType, "new");
    assert.ok(sent.title.includes("Muzeum Podkarpackie"));
    assert.ok(sent.suggestedInfo.includes("Krosno, Poland"));
    assert.match(sent.source, /itinerary/i);
  });

  it("says which kind of thing it is", () => {
    assert.match(offerTitle(place({ kind: "stay" })), /^Somewhere to stay/);
    assert.match(offerTitle(place({ kind: "stop" })), /^Somewhere to go/);
  });

  it("CARRIES NOTHING OF THE TRIP — the whole payload, not the fields I thought of", () => {
    // The one that matters. Everything private is given a value that could not
    // occur by accident, and the entire serialised submission is searched for
    // it. A field added to the place later, or to the itinerary, fails here
    // rather than quietly travelling.
    const secrets = {
      notes: "ZZNOTEZZ ask Chaim for the key",
      date: "ZZDATEZZ",
      startTime: "ZZTIMEZZ",
      confirmation: "ZZREFZZ",
      title: "ZZTRIPNAMEZZ",
      collaborator: "ZZFRIENDZZ",
    };
    const itin = trip({
      title: secrets.title,
      activities: [
        {
          id: "a1",
          name: "Muzeum Podkarpackie",
          address: "Krosno, Poland",
          date: secrets.date,
          startTime: secrets.startTime,
          notes: secrets.notes,
          attachments: [
            { id: "ZZPASSZZ", name: "boarding-pass.pdf", kind: "boarding-pass", bytes: 1000, contentType: "application/pdf", addedAt: "2026-08-01T00:00:00.000Z" },
          ],
        },
      ],
      lodging: [
        {
          id: "l1",
          type: "hotel",
          name: "Pensjonat u Anny",
          address: "Lezajsk, Poland",
          checkIn: secrets.date,
          checkOut: secrets.date,
          confirmation: secrets.confirmation,
          notes: secrets.notes,
        },
      ],
      travelers: [{ id: "t1", name: secrets.collaborator, kind: "child", notes: secrets.notes }],
    });

    const wire = JSON.stringify(
      placesInTrip(itin).map((p) => submissionFor(p, { name: "Traveler", email: "traveler@example.com" })),
    );

    for (const [what, value] of Object.entries(secrets)) {
      assert.ok(!wire.includes(value), `${what} (${value}) is in what would be sent:\n${wire}`);
    }
    assert.ok(!wire.includes("ZZPASSZZ"), "a boarding pass is in what would be sent");
    assert.ok(!/ZZ[A-Z]+ZZ/.test(wire), `something private got through:\n${wire}`);
    // And it really did carry the places, so the test above is not passing by
    // sending nothing at all.
    assert.ok(wire.includes("Muzeum Podkarpackie") && wire.includes("Pensjonat u Anny"));
  });

  it("writes the place the way the owner will read it", () => {
    assert.equal(
      submissionText(place({ coordinates: "49.69,21.77" })),
      "Name: Muzeum Podkarpackie\nAddress: Krosno, Poland\nCoordinates: 49.69,21.77",
    );
  });
});
