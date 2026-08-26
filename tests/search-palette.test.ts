import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { codeOf } from "./helpers/source";

const PALETTE = codeOf("components/SearchPalette.tsx");

describe("a shortcut, not another door", () => {
  it("adds nothing to the page — it renders only when opened", () => {
    // The header already carries a search icon and the phone bar carries
    // Search. A third visible door to the same room would be furniture.
    assert.match(PALETTE, /if \(!open\) return null/);
  });

  it("opens the same search the rest of the site uses", () => {
    // Not a second index with a second ranking. That is how a "command
    // centre" quietly becomes a different search with different answers.
    assert.match(PALETTE, /DestinationSearch/);
  });

  it("is mounted once, outside the page's own content", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    assert.match(layout, /<SearchPalette \/>/);
    assert.ok(
      layout.indexOf("<SearchPalette />") > layout.indexOf("</div>"),
      "the palette should sit outside #main-content, like the assistant",
    );
  });
});

describe("it never steals a keystroke", () => {
  it("ignores the shortcut while somebody is typing", () => {
    // A slash inside a form field is a slash.
    assert.match(PALETTE, /target\?\.tagName === "INPUT"/);
    assert.match(PALETTE, /target\?\.tagName === "TEXTAREA"/);
    assert.match(PALETTE, /isContentEditable === true/);
    assert.match(PALETTE, /if \(typing\) return;/);
  });

  it("takes plain / and ⌘K, and nothing with another modifier on it", () => {
    assert.match(PALETTE, /event\.key === "\/" && !event\.metaKey && !event\.ctrlKey && !event\.altKey/);
    assert.match(PALETTE, /event\.key\.toLowerCase\(\) === "k" && \(event\.metaKey \|\| event\.ctrlKey\)/);
  });

  it("closes on Escape and on a press outside", () => {
    assert.match(PALETTE, /event\.key === "Escape"/);
    assert.match(PALETTE, /event\.target === event\.currentTarget\) setOpen\(false\)/);
  });
});

describe("where it does not belong", () => {
  it("is absent from a client's own trip app", () => {
    // One trip on a phone, not the website — the same rule the assistant
    // follows, read through the same helper so the two cannot disagree.
    assert.match(PALETTE, /isClientCodeAppView\(pathname\)\) return null/);
  });

  it("closes itself on a page change, during render rather than in an effect", () => {
    assert.match(PALETTE, /useOnValueChange\(pathname/);
    assert.doesNotMatch(PALETTE, /useEffect\(\(\) => \{\s*setOpen\(false\);/);
  });
});

describe("it is a dialog to a screen reader", () => {
  it("says so, and traps the keyboard while it is open", () => {
    assert.match(PALETTE, /role="dialog"/);
    assert.match(PALETTE, /aria-modal="true"/);
    assert.match(PALETTE, /aria-label="Search White Glove"/);
    assert.match(PALETTE, /useFocusTrap<HTMLDivElement>\(open/);
  });
});
