import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { HECHSHERIM, allHechsherim } from "@/data/hechsherim";
import { publicPaths } from "@/lib/site-map";

/**
 * The certification marks, and the page that shows them.
 *
 * THE GAP THIS FILLS. The site held a list of certifying bodies and used it in
 * exactly two places: to draw a small circle beside a listing, and to print its
 * own length in one sentence on /kosher-travel. Somebody who saw an unfamiliar
 * mark on a restaurant had nowhere on this site to find out whose it was.
 *
 * THE LINE THE LIST DOES NOT CROSS, and it is the one data/hechsherim.ts draws
 * in its own opening paragraph: it says who exists. It never says who
 * certifies what, and it never ranks one body against another. Which
 * hechsherim to rely on is a question for somebody's rov, and a travel website
 * answering it would be overstepping in a way no amount of research fixes.
 * That sentence is on the page and this file keeps it there.
 *
 * AND WHY MOST ENTRIES HAVE NO WEBSITE. A kashrus question belongs to the body
 * that gave the hechsher, so the useful thing is a link to them — but a wrong
 * address on a kashrus page is worse than an absent one. The addresses here
 * are only the ones that are certain; the rest are for the owner to confirm
 * and add, which is a minute per agency and not a guess.
 */

const PAGE = readFileSync("app/hechsherim/page.tsx", "utf8");
const DATA = readFileSync("data/hechsherim.ts", "utf8");

describe("the list of agencies", () => {
  it("is a real list rather than a handful", () => {
    assert.ok(HECHSHERIM.length >= 40, `only ${HECHSHERIM.length} agencies`);
  });

  it("GIVES EVERY AGENCY A UNIQUE ID", () => {
    const ids = HECHSHERIM.map((agency) => agency.id);
    assert.equal(new Set(ids).size, ids.length, "two agencies share an id");
  });

  it("allows two agencies the same mark, and tells them apart by region", () => {
    // Kosher Australia and The Kashrut Authority both write KA, and both are
    // real. The region field exists for exactly this.
    const ka = HECHSHERIM.filter((agency) => agency.mark === "KA");
    assert.ok(ka.length >= 2);
    assert.equal(new Set(ka.map((agency) => agency.region)).size, ka.length);
  });

  it("gives every agency a mark, a region and a name", () => {
    for (const agency of HECHSHERIM) {
      assert.ok(agency.name.length > 2, agency.id);
      assert.ok(agency.mark.length > 0, `${agency.id} has no mark to draw`);
      assert.ok(agency.region.length > 2, `${agency.id} has no region`);
      assert.ok(agency.aliases.length > 0, `${agency.id} cannot be found in free text`);
      for (const alias of agency.aliases) {
        assert.equal(alias, alias.toLowerCase(), `${agency.id}: alias "${alias}" is not lower case`);
      }
    }
  });

  it("PUBLISHES NO ADDRESS IT IS NOT SURE OF", () => {
    // Every website that IS here has to be a real https address, and the ones
    // that are absent are absent on purpose rather than empty strings.
    for (const agency of HECHSHERIM) {
      if (agency.website === undefined) continue;
      assert.match(agency.website, /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i, `${agency.id}: ${agency.website}`);
    }
    const withSite = HECHSHERIM.filter((agency) => agency.website).length;
    assert.ok(withSite > 0, "no agency links anywhere");
    // Documented rather than assumed: most have none yet, and the comment in
    // the data file says why.
    assert.match(DATA, /OPTIONAL AND OFTEN ABSENT/);
  });

  it("still merges what the owner adds in the admin", () => {
    const merged = allHechsherim([{ id: "ou", logo: "data:image/png;base64,AAA" }]);
    const ou = merged.find((agency) => agency.id === "ou");
    assert.equal(ou?.name, "Orthodox Union", "an overlay replaced the built-in instead of extending it");
    assert.equal(ou?.logo, "data:image/png;base64,AAA");
  });
});

describe("the page", () => {
  it("READS THE STORE, so an agency added today is on it today", () => {
    assert.match(PAGE, /allHechsherim\(await listAgencies\(\)\)/);
    // No longer force-dynamic: listAgencies (lib/hechsher-store.ts) is a
    // tagged cache now, busted by saveAgency/deleteAgency the moment either
    // writes — see tests/public-cache-tags.test.ts for the full write-path
    // inventory that guards this staying true.
    assert.doesNotMatch(PAGE, /export const dynamic = "force-dynamic"/);
  });

  it("SAYS WHO EXISTS AND REFUSES TO RANK THEM", () => {
    assert.match(PAGE, /question for your rov/);
    assert.match(PAGE, /does not rank them/);
    assert.match(PAGE, /does not say who certifies what/);
  });

  it("links each agency to itself where the address is known, and not otherwise", () => {
    assert.match(PAGE, /agency\.website \? \(/);
    assert.match(PAGE, /: null/);
  });

  it("leaves the local rov out of the grid, because he is not an agency", () => {
    assert.match(PAGE, /agency\.id === "local-rov"/);
  });

  it("IS REACHABLE, and offered to search engines", () => {
    // No slot in the Kosher dropdown's seven fixed items — linked from the
    // kosher travel hub instead, which already covers it in its own words.
    assert.match(readFileSync("app/kosher-travel/page.tsx", "utf8"), /href: "\/hechsherim"/);
    assert.ok(publicPaths().some((entry) => entry.path === "/hechsherim"));
  });

  it("repeats the kashrus caution that the food listings carry", () => {
    // The same sentence a traveller meets beside a restaurant: gold means
    // confirmed, grey means ask for the teudah.
    assert.match(PAGE, /ask to see the current teudah/);
  });
});
