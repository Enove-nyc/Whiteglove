import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyItinerary } from "@/data/itinerary";
import { changeTravelerShare, getSharedTraveler } from "@/lib/account-store";

test("replacing or revoking one code preserves the other traveler and the original wallet", async (t) => {
  const email = "owner@example.com";
  const tripId = "test-trip";
  const dataKey = `white-glove:account-data:${email}`;
  const itinerary = { ...emptyItinerary(), travelers: [{ id: "a", name: "Alex", hasOwnAccess: true }, { id: "b", name: "Blair" }] };
  const reverse = "white-glove:traveler-share:";
  const saved = new Map<string, string>([
    [dataKey, JSON.stringify({ route: [], favorites: [], activeTripId: tripId, trips: [
      { id: tripId, name: "Trip", route: [], itinerary, travelerShares: { a: "legacy-code" } },
    ] })],
    [reverse + "legacy-code", JSON.stringify({ ownerEmail: email, tripId, travelerId: "a" })],
  ]);
  const environment = { UPSTASH_REDIS_REST_URL: "https://redis.example.com", UPSTASH_REDIS_REST_TOKEN: "test" };
  for (const [key, value] of Object.entries(environment)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    if (init.method === "POST") {
      const [, , , key, newKey, groupKey, oldKey, previous, next, traveler, group, revoke] = JSON.parse(String(init.body));
      if (saved.get(key) !== previous) return Response.json({ result: 0 });
      saved.set(key, next);
      if (traveler) saved.set(newKey, traveler);
      if (group) saved.set(groupKey, group);
      if (revoke === "1") saved.delete(oldKey);
      return Response.json({ result: 1 });
    }
    const [command, key, value] = new URL(url).pathname.split("/").slice(1).map(decodeURIComponent);
    if (command === "get") return Response.json({ result: saved.get(key) ?? null });
    if (command === "set") saved.set(key, value);
    return Response.json({ result: "OK" });
  });

  const [a, b] = await Promise.all([
    changeTravelerShare(email, tripId, "a", "replace"),
    changeTravelerShare(email, tripId, "b", "ensure"),
  ]);
  assert.ok(a?.shareId && b?.shareId);
  assert.equal(await getSharedTraveler("legacy-code"), null);
  assert.equal((await getSharedTraveler(a.shareId))?.walletKey, "traveler:legacy-code");
  assert.equal((await getSharedTraveler(b.shareId))?.traveler.id, "b");
  assert.equal((await changeTravelerShare(email, tripId, "a", "revoke"))?.shareId, null);
  assert.equal(await getSharedTraveler(a.shareId), null);
  assert.equal((await getSharedTraveler(b.shareId))?.traveler.id, "b");
  const reissued = await changeTravelerShare(email, tripId, "a", "ensure");
  assert.ok(reissued?.shareId);
  assert.equal((await getSharedTraveler(reissued.shareId))?.walletKey, "traveler:legacy-code");
});
