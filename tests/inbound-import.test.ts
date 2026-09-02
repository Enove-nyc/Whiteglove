import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  MAX_PENDING,
  inboundAddress,
  isStale,
  pendingToShow,
  tokenFromRecipients,
  waitingLine,
  type PendingImport,
} from "@/data/inbound-import";

const entry = (over: Partial<PendingImport> = {}): PendingImport => ({
  id: "p1",
  at: "2026-09-01T10:00:00.000Z",
  subject: "Your booking",
  from: "noreply@airline.example",
  items: [],
  warnings: [],
  ...over,
});

describe("the address is the credential", () => {
  it("reads the token out of however the provider spells the recipient", () => {
    assert.equal(tokenFromRecipients(["trips+abc12345@example.com"]), "abc12345");
    assert.equal(tokenFromRecipients(["Trips <trips+abc12345@example.com>"]), "abc12345");
    assert.equal(tokenFromRecipients(["someone@else.com, trips+abc12345@example.com"]), "abc12345");
  });

  it("REFUSES A NEAR MISS rather than routing it to somebody else", () => {
    // A token that is not exactly right belongs to nobody.
    assert.equal(tokenFromRecipients(["trips@example.com"]), "");
    assert.equal(tokenFromRecipients(["trips+short@example.com"]), "");
    assert.equal(tokenFromRecipients(["trips+has spaces@example.com"]), "");
    assert.equal(tokenFromRecipients([""]), "");
    assert.equal(tokenFromRecipients([]), "");
  });

  it("builds the address it will later read back", () => {
    const address = inboundAddress("abcdefgh12345678", "whiteglovekoshertravel.com");
    assert.equal(address, "trips+abcdefgh12345678@whiteglovekoshertravel.com");
    assert.equal(tokenFromRecipients([address]), "abcdefgh12345678");
  });

  it("is nothing at all when there is no token", () => {
    assert.equal(inboundAddress("", "example.com"), "");
  });
});

describe("what is waiting", () => {
  const now = "2026-09-10T10:00:00.000Z";

  it("shows the newest first", () => {
    const out = pendingToShow([entry({ id: "old", at: "2026-09-01T00:00:00.000Z" }), entry({ id: "new", at: "2026-09-09T00:00:00.000Z" })], now);
    assert.deepEqual(out.map((e) => e.id), ["new", "old"]);
  });

  it("drops one nobody dealt with for a month, so the queue tidies itself", () => {
    assert.equal(isStale(entry({ at: "2026-07-01T00:00:00.000Z" }), now), true);
    assert.equal(isStale(entry({ at: "2026-09-09T00:00:00.000Z" }), now), false);
    assert.equal(pendingToShow([entry({ at: "2026-07-01T00:00:00.000Z" })], now).length, 0);
  });

  it("is capped — more than this waiting means something is wrong", () => {
    const many = Array.from({ length: 40 }, (_, i) => entry({ id: `p${i}` }));
    assert.equal(pendingToShow(many, now).length, MAX_PENDING);
  });

  it("says how many in words, and nothing when there are none", () => {
    assert.equal(waitingLine(0), "");
    assert.match(waitingLine(1), /^1 forwarded confirmation is waiting/);
    assert.match(waitingLine(3), /^3 forwarded confirmations are waiting/);
  });
});

describe("the webhook", () => {
  const ROUTE = readFileSync("app/api/inbound/confirmation/route.ts", "utf8");

  it("FAILS CLOSED when no signing secret is set", () => {
    // Without this the URL is an open door: anybody who learned a token could
    // post straight to it.
    assert.match(ROUTE, /if \(!secret\)/);
    assert.match(ROUTE, /status: 500/);
  });

  it("verifies the signature BEFORE it parses anything", () => {
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.ok(post.indexOf("signatureOk") < post.indexOf("JSON.parse"), "it parses the body before checking the signature");
    assert.match(ROUTE, /timingSafeEqual/);
  });

  it("routes on the ADDRESS, never on who the message says it is from", () => {
    // From is not a credential and is trivially forged. Routing on it would let
    // anybody who knows an email address put rows on that account's trip.
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(post, /tokenFromRecipients\(recipients\)/);
    assert.match(post, /accountForToken\(token\)/);
    assert.ok(!/accountFor\w*\(\s*message\.from/.test(post), "the sender decides the destination");
  });

  it("CANNOT WRITE TO A TRIP — it reads and it queues", () => {
    for (const forbidden of ["writeTrips", "saveItinerary", "addImportedItemsToItinerary", "getTripItinerary"]) {
      assert.ok(!ROUTE.includes(forbidden), `the inbound route can write to a trip (${forbidden})`);
    }
    assert.match(ROUTE, /addPending\(account, entry\)/);
  });

  it("uses the same extractor as a pasted confirmation, not a second one", () => {
    assert.match(ROUTE, /extractSmartImport/);
    assert.match(ROUTE, /readImportDataUrl/);
  });

  it("answers 200 to a message for an address nobody owns", () => {
    // Anything else and the provider retries it for days. A message to a dead
    // address is not a failure worth repeating.
    const branch = ROUTE.slice(ROUTE.indexOf("if (!account)"));
    assert.match(branch.slice(0, 400), /received: true/);
  });
});

describe("the planner's side", () => {
  const ROUTE = readFileSync("app/api/account/inbound/route.ts", "utf8");
  const PANEL = readFileSync("components/SmartImportPanel.tsx", "utf8");

  it("never writes to a trip either — clearing only empties the queue", () => {
    for (const forbidden of ["writeTrips", "addImportedItemsToItinerary"]) {
      assert.ok(!ROUTE.includes(forbidden), `the inbound account route writes to a trip (${forbidden})`);
    }
  });

  it("lets the address be rotated, which is what makes it a credential", () => {
    assert.match(ROUTE, /rotateInboundToken/);
  });

  it("opens a forwarded confirmation in the SAME review screen", () => {
    // Not a second importer and not a second review UI — the whole point.
    assert.match(PANEL, /function review\(entry: PendingImport\)/);
    assert.match(PANEL, /setItems\(entry\.items as ImportedItem\[\]\)/);
  });

  it("says outright that nothing is added on its own", () => {
    assert.match(PANEL, /nothing is added to a trip on its own/i);
  });

  it("shows no address at all when forwarding is not configured", () => {
    // Better than printing one that goes nowhere.
    assert.match(PANEL, /\{!items && inbox\.address && \(/);
  });
});
