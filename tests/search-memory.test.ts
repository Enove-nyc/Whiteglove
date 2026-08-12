import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  decodeMemory,
  encodeMemory,
  FILLABLE,
  fillValues,
  SEARCH_MEMORY_KEY,
  todayIso,
} from "@/lib/search-memory";
import { readStaySearch } from "@/lib/stay-search";

/**
 * Carrying a search from one page to the next.
 *
 * THE JOURNEY THIS IS FOR. Somebody types Rome, two dates and five people on
 * the front page. They land on /hotels, read which quarter to be in, open the
 * Rome page, decide a car is worth it, press Cars — and the car form asks for
 * the dates again. Every one of those is a place the journey ends, and the
 * site had the answer the whole time.
 *
 * THE RULE THAT MATTERS MOST is the stale one. A search made in March, filled
 * into a partner hand-off in July, sends a family to a booking site for dates
 * that have gone, and it looks like this site's fault rather than a stale
 * cache. A remembered check-in that has passed is dropped, and that is what
 * most of this file is about.
 *
 * AND THE RULE THAT IS NOT ABOUT CONVENIENCE AT ALL: what may be remembered is
 * a place, two dates and a head count. Nothing about how somebody keeps. The
 * planning flow asks about kosher standards and Shabbos requirements in order
 * to do the trip's work; a stored profile of religious practice is not
 * something this site keeps so it can fill a date field faster.
 */

const LIB = readFileSync("lib/search-memory.ts", "utf8");
const COMPONENT = readFileSync("components/SearchMemory.tsx", "utf8");

const search = (over: Partial<ReturnType<typeof readStaySearch>> = {}) => ({
  ...readStaySearch({ destination: "Rome", in: "2026-09-01", out: "2026-09-08" }),
  ...over,
});

describe("what may be remembered", () => {
  it("FILLS A PLACE AND TWO DATES, AND NOTHING ELSE", () => {
    // Asserted against the allow-list rather than against a component, so it
    // survives the filling being rewritten.
    //
    // No party size: every form renders "2 adults, 1 room" as its own default,
    // so those fields are never empty, and filling them would mean overwriting
    // a value already on the screen. Measured in a browser before it was cut —
    // the destination and the dates are the fields actually blank on arrival.
    assert.deepEqual([...FILLABLE], ["destination", "in", "out"]);
  });

  it("CARRIES NO RELIGIOUS PREFERENCE, in the field list or in the code", () => {
    const sensitive = /kosher|shabbos|shabbat|hechsher|minyan|mikva|kashrus|heritage|kever/i;
    for (const field of FILLABLE) assert.doesNotMatch(field, sensitive, field);
    // Comments left in: this file's own reasoning names them in order to say
    // they are not carried, which is worth keeping.
    const code = LIB.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    assert.doesNotMatch(code, sensitive, "the memory module reaches for a religious preference");
    const componentCode = COMPONENT.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    assert.doesNotMatch(componentCode, sensitive);
  });

  it("stores one vocabulary, the same one the URL and /go use", () => {
    assert.equal(encodeMemory(search()), "destination=Rome&in=2026-09-01&out=2026-09-08");
    assert.doesNotMatch(LIB, /JSON\.stringify/, "a second shape to keep in step with the first");
  });

  it("round-trips through storage", () => {
    const original = search({ adults: 3, children: 2, rooms: 2 });
    assert.deepEqual(decodeMemory(encodeMemory(original), "2026-01-01"), original);
  });

  it("versions the key, so a shape change cannot be read as data", () => {
    assert.match(SEARCH_MEMORY_KEY, /\.v\d+$/);
  });
});

