import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * The site does not talk about itself.
 *
 * THE HABIT THIS EXISTS TO BREAK. A page said "Heritage travel, in its own
 * section", and another that a list was "short on purpose", and a third that we
 * had left something out because "we would rather say that than show a button
 * that does nothing". Every one of those sentences is true, and every one is a
 * note from the people who built the page to themselves, printed where a
 * visitor can read it.
 *
 * Two things are wrong with that, and the second is the one that matters.
 *
 * It tells a visitor things they had no way of knowing and no reason to care
 * about. Nobody arriving here knew the heritage side was once the whole site.
 * Saying it is in its own section now is only meaningful to somebody who
 * remembers when it was not — which is us.
 *
 * And it reads as written by a committee explaining its decisions rather than
 * by a person who knows about travel. A shop does not put up a sign saying
 * which shelf it moved the bread to and why.
 *
 * SO: pages state what is true and useful. The reasoning behind an editorial
 * choice belongs in the source, in the comments, where it is genuinely useful
 * to whoever changes it next — and the comments are stripped before this test
 * looks, deliberately, because that is the right place for it.
 *
 * WHAT THIS DOES NOT COVER, and must not:
 *
 *   • The owner's own screens. The admin explains its tools to the person
 *     using them; that is what a tool should do.
 *   • Editorial notes to a traveler in the data files. "Coordinates
 *     deliberately not listed — the published pin is on the glacier, navigate
 *     to the station at Chamonix instead" is exactly the kind of thing this
 *     site exists to say.
 */

const PHRASES: Array<[RegExp, string]> = [
  [/in its own section/i, "tells the visitor the section used to be something else"],
  [/rather than being the door/i, "same"],
  [/\bused to\b/i, "the site's own history"],
  [/\bno longer\b/i, "the site's own history"],
  [/\bpreviously\b/i, "the site's own history"],
  [/\boriginally\b/i, "the site's own history"],
  [/\bredesign(ed)?\b/i, "the site's own history"],
  [/still building/i, "an apology for being unfinished"],
  [/on purpose\b/i, "explaining an editorial decision to the visitor"],
  [/\bdeliberately\b/i, "explaining an editorial decision to the visitor"],
  [/we would rather\b/i, "defending an editorial decision to the visitor"],
  [/not a picture of one/i, "arguing with an objection nobody made"],
  [/would have been a claim/i, "explaining our own standards mid-page"],
];

/**
 * Visitor-facing copy: every page outside the admin, plus the components that
 * carry prose onto one. Owner-facing components are named out — they explain a
 * tool to the person operating it, which is their job.
 */
const OWNER_FACING = /Admin|Editor|Manager|Panel|Queue|Control|Form(s)?$|Wizard|Log$|Test$|Setup|Settings/;

function visitorFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (path.includes("admin")) continue;
        walk(path);
      } else if (entry === "page.tsx") {
        out.push(path);
      }
    }
  };
  walk("app");
  for (const entry of readdirSync("components")) {
    if (!entry.endsWith(".tsx")) continue;
    if (OWNER_FACING.test(entry.replace(/\.tsx$/, ""))) continue;
    out.push(join("components", entry));
  }
  return out;
}

/** Comments stripped: the reasoning belongs there, and only there. */
function copyIn(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

describe("the site does not narrate its own edits", () => {
  const files = visitorFiles();

  it("looks at a real number of visitor-facing files", () => {
    // A walk that silently matched nothing would pass every rule below.
    assert.ok(files.length > 40, `only ${files.length} files scanned`);
  });

  for (const [pattern, why] of PHRASES) {
    it(`says nothing that ${why} — ${pattern.source}`, () => {
      const found: string[] = [];
      for (const file of files) {
        const copy = copyIn(file);
        const match = pattern.exec(copy);
        if (match) {
          const at = copy.slice(Math.max(0, match.index - 60), match.index + 60).replace(/\s+/g, " ").trim();
          found.push(`${file}: …${at}…`);
        }
      }
      assert.deepEqual(found, [], `visitor-facing copy explaining the site to itself:\n${found.join("\n")}`);
    });
  }
});
