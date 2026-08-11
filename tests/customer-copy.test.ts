import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { BUILT_IN_WORDS } from "@/data/site-words";
import { services } from "@/data/services";

/**
 * The customer-facing copy rules from AGENTS.md, as a test.
 *
 * TWO OF THOSE RULES ARE ABOUT WORDS, and words come back. They are written
 * down in AGENTS.md, which is read by whoever is working on the site next and
 * by nobody else; encoded here they are read on every commit.
 *
 *   • Do not expose internal workflows or content status to customers.
 *   • Do not make blanket payment promises.
 *
 * WHY THIS IS A SEPARATE FILE FROM site-voice.test.ts, which looks similar.
 * That one is about a page describing its own edit history to a visitor who
 * never saw the previous version. This one is about a page describing the
 * owner's unfinished work — the research queue, the checking backlog, what has
 * not been published. They are different failures with the same shape, and
 * keeping them apart means a failure message says which rule was broken.
 *
 * WHAT IS DELIBERATELY NOT BANNED. "Verified" is a claim a customer can use,
 * and /verification defines it — see tests/trust-status.ts for why that one
 * definition has to survive. The seasonal-programme caution is advice, not
 * status, and lib/vacation-ideas.ts still gives it.
 *
 * COMMENTS ARE STRIPPED FIRST. The reasoning for a rule belongs in the source
 * beside the code it governs, where the visitor never reads it, and several
 * files quote the old wording in order to record what changed.
 */

/** Phrases that tell a customer about our own process rather than their trip. */
const WORKFLOW: Array<[RegExp, string]> = [
  [/\bnot checked yet\b/i, "the checking backlog"],
  [/\bbeing checked\b/i, "the checking backlog"],
  // NOT a bare /unverified/. "Unverified" is the visible hechsher label on a
  // food listing (data/hechsherim.ts) and it is a kashrus caveat rather than a
  // report on our editorial queue — a traveler relies on it to know to ask for
  // the teudah. Softening it would be a food-safety change dressed as a copy
  // change. What is banned is the framing that turns it into a note about us.
  [/nobody here has checked/i, "an internal content state"],
  [/we have not checked/i, "an internal content state"],
  [/\bon record\b/i, "our own records, rather than the place"],
  [/\bresearch queue\b/i, "the research queue"],
  [/\bnot published yet\b/i, "what has not been published"],
  [/we have not (yet )?(finished|checked|got)/i, "work the owner has not completed"],
  [/we do not yet hold/i, "work the owner has not completed"],
  [/\bcoming soon\b/i, "an unfinished section, offered as though it were content"],
  [/\bisn['’]t taking requests yet\b/i, "a form that does not work"],
  [/\bis not open yet\b/i, "a section that does not work"],
];

/** Blanket promises about money, which stop being true the moment they are. */
const PAYMENT: Array<[RegExp, string]> = [
  [/nothing (is|has been) charged/i, "a blanket payment promise"],
  [/\bno card is taken\b/i, "a blanket payment promise"],
  [/\bno account, no card\b/i, "a blanket payment promise"],
  [/there is nothing to pay/i, "a blanket payment promise"],
];

/**
 * Owner-facing screens are exempt, and have to be.
 *
 * An admin editor whose kashrus dropdown could not say "reported — not checked
 * by us" would be unusable: that IS the workflow, and the person reading it is
 * the one doing it. The rules are about customers.
 */
const OWNER_FACING =
  /Admin|Editor|Manager|Panel|Queue|Control|Wizard|Log$|Test$|Setup|Settings|Completeness|Drafts|Trail|Export/;

function walk(dir: string, match: (path: string) => boolean): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "admin" || name === "api" || name === "node_modules") continue;
      found.push(...walk(full, match));
    } else if (match(full)) {
      found.push(full);
    }
  }
  return found;
}

const PAGES = walk("app", (path) => path.endsWith("page.tsx"));
const COMPONENTS = walk("components", (path) => path.endsWith(".tsx")).filter(
  (path) => !OWNER_FACING.test(path.split("/").pop()!.replace(/\.tsx$/, "")),
);
/**
 * Two files outside app/ and components/ hold customer wording as data: the
 * site-wide banner and the owner-editable strings. Version 2 of the banner
 * explained the four checking labels on every page of the site and no walk
 * over .tsx files would ever have seen it.
 */
const COPY_DATA = ["lib/beta-notice.ts", "data/site-words.ts", "data/services.ts", "lib/trust-status.ts"];
const FILES = [...PAGES, ...COMPONENTS, ...COPY_DATA];
const AGENTS_MD = readFileSync("AGENTS.md", "utf8");

/** A file's rendered words: comments out, Tailwind out. */
function prose(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/className=(\{`[\s\S]*?`\}|"[^"]*")/g, "");
}

