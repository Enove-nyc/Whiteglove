import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * One dashboard runs both companies.
 *
 * THE OWNER'S DECISION, recorded in AGENTS.md: he is the only person who signs
 * into it, so it is not split per brand. Everything for Kosher Travel and
 * everything for Itineraries lives on the same dashboard, reached the same way.
 *
 * WHAT THAT MAKES WRONG, and what this test catches: the dashboard's own chrome
 * naming one of the two companies. Every screen inside already said "White
 * Glove admin"; the two that did not were the login page and the signed-out
 * state — the front door, the one place a brand name reads as a claim about
 * which business you are about to administer.
 *
 * The screens THEMSELVES are not brand-neutral and should not be. Shuls and
 * hechsherim are kosher work; plans and client apps are itineraries work. Both
 * belong here, and both may say so. It is the frame around them that must not
 * pick a side.
 */

/** Every file under app/admin, plus the shell that wraps them. */
function adminFiles(dir = "app/admin"): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...adminFiles(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("the dashboard's own chrome names neither company", () => {
  const chrome = ["app/admin/login/page.tsx", "app/admin/layout.tsx", "components/AdminShell.tsx"];

  for (const file of chrome) {
    it(`${file} does not put a brand name on the frame`, () => {
      const source = readFileSync(file, "utf8");
      // Only the RENDERED text matters — the comment explaining why the brand
      // name was removed necessarily contains it.
      const withoutComments = source.replace(/\{\/\*[\s\S]*?\*\/\}|\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      assert.ok(
        !withoutComments.includes("White Glove Kosher Travel"),
        `${file} tells the owner he is administering one of the two companies`,
      );
      assert.ok(
        !withoutComments.includes("White Glove Itineraries"),
        `${file} tells the owner he is administering one of the two companies`,
      );
    });
  }

  it("says what it is instead", () => {
    for (const file of ["app/admin/login/page.tsx", "app/admin/layout.tsx"]) {
      assert.match(readFileSync(file, "utf8"), /White Glove admin/, `${file} lost its own name`);
    }
  });

  it("finds the screens still calling themselves the admin, so the wording is one wording", () => {
    // If this ever drops to zero, "White Glove admin" has been renamed
    // somewhere and the two doors above are now the odd ones out.
    const inside = adminFiles().filter((f) => readFileSync(f, "utf8").includes("White Glove admin"));
    assert.ok(inside.length > 5, `only ${inside.length} admin screens use the shared wording`);
  });
});

describe("the decision is written down where the next session reads it", () => {
  const agents = readFileSync("AGENTS.md", "utf8");

  it("is in the settled-decisions section", () => {
    const settled = agents.indexOf("## Settled decisions");
    const entry = agents.indexOf("One admin dashboard runs both sides");
    assert.ok(settled > 0, "AGENTS.md no longer has a settled-decisions section");
    assert.ok(entry > settled, "the decision is not recorded under settled decisions");
  });

  it("says the thing that must not be built", () => {
    assert.match(agents, /Do not build a second dashboard, a per-brand admin, or a brand switcher/);
  });
});
