import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SPOTLIGHT_KEYS,
  isOpen,
  isSpotlightKey,
  openSpotlight,
  sortForAdmin,
  windowProblem,
  type SeasonalWindow,
} from "@/data/seasonal-spotlight";
import { derivedWindows, nextYomTov } from "@/lib/seasonal-calendar";
import { mergeWindows } from "@/lib/seasonal-windows-store";
import { spotlightFrom } from "@/lib/seasonal-spotlight-view";
import type { VacationDestinationItem } from "@/lib/vacation-destinations-view";
import { codeOf } from "./helpers/source";

const TODAY = "2026-08-26";

const window = (over: Partial<SeasonalWindow> = {}): SeasonalWindow => ({
  key: "pesach",
  startsOn: "2026-08-01",
  endsOn: "2026-09-30",
  active: true,
  featured: false,
  note: "",
  ...over,
});

/** Only the two fields the spotlight reads are needed. */
const destination = (bestFor: string[]) => ({ bestFor } as unknown as VacationDestinationItem);

describe("when a seasonal prompt is open", () => {
  it("is shut before it starts and after it ends", () => {
    assert.equal(isOpen(window(), "2026-07-31"), false);
    assert.equal(isOpen(window(), "2026-08-01"), true);
    assert.equal(isOpen(window(), "2026-09-30"), true);
    assert.equal(isOpen(window(), "2026-10-01"), false);
  });

  it("is shut whatever the dates say when it is switched off", () => {
    assert.equal(isOpen(window({ active: false }), TODAY), false);
  });

  it("is shut when it has no dates at all — the yeshiva week row before anybody fills it in", () => {
    assert.equal(isOpen(window({ startsOn: "", endsOn: "", active: true }), TODAY), false);
  });
});

describe("which prompt shows", () => {
  const plenty = () => true;

  it("nothing, when nothing is open — which is most of the year", () => {
    assert.equal(openSpotlight([window({ startsOn: "2027-01-01", endsOn: "2027-03-01" })], TODAY, plenty), null);
  });

  it("one, never a row of them", () => {
    const open = [window({ key: "pesach" }), window({ key: "sukkos" })];
    const chosen = openSpotlight(open, TODAY, plenty);
    assert.ok(chosen);
    assert.equal(typeof chosen.key, "string");
  });

  it("featured wins over the one closing soonest", () => {
    const chosen = openSpotlight(
      [window({ key: "pesach", endsOn: "2026-08-27" }), window({ key: "sukkos", featured: true, endsOn: "2026-12-01" })],
      TODAY,
      plenty,
    );
    assert.equal(chosen?.key, "sukkos");
  });

  it("otherwise the one with the least time left", () => {
    const chosen = openSpotlight(
      [window({ key: "pesach", endsOn: "2026-12-01" }), window({ key: "sukkos", endsOn: "2026-08-27" })],
      TODAY,
      plenty,
    );
    assert.equal(chosen?.key, "sukkos");
  });

  it("nothing at all when the category is empty, however open the window is", () => {
    // A prompt leading to an empty filter costs the traveler a click to be
    // told nothing. This is the rule that stops it.
    assert.equal(openSpotlight([window({ featured: true })], TODAY, () => false), null);
  });
});

describe("the category has to have destinations behind it", () => {
  it("counts only what a destination says in its own words", () => {
    const open = [window({ key: "pesach" })];
    const one = [destination(["Pesach programmes"])];
    const two = [destination(["Pesach programmes"]), destination(["Families", "Pesach"])];
    assert.equal(spotlightFrom(open, one, TODAY), null, "one destination is not a category");
    assert.equal(spotlightFrom(open, two, TODAY)?.key, "pesach");
  });

  it("never counts a destination that says nothing about Yom Tov", () => {
    const open = [window({ key: "sukkos" })];
    assert.equal(spotlightFrom(open, [destination(["Families"]), destination(["Couples"])], TODAY), null);
  });
});

