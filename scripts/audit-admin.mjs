// Measure the admin panel at every width, the way audit-ui.mjs measures the
// public site.
//
//   WHITE_GLOVE_SESSION_SECRET=… npm run build && npx next start -p 3230
//   WHITE_GLOVE_SESSION_SECRET=… node scripts/audit-admin.mjs
//
// The public site has been measured at eight widths since the accessibility
// pass. The admin never had been — and it is the part that gets used standing
// in a car park, on a phone, correcting a phone number somebody just gave you.
//
// Signs in by minting the admin cookie directly rather than driving the login
// form: the cookie is an HMAC of "white-glove:admin" under the session secret,
// so this needs the same secret the server is running with and nothing else.

import { createHmac } from "node:crypto";
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


const BASE = process.argv[2] ?? "http://127.0.0.1:3230";
const SECRET =
  process.env.WHITE_GLOVE_SESSION_SECRET || process.env.ADMIN_PASSWORD || "white-glove-development-secret";

const adminCookie = () =>
  createHmac("sha256", SECRET).update("white-glove:admin").digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const WIDTHS = [[320, 568], [375, 667], [390, 844], [768, 1024], [1024, 768], [1280, 720]];
const SCREENS = [
  "/admin",
  "/admin/destinations",
  "/admin/kevarim",
  "/admin/shomrim",
  "/admin/directory",
  "/admin/directory-listings",
  "/admin/content",
  "/admin/pages",
  "/admin/advertisements",
  "/admin/accounts",
  "/admin/team",
  "/admin/hechsherim",
  "/admin/inventory",
  "/admin/finances",
  "/admin/add",
  "/admin/settings",
  "/admin/settings/website",
];

const browser = await launchChromium();
const context = await browser.newContext();
await context.addCookies([
  { name: "white_glove_admin", value: adminCookie(), url: BASE, httpOnly: true, sameSite: "Lax" },
]);

const findings = [];
const note = (screen, width, kind, detail) => findings.push({ screen, width, kind, detail });

for (const path of SCREENS) {
  for (const [width, height] of WIDTHS) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height });
    try {
      const response = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor !== "rgba(0, 0, 0, 0)", null, { timeout: 20000 });
      await page.waitForTimeout(500);

      // Bounced to the login screen means the cookie did not take, and every
      // measurement after it would be of the login page.
      if (page.url().includes("/admin/login") && path !== "/admin/login") {
        note(path, width, "not-signed-in", `landed on ${page.url()} — check WHITE_GLOVE_SESSION_SECRET matches the server`);
        await page.close();
        continue;
      }
      if (response && response.status() >= 500) note(path, width, "error", `HTTP ${response.status()}`);

      // 1. Sideways scrolling, and what is doing it.
      const overflow = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth <= docW + 1) return null;
        const guilty = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const style = getComputedStyle(el);
          if (style.visibility === "hidden" || style.display === "none") continue;
          if (r.right > docW + 1) guilty.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ").slice(0, 2).join(".")} w=${Math.round(r.width)} right=${Math.round(r.right)}`);
        }
        return { docW, scrollW: document.documentElement.scrollWidth, guilty: guilty.slice(0, 3) };
      });
      if (overflow) note(path, width, "overflow", `${overflow.scrollW}>${overflow.docW} :: ${overflow.guilty.join(" | ")}`);

      // 2. Tables. A wide table has to scroll inside its own box, not push the
      // page sideways — otherwise the whole layout moves to read one column.
      const tables = await page.evaluate(() => {
        const out = [];
        for (const table of document.querySelectorAll("table")) {
          const r = table.getBoundingClientRect();
          if (r.width === 0) continue;
          let scroller = null;
          for (let el = table.parentElement; el && el !== document.body; el = el.parentElement) {
            const overflowX = getComputedStyle(el).overflowX;
            if (overflowX === "auto" || overflowX === "scroll") { scroller = el; break; }
          }
          if (!scroller && r.width > document.documentElement.clientWidth) {
            out.push(`${Math.round(r.width)}px table with no scrolling container`);
          }
        }
        return out;
      });
      for (const detail of tables) note(path, width, "table", detail);

      // 3. Touch targets, on the widths where a thumb is doing the pointing.
      if (width <= 430) {
        const small = await page.evaluate(() => {
          const out = [];
          for (const el of document.querySelectorAll("a, button, summary, input[type=checkbox], input[type=radio], select")) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (getComputedStyle(el).visibility === "hidden") continue;
            const cs = getComputedStyle(el);
            // An inline link is a link inside a sentence, wherever the
            // sentence lives. Enlarging one breaks the line it sits in, which
            // is why the target-size rule exempts them.
            if (cs.display === "inline") continue;
            // A checkbox or radio is meant to be small. What has to be 44px is
            // the label you actually tap, so measure that instead.
            if (el.type === "checkbox" || el.type === "radio") {
              const label = el.closest("label");
              if (label && label.getBoundingClientRect().height >= 44) continue;
            }
            if (r.height < 44) {
              const text = (el.textContent || el.getAttribute("aria-label") || el.name || el.tagName).trim().slice(0, 26);
              if (text) out.push(`${Math.round(r.height)}px "${text}"`);
            }
          }
          return [...new Set(out)];
        });
        if (small.length) note(path, width, "touch-target", `${small.length} under 44px :: ${small.slice(0, 6).join(" | ")}`);
      }

      // 4. Form controls with no accessible name.
      if (width === 390) {
        const unnamed = await page.evaluate(() =>
          [...document.querySelectorAll("input, select, textarea")].filter((el) => {
            if (el.type === "hidden") return false;
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) return false;
            return !(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title") ||
              (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.closest("label"));
          }).map((el) => `${el.tagName.toLowerCase()}[${el.type || "-"}] name=${el.name || "-"}`),
        );
        if (unnamed.length) note(path, "any", "unlabeled-input", `${unnamed.length} :: ${[...new Set(unnamed)].slice(0, 5).join(" | ")}`);
      }
    } catch (error) {
      note(path, width, "error", String(error).split("\n")[0].slice(0, 120));
    }
    await page.close();
  }
}
await browser.close();

const byKind = {};
for (const f of findings) (byKind[f.kind] ||= []).push(f);
for (const kind of Object.keys(byKind).sort()) {
  console.log(`\n===== ${kind.toUpperCase()} (${byKind[kind].length}) =====`);
  const seen = new Set();
  for (const f of byKind[kind]) {
    const key = `${f.screen}|${f.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const widths = byKind[kind].filter((o) => o.screen === f.screen && o.detail === f.detail).map((o) => o.width).join(",");
    console.log(`${f.screen} @ ${widths}\n    ${f.detail}`);
  }
}
console.log(`\nTOTAL ${findings.length}`);
process.exit(findings.length ? 1 : 0);
