import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cemeteries } from "@/data/cemeteries";
import { kmBetween } from "@/data/itinerary";

/**
 * Volove is not Maidan.
 *
 * One record used to hold both: the name and the kevarim were Volove's, the
 * address and the map pin were Maidan's, and the two are nine kilometres apart
 * over Carpathian roads. "Navigate to this beis hachaim" sent somebody to a
 * village he had not asked for, and nothing on the page said so — the entry
 * looked complete, which is why it lasted.
 *
 * Held here because a single record covering two places is an easy thing to
 * write again, and the failure is silent.
 */

const VOLOVE_CEMETERY = "48.531479, 23.501989"; // Suvorova / Leonova crossroads.
const MAIDAN_VILLAGE = "48.611667, 23.501944";

const volove = cemeteries.find((c) => c.slug === "mizhhirya");

describe("Volove and Maidan", () => {

  it("still exists, under the name people look for", () => {
    assert.ok(volove, "the Volove beis hachaim is missing");
    assert.match(volove!.yiddishName, /וואלאווע/);
    assert.match(volove!.name, /Volove/i);
  });

  it("points at the beis hachaim and not at the next village", () => {
    const strayed = kmBetween(volove!.coordinates, MAIDAN_VILLAGE);
    assert.ok(strayed !== null && strayed > 5, `the pin is ${strayed?.toFixed(1)} km from Maidan village — it used to BE Maidan`);

    const onTarget = kmBetween(volove!.coordinates, VOLOVE_CEMETERY);
    assert.ok(onTarget !== null && onTarget < 0.5, "the pin is not on the surveyed cemetery");
  });

  it("says in words that Maidan is a different beis hachaim", () => {
    // The pin being right is not enough. Somebody who has been told the two
    // names belong together needs the page to say otherwise.
    const notes = volove!.arrivalNotes.join(" ");
    assert.match(notes, /Maidan/);
    assert.match(notes, /not the Maidan/i);
  });

  it("does not put the address of one place on the other", () => {
    assert.doesNotMatch(volove!.address, /Verkhovynska/, "that street is in Maidan");
    assert.match(volove!.address, /Suvorova/i);
  });
});

describe("Maidan has a page of its own", () => {
  const maidan = cemeteries.find((c) => c.slug === "maidan");

  it("exists although nobody in it is named", () => {
    // The owner's rule: if we know a beis hachaim is there, it gets a page.
    // Knowing where Jews are buried is the thing worth publishing, and holding
    // the whole place back until a name turns up publishes nothing at all.
    assert.ok(maidan, "Maidan has no entry");
    assert.equal(maidan!.burials.length, 0);
    assert.ok(maidan!.arrivalNotes.length > 0, "a page with no names must at least say how to get there");
    assert.ok(maidan!.address.trim());
    assert.ok(maidan!.sourceUrl.trim(), "and where we know it from");
  });

  it("offers no grave pin it does not have", () => {
    // airportRef ranks airports; only `coordinates` becomes "navigate here".
    // The one thing worse than no pin is a confident pin on the wrong village,
    // which is what this pair of towns already did once.
    assert.equal(maidan!.coordinates, undefined);
    assert.ok(maidan!.airportRef, "the village point still has to rank airports");
  });

  it("is not the same record, or the same ground, as Volove", () => {
    assert.notEqual(maidan!.slug, volove!.slug);
    const apart = kmBetween(maidan!.airportRef, volove!.coordinates);
    assert.ok(apart !== null && apart > 5, "the two are nine kilometres apart and must not collapse together");
  });
});

describe("whose number it is", () => {
  it("lets a shomer's number carry a name, so the traveller knows who to ask for", () => {
    // The field is what the page prints as "Ask for —". A number with nobody
    // attached is the reason somebody does not ring it.
    const withName = cemeteries
      .flatMap((c) => c.accessContacts ?? [])
      .filter((contact) => contact.name?.trim());
    for (const contact of withName) {
      assert.ok(contact.phone?.trim() || contact.email?.trim(), `${contact.name} is named but has nothing to call`);
    }
  });
});
