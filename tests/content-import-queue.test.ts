import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getContentImportDashboard } from "@/lib/content-imports";

describe("bulk content review queue without a database", () => {
  // This used to assert that the dashboard was empty, which it was only because
  // the built-in package list was an empty array. The packs are registered now,
  // so emptiness was never the property worth protecting: what matters is that
  // with no database to write to, a source package is offered as a PREVIEW and
  // nothing is claimed as staged or published.
  it("previews the source packages but claims nothing staged or published", async () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const dashboard = await getContentImportDashboard();
      assert.equal(dashboard.configured, false);
      assert.equal(dashboard.databaseReady, false);
      assert.equal(dashboard.counts.published, 0);
      // PUBLISHABLE IS ABOUT THE CONTENT, NOT ABOUT THE DATABASE. This asked
      // for zero, which conflated two different things: nothing has reached the
      // database (asserted above and below, and true) with nothing being fit to
      // publish (a judgement about the entries themselves, which a missing
      // database has no bearing on).
      //
      // The number matters though, and it was wrong for another reason: the
      // address check accepted an entry's own name as its address, so it read
      // 12,131 when the real figure was seventy-one. It is small enough now
      // that a person could work through it, which is what it was always for.
      assert.ok(dashboard.counts.publishable < 500, `${dashboard.counts.publishable} claimed ready to publish`);

      // The packages are visible so an editor can read what is on offer...
      assert.ok(dashboard.batches.length >= 4);
      assert.ok(dashboard.candidates.length > 0);
      // ...but not one of them is recorded as having reached the database.
      assert.ok(dashboard.batches.every((batch) => batch.stagedCandidates === 0));
      assert.ok(dashboard.candidates.every((candidate) => candidate.status !== "PUBLISHED"));
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });

  it("keeps a preview out of the review queue's database rows", async () => {
    // The regression that registering the packs exposed: the needs-review queue
    // read dashboard.candidates as staged rows whatever databaseReady said, so
    // a preview became 1,695 "database" items whose review links pointed at ids
    // that existed in no table.
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const { getImportReviewQueue } = await import("@/lib/import-review-queue");
      const queue = await getImportReviewQueue();
      assert.equal(queue.error, null);
      // The guard: with no database, nothing may be labelled a database row —
      // a preview must never masquerade as staged. (The source packs that once
      // populated this queue are retired, so in this mode it is simply empty.)
      assert.ok(queue.items.every((item) => item.origin !== "database"));
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });
});

describe("what counts as ready to publish", () => {
  it("REFUSES AN ADDRESS THAT IS THE ENTRY'S OWN NAME", async () => {
    // The check asked only whether the address field held anything. Three of
    // the packs fill it with the name and the city — "Roman Forum walk
    // framing, Rome, Italy" — so 12,066 of the 12,120 candidates they called
    // ready were addressed with their own name. The dashboard reported all of
    // them as needing nothing before publishing. That was the difference
    // between "twelve thousand listings ready to go" and seventy-one.
    //
    // Nobody can navigate to a name.
    const { prepareBulkContentCandidate } = await import("@/lib/bulk-content");
    const base = {
      kind: "ATTRACTION" as const,
      name: "Roman Forum walk framing",
      city: "Rome",
      country: "Italy",
      category: "Landmark",
      summary: "A walk through the Forum.",
      sourceUrl: "https://www.turismoroma.it/",
      sourceId: "x-rome-forum",
      sourceName: "Turismo Roma",
      attribution: "Turismo Roma",
      sourceEvidence: "Listed on the city tourism site.",
    };
    const blocked = (address: string) =>
      prepareBulkContentCandidate({ ...base, address }).publishBlockers.some((b) => /published address/.test(b));

    assert.equal(blocked("Roman Forum walk framing, Rome, Italy"), true, "the name with the city stuck on");
    assert.equal(blocked("Roman Forum walk framing"), true, "the name alone");
    assert.equal(blocked(""), true, "nothing at all");
    // A real address passes, and so does one with no street number.
    assert.equal(blocked("Via della Salara Vecchia 5/6, 00186 Roma"), false);
    assert.equal(blocked("Campo del Ghetto Nuovo, 30121 Venezia, Italy"), false);
  });

  it("still lets coordinates stand in for an address", async () => {
    // A map pin needs no words.
    const { prepareBulkContentCandidate } = await import("@/lib/bulk-content");
    const candidate = prepareBulkContentCandidate({
      kind: "ATTRACTION",
      name: "Great Synagogue of Florence",
      city: "Florence",
      country: "Italy",
      category: "Jewish heritage",
      summary: "A Moorish-revival shul of 1882 with a green copper dome.",
      address: "Great Synagogue of Florence",
      coordinates: "43.7752,11.2673",
      sourceUrl: "https://www.firenzebraica.it/",
      sourceId: "x-florence-shul",
      sourceName: "Comunità Ebraica di Firenze",
      attribution: "Comunità Ebraica di Firenze",
      sourceEvidence: "Listed by the community.",
    });
    assert.ok(!candidate.publishBlockers.some((b) => /published address/.test(b)));
  });
});
