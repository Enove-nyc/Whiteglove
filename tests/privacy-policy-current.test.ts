import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PREFERENCE_GROUPS } from "@/data/travel-preferences";

/**
 * THE POLICY HAS TO MATCH THE PRODUCT, AND SAY WHEN IT LAST DID.
 *
 * The travel-preferences section was added in September while the "Last
 * updated" line still read July — and the policy promises, in its own closing
 * paragraph, to revise that date whenever it changes. A policy that misstates
 * its own currency is the single claim on the page a reader can check without
 * taking anything else on trust.
 *
 * These also hold the claims themselves against the code, because the wording
 * is only worth anything while it is true.
 */

const POLICY = readFileSync("app/privacy/page.tsx", "utf8");
const PREFS = readFileSync("data/travel-preferences.ts", "utf8");

/** The month the preferences section went in. */
const SECTION_ADDED = new Date("2026-09-01");

test("the policy describes travel preferences at all", () => {
  assert.match(POLICY, /Travel preferences and the AI assistant/);
});

test("AND ITS DATE IS NOT OLDER THAN THAT SECTION", () => {
  const match = /const UPDATED = "([^"]+)"/.exec(POLICY);
  assert.ok(match, "the policy has no Last updated date");
  const updated = new Date(match[1]);
  assert.ok(!Number.isNaN(updated.getTime()), `unreadable date: ${match[1]}`);
  assert.ok(
    updated >= SECTION_ADDED,
    `the policy says it was last updated ${match[1]}, before the section it now contains`,
  );
});

test("it still promises to revise that date, which is why the date matters", () => {
  assert.match(POLICY, /revise the .{0,20}Last updated.{0,20} date/);
});

test("EVERY CATEGORY THE PRODUCT STORES IS DESCRIBED IN THE POLICY", () => {
  // Driven off the store itself rather than a hand-written list, so adding a
  // category without describing it fails here — the failure mode being a
  // policy that quietly under-states what is kept about somebody.
  const described: Record<string, RegExp> = {
    interests: /interests/i,
    kosher: /kashrus/i,
    shabbos: /Shabbos/i,
    lodging: /where you prefer to stay/i,
    transport: /how you prefer to get about/i,
    accessibility: /access needs/i,
  };
  for (const group of PREFERENCE_GROUPS) {
    const pattern = described[group.key];
    assert.ok(pattern, `the store keeps "${group.key}" and the policy test does not know about it`);
    assert.match(POLICY, pattern, `the policy no longer describes ${group.key}`);
  }
  // Pace is on the type but not in the groups, and is named too.
  assert.match(POLICY, /the pace you like/i);
});

test("the claim that nothing is inferred is still true in the code", () => {
  // "nothing is added to them from what you search for, open or ask" — the
  // only writer is the account page's own route.
  assert.match(POLICY, /nothing is added to them from what you search for/);
  assert.match(PREFS, /describeForAssistant/);
});

test("the claim that it can be deleted is still true in the code", () => {
  assert.match(POLICY, /delete all of them/);
  const route = readFileSync("app/api/account/preferences/route.ts", "utf8");
  assert.match(route, /forgetTravelPreferences/);
});
