import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { INIT_SQL } from "@/lib/init-sql";

/**
 * The generated SQL must not fall behind the schema.
 *
 * It did, for months. `lib/init-sql.ts` is what the admin's "set up the
 * database" button runs, and it had been generated back when the directory
 * tables were added and never again — so it was missing the six PlaceCategory
 * values, the whole Photo table, the verification and consent columns, and
 * everything after. Nothing failed loudly. A database provisioned with that
 * button would simply have come up missing them, and the first symptom would
 * have been a picture refusing to save.
 *
 * These tests are cheap and structural: every model, every enum, every enum
 * value in schema.prisma has to appear. They do not prove the SQL is correct —
 * only applying it to a real PostgreSQL and diffing does that, which is how
 * this change was checked. What they do is make silence impossible.
 */

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

const modelNames = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]);
const enumBlocks = [...schema.matchAll(/^enum\s+(\w+)\s*\{([^}]*)\}/gm)].map((m) => ({
  name: m[1],
  values: m[2].split("\n").map((line) => line.trim()).filter((line) => /^\w+$/.test(line)),
}));

describe("the SQL the setup button runs", () => {
  it("found some models and enums to check", () => {
    // A regex that quietly matches nothing would make every test below pass.
    assert.ok(modelNames.length > 10, `only found ${modelNames.length} models`);
    assert.ok(enumBlocks.length >= 4, `only found ${enumBlocks.length} enums`);
  });

  it("creates a table for every model", () => {
    for (const name of modelNames) {
      assert.ok(
        INIT_SQL.includes(`CREATE TABLE "${name}"`),
        `${name} is in schema.prisma but not in the generated SQL — run npm run build:sql`,
      );
    }
  });

  it("creates every enum, with every one of its values", () => {
    for (const { name, values } of enumBlocks) {
      assert.ok(INIT_SQL.includes(`CREATE TYPE "${name}"`), `enum ${name} is missing — run npm run build:sql`);
      const declaration = INIT_SQL.slice(INIT_SQL.indexOf(`CREATE TYPE "${name}"`)).split(";")[0];
      for (const value of values) {
        assert.ok(
          declaration.includes(`'${value}'`),
          `${name}.${value} is missing from the generated SQL — run npm run build:sql`,
        );
      }
    }
  });

  it("carries the things that were missing when this was found", () => {
    // Named rather than left to the loops above, so the specific regression
    // that prompted this is the thing that fails first if it comes back.
    for (const needed of [
      `CREATE TABLE "Photo"`,
      "'TEFILLOS'",
      "'SHABBOS'",
      "'HOSPITAL'",
      "'EMERGENCY'",
      "'GROCERY'",
      "'PARKING'",
      '"contactConsent"',
      '"featuredReason"',
      '"placeId"',
      '"submittedAt"',
    ]) {
      assert.ok(INIT_SQL.includes(needed), `${needed} is missing — run npm run build:sql`);
    }
  });

  it("is a raw template literal that cannot have been cut short", () => {
    // A backtick in the SQL would end the literal early and the file would
    // still compile, as something else.
    assert.ok(!INIT_SQL.includes("`"));
    assert.ok(INIT_SQL.trimStart().startsWith("-- CreateSchema"));
    assert.ok(INIT_SQL.includes("ADD CONSTRAINT"), "the foreign keys are part of it, not just the tables");
  });
});
