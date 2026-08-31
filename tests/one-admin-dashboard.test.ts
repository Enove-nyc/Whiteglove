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

describe("the owner's queue is one queue, and says nothing when there is nothing", () => {
  /**
   * IT WAS TWO, SPLIT BY FURNITURE. "Waiting on you" — six count cards — and
   * then, past "Add something" and "Quick actions", a second section called
   * "Work waiting for you" with four panels covering the same ground. The same
   * question, asked twice, with two launcher sections between the answers.
   *
   * AND ON A QUIET DAY IT FILLED A SCREEN SAYING THERE WAS NO WORK. All ten
   * rendered whatever the count was, nought included, and each of the four
   * panels wrote a sentence about being empty — "Every page is published", "No
   * visitor corrections are waiting", and so on. Ten containers to say there
   * is nothing to do.
   *
   * Two of those panels had the opposite problem: work, and no number. "Items
   * are marked unfinished" — how many? The count was in scope and unused.
   */
  const DASH = readFileSync("app/admin/page.tsx", "utf8");
  const code = DASH.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("builds the queue as one list", () => {
    assert.match(code, /const waiting: Array<\{ label: string; count: number; href: string \}>/);
  });

  it("leaves out anything with nothing in it", () => {
    // A card reading nought is not work, and it competes with the ones that are.
    assert.match(code, /\.filter\(\(item\) => item\.count > 0 && may\(item\.href\)\)/);
  });

  it("says one line when the whole queue is empty", () => {
    assert.match(code, /waiting\.length === 0 \? \(/);
    assert.match(code, /Nothing is waiting for you\./);
  });

  it("has no second queue further down the page", () => {
    // The four panels and the component they were built from are gone.
    assert.doesNotMatch(code, /WorkPanel/, "the second queue is back");
    assert.doesNotMatch(code, /Work waiting for you/);
  });

  it("no longer explains an empty section instead of hiding it", () => {
    for (const excuse of [
      "Every page is published",
      "No visitor corrections are waiting",
      "No listing candidates are waiting",
      "Nothing on the checklist is outstanding",
    ]) {
      assert.ok(!code.includes(excuse), `the dashboard still explains an empty section: ${excuse}`);
    }
  });

  it("gives every entry its own number", () => {
    // "Listings are waiting for verification" and "Items are marked
    // unfinished" both had the count in scope and printed neither.
    assert.doesNotMatch(code, /Listings are waiting for verification/);
    assert.doesNotMatch(code, /Items are marked unfinished/);
    assert.match(code, /value=\{item\.count\}/);
  });

  it("keeps the urgent alerts above the queue, where they were", () => {
    // "Needs attention" is the one surface that demands action today; the
    // queue is the everyday work under it. That order did not change.
    assert.ok(DASH.indexOf('id="attention-heading"') < DASH.indexOf('id="now-heading"'));
  });
});
