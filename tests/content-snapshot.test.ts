import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { buildContentSnapshot, snapshotProblem, SNAPSHOT_SCHEMA_VERSION } from "@/lib/content-snapshot";

/**
 * A stand-in for Prisma. The snapshot's job is to choose what leaves the
 * database, so what matters here is what it asks for and what it hands back —
 * neither of which needs a real database to check.
 */
function fakePrisma(rows: {
  contactNames?: unknown[];
  cemeteries?: unknown[];
  attractions?: unknown[];
  stays?: unknown[];
  areas?: unknown[];
  pages?: unknown[];
}) {
  const asked: Record<string, unknown> = {};
  const table = (key: string, data: unknown[]) => ({
    findMany: async (args: unknown) => {
      asked[key] = args;
      return data;
    },
  });
  const client = {
    contact: table("contact", rows.contactNames ?? []),
    cemetery: table("cemetery", rows.cemeteries ?? []),
    attraction: table("attraction", rows.attractions ?? []),
    kosherStay: table("kosherStay", rows.stays ?? []),
    kosherArea: table("kosherArea", rows.areas ?? []),
    page: table("page", rows.pages ?? []),
  };
  return { client: client as unknown as PrismaClient, asked };
}

const CEMETERY = {
  slug: "mizhhirya",
  city: "Mizhhirya (Volove)",
  yiddishCity: "וואלאווע",
  name: "Volove (Mizhhirya) Jewish Cemetery",
  yiddishName: "בית החיים וואלאווע",
  country: "Ukraine",
  address: "Suvorova / Leonova crossroads",
  coordinates: "48.531479, 23.501989",
  arrivalNotes: ["Walled, about 64 matzevos."],
  accessNote: null,
  status: "VERIFIED",
  sourceUrl: "https://cja.huji.ac.il/",
  lastVerified: new Date("2026-08-01T00:00:00Z"),
  burials: [
    { name: "Rabbi Hayim Shalom Landa", yiddishName: "רבי חיים שלום לאנדא", knownAs: null, seforim: null, yahrzeit: "1924", note: null },
  ],
  contacts: [
    { label: "Cemetery shomer", phone: "+380 50 000 0000", email: null, note: "Call ahead.", lastVerified: new Date("2026-08-10T00:00:00Z") },
  ],
};

const TAKEN = "2026-08-12T04:10:00.000Z";

describe("the snapshot of what the database says", () => {
  it("carries the owner's own additions — the whole reason it exists", async () => {
    // A shomer number entered through the admin lives only in the database. It
    // was reported back to the owner as missing because a checkout could not
    // see it. If this assertion ever fails, that is the bug returning.
    const { client } = fakePrisma({ cemeteries: [CEMETERY] });
    const snapshot = await buildContentSnapshot(client, TAKEN);

    const contacts = snapshot.cemeteries[0]!.contacts;
    assert.equal(contacts.length, 1);
    assert.equal(contacts[0]!.phone, "+380 50 000 0000");
    assert.equal(contacts[0]!.lastVerified, "2026-08-10T00:00:00.000Z");
    assert.equal(snapshot.counts.contacts, 1);
    assert.equal(snapshot.counts.kevarim, 1);
  });

  it("NEVER PUTS A DRAFT IN A PUBLIC REPOSITORY", async () => {
    // The one hard rule. This file is committed to a public repo, so it may
    // only hold what is already on a page a visitor can load. The filter is
    // asked of the database rather than applied afterwards, so a draft is never
    // read in the first place.
    const { client, asked } = fakePrisma({ pages: [] });
    await buildContentSnapshot(client, TAKEN);
    assert.deepEqual((asked.page as { where?: unknown }).where, { status: "PUBLISHED" });
  });

  it("says whose number each one is", async () => {
    const { client } = fakePrisma({
      cemeteries: [{ ...CEMETERY, contacts: [{ id: "c1", ...CEMETERY.contacts[0] }] }],
      contactNames: [{ id: "c1", name: "Reb Berel" }],
    });
    const snapshot = await buildContentSnapshot(client, TAKEN);
    assert.equal(snapshot.cemeteries[0]!.contacts[0]!.name, "Reb Berel");
  });

  it("still writes a snapshot when the name column is not there yet", async () => {
    // The column is newer than the table. A snapshot missing the names is worth
    // far more than a night with no snapshot at all, so the read is on its own
    // and allowed to fail — which is what this fake does by having no contact
    // table to ask.
    const { client } = fakePrisma({ cemeteries: [{ ...CEMETERY, contacts: [{ id: "c1", ...CEMETERY.contacts[0] }] }] });
    const snapshot = await buildContentSnapshot(client, TAKEN);
    assert.equal(snapshot.cemeteries[0]!.contacts[0]!.name, null);
    assert.equal(snapshot.cemeteries[0]!.contacts[0]!.phone, "+380 50 000 0000");
  });

  it("stamps the time it was given rather than reading the clock", async () => {
    const { client } = fakePrisma({ cemeteries: [CEMETERY] });
    const snapshot = await buildContentSnapshot(client, TAKEN);
    assert.equal(snapshot.takenAt, TAKEN);
    assert.equal(snapshot.schemaVersion, SNAPSHOT_SCHEMA_VERSION);
  });

  it("reads in a stable order, so a diff is a real change and not a reshuffle", async () => {
    const { client, asked } = fakePrisma({ cemeteries: [CEMETERY] });
    await buildContentSnapshot(client, TAKEN);
    const order = (asked.cemetery as { orderBy?: unknown }).orderBy;
    assert.deepEqual(order, [{ country: "asc" }, { city: "asc" }, { slug: "asc" }]);
    const burialOrder = (asked.cemetery as { include?: { burials?: { orderBy?: unknown } } }).include?.burials?.orderBy;
    assert.deepEqual(burialOrder, { name: "asc" });
  });
});

