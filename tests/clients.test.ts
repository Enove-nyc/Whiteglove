import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { clientKey, clientsFromTrips, emptyClientProfile, tripsForClient, type ClientTripFacts } from "@/data/clients";

function trip(over: Partial<ClientTripFacts> = {}): ClientTripFacts {
  return { id: "t1", updatedAt: "2026-01-01T00:00:00Z", ...over };
}

describe("a client's matching key", () => {
  it("is case- and whitespace-insensitive, the same as travelerUnitKey", () => {
    assert.equal(clientKey("  Cohen Family "), clientKey("cohen family"));
  });
});

describe("deriving the client roster fresh from trips — nothing kept twice", () => {
  it("a trip with no client name at all is left out entirely", () => {
    const out = clientsFromTrips([trip({ client: undefined }), trip({ client: "  " })], "2026-06-01");
    assert.deepEqual(out, []);
  });

  it("groups differently-cased, differently-spaced names as one client", () => {
    const out = clientsFromTrips(
      [trip({ id: "a", client: "Cohen Family", updatedAt: "2026-01-01" }), trip({ id: "b", client: "  cohen family  ", updatedAt: "2026-02-01" })],
      "2026-06-01",
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].tripCount, 2);
  });

  it("shows the most recently touched spelling, not the first one typed", () => {
    const out = clientsFromTrips(
      [trip({ id: "a", client: "cohen family", updatedAt: "2026-01-01" }), trip({ id: "b", client: "Cohen Family", updatedAt: "2026-05-01" })],
      "2026-06-01",
    );
    assert.equal(out[0].name, "Cohen Family");
  });

  it("counts a trip with no end date as upcoming, never past", () => {
    const out = clientsFromTrips([trip({ client: "Sarah Cohen", endDate: undefined })], "2026-06-01");
    assert.equal(out[0].upcomingCount, 1);
  });

  it("counts a trip whose end date has passed as not upcoming", () => {
    const out = clientsFromTrips([trip({ client: "Sarah Cohen", endDate: "2026-01-01" })], "2026-06-01");
    assert.equal(out[0].upcomingCount, 0);
  });

  it("counts a trip ending today as still upcoming", () => {
    const out = clientsFromTrips([trip({ client: "Sarah Cohen", endDate: "2026-06-01" })], "2026-06-01");
    assert.equal(out[0].upcomingCount, 1);
  });

  it("sorts by most recent activity first", () => {
    const out = clientsFromTrips(
      [trip({ id: "a", client: "Old Client", updatedAt: "2026-01-01" }), trip({ id: "b", client: "New Client", updatedAt: "2026-05-01" })],
      "2026-06-01",
    );
    assert.deepEqual(out.map((c) => c.name), ["New Client", "Old Client"]);
  });
});

describe("a client's own trips", () => {
  it("matches the same way the roster groups — case- and whitespace-insensitive", () => {
    const trips = [trip({ id: "a", client: "Cohen Family" }), trip({ id: "b", client: "Someone Else" })];
    const mine = tripsForClient(trips, clientKey("  cohen family "));
    assert.deepEqual(mine.map((t) => t.id), ["a"]);
  });

  it("newest activity first", () => {
    const trips = [
      trip({ id: "a", client: "Cohen", updatedAt: "2026-01-01" }),
      trip({ id: "b", client: "Cohen", updatedAt: "2026-05-01" }),
    ];
    const mine = tripsForClient(trips, clientKey("Cohen"));
    assert.deepEqual(mine.map((t) => t.id), ["b", "a"]);
  });

  it("is empty for a key that matches nothing", () => {
    assert.deepEqual(tripsForClient([trip({ client: "Cohen" })], clientKey("Nobody")), []);
  });
});

describe("a fresh client profile", () => {
  it("carries only the key it was given", () => {
    const profile = emptyClientProfile("cohen family");
    assert.equal(profile.key, "cohen family");
    assert.equal(profile.notes, undefined);
    assert.equal(profile.preferences, undefined);
  });
});

describe("clients are Business-only, the same door as the pipeline they're built from", () => {
  const LIST = readFileSync("app/api/account/clients/route.ts", "utf8");
  const ONE = readFileSync("app/api/account/clients/[key]/route.ts", "utf8");

  it("the roster route is gated on mayServeCompanionClients", () => {
    assert.match(LIST, /mayServeCompanionClients/);
  });

  it("the one-client route is gated the same way, via the shared ownerFor helper", () => {
    assert.match(ONE, /mayServeCompanionClients/);
  });

  it("both resolve the signed-in identity through resolveBusinessOwner — a staff login sees the same clients the owner does", () => {
    assert.match(LIST, /resolveBusinessOwner/);
    assert.match(ONE, /resolveBusinessOwner/);
  });

  it("saving a profile checks same-origin before touching the store", () => {
    const post = ONE.slice(ONE.indexOf("export async function POST"));
    assert.match(post, /sameOrigin/);
    assert.ok(post.indexOf("sameOrigin") < post.indexOf("saveClientProfile"));
  });
});
