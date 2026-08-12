import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Stores that used to put the whole value in the request URL.
 *
 * lib/admin-content.ts was fixed first: a content bundle in the address is
 * refused by the server, and the save reports "connect the private database"
 * as though nothing were configured. These five still did the same two-line
 * shape. The test that would have caught them is "the write is not in the
 * path" — which is what this file is.
 */

const FILES = [
  "lib/email-log.ts",
  "lib/expenses.ts",
  "lib/account-store.ts",
  "lib/admin-inventory.ts",
  "lib/access-passwords.ts",
  "lib/admin-content.ts",
  "lib/advertising-store.ts",
];

function prose(file: string) {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

describe("Redis writes go in the body, not the address", () => {
  it("DOES NOT PUT JSON.STRINGIFY IN THE SET PATH", () => {
    const broken: string[] = [];
    for (const file of FILES) {
      const src = prose(file);
      if (/set\/\$\{encodeURIComponent\([^)]+\)\}\/\$\{encodeURIComponent\(JSON\.stringify/.test(src)) {
        broken.push(`${file} still encodes JSON into the URL`);
      }
      if (/set\/\$\{encodeURIComponent\([^)]+\)\}\/\$\{payload\}/.test(src)) {
        broken.push(`${file} still puts payload in the URL`);
      }
    }
    assert.deepEqual(broken, [], broken.join("\n"));
  });

  it("posts the value as the request body", () => {
    for (const file of FILES) {
      const src = prose(file);
      assert.match(src, /method: body === undefined \? "GET" : "POST"|method: "POST"/, `${file} has no POST write`);
    }
  });

  it("keeps the email log from growing without a cap", () => {
    // The URL write failed silently once the log was large. A cap is the other
    // half of the same bug: even a body write will fail if the value is huge.
    assert.match(prose("lib/email-log.ts"), /KEEP = 25/);
  });
});
