import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { attractions } from "../data/attractions";
import { cemeteries } from "../data/cemeteries";
import { kosherAreas, kosherStays } from "../data/kosher-stays";
import { buildContentExport, exportFilename, EXPORT_SCHEMA_VERSION } from "../lib/content-export";

// The export is the only copy of the owner-added content that lives anywhere
// but the one Postgres database. Two things have to be true of it, and both are
// the kind that fail silently:
//
//   1. It has to be COMPLETE. A backup that quietly drops a table is worse than
//      no backup, because nobody finds out until the day they need it.
//   2. It has to be SAFE to copy off the server. It holds shomer phone numbers
//      by design; it must not hold a single credential.
//
// These run with no DATABASE_URL, which is the built-in-content path.

const AT = new Date("2026-07-30T12:34:56.000Z");

describe("the export is complete", () => {
  test("every content list is in the file", async () => {
    const out = await buildContentExport(AT);
    for (const key of ["cemeteries", "attractions", "stays", "areas", "destinations", "directory", "pages"]) {
      assert.ok(key in out, `the export is missing ${key} entirely`);
    }
  });

  test("nothing is silently dropped on the way in", async () => {
    const out = await buildContentExport(AT);
    assert.equal(out.attractions.length, attractions.length);
    assert.equal(out.stays.length, kosherStays.length);
    assert.equal(out.areas.length, kosherAreas.length);
    assert.equal(out.cemeteries.length, cemeteries.length);
  });

  test("the counts describe the file rather than being decoration", async () => {
    const out = await buildContentExport(AT);
    assert.equal(out.counts.attractions, out.attractions.length);
    assert.equal(out.counts.cemeteries, out.cemeteries.length);
    // Kevarim are counted as people, not places — that is the number that
    // actually says how much work is in here.
    assert.equal(out.counts.kevarim, cemeteries.reduce((n, c) => n + c.burials.length, 0));
    assert.ok(out.counts.kevarim > out.counts.cemeteries);
  });

  test("an incomplete export says so instead of looking whole", async () => {
    // With no database reachable the file holds built-in content only. The flag
    // is the entire point: without it somebody keeps a backup for a year and
    // discovers at the worst moment that none of their own work is in it.
    const out = await buildContentExport(AT);
    assert.equal(out.builtInOnly, Boolean(!process.env.DATABASE_URL) || out.builtInOnly);
    assert.equal(typeof out.builtInOnly, "boolean");
  });

  test("the file explains itself years later", async () => {
    const out = await buildContentExport(AT);
    assert.equal(out.schemaVersion, EXPORT_SCHEMA_VERSION);
    assert.equal(out.exportedAt, AT.toISOString());
    assert.match(out.about, /White Glove/);
    assert.match(out.about, /private/i);
  });
});

describe("the export is safe to copy off the server", () => {
  test("no credential of any shape appears in it", async () => {
    const text = JSON.stringify(await buildContentExport(AT));
    for (const pattern of [/AIza[0-9A-Za-z_-]{10,}/, /sk-ant-/, /\bre_[0-9A-Za-z]{10,}/, /duffel_(test|live)_/, /postgres(ql)?:\/\//]) {
      assert.equal(pattern.exec(text), null, `the export contains something matching ${pattern}`);
    }
  });

  test("no environment variable value is carried through", async () => {
    const text = JSON.stringify(await buildContentExport(AT));
    for (const name of ["DATABASE_URL", "UPSTASH_REDIS_REST_TOKEN", "ADMIN_PASSWORD", "GOOGLE_MAPS_API_KEY"]) {
      const value = process.env[name];
      if (value && value.length >= 8) assert.ok(!text.includes(value), `${name}'s value is in the export`);
    }
  });

  test("visitor accounts and the corrections people sent in are left out", async () => {
    // Both hold names and email addresses of people who are not the owner. A
    // backup is not a reason to copy strangers' details around.
    const out = (await buildContentExport(AT)) as unknown as Record<string, unknown>;
    for (const key of ["accounts", "sessions", "editSuggestions", "suggestions", "users"]) {
      assert.ok(!(key in out), `the export carries ${key}, which it should not`);
    }
  });
});

describe("the filename", () => {
  test("is timestamped so copies never overwrite each other", () => {
    const a = exportFilename(new Date("2026-07-30T12:34:56.000Z"));
    const b = exportFilename(new Date("2026-07-30T12:35:56.000Z"));
    assert.notEqual(a, b);
    assert.match(a, /^white-glove-content-.*\.json$/);
  });

  test("sorts chronologically, so the newest copy is obvious in a folder", () => {
    const earlier = exportFilename(new Date("2026-01-02T03:04:05.000Z"));
    const later = exportFilename(new Date("2026-11-02T03:04:05.000Z"));
    assert.ok(earlier < later);
  });

  test("has no character that a filesystem would object to", () => {
    assert.ok(!/[:*?"<>|]/.test(exportFilename(AT)));
  });
});
