import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  categoriesForBrand,
  ITINERARIES_CATEGORIES,
  itinerariesBookingCategoryFor,
  NAV_CATEGORIES,
} from "@/lib/navigation";
import { brandForHost, brandFromRequestHeaders } from "@/lib/site-brand-core";
import { GUIDE_ONLY_PREFIXES, isGuidePath } from "@/lib/guide-paths";
import { isPublicPage } from "@/lib/public-access";

/**
 * whitegloveitineraries.com is its own site — STRICTLY the planner, not a guide.
 *
 * This pins the two halves of that. The navigation the itineraries domain shows
 * carries only planning, booking and the app — none of the guide's browsable
 * sections. And the middleware sends any guide page reached on that domain to
 * the kosher site, so the two never blur into one.
 */

function bag(entries: Record<string, string>) {
  const lower = new Map(Object.entries(entries).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name: string) => lower.get(name.toLowerCase()) ?? null };
}

const guideHref = (href: string) =>
  ["/kosher", "/cemeteries", "/tzaddikim", "/shuls", "/mikvaos", "/heritage", "/hotels", "/things-to-do", "/destinations", "/map", "/directory"]
    .some((p) => href === p || href.startsWith(`${p}?`) || href.startsWith(`${p}/`));

describe("the itineraries bar is a planner, not a guide", () => {
  it("carries only Find travel and My itineraries (the owner's design)", () => {
    assert.deepEqual(
      ITINERARIES_CATEGORIES.map((c) => c.label),
      ["Find travel", "My itineraries"],
    );
  });

  it("names no guide page anywhere in its menus", () => {
    for (const category of ITINERARIES_CATEGORIES) {
      for (const link of category.links) {
        assert.ok(!guideHref(link.href), `itineraries menu should not link the guide page ${link.href}`);
      }
    }
  });

  it("hands the itineraries brand its own bar, and leaves the kosher one alone", () => {
    assert.equal(categoriesForBrand("itineraries"), ITINERARIES_CATEGORIES);
    assert.equal(categoriesForBrand("kosher"), NAV_CATEGORIES);
    // The kosher bar still has its guide category — untouched.
    assert.ok(NAV_CATEGORIES.some((c) => c.label === "Kosher"));
  });

  it("resolves Book to the booking searches, never a browse", () => {
    const open = itinerariesBookingCategoryFor({ searchIsPublic: true, label: "Book", href: "/book", description: "" });
    assert.deepEqual(open.links.map((l) => l.label), ["Flights", "Hotels", "Car rentals", "Things to do", "Transfers", "eSIM", "Travel insurance"]);
    // Locked, it collapses to the one public assistance link — still not a browse.
    const locked = itinerariesBookingCategoryFor({ searchIsPublic: false, label: "Ask us to book", href: "/contact", description: "d" });
    assert.equal(locked.links[0].href, "/contact");
    // The partner pages (transfers, eSIM, insurance) stay either way.
    assert.deepEqual(locked.links.slice(1).map((l) => l.href), ["/transfers", "/esim", "/travel-insurance"]);
  });
});

describe("brand reads the proxy header, then the host", () => {
  it("honours the header when the worker has rewritten the Host", () => {
    assert.equal(brandFromRequestHeaders(bag({ host: "whiteglove-production.up.railway.app", "x-wg-brand": "itineraries" })), "itineraries");
    assert.equal(brandForHost("www.whitegloveitineraries.com"), "itineraries");
    assert.equal(brandForHost("www.whiteglovekoshertravel.com"), "kosher");
  });
});

