import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { pageMetadata, SITE_NAME, withSiteName } from "@/lib/seo";

const ITINERARIES_NAME = "White Glove Itineraries";

/**
 * Every page ends its title the same way.
 *
 * The pages hand-wrote three endings — "| White Glove Kosher Travel", the
 * em-dash "— White Glove Kosher Travel", and the short "| White Glove" — so a
 * page of the site's own results in a search engine read like three different
 * sites. pageMetadata folds all of them to one; these hold that fold.
 */

const SUFFIX = ` | ${SITE_NAME}`;

describe("one title ending for the whole site", () => {
  it("folds the three hand-written endings to the canonical one", () => {
    assert.equal(withSiteName("Search Booking Partners | White Glove Kosher Travel"), `Search Booking Partners${SUFFIX}`);
    assert.equal(withSiteName("Rate how it went — White Glove Kosher Travel"), `Rate how it went${SUFFIX}`);
    assert.equal(withSiteName("Kivrei Tzadikim Directory | White Glove"), `Kivrei Tzadikim Directory${SUFFIX}`);
  });

  it("adds the ending to a title that carried none", () => {
    assert.equal(withSiteName("Travel information"), `Travel information${SUFFIX}`);
  });

  it("leaves an internal dash alone — only the trailing brand is touched", () => {
    assert.equal(
      withSiteName("Zmanim — halachic times for your destination | White Glove Kosher Travel"),
      `Zmanim — halachic times for your destination${SUFFIX}`,
    );
  });

  it("does not turn the brand into the brand twice", () => {
    // The home page's title IS the brand; it must not become "… | White Glove".
    assert.equal(withSiteName(SITE_NAME), SITE_NAME);
  });

  it("is idempotent — running it again changes nothing", () => {
    const once = withSiteName("Kosher food finder");
    assert.equal(withSiteName(once), once);
  });

  it("no public page still hand-writes an off-brand ending", () => {
    // pageMetadata normalises everything that flows through it; these pages
    // build their metadata by hand and are checked directly.
    for (const file of ["app/not-found.tsx", "app/version/page.tsx", "app/page.tsx"]) {
      const source = readFileSync(file, "utf8");
      assert.doesNotMatch(source, /title:\s*"[^"]*— White Glove/, `${file} uses an em-dash brand ending`);
      assert.doesNotMatch(source, /title:\s*"[^"]*\| White Glove"/, `${file} uses the short brand ending`);
    }
  });
});

describe("two brands, never both at once", () => {
  // THE ACTUAL BUG. withSiteName only ever recognized "White Glove[ Kosher
  // Travel]" as an existing brand ending, so a title already correctly
  // written for the itineraries brand — "… | White Glove Itineraries" — fell
  // through as "carries no ending yet" and got a SECOND, kosher-branded
  // ending appended after it. Confirmed live in production on /account,
  // /proposal and /login before this fix: every "brand-aware" itineraries
  // page's actual <title> read both names at once.

  it("an itineraries title with a pipe/dash ending is left itineraries-branded, never doubled", () => {
    assert.equal(withSiteName("Your account | White Glove Itineraries"), "Your account | White Glove Itineraries");
    assert.equal(withSiteName("Build a proposal — White Glove Itineraries"), "Build a proposal | White Glove Itineraries");
  });

  it("an itineraries title with NO separator at all — a natural sentence — is left exactly as written", () => {
    // "Sign in to White Glove Itineraries" carries no pipe or dash before the
    // brand at all; rewriting it naively leaves a stray "to | White Glove
    // Itineraries" behind, which is itself wrong even without the doubling.
    assert.equal(withSiteName("Sign in to White Glove Itineraries"), "Sign in to White Glove Itineraries");
    assert.equal(withSiteName("Sign in to White Glove Kosher Travel"), "Sign in to White Glove Kosher Travel");
  });

  it("never appends the kosher ending onto an already itineraries-branded title", () => {
    const result = withSiteName("Your account | White Glove Itineraries");
    assert.doesNotMatch(result, /Kosher Travel/);
  });

  it("never appends the itineraries ending onto an already kosher-branded title", () => {
    const result = withSiteName("Your account | White Glove Kosher Travel");
    assert.doesNotMatch(result, /Itineraries/);
  });

  it("the whole-title-is-the-brand case works for itineraries too, not just kosher", () => {
    assert.equal(withSiteName(ITINERARIES_NAME), ITINERARIES_NAME);
  });

  it("is idempotent for an itineraries title too", () => {
    const once = withSiteName("Your account | White Glove Itineraries");
    assert.equal(withSiteName(once), once);
  });

  it("pageMetadata's openGraph.siteName always matches whichever brand the title actually names", () => {
    const itin = pageMetadata({ title: "Sign in to White Glove Itineraries", description: "d", path: "/login" });
    assert.equal(itin.openGraph?.siteName, ITINERARIES_NAME);
    assert.doesNotMatch(String(itin.title), /Kosher Travel/);

    const kosher = pageMetadata({ title: "Rome | White Glove Kosher Travel", description: "d", path: "/destinations/rome" });
    assert.equal(kosher.openGraph?.siteName, SITE_NAME);
  });

  it("the share-card image alt text names whichever brand the title actually is, not always the kosher one", () => {
    const itin = pageMetadata({ title: "Sign in to White Glove Itineraries", description: "d", path: "/login" });
    const image = itin.openGraph && "images" in itin.openGraph ? itin.openGraph.images : undefined;
    const alt = Array.isArray(image) ? (image[0] as { alt?: string } | undefined)?.alt : undefined;
    assert.equal(alt, ITINERARIES_NAME);
  });
});
