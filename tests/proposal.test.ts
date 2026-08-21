import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { emptyItinerary, type Itinerary } from "@/data/itinerary";
import {
  emptyProposal,
  emptyProposalOption,
  proposalExpired,
  proposalOptionToItinerary,
  type ProposalOption,
} from "@/data/proposal";

describe("a fresh proposal and option", () => {
  it("starts as a draft with nothing on it", () => {
    const p = emptyProposal();
    assert.equal(p.status, "draft");
    assert.deepEqual(p.options, []);
    assert.deepEqual(p.comments, []);
  });

  it("a fresh option carries the name it was given and nothing else", () => {
    const o = emptyProposalOption("Option A");
    assert.equal(o.name, "Option A");
    assert.deepEqual(o.components, []);
  });
});

describe("whether a proposal has expired", () => {
  it("is never expired with no expiration date set", () => {
    assert.equal(proposalExpired(emptyProposal(), "2026-01-01"), false);
  });

  it("expires the day AFTER its date, not on it — the client can still act on the day itself", () => {
    const p = { ...emptyProposal(), expiresAt: "2026-06-01" };
    assert.equal(proposalExpired(p, "2026-06-01"), false);
    assert.equal(proposalExpired(p, "2026-06-02"), true);
  });
});

describe("converting the selected option onto the real itinerary", () => {
  const base: Itinerary = { ...emptyItinerary(), startDate: "2026-06-01", endDate: "2026-06-05" };

  it("maps each kind onto the row the itinerary builder already edits", () => {
    const option: ProposalOption = {
      id: "opt-1",
      name: "Option A",
      components: [
        { id: "c1", kind: "flight", name: "Outbound", from: "JFK", to: "FCO", date: "2026-06-01" },
        { id: "c2", kind: "hotel", name: "Hotel Rossi", address: "Via Roma 1", checkIn: "2026-06-01", checkOut: "2026-06-05" },
        { id: "c3", kind: "activity", name: "Colosseum tour", address: "Piazza del Colosseo", date: "2026-06-02" },
        { id: "c4", kind: "transport", name: "Airport transfer" },
        { id: "c5", kind: "package", name: "Day trip package", description: "Includes lunch" },
      ],
    };
    const result = proposalOptionToItinerary(option, base);
    assert.equal(result.flights.length, 1);
    assert.equal(result.flights[0].from, "JFK");
    assert.equal(result.flights[0].to, "FCO");

    assert.equal(result.lodging.length, 1);
    assert.equal(result.lodging[0].name, "Hotel Rossi");
    assert.equal(result.lodging[0].checkIn, "2026-06-01");

    // transport, activity and package all land as activities — a stop on a
    // day, the same as anything typed into the builder by hand.
    assert.equal(result.activities.length, 3);
    assert.ok(result.activities.some((a) => a.name === "Colosseum tour"));
    assert.ok(result.activities.some((a) => a.name === "Airport transfer"));
    assert.ok(result.activities.some((a) => a.name === "Day trip package" && a.notes?.includes("Includes lunch")));
  });

  it("appends to what the itinerary already holds, never replacing it", () => {
    const withExisting: Itinerary = {
      ...base,
      activities: [{ id: "existing-1", name: "Already planned", date: "2026-06-01" }],
    };
    const option = emptyProposalOption("Option A");
    option.id = "opt-2";
    option.components = [{ id: "c1", kind: "activity", name: "New from proposal" }];
    const result = proposalOptionToItinerary(option, withExisting);
    assert.equal(result.activities.length, 2);
    assert.ok(result.activities.some((a) => a.id === "existing-1"), "the hand-entered stop survives");
    assert.ok(result.activities.some((a) => a.name === "New from proposal"));
  });

  it("never invents a date for a component that didn't have one", () => {
    const option: ProposalOption = { id: "opt-3", name: "Option A", components: [{ id: "c1", kind: "activity", name: "Something" }] };
    const result = proposalOptionToItinerary(option, base);
    assert.equal(result.activities[0].date, "");
  });
});

describe("a proposal's public link keeps the same fences everything else does", () => {
  const ROUTE = readFileSync("app/api/account/proposal/route.ts", "utf8");
  const PUBLIC_ROUTE = readFileSync("app/api/proposal/[shareId]/route.ts", "utf8");

  it("the planner side is Business-gated, the same as handing a trip to a client at all", () => {
    assert.match(ROUTE, /mayServeCompanionClients/);
  });

  it("the planner side checks same-origin before writing anything", () => {
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(post, /sameOrigin/);
    assert.ok(post.indexOf("sameOrigin") < post.indexOf("switch"), "same-origin is checked before any action runs");
  });

  it("the public client side checks same-origin and is rate limited before it writes anything", () => {
    const post = PUBLIC_ROUTE.slice(PUBLIC_ROUTE.indexOf("export async function POST"));
    assert.match(post, /sameOrigin/);
    assert.match(post, /rateLimit\(`proposal-action:/);
    assert.ok(post.indexOf("sameOrigin") < post.indexOf("rateLimit"), "same-origin before the rate limit is even counted");
  });

  it("the public route never imports the planner-only store functions a client has no business calling", () => {
    assert.doesNotMatch(PUBLIC_ROUTE, /saveProposal|ensureProposalShare|convertProposalToItinerary/);
  });
});