describe("what the customer-facing pages may say", () => {
  it("is actually reading the site, not an empty list", () => {
    // The failure mode of every walk like this: it stops finding files and
    // passes for ever.
    assert.ok(FILES.length > 40, `only ${FILES.length} files scanned`);
    const norm = (path: string) => path.replace(/\\/g, "/");
    assert.ok(PAGES.some((path) => norm(path) === "app/page.tsx"));
    assert.ok(COMPONENTS.some((path) => norm(path) === "components/Footer.tsx"));
    assert.ok(FILES.some((path) => norm(path) === "lib/beta-notice.ts"));
  });

  it("EXPOSES NO INTERNAL WORKFLOW OR CONTENT STATUS", () => {
    // AGENTS.md. A visitor deciding where to take their family does not need
    // to know how far our writing has got; they need to know what to do.
    const broken: string[] = [];
    for (const path of FILES) {
      const text = prose(path);
      for (const [pattern, what] of WORKFLOW) {
        if (pattern.test(text)) broken.push(`${path} — ${what} (${pattern})`);
      }
    }
    assert.deepEqual(broken, [], `customer copy exposing internal state:\n${broken.join("\n")}`);
  });

  it("MAKES NO BLANKET PAYMENT PROMISE", () => {
    // AGENTS.md. "Nothing is charged" is true until the day it is not, and
    // the day it is not, nobody remembers which six pages said it.
    const broken: string[] = [];
    for (const path of FILES) {
      const text = prose(path);
      for (const [pattern, what] of PAYMENT) {
        if (pattern.test(text)) broken.push(`${path} — ${what} (${pattern})`);
      }
    }
    assert.deepEqual(broken, [], `customer copy promising nothing is charged:\n${broken.join("\n")}`);
  });
});

