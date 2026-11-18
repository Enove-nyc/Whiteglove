import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CLOSURE_HTML, closureAction, isClosedKosherHost } from "@/lib/kosher-closure";

const headers = (h: Record<string, string>) => ({ get: (k: string) => h[k.toLowerCase()] ?? null });

/**
 * White Glove Kosher Travel has closed. Its domain shows one notice and sends
 * trip links to White Glove Itineraries. Only the real kosher hostnames close —
 * never localhost, previews, or the itineraries domain.
 */
describe("Kosher Travel closure", () => {
  it("closes only the real kosher hostnames", () => {
    assert.equal(isClosedKosherHost(headers({ host: "www.whiteglovekoshertravel.com" })), true);
    assert.equal(isClosedKosherHost(headers({ host: "whiteglovekoshertravel.com:443" })), true);
    assert.equal(isClosedKosherHost(headers({ host: "x.up.railway.app", "x-forwarded-host": "www.whiteglovekoshertravel.com" })), true);
    assert.equal(isClosedKosherHost(headers({ host: "www.whitegloveitineraries.com" })), false);
    assert.equal(isClosedKosherHost(headers({ host: "localhost:3000" })), false);
    assert.equal(isClosedKosherHost(headers({ host: "white-glove.netlify.app" })), false);
  });

  it("forwards trip and login links to the same path on Itineraries", () => {
    assert.deepEqual(closureAction("/i/abc123", "?x=1"), { kind: "forward", url: "https://www.whitegloveitineraries.com/i/abc123?x=1" });
    assert.deepEqual(closureAction("/app"), { kind: "forward", url: "https://www.whitegloveitineraries.com/app" });
    assert.deepEqual(closureAction("/login"), { kind: "forward", url: "https://www.whitegloveitineraries.com/login" });
  });

  it("keeps the admin, the API and the deployment check reachable", () => {
    for (const p of ["/admin", "/admin/login", "/api/health", "/version", "/icon.png"]) {
      assert.deepEqual(closureAction(p), { kind: "pass" }, p);
    }
    assert.deepEqual(closureAction("/administrator"), { kind: "notice" });
  });

  it("shows the notice everywhere else", () => {
    for (const p of ["/", "/destinations/rome", "/kosher", "/itinerary", "/info"]) {
      assert.deepEqual(closureAction(p), { kind: "notice" }, p);
    }
  });

  it("tells travellers where their trips are and that the login is the same", () => {
    assert.match(CLOSURE_HTML, /White Glove Itineraries/);
    assert.match(CLOSURE_HTML, /same email and password/);
    assert.match(CLOSURE_HTML, /https:\/\/www\.whitegloveitineraries\.com\/login/);
    assert.doesNotMatch(CLOSURE_HTML, /<script/);
  });
});
