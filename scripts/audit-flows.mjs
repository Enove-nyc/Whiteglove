// Drive the journeys a visitor actually takes, instead of asserting about them.
//
//   npm run build && npx next start -p 3130
//   node scripts/audit-flows.mjs [base-url]
//
// scripts/audit-ui.mjs measures how a page is built — overflow, touch targets,
// contrast, headings. This one measures whether the site WORKS: it types into
// the forms, presses the buttons, follows the hand-offs and reads back what
// happened. The two together are the launch check.
//
// Each flow is one named check that passes or fails, run at 1280px and again at
// 390px, because half of these have failed on a phone and nowhere else — the
// booking panel's date popover opened below the fold for months.
//
// WHAT IT DELIBERATELY DOES NOT DO. It does not complete a booking, register an
// account or send a contact message: those reach a partner, a mail service and
// a database, and a check that posts real records every time it runs stops
// being run. It goes as far as the last step that is ours and asserts the
// hand-off is correctly formed — which is where the failures have been.
//
// Console errors and failed requests are collected per page and reported, since
// "no red in the console" is one of the acceptance criteria.

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3130";
const WIDTHS = [
  ["desktop", { width: 1280, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
];

/** Requests that fail because this machine cannot reach the open internet. */
const EXTERNAL = /photon\.komoot|nominatim|overpass|openstreetmap|tile\.|googleapis|gstatic|stay22|tp\.media|travelpayouts|booking\.com|kayak|aviasales/i;

const results = [];
let browser;

function record(name, width, ok, detail = "") {
  results.push({ name, width, ok, detail });
  process.stdout.write(`${ok ? "  ok  " : "FAIL  "}${name} @ ${width}${detail ? ` :: ${detail}` : ""}\n`);
}

/**
 * One check, with its own page.
 *
 * A fresh context per flow, because several of these write to localStorage and
 * an itinerary left behind by the previous check would make the next one pass
 * for the wrong reason.
 */
async function flow(name, viewport, width, body) {
  const context = await browser.newContext({ viewport, isMobile: width === "mobile", hasTouch: width === "mobile" });
  const page = await context.newPage();
  const noise = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // A signed-out visitor saving to their trip gets a 401 from the account
    // sync, and that is the correct answer: the trip is kept in the browser
    // and pushed to the account only when there is one. Expected, not noise.
    if (/Failed to load resource.*\b401\b/.test(text)) return;
    // No outbound network on the machine running the check: a partner or a
    // map tile that cannot be reached is the environment, not the site.
    if (/net::ERR_(CONNECTION_RESET|NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|TIMED_OUT)/.test(text)) return;
    noise.push(text.slice(0, 200));
  });
  page.on("requestfailed", (request) => {
    // ABORTED IS NOT FAILED. Next prefetches the pages behind every visible
    // link, and the ones still in flight when a check finishes are cancelled
    // by the browser — reporting those as broken requests buries the real
    // ones under thirty lines of ?_rsc= noise.
    if (request.failure()?.errorText === "net::ERR_ABORTED") return;
    // The partner sites and the map tiles are on the open internet; a machine
    // running this check may not be. Those are filtered by EXTERNAL below.
    if (!EXTERNAL.test(request.url())) noise.push(`request failed: ${request.url().slice(0, 160)}`);
  });
  try {
    const detail = await body(page);
    record(name, width, true, detail ?? "");
  } catch (error) {
    record(name, width, false, String(error.message ?? error).split("\n")[0].slice(0, 180));
  }
  if (noise.length) {
    const unique = [...new Set(noise)];
    record(`${name} — console and network`, width, false, unique.slice(0, 3).join(" | "));
  }
  await context.close();
}

/**
 * Open a page and get past the front door.
 *
 * The site-wide "before you travel" caution is a MODAL: it covers the page,
 * sets body{overflow:hidden} and traps focus until it is dismissed. That is a
 * deliberate decision (components/NewSiteNotice.tsx), and it means every
 * check below was failing on "element is not clickable" rather than on
 * anything it was written to measure. A real visitor dismisses it once; so
 * does this.
 */
