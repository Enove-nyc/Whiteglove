import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * What the site does when the content store has a blip.
 *
 * Two things had to be true at once, and they pull in opposite directions.
 *
 * A READ must degrade. The front page and the route planner both returned a
 * 500 when this store was unreachable — because of an advert. An advert that
 * does not appear is a great deal better than a front page that does not
 * appear.
 *
 * A WRITE must refuse. Every save in lib/admin-content.ts is read-modify-write
 * over one big value, so a read that quietly returned "empty" during the same
 * blip, followed by a write that succeeded, would replace every location,
 * every listing and every advert with nothing. The hard failure was preventing
 * that by accident; catching it without care would have introduced it.
 *
 * These are source checks rather than behaviour tests because the behaviour
 * that matters is a network failure inside a module-level fetch, and the
 * measurement that proves it is the outage audit — scripts/audit-outage.mjs,
 * run against a real server with the store pointed at a dead port.
 */

const SOURCE = readFileSync("lib/admin-content.ts", "utf8");

/** Every exported function in the file, with its body. */
function functions(): Array<{ name: string; body: string }> {
  const out: Array<{ name: string; body: string }> = [];
  const starts = [...SOURCE.matchAll(/export async function (\w+)/g)];
  starts.forEach((match, i) => {
    const from = match.index ?? 0;
    const to = i + 1 < starts.length ? (starts[i + 1].index ?? SOURCE.length) : SOURCE.length;
    out.push({ name: match[1], body: SOURCE.slice(from, to) });
  });
  return out;
}

describe("a read degrades", () => {
  it("catches a store that cannot be reached", () => {
    // This is the fix. Without it the failure came straight out of the page
    // that asked for an advert.
    const redis = SOURCE.slice(SOURCE.indexOf("async function redis<T>"), SOURCE.indexOf("function slugify"));
    assert.ok(redis.includes("try {"), "the fetch is not inside a try");
    assert.ok(redis.includes("return UNREACHABLE;"), "a failure is not told apart from an empty store");
  });

  it("reads an unreachable store as the built-in defaults", () => {
    assert.match(SOURCE, /parseBundle\(response === UNREACHABLE \? undefined : response\?\.result\)/);
  });
});

describe("a write refuses", () => {
  it("EVERY SAVE READS THE BUNDLE THE SAFE WAY", () => {
    // THE ONE THAT MATTERS. A save that used the rendering read would write on
    // top of a bundle it never actually read, and one blip would take three
    // hundred locations with it.
    const offenders = functions()
      .filter((f) => f.body.includes("writeBundle("))
      .filter((f) => f.body.includes("await readBundle()"));
    assert.deepEqual(
      offenders.map((f) => f.name),
      [],
      `these write the bundle back after reading it the rendering way: ${offenders.map((f) => f.name).join(", ")}. Use bundleToModify().`,
    );
  });

  it("and stops when it could not be read", () => {
    const missing = functions()
      .filter((f) => f.body.includes("bundleToModify()"))
      .filter((f) => !/if \(!bundle\) return/.test(f.body));
    assert.deepEqual(missing.map((f) => f.name), [], "reads for a write and carries on regardless");
  });

  it("does not report a store outage as a missing record", () => {
    // "That suggestion is no longer there" would tell somebody their work had
    // been deleted, which is not what happened.
    const review = functions().find((f) => f.name === "reviewSuggestion");
    assert.ok(review, "reviewSuggestion is gone");
    assert.match(review.body, /if \(!bundle\) return false;/, "an unreachable store is reported as a missing suggestion");
  });

  it("counts a failed write as a failed write", () => {
    // Boolean(sentinel) is true. Writing this the obvious way would have
    // reported every failed save as a success.
    assert.match(SOURCE, /return response !== undefined && response !== UNREACHABLE;/);
  });
});

describe("everywhere else was already careful", () => {
  it("has no other unguarded store fetch in lib/", () => {
    // Checked once, so the next one added without a catch is caught here.
    // A fetch is guarded when there is a try before it inside its own function.
    const files = ["admin-content", "site-analytics", "border-store", "site-words-store", "beta-notice-store", "planner-settings-store", "account-store", "hechsher-store", "directory-store"];
    const unguarded: string[] = [];
    for (const name of files) {
      let src: string;
      try {
        src = readFileSync(`lib/${name}.ts`, "utf8");
      } catch {
        continue;
      }
      for (const match of src.matchAll(/\bawait fetch\(/g)) {
        const before = src.slice(0, match.index ?? 0);
        const fnStart = before.lastIndexOf("function ");
        if (!before.slice(fnStart).includes("try {")) unguarded.push(`${name}.ts`);
      }
    }
    assert.deepEqual([...new Set(unguarded)], [], `an unguarded store fetch: ${[...new Set(unguarded)].join(", ")}`);
  });
});
