import assert from "node:assert/strict";
import test, { describe, afterEach } from "node:test";
import { apiKey, cleanKey, readApiKey } from "../lib/api-key";

// The bug these exist for, in full:
//
//   Headers.append: "[redacted]" is an invalid header value.
//
// A Google key was set in Vercel, the driving-times check failed, and the
// advice under the error said to check the deployment's network access. The
// request had never been sent. The stored value held an invisible character,
// and fetch refused to build the header — which is a completely different
// problem from the one the screen was describing.
//
// The code already called .trim(). These tests exist mostly to hold on to why
// that was not enough: trim strips the two ends, and the character was in the
// middle.

const VAR = "TEST_API_KEY_FIXTURE";
const GOOD = "AIzaSyC0000000000000000000000000000000";

afterEach(() => {
  delete process.env[VAR];
});

describe("a key that cannot go in a header", () => {
  test("a zero-width space in the middle survives trim and breaks the request", () => {
    const broken = `${GOOD.slice(0, 12)}​${GOOD.slice(12)}`;
    // The proof that trim was never going to help:
    assert.equal(broken.trim(), broken);
    process.env[VAR] = broken;

    const read = readApiKey(VAR);
    assert.equal(read.key, GOOD);
    assert.equal(read.cleaned, true);
    assert.equal(read.unusable, false);
    assert.match(read.problems[0], /zero-width space/);
  });

  test("a non-breaking space in the middle is caught too", () => {
    process.env[VAR] = `${GOOD.slice(0, 20)} ${GOOD.slice(20)}`;
    const read = readApiKey(VAR);
    assert.equal(read.key, GOOD);
    assert.match(read.problems[0], /non-breaking space/);
  });

  test("a key broken across two lines is rejoined", () => {
    process.env[VAR] = `${GOOD.slice(0, 18)}\n${GOOD.slice(18)}`;
    assert.equal(readApiKey(VAR).key, GOOD);
  });

  test("the cleaned key is one fetch will actually accept as a header", () => {
    process.env[VAR] = `${GOOD.slice(0, 12)}​${GOOD.slice(12)}`;
    const key = apiKey(VAR)!;
    // The real check: this is the exact call that was throwing.
    assert.doesNotThrow(() => new Headers({ "X-Goog-Api-Key": key }));
  });

  test("the raw value really would have thrown, so the fix is not theatre", () => {
    assert.throws(() => new Headers({ "X-Goog-Api-Key": `${GOOD}​` }));
  });
});

describe("a value that is not a key at all", () => {
  test("curly quotes from a word processor are named and refused", () => {
    process.env[VAR] = `“${GOOD}”`;
    const read = readApiKey(VAR);
    assert.equal(read.key, null);
    assert.equal(read.unusable, true);
    assert.match(read.problems.join(" "), /Character 1 of the value/);
  });

  test("an unset or blank variable is not an error, just absent", () => {
    assert.deepEqual(readApiKey(VAR), { key: null, cleaned: false, problems: [], unusable: false });
    process.env[VAR] = "   ";
    assert.equal(readApiKey(VAR).key, null);
    assert.equal(readApiKey(VAR).unusable, false);
  });
});

describe("what the owner is shown", () => {
  test("no part of the key appears in the message", () => {
    process.env[VAR] = `${GOOD.slice(0, 12)}​${GOOD.slice(12)}`;
    const text = readApiKey(VAR).problems.join(" ");
    assert.ok(!text.includes(GOOD));
    assert.ok(!text.includes(GOOD.slice(0, 12)));
    assert.ok(!text.includes("AIza"));
  });

  test("the message says where to fix it, not just what is wrong", () => {
    process.env[VAR] = `${GOOD.slice(0, 12)}​${GOOD.slice(12)}`;
    assert.match(readApiKey(VAR).problems[0], /Vercel/);
    assert.match(readApiKey(VAR).problems[0], /redeploy/);
  });
});

describe("a key that was always fine", () => {
  test("is passed through untouched and reports nothing", () => {
    process.env[VAR] = GOOD;
    assert.deepEqual(readApiKey(VAR), { key: GOOD, cleaned: false, problems: [], unusable: false });
  });

  test("surrounding whitespace alone is not worth a warning", () => {
    process.env[VAR] = `  ${GOOD}\n`;
    const read = readApiKey(VAR);
    assert.equal(read.key, GOOD);
    assert.deepEqual(read.problems, []);
  });
});

describe("the browser key takes the same cleaning", () => {
  test("cleanKey repairs an inlined value", () => {
    assert.equal(cleanKey(`${GOOD.slice(0, 9)}﻿${GOOD.slice(9)}`), GOOD);
  });

  test("cleanKey returns null rather than a mangled key", () => {
    assert.equal(cleanKey("“not a key”"), null);
    assert.equal(cleanKey(undefined), null);
    assert.equal(cleanKey(""), null);
  });
});
