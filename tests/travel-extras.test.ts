import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ctaFor,
  describeExtra,
  describeExtras,
  extraProblem,
  idIn,
  IDEAS,
  listProblem,
  looksTracked,
  looksUnfinished,
  MAX_EXTRAS,
  shownToVisitors,
  type TravelExtra,
} from "@/lib/travel-extras";

/**
 * The eSIM, the insurance, the transfer.
 *
 * These are the easy half of earning: there is no search to carry across, so
 * the link the owner pastes is the link that opens. What CAN still go wrong is
 * a link that pays nobody — it works perfectly, looks identical, and quietly
 * earns nothing, which is the exact failure the searches had for months. So the
 * screen has to say which kind of link it is, every time, without refusing
 * either.
 */

const row = (over: Partial<TravelExtra> = {}): TravelExtra => ({
  id: "x1",
  name: "eSIM data",
  blurb: "Data the moment you land.",
  url: "https://tp.media/r?marker=761677&p=5555&u=https%3A%2F%2Fairalo.com",
  cta: "",
  ...over,
});

describe("what can be saved", () => {
  it("takes a name, a line and a link", () => {
    assert.equal(extraProblem(row()), null);
  });

  it("needs a name, because that is what a traveller sees", () => {
    assert.match(extraProblem(row({ name: "  " }))!, /Give it a name/);
  });

  it("needs a link", () => {
    assert.match(extraProblem(row({ url: "" }))!, /Paste the link/);
  });

  it("refuses something that is not a link", () => {
    assert.match(extraProblem(row({ url: "airalo.com" }))!, /not a link/);
  });

  it("refuses http, so nothing on the page downgrades the connection", () => {
    assert.match(extraProblem(row({ url: "http://airalo.com" }))!, /not a link/);
  });

  it("keeps the card readable", () => {
    assert.match(extraProblem(row({ name: "e".repeat(60) }))!, /too long/);
    assert.match(extraProblem(row({ blurb: "b".repeat(200) }))!, /too long/);
    assert.match(extraProblem(row({ cta: "c".repeat(40) }))!, /too long/);
  });
});

describe("the list as a whole", () => {
  it("refuses two with the same name", () => {
    // Two cards reading "Travel insurance" is worse than either alone.
    const said = listProblem([row({ id: "a" }), row({ id: "b" })]);
    assert.match(said!, /two called/);
  });

  it("stops before the section becomes a wall", () => {
    const many = Array.from({ length: MAX_EXTRAS + 1 }, (_, i) => row({ id: `x${i}`, name: `Thing ${i}` }));
    assert.match(listProblem(many)!, new RegExp(String(MAX_EXTRAS)));
  });

  it("names the row that is wrong", () => {
    const said = listProblem([row(), row({ id: "b", name: "Travel insurance", url: "nope" })]);
    assert.match(said!, /Travel insurance:/);
  });

  it("is happy with nothing at all", () => {
    assert.equal(listProblem([]), null);
  });
});

describe("whether a link earns — said, never enforced", () => {
  it("knows a Travelpayouts redirect", () => {
    assert.equal(looksTracked("https://tp.media/r?marker=761677&u=https%3A%2F%2Fairalo.com"), true);
  });

  it("knows the other networks' redirects", () => {
    for (const host of ["awin1.com", "shareasale.com", "anrdoezrs.net"]) {
      assert.equal(looksTracked(`https://${host}/click?id=1`), true, host);
    }
  });

  it("knows a partner's own domain carrying an affiliate parameter", () => {
    assert.equal(looksTracked("https://www.booking.com/index.html?aid=123456"), true);
  });

  it("says a plain link is plain", () => {
    assert.equal(looksTracked("https://airalo.com/"), false);
  });

  it("DOES NOT REFUSE A PLAIN LINK", () => {
    // His site, his call. A link to something he simply wants travellers to
    // have is a fair thing to put on a website.
    assert.equal(extraProblem(row({ url: "https://airalo.com/" })), null);
    assert.match(describeExtra(row({ url: "https://airalo.com/" })), /earns nothing/);
  });

  it("reads the marker back out to show him", () => {
    assert.equal(idIn(row().url), "761677");
    assert.equal(idIn("https://www.booking.com/?aid=99"), "99");
    assert.equal(idIn("https://airalo.com/"), "");
  });
});

