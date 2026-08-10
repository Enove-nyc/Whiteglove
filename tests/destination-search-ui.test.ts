import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { describe } from "node:test";

const SOURCE = readFileSync("components/DestinationSearch.tsx", "utf8");
const SEARCH_PAGE = readFileSync("app/search/page.tsx", "utf8");

describe("DestinationSearch wiring", () => {
  test("does not import guidedDestinations for the empty state", () => {
    assert.ok(!SOURCE.includes("guidedDestinations"));
    assert.ok(!SOURCE.includes('from "@/data/destinations"'));
  });

  test("asks the server API rather than shipping the cemetery DB", () => {
    assert.ok(SOURCE.includes("/api/search"));
    assert.ok(!SOURCE.includes('from "@/data/cemeteries"'));
  });

  test("Enter while loading goes to /search, never auto-opens via /stops", () => {
    assert.ok(SOURCE.includes("searching"));
    assert.ok(SOURCE.includes("/search?q="));
    assert.ok(!SOURCE.includes("/stops${"));
    assert.ok(!SOURCE.includes("router.push(`/stops"));
  });

  test("empty state offers View all vacation destinations", () => {
    assert.ok(SOURCE.includes("View all vacation destinations"));
    assert.ok(SOURCE.includes("/destinations"));
  });

  test("keyboard a11y: listbox, option, aria-activedescendant", () => {
    assert.ok(SOURCE.includes('role="listbox"'));
    assert.ok(SOURCE.includes('role="option"'));
    assert.ok(SOURCE.includes("aria-activedescendant"));
    assert.ok(SOURCE.includes("ArrowDown"));
  });
});

describe("the /search results page", () => {
  test("preserves the query and never redirects zero results to /stops", () => {
    assert.ok(SEARCH_PAGE.includes("searchParams"));
    assert.ok(SEARCH_PAGE.includes("searchSite"));
    assert.ok(!SEARCH_PAGE.includes('redirect("/stops")'));
    assert.ok(SEARCH_PAGE.includes("Never send a generic unsuccessful search to /stops"));
  });
});
