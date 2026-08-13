import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  describeGearItem,
  describeGearItems,
  gearCtaFor,
  gearItemProblem,
  GEAR_IDEAS,
  gearListProblem,
  gearLooksUnfinished,
  gearShownToVisitors,
  MAX_GEAR_ITEMS,
  priceCheckedLabel,
  type TravelGearItem,
} from "@/lib/travel-gear";

/**
 * The Amazon travel-gear shelf.
 *
 * The one thing worth guarding beyond what travel-extras already checks: a
 * price cannot be saved without the date it was checked, because a price
 * with no age on it is exactly the kind of stale fact
 * docs/vacation-expansion.md already ruled out for the rest of the site.
 */

const item = (over: Partial<TravelGearItem> = {}): TravelGearItem => ({
  id: "g1",
  name: "Travel Shabbos blech",
  description: "Folds flat, fits a carry-on.",
  imageUrl: "",
  price: "",
  priceCheckedAt: "",
  url: "https://www.amazon.com/dp/B000EXAMPLE?tag=whiteglove-20",
  cta: "",
  ...over,
});

describe("what can be saved", () => {
  it("takes a name and a link with no price at all", () => {
    assert.equal(gearItemProblem(item()), null);
  });

  it("needs a name", () => {
    assert.match(gearItemProblem(item({ name: "  " }))!, /Give it a name/);
  });

  it("needs a link", () => {
    assert.match(gearItemProblem(item({ url: "" }))!, /Paste the Amazon/);
  });

  it("refuses something that is not a link", () => {
    assert.match(gearItemProblem(item({ url: "amazon.com/dp/x" }))!, /not a link/);
  });

  it("refuses a picture field that is not a link either", () => {
    assert.match(gearItemProblem(item({ imageUrl: "not-a-url" }))!, /picture field/);
  });

  it("a price with no checked date is refused — the one rule beyond travel-extras", () => {
    assert.match(gearItemProblem(item({ price: "$24.99", priceCheckedAt: "" }))!, /Set the date/);
  });

  it("a price WITH a checked date is fine", () => {
    assert.equal(gearItemProblem(item({ price: "$24.99", priceCheckedAt: "2026-08-01" })), null);
  });

  it("a checked date with no price is fine — nothing to date", () => {
    assert.equal(gearItemProblem(item({ price: "", priceCheckedAt: "2026-08-01" })), null);
  });
});

describe("what counts as unfinished", () => {
  it("a placeholder name is unfinished", () => {
    assert.match(gearLooksUnfinished(item({ name: "Item 1" }))!, /placeholder/);
  });

  it("no description is unfinished", () => {
    assert.match(gearLooksUnfinished(item({ description: "" }))!, /description/);
  });

  it("no price is unfinished — even a valid, saveable row should not show yet", () => {
    assert.match(gearLooksUnfinished(item())!, /price/);
  });

  it("a real name, description and priced item is finished", () => {
    assert.equal(gearLooksUnfinished(item({ price: "$24.99", priceCheckedAt: "2026-08-01" })), null);
  });
});

describe("the shelf as a whole", () => {
  it("drops unfinished rows from what a visitor sees", () => {
    const finished = item({ price: "$24.99", priceCheckedAt: "2026-08-01" });
    const unfinished = item({ id: "g2", name: "Plug adapter" }); // no price yet
    const shown = gearShownToVisitors([finished, unfinished]);
    assert.deepEqual(shown.map((i) => i.id), ["g1"]);
  });

  it("refuses two rows with the same name", () => {
    const a = item({ price: "$1", priceCheckedAt: "2026-08-01" });
    const b = item({ id: "g2", price: "$1", priceCheckedAt: "2026-08-01" });
    assert.match(gearListProblem([a, b])!, /twice/);
  });

  it("refuses more than MAX_GEAR_ITEMS", () => {
    const rows = Array.from({ length: MAX_GEAR_ITEMS + 1 }, (_, i) =>
      item({ id: `g${i}`, name: `Item ${i}`, price: "$1", priceCheckedAt: "2026-08-01" }),
    );
    assert.match(gearListProblem(rows)!, /more than/);
  });

  it("describeGearItems says the page is hidden when nothing is finished", () => {
    assert.match(describeGearItems([item()]), /hidden/);
  });

  it("describeGearItems counts what is actually shown", () => {
    const finished = item({ price: "$24.99", priceCheckedAt: "2026-08-01" });
    assert.match(describeGearItems([finished]), /One item is/);
  });

  it("describeGearItem explains a saved-but-unfinished row without refusing it", () => {
    assert.match(describeGearItem(item()), /Saved, but not shown/);
  });
});

describe("the price label", () => {
  it("is null with no price at all", () => {
    assert.equal(priceCheckedLabel(item()), null);
  });

  it("reads the bare price when there is no date to compare against", () => {
    assert.equal(priceCheckedLabel(item({ price: "$24.99" })), "$24.99");
  });

  it("says 'checked today' for today's date", () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    assert.equal(priceCheckedLabel(item({ price: "$24.99", priceCheckedAt: todayIso })), "$24.99 — checked today");
  });
});

describe("the button", () => {
  it("has a default that does not require the owner to type anything", () => {
    assert.equal(gearCtaFor(item()), "See it on Amazon →");
  });

  it("respects a custom label", () => {
    assert.equal(gearCtaFor(item({ cta: "Buy on Amazon" })), "Buy on Amazon");
  });
});

describe("suggestions", () => {
  it("are ideas, not a whitelist — anything can still be added", () => {
    assert.ok(GEAR_IDEAS.length > 0);
    assert.equal(gearItemProblem(item({ name: "Something not in the list" })), null);
  });
});

describe("reachable from the site", () => {
  const adminNav = readFileSync("lib/admin-nav.ts", "utf8");
  const siteSearch = readFileSync("lib/site-search-index.ts", "utf8");
  const adminSearch = readFileSync("lib/admin-search-index.ts", "utf8");

  it("has an admin nav entry", () => {
    assert.match(adminNav, /\/admin\/settings\/travel-gear/);
  });

  it("is in global site search", () => {
    assert.match(siteSearch, /"\/travel-gear"/);
  });

  it("is in admin search, mapped to its own settings screen — not the generic pages fallback", () => {
    assert.match(adminSearch, /doc\.href === "\/travel-gear"/);
  });

  it("the admin settings page exists and is gated by the access area, like the rest of /admin/settings", () => {
    const layout = readFileSync("app/admin/settings/layout.tsx", "utf8");
    assert.match(layout, /AreaGate area="access"/);
    assert.doesNotThrow(() => readFileSync("app/admin/settings/travel-gear/page.tsx", "utf8"));
  });
});
