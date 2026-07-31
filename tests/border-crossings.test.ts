import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BUILT_IN_CROSSINGS } from "@/data/border-crossings";
import {
  STALE_AFTER_DAYS,
  borderAdvice,
  borderKey,
  bordersCovered,
  bordersNeedingACheck,
  builtInCrossings,
  checkAge,
  crossingIdFrom,
  crossingProblem,
  crossingsBetween,
  describeCrossing,
  mergeCrossings,
  type Crossing,
} from "@/lib/border-crossings";
import { borderCrossings } from "@/lib/borders";

/**
 * The data behind the border warnings.
 *
 * The route planner already said "allow several hours" whenever a route left
 * the Schengen area. That came from one rule and nothing else: it could not
 * say which crossing, could not be corrected when one shut, and could not be
 * improved by the person who actually rings ahead.
 *
 * The thing that must not break: a queue length written down in March must not
 * still be quoted in August as though somebody had just looked. Everything
 * here about dates exists for that.
 */

const TODAY = "2026-07-31";

function on(daysAgo: number): string {
  const date = new Date(Date.parse(`${TODAY}T00:00:00Z`) - daysAgo * 86_400_000);
  return date.toISOString().slice(0, 10);
}

describe("the crossings that ship with the site", () => {
  it("covers the leg this site is actually about", () => {
    const polandUkraine = crossingsBetween("Poland", "Ukraine", builtInCrossings(), TODAY);
    assert.ok(polandUkraine.length >= 5, `expected several Poland–Ukraine crossings, got ${polandUkraine.length}`);
    assert.ok(polandUkraine.some((c) => /Korczowa/.test(c.name)));
    assert.ok(polandUkraine.some((c) => /Medyka/.test(c.name)));
  });

  it("has a stable id and two real towns on every one", () => {
    const ids = new Set<string>();
    for (const crossing of BUILT_IN_CROSSINGS) {
      assert.ok(crossing.id, `${crossing.name} has no id`);
      assert.ok(!ids.has(crossing.id), `duplicate id ${crossing.id}`);
      ids.add(crossing.id);
      assert.equal(crossing.towns.length, 2, `${crossing.name} needs a town on each side`);
      assert.notEqual(crossing.countries[0], crossing.countries[1], `${crossing.name} joins one country to itself`);
    }
  });

  it("claims nothing about queues or opening", () => {
    // The whole design: what moves is not written into the code, because
    // nobody could correct it there.
    for (const crossing of builtInCrossings()) {
      assert.equal(crossing.state, undefined, `${crossing.name} ships with a state`);
      assert.equal(crossing.wait, undefined, `${crossing.name} ships with a wait`);
      assert.equal(crossing.checkedAt, undefined, `${crossing.name} ships as checked`);
    }
  });
});

describe("one border, either direction", () => {
  it("is the same border read backwards", () => {
    assert.equal(borderKey("Poland", "Ukraine"), borderKey("Ukraine", "Poland"));
    assert.equal(borderKey(" poland ", "UKRAINE"), borderKey("Poland", "Ukraine"));
  });

  it("finds the crossings whichever way the route runs", () => {
    const all = builtInCrossings();
    const there = crossingsBetween("Poland", "Ukraine", all, TODAY).map((c) => c.id);
    const back = crossingsBetween("Ukraine", "Poland", all, TODAY).map((c) => c.id);
    assert.deepEqual(there, back);
  });

  it("is empty for a border nobody has recorded", () => {
    assert.deepEqual(crossingsBetween("Poland", "Israel", builtInCrossings(), TODAY), []);
  });
});