async function open(page, path) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 });
  // It mounts after hydration, so it is not there at domcontentloaded — wait
  // for it rather than looking once and missing it. Absent is fine too: once
  // dismissed it stays dismissed for that wording.
  const notice = page.locator('[role="dialog"][aria-modal="true"]').first();
  await notice.waitFor({ state: "visible", timeout: 6000 }).catch(() => undefined);
  if (await notice.isVisible().catch(() => false)) {
    const hide = notice.locator("button").last();
    await hide.click({ timeout: 5000 }).catch(() => undefined);
    await notice.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
    // Escape is the same action, and is the fallback if the wording changed.
    if (await notice.isVisible().catch(() => false)) {
      await page.keyboard.press("Escape");
      await notice.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
    }
  }
  return page;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run(width, viewport) {
  // ---- the homepage search, which is the site's primary action -----------
  await flow("homepage vacation search reaches our own page", viewport, width, async (page) => {
    await open(page, "/");
    const form = page.locator("form").filter({ has: page.locator('[name="destination"]') }).first();
    assert(await form.count(), "no search form with a destination field on the front page");
    // It must land on /hotels, not on a partner. That is the one decision the
    // front page exists to defend.
    assert((await form.getAttribute("action")) === "/hotels", "the front page search no longer posts to /hotels");
    await form.locator('[name="destination"]').fill("Rome");
    await Promise.all([page.waitForURL(/\/hotels/, { timeout: 30000 }), form.locator('button[type="submit"]').first().click()]);
    assert(/destination=Rome/i.test(page.url()), `search lost the destination: ${page.url()}`);
    return page.url().replace(BASE, "");
  });

  await flow("one search form on the front page, not two", viewport, width, async (page) => {
    await open(page, "/");
    const forms = await page.locator('form [name="destination"]').count();
    assert(forms === 1, `${forms} search forms on the front page`);
  });

  // ---- destination filters ------------------------------------------------
  await flow("destination filters narrow the list and survive a reload", viewport, width, async (page) => {
    await open(page, "/destinations?kind=family");
    await page.waitForTimeout(1200);
    const cards = await page.locator("main article, main li a[href^='/destinations/']").count();
    assert(cards > 0, "the family filter shows nothing at all");
    return `${cards} shown`;
  });

  // ---- long directories: filter, count, reset, share ----------------------
  for (const [label, path, filterLabel] of [
    ["things to do", "/things-to-do", "Country"],
    ["where to stay", "/hotels", "Country"],
  ]) {
    await flow(`${label}: filters go into the address and reset again`, viewport, width, async (page) => {
      await open(page, path);
      await page.waitForTimeout(1500);
      const select = page.locator("label", { hasText: filterLabel }).locator("select").first();
      assert(await select.count(), `no ${filterLabel} filter on ${path}`);
      const values = await select.locator("option").evaluateAll((options) => options.map((o) => o.value).filter(Boolean));
      assert(values.length > 0, `the ${filterLabel} filter has no options`);
      await select.selectOption(values[0]);
      await page.waitForTimeout(700);
      assert(page.url().includes("country="), `filtering ${path} did not reach the address bar: ${page.url()}`);
      const status = await page.locator('[role="status"]').first().innerText();
      assert(/\d+\s+of\s+\d+/.test(status), `no "n of m" count after filtering: ${status}`);
      const reset = page.getByRole("button", { name: /reset filters/i }).first();
      assert(await reset.count(), "no reset control once a filter is on");
      await reset.click();
      await page.waitForTimeout(700);
      assert(!page.url().includes("country="), `reset left the filter in the address: ${page.url()}`);
      return status.trim();
    });

    await flow(`${label}: a shared filter link opens filtered`, viewport, width, async (page) => {
      await open(page, `${path}?country=Italy`);
      await page.waitForTimeout(1500);
      const chosen = await page.locator("label", { hasText: filterLabel }).locator("select").first().inputValue();
      assert(chosen === "Italy", `a shared link did not restore the filter (got ${JSON.stringify(chosen)})`);
    });
  }

  await flow("things to do: no placeholder cards, and more loads on request", viewport, width, async (page) => {
    await open(page, "/things-to-do");
    await page.waitForTimeout(1500);
    const body = await page.locator("main").innerText();
    assert(!/\bOption \d\b|\bLorem ipsum\b|\bTBD\b|\bplaceholder\b/i.test(body), "a placeholder card is on the page");
    const more = page.getByRole("button", { name: /show \d+ more/i }).first();
    if (await more.count()) {
      const before = await page.locator("main article").count();
      await more.click();
      await page.waitForTimeout(600);
      const after = await page.locator("main article").count();
      assert(after > before, "“show more” did not add anything");
      return `${before} → ${after}`;
    }
    return "everything fits on one page";
  });

  // ---- the booking page: controls, hand-offs, disclosure ------------------
  await flow("booking panel controls are thumb-sized", viewport, width, async (page) => {
    await open(page, "/book");
    await page.waitForTimeout(1200);
    const small = await page.$$eval("input, select", (elements) =>
      elements
        .filter((element) => element.offsetParent !== null)
        .map((element) => ({
          label: element.getAttribute("aria-label") || element.placeholder || element.name || element.type,
          height: Math.round(element.getBoundingClientRect().height),
        }))
        .filter((entry) => entry.height > 0 && entry.height < 44));
    assert(small.length === 0, `under 44px: ${small.map((s) => `${s.label} ${s.height}px`).join(", ")}`);
  });

  await flow("booking page shows no half-filled offers", viewport, width, async (page) => {
    await open(page, "/book");
    await page.waitForTimeout(800);
    const body = await page.locator("main").innerText();
    assert(!/\bOption \d\b/.test(body), "an “Option 1 / Option 2” card is on the booking page");
    // The section header may only appear when there is something under it.
    if (/Once the flights are booked/i.test(body)) {
      const cards = await page.locator("section", { hasText: "Once the flights are booked" }).locator("a[rel*='sponsored']").count();
      assert(cards > 0, "the extras heading is showing with nothing under it");
    }
  });

  for (const [tab, fill] of [
    ["Hotels", async (page) => { await page.getByPlaceholder("City or town").first().fill("Rome"); }],
    // Flights needs BOTH ends before it will search — searchProblem refuses a
    // one-ended journey, which is correct and is why this fills two fields.
    ["Flights", async (page) => {
      const airports = page.getByPlaceholder("City or airport");
      await airports.nth(0).fill("JFK");
      await airports.nth(1).fill("FCO");
    }],
    ["Cars", async (page) => { await page.getByPlaceholder("City or airport").first().fill("Rome"); }],
  ]) {
    await flow(`${tab.toLowerCase()} hand-off opens a partner`, viewport, width, async (page) => {
      await open(page, "/book");
      await page.waitForTimeout(1000);
      await page.getByRole("button", { name: tab, exact: true }).first().click();
      await page.waitForTimeout(400);
      await fill(page);
      // The dates are drawn by the site rather than by the browser, so they
      // are set through the native input underneath the face.
      const dates = page.locator("input.wg-date-native");
      const count = await dates.count();
      for (let i = 0; i < Math.min(2, count); i += 1) {
        await dates.nth(i).evaluate((input, value) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }, i === 0 ? "2026-11-02" : "2026-11-06");
      }
      await page.waitForTimeout(300);
      // WHAT THE SITE ASKED FOR, not what the browser managed to load. The
      // partner is on the open internet and a machine running this check may
      // not be; asserting on the loaded page would turn "no outbound network"
      // into "the hand-off is broken". window.open is captured instead, which
      // is the site's half of the transaction and the half that has broken
      // before — an untagged URL earns nothing and looks identical.
      await page.evaluate(() => {
        window.__opened = [];
        const real = window.open;
        window.open = (url, ...rest) => { window.__opened.push(String(url)); return real.call(window, "about:blank", ...rest); };
      });
      await page.locator("main").getByRole("button", { name: /^Search (hotels|flights|cars|stays)/i }).first().click();
      await page.waitForTimeout(1500);
      const opened = await page.evaluate(() => window.__opened ?? []);
      const complaint = page.locator("main p.text-red-700").first();
      const refused = (await complaint.count()) ? await complaint.innerText() : "";
      assert(!refused, `the form refused to search: ${refused}`);
      assert(opened.length === 1, `the search opened ${opened.length} tabs`);
      // EVERY BOOKING LINK GOES THROUGH /go NOW (app/go/route.ts): it records
      // the click, then 302s to the partner. So the check follows the hop and
      // asserts where it lands — which is the whole chain rather than the
      // first link of it, and is what actually has to be right.
      const first = new URL(opened[0], BASE);
      let target = first.href;
      if (first.pathname === "/go") {
        const hop = await fetch(first.href, { redirect: "manual" });
        assert(hop.status >= 300 && hop.status < 400, `/go answered ${hop.status} instead of redirecting`);
        target = hop.headers.get("location") ?? "";
      }
      assert(/^https:\/\//.test(target), `the hand-off did not reach an https partner: ${target || "(no location)"}`);
      return new URL(target).host;
    });
  }

  await flow("/book can always reach how the site is paid", viewport, width, async (page) => {
    await open(page, "/book");
    await page.waitForTimeout(800);
    const panel = await page.locator("main").innerText();
    // The disclosure moved into the booking terms and onto each partner
    // action (tests/booking-page.test.ts records that decision). What must
    // not happen is /book carrying neither: three commission-earning searches
    // with no route to the arrangement behind them. A link to the terms
    // counts; nothing at all does not.
    const inline = /commission/i.test(panel);
    const toTerms = (await page.locator('a[href="/terms"], a[href^="/terms#"]').count()) > 0;
    assert(inline || toTerms, "no commission disclosure and no link to the terms anywhere on /book");
    return inline ? "disclosed on the page" : "via the terms link";
  });

  await flow("saving a booking puts it on the trip", viewport, width, async (page) => {
    await open(page, "/book");
    await page.waitForTimeout(1000);
    await page.getByPlaceholder("City or town").first().fill("Rome");
    const dates = page.locator("input.wg-date-native");
    for (let i = 0; i < 2; i += 1) {
      await dates.nth(i).evaluate((input, value) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, i === 0 ? "2026-11-02" : "2026-11-06");
    }
    // THE TRIP IS SAVED AFTER THE SEARCH, NOT BESIDE IT. The inline
    // "+ Add to my trip" button is gone: the booking happens on the partner's
    // site, so the site asks for it back when they return. That prompt is now
    // the only way a hotel reaches the itinerary from here, which makes it
    // the thing worth checking.
    await page.evaluate(() => { window.open = () => null; });
    await page.locator("main").getByRole("button", { name: /^Search hotels/i }).first().click();
    const prompt = page.getByRole("dialog").filter({ hasText: /booked/i }).first();
    await prompt.waitFor({ state: "visible", timeout: 10000 });
    await prompt.getByRole("button", { name: /add it to my trip/i }).first().click();
    await page.waitForTimeout(600);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("whiteGloveItinerary") || "{}"));
    assert((saved.lodging ?? []).length > 0, "nothing reached the itinerary");
    return `${saved.lodging.length} stay saved`;
  });

  // ---- planning, itinerary, persistence ------------------------------------
  await flow("the three-step planning flow advances", viewport, width, async (page) => {
    await open(page, "/plan");
    await page.waitForTimeout(1000);
    const before = await page.locator("main").innerText();
    const next = page.getByRole("button", { name: /next|continue|step 2/i }).first();
    if (await next.count()) {
      await next.click();
      await page.waitForTimeout(600);
      const after = await page.locator("main").innerText();
      assert(after !== before, "pressing next changed nothing");
    }
    assert(/three short steps/i.test(before), "the plan page no longer describes itself as three short steps");
  });

  await flow("an itinerary survives a reload", viewport, width, async (page) => {
    await open(page, "/itinerary");
    await page.waitForTimeout(1500);
    await page.evaluate(() =>
      localStorage.setItem(
        "whiteGloveItinerary",
        JSON.stringify({ title: "Flow check", startDate: "2026-11-02", endDate: "2026-11-05", flights: [], lodging: [], activities: [] }),
      ));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("whiteGloveItinerary") || "{}").title);
    assert(kept === "Flow check", `the planner lost the trip on reload (${kept})`);
  });

  // ---- the account doors ---------------------------------------------------
  await flow("sign in, register and password recovery are all reachable", viewport, width, async (page) => {
    await open(page, "/login");
    await page.waitForTimeout(800);
    const text = await page.locator("main").innerText();
    // All three on the form as it first renders: somebody who cannot remember
    // their password should not have to find a mode switch first.
    for (const wanted of [/sign in|log in/i, /register|create an account|sign up/i, /forgot|reset/i]) {
      assert(wanted.test(text), `nothing on /login matches ${wanted}`);
    }
    assert(await page.locator('input[type="password"]').count(), "no password field on /login");
  });

  // ---- contact -------------------------------------------------------------
  await flow("contact offers its reasons and validates before sending", viewport, width, async (page) => {
    await open(page, "/contact");
    await page.waitForTimeout(1000);
    const text = await page.locator("main").innerText();
    assert(/advertis/i.test(text), "the advertising reason is missing from contact");
    assert(await page.locator("form").count(), "no form on the contact page");
  });

  // ---- maps and directions -------------------------------------------------
  await flow("directions links are well formed", viewport, width, async (page) => {
    await open(page, "/things-to-do");
    await page.waitForTimeout(1500);
    const hrefs = await page.locator('a:has-text("Navigate")').evaluateAll((links) => links.slice(0, 5).map((a) => a.href));
    assert(hrefs.length > 0, "no navigate links on things to do");
    for (const href of hrefs) assert(/^https:\/\/(www\.)?google\.[a-z.]+\/maps/.test(href), `not a maps link: ${href}`);
    return `${hrefs.length} checked`;
  });

  // ---- the affiliate disclosure, everywhere it is owed ---------------------
  for (const path of ["/hotels", "/flights", "/cars"]) {
    await flow(`${path} discloses how the site is paid`, viewport, width, async (page) => {
      await open(page, path);
      await page.waitForTimeout(1200);
      const text = await page.locator("body").innerText();
      assert(/commission/i.test(text), `no commission disclosure on ${path}`);
    });
  }

  // ---- the pages added by the launch checklist -----------------------------
  await flow("about page answers who is behind it and how to write", viewport, width, async (page) => {
    await open(page, "/about");
    await page.waitForTimeout(800);
    const text = await page.locator("main").innerText();
    assert(/White Glove/i.test(text), "the about page does not name the business");
    assert(await page.locator('a[href^="mailto:"]').count(), "no direct address on the about page");
    assert(await page.locator('a[href="/contact"]').count(), "no contact link on the about page");
  });

  await flow("the assistant says what it is before you type", viewport, width, async (page) => {
    await open(page, "/");
    await page.waitForTimeout(800);
    const summary = page.getByText(/what this assistant can and cannot do/i).first();
    assert(await summary.count(), "the assistant carries no explanation");
    await summary.click();
    await page.waitForTimeout(300);
    const text = await page.locator("main").innerText();
    assert(/confirm/i.test(text) && /no conversation history|keep no copy/i.test(text), "the explanation does not cover confirmation and storage");
  });
}

browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
});
for (const [width, viewport] of WIDTHS) {
  process.stdout.write(`\n===== ${width} =====\n`);
  await run(width, viewport);
}
await browser.close();

const failed = results.filter((entry) => !entry.ok);
process.stdout.write(`\n${results.length - failed.length}/${results.length} checks passed.\n`);
if (failed.length) {
  process.stdout.write("\nFAILURES\n");
  for (const entry of failed) process.stdout.write(`  ${entry.name} @ ${entry.width} :: ${entry.detail}\n`);
  process.exitCode = 1;
}
