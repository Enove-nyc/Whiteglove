import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { BRAND_NAME } from "@/lib/site-brand-core";

/**
 * The site does not tell a customer what the owner has not finished.
 *
 * IT IS A STANDING RULE and it had leaked twice. A kever page printed "Nothing
 * written here yet beyond his name and where he is buried" under a "Who he
 * was" heading, and /shabbos/[destination] printed "No mikvah is listed here
 * yet." Both are status lines about the database dressed as information about
 * a place, and "yet" turns each into a promise as well. A traveller learns
 * nothing from either that an absent section does not say without the apology.
 *
 * The page that carries neither still has everything somebody came for — a
 * name, where he is buried, a yahrzeit, how to get there — and Suggest edit is
 * on the action row either way, so anybody who knows more can still send it.
 */

function publicPageFiles(dir = "app", out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    // The admin is where content status BELONGS. It is the owner's own screen.
    if (entry === "admin" || entry === "api") continue;
    if (statSync(full).isDirectory()) publicPageFiles(full, out);
    else if (entry === "page.tsx" || entry === "layout.tsx") out.push(full);
  }
  return out;
}

/**
 * Phrases that tell a visitor about the state of the records rather than about
 * the place. Deliberately narrow: this must catch a status line and not an
 * honest "we do not know", which is a different thing the site is right to say.
 */
const STATUS_TALK = [
  /\bNothing written here yet\b/,
  /\bis listed here yet\b/,
  /\bnot published yet\b/,
  /\bbeing checked\b/,
  /\bresearch queue\b/,
  /\bunverified\b/i,
  /\bcoming soon\b/i,
];

describe("no public page reports the owner's progress to a customer", () => {
  const files = publicPageFiles();

  it("finds pages to check at all", () => {
    assert.ok(files.length > 40, `only found ${files.length} public pages`);
  });

  for (const phrase of STATUS_TALK) {
    it(`says nothing matching ${phrase}`, () => {
      const guilty = files.filter((file) => {
        // Comments explain the rule and quote what was removed; the rule is
        // about what a visitor is shown.
        const source = readFileSync(file, "utf8")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/[^\n]*/g, "");
        return phrase.test(source);
      });
      assert.deepEqual(guilty, []);
    });
  }
});

describe("an empty section does not render a heading over its own absence", () => {
  it("the kever page shows 'Who he was' only when there is something to say", () => {
    const page = readFileSync("app/tzaddikim/[person]/page.tsx", "utf8");
    assert.match(page, /\{burial\.note && \(/, "the heading renders without the note again");
  });

  it("a destination's Shabbos page drops a section it has nothing for", () => {
    const page = readFileSync("app/shabbos/[destination]/page.tsx", "utf8");
    assert.match(page, /\{place\.shuls\.length > 0 && \(/);
    assert.match(page, /\{place\.mikvaos\.length > 0 && \(/);
    assert.doesNotMatch(page, /empty=\{?"/, "ListingRows takes an apology to print again");
  });
});

describe("the pricing page names the product it is pricing", () => {
  it("does not describe this site as the one that carries a client's trip", () => {
    /**
     * It said `${BRAND_NAME[brand]} is where you build a trip, hand it to the
     * person taking it, and stay with them while they travel` — so on
     * whiteglovekoshertravel.com it claimed the kosher guide does that. It
     * does not: that is White Glove Itineraries, and these plans are its plans
     * on either domain.
     */
    const page = readFileSync("app/pricing/page.tsx", "utf8");
    assert.match(page, /\$\{BRAND_NAME\.itineraries\} is where you build a trip/);
    assert.doesNotMatch(page, /\$\{BRAND_NAME\[brand\]\} is where you build a trip/);
    assert.equal(BRAND_NAME.itineraries, "White Glove Itineraries");
  });
});
