import assert from "node:assert/strict";
import { test } from "node:test";
import { getSampleTemplateStats, trackSampleCopy } from "@/lib/site-analytics";

test("only public sample paths can increment aggregate conversion counts", async (t) => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  t.after(() => {
    if (url === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = url;
    if (token === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = token;
  });

  const fetchMock = t.mock.method(globalThis, "fetch", async (address: string) => {
    if (address.includes("zmscore/white-glove:pages")) return Response.json({ result: ["12"] });
    if (address.includes("zmscore/white-glove:sample-copies")) return Response.json({ result: [3] });
    return Response.json({ result: 1 });
  });

  assert.equal(await trackSampleCopy("/i/customer-trip"), false);
  assert.equal(await trackSampleCopy("/sample-itinerary?email=private"), false);
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.equal(await trackSampleCopy("/sample-itinerary"), true);
  assert.match(fetchMock.mock.calls[0].arguments[0], /zincrby\/white-glove:sample-copies\/1\/%2Fsample-itinerary$/);
  assert.deepEqual((await getSampleTemplateStats())?.[0], { title: "A week on Lake Como", views: 12, copies: 3 });
});
