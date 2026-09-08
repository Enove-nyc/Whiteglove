// Pressing the buttons that WRITE, and checking the row afterwards.
//
// `admin-crawl.mjs` deliberately never presses Save, Delete, Approve, Publish
// or Upload, so for a long time nothing had ever driven a change all the way
// through — UI, action, API, database, reload, public page. That gap is what
// hid a quick-edit panel that deleted a listing's phone number every time
// somebody corrected its spelling: every test in this repository passed, and
// the phone number was gone from the live page.
//
// Each check here does the whole round trip and reports what it saw. It writes
// to whatever database DATABASE_URL points at, so it is for the local rig and
// nowhere else — one of the checks deletes a listing on purpose.
//
//   node scripts/local-audit/write-paths.mjs http://127.0.0.1:3002
//
// Needs bootstrap-auth.mjs to have run first (auth-state.json is the owner).
import { chromium } from "playwright";
import { deflateSync, crc32 } from "node:zlib";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APP = process.argv[2] ?? "http://127.0.0.1:3002";
const STATE = new URL("./auth-state.json", import.meta.url).pathname;
const EXE =
  process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

/**
 * A 64x64 PNG, made here rather than committed.
 *
 * `.gitignore` in this directory drops `*.png` — the crawls write screenshots
 * beside themselves — so a checked-in fixture would silently never arrive and
 * the picture check would fail for the next person with a missing-file error
 * about a file they could see in the repository.
 */
function pictureToUpload() {
  const w = 64;
  const rows = [];
  for (let y = 0; y < w; y++) {
    const row = Buffer.alloc(1 + w * 3);
    for (let x = 0; x < w; x++) row.set([(x * 4) % 256, 80, 140], 1 + x * 3);
    rows.push(row);
  }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(w, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  const path = join(mkdtempSync(join(tmpdir(), "wg-audit-")), "picture.png");
  writeFileSync(path, png);
  return path;
}

const results = [];
const note = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/**
 * One check, and the run carries on whatever it does.
 *
 * A harness that stops at the first failure tells you about one broken write
 * path and hides the other twelve — which is the shape of problem this whole
 * file exists to answer. A step that throws (a control that is not there any
 * more, a dialog that never opens) is a failure of that step and nothing else.
 */
async function check(name, fn) {
  try {
    const [ok, detail] = await fn();
    note(name, ok, detail);
  } catch (err) {
    note(name, false, `threw: ${String(err).split("\n")[0].slice(0, 120)}`);
  }
}

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: STATE });
// The site notice is a full-screen popup over every page and would swallow the
// first click of every check. Seeding its two keys is what pressing its button
// does; it is not a way around the notice, it is the notice already dismissed.
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("whiteGloveBetaNotice", "999");
    localStorage.setItem("whiteGloveBetaNoticeShown", "999");
  } catch {}
});
const page = await ctx.newPage();
const go = (path) => page.goto(APP + path, { waitUntil: "domcontentloaded" }).then(() => page.waitForTimeout(1800));
const text = () => page.locator("main").innerText();
const stamp = `WGAUDIT-${Date.now().toString(36)}`;

