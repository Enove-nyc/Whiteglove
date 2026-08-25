import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchGearToItems, matchGearToLabel, type GearLink } from "@/data/packing-gear-match";

const blech: GearLink = { id: "1", name: "Travel Shabbos blech", url: "https://www.amazon.com/dp/AAA" };
const adapter: GearLink = { id: "2", name: "Universal plug adapter", url: "https://www.amazon.com/dp/BBB" };
const scale: GearLink = { id: "3", name: "Portable luggage scale", url: "https://www.amazon.com/dp/CCC" };
const SHELF = [blech, adapter, scale];

describe("a packing line finds the product it names", () => {
  it("matches when the line says the thing outright", () => {
    assert.equal(matchGearToLabel("Blech", SHELF)?.gear.id, blech.id);
  });

  it("matches inside a longer, more specific line", () => {
    assert.equal(matchGearToLabel("Plug adapter for European sockets", SHELF)?.gear.id, adapter.id);
  });

  it("ignores the noise words a travel site puts in every product name", () => {
    // "Travel" and "Universal" identify nothing here; "plug" and "adapter" do.
    assert.equal(matchGearToLabel("Bring a plug adapter", SHELF)?.gear.id, adapter.id);
  });

  it("reads a plural as the same product", () => {
    const candles: GearLink = { id: "4", name: "Travel candlesticks", url: "https://www.amazon.com/dp/DDD" };
    assert.equal(matchGearToLabel("Candlestick", [candles])?.gear.id, candles.id);
    assert.equal(matchGearToLabel("Candlesticks", [candles])?.gear.id, candles.id);
  });

  it("is not thrown by punctuation or casing", () => {
    assert.equal(matchGearToLabel("LUGGAGE SCALE (hand-held)", SHELF)?.gear.id, scale.id);
  });
});

describe("a guess is worse than nothing", () => {
  it("a half-overlap is not a match in either direction", () => {
    // "plug bag" shares "plug" with the adapter and nothing else — neither
    // one names the other, so there is no link.
    assert.equal(matchGearToLabel("Plug bag", SHELF), null);
  });

  it("does not reach for an unrelated line", () => {
    assert.equal(matchGearToLabel("Sunscreen", SHELF), null);
    assert.equal(matchGearToLabel("Passport and travel documents", SHELF), null);
  });

  it("a line of nothing but noise matches nothing", () => {
    assert.equal(matchGearToLabel("travel kit", SHELF), null);
    assert.equal(matchGearToLabel("", SHELF), null);
  });

  it("a gear name of nothing but noise cannot match everything", () => {
    const junk: GearLink = { id: "9", name: "Travel kit", url: "https://www.amazon.com/dp/ZZZ" };
    assert.equal(matchGearToLabel("Sunscreen", [junk]), null);
    assert.equal(matchGearToLabel("Travel kit", [junk]), null);
  });

  it("an empty shelf matches nothing without looking", () => {
    assert.equal(matchGearToLabel("Blech", []), null);
    assert.deepEqual(matchGearToItems([{ id: "a", label: "Blech" }], []), {});
  });
});

describe("when two products could fit, the more specific one wins", () => {
  const plain: GearLink = { id: "a", name: "Blech", url: "https://www.amazon.com/dp/AAA" };
  const specific: GearLink = { id: "b", name: "Shabbos blech cover", url: "https://www.amazon.com/dp/BBB" };

  it("prefers the match that used more of its own name", () => {
    assert.equal(matchGearToLabel("Shabbos blech cover", [plain, specific])?.gear.id, specific.id);
  });

  it("a single loose fit is still a fit — one adapter, one link", () => {
    assert.equal(matchGearToLabel("Adapter", SHELF)?.gear.id, adapter.id);
  });

  it("two products that fit equally well link neither", () => {
    // Two adapters on the shelf and a line that has not chosen between them.
    const euro: GearLink = { id: "euro", name: "European plug adapter", url: "https://www.amazon.com/dp/1" };
    const uk: GearLink = { id: "uk", name: "UK plug adapter", url: "https://www.amazon.com/dp/2" };
    assert.equal(matchGearToLabel("Plug adapter", [euro, uk]), null);
  });

  it("but a line specific enough to separate them still links", () => {
    const euro: GearLink = { id: "euro", name: "European plug adapter", url: "https://www.amazon.com/dp/1" };
    const uk: GearLink = { id: "uk", name: "UK plug adapter", url: "https://www.amazon.com/dp/2" };
    assert.equal(matchGearToLabel("European plug adapter", [euro, uk])?.gear.id, "euro");
  });

  it("a line naming the whole product beats a longer product containing it", () => {
    assert.equal(matchGearToLabel("Blech", [specific, plain])?.gear.id, plain.id);
  });
});

describe("matching a whole list", () => {
  it("keys only the items that actually matched", () => {
    const found = matchGearToItems(
      [
        { id: "a", label: "Travel blech" },
        { id: "b", label: "Sunscreen" },
        { id: "c", label: "Plug adapter" },
      ],
      SHELF,
    );
    assert.deepEqual(Object.keys(found).sort(), ["a", "c"]);
    assert.equal(found.a.url, blech.url);
    assert.equal(found.c.url, adapter.url);
  });
});
