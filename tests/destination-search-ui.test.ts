import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { describe } from "node:test";

const SOURCE = readFileSync("components/DestinationSearch.tsx", "utf8");
const SEARCH_PAGE = readFileSync("app/search/page.tsx", "utf8");
const LABELS = readFileSync("lib/site-search-labels.ts", "utf8");
const NAV = readFileSync("components/Navbar.tsx", "utf8");

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

  test("header search has no visible sitewide heading or note", () => {
    assert.ok(LABELS.includes("Search the entire White Glove site"));
    assert.ok(LABELS.includes("Search information already published across White Glove."));
    assert.ok(SOURCE.includes("SITE_SEARCH_LABEL"));
    assert.ok(SOURCE.includes('className="sr-only"'));
    assert.ok(!SOURCE.includes("SITE_SEARCH_NOTE"));
    assert.ok(SOURCE.includes("SearchGlyph") || SOURCE.includes("viewBox=\"0 0 24 24\""));
  });

  test("placeholder is one short line and does not list eSIM", () => {
    assert.ok(LABELS.includes("Search destinations, places to stay, kosher food, and more…"));
    assert.ok(!LABELS.includes("eSIM"));
    assert.ok(!LABELS.includes("esim"));
    assert.ok(SOURCE.includes("SITE_SEARCH_PLACEHOLDER"));
  });

  test("uses Where to stay naming, not Hotels and stays", () => {
    assert.ok(LABELS.includes('return "Where to stay"'));
    assert.ok(!LABELS.includes('return "Hotels and stays"'));
    assert.ok(!LABELS.includes('"Hotels and stays"'));
    assert.ok(SOURCE.includes("sectionHeading"));
    assert.ok(SOURCE.includes("kindLabel"));
  });

  test("does not mix AI answers into site search", () => {
    assert.ok(!SOURCE.includes("/api/itinerary/ai"));
    assert.ok(!SOURCE.includes("AssistantAnswer"));
    assert.ok(SOURCE.includes("AI answers never appear") || SOURCE.includes("published White Glove content only"));
  });

  test("mobile can collapse behind a labeled Search button", () => {
    assert.ok(SOURCE.includes("mobileCollapse"));
    assert.ok(NAV.includes("mobileCollapse"));
  });
});

describe("the /search results page", () => {
  test("preserves the query and never redirects zero results to /stops", () => {
    assert.ok(SEARCH_PAGE.includes("searchParams"));
    assert.ok(SEARCH_PAGE.includes("searchSite"));
    assert.ok(!SEARCH_PAGE.includes('redirect("/stops")'));
    assert.ok(SEARCH_PAGE.includes("Never send a generic unsuccessful search to /stops"));
  });

  test("names the full site search", () => {
    assert.ok(SEARCH_PAGE.includes("Search the entire White Glove site"));
    assert.ok(SEARCH_PAGE.includes("already published"));
  });
});