describe("what the screen says", () => {
  it("says a tracked one is credited, and names the marker", () => {
    const said = describeExtra(row());
    assert.match(said, /credited to you/);
    assert.match(said, /761677/);
  });

  it("does not call a broken row live", () => {
    assert.match(describeExtra(row({ url: "" })), /^Not shown/);
  });

  it("suggests the first one when there are none", () => {
    const said = describeExtras([]);
    assert.match(said, /eSIM|insurance/);
    assert.match(said, /Nothing extra/);
  });

  it("counts how many earn when only some do", () => {
    const said = describeExtras([row(), row({ id: "b", name: "Insurance", url: "https://example.com/" })]);
    assert.match(said, /2 things are/);
    assert.match(said, /1 of the links is tracked/);
  });

  it("says so when none of them earns", () => {
    assert.match(describeExtras([row({ url: "https://airalo.com/" })]), /None of the links is tracked/);
  });

  it("always says something", () => {
    for (const list of [[], [row()], [row(), row({ id: "b", name: "B" })]]) {
      assert.ok(describeExtras(list).length > 40);
    }
  });
});

describe("what a visitor is shown", () => {
  it("leaves out a row that is not finished", () => {
    // A half-typed offer must never reach the page.
    const shown = shownToVisitors([row(), row({ id: "b", name: "Half done", url: "" })]);
    assert.deepEqual(shown.map((e) => e.id), ["x1"]);
  });

  it("never shows more than the cap, whatever is stored", () => {
    const many = Array.from({ length: 20 }, (_, i) => row({ id: `x${i}`, name: `Partner ${String.fromCharCode(65 + i)}` }));
    assert.equal(shownToVisitors(many).length, MAX_EXTRAS);
  });

  it("LEAVES OUT A PLACEHOLDER NAME", () => {
    // What was live on /book: an eSIM card with nothing under it, then
    // "Option 1" and "Option 2". A traveller cannot tell a placeholder from a
    // partner they have not heard of, so the page has to.
    for (const name of ["Option 1", "Option 2", "TBD", "Untitled", "Partner"]) {
      assert.equal(shownToVisitors([row({ name })]).length, 0, name);
      assert.ok(looksUnfinished(row({ name })), name);
    }
  });

  it("LEAVES OUT A CARD WITH NOTHING UNDER THE NAME", () => {
    // The description is the only thing on the card that says what is being
    // bought. Without it the card is a link with a mystery on it.
    assert.equal(shownToVisitors([row({ blurb: "  " })]).length, 0);
  });

  it("renders nothing at all when every row is unfinished", () => {
    // AGENTS.md: hide an unfinished section rather than show it empty.
    const shown = shownToVisitors([
      row({ id: "a", name: "eSIM data", blurb: "" }),
      row({ id: "b", name: "Option 1", blurb: "" }),
      row({ id: "c", name: "Option 2", blurb: "" }),
    ]);
    assert.deepEqual(shown, []);
  });

  it("still shows a finished row beside an unfinished one", () => {
    const shown = shownToVisitors([row(), row({ id: "b", name: "Option 1", blurb: "" })]);
    assert.deepEqual(shown.map((e) => e.id), ["x1"]);
  });

  it("SAVES THE UNFINISHED ROW ANYWAY, and says why it is not on the page", () => {
    // Nothing the owner typed is thrown away — it simply does not go live.
    assert.equal(extraProblem(row({ name: "Option 1", blurb: "" })), null);
    assert.match(describeExtra(row({ name: "Option 1" })), /not shown to travellers/i);
    assert.match(describeExtra(row({ blurb: "" })), /no line under the name/i);
    assert.match(
      describeExtras([row({ name: "Option 1", blurb: "" }), row({ id: "b", name: "Option 2", blurb: "" })]),
      /Nothing is being offered[\s\S]*2 rows are saved but still unfinished/,
    );
  });

  it("always has words on the button", () => {
    assert.equal(ctaFor(row({ cta: "Buy an eSIM →" })), "Buy an eSIM →");
    assert.match(ctaFor(row({ cta: "" })), /esim data/);
    assert.ok(ctaFor(row({ cta: "   " })).length > 3);
  });
});

describe("the suggestions", () => {
  it("offers the ones a traveller actually wants after booking a flight", () => {
    assert.ok(IDEAS.includes("eSIM data"));
    assert.ok(IDEAS.includes("Travel insurance"));
  });

  it("suggests nothing that would not fit the card", () => {
    for (const idea of IDEAS) {
      assert.equal(extraProblem(row({ name: idea })), null, idea);
    }
  });
});
