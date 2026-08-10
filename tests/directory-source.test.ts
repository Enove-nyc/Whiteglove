import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { describeDirectorySource, type DirectorySource } from "@/lib/directory";

/**
 * Where the businesses on screen came from.
 *
 * THIS EXISTS BECAUSE THE DIRECTORY VANISHED AND NOTHING SAID WHY. Three
 * separate paths fall back to the thirty businesses that ship in
 * data/directory.ts — no database configured, the query returning nothing, and
 * the read failing outright — and all three returned that list in silence. The
 * owner saw his directory replaced by samples with no error and no way to tell
 * which had happened, or whether his own entries still existed.
 *
 * The fallback is right. Serving it as though it were his was not.
 */

const ALL: DirectorySource[] = ["database", "no-database", "database-empty", "database-failed"];

describe("what the owner is told", () => {
  it("says NOTHING when the list really is his", () => {
    // A screen that reassures you every time teaches you to stop reading it.
    assert.equal(describeDirectorySource("database", 30), null);
  });

  it("says something for every other way it can happen", () => {
    for (const source of ALL.filter((s) => s !== "database")) {
      const said = describeDirectorySource(source, 30);
      assert.ok(said && said.length > 40, `${source} says nothing useful`);
      assert.match(said, /30 businesses that ship with the site/, source);
    }
  });

  it("names the thing to check when there is no database", () => {
    const said = String(describeDirectorySource("no-database", 30));
    assert.match(said, /DATABASE_URL/);
    assert.match(said, /Connections/);
  });

  it("SAYS HIS ENTRIES ARE PROBABLY STILL THERE when the read failed", () => {
    // The difference that matters most. A failed read is not a lost directory,
    // and somebody staring at thirty strangers' businesses needs to be told
    // that before they start typing three hundred rows back in.
    const said = String(describeDirectorySource("database-failed", 30));
    assert.match(said, /almost certainly still there/);
    assert.match(said, /Try again/);
  });

  it("points at the screen that shows every status when nothing is published", () => {
    // listProvidersForAdmin does not filter by status, so an unpublished
    // provider is invisible in the directory and visible there. Somebody
    // looking for a business that "vanished" needs to know that.
    const said = String(describeDirectorySource("database-empty", 30));
    assert.match(said, /drafts/);
    assert.match(said, /Directory → Businesses/);
  });

  it("never tells somebody their entries are gone", () => {
    // Nothing here knows that, and saying it would send somebody off to retype
    // a directory that is sitting in the database.
    for (const source of ALL) {
      const said = describeDirectorySource(source, 30) ?? "";
      assert.ok(!/\b(lost|deleted|gone|erased)\b/i.test(said), `${source}: ${said}`);
    }
  });
});

describe("nothing falls back in silence", () => {
  it("every fallback in the reader carries a reason", () => {
    // THE ONE THAT MATTERS. Each of these three returns used to hand back the
    // built-in list with nothing attached to say so.
    const source = readFileSync("lib/directory.ts", "utf8");
    const reader = source.slice(source.indexOf("export async function readProviders"), source.indexOf("export async function getPublicProviders"));
    const fallbacks = [...reader.matchAll(/fromStatic\(\)\]/g)];
    assert.equal(fallbacks.length, 3, "the number of fallback paths has changed — check each one still says why");
    for (const match of fallbacks) {
      const after = reader.slice(match.index ?? 0, (match.index ?? 0) + 120);
      assert.match(after, /source: "(no-database|database-empty|database-failed)"/, `a fallback with no reason: ${after.slice(0, 80)}`);
    }
  });

  it("the real answer is the only one called database", () => {
    const source = readFileSync("lib/directory.ts", "utf8");
    assert.match(source, /\.\.\.store, \.\.\.dbProviders, \.\.\.builtIn\]\), source: "database"/);
  });

  it("the database branch keeps the built-in businesses rather than replacing them", () => {
    // THE ONE THIS FILE WAS SHORT OF, and the bug it missed. This assertion
    // used to require the database branch to return `[...store,
    // ...dbProviders]` and nothing else — it held the defect in place and
    // called it the correct answer. Publishing one business emptied the
    // directory down to that business, which is issues #210 and #212.
    const source = readFileSync("lib/directory.ts", "utf8");
    const reader = source.slice(
      source.indexOf("export async function readProviders"),
      source.indexOf("export async function getPublicProviders"),
    );
    const branch = reader.slice(reader.indexOf("const dbProviders"));
    assert.match(branch, /fromStatic\(\)/, "the database branch drops the built-in businesses again");
    assert.match(branch, /\.filter\(\(p\) => !mine\.has\(p\.slug\)\)/, "the built-ins are merged without de-duplicating against his own");
  });

  it("the admin screen shows the reason", () => {
    const page = readFileSync("app/admin/directory/page.tsx", "utf8");
    assert.match(page, /describeDirectorySource/, "the directory screen does not say where its list came from");
    assert.match(page, /These are not your businesses/);
  });
});
