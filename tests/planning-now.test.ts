import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  chipProblem,
  chipState,
  hasLapsed,
  isShowing,
  MAX_CHIPS,
  MAX_LABEL_CHARS,
  planningNow,
  sortForAdmin,
  type PlanningChip,
} from "@/data/planning-now";

const chip = (over: Partial<PlanningChip> = {}): PlanningChip => ({
  id: "c1",
  label: "Winter sun",
  href: "/destinations?season=winter",
  startsOn: "2026-10-01",
  endsOn: "2027-02-28",
  priority: 0,
  enabled: true,
  updatedAt: "2026-09-01T00:00:00.000Z",
  ...over,
});

describe("a chip only shows in its season", () => {
  it("shows inside its window, on both edges", () => {
    assert.equal(isShowing(chip(), "2026-10-01"), true, "the first day is inside the window");
    assert.equal(isShowing(chip(), "2027-02-28"), true, "the last day is inside the window");
    assert.equal(isShowing(chip(), "2026-12-25"), true);
  });

  it("DISAPPEARS ON ITS OWN once the date passes — nobody has to tidy it", () => {
    // The failure this prevents: "Pesach 2027" still on the homepage in June.
    assert.equal(isShowing(chip(), "2027-03-01"), false);
    assert.equal(hasLapsed(chip(), "2027-03-01"), true);
  });

  it("does not show before it starts", () => {
    assert.equal(isShowing(chip(), "2026-09-30"), false);
    assert.equal(hasLapsed(chip(), "2026-09-30"), false);
  });

  it("switched off means off, whatever the dates say", () => {
    assert.equal(isShowing(chip({ enabled: false }), "2026-12-25"), false);
  });
});

describe("what the row shows", () => {
  const today = "2026-12-25";

  it("is capped, so the row cannot become a carousel", () => {
    const many = Array.from({ length: 8 }, (_, i) => chip({ id: `c${i}`, label: `Chip ${i}`, priority: i }));
    assert.equal(planningNow(many, today).length, MAX_CHIPS);
  });

  it("puts the highest priority first", () => {
    const out = planningNow(
      [chip({ id: "a", label: "A", priority: 1 }), chip({ id: "b", label: "B", priority: 5 })],
      today,
    );
    assert.deepEqual(out.map((c) => c.label), ["B", "A"]);
  });

  it("breaks a tie on whichever season ends first", () => {
    const out = planningNow(
      [
        chip({ id: "a", label: "Later", endsOn: "2027-02-28" }),
        chip({ id: "b", label: "Sooner", endsOn: "2027-01-10" }),
      ],
      today,
    );
    assert.deepEqual(out.map((c) => c.label), ["Sooner", "Later"]);
  });

  it("IS EMPTY WHEN NOTHING IS IN SEASON, so the row can be left out entirely", () => {
    assert.deepEqual(planningNow([chip({ endsOn: "2026-11-01" })], today), []);
    assert.deepEqual(planningNow([], today), []);
  });

  it("never reports a count of results", () => {
    // A count that is wrong once is worse than no count: these lists change
    // underneath. The chip is a label and a link, and nothing else.
    const out = planningNow([chip()], today)[0];
    assert.deepEqual(Object.keys(out).sort(), [
      "enabled", "endsOn", "href", "id", "label", "priority", "startsOn", "updatedAt",
    ]);
  });
});

describe("what the owner may save", () => {
  it("wants a label short enough to fit a phone", () => {
    assert.match(String(chipProblem({ ...chip(), label: "" })), /label/i);
    assert.match(String(chipProblem({ ...chip(), label: "x".repeat(MAX_LABEL_CHARS + 1) })), /under/);
    assert.equal(chipProblem({ ...chip(), label: "Pesach 2027" }), null);
  });

  it("REFUSES A CHIP POINTING OFF THIS SITE", () => {
    // A chip on the homepage reads as the site's own shelf. Sending somebody
    // elsewhere under that promise is not the same as an outbound link they
    // chose to click.
    assert.match(String(chipProblem({ ...chip(), href: "https://example.com" })), /on this site/);
    assert.match(String(chipProblem({ ...chip(), href: "//example.com" })), /on this site/);
    assert.match(String(chipProblem({ ...chip(), href: "" })), /where the chip goes/);
    assert.equal(chipProblem({ ...chip(), href: "/destinations?kind=pesach" }), null);
  });

  it("insists on an end date, and on it being after the start", () => {
    assert.match(String(chipProblem({ ...chip(), endsOn: "" })), /stops showing/);
    assert.match(String(chipProblem({ ...chip(), startsOn: "" })), /starts showing/);
    assert.match(String(chipProblem({ ...chip(), startsOn: "2027-01-01", endsOn: "2026-01-01" })), /cannot stop before/);
  });
});

describe("what the owner sees in the admin", () => {
  const today = "2026-12-25";

  it("says the state in words, never in a colour alone", () => {
    assert.equal(chipState(chip(), today), "Showing");
    assert.equal(chipState(chip({ enabled: false }), today), "Off");
    assert.equal(chipState(chip({ startsOn: "2027-06-01", endsOn: "2027-08-01" }), today), "Waiting");
    assert.equal(chipState(chip({ endsOn: "2026-11-01" }), today), "Finished");
  });

  it("lists what is live first, and what has finished last", () => {
    const out = sortForAdmin(
      [
        chip({ id: "done", label: "Done", endsOn: "2026-11-01" }),
        chip({ id: "soon", label: "Soon", startsOn: "2027-06-01", endsOn: "2027-08-01" }),
        chip({ id: "live", label: "Live" }),
      ],
      today,
    );
    assert.deepEqual(out.map((c) => c.label), ["Live", "Soon", "Done"]);
  });

  it("keeps a lapsed chip rather than deleting it", () => {
    // The owner will want the same chip back next winter.
    const out = sortForAdmin([chip({ endsOn: "2026-11-01" })], today);
    assert.equal(out.length, 1);
  });
});

describe("the row stays secondary to the search", () => {
  it("sits below the hero and above Featured, and nothing moved above the search", () => {
    // AGENTS.md: the homepage opens on the search and nothing above it, and
    // Featured is the six sections. This row goes between them.
    const home = readFileSync("app/page.tsx", "utf8");
    const search = home.indexOf("home-hero-search");
    const row = home.indexOf("<PlanningNowRow");
    const featured = home.indexOf("HOME_CATEGORIES.map");
    assert.ok(search > -1 && row > -1 && featured > -1, "the homepage is missing one of the three");
    assert.ok(search < row, "the Planning now row was put above the search");
    assert.ok(row < featured, "the Planning now row was put below Featured");
  });

  it("renders nothing at all when nothing is in season", () => {
    // "Hide the complete row without leaving empty space" — so the component
    // returns null rather than an empty container with margins on it.
    assert.match(readFileSync("components/PlanningNowRow.tsx", "utf8"), /if \(chips\.length === 0\) return null;/);
  });
});
