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

  it("is one page and nothing else: no admin, no API, no forwarding, no files", () => {
    // The owner's word, 18 November 2026.
    for (const p of ["/", "/admin", "/admin/login", "/api/health", "/api/access", "/version", "/i/abc123", "/app", "/login", "/icon.png", "/destinations/rome"]) {
      assert.deepEqual(closureAction(p), { kind: "notice" }, p);
    }
  });

  it("covers every subdomain of the closed domain too", () => {
    assert.equal(isClosedKosherHost(headers({ host: "admin.whiteglovekoshertravel.com" })), true);
    assert.equal(isClosedKosherHost(headers({ host: "anything.whiteglovekoshertravel.com" })), true);
    assert.equal(isClosedKosherHost(headers({ host: "admin.whitegloveitineraries.com" })), false);
  });

  it("tells travellers where their trips are and that the login is the same", () => {
    assert.match(CLOSURE_HTML, /White Glove Itineraries/);
    assert.match(CLOSURE_HTML, /same email and password/);
    assert.match(CLOSURE_HTML, /https:\/\/www\.whitegloveitineraries\.com\/login/);
    assert.doesNotMatch(CLOSURE_HTML, /<script/);
  });
});