try {
  // ── A listing's everyday fields, from the panel View opens ──────────────
  //
  // Checked in two directions: the correction has to stick, and NOTHING ELSE
  // may change. The second half is the one that was broken — the panel wrote
  // back three fields it had never read.
  await go("/admin/directory/food");
  const row = page.locator("li").filter({ hasText: "added here" }).first();
  const before = (await row.innerText()).split("\n")[0].trim();

  // BY THE STATUS CODE, and NOT off the click. Next routes a Link inside the
  // browser, so pressing it produces no document response to read a status
  // from, and it renders the not-found page with the site's own chrome and no
  // number anywhere on it — reading the words passed a dead link, which is how
  // eleven of these went unnoticed. So: press it, to prove the button goes
  // where it says, then ask the server what that address actually answers.
  await check("a listing's Public page button lands on a real page", async () => {
    const link = row.getByRole("link", { name: "Public page" }).first();
    const href = await link.getAttribute("href");
    await link.click();
    await page.waitForTimeout(2000);
    const status = (await page.request.get(new URL(href, APP).toString())).status();
    return [status === 200, `${href} → ${status}`];
  });

  // BOTH FILTERS, ALWAYS. The same name can appear twice on this screen — once
  // from data/kosher-eateries.ts, which has no row to save to, and once from
  // the database. Matching on the name alone finds the read-only one first.
  const dbRow = (name) => page.locator("li").filter({ hasText: name }).filter({ hasText: "added here" }).first();

  const panel = page.locator("[role=dialog]").first();
  const boxes = () => panel.locator("input, textarea");
  const openPanel = async (name) => {
    await go("/admin/directory/food");
    await dbRow(name).getByRole("button", { name: "View", exact: true }).click();
    await panel.waitFor({ state: "visible" });
  };
  const readPanel = async () => ({
    name: await boxes().nth(0).inputValue(),
    phone: await boxes().nth(3).inputValue(),
    website: await boxes().nth(4).inputValue(),
    description: await boxes().nth(5).inputValue(),
  });
  const savePanel = async () => {
    await panel.getByRole("button", { name: /save/i }).first().click();
    await page.waitForTimeout(2500);
  };

  // GIVE IT SOMETHING TO LOSE FIRST. Whether a seeded row happens to carry a
  // phone number is not something this check should depend on — the bug it
  // exists for only shows on a row that HAS one, so it puts one there itself.
  const planted = { phone: "+000 000 0000", website: "https://example.com/audit", description: `${stamp} notes` };
  await check("what the panel saves is what it shows again", async () => {
    await openPanel(before);
    await boxes().nth(3).fill(planted.phone);
    await boxes().nth(4).fill(planted.website);
    await boxes().nth(5).fill(planted.description);
    await savePanel();
    await openPanel(before);
    const stored = await readPanel();
    const wrong = ["phone", "website", "description"].filter((k) => stored[k] !== planted[k]);
    return [wrong.length === 0, wrong.length ? `came back empty or changed: ${wrong.join(", ")}` : ""];
  });

  // Now the correction the bug was about: one field changed, six left alone.
  await check("the correction survives a reload", async () => {
    await openPanel(before);
    await boxes().nth(0).fill(`${before} ${stamp}`);
    await savePanel();
    await go("/admin/directory/food");
    return [(await dbRow(stamp).count()) === 1];
  });

  await check("saving a correction keeps every other field", async () => {
    await openPanel(stamp);
    const now = await readPanel();
    const lost = ["phone", "website", "description"].filter((k) => planted[k] && now[k] !== planted[k]);
    await panel.getByRole("button", { name: /close|cancel/i }).first().click().catch(() => {});
    return [lost.length === 0, lost.length ? `lost: ${lost.join(", ")}` : ""];
  });

  // ── A visitor's submission, accepted ────────────────────────────────────
  await go("/submit");
  const f = page.locator("main input, main textarea, main select");
  await f.nth(1).fill(`${stamp} Bakery`);
  await f.nth(2).fill("Audit Visitor");
  await f.nth(3).fill("visitor@audit.local");
  await f.nth(4).fill("Sent in by the write-path check.");
  await page.getByRole("button", { name: /send it in/i }).click();
  await page.waitForTimeout(3000);

  await check("a submission reaches the admin", async () => {
    await go("/admin/content?tab=suggestions");
    return [(await text()).includes(stamp)];
  });

  await check("accepting moves it out of Waiting and into Accepted", async () => {
    await page.getByText(`${stamp} Bakery`).first().click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /^accept$/i }).click();
    await page.waitForTimeout(3000);
    await go("/admin/content?tab=suggestions");
    const stillWaiting = (await text()).includes(stamp);
    await page.getByRole("button", { name: /^accepted$/i }).click().catch(() => {});
    await page.waitForTimeout(1500);
    const inAccepted = (await text()).includes(stamp);
    return [!stillWaiting && inAccepted, stillWaiting ? "still in Waiting" : inAccepted ? "" : "not in Accepted either"];
  });

  // ── Delete, and put it back ─────────────────────────────────────────────
  page.on("dialog", (d) => d.accept());

  // NOTHING OUTSIDE A check() FROM HERE ON. This lookup used to sit in the
  // open, so when an earlier check failed and the rename never happened, it
  // threw and took the remaining eight checks down with it — the run reported
  // two problems and hid the rest, which is the failure mode this file exists
  // to avoid.
  let editor = "";
  await check("the edited listing can be opened in its own editor", async () => {
    await go("/admin/directory/food");
    const href = await dbRow(stamp).getByRole("link", { name: "Edit" }).first().getAttribute("href");
    editor = (href ?? "").replace(APP, "");
    return [Boolean(editor), editor];
  });

  await check("deleting a listing takes it off the editor", async () => {
    if (!editor) return [false, "no editor to open"];
    await go(editor);
    await page.locator("li button", { hasText: stamp }).first().click();
    await page.waitForTimeout(1500);
    await page.locator("main button").filter({ hasText: /^\s*(delete|remove)/i }).first().click();
    await page.waitForTimeout(3000);
    return [!(await text()).includes(stamp)];
  });

  await check("a deleted listing is in Deleted, not gone", async () => {
    await go("/admin/recycle");
    return [(await text()).includes(stamp)];
  });

  await check("Put it back restores it", async () => {
    if (!editor) return [false, "no editor to open"];
    await page.getByRole("button", { name: /put it back/i }).first().click();
    await page.waitForTimeout(3000);
    await go(editor);
    return [(await text()).includes(stamp)];
  });

  // ── A picture, and the credit that gates it ─────────────────────────────
  //
  // BY ITS CREDIT BOX, not by a photoId. A picture only gains a photoId once
  // it has been saved, so a just-uploaded one is invisible to that selector —
  // and the destination this runs against may or may not already have a saved
  // picture, so the two cases have to look the same.
  const photoForm = () => page.locator('main form:has(input[name="credit"])').first();
  const savePhoto = async () => {
    await photoForm().locator("button", { hasText: /^save$/i }).first().click();
    await page.waitForTimeout(3000);
    await go(editor);
  };

  await check("a picture with no credit is held back as a draft", async () => {
    if (!editor) return [false, "no editor to open"];
    await go(editor);
    await page.locator('input[type=file][accept*="image"]').first().setInputFiles(pictureToUpload());
    await page.waitForTimeout(4000);
    await photoForm().locator('input[name="caption"]').fill(`${stamp} picture`);
    await photoForm().locator('select[name="status"]').selectOption("PUBLISHED");
    await savePhoto();
    const status = await photoForm().locator('select[name="status"]').inputValue();
    return [status === "DRAFT", status === "DRAFT" ? "" : `published with no credit (${status})`];
  });

  await check("with a credit it publishes", async () => {
    await photoForm().locator('input[name="credit"]').fill("Audit");
    await photoForm().locator('select[name="status"]').selectOption("PUBLISHED");
    await savePhoto();
    return [(await photoForm().locator('select[name="status"]').inputValue()) === "PUBLISHED"];
  });

  // ── An advertisement, placed and taken down ─────────────────────────────
  await go("/admin/advertisements");
  await page.getByRole("button", { name: /create an advertisement/i }).click();
  await page.waitForTimeout(1200);
  await page.getByText("Banner", { exact: true }).first().click();
  const next = async () => {
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.waitForTimeout(1200);
  };
  await next();
  const byLabel = async (re, value) => {
    for (const el of await page.locator("main input:not([type=file]), main textarea").all()) {
      const lab = await el.evaluate((e) => {
        const l = (e.id && document.querySelector(`label[for="${CSS.escape(e.id)}"]`)) || e.closest("label");
        return (l?.textContent || e.placeholder || "").trim();
      });
      if (re.test(lab)) return el.fill(value);
    }
  };
  await byLabel(/company or person/i, "Audit Advertiser");
  await byLabel(/headline/i, `${stamp} banner`);
  await byLabel(/button goes to/i, "https://example.com/audit");
  await next();
  await page.getByText("Across the top of every page", { exact: false }).first().click();
  await next();
  await next();
  await check("publishing shows the advertisement without a reload", async () => {
    await page.getByRole("button", { name: /publish it/i }).click();
    await page.waitForTimeout(3500);
    // The screen said "Published — it is live now" and "No advertisements yet"
    // at the same time, so the message is not the thing to look at.
    return [(await text()).includes(stamp)];
  });

  await check("the banner is on the public site", async () => {
    await go("/");
    return [(await page.locator("body").innerText()).includes(stamp)];
  });

  await check("deleting takes it off the screen without a reload", async () => {
    await go("/admin/advertisements");
    await page.getByRole("button", { name: /^delete$/i }).first().click();
    await page.waitForTimeout(1000);
    await page.locator("main button").filter({ hasText: /yes/i }).first().click();
    await page.waitForTimeout(3500);
    return [!(await text()).includes(stamp)];
  });
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} write paths behaved.`);
process.exit(failed.length ? 1 : 0);
