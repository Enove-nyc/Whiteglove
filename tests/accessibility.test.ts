import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * The accessibility rules that can be checked without a browser.
 *
 * THIS IS THE SECOND HALF OF THE ANSWER. The first half is `npm run audit:ui`,
 * which loads the real pages in a real browser at eight widths and measures
 * what cannot be read from source: overflow, touch targets, tab order,
 * heading order, and the contrast of every line against whatever is actually
 * painted behind it. That is the only honest way to check most of this, and it
 * needs a running server, so it is a command rather than a test.
 *
 * What IS checkable from source is the structural half — the things that are
 * true or false in the code and that a refactor can quietly delete. Each one
 * below is a rule the site already keeps; the test is what stops it stopping.
 */

const CSS = readFileSync("app/globals.css", "utf8");
const LAYOUT = readFileSync("app/layout.tsx", "utf8");

/** Every .tsx under app/ and components/, minus the admin. */
function sourceFiles(): Array<{ path: string; source: string }> {
  const out: Array<{ path: string; source: string }> = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith(".")) continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        // The admin is the owner's own workshop and has its own audit
        // (`npm run audit:admin`), with its own 44px rule in globals.css.
        if (path.includes("admin")) continue;
        walk(path);
        continue;
      }
      if (path.endsWith(".tsx")) out.push({ path, source: readFileSync(path, "utf8") });
    }
  };
  walk("app");
  walk("components");
  return out;
}

const FILES = sourceFiles();

describe("getting to the content", () => {
  it("puts a skip link first in the document, on every page", () => {
    // Without it a keyboard or screen-reader user walks the whole header, on
    // every page, before reaching what they came for.
    const body = LAYOUT.slice(LAYOUT.indexOf("<body"));
    assert.match(body.slice(0, 400), /wg-skip-link/);
    assert.match(CSS, /\.wg-skip-link/);
    assert.match(CSS, /\.wg-skip-link:focus/);
  });

  it("gives the skip link somewhere that can actually take focus", () => {
    // Without tabIndex the browser scrolls to the anchor and leaves the focus
    // behind, so the next Tab starts at the header again.
    assert.match(LAYOUT, /id="main-content" tabIndex=\{-1\}/);
  });

  it("declares the page language", () => {
    assert.match(LAYOUT, /<html\s+lang="en"/);
  });
});

describe("seeing where you are", () => {
  it("has a focus ring that survives both backgrounds the site uses", () => {
    assert.match(CSS, /:focus-visible\s*\{[^}]*outline:\s*3px solid/);
    // The dark halo is what makes gold visible on cream.
    assert.match(CSS, /:focus-visible\s*\{[^}]*box-shadow/);
  });

  it("KEEPS THE RING OUT OF REACH OF A UTILITY CLASS", () => {
    // This was wrapped in :where(), which has zero specificity — so
    // `outline-none` on a single input, which Tailwind emits as a class,
    // silently won and that field had no focus ring at all. A dozen of them
    // did, across the search box, the booking fields, the map filters and the
    // planner, and nothing in the source looked wrong.
    const rule = CSS.slice(CSS.indexOf("a:focus-visible"), CSS.indexOf("wg-skip-link"));
    assert.match(rule, /^a:focus-visible,/m, "the focus ring rule has moved or been renamed");
    assert.doesNotMatch(rule, /:where\(/, "the focus ring is back inside :where() and a utility can remove it");
    for (const element of ["button", "input", "select", "textarea", "summary"]) {
      assert.match(rule, new RegExp(`${element}:focus-visible`), `${element} has no focus ring`);
    }
  });
});

describe("movement", () => {
  it("honours a request for less of it", () => {
    assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)/);
    const block = CSS.slice(CSS.indexOf("@media (prefers-reduced-motion: reduce)"));
    assert.match(block, /transition-duration:\s*0\.01ms\s*!important/);
    assert.match(block, /animation-duration:\s*0\.01ms\s*!important/);
    assert.match(block, /scroll-behavior:\s*auto/);
  });
});