describe("a date that has passed is not filled in", () => {
  it("DROPS A CHECK-IN THAT HAS GONE, AND THE CHECK-OUT WITH IT", () => {
    // The failure this whole module is written around. Half a range is worse
    // than none: it opens the partner on one date and asks for the other.
    const stale = decodeMemory(encodeMemory(search()), "2026-12-01");
    assert.ok(stale);
    assert.equal(stale.checkIn, "");
    assert.equal(stale.checkOut, "");
    // The destination survives — Rome does not go out of date.
    assert.equal(stale.destination, "Rome");
  });

  it("DROPS BOTH DATES MID-TRIP rather than keeping half a range", () => {
    // Today falls inside the remembered stay. The check-in has gone, and a
    // partner cannot be opened on a check-in that has gone, so the whole range
    // goes. Half a range is worse than none: it opens the partner on one date
    // and asks for the other.
    const straddling = decodeMemory("destination=Rome&in=2026-09-01&out=2026-09-08", "2026-09-05");
    assert.equal(straddling?.checkIn, "");
    assert.equal(straddling?.checkOut, "");
    assert.equal(straddling?.destination, "Rome");
  });

  it("keeps a range that is still ahead, including the day itself", () => {
    const fresh = decodeMemory(encodeMemory(search()), "2026-09-01");
    assert.equal(fresh?.checkIn, "2026-09-01");
    assert.equal(fresh?.checkOut, "2026-09-08");
  });

  it("REMEMBERS NOTHING AT ALL when only stale dates were stored", () => {
    // No destination and no usable dates is not a memory, and filling a form
    // with "2 adults, 1 room" is noise rather than help.
    assert.equal(decodeMemory("in=2026-09-01&out=2026-09-08", "2026-12-01"), null);
    assert.equal(decodeMemory("", "2026-01-01"), null);
    assert.equal(decodeMemory(null, "2026-01-01"), null);
  });

  it("survives a hand-edited or corrupted store", () => {
    assert.equal(decodeMemory("%%%", "2026-01-01"), null);
    assert.equal(decodeMemory("destination=Rome&adults=nonsense", "2026-01-01")?.adults, 2);
    // The clamping is the URL reader's, not a second copy of it.
    assert.equal(decodeMemory("destination=Rome&adults=400", "2026-01-01")?.adults, 30);
  });

  it("spells today the way a date input does", () => {
    assert.equal(todayIso(new Date("2026-08-10T23:30:00Z")), "2026-08-10");
  });
});

describe("what actually gets written into a field", () => {
  it("writes the destination and the dates", () => {
    const values = fillValues(search());
    assert.equal(values.destination, "Rome");
    assert.equal(values.in, "2026-09-01");
    assert.equal(values.out, "2026-09-08");
  });

  it("STILL STORES THE PARTY SIZE even though nothing fills it", () => {
    // The store is the search as the URL spells it. Keeping a second, narrower
    // shape here is how two formats drift apart.
    assert.match(encodeMemory(search({ adults: 5 })), /adults=5/);
    assert.equal(decodeMemory(encodeMemory(search({ adults: 5 })), "2026-01-01")?.adults, 5);
  });
});

describe("it is an enhancement, never a dependency", () => {
  it("FILLS EMPTY FIELDS ONLY", () => {
    // A field the server filled — the destination on a destination page, a
    // date carried in the URL — is the more specific answer.
    assert.match(COMPONENT, /if \(input\.value\) continue;/);
  });

  it("TOUCHES ONLY FORMS THAT ASKED FOR IT", () => {
    assert.match(COMPONENT, /form\[data-search-memory\]/);
    for (const file of ["components/StaySearchForm.tsx", "components/PartnerSearchForm.tsx"]) {
      assert.match(readFileSync(file, "utf8"), /data-search-memory=""/, `${file} did not opt in`);
    }
  });

  it("KEEPS THE FORMS PLAIN HTML, which is the money path's guarantee", () => {
    // Making them controlled to support a convenience would trade a guarantee
    // for a garnish: they submit before hydration and with scripts blocked.
    for (const file of ["components/StaySearchForm.tsx", "components/PartnerSearchForm.tsx"]) {
      const source = readFileSync(file, "utf8");
      assert.doesNotMatch(source, /"use client"/, `${file} became a client component`);
      assert.doesNotMatch(source, /useState/, `${file} became controlled`);
    }
  });

  it("renders nothing and survives storage being unavailable", () => {
    // localStorage throws in a locked-down browser and in private mode on some
    // phones. A failure has to mean empty fields, not a broken page.
    assert.match(COMPONENT, /return null;/);
    const tries = COMPONENT.match(/try \{/g) ?? [];
    assert.ok(tries.length >= 2, "an unguarded localStorage access");
  });

  it("writes the new search before it reads the old one", () => {
    // Or the search somebody just made loses to the one they made last week.
    const write = COMPONENT.indexOf("setItem");
    const read = COMPONENT.indexOf("getItem");
    assert.ok(write > 0 && read > 0 && write < read);
  });

  it("is mounted where searches are made and answered", () => {
    // /cars and /flights carried it too and are gone — both searches are tabs
    // on /book now. Search memory is form draft, not a saved trip.
    for (const page of ["app/page.tsx", "app/hotels/page.tsx"]) {
      assert.match(readFileSync(page, "utf8"), /<SearchMemory/, `${page} does not carry the search`);
    }
    // And /hotels is the one that has a search to write down.
    assert.match(readFileSync("app/hotels/page.tsx", "utf8"), /remember=\{searching \? search : undefined\}/);
  });
});