describe("laying the owner's record over the built-in list", () => {
  it("keeps the crossing and adds what was checked", () => {
    const merged = mergeCrossings(BUILT_IN_CROSSINGS, [
      { id: "pl-ua-medyka-shehyni", state: "slow", wait: "about three hours", checkedAt: on(2) },
    ]);
    const medyka = merged.find((c) => c.id === "pl-ua-medyka-shehyni")!;
    assert.equal(medyka.state, "slow");
    assert.equal(medyka.wait, "about three hours");
    assert.equal(medyka.towns[0], "Medyka", "the built-in facts survive");
  });

  it("lets a correction win over what ships", () => {
    const merged = mergeCrossings(BUILT_IN_CROSSINGS, [
      { id: "pl-ua-medyka-shehyni", name: "Medyka (Przemyśl)", note: "Ask for the coach lane." },
    ]);
    const medyka = merged.find((c) => c.id === "pl-ua-medyka-shehyni")!;
    assert.equal(medyka.name, "Medyka (Przemyśl)");
    assert.equal(medyka.note, "Ask for the coach lane.");
  });

  it("takes a crossing the owner added", () => {
    const merged = mergeCrossings(BUILT_IN_CROSSINGS, [
      { id: "made-up", countries: ["Poland", "Ukraine"], name: "Somewhere new", towns: ["A", "B"] },
    ]);
    const added = merged.find((c) => c.id === "made-up")!;
    assert.equal(added.added, true);
    assert.ok(crossingsBetween("Poland", "Ukraine", merged, TODAY).some((c) => c.id === "made-up"));
  });

  it("drops a half-written addition rather than showing it", () => {
    // No countries means it belongs to no border and would sit in the admin
    // list doing nothing but confusing somebody.
    const merged = mergeCrossings(BUILT_IN_CROSSINGS, [{ id: "half", name: "Half a crossing" }]);
    assert.equal(merged.find((c) => c.id === "half"), undefined);
  });

  it("hides one the owner took out, without forgetting it", () => {
    const merged = mergeCrossings(BUILT_IN_CROSSINGS, [{ id: "pl-by-terespol-brest", hidden: true }]);
    assert.equal(merged.find((c) => c.id === "pl-by-terespol-brest")?.hidden, true);
    assert.deepEqual(crossingsBetween("Poland", "Belarus", merged, TODAY), []);
  });

  it("clears a check when the record no longer has one", () => {
    // Otherwise clearing a stale queue length in the admin would leave it on
    // screen, which is the exact failure this file is about.
    const merged = mergeCrossings(BUILT_IN_CROSSINGS, [{ id: "pl-ua-medyka-shehyni", note: "x" }]);
    assert.equal(merged.find((c) => c.id === "pl-ua-medyka-shehyni")?.state, undefined);
  });
});

describe("how old a check is", () => {
  it("says so plainly for a recent one", () => {
    assert.deepEqual(checkAge(on(0), TODAY), { checked: true, fresh: true, says: "Checked today." });
    assert.deepEqual(checkAge(on(1), TODAY), { checked: true, fresh: true, says: "Checked yesterday." });
    assert.equal(checkAge(on(5), TODAY).says, "Checked 5 days ago.");
  });

  it("stops calling it current after a month", () => {
    assert.equal(checkAge(on(STALE_AFTER_DAYS), TODAY).fresh, true);
    assert.equal(checkAge(on(STALE_AFTER_DAYS + 1), TODAY).fresh, false);
    assert.match(checkAge(on(90), TODAY).says, /months ago/);
  });

  it("gives the date itself once it is over a year old", () => {
    assert.match(checkAge("2024-03-04", TODAY).says, /2024-03-04/);
  });

  it("says nobody has looked when nobody has", () => {
    assert.deepEqual(checkAge(undefined, TODAY), { checked: false, fresh: false, says: "Nobody has checked this one." });
    assert.equal(checkAge("not a date", TODAY).checked, false);
  });

  it("treats a date in the future as today rather than throwing it away", () => {
    // A mistyped year should not silently drop the only information there is.
    assert.equal(checkAge("2027-01-01", TODAY).fresh, true);
  });
});

