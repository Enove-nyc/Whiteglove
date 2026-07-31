// Measure the site at every breakpoint, instead of guessing about it.
//
//   npm run build && npx next start -p 3130
//   node scripts/audit-ui.mjs [base-url]
//
// This exists because "responsive" and "accessible" are claims, and the only
// honest way to make them is to load the real pages in a real browser at the
// real widths and read the numbers back. It reports, per page and per width:
//
//   overflow         the page scrolls sideways, and which element does it
//   duplicate-search more than one site-search box visible at once
//   nav-doubled      the desktop bar and the menu button both showing
//   touch-target     a control under 44px tall on a phone-sized screen
//   tab-order        the first tab stop is not the skip link, or the order
//                    jumps back up the page
//   unlabeled-input  a form control with no accessible name
//
// Findings are not all bugs — read them. Inline links inside a paragraph are
// deliberately exempt from the touch-target check (making a link in running
// text 44px tall breaks the paragraph), and third-party attribution links are
// left as they are.
//
// Chromium only. WebKit is not installed in CI, so Safari's date and form
// controls still need checking by hand on a real device.

import { chromium } from "playwright";

/**
 * Launch whichever Chromium this machine actually has.
 *
 * Playwright's default is the headless-shell build it downloads itself. Some
 * environments ship a full Chromium at a fixed path instead and skip that
 * download, and there the default launch fails with "Executable doesn't
 * exist" — which reads like a broken script rather than a missing download.
 * Set PLAYWRIGHT_CHROMIUM_EXECUTABLE to point at a specific binary.
 */
async function launchChromium() {
  const explicit = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (explicit) return chromium.launch({ executablePath: explicit });
  try {
    return await chromium.launch();
  } catch (error) {
    for (const candidate of ["/opt/pw-browsers/chromium", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]) {
      try {
        return await chromium.launch({ executablePath: candidate });
      } catch {
        /* try the next one */
      }
    }
    throw error;
  }
}


const BASE = process.argv[2] ?? "http://127.0.0.1:3130";
const WIDTHS = [
  [320, 568], [375, 667], [390, 844], [430, 932],
  [768, 1024], [1024, 768], [1280, 720], [1440, 900],
];
const PAGES = [
  ["/", "homepage"],
  ["/stops", "destination directory"],
  ["/cemeteries", "cemetery directory"],
  ["/destinations/uman", "destination page"],
  ["/book", "book"],
  ["/login", "login"],
  ["/itinerary", "route planner"],
  ["/directory", "provider directory"],
  ["/map", "map"],
];

const browser = await launchChromium();
const findings = [];
const note = (page, width, kind, detail) => findings.push({ page, width, kind, detail });