describe("the rules are written down where the next person reads them", () => {
  const AGENTS = readFileSync("AGENTS.md", "utf8");

  it("keeps the customer-facing copy section", () => {
    assert.match(AGENTS, /## Customer-facing copy/);
    assert.match(AGENTS, /Do not expose internal workflows or content status/);
    assert.match(AGENTS, /Do not make blanket payment promises/);
  });

  it("KEEPS THE UNDER-PRODUCTION BANNER, which the rules say may not be removed", () => {
    // "The banner may be polished, but not deleted or hidden."
    assert.match(AGENTS, /under-production banner/);
    const layout = readFileSync("app/layout.tsx", "utf8");
    assert.match(layout, /NewSiteNotice/, "the site-wide notice is no longer rendered");
    assert.ok(readFileSync("components/NewSiteNotice.tsx", "utf8").length > 500);
  });

  it("KEEPS PERSONAL ASSISTANCE INSIDE CONTACT, which the rules also say", () => {
    assert.match(AGENTS, /discoverable only from the Contact area/);
    assert.match(readFileSync("app/contact/page.tsx", "utf8"), /<PlanningRequestForm/);
  });
});

describe("two things this site is not", () => {
  /**
   * The owner's standing instruction, encoded so a later review cannot talk
   * the site back into either one.
   *
   * BOTH HAVE ALREADY BEEN ASKED FOR ONCE by a post-launch review, in good
   * faith, and built. That is exactly why they are a test now rather than a
   * paragraph: a persuasive checklist arrives, the reasoning looks sound in
   * isolation, and the site drifts into being a planning agency with a
   * founder page — which is the one thing the owner has said twice it is not.
   */
  it("KEEPS THE INSTRUCTION WHERE THE NEXT PERSON READS IT", () => {
    // The owner recorded these himself in another session; this file only
    // holds them. Asserting on his headings rather than a paraphrase, so a
    // reworded restatement cannot pass while the real rule is gone.
    assert.match(AGENTS_MD, /## The paid planning service is a last resort/);
    assert.match(AGENTS_MD, /Do not ask the owner to price it/i);
    assert.match(AGENTS_MD, /## Settled decisions/);
    assert.match(AGENTS_MD, /carries no personal facts at all/i);
    // THE NEWEST OF THESE, and the easiest to undo in good faith. The rule
    // used to read "no name and no background — only where the business is
    // based", so the obvious next kindness was to ask him for a town and put
    // it on the page. There is no town: White Glove is a website, not a
    // business with a place, and the About page is finished without one.
    assert.match(AGENTS_MD, /not based anywhere/i);
    assert.match(AGENTS_MD, /## Working with the owner/);
  });

  it("ASKS FOR NO LOCATION ANYWHERE THE OWNER WILL SEE IT", () => {
    // The admin screen is where a "you have not filled this in" nudge would
    // live, so it is the screen that has to say the opposite.
    const aboutAdmin = readFileSync("app/admin/settings/about/page.tsx", "utf8");
    assert.match(aboutAdmin, /Nothing on this screen is required/i);
    assert.doesNotMatch(aboutAdmin, /is the only one of these the public page needs/i);
  });

  it("QUOTES NO PRICE FOR PLANNING WORK", () => {
    // Not a figure, not a range, not a "from". The pricing lines staying
    // unanswered is the resting state, not a gap.
    for (const key of ["pricingStartsAt", "pricingWhatAffects", "pricingTurnaround", "pricingRevisions", "pricingBookingSupport", "pricingFeeCredit", "pricingTimeline", "pricingCancellation", "pricingSupportAfter"] as const) {
      assert.doesNotMatch(BUILT_IN_WORDS[key], /[€$£]\s?\d/, `${key} quotes a price`);
    }
    for (const service of services) {
      assert.doesNotMatch(service.pricing, /[€$£]\s?\d/, `${service.id} quotes a price`);
      assert.doesNotMatch(service.pricing, /\bfrom\s+[€$£]/i, service.id);
    }
  });

  it("KEEPS PLANNING OUT OF THE WAYS TO START", () => {
    // Enforced in the component rather than remembered per page: it is
    // dropped unless a page opts in, and only the services page does, where
    // it is listing what you could do for free instead.
    const points = readFileSync("components/StartingPoints.tsx", "utf8");
    assert.match(points, /includePlanning \? \[\] : \["\/services"\]/, "planning is no longer excluded by default");
    const optIn = PAGES.filter((path) => readFileSync(path, "utf8").includes("includePlanning"));
    assert.deepEqual(
      optIn.map((path) => path.replace(/\\/g, "/")),
      ["app/services/page.tsx"],
      "a page other than /services is promoting personal planning as a way to start",
    );
  });

  it("KEEPS PLANNING TO ONE FOOTER LINK", () => {
    const footer = readFileSync("components/Footer.tsx", "utf8");
    const links = (footer.match(/href: "\/services"/g) ?? []).length;
    assert.ok(links <= 1, `the footer links to planning ${links} times; the rule is one small link`);
  });

  it("ASKS FOR NO BIOGRAPHY", () => {
    // No field anywhere for the owner's story. If one appears, somebody has
    // been asked for it again.
    const banned = /\b(founder(?:'s)? (?:story|bio)|meet the team|years of experience|our credentials)\b/i;
    for (const path of FILES) {
      assert.doesNotMatch(prose(path), banned, `${path} asks for or prints a biography`);
    }
  });
});

describe("one name per thing", () => {
  // Comments out: both files record the old names in order to say what
  // changed, which is exactly what the checks below look for.
  const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const NAV = strip(readFileSync("lib/navigation.ts", "utf8"));
  const POINTS = strip(readFileSync("lib/starting-points.ts", "utf8"));

  it("KEEPS THE VOCABULARY WHERE THE NEXT PERSON READS IT", () => {
    assert.match(AGENTS_MD, /## One name per thing/);
    assert.match(AGENTS_MD, /lib\/starting-points\.ts/);
  });

  it("CALLS ONE PAGE ONE THING IN THE NAVIGATION", () => {
    // The bar said "My Trips" and the menu said "Itinerary planner", both
    // pointing at /itinerary — one page offered twice under two names, which
    // reads as two features, one of which cannot be found.
    // Each nav item is a small object; pull the label that sits with /itinerary.
    const itineraryBlocks = [...NAV.matchAll(/\{[^{}]*href: "\/itinerary"[^{}]*\}/g)].map((m) => m[0]);
    const labels = itineraryBlocks.map((block) => /label: "([^"]+)"/.exec(block)?.[1]).filter(Boolean);
    assert.ok(labels.includes("Itinerary planner"), "the navigation bar no longer calls /itinerary the itinerary planner");
    assert.deepEqual([...new Set(labels)].filter((l) => l !== "Itinerary planner"), [], `/itinerary is also called: ${labels}`);
    assert.doesNotMatch(NAV, /"My Trips"/);
    assert.doesNotMatch(NAV, /"Hotels & Stays"/);
  });

  it("NAMES THE FOUR FRONT DOORS IN ONE PLACE", () => {
    for (const href of ["/plan", "/itinerary", "/book", "/services"]) {
      assert.ok(POINTS.includes(`href: "${href}"`), href);
    }
    // And uses the site's own word for the planner rather than a fifth one.
    assert.match(POINTS, /itinerary planner/);
    assert.doesNotMatch(POINTS, /trip planner/);
  });
});

describe("hiding a section rather than announcing that it is empty", () => {
  it("RENDERS NOTHING WHERE A DESTINATION HAS NO STAYS OR NO ATTRACTIONS", () => {
    // AGENTS.md: hide unfinished or empty public sections. These used to
    // render a dashed panel saying we had not finished checking.
    const page = readFileSync("app/destinations/[destination]/page.tsx", "utf8");
    assert.match(page, /if \(facts\.stays\.length === 0 && facts\.areas\.length === 0\) return null/);
    assert.match(page, /if \(facts\.attractions\.length === 0\) return null/);
    assert.doesNotMatch(page, /<NothingPublishedYet/);
  });

  it("keeps the empty-state component exporting nothing to render", () => {
    const badge = readFileSync("components/VerificationBadge.tsx", "utf8");
    const body = badge.slice(badge.indexOf("export function NothingPublishedYet"));
    assert.match(body, /return null/);
  });
});
