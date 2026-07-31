import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { completeness, destinationTrust, trustLabel } from "@/lib/verification";
import type { DestinationRecord, PracticalSection } from "@/data/destination-database";

// Two audiences, two answers. A visitor is told what has been checked and
// when, because that is what decides whether they drive four hours on the
// strength of it. The percentage is for the admin and must never reach a
// public page — a number beside a kever reads as a rating of the kever.

const section = (status: PracticalSection["status"], lastChecked?: string): PracticalSection => ({
  status,
  lastChecked,
  entries: [],
  note: "",
});

const record = (over: Partial<DestinationRecord> = {}): DestinationRecord => ({
  id: "test",
  city: "Test",
  yiddishCity: "טעסט",
  country: "Poland",
  aliases: [],
  cemeteries: [],
  accommodations: section("unavailable"),
  kosherFood: section("unavailable"),
  minyanim: section("unavailable"),
  mikvaos: section("unavailable"),
  transport: section("unavailable"),
  notes: [],
  ...over,
});

describe("what a visitor is told", () => {
  it("gives the date a thing was checked, when there is one", () => {
    assert.equal(trustLabel(section("verified", "2026-03-03")).text, "Verified on 3 March 2026");
  });

  it("does not invent a date, and does not lose the verification either", () => {
    assert.equal(trustLabel(section("verified")).text, "Verified");
  });

  it("never puts a date next to something still being checked", () => {
    // A date beside "in progress" reads as though the checking finished then,
    // which is the opposite of what it means.
    const label = trustLabel(section("needs-verification", "2026-03-03"));
    assert.equal(label.text, "Update in progress");
    assert.doesNotMatch(label.text, /2026/);
  });

  it("says which kind of not-yet it is", () => {
    assert.equal(trustLabel(section("partial")).text, "Partially verified");
    assert.equal(trustLabel(section("community")).text, "Community-submitted");
    assert.equal(trustLabel(section("unavailable")).text, "Not published yet");
  });

  it("survives a date it cannot read, rather than printing Invalid Date", () => {
    assert.equal(trustLabel(section("verified", "last Tuesday")).text, "Verified");
    assert.equal(trustLabel(section("verified", "2026-13-45")).text, "Verified");
  });

  it("carries the state in a glyph as well as a colour", () => {
    const glyphs = (["verified", "partial", "community", "needs-verification", "unavailable"] as const).map((s) => trustLabel(section(s)).glyph);
    assert.equal(new Set(glyphs).size, glyphs.length, "each state needs its own glyph, or colour is doing the work alone");
  });
});

describe("one label for a whole destination", () => {
  it("rounds down, never up", () => {
    // One checked section out of five is not a verified page. Rounding that
    // up is the exact failure these labels exist to prevent.
    const partly = record({ kosherFood: section("verified", "2026-03-03") });
    assert.equal(destinationTrust(partly).text, "Partially verified");
  });

  it("only says verified when every section is", () => {
    const all = record({
      accommodations: section("verified", "2026-04-01"),
      kosherFood: section("verified", "2026-03-03"),
      minyanim: section("verified", "2026-05-09"),
      mikvaos: section("verified", "2026-04-20"),
      transport: section("verified", "2026-06-01"),
    });
    // And shows the oldest check, because the page is only as current as its
    // stalest section.
    assert.equal(destinationTrust(all).text, "Verified on 3 March 2026");
  });

  it("does not call a page with a checked kever unverified", () => {
    const keverOnly = record({
      cemeteries: [{ id: "c", yiddishName: "x", name: "x", arrivalNotes: [], shomerContacts: [], burials: [], status: "verified" }],
    });
    assert.equal(destinationTrust(keverOnly).text, "Partially verified");
  });

  it("flags community-submitted content even when other sections are checked", () => {
    const mixed = record({ kosherFood: section("verified", "2026-03-03"), minyanim: section("community") });
    assert.equal(destinationTrust(mixed).text, "Community-submitted");
  });

  it("says an empty record is in progress", () => {
    assert.equal(destinationTrust(record()).text, "Update in progress");
  });
});

describe("the admin's completeness score", () => {
  it("counts an empty record as empty", () => {
    const result = completeness(record());
    assert.equal(result.score, 0);
    assert.equal(result.filled, 0);
  });

  it("counts fields the schema cannot hold yet as missing, and says so separately", () => {
    // Scoring only what the schema happens to support would report a record
    // as complete while five of the standard's fields have nowhere to live.
    const result = completeness(record());
    assert.ok(result.notTracked.includes("Photos"));
    assert.ok(result.notTracked.includes("Hospital"));
    assert.ok(result.total > result.total - result.notTracked.length);
    assert.equal(result.missing.includes("Photos"), false, "an untracked field is not the admin's to fill in");
  });

  it("names exactly what is missing, so the score is a work queue", () => {
    const result = completeness(record({ kosherFood: section("verified", "2026-03-03") }));
    assert.ok(result.filled > 0);
    assert.equal(result.missing.includes("Kosher food"), false);
    assert.ok(result.missing.includes("Cemetery"));
    assert.ok(result.missing.includes("Mikvaos"));
  });

  it("rises as a record fills in, and never exceeds 100", () => {
    const thin = completeness(record());
    const fuller = completeness(record({
      cemeteries: [{
        id: "c", yiddishName: "x", name: "x", address: "1 Road", coordinates: "50.1, 22.4",
        arrivalNotes: ["Ring the bell"], shomerContacts: [{ label: "Shomer", phone: "+48", status: "verified" }],
        burials: [{ name: "R. X", yiddishName: "ר' איקס", status: "verified" }], status: "verified", sourceUrl: "https://example.org",
      }],
      accommodations: section("verified", "2026-03-03"),
      kosherFood: section("verified", "2026-03-03"),
      minyanim: section("verified", "2026-03-03"),
      mikvaos: section("verified", "2026-03-03"),
      transport: section("verified", "2026-03-03"),
    }));
    assert.ok(fuller.score > thin.score);
    assert.ok(fuller.score <= 100);
    // Everything the schema can hold is filled, so what is left is only the
    // fields that have nowhere to live yet.
    assert.deepEqual(fuller.missing, []);
  });
});
