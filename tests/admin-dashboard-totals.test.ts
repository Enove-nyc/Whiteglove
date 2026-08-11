import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { ADMIN_TOTAL_CARDS } from "@/lib/admin-overview";
import { allAdminDestinations } from "@/lib/admin-nav";

/**
 * The dashboard total tiles must be pressable links to real admin screens.
 *
 * They used to be inert counts. The owner asked for every card to open the
 * matching editor — destinations, guides, batei hachaim, kevarim, countries —
 * rather than looking like furniture on the overview.
 */

const DASHBOARD = readFileSync("app/admin/page.tsx", "utf8");
const COUNTRIES_PAGE = readFileSync("app/admin/countries/page.tsx", "utf8");

describe("dashboard total cards are pressable", () => {
  it("maps every tile to an href", () => {
    assert.equal(ADMIN_TOTAL_CARDS.length, 6);
    for (const card of ADMIN_TOTAL_CARDS) {
      assert.ok(card.href.startsWith("/admin/"), `${card.label} has no admin href`);
      assert.ok(card.label.trim(), `${card.key} is missing its label`);
    }
  });

  it("sends each tile to the screen the owner named", () => {
    const byLabel = Object.fromEntries(ADMIN_TOTAL_CARDS.map((card) => [card.label, card.href]));
    assert.equal(byLabel["Destinations"], "/admin/destinations");
    assert.equal(byLabel["Full guides"], "/admin/destinations");
    assert.equal(byLabel["Batei hachaim"], "/admin/kevarim");
    assert.equal(byLabel["Kevarim listed"], "/admin/kevarim");
    assert.equal(byLabel["Countries"], "/admin/countries");
    assert.equal(byLabel["Nothing yet"], "/admin/destinations");
  });

  it("renders the tiles from ADMIN_TOTAL_CARDS as links on the dashboard", () => {
    assert.match(DASHBOARD, /ADMIN_TOTAL_CARDS/);
    assert.match(DASHBOARD, /function TotalCard/);
    assert.match(DASHBOARD, /href=\{may\(card\.href\) \? card\.href : null\}/);
    assert.match(DASHBOARD, /aria-label=\{`\$\{label\}: \$\{value\}\. Open \$\{label\.toLowerCase\(\)\}\.`\}/);
  });

  it("lists every linked screen in the admin nav destinations", () => {
    const known = new Set(allAdminDestinations().map((item) => item.href));
    for (const card of ADMIN_TOTAL_CARDS) {
      assert.ok(known.has(card.href), `${card.href} is missing from admin nav`);
    }
  });
});

describe("countries has an honest stub, not fake data", () => {
  it("says countries are not set up yet", () => {
    assert.match(COUNTRIES_PAGE, /Not set up yet/);
    assert.match(COUNTRIES_PAGE, /no countries editor yet/i);
  });

  it("does not invent a list of countries to manage", () => {
    assert.doesNotMatch(COUNTRIES_PAGE, /countries\.map|for \(const country/);
    assert.match(COUNTRIES_PAGE, /\/admin\/destinations/);
    assert.match(COUNTRIES_PAGE, /\/admin\/kevarim/);
  });
});