describe("the dates come from the Jewish calendar", () => {
  it("finds Pesach and Sukkos where they actually fall", () => {
    assert.equal(nextYomTov("pesach", "2026-08-26"), "2027-04-22");
    assert.equal(nextYomTov("sukkos", "2027-01-01"), "2027-10-16");
  });

  it("opens a run-up before Yom Tov and closes with it", () => {
    const pesach = derivedWindows("2027-01-01").find((w) => w.key === "pesach");
    assert.ok(pesach);
    assert.ok(pesach.startsOn < "2027-04-22", "the window opens before Yom Tov");
    assert.ok(pesach.endsOn > "2027-04-22", "the window closes after it, not before");
    assert.equal(pesach.derived, true);
  });

  it("still finds a Yom Tov that has already started", () => {
    // Second day of Pesach: the next one is a year off, and a window that only
    // looked forward would have shut at the moment it mattered most.
    const during = derivedWindows("2027-04-23").find((w) => w.key === "pesach");
    assert.ok(during && isOpen(during, "2027-04-23"), "the window shut during Yom Tov");
  });

  it("invents nothing for yeshiva week, because it is not a date anybody can compute", () => {
    assert.deepEqual(derivedWindows(TODAY).map((w) => w.key).sort(), ["pesach", "sukkos"]);
  });
});

describe("the owner's windows sit over the calendar's", () => {
  it("replaces the derived one entirely", () => {
    const merged = mergeWindows([window({ key: "pesach", startsOn: "2026-01-01", endsOn: "2026-12-31" })], TODAY);
    const pesach = merged.find((w) => w.key === "pesach");
    assert.equal(pesach?.startsOn, "2026-01-01");
    assert.equal(pesach?.derived, false);
  });

  it("hands back a row for every key, so yeshiva week can be filled in", () => {
    const merged = mergeWindows([], TODAY);
    assert.deepEqual(merged.map((w) => w.key), [...SPOTLIGHT_KEYS]);
    const yeshiva = merged.find((w) => w.key === "yeshiva-week");
    assert.equal(yeshiva?.startsOn, "");
    assert.equal(yeshiva?.active, false);
  });
});

describe("what the owner is asked for", () => {
  it("refuses a window with no dates, or one that ends before it starts", () => {
    assert.match(windowProblem({ startsOn: "", endsOn: "2026-09-01" }) ?? "", /starts/);
    assert.match(windowProblem({ startsOn: "2026-09-01", endsOn: "" }) ?? "", /stops/);
    assert.match(windowProblem({ startsOn: "2026-09-01", endsOn: "2026-08-01" }) ?? "", /cannot stop before/);
    assert.equal(windowProblem({ startsOn: "2026-08-01", endsOn: "2026-09-01" }), null);
  });

  it("only recognises the three keys", () => {
    assert.equal(isSpotlightKey("pesach"), true);
    assert.equal(isSpotlightKey("summer"), false);
    assert.equal(isSpotlightKey(""), false);
  });

  it("sorts what is showing to the top of his list", () => {
    const rows = sortForAdmin(
      [
        window({ key: "yeshiva-week", startsOn: "2027-01-01", endsOn: "2027-02-01" }),
        window({ key: "pesach", startsOn: "2025-01-01", endsOn: "2025-02-01" }),
        window({ key: "sukkos" }),
      ],
      TODAY,
    );
    assert.deepEqual(rows.map((r) => r.key), ["sukkos", "yeshiva-week", "pesach"]);
  });
});

describe("what it may say to a traveler", () => {
  it("names no programme, no price and no availability", () => {
    // The lines a visitor actually reads: the built-in copy, and the component
    // that renders it. Somebody else's programme is not this site's to
    // describe, and it has no prices of its own to quote here.
    const source = codeOf("data/seasonal-spotlight.ts");
    const copy = source.slice(source.indexOf("SPOTLIGHT_COPY"), source.indexOf("SPOTLIGHT_LABEL")) +
      codeOf("components/SeasonalSpotlight.tsx");
    assert.doesNotMatch(copy, /\$\d|price|book by|availab|sold out|deposit|per person/i);
  });

  it("takes no permanent space — nothing open means nothing rendered", () => {
    assert.match(codeOf("components/SeasonalSpotlight.tsx"), /if \(!window\) return null/);
  });
});
