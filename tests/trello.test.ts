import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CARD_KINDS,
  cardFor,
  cardUrl,
  describeSendFailure,
  describeTrello,
  keyProblem,
  kindInfo,
  listProblem,
  NO_TRELLO,
  sendsCardFor,
  settingsProblem,
  tokenProblem,
  trelloIsOn,
  type TrelloSettings,
} from "@/lib/trello";

/**
 * Cards on the owner's Trello board.
 *
 * TWO RULES THIS FILE EXISTS TO HOLD, and both matter more than the plumbing.
 *
 * ONE WAY ONLY. The obvious idea is to sync — move a card to Done, mark the
 * thing handled. The moment both sides can say "done" they disagree, and then
 * neither can be trusted. Nothing is ever read from Trello.
 *
 * A CARD IS THIN. A name, a line, a link. Not the message, not the photograph,
 * not anybody's email address: a board is shared, often outside the team, and
 * what somebody sends this site in confidence must not be copied somewhere the
 * owner cannot take it back from.
 */

const GOOD: TrelloSettings = {
  key: "abc123def456",
  token: "t".repeat(64),
  listId: "5abbe4b7ddc1b351ef961414",
  kinds: ["photo", "plan"],
  ownerMemberId: "",
  botMemberId: "",
};

describe("what can be saved", () => {
  it("accepts a real-looking key, token and list", () => {
    assert.equal(settingsProblem(GOOD), null);
  });

  it("catches the key pasted into the token box", () => {
    // The likeliest mistake, and Trello's own answer to it is "invalid token",
    // which tells nobody which of the three is wrong.
    assert.match(tokenProblem("abc123def456")!, /looks like the API key/);
  });

  it("catches a board link pasted as the list ID", () => {
    const said = listProblem("https://trello.com/b/abc123/white-glove");
    assert.match(said!, /not a list ID/);
  });

  it("catches a link pasted as the key", () => {
    assert.match(keyProblem("https://trello.com/1/authorize?key=abc")!, /That is a link/);
  });

  it("REFUSES TWO OUT OF THREE", () => {
    // Two filled boxes cannot send anything and would sit there looking
    // configured — the failure with no symptom.
    const said = settingsProblem({ ...GOOD, listId: "" });
    assert.match(said!, /All three are needed/);
  });

  it("refuses three values with nothing ticked", () => {
    const said = settingsProblem({ ...GOOD, kinds: [] });
    assert.match(said!, /no card would ever be created/);
  });

  it("says nothing about an empty screen", () => {
    assert.equal(settingsProblem(NO_TRELLO), null);
  });
});

describe("whether anything is sent", () => {
  it("is off until all three and at least one kind", () => {
    assert.equal(trelloIsOn(NO_TRELLO), false);
    assert.equal(trelloIsOn(undefined), false);
    assert.equal(trelloIsOn({ ...GOOD, kinds: [] }), false);
    assert.equal(trelloIsOn(GOOD), true);
  });

  it("is off with settings it would refuse, rather than sending to nowhere", () => {
    assert.equal(trelloIsOn({ ...GOOD, listId: "https://trello.com/b/x" }), false);
  });

  it("sends only the kinds that were ticked", () => {
    assert.equal(sendsCardFor(GOOD, "photo"), true);
    assert.equal(sendsCardFor(GOOD, "report"), false);
    assert.equal(sendsCardFor(NO_TRELLO, "photo"), false);
  });
});

describe("WHAT A CARD DOES NOT CARRY", () => {
  it("carries a name, a line and a link — and nothing else", () => {
    const card = cardFor({ kind: "photo", about: "Lizhensk", siteUrl: "https://whiteglovekoshertravel.com" });
    assert.match(card.name, /Lizhensk/);
    assert.match(card.desc, /https:\/\/whiteglovekoshertravel\.com\/admin\/photos/);
  });

  it("says on the card that Trello is not where it gets handled", () => {
    // Somebody will drag a card to Done and expect something to happen.
    const card = cardFor({ kind: "photo" });
    assert.match(card.desc, /does not change anything on the site/);
  });

  it("cannot be made to carry a long private note through `about`", () => {
    const card = cardFor({ kind: "suggestion", about: "x".repeat(500) });
    assert.ok(card.name.length < 140, `name was ${card.name.length} characters`);
  });

  it("keeps the description short", () => {
    for (const k of CARD_KINDS) {
      assert.ok(cardFor({ kind: k.kind, about: "A".repeat(200) }).desc.length <= 600, k.kind);
    }
  });

  it("names a screen that exists for every kind", () => {
    for (const k of CARD_KINDS) assert.match(k.href, /^\/admin/, k.kind);
  });

  it("works without a site address, falling back to the path", () => {
    // Local development, and any deploy where the address is not set.
    assert.match(cardFor({ kind: "plan" }).desc, /\/admin\/accounts/);
  });
});

