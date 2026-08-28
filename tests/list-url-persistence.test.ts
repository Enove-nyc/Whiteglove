import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * A narrowed list is a link somebody can send.
 *
 * /hotels and /things-to-do have kept their filters in the address bar since
 * components/useListUrl.ts was written, for reasons that are just as true of
 * the other four directories and were simply never applied to them: a search
 * among four hundred kevarim could not be sent to anybody, could not be
 * bookmarked, and was lost the moment somebody opened an entry and pressed
 * back — which on a page that long means starting again from the top.
 *
 * Confirmed in a browser: typing into each of the three fixed here puts ?q=
 * in the address, and reloading that address restores the search.
 */

const DIRECTORIES: Array<[string, string]> = [
  ["components/AttractionDirectory.tsx", "things to do"],
  ["components/KosherStayDirectory.tsx", "places to stay"],
  ["components/TzaddikimDirectory.tsx", "kevarim"],
  ["components/HechsherimDirectory.tsx", "certification marks"],
  ["components/EateryDirectory.tsx", "kosher listings"],
];

describe("every long directory keeps its search in the address", () => {
  for (const [file, what] of DIRECTORIES) {
    const source = readFileSync(file, "utf8");

    it(`${what} survive a link and a back button`, () => {
      assert.match(source, /useListUrl/, `${file} loses its search on navigation`);
    });

    it(`${what} hold no shadow copy of the query in local state`, () => {
      // Two sources of truth for one search box is how the address and the
      // field drift apart, and the field is the one somebody is looking at.
      assert.doesNotMatch(source, /const \[query, setQuery\] = useState/, `${file} still owns its own query state`);
    });

    it(`${what} offer a way back to everything`, () => {
      // Filters plus a search box is several places a list can be narrowed
      // from, and the way somebody ends up on an empty page is by setting two
      // and forgetting the first.
      assert.match(source, /onReset=/, `${file} has no reset`);
    });
  }
});

describe("the one that is not client-filtered still reads the address", () => {
  it("/cemeteries takes its country from the URL on the server", () => {
    // It fetches a page at a time from its own API rather than filtering in
    // the browser, so useListUrl is not the mechanism — the route reads the
    // parameter and hands it in. Recorded so the gap above is not "fixed"
    // here by bolting on a second mechanism that fights the first.
    const page = readFileSync("app/cemeteries/page.tsx", "utf8");
    assert.match(page, /searchParams/);
    assert.match(page, /initialCountry/);
  });
});
