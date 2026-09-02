import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  cleanQuickEdit,
  emptyQuickEdit,
  hasChanges,
  isQuickEditKind,
  publishedLine,
  quickEditProblem,
  MAX_NAME,
} from "@/data/listing-quick-edit";

const base = () => ({ ...emptyQuickEdit(), name: "Mendy's Cars", city: "Krakow", country: "Poland" });

describe("what the panel will accept", () => {
  it("wants a name", () => {
    assert.match(String(quickEditProblem({ ...base(), name: "  " })), /name/i);
    assert.equal(quickEditProblem(base()), null);
  });

  it("keeps the name short enough for the row to stay readable", () => {
    assert.match(String(quickEditProblem({ ...base(), name: "x".repeat(MAX_NAME + 1) })), /under/);
  });

  it("refuses a website that is not one", () => {
    assert.match(String(quickEditProblem({ ...base(), website: "mendys.example" })), /http/);
    assert.equal(quickEditProblem({ ...base(), website: "https://mendys.example" }), null);
  });

  it("points at the full editor rather than growing a longer box", () => {
    assert.match(String(quickEditProblem({ ...base(), description: "x".repeat(601) })), /full editor/);
  });
});

describe("saving only what changed", () => {
  it("a stray space is not a change", () => {
    assert.equal(hasChanges(base(), { ...base(), name: " Mendy's Cars " }), false);
  });

  it("a real edit is", () => {
    assert.equal(hasChanges(base(), { ...base(), phone: "+48 12 345" }), true);
    assert.equal(hasChanges(base(), { ...base(), published: true }), true);
  });

  it("trims before it stores", () => {
    assert.equal(cleanQuickEdit({ ...base(), phone: "  123  " }).phone, "123");
  });
});

describe("an unpublished listing", () => {
  it("is named as such rather than looking live", () => {
    // The panel IS the preview for something with no public page, so it has to
    // say which state it is in.
    assert.match(publishedLine(false), /Not published yet/);
    assert.match(publishedLine(false), /only you can see this/);
    assert.match(publishedLine(true), /Live/);
  });
});

describe("a listing with nowhere to save to", () => {
  const ROUTE = readFileSync("app/api/admin/listing/route.ts", "utf8");

  it("IS REFUSED AT THE DOOR, not merely greyed out in the panel", () => {
    // A disabled input is a courtesy. The route is the control.
    assert.match(ROUTE, /if \(!SAVABLE\[kind\]\)/);
    assert.match(ROUTE, /409/);
  });

  it("says why, rather than failing silently", () => {
    assert.match(ROUTE, /WHY_NOT/);
    const panel = readFileSync("components/ListingQuickPanel.tsx", "utf8");
    assert.match(panel, /listing\.whyNot/);
    assert.match(panel, /listing\.savable/);
  });

  it("the file-backed kinds are the ones marked unsavable", () => {
    // Attractions and batei hachaim have no field-level writer today. Saying so
    // is the honest half of this feature.
    assert.match(ROUTE, /kever: false/);
    assert.match(ROUTE, /attraction: false/);
    assert.match(ROUTE, /business: true/);
  });
});

describe("the panel never blanks what it did not show", () => {
  const ROUTE = readFileSync("app/api/admin/listing/route.ts", "utf8");

  it("reads the record first and carries the rest over", () => {
    // The panel holds six fields and the records hold many. A blind write would
    // quietly empty everything filled in through the full editor.
    for (const marker of ["findUnique", "...existing"]) {
      assert.ok(ROUTE.includes(marker), `the save path does not preserve untouched fields (${marker})`);
    }
    assert.match(ROUTE, /before\.sourceUrl/);
  });

  it("checks the admin cookie and the origin before writing anything", () => {
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(post, /admin\(request\)/);
    assert.match(post, /sameOrigin\(request\)/);
    assert.ok(post.indexOf("admin(request)") < post.indexOf("body"), "it reads the body before checking who is asking");
  });
});

describe("View no longer links out to a page that cannot show the row", () => {
  it("the directory browser opens the panel instead", () => {
    const browser = readFileSync("components/DirectoryBrowserAdmin.tsx", "utf8");
    assert.match(browser, /<ListingQuickPanel listing=\{entry\.quick\}/);
    assert.ok(!/>\s*View\s*<\/a>/.test(browser), "the old View link is still there");
  });

  it("so do the attraction, stay and food lists", () => {
    assert.match(readFileSync("components/AdminCatalogList.tsx", "utf8"), /<ListingQuickPanel listing=\{item\.quick\}/);
  });

  it("every kind is one of the six the panel knows", () => {
    for (const kind of ["business", "kever", "town", "attraction", "stay", "food"]) {
      assert.equal(isQuickEditKind(kind), true, kind);
    }
    assert.equal(isQuickEditKind("cemetery"), false);
  });
});

describe("the panel behaves like the site's other dialogs", () => {
  const PANEL = readFileSync("components/ListingQuickPanel.tsx", "utf8");

  it("reuses the one focus trap rather than writing a second", () => {
    assert.match(PANEL, /from "@\/components\/useFocusTrap"/);
    assert.match(PANEL, /useFocusTrap<HTMLDivElement>\(open, close\)/);
  });

  it("is a real modal, closes on Escape and on a visible Close, and returns focus", () => {
    assert.match(PANEL, /role="dialog"/);
    assert.match(PANEL, /aria-modal="true"/);
    assert.match(PANEL, />\s*Close\s*</);
    assert.match(PANEL, /triggerRef\.current\?\.focus\(\)/);
  });

  it("KEEPS WHAT WAS TYPED when a save fails", () => {
    // Losing the correction you just made because the network blinked is the
    // worst version of this.
    const save = PANEL.slice(PANEL.indexOf("async function save"), PANEL.indexOf("const field ="));
    assert.ok(!/setFields\(/.test(save), "a failed save reset the boxes");
    assert.match(save, /Your changes are still here/);
  });
});