describe("the request Trello is sent", () => {
  it("goes to the documented endpoint with the credentials in the query", () => {
    const url = new URL(cardUrl(GOOD, cardFor({ kind: "photo", about: "Uman" })));
    assert.equal(url.origin + url.pathname, "https://api.trello.com/1/cards");
    assert.equal(url.searchParams.get("idList"), GOOD.listId);
    assert.equal(url.searchParams.get("key"), GOOD.key);
    assert.equal(url.searchParams.get("token"), GOOD.token);
    assert.match(url.searchParams.get("name") ?? "", /Uman/);
  });

  it("puts new cards at the top", () => {
    // A queue is read from the top, and the oldest thing waiting is not the
    // most useful one to see first.
    assert.equal(new URL(cardUrl(GOOD, cardFor({ kind: "photo" }))).searchParams.get("pos"), "top");
  });

  it("encodes a name with spaces and punctuation", () => {
    const url = cardUrl(GOOD, cardFor({ kind: "listing", about: "Kosher Kitchen & Co, Kraków" }));
    assert.doesNotMatch(new URL(url).search, / /);
    assert.match(new URL(url).searchParams.get("name") ?? "", /Kosher Kitchen & Co, Kraków/);
  });
});

describe("what the owner is told", () => {
  it("says plainly when nothing is connected", () => {
    const said = describeTrello(NO_TRELLO);
    assert.match(said, /Not connected/);
    assert.match(said, /still arrives on the admin screens/);
  });

  it("lists what raises a card, and says it is one way", () => {
    const said = describeTrello(GOOD);
    assert.match(said, /nothing is ever read back/i);
    assert.match(said, /picture/i);
  });

  it("does not call a broken setting connected", () => {
    assert.match(describeTrello({ ...GOOD, token: "short" }), /^Not sending/);
  });

  it("names the likely cause of a failure", () => {
    assert.match(describeSendFailure(401), /key or the token/);
    assert.match(describeSendFailure(404), /could not find that list/);
    assert.match(describeSendFailure(429), /rate-limiting/);
    // And whatever else happens, it says the item is not lost.
    assert.match(describeSendFailure(500), /still on the admin screen/);
  });

  it("DOES NOT SAY 400 AND 404 ARE THE SAME THING", () => {
    // THE ONE THAT COST SOMEBODY AN EVENING. Both used to answer "check the
    // list ID", so a 400 caused by an idMembers that was a username sent him
    // to check, and recheck, and prove by hand the one value that was right.
    assert.notEqual(describeSendFailure(400), describeSendFailure(404));
    assert.match(describeSendFailure(400), /member id/);
  });

  it("hands over Trello's own words, because a translation can be wrong", () => {
    const said = describeSendFailure(400, "invalid value for idMembers");
    assert.match(said, /invalid value for idMembers/);
    // The site's reading comes first; Trello's is the evidence beside it.
    assert.ok(said.indexOf("refused something") < said.indexOf("Trello said"));
  });

  it("says nothing extra when Trello said nothing", () => {
    assert.doesNotMatch(describeSendFailure(404, "   "), /Trello said/);
  });

  it("WILL NOT PRINT SOMETHING THAT LOOKS LIKE A CREDENTIAL", () => {
    // This lands on a screen that is often open in front of somebody else, and
    // an error body is not a thing to trust with a token.
    assert.doesNotMatch(describeSendFailure(401, `invalid token: ${"a".repeat(64)}`), /aaaa/);
  });

  it("does not let a wall of text off the end of the screen", () => {
    assert.ok(describeSendFailure(400, "x".repeat(5000)).length < 500);
  });

  it("always says something", () => {
    for (const s of [NO_TRELLO, GOOD, { ...GOOD, kinds: [] }, { ...GOOD, key: "" }]) {
      assert.ok(describeTrello(s).length > 30);
    }
  });

  it("has a reason for every kind, so a checkbox is never bare", () => {
    for (const k of CARD_KINDS) {
      assert.ok(k.why.length > 25, k.kind);
      assert.equal(kindInfo(k.kind).label, k.label);
    }
  });
});

describe("a card can never cost a visitor their submission", () => {
  const sources = ["app/api/ratings/route.ts", "app/api/content/suggestions/route.ts", "app/api/account/plan/route.ts"];

  it("IS NEVER AWAITED AT ANY CALL SITE", () => {
    // THE ONE THAT MATTERS. Somebody who just rated a trip does not care whether
    // the owner uses Trello, and Trello being slow must not fail their request.
    for (const file of sources) {
      const source = readFileSync(file, "utf8");
      const at = source.indexOf("cardIfWanted(");
      assert.ok(at !== -1, `${file} sends no card`);
      assert.match(source.slice(Math.max(0, at - 6), at), /void /, `${file} awaits the card`);
    }
  });

  it("sends the card after the thing is safely stored", () => {
    // A card about a submission that then failed to save has somebody working
    // on an item that is not in the queue.
    const ratings = readFileSync("app/api/ratings/route.ts", "utf8");
    assert.ok(ratings.indexOf("cardIfWanted(") > ratings.indexOf("saveExperienceRating"));
  });

  it("swallows its own failures", () => {
    const store = readFileSync("lib/trello-store.ts", "utf8");
    const fn = store.slice(store.indexOf("export async function cardIfWanted"));
    assert.match(fn, /catch/);
  });
});
