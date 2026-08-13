import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { linkHost, publishableLinks, safeExternalUrl } from "@/lib/useful-links";
import { cityGuides } from "@/data/destinations-detailed";

/**
 * Links that leave the site.
 *
 * Everything else the site links to is its own — lib/page-blocks.ts forces
 * card hrefs to be same-site precisely because a block editor is not a place
 * to put a stranger's URL. These are the exception, so the check that makes an
 * href safe has to happen here instead.
 */

describe("what may become an href", () => {
  it("keeps an ordinary https address", () => {
    assert.equal(safeExternalUrl("https://www.umaninfo.com/ways"), "https://www.umaninfo.com/ways");
  });

  it("adds https to a domain typed from memory", () => {
    // The owner types "umaninfo.com". Refusing that teaches him nothing.
    assert.equal(safeExternalUrl("umaninfo.com"), "https://umaninfo.com/");
  });

  it("upgrades http rather than refusing it", () => {
    assert.equal(safeExternalUrl("http://umaninfo.com/ways"), "https://umaninfo.com/ways");
  });

  it("REFUSES the schemes that turn a page into somebody else's", () => {
    for (const bad of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:msgbox",
      "file:///etc/passwd",
    ]) {
      assert.equal(safeExternalUrl(bad), null, bad);
    }
  });

  it("refuses a hostname with no dot — a typo, or an internal address", () => {
    assert.equal(safeExternalUrl("localhost"), null);
    assert.equal(safeExternalUrl("https://intranet/secret"), null);
  });

  it("refuses empty and whitespace", () => {
    for (const nothing of ["", "   ", undefined, null]) assert.equal(safeExternalUrl(nothing), null);
  });
});

describe("saying where a link goes", () => {
  it("gives the host without the www", () => {
    assert.equal(linkHost("https://www.umaninfo.com/ways"), "umaninfo.com");
    assert.equal(linkHost("https://lizansk.com/en/lizhensk/"), "lizansk.com");
  });

  it("returns nothing for a string that is not a URL", () => {
    assert.equal(linkHost("not a url"), "");
  });
});

describe("preparing a town's links for the page", () => {
  it("drops the ones that cannot be linked, and keeps the rest", () => {
    const out = publishableLinks([
      { label: "Good", url: "https://umaninfo.com/" },
      { label: "Bad", url: "javascript:alert(1)" },
    ]);
    assert.deepEqual(out.map((l) => l.label), ["Good"]);
  });

  it("falls back to the host when a link was pasted without a label", () => {
    // Better than hiding it: somebody who pasted a URL and tabbed away should
    // see the link, not wonder where it went.
    const [only] = publishableLinks([{ label: "", url: "https://www.umaninfo.com/ways" }]);
    assert.equal(only.label, "umaninfo.com");
  });
});

describe("the links that ship with the site", () => {
  it("are all printable — a dead scheme in the data file would be silent", () => {
    for (const guide of cityGuides) {
      for (const link of guide.usefulLinks ?? []) {
        assert.ok(safeExternalUrl(link.url), `${guide.slug}: ${link.url}`);
        assert.ok(link.label.trim().length > 0, `${guide.slug}: link with no label`);
        // Never the bare address as the label — it tells a visitor nothing
        // about why they would click it.
        assert.doesNotMatch(link.label, /^https?:\/\//, `${guide.slug}: label is a URL`);
      }
    }
  });
});

describe("the same link from two places", () => {
  /**
   * THE BUG THIS CATCHES. Every link that ships in a guide is also seeded into
   * the database, so the moment the owner presses "Set up database" the page
   * has both copies. Nothing deduped them, so Uman would quietly list
   * umaninfo.com twice — and only after a button press unrelated to links.
   */
  it("shows a seeded link once, not twice", () => {
    const out = publishableLinks([
      { label: "Uman Info (his edit)", url: "https://www.umaninfo.com/" },
      { label: "Uman Info", url: "https://www.umaninfo.com/" },
    ]);
    assert.equal(out.length, 1);
  });

  it("keeps the first — callers pass the database rows first, so his edit wins", () => {
    const [only] = publishableLinks([
      { label: "His own wording", url: "https://www.umaninfo.com/" },
      { label: "The shipped wording", url: "https://www.umaninfo.com/" },
    ]);
    assert.equal(only.label, "His own wording");
  });

  it("treats a trailing slash and a bare domain as the same link", () => {
    // He types "umaninfo.com"; the seed holds "https://www.umaninfo.com/".
    // Only one of those was ever typed that way, and neither is a difference
    // anybody means.
    assert.equal(publishableLinks([{ label: "a", url: "https://umaninfo.com" }, { label: "b", url: "https://umaninfo.com/" }]).length, 1);
  });

  it("still keeps genuinely different pages on the same site", () => {
    const out = publishableLinks([
      { label: "Uman Info", url: "https://www.umaninfo.com/" },
      { label: "Ways to get there", url: "https://www.umaninfo.com/ways" },
    ]);
    assert.equal(out.length, 2);
  });
});