describe("a page body never hands out a bare guide link on the itineraries domain", () => {
  // The nav bar and the middleware are not the only way a visitor reaches a
  // guide page. These three components each had a plain, unconditional
  // <a>/<Link> straight to a GUIDE_ONLY_PREFIXES path, reachable from pages
  // the itineraries domain serves itself (the itinerary builder, /plan): a
  // tap there silently bounced the visitor to the kosher domain — which,
  // inside an installed itineraries app, is not a same-site navigation but a
  // Trusted Web Activity losing its verified domain and falling back to an
  // ordinary browser tab, address bar and all. Each must now read the brand
  // before it ever renders that href.

  it("ItineraryFooter only signs the kosher brand, and only links kevarim, once it knows this is the kosher domain", () => {
    const src = readFileSync("components/ItineraryFooter.tsx", "utf8");
    // Through the shared hook now, not brandForHost by hand. Same property —
    // the brand is settled before the href is chosen — by a mechanism that
    // also honours the deployment's own NEXT_PUBLIC_SITE_BRAND, which the
    // hand-rolled effect ignored. useSiteBrand is itself pinned below.
    assert.match(src, /useSiteBrand\(\)/);
    assert.doesNotMatch(src, /useEffect\([^)]*setItineraries/);
    assert.match(src, /itineraries \? "White Glove Itineraries" : "White Glove Kosher Travel"/);
    // Both branches exist — the itineraries one links booking, the kosher
    // one still links kevarim — and the choice happens before either href is
    // ever chosen, not after an unconditional render.
    const branch = src.slice(src.indexOf("itineraries ? ("), src.indexOf("</div>\n      </div>\n    </div>"));
    assert.match(branch, /href="\/#search"/);
    assert.match(branch, /href="\/cemeteries"/);
  });

  it("KosherNearby only sends a visitor to /kosher on the domain that has one", () => {
    const src = readFileSync("components/KosherNearby.tsx", "utf8");
    // Through the shared hook now, not brandForHost by hand. Same property —
    // the brand is settled before the href is chosen — by a mechanism that
    // also honours the deployment's own NEXT_PUBLIC_SITE_BRAND, which the
    // hand-rolled effect ignored. useSiteBrand is itself pinned below.
    assert.match(src, /useSiteBrand\(\)/);
    assert.doesNotMatch(src, /useEffect\([^)]*setItineraries/);
    assert.match(src, /itineraries \? `\$\{BRAND_ORIGIN\.kosher\}\/kosher` : "\/kosher"/);
  });

  it("TripStartFlow only sends a visitor to /heritage on the domain that has one", () => {
    const src = readFileSync("components/TripStartFlow.tsx", "utf8");
    // Through the shared hook now, not brandForHost by hand. Same property —
    // the brand is settled before the href is chosen — by a mechanism that
    // also honours the deployment's own NEXT_PUBLIC_SITE_BRAND, which the
    // hand-rolled effect ignored. useSiteBrand is itself pinned below.
    assert.match(src, /useSiteBrand\((brand)?\)/);
    assert.doesNotMatch(src, /useEffect\([^)]*setItineraries/);
    assert.match(src, /\$\{BRAND_ORIGIN\.kosher\}\/heritage/);
  });

  it("and useSiteBrand is what all three now lean on, so pinning it pins them", () => {
    // The three assertions above check that each component asks the hook. This
    // checks the hook still answers from the hostname, which is the fact they
    // were really pinning when they read brandForHost directly.
    const hook = readFileSync("components/useSiteBrand.ts", "utf8");
    assert.match(hook, /brandForHost\(window\.location\.hostname\)/);
    assert.match(hook, /configuredBrand\(\)/);
    // Not an effect. That was the bug the rule caught: rendering "kosher"
    // first and correcting after mount is a frame of the wrong brand, and on
    // these three components a frame of the wrong HREF.
    assert.doesNotMatch(hook, /useEffect/);
    assert.match(hook, /useSyncExternalStore/);
  });

  // The same bug, found later on the four places that INVITE a visitor into
  // the guide rather than linking one page of it: /plan's two closing
  // buttons, /book's heritage aside, the empty search page's "browse
  // destinations", and step three's "Browse destinations first". Each read
  // as an ordinary in-site button and then left the brand entirely. The
  // decision was to hide them here rather than hand them the kosher origin:
  // the guide belongs to the kosher site, and this brand does not advertise
  // what it does not have.

  it("/plan does not offer the guide on the itineraries brand", () => {
    const src = readFileSync("app/plan/page.tsx", "utf8");
    assert.match(src, /const itineraries = \(await currentBrand\(\)\) === "itineraries"|const brand = await currentBrand\(\);\s*const itineraries = brand === "itineraries"/);
    // The whole closing band is behind the check, so neither button renders.
    const band = src.slice(src.indexOf("{!itineraries && ("));
    assert.match(band, /href="\/destinations"/);
    assert.match(band, /href="\/heritage"/);
  });

  it("/book offers nothing at all now — it redirects to the home search", () => {
    const src = readFileSync("app/book/page.tsx", "utf8");
    assert.doesNotMatch(src, /\/heritage/);
    assert.match(src, /permanentRedirect/);
  });

  it("search offers neither the browse nor the no-result doors on the itineraries brand", () => {
    const src = readFileSync("components/SearchResults.tsx", "utf8");
    // Told by the server page, which already knows the brand — not settled
    // from window.location, which would render the wrong thing first.
    assert.match(src, /itineraries\?: boolean;/);
    assert.match(readFileSync("app/search/page.tsx", "utf8"), /itineraries=\{\(await currentBrand\(\)\) === "itineraries"\}/);
    // The empty-query card returns nothing at all rather than an empty box.
    assert.match(src, /if \(itineraries\) return null;/);
    // And every one of NO_RESULT_DOORS is a guide path, so that block goes too.
    assert.match(src, /\{!itineraries && \(\s*<>\s*<p[^]*?Try instead/);
  });

  it("the planner's third step does not end on the guide, on the itineraries brand", () => {
    const src = readFileSync("components/TripStartFlow.tsx", "utf8");
    const card = src.slice(src.indexOf("{!itineraries && ("), src.indexOf("the optional half"));
    assert.match(card, /Browse destinations first/);
  });
});

describe("the itineraries domain's own pages never title themselves 'Kosher Travel'", () => {
  // /login and /account both had a static, unconditional
  // `title: "... | White Glove Kosher Travel"` — visible in the browser tab
  // on every domain, including whitegloveitineraries.com. Signing in and
  // landing on the account page is the most common path through the site;
  // reading "Kosher Travel" in the tab the whole way is what read as "logging
  // in takes me to the kosher site" even though no navigation ever left the
  // itineraries domain. The same static-title bug was present on every other
  // page the itineraries domain calls its own (/plan, /itinerary and its
  // print view, /my-route, /book, /f, /i) — each must now read the brand
  // before choosing a title, the same way app/page.tsx already does.
  /**
   * FOUND BY SCAN, NOT BY HAND, and that is the point.
   *
   * This was a list somebody typed, and it was written from the pages the
   * MARKETING journey touches — so it covered /login, /account, /plan and the
   * rest, and missed the three pages a CLIENT opens: /app and the two share
   * links that render the trip app. An external audit found those still
   * titled "White Glove Kosher Travel" on the itineraries domain, months
   * after the ones on this list were fixed.
   *
   * So the list is now derived. Every page this domain serves has to settle
   * its own brand; a guide path does not, because middleware redirects it to
   * the kosher site before it can render, and /admin does not, because this
   * domain sends that to the kosher host too.
   */
  // Read, not parsed out of middleware.ts: the list moved to
  // lib/guide-paths.ts so the sitemap could read it too, and a regular
  // expression over source only ever checks the copy it is pointed at.
  const GUIDE_ONLY = [...GUIDE_ONLY_PREFIXES];

  const routeOf = (file: string) =>
    "/" + file.replace(/^app\//, "").replace(/\/page\.tsx$/, "").replace(/\/?\(.*?\)/g, "").replace(/^\/+/, "");

  const pages = execSync("find app -name page.tsx", { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter((file) => {
      const route = routeOf(file);
      if (route.startsWith("/admin")) return false;
      // ONE SITE NOW (AGENTS.md, 18 November 2026): a page the public cannot
      // open is the owner's Kosher Travel view, titled as Kosher Travel on
      // purpose. Only the public pages have to name the brand they are on.
      if (!isPublicPage(route)) return false;
      // The kosher city-guide catch-all (/uman, /lizensk…). Not a prefix the
      // middleware can list, and this domain answers those with a redirect or
      // a 404 rather than rendering them, so its title is the kosher one on
      // purpose.
      if (route === "/[city]") return false;
      if (GUIDE_ONLY.some((prefix) => route === prefix || route.startsWith(`${prefix}/`))) return false;
      // Only the ones that actually declare a title.
      return /pageMetadata\(|generateMetadata/.test(readFileSync(file, "utf8"));
    })
    .sort();

  for (const path of pages) {
    it(`${path} reads the brand before choosing its title`, () => {
      const src = readFileSync(path, "utf8");
      assert.match(src, /export async function generateMetadata/, `${path} must compute its title, not export it statically`);
      assert.match(src, /currentBrand\(\)/, `${path} must read the real brand`);
      // Either spelling of the same thing: the literal, or BRAND_NAME keyed by
      // the brand it just read. What matters is that the title comes FROM the
      // brand rather than being typed once and shipped to both domains.
      assert.ok(
        /White Glove Itineraries/.test(src) || /BRAND_NAME[.[]/.test(src) || /ITINERARIES_TITLE/.test(src),
        `${path} must build its title from the brand`,
      );
    });
  }
});

describe("the guide is redirected off the itineraries domain", () => {
  const MW = readFileSync("middleware.ts", "utf8");

  it("answers a guide path itself rather than handing it to the kosher site", () => {
    /**
     * THIS USED TO ASSERT THE OPPOSITE, and the rule it was protecting has
     * changed on purpose. Every guide path answered 308 to
     * whiteglovekoshertravel.com, which was right about the mechanism — a real
     * redirect, never a soft 200 — and wrong about the destination: this
     * product must not direct its visitors to the kosher site, and a redirect
     * is the most direct direction there is.
     *
     * Now: a neutral equivalent here gets a local 308, and anything with no
     * answer here gets 410 Gone. See lib/guide-paths.ts and
     * tests/itineraries-obsolete-routes.test.ts.
     */
    assert.match(MW, /brandFromRequestHeaders\(request\.headers\) === "itineraries"/);
    assert.match(MW, /guideAnswer\(pathname\)/);
    const block = MW.slice(MW.indexOf("const answer = guideAnswer(pathname)"));
    const guard = block.slice(0, block.indexOf("}\n"));
    assert.doesNotMatch(guard, /BRAND_ORIGIN\.kosher/, "it still hands visitors to the other company");
  });

  it("lists the guide's sections and NOT the planner's own paths", () => {
    for (const guide of ["/kosher", "/cemeteries", "/heritage", "/destinations", "/hotels", "/things-to-do", "/directory"]) {
      assert.ok(isGuidePath(guide), `guide prefix ${guide} should be redirected`);
    }
    for (const planner of ["/plan", "/itinerary", "/app", "/account", "/i", "/f", "/book", "/proposal", "/p", "/library", "/forms", "/form", "/pipeline", "/t", "/payments", "/pay"]) {
      assert.ok(!isGuidePath(planner), `planner path ${planner} must stay on the itineraries domain`);
    }
  });
});