for (const [path, label] of PAGES) {
  for (const [width, height] of WIDTHS) {
    const p = await browser.newPage({ viewport: { width, height } });
    try {
      await p.goto(BASE + path, { waitUntil: "load", timeout: 60000 });
      // Wait until the stylesheet has actually applied — an unstyled page
      // reports every control as 17px tall and the whole audit becomes noise.
      await p.waitForFunction(() => getComputedStyle(document.body).backgroundColor !== "rgba(0, 0, 0, 0)", null, { timeout: 20000 });
      await p.waitForTimeout(600);
      const broke = await p.evaluate(() => /Reload|Application error/.test(document.body.innerText.slice(0, 400)) && document.body.innerText.length < 600);
      if (broke) throw new Error("page rendered an error screen");

      // 1. Horizontal overflow, and what is causing it.
      const overflow = await p.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth <= docW) return null;
        const guilty = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > docW + 1 || r.left < -1) {
            const style = getComputedStyle(el);
            if (style.visibility === "hidden" || style.display === "none") continue;
            guilty.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ").slice(0, 3).join(".")} right=${Math.round(r.right)}`);
          }
        }
        return { docW, scrollW: document.documentElement.scrollWidth, guilty: guilty.slice(0, 4) };
      });
      if (overflow) note(label, width, "overflow", `${overflow.scrollW}>${overflow.docW} :: ${overflow.guilty.join(" | ")}`);

      // 2. More than one visible site-search box. Page-level filters (the
      // provider search, the airport pickers) are not duplicates of it.
      const searches = await p.evaluate(() => {
        const seen = [];
        for (const el of document.querySelectorAll('input[placeholder^="Search a city, tzaddik"]')) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") seen.push(`@${Math.round(r.x)},${Math.round(r.y)}`);
        }
        return seen;
      });
      if (searches.length > 1) note(label, width, "duplicate-search", `${searches.length} visible: ${searches.join(" ; ")}`);

      // 3. The desktop bar and a control calling itself the navigation menu,
      // both on screen at the same width.
      const nav = await p.evaluate(() => {
        const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const menuBtn = [...document.querySelectorAll("button")].find((b) => /navigation menu/i.test(b.getAttribute("aria-label") || ""));
        const primary = [...document.querySelectorAll("nav a")].filter((a) => vis(a) && /^(Destinations|Cemeteries|Getaways|Directory|Services|Book|Flights, hotels & cars)$/.test((a.textContent || "").trim()));
        return { menu: vis(menuBtn), primaryLinks: primary.length };
      });
      if (nav.menu && nav.primaryLinks >= 3) note(label, width, "nav-doubled", `a "navigation menu" button and ${nav.primaryLinks} primary links both visible`);

      // 4. Touch targets under 44px, on the widths where a thumb is doing the
      // pointing. Inline links inside running text are exempt — WCAG's target
      // size rule exempts them, and enlarging them breaks the paragraph.
      if (width <= 430) {
        const small = await p.evaluate(() => {
          const out = [];
          for (const el of document.querySelectorAll("a, button, summary, [role=button]")) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (getComputedStyle(el).visibility === "hidden") continue;
            const inline = getComputedStyle(el).display === "inline" && el.closest("p, li, span");
            if (r.height < 44 && !inline) {
              const text = (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 32);
              if (text) out.push(`${Math.round(r.height)}px "${text}"`);
            }
          }
          return out;
        });
        if (small.length) note(label, width, "touch-target", `${small.length} under 44px :: ${[...new Set(small)].slice(0, 8).join(" | ")}`);
      }

      if (width === 390) {
        // 5. Tab order: the skip link first, and no long jumps back up the page.
        const order = await p.evaluate(() => {
          const items = [...document.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')]
            .filter((el) => el.offsetParent !== null);
          let backwards = 0, prevTop = -Infinity;
          for (const el of items.slice(0, 40)) {
            const top = Math.round(el.getBoundingClientRect().top + window.scrollY);
            if (top < prevTop - 80) backwards += 1;
            prevTop = Math.max(prevTop, top);
          }
          return { first: (items[0]?.textContent || "").trim().slice(0, 30), backwards };
        });
        if (order.first !== "Skip to content") note(label, "any", "tab-order", `first tab stop is "${order.first}", not the skip link`);
        if (order.backwards > 2) note(label, "any", "tab-order", `${order.backwards} backward jumps in the first 40 tab stops`);

        // 6. Form controls with no accessible name.
        const unnamed = await p.evaluate(() => {
          const out = [];
          for (const el of document.querySelectorAll("input, select, textarea")) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            if (el.type === "hidden") continue;
            const named =
              el.getAttribute("aria-label") ||
              el.getAttribute("aria-labelledby") ||
              el.getAttribute("title") ||
              (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) ||
              el.closest("label");
            if (!named) out.push(`${el.tagName.toLowerCase()}[type=${el.type || "-"}] name=${el.name || "-"} ph=${(el.placeholder || "-").slice(0, 24)}`);
          }
          return out;
        });
        if (unnamed.length) note(label, "any", "unlabeled-input", `${unnamed.length} :: ${[...new Set(unnamed)].slice(0, 6).join(" | ")}`);
      }
    } catch (error) {
      note(label, width, "error", String(error).split("\n")[0].slice(0, 140));
    }
    await p.close();
  }
}
await browser.close();

const byKind = {};
for (const f of findings) (byKind[f.kind] ||= []).push(f);
for (const kind of Object.keys(byKind).sort()) {
  console.log(`\n===== ${kind.toUpperCase()} (${byKind[kind].length}) =====`);
  const seen = new Set();
  for (const f of byKind[kind]) {
    const key = `${f.page}|${f.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const widths = byKind[kind].filter((o) => o.page === f.page && o.detail === f.detail).map((o) => o.width).join(",");
    console.log(`${f.page} @ ${widths}\n    ${f.detail}`);
  }
}
console.log(`\nTOTAL ${findings.length}`);
process.exit(findings.length ? 1 : 0);
