import assert from "node:assert/strict";
import { test } from "node:test";
import { createSupportTripCode, createTrip, importTrip, openSupportTripCode } from "@/lib/account-store";
import { emptyItinerary } from "@/data/itinerary";

test("simultaneous creates and imports cannot consume the same itinerary slot", async (t) => {
  const previous = [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN];
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  t.after(() => {
    for (const [index, key] of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"].entries()) {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    }
  });

  let saved = JSON.stringify({ route: [], favorites: [] });
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
    const [command, , , , expected, next] = JSON.parse(String(options.body));
    if (command === "GET") return Response.json({ result: saved });
    assert.equal(command, "EVAL");
    if (expected !== saved) return Response.json({ result: 0 });
    saved = next;
    return Response.json({ result: 1 });
  });

  const email = "traveller@example.test";
  const results = await Promise.all([
    createTrip(email, "First"),
    importTrip(email, { ...emptyItinerary(), title: "Second" }),
    createTrip(email, "Third"),
  ]);
  assert.equal(results.filter((result) => result.ok).length, 2);
  assert.equal(JSON.parse(saved).trips.length, 2);
  assert.match(results.find((result) => !result.ok)?.error ?? "", /two itineraries/);

  saved = JSON.stringify({ route: [], favorites: [], itinerary: { ...emptyItinerary(), title: "Legacy" } });
  assert.equal((await createTrip(email, "New")).ok, true);
  assert.deepEqual(JSON.parse(saved).trips.map((trip: { name: string }) => trip.name), ["Legacy", "New"]);
});

test("a support code opens one redacted snapshot and can only be used once", async (t) => {
  const previous = [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN];
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  t.after(() => {
    for (const [index, key] of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"].entries()) {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    }
  });
  const itinerary = {
    ...emptyItinerary(),
    title: "Private name",
    flights: [{ id: "flight", from: "JFK", to: "FCO", date: "2027-01-10", confirmation: "PRIVATE-REF", notes: "Private note" }],
  };
  const data = JSON.stringify({ trips: [{ id: "saved", itinerary }] });
  let snapshot: string | null = null;
  t.mock.method(console, "info", () => {});
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
    if (!options.body) return Response.json({ result: data });
    const [command, key, value, expiry, seconds] = JSON.parse(String(options.body));
    if (command === "SET") {
      assert.match(key, /^white-glove:support-trip:[a-f0-9]{64}$/);
      assert.equal(expiry, "EX");
      assert.equal(seconds, 3600);
      snapshot = value;
      return Response.json({ result: "OK" });
    }
    assert.equal(command, "EVAL");
    const result = snapshot;
    snapshot = null;
    return Response.json({ result });
  });

  assert.equal(await createSupportTripCode("traveller@example.test", "other"), null);
  const code = await createSupportTripCode("traveller@example.test", "saved");
  assert.ok(code);
  const opened = await openSupportTripCode(code, "staff@example.test");
  assert.deepEqual(opened?.flights, [{ from: "JFK", to: "FCO", date: "2027-01-10" }]);
  assert.doesNotMatch(JSON.stringify(opened), /PRIVATE-REF|Private note|Private name|traveller@example/);
  assert.equal(await openSupportTripCode(code, "staff@example.test"), null);
});