describe("which crossing to try first", () => {
  const all = (rows: Parameters<typeof mergeCrossings>[1]) => mergeCrossings(BUILT_IN_CROSSINGS, rows);

  it("puts one somebody found open at the top", () => {
    const list = crossingsBetween(
      "Poland",
      "Ukraine",
      all([{ id: "pl-ua-zosin-ustyluh", state: "open", wait: "twenty minutes", checkedAt: on(1) }]),
      TODAY,
    );
    assert.equal(list[0].id, "pl-ua-zosin-ustyluh");
  });

  it("puts one somebody found queueing above ones nobody has looked at", () => {
    // Three hours at Korczowa is an answer somebody can plan around. "Nobody
    // has looked at Budomierz" is not, however hopeful it sounds.
    const list = crossingsBetween(
      "Poland",
      "Ukraine",
      all([{ id: "pl-ua-korczowa-krakovets", state: "slow", wait: "three hours", checkedAt: on(1) }]),
      TODAY,
    );
    assert.equal(list[0].id, "pl-ua-korczowa-krakovets");
  });

  it("puts one somebody found shut at the bottom", () => {
    const list = crossingsBetween(
      "Poland",
      "Ukraine",
      all([{ id: "pl-ua-korczowa-krakovets", state: "closed", checkedAt: on(1) }]),
      TODAY,
    );
    assert.equal(list[list.length - 1].id, "pl-ua-korczowa-krakovets");
  });

  it("ignores a check that has gone stale", () => {
    // A crossing found open in March must not outrank one nobody has checked;
    // "open" from four months ago is not information.
    const stale = crossingsBetween(
      "Poland",
      "Ukraine",
      all([{ id: "pl-ua-zosin-ustyluh", state: "open", checkedAt: on(120) }]),
      TODAY,
    );
    assert.notEqual(stale[0].id, "pl-ua-zosin-ustyluh");
  });

  it("prefers one that takes coaches when nothing has been checked", () => {
    const list = crossingsBetween("Poland", "Ukraine", builtInCrossings(), TODAY);
    assert.equal(list[0].coaches, true);
  });
});

describe("what a crossing says", () => {
  it("quotes a fresh check with its date", () => {
    const [crossing] = crossingsBetween(
      "Slovakia",
      "Ukraine",
      mergeCrossings(BUILT_IN_CROSSINGS, [
        { id: "sk-ua-vysne-nemecke-uzhhorod", state: "slow", wait: "two hours for a coach", checkedAt: on(3) },
      ]),
      TODAY,
    );
    const said = describeCrossing(crossing, TODAY);
    assert.match(said, /queueing/);
    assert.match(said, /two hours for a coach/);
    assert.match(said, /Checked 3 days ago/);
  });

  it("will not repeat a stale queue length", () => {
    const [crossing] = crossingsBetween(
      "Slovakia",
      "Ukraine",
      mergeCrossings(BUILT_IN_CROSSINGS, [
        { id: "sk-ua-vysne-nemecke-uzhhorod", state: "slow", wait: "two hours for a coach", checkedAt: on(200) },
      ]),
      TODAY,
    );
    const said = describeCrossing(crossing, TODAY);
    assert.doesNotMatch(said, /two hours/, "a six-month-old queue length must not be quoted");
    assert.match(said, /check(ing)? again/i);
  });

  it("says nobody has looked when nobody has", () => {
    const [crossing] = crossingsBetween("Slovakia", "Ukraine", builtInCrossings(), TODAY);
    assert.match(describeCrossing(crossing, TODAY), /Nobody has checked this one/);
  });
});

describe("what the route is told about a border", () => {
  it("says the same thing about an external border whether or not anything is checked", () => {
    const bare = borderAdvice({ from: "Poland", to: "Ukraine", major: true, all: [], today: TODAY });
    const full = borderAdvice({ from: "Poland", to: "Ukraine", major: true, all: builtInCrossings(), today: TODAY });
    assert.equal(bare.headline, full.headline);
    assert.match(bare.headline, /allow several hours/);
    assert.equal(bare.latest, undefined);
    assert.equal(full.latest, undefined, "shipping a crossing is not the same as checking it");
  });

  it("adds what was found when somebody has looked", () => {
    const advice = borderAdvice({
      from: "Poland",
      to: "Ukraine",
      major: true,
      all: mergeCrossings(BUILT_IN_CROSSINGS, [
        { id: "pl-ua-korczowa-krakovets", state: "open", wait: "under an hour", checkedAt: on(2) },
      ]),
      today: TODAY,
    });
    assert.match(advice.latest ?? "", /Korczowa/);
    assert.match(advice.latest ?? "", /under an hour/);
  });

  it("says so when every crossing checked was shut", () => {
    const advice = borderAdvice({
      from: "Poland",
      to: "Belarus",
      major: true,
      all: mergeCrossings(BUILT_IN_CROSSINGS, [{ id: "pl-by-terespol-brest", state: "closed", checkedAt: on(1) }]),
      today: TODAY,
    });
    assert.match(advice.latest ?? "", /closed/);
    assert.match(advice.latest ?? "", /ringing first/);
  });

  it("is quiet about an internal border", () => {
    const advice = borderAdvice({ from: "Poland", to: "Czechia", major: false, all: builtInCrossings(), today: TODAY });
    assert.match(advice.headline, /drive-through/);
  });
});

