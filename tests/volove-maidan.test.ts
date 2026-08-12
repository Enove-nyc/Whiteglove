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

describe("Volove and Maidan", () => {
  const volove = cemeteries.find((c) => c.slug === "mizhhirya");

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
