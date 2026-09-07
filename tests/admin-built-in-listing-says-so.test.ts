import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * A LISTING THAT CANNOT BE EDITED DOES NOT OFFER AN EDITOR.
 *
 * Found by opening The Colosseum from the admin directory on a phone: the
 * quick panel drew a form, said "this one comes from the site's own list, so
 * there is no row here to change", and then — under it — "This is the short
 * version. Open the full editor for everything else." The link went to
 * /admin/add, the generic Add page. An editor link that lands on a form for
 * something new is the exact confusion the owner reports.
 */
describe("the quick panel tells the truth about a built-in listing", () => {
  const src = readFileSync("components/ListingQuickPanel.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const catalog = readFileSync("lib/admin-listing-catalog.ts", "utf8");

  it("offers the full editor only when there is one", () => {
    assert.match(src, /\{listing\.savable \? \(\s*<p[^]*?Open the full editor/);
  });

  it("otherwise says the listing is built in and offers a copy, prefilled", () => {
    assert.match(src, /This listing is built into the site, so there is nothing here to save\./);
    assert.match(src, /href=\{`\/admin\/add\?q=\$\{encodeURIComponent\(listing\.fields\.name\)\}`\}/);
    assert.match(src, /Add your own copy of it/);
  });

  it("the Add page reads that prefill", () => {
    const add = readFileSync("app/admin/add/page.tsx", "utf8");
    assert.match(add, /searchParams\)\.q/);
    assert.match(add, /prefillName=\{wanted/);
  });

  it("built-in rows are the ones the catalog marks unsavable", () => {
    // The panel's branch keys off `savable`; the catalog sets it false for
    // listings that come from data/*.ts rather than the database.
    assert.ok((catalog.match(/savable: false/g) ?? []).length >= 2);
  });
});