describe("the route planner using it", () => {
  const stops = [
    { name: "Lizhensk", address: "Górna 16, 37-300 Leżajsk, Poland" },
    { name: "Uman", address: "Pushkina St 27A, Uman, Cherkasy Oblast, Ukraine, 20300" },
  ];

  it("still works with nothing passed in", () => {
    // Every caller that only wants to know a border is there.
    const [crossing] = borderCrossings(stops);
    assert.equal(crossing.from, "Poland");
    assert.equal(crossing.advice, undefined);
    assert.match(crossing.message, /allow several hours/);
  });

  it("carries the crossings when they are passed in", () => {
    const [crossing] = borderCrossings(stops, { crossings: builtInCrossings(), today: TODAY });
    assert.ok((crossing.advice?.crossings.length ?? 0) >= 5);
    assert.equal(crossing.advice?.major, true);
  });
});

describe("what the admin will not accept", () => {
  it("refuses a check with no date", () => {
    // The failure this whole file exists to avoid: it would be shown as
    // current forever.
    assert.match(crossingProblem({ state: "open" }) ?? "", /date you checked/);
    assert.equal(crossingProblem({ state: "open", checkedAt: "2026-07-30" }), null);
  });

  it("refuses a date that is not one", () => {
    assert.match(crossingProblem({ checkedAt: "last tuesday" }) ?? "", /does not look right/);
  });

  it("accepts an untouched built-in crossing", () => {
    assert.equal(crossingProblem({}), null);
  });

  it("makes a new crossing say what and where it is", () => {
    assert.match(crossingProblem({ added: true }) ?? "", /name/);
    assert.match(crossingProblem({ added: true, name: "X" }) ?? "", /two countries/);
    assert.match(crossingProblem({ added: true, name: "X", countries: ["Poland", "Poland"] }) ?? "", /same country/);
    assert.match(crossingProblem({ added: true, name: "X", countries: ["Poland", "Ukraine"] }) ?? "", /town/);
    assert.equal(
      crossingProblem({ added: true, name: "X", countries: ["Poland", "Ukraine"], towns: ["A", "B"] }),
      null,
    );
  });

  it("makes an id out of a name, accents and all", () => {
    assert.equal(crossingIdFrom("Vyšné Nemecké – Uzhhorod"), "vysne-nemecke-uzhhorod");
    assert.equal(crossingIdFrom("Záhony – Chop"), "zahony-chop");
  });
});

describe("where to look next", () => {
  it("groups the crossings by border", () => {
    const groups = bordersCovered(builtInCrossings());
    const polandUkraine = groups.find((g) => borderKey(g.countries[0], g.countries[1]) === borderKey("Poland", "Ukraine"));
    assert.ok(polandUkraine);
    assert.ok(polandUkraine!.crossings.length >= 5);
  });

  it("names every border with nothing checked on it lately", () => {
    const needing = bordersNeedingACheck(builtInCrossings(), TODAY);
    assert.ok(needing.some((border) => /Poland/.test(border) && /Ukraine/.test(border)));
  });

  it("stops naming one as soon as a crossing on it is checked", () => {
    const checked = mergeCrossings(BUILT_IN_CROSSINGS, [
      { id: "pl-ua-korczowa-krakovets", state: "open", checkedAt: on(1) },
    ]);
    const needing = bordersNeedingACheck(checked, TODAY);
    assert.ok(!needing.some((border) => /Poland/.test(border) && /Ukraine/.test(border)));
  });

  it("counts a hidden crossing as no cover at all", () => {
    // Hiding the only crossing on a border does not make that border checked.
    const one: Crossing[] = [
      { id: "x", countries: ["A", "B"], name: "X", towns: ["a", "b"], hidden: true, state: "open", checkedAt: on(1) },
    ];
    assert.deepEqual(bordersNeedingACheck(one, TODAY), ["A – B"]);
  });
});
