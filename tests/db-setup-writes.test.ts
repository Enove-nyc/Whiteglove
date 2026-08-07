import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildSeedRows, countSeedRows } from "@/lib/seed-data";

/**
 * The re-import must write back everything it deletes, and count only what it
 * writes.
 *
 * THIS EXISTS BECAUSE THE DIRECTORY WAS DELETED AND NEVER PUT BACK. seedDatabase
 * deleted all thirty built-in businesses by slug and had no
 * `directoryProvider.createMany` at all — while countSeedRows still reported
 * thirty, so the button said "imported 30 directory listings" immediately after
 * destroying them. Every other kind in the seed had its create; this one alone
 * did not, and nothing anywhere compared the two lists.
 *
 * Reported by the owner, twice, as a lost directory.
 */

const SOURCE = readFileSync("lib/db-setup.ts", "utf8");

/** The Prisma models seedDatabase deletes, and the ones it creates. */
function modelsIn(kind: "deleteMany" | "createMany"): Set<string> {
  const seed = SOURCE.slice(SOURCE.indexOf("export async function seedDatabase"));
  return new Set([...seed.matchAll(new RegExp(`prisma\\.(\\w+)\\.${kind}`, "g"))].map((m) => m[1]));
}

describe("nothing is deleted and left deleted", () => {
  it("WRITES BACK EVERY MODEL IT DELETES", () => {
    // THE ONE THAT MATTERS. A delete with no matching create is a re-import
    // that removes content and reports success.
    const deleted = modelsIn("deleteMany");
    const created = modelsIn("createMany");
    // Destinations and cemeteries are updated in place and never deleted, so
    // they appear in neither list; anything that IS deleted has to come back.
    const orphaned = [...deleted].filter((model) => !created.has(model));
    assert.deepEqual(
      orphaned,
      [],
      `deleted by the re-import and never created again: ${orphaned.join(", ")}. ` +
        "A re-import that deletes and does not write back destroys content and reports success.",
    );
  });

  it("creates the directory providers by name", () => {
    // Named rather than inferred, because this is the one that was missing.
    assert.match(SOURCE, /prisma\.directoryProvider\.createMany\(\{ data: rows\.directory \}\)/);
  });
});

describe("the counts describe what was written", () => {
  it("counts nothing it does not create", () => {
    // "Imported 30 directory listings" was true of the count and false of the
    // database. A number in that message has to be backed by a write.
    const created = modelsIn("createMany");
    const counted = Object.keys(countSeedRows(buildSeedRows()));
    // How each counted kind maps to the model that stores it.
    const model: Record<string, string> = {
      destinations: "destination",
      cemeteries: "cemetery",
      tzaddikim: "tzaddik",
      contacts: "contact",
      places: "practicalPlace",
      directory: "directoryProvider",
      attractions: "attraction",
      stays: "kosherStay",
      areas: "kosherArea",
    };
    const unwritten = counted.filter((kind) => {
      const name = model[kind];
      // Destinations and cemeteries are upserted in place rather than created
      // in bulk, so they are legitimately absent from createMany.
      if (!name || name === "destination" || name === "cemetery") return false;
      return !created.has(name);
    });
    assert.deepEqual(unwritten, [], `counted in the result but never written: ${unwritten.join(", ")}`);
  });

  it("still counts the thirty businesses", () => {
    assert.equal(countSeedRows(buildSeedRows()).directory, 30);
  });
});

describe("what the re-import overwrites is recoverable", () => {
  it("records the businesses it is about to replace, before deleting them", () => {
    // A re-import legitimately restores a built-in business to the shipped
    // text. Doing it without a trace is what made it feel like a loss — an
    // ordinary edit goes through updateProvider and is recorded; this writes to
    // Prisma directly and was not.
    const seed = SOURCE.slice(SOURCE.indexOf("export async function seedDatabase"));
    const recordAt = seed.indexOf("recordProvidersBeingReplaced");
    const deleteAt = seed.indexOf("prisma.directoryProvider.deleteMany");
    assert.ok(recordAt !== -1, "nothing records what the re-import replaces");
    assert.ok(recordAt < deleteAt, "the previous values are read after they have been deleted");
  });

  it("says how many carried the owner's own wording", () => {
    assert.match(SOURCE, /replacedProviders/);
    const route = readFileSync("app/api/admin/db-setup/route.ts", "utf8");
    assert.match(route, /Admin → History/, "the result does not say where to find what was replaced");
  });
});