describe("Hebrew and Yiddish", () => {
  it("SAYS WHICH LANGUAGE IT IS, not only which direction", () => {
    // dir= gets the order right and says nothing about pronunciation. A
    // screen reader reading a Yiddish name with English phonetics is not a
    // near miss; it is unintelligible.
    const bilingual = readFileSync("components/BilingualLabel.tsx", "utf8");
    const mixed = readFileSync("components/MixedText.tsx", "utf8");
    assert.match(bilingual, /lang=\{primaryDir === "rtl" \? primaryLang : undefined\}/);
    assert.match(mixed, /lang=\{langOf\(/);
  });

  it("marks only the Hebrew-script part, so the digits are not read in Hebrew", () => {
    // A yahrzeit is "כ״א אדר · 5547 / 1787". Marking the whole string would
    // have the years read out in Hebrew.
    const mixed = readFileSync("components/MixedText.tsx", "utf8");
    assert.match(mixed, /HEBREW_SCRIPT\.test\(part\)/);
    assert.match(mixed, /: undefined/);
  });

  it("carries a lang wherever a page writes Hebrew script into the markup itself", () => {
    // Text typed straight into a component, rather than passed through one of
    // the two bilingual components, has to say so for itself.
    const hebrew = /[֐-׿]/;
    const missing: string[] = [];
    for (const { path, source } of FILES) {
      // The admin is the owner's own screens and is audited separately.
      if (/Admin/.test(path)) continue;
      // Comments explain the components and are not rendered.
      const markup = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      for (const line of markup.split("\n")) {
        if (!hebrew.test(line)) continue;
        if (/lang=/.test(line)) continue;
        // A placeholder is a hint inside a field, not content, and a lang on
        // the field itself would mislabel everything typed into it.
        if (/placeholder=/.test(line)) continue;
        // The <title> and the description of a page: metadata carries no
        // markup and so cannot carry a language attribute.
        if (/^\s*(title|description|seoTitle|seoDescription|alternateNames|aliases):/.test(line)) continue;
        // A constant or a data field, rendered by a component that marks it.
        // `hebrew:` is the convention for that — a field named for the script
        // it holds, so the component rendering it knows to wrap it.
        if (/SUB_BRAND|yiddish|Yiddish|APPROVED|^\s*(hebrew|\{ hebrew):/.test(line.trim())) continue;
        missing.push(`${path}: ${line.trim().slice(0, 60)}`);
      }
    }
    assert.deepEqual(missing, [], `Hebrew script with no language declared:\n${missing.join("\n")}`);
  });

  it("declares the DIRECTION as well, wherever it declares the language", () => {
    // lang= is for the voice and dir= is for the order; a right-to-left run
    // inside a left-to-right paragraph needs both, and one without the other
    // is half an answer. dir="auto" counts — components/MixedText.tsx uses it
    // deliberately, because a yahrzeit is Hebrew and digits on one line and
    // each segment has to resolve on its own.
    const missing: string[] = [];
    for (const { path, source } of FILES) {
      if (/Admin/.test(path)) continue;
      const markup = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      for (const line of markup.split("\n")) {
        // The <html lang="en"> in the layout is the document language, not an
        // inline run, and has no direction to declare.
        if (!/lang=\{?["']?(he|yi)\b|lang=\{lang/.test(line)) continue;
        if (/\bdir=/.test(line)) continue;
        // A lang PROP handed to one of the two bilingual components, which
        // apply the direction themselves — MixedText with dir="auto" per
        // segment, BilingualLabel with the direction of each half.
        if (/<(MixedText|BilingualLabel)\b/.test(line)) continue;
        missing.push(`${path}: ${line.trim().slice(0, 70)}`);
      }
    }
    assert.deepEqual(missing, [], `a language with no direction beside it:\n${missing.join("\n")}`);
  });
});

describe("nothing is carried by colour alone", () => {
  it("gives every verification label a glyph as well as a tint", () => {
    const badge = readFileSync("components/VerificationBadge.tsx", "utf8");
    assert.match(badge, /descriptor\.glyph/);
  });

  it("gives the kosher and Shabbos indicators a glyph too", () => {
    const card = readFileSync("components/VacationCard.tsx", "utf8");
    assert.match(card, /signal\.glyph/);
  });

  it("marks a done step with a mark, and says so to a screen reader", () => {
    const panel = readFileSync("components/TripSetupPanel.tsx", "utf8");
    assert.match(panel, /step\.done \? "✓" : "○"/);
    assert.match(panel, /step\.done \? " — done" : " — still to do"/);
  });

  it("marks the current navigation item three ways", () => {
    // A filled pill, a gold underline, and aria-current. Colour alone leaves
    // anybody who cannot separate cream from cream-deep with no idea where
    // they are.
    const navbar = readFileSync("components/Navbar.tsx", "utf8");
    assert.match(navbar, /aria-current=\{\w*[Cc]urrent \? "page" : undefined\}/);
    assert.match(navbar, /after:bg-\[var\(--gold\)\]/);
  });
});

describe("the accent that is dark enough to read", () => {
  it("defines a text gold, and says what it measured", () => {
    assert.match(CSS, /--gold-ink:/);
    assert.match(CSS, /4\.5:1|4\.79:1/, "the reason for the second gold is not written down");
  });

  it("USES IT FOR TEXT EVERYWHERE, and keeps the light one for borders", () => {
    // THE ONE THAT MATTERS. --gold on the site's own backgrounds is 2.6:1 to
    // 3.2:1 — fine for a rule, a failure for the small-caps eyebrow that was
    // set in it on every page.
    const offenders: string[] = [];
    for (const { path, source } of FILES) {
      if (/text-\[var\(--gold\)\]/.test(source)) offenders.push(path);
    }
    assert.deepEqual(offenders, [], `--gold used as a text colour: ${offenders.join(", ")}`);
  });
});

describe("descriptive names", () => {
  it("HAS NO BARE “LEARN MORE” OR “OPEN” LINK", () => {
    // A screen reader can list the links on a page. Eleven of them called
    // "Learn more" is a list of nothing.
    const vague = /<(?:Link|a)\b[^>]*>\s*(Learn more|Read more|Open|Click here|Here|More)\s*(?:&rarr;|→|-&gt;)?\s*<\/(?:Link|a)>/i;
    const offenders: string[] = [];
    for (const { path, source } of FILES) {
      if (vague.test(source)) offenders.push(path);
    }
    assert.deepEqual(offenders, [], `vague link text: ${offenders.join(", ")}`);
  });
});

describe("dialogs", () => {
  it("gives every dialog a label, a modal flag and an escape", () => {
    for (const { path, source } of FILES) {
      if (!/role="dialog"/.test(source)) continue;
      // aria-modal is required of a MODAL — one that covers the page. A
      // popover anchored to its field, like the date picker, is a dialog that
      // is not modal, and claiming otherwise would tell a screen reader the
      // rest of the page had gone away when it has not.
      if (/fixed inset-0/.test(source)) {
        assert.match(source, /aria-modal="true"/, `${path}: full-screen dialog without aria-modal`);
      }
      assert.match(source, /aria-labelledby|aria-label=/, `${path}: dialog with no name`);
      // Either the dialog handles Escape itself, or it uses the shared hook
      // that does — components/useFocusTrap.ts, which also moves the focus in
      // and puts it back where it came from.
      assert.match(source, /"Escape"|useFocusTrap/, `${path}: dialog with no way out from the keyboard`);
    }
  });

  it("makes the travel notice a real dialog when it is a popup", () => {
    // Same bar as every other modal on the site: labelled, modal, Escape,
    // focus trap. A fixed overlay that skips any of those is worse than the
    // old strip.
    const notice = readFileSync("components/NewSiteNotice.tsx", "utf8");
    assert.match(notice, /role="dialog"/);
    assert.match(notice, /aria-modal="true"/);
    assert.match(notice, /useFocusTrap/);
    assert.match(notice, /aria-labelledby/);
  });
});

/**
 * The three flows a visitor actually uses, checked one rule at a time.
 *
 * These are the WCAG 2.2 AA points that live in the markup rather than in the
 * rendered pixels — the pixel half (contrast, reflow at 200% and 400%, touch
 * targets, tab order, heading order) is `npm run audit:ui`, which measures the
 * real pages in a real browser and currently reports nothing.
 */

const HUB = readFileSync("components/VacationIdeasHub.tsx", "utf8");
const DESTINATIONS = readFileSync("app/destinations/(hub)/page.tsx", "utf8");
const FLOW = readFileSync("components/TripStartFlow.tsx", "utf8");

describe("the vacation-ideas filters", () => {
  it("GIVES THE SEARCH FIELD A VISIBLE LABEL, not only a placeholder", () => {
    // A placeholder disappears at the first keystroke: somebody who tabs back
    // to a filled field has nothing left telling them what it is, and voice
    // control has no name to speak.
    assert.match(HUB, /<label htmlFor="vacation-search"/);
    assert.match(HUB, /id="vacation-search"/);
    // The heritage-search hint went with the wording pass — heritage is in
    // this same directory now, so the hint described a distinction that no
    // longer exists. The visible label stays; that is the accessibility rule.
  });

  it("exposes which filter is chosen as a real state", () => {
    assert.match(HUB, /aria-pressed=\{value === ""\}/);
    assert.match(HUB, /aria-pressed=\{value === option\.value\}/);
  });

  it("ANNOUNCES THE FILTERED STATE, WITHOUT A NUMBER", () => {
    // Two rules meet here. The live region must announce state changes as
    // text-only (it used to contain the "Clear all filters" button, so every
    // press announced the button's label, and the button appearing or
    // disappearing changed the region's structure rather than its text). And
    // the redesign removes result totals everywhere public — so what is
    // announced is whether the list is filtered, never how many it holds.
    const region = HUB.slice(HUB.indexOf('<p role="status"'), HUB.indexOf("</p>", HUB.indexOf('<p role="status"')));
    assert.match(region, /aria-live="polite"/);
    assert.match(region, /destinations/i);
    assert.doesNotMatch(region, /<button/);
    assert.doesNotMatch(region, /\.length|count/i, "the live region announces a number");
  });

  it("names each filter group rather than leaving thirty loose buttons", () => {
    assert.match(HUB, /<fieldset/);
    assert.match(HUB, /<legend/);
  });

  it("keeps trip types reachable as real links, now from the navigation", () => {
    // The style-card grid left the hub page — trip types live in the
    // Destinations dropdown (real links, keyboard reachable) and the hub's
    // own Filter drawer. The links must stay links: a shareable route, not a
    // one-off visual toggle.
    const NAV = readFileSync("lib/navigation.ts", "utf8");
    for (const kind of ["beach", "city", "mountains", "family", "couples", "short-break"]) {
      assert.ok(NAV.includes(`/destinations?kind=${kind}`), `${kind} lost its navigation link`);
    }
    assert.match(DESTINATIONS, /<VacationIdeasHub/);
    // Same-route links preserve Client Component state by default, so the hub
    // reads the new server-provided query values directly rather than trying
    // to reset all of the visitor's local refinements after navigation lands.
    assert.match(HUB, /useMemo<VacationFilters>\(\s*\(\) => \(\{ \.\.\.localFilters, theme: initialTheme, season: initialSeason \}\)/);
    assert.match(HUB, /router\.push\(vacationBrowseHref/);
    assert.match(HUB, /All destinations/);
  });
});

describe("the planning flow", () => {
  it("announces which option is selected, once", () => {
    assert.match(FLOW, /aria-pressed=\{on\}/);
    assert.match(FLOW, /aria-pressed=\{answers\.dateMode === value\}/);
    assert.match(FLOW, /aria-pressed=\{answers\.pace === pace\.value\}/);
    // aria-pressed and a visually-hidden "Selected" together read as
    // "Rome, selected, pressed".
    assert.doesNotMatch(FLOW, /sr-only">Selected</);
  });

  it("marks the current step programmatically", () => {
    assert.match(FLOW, /aria-current=\{state === "current" \? "step" : undefined\}/);
    assert.match(FLOW, /aria-label="Progress through planning"/);
    // And the step numbers are not carried by the coloured circle alone.
    assert.match(FLOW, /<span className="sr-only">Step \{entry\.number\}: <\/span>/);
  });

  it("MOVES THE FOCUS TO THE NEW STEP'S HEADING", () => {
    // Pressing Continue and leaving the focus on a button that no longer
    // exists strands a keyboard user at the top of the document.
    assert.match(FLOW, /requestAnimationFrame\(\(\) => headingRef\.current\?\.focus\(\)\)/);
    assert.match(FLOW, /ref=\{headingRef\}/);
    assert.match(FLOW, /tabIndex=\{-1\}/);
    // Every step change goes through goToStep — Continue, Back, and the three
    // numbered links in the progress bar — so none of them can be the one that
    // forgets to move the focus. setStep is called from nowhere else.
    assert.ok((FLOW.match(/goToStep\(/g) ?? []).length >= 5);
    assert.equal((FLOW.match(/setStep\(/g) ?? []).length, 1, "setStep is called from outside goToStep");
  });

  it("keeps the optional section operable from the keyboard", () => {
    // <details>/<summary> rather than a div with an onClick: it is focusable,
    // it toggles on Enter and Space, and it announces itself as expandable
    // without a line of aria.
    assert.match(FLOW, /<details/);
    assert.match(FLOW, /<summary/);
  });
});


describe("waiting is said out loud", () => {
  it("gives every skeleton a status line, and hides the grey boxes", () => {
    // A screen reader gets nothing at all from an animated rectangle.
    for (const path of ["app/destinations/[destination]/page.tsx", "app/destinations/(hub)/loading.tsx"]) {
      const source = readFileSync(path, "utf8");
      assert.match(source, /role="status"/, path);
      assert.match(source, /aria-busy="true"/, path);
      assert.match(source, /aria-hidden="true"/, path);
    }
  });
});
