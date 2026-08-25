import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * ONE ACTION, ONE NAME — and there are two actions here, not one.
 *
 * A ROUTE is the order you drive places in, with the driving worked out
 * between them (/my-route). AN ITINERARY is the day-by-day plan (/itinerary).
 * They are separate features and both buttons are meant to exist; what had
 * drifted was their wording. Six spellings were live at once — "Add to my
 * trip", "Add to trip", "Add to my itinerary", "Add to Route", "Add to my
 * route", "Add hotel to My Route" — so the same action read as a different
 * one on each page.
 *
 * The route wording is settled by the site itself: MyRouteDashboard tells a
 * visitor to "Use Add to Route on any of them", so any surface offering "Add
 * to my route" contradicts the site's own instructions.
 */

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (path.endsWith(".tsx")) out.push(path);
  }
  return out;
}

const FILES = [...sourceFiles("app"), ...sourceFiles("components")];

/** Every label passed to one of the two add buttons, with its file. */
function labels(): Array<{ file: string; label: string }> {
  const found: Array<{ file: string; label: string }> = [];
  for (const file of FILES) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/label=\{?"(Add[^"]*)"/g)) {
      found.push({ file, label: match[1] });
    }
  }
  return found;
}

describe("the two add actions each have one name", () => {
  it("nothing says 'Add to my route' — the site's own help says 'Add to Route'", () => {
    const wrong = labels().filter((l) => /add to my route/i.test(l.label));
    assert.deepEqual(wrong.map((l) => `${l.file}: ${l.label}`), []);
  });

  it("no bespoke route wording per listing kind", () => {
    // "Add hotel to My Route" and "Add flight to My Route" were two more
    // names for the button the traveller had already learned.
    const wrong = labels().filter((l) => /route/i.test(l.label) && l.label !== "Add to Route");
    assert.deepEqual(wrong.map((l) => `${l.file}: ${l.label}`), []);
  });

  it("the itinerary action says itinerary, not trip", () => {
    // AGENTS.md's one-name-per-thing table: the feature is the itinerary
    // planner, so the action that fills it says so.
    const wrong = labels().filter((l) => /^Add to (my )?trip$/i.test(l.label));
    assert.deepEqual(wrong.map((l) => `${l.file}: ${l.label}`), []);
  });
});

describe("the same kinds of listing can all be added", () => {
  const usesButton = (file: string) =>
    /AddToItineraryButton|useAddToItinerary|DetailActionRow/.test(readFileSync(file, "utf8"));

  for (const [what, file] of [
    ["kosher food", "components/EateryDirectory.tsx"],
    ["things to do", "components/AttractionDirectory.tsx"],
    ["where to stay", "components/KosherStayDirectory.tsx"],
    ["shuls", "app/shuls/page.tsx"],
    ["mikvaos", "app/mikvaos/page.tsx"],
  ] as const) {
    it(`${what} carries the add button`, () => {
      assert.ok(usesButton(file), `${file} lists places a traveller cannot put on their trip`);
    });
  }

  it("a stay goes on the trip anchored to its quarter, since it has no address of its own", () => {
    const stays = readFileSync("components/KosherStayDirectory.tsx", "utf8");
    assert.match(stays, /coordinates: s\.anchor\.coordinates/);
  });
});

describe("the work still lives in one place", () => {
  it("no page re-implements adding a stop", () => {
    // Three surfaces once had three implementations and two of them wrote a
    // stale browser copy over the account. Everything goes through the hook.
    const rogue = FILES.filter((file) => {
      const source = readFileSync(file, "utf8");
      if (/useAddToItinerary|ItineraryBuilder|SmartImport/.test(source)) return false;
      return /AddToItineraryButton/.test(source) && /fetch\("\/api\/account\/itinerary"/.test(source);
    });
    assert.deepEqual(rogue, []);
  });
});
