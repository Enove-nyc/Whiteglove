import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { publicOrigin, publicUrl } from "@/lib/public-origin";

/**
 * Where a redirect actually sends somebody.
 *
 * Railway terminates TLS at its edge and forwards to the container over plain
 * HTTP on a local port, so `request.url` inside the app is
 * http://localhost:8080/… — and every redirect built from it pointed at
 * localhost. On a developer's machine that is right, which is why it survived.
 * In production it is a page that cannot load on any computer that is not the
 * server, and it is where Google sign-in was landing everybody.
 */
const headers = (bag: Record<string, string>) => ({
  get: (name: string) => bag[name.toLowerCase()] ?? null,
});

const request = (bag: Record<string, string>, url = "http://localhost:8080/api/x") => ({
  headers: headers(bag),
  url,
});

describe("the address a visitor is actually at", () => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;

  it("PREFERS THE CONFIGURED ADDRESS, WHICH CANNOT BE SPOOFED BY A HEADER", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://whitegloveitineraries.com";
    try {
      assert.equal(
        publicOrigin(request({ "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" })),
        "https://whitegloveitineraries.com",
      );
    } finally {
      if (configured === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = configured;
    }
  });

  it("falls back to what the proxy says, not to the local socket", () => {
    const before = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    try {
      assert.equal(
        publicOrigin(request({ "x-forwarded-host": "www.example.com", "x-forwarded-proto": "https" })),
        "https://www.example.com",
      );
      // No proto header: assume https for a real host…
      assert.equal(publicOrigin(request({ host: "www.example.com" })), "https://www.example.com");
      // …and http for a development machine, where https would not answer.
      assert.equal(publicOrigin(request({ host: "localhost:3000" })), "http://localhost:3000");
      // A comma-joined chain is the first hop, which is the visitor's.
      assert.equal(
        publicOrigin(request({ "x-forwarded-host": "www.example.com", "x-forwarded-proto": "https,http" })),
        "https://www.example.com",
      );
    } finally {
      if (before !== undefined) process.env.NEXT_PUBLIC_SITE_URL = before;
    }
  });

  it("makes a path absolute against it", () => {
    const before = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    try {
      const url = publicUrl(request({ "x-forwarded-host": "www.example.com", "x-forwarded-proto": "https" }), "/account");
      assert.equal(url.toString(), "https://www.example.com/account");
    } finally {
      if (before !== undefined) process.env.NEXT_PUBLIC_SITE_URL = before;
    }
  });
});

describe("no route redirects to the socket it was served on", () => {
  it("GOOGLE SIGN-IN COMES BACK TO THE SITE, NOT TO LOCALHOST", () => {
    const callback = readFileSync("app/api/account/google/callback/route.ts", "utf8");
    assert.doesNotMatch(callback, /new URL\([^)]*request\.url\)/);
    assert.match(callback, /publicUrl\(request, pending\.next\)/);
  });

  it("and neither does anything else that redirects a person", () => {
    for (const path of [
      "app/api/account/google/start/route.ts",
      "app/api/admin/reviews/route.ts",
      "app/api/partners/flights/offer/route.ts",
      "app/api/alerts/unsubscribe/route.ts",
      "app/api/travel/cars/go/route.ts",
    ]) {
      const source = readFileSync(path, "utf8");
      assert.doesNotMatch(source, /new URL\([^)]*request\.url\)/, path);
      assert.match(source, /publicUrl\(/, path);
    }
  });
});
