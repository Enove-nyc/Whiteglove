import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { SITE_NAME, withSiteName } from "@/lib/seo";

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