describe("refusing to overwrite a good copy with a bad one", () => {
  it("rejects a snapshot with nothing in it", async () => {
    // An empty read is a wrong or unreachable database, not a site with no
    // batei hachaim. Committing it would replace the truth with a confident
    // lie, which is worse than a stale file and much harder to notice.
    const { client } = fakePrisma({});
    const empty = await buildContentSnapshot(client, TAKEN);
    assert.match(snapshotProblem(empty) ?? "", /empty or wrong database/i);
  });

  it("accepts one that actually read something", async () => {
    const { client } = fakePrisma({ cemeteries: [CEMETERY] });
    assert.equal(snapshotProblem(await buildContentSnapshot(client, TAKEN)), null);
  });

  it("rejects a file written by a different version of this code", async () => {
    const { client } = fakePrisma({ cemeteries: [CEMETERY] });
    const snapshot = await buildContentSnapshot(client, TAKEN);
    assert.match(snapshotProblem({ ...snapshot, schemaVersion: 99 }) ?? "", /schema version/i);
  });
});

describe("the directory listings are backed up at last", () => {
  /**
   * They lived in one Redis key with no backup anywhere: the private export
   * held only data/directory.ts, and this snapshot did not cover providers at
   * all. The owner lost his to a bug in that store and there was nothing to
   * restore from.
   */
  const SNAP = readFileSync("lib/content-snapshot.ts", "utf8");
  const EXPORT = readFileSync("lib/content-export.ts", "utf8");

  it("KNOWS THE DIFFERENCE BETWEEN NONE AND COULD-NOT-LOOK", () => {
    // A backup that cannot tell those apart is one that will be restored from
    // confidently and wrongly.
    assert.match(SNAP, /directorySource: "store" \| "not-configured"/);
    assert.match(SNAP, /return \{ directory: \[\], directorySource: "not-configured" \}/);
  });

  it("PUTS NOTHING IN THE PUBLIC FILE THAT IS NOT ALREADY PUBLIC", () => {
    // This file is committed to a public repository.
    const fn = SNAP.slice(SNAP.indexOf("async function snapshotDirectory"), SNAP.indexOf("export async function buildContentSnapshot"));
    assert.match(fn, /p\.published !== false/, "unpublished listings are not filtered out");
    assert.match(fn, /publishableContact/, "phone numbers bypass the consent rule");
    for (const ownerOnly of ["notes", "featuredReason", "contactConsentNote"]) {
      assert.ok(!fn.includes(`p.${ownerOnly}`), `${ownerOnly} is the owner's own record and is in the public file`);
    }
  });

  it("the private export carries all three sources, in full", () => {
    // The built-in file, the database table, and the Redis store — the last of
    // which is the only one with no other copy anywhere.
    assert.match(EXPORT, /directoryDatabase: unknown\[\]/);
    assert.match(EXPORT, /directoryListings: unknown\[\]/);
    assert.match(EXPORT, /out\.directoryListings = await listStoredProviders\(\)/);
    assert.match(EXPORT, /prisma\.directoryProvider\.findMany/);
  });

  it("reads the store even with no database", () => {
    // The listings do not live in the database, so a deployment without
    // DATABASE_URL still has them and an export there must still capture them.
    const before = EXPORT.indexOf("out.directoryListings = await listStoredProviders()");
    const dbBlock = EXPORT.indexOf('if (process.env.DATABASE_URL)');
    assert.ok(before < dbBlock, "the store read is inside the database block");
  });

  it("the scheduled run is given the credentials to reach it", () => {
    const flow = readFileSync(".github/workflows/content-snapshot.yml", "utf8");
    assert.match(flow, /UPSTASH_REDIS_REST_URL: \$\{\{ secrets\.UPSTASH_REDIS_REST_URL \}\}/);
    assert.match(flow, /UPSTASH_REDIS_REST_TOKEN: \$\{\{ secrets\.UPSTASH_REDIS_REST_TOKEN \}\}/);
  });
});
