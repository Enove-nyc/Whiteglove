/**
 * Build data/hechsherim-kosherquest.ts from kosherquest.org's own symbols page.
 *
 * WHAT THIS IS. The Kosher Information Bureau (Rabbi Eliezer Eidlitz) publishes
 * a list of kosher certification symbols at
 * https://kosherquest.org/kosher-symbols/ — 306 agencies, each with a name, a
 * region and a picture of its mark. The page ships its own data as a JSON blob
 * (`CERTS`) inside the HTML, so this reads that rather than scraping cards.
 *
 * WHAT IT DELIBERATELY DOES NOT CARRY. The source page says nothing about which
 * hechsherim to rely on, and neither does this. Names, regions, marks and
 * addresses only. A certifier's own contact block (postal address, telephone,
 * the rabbi's name) is kept in scripts/kosherquest-symbols.json rather than in
 * the public data file, because nothing on the site renders it.
 *
 *   node scripts/import-kosherquest-hechsherim.mjs           (refetch and build)
 *   node scripts/import-kosherquest-hechsherim.mjs --offline (rebuild from the
 *                                                             saved snapshot)
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SOURCE_URL = "https://kosherquest.org/kosher-symbols/";
const SNAPSHOT = join("scripts", "kosherquest-symbols.json");
const IMAGE_DIR = join("public", "hechsherim");
const OUT = join("data", "hechsherim-kosherquest.ts");

const offline = process.argv.includes("--offline");

// ---------------------------------------------------------------- fetching

async function fetchSymbolsPage() {
  const res = await fetch(SOURCE_URL, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; WhiteGloveKosherTravel/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`kosherquest.org returned ${res.status}`);
  return res.text();
}

/** The page ships `const CERTS = {…}` inline. Pull it out by brace matching. */
function extractCerts(html) {
  const start = html.indexOf("CERTS");
  if (start < 0) throw new Error("no CERTS object on the page — the source changed shape");
  const open = html.indexOf("{", html.indexOf("=", start));
  let depth = 0;
  let quote = null;
  for (let i = open; i < html.length; i += 1) {
    const ch = html[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth += 1;
    else if (ch === "}" && --depth === 0) return JSON.parse(html.slice(open, i + 1));
  }
  throw new Error("CERTS object never closed");
}

/**
 * The cards on the page carry the region a certifier is filed under, and
 * whether that region is a US state or a country. A handful of CERTS entries
 * have an empty region of their own, so the card is what fills it in.
 */
function regionsFromCards(html) {
  const found = new Map();
  for (const match of html.matchAll(/<div class="sym-card"([\s\S]*?)<\/div>\s*<\/div>/g)) {
    const id = /openModal\((\d+)\)/.exec(match[1])?.[1];
    if (!id) continue;
    found.set(id, {
      region: /data-region="([^"]*)"/.exec(match[1])?.[1] ?? "",
      rtype: /data-rtype="([^"]*)"/.exec(match[1])?.[1] ?? "",
    });
  }
  return found;
}

// ---------------------------------------------------------------- cleaning

const decode = (value) =>
  String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;|&rsquo;|\u2019/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .trim();

const oneLine = (value) => decode(value).replace(/\s+/g, " ").trim();

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");

const SKIP_WORDS = new Set(["of", "the", "and", "for", "de", "a", "at", "in", "&"]);

/**
 * The letters drawn in the circle when the mark image is missing.
 *
 * The site's own list writes an agency's own short form — OU, ★K, בד״ץ. That is
 * not something the source page gives, so a long name falls back to its
 * initials. Anything already short enough to be a mark is left alone.
 */
function markFor(name) {
  const cleaned = name.replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length <= 6) return cleaned;
  const words = cleaned.split(/[\s/]+/).filter((word) => word && !SKIP_WORDS.has(word.toLowerCase()));
  const initials = words
    .map((word) => word[0])
    .join("")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .slice(0, 4)
    .toUpperCase();
  return initials || cleaned.slice(0, 4);
}

const titleCase = (value) =>
  value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase()).replace(/\bDc\b/, "DC");

/**
 * Regions as the source groups them, with one gap closed: its US agencies are
 * filed under "national", which reads as a region only underneath the "United
 * States" heading it sits below on that page. This site's page has no such
 * heading, so it is spelled out.
 */
function regionFor(cert) {
  const value = oneLine(cert.region) || titleCase(oneLine(cert.cardRegion));
  if (/^national$/i.test(value)) return cert.rtype === "International" ? "International" : "United States — national";
  return value;
}

/** A website only where the source states one, and only as a bare origin. */
function websiteFrom(cert) {
  const explicit = oneLine(cert.web);
  const text = decode(cert.desc);
  const labelled = /(?:web|website|url)\s*:\s*(?:https?:\/\/)?([a-z0-9][a-z0-9.-]*\.[a-z]{2,})/i.exec(text)?.[1];
  const bare = /\b(www\.[a-z0-9-]+(?:\.[a-z0-9-]+)+)/i.exec(text)?.[1];
  const raw = explicit || labelled || bare || "";
  if (!raw) return "";
  const host = raw
    .replace(/^https?:\/\//i, "")
    .split(/[/?#]/)[0]
    .replace(/[.,;)]+$/, "");
  // The site's own rule: an address it publishes is a bare https origin, or it
  // is not published at all.
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(host) ? `https://${host}` : "";
}

// ------------------------------------------------- what already ships here

/**
 * Certifiers kosherquest.org lists that this site already knows by name.
 *
 * Written out by hand rather than matched by string similarity: deciding that
 * two names are one certifying body is a kashrus judgement, and a fuzzy match
 * that gets it wrong merges two agencies that are not the same. Each of these
 * was read off the source page and matched to the entry in data/hechsherim.ts.
 * They get the mark image and nothing else — their name, region and website
 * stay as the site already had them.
 */
const ALREADY_LISTED = {
  1: "ou",
  119: "ou",
  176: "ou",
  2: "ok",
  118: "ok",
  3: "kof-k",
  98: "kof-k",
  5: "crc",
  65: "crc",
  14: "star-k",
  15: "kedassia",
  13: "kf",
  37: "scroll-k",
  93: "ksa",
  74: "rcc",
  143: "dallas-kosher",
  7: "kehillah-la",
  61: "kehillah-la",
  94: "kehillah-la",
  12: "kvh",
  73: "akc",
  20: "vaad-hoeir",
  300: "vaad-hoeir",
  51: "orb-kosher",
  52: "kosher-miami",
  173: "kosher-miami",
  150: "klbd",
  186: "klbd",
  151: "mbd",
  199: "mbd",
  155: "badatz-agudas",
  156: "rav-rubin",
  157: "badatz-eda",
  158: "badatz-belz",
  159: "chug-chasam-sofer",
  160: "rav-landau",
  164: "sheiris",
  192: "badatz-beit-yosef",
  167: "cor",
  202: "cor",
  203: "keystone-k",
  100: "earth-kosher",
  183: "earth-kosher",
  208: "kosher-australia",
  319: "ka-nsw",
  210: "beth-din-johannesburg",
  294: "machsike-hadass-antwerp",
};

/**
 * Entries the source itself cannot be read for.
 *
 * 177 is its own second card for Half Moon-K (95), filed under a region of
 * "OU+" — not a place, and no use as a heading on a page that groups by one.
 */
const UNUSABLE = { 177: "duplicate card for Half Moon K, filed under a region of “OU+”" };

// ---------------------------------------------------------------- pictures

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp"]);

/** The mark is drawn in a circle 36 pixels across; this is that at 2x, twice. */
const MARK_PIXELS = 128;

const sharp = await import("sharp").then((m) => m.default).catch(() => null);

/**
 * Fetch one mark, shrink it, and write it under public/hechsherim.
 *
 * SHRINKING IS THE POINT. These are drawn in a circle a few dozen pixels
 * across, and the source serves some of them as megabyte photographs. Left
 * alone, the page that shows every agency at once would have carried fifteen
 * megabytes of picture. They are re-encoded to one small WebP each.
 *
 * Anything that is not actually a picture is refused rather than written: some
 * of the source's marks are PDFs, and an <img> pointed at a PDF is a broken
 * image in a circle on a kashrus page.
 */
async function downloadLogo(url, id) {
  const file = `${id}.webp`;
  const target = join(IMAGE_DIR, file);
  if (existsSync(target) && !process.argv.includes("--refetch")) {
    return { ok: true, path: `/hechsherim/${file}`, cached: true };
  }
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; WhiteGloveKosherTravel/1.0)" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}` };
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!IMAGE_TYPES.has(type)) return { ok: false, why: `not an image (${type || "no content-type"})` };
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length < 64) return { ok: false, why: "empty file" };
    if (!sharp) return { ok: false, why: "sharp is not installed, so the picture could not be resized" };
    const resized = await sharp(bytes)
      .resize({ width: MARK_PIXELS, height: MARK_PIXELS, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    writeFileSync(target, resized);
    return { ok: true, path: `/hechsherim/${file}`, bytes: resized.length };
  } catch (error) {
    return { ok: false, why: error?.name === "TimeoutError" ? "timed out" : String(error?.message ?? error) };
  }
}

/**
 * Does the address the source printed still lead anywhere?
 *
 * A refusal is not an absence. Plenty of these sites answer a script with 403
 * while serving a person perfectly well, so the question asked here is only
 * whether something is still on the other end of the name — a connection that
 * cannot be made at all, or a plain "no such page", is what disqualifies an
 * address. This is the site's rule about publishing no address it is unsure of,
 * applied as far as a fetch can honestly take it.
 */
async function websiteAnswers(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        headers: { "user-agent": "Mozilla/5.0 (compatible; WhiteGloveKosherTravel/1.0)" },
        signal: AbortSignal.timeout(12000),
      });
      if (res.status === 404 || res.status === 410) return false;
      if (res.status === 405 || res.status === 501) continue;
      return true;
    } catch {
      if (method === "GET") return false;
    }
  }
  return false;
}

// ------------------------------------------------------------------- build

async function main() {
  let certs;
  if (offline && existsSync(SNAPSHOT)) {
    certs = JSON.parse(readFileSync(SNAPSHOT, "utf8")).agencies;
  } else {
    const html = await fetchSymbolsPage();
    certs = extractCerts(html);
    const cards = regionsFromCards(html);
    for (const [id, cert] of Object.entries(certs)) {
      cert.cardRegion = cards.get(id)?.region ?? "";
      cert.rtype = cards.get(id)?.rtype ?? "";
    }
    mkdirSync("scripts", { recursive: true });
    writeFileSync(
      SNAPSHOT,
      `${JSON.stringify({ source: SOURCE_URL, fetchedAt: new Date().toISOString(), agencies: certs }, null, 2)}\n`,
    );
  }

  mkdirSync(IMAGE_DIR, { recursive: true });

  const existingIds = new Set(
    [...readFileSync(join("data", "hechsherim.ts"), "utf8").matchAll(/^\s*\{?\s*id: "([^"]+)"/gm)].map((m) => m[1]),
  );

  const notes = { unnamed: [], unusable: [], duplicates: [], noLogo: [], deadSite: [] };
  const overlays = new Map(); // built-in id -> logo path
  const rows = [];
  const seen = new Map(); // name|region -> id already taken
  const usedIds = new Set(existingIds);
  const usedAliases = new Set();

  for (const [kqId, cert] of Object.entries(certs)) {
    const name = oneLine(cert.name);
    if (!name) {
      notes.unnamed.push(kqId);
      continue;
    }
    if (UNUSABLE[kqId]) {
      notes.unusable.push(`${name} — ${UNUSABLE[kqId]}`);
      continue;
    }
    const logoUrl = oneLine(cert.logo);

    // Already on the site's list: take the mark image, leave the entry alone.
    const builtIn = ALREADY_LISTED[kqId];
    if (builtIn) {
      if (logoUrl && !overlays.has(builtIn)) {
        const got = await downloadLogo(logoUrl, builtIn);
        if (got.ok) overlays.set(builtIn, got.path);
        else notes.noLogo.push(`${name} (already listed as ${builtIn}) — ${got.why}`);
      }
      continue;
    }

    // Some of the source's entries are filed under the mark alone. The site's
    // list keeps the two apart — name is the certifying body, mark is the short
    // form written on a package — and a fuller name is not something to invent
    // for a hechsher. Checked after the entries the site already has, most of
    // which are exactly these: an "OU" card is the Orthodox Union either way.
    if (name.length < 3) {
      notes.unusable.push(`${name} — the source gives the mark and no name to go with it`);
      continue;
    }

    const region = regionFor(cert);
    if (region.length < 3) {
      notes.unusable.push(`${name} — the source files it under no region`);
      continue;
    }

    // The source lists some certifiers twice, on two cards.
    const key = `${name.toLowerCase()}|${region.toLowerCase()}`;
    if (seen.has(key)) {
      notes.duplicates.push(`${name} (${region})`);
      continue;
    }

    let id = slugify(name) || slugify(`${name} ${region}`);
    if (!id) {
      notes.unnamed.push(kqId);
      continue;
    }
    if (usedIds.has(id)) id = slugify(`${id}-${region}`);
    let attempt = 2;
    while (usedIds.has(id)) id = slugify(`${slugify(name)}-${attempt++}`);
    usedIds.add(id);
    seen.set(key, id);

    // One alias, the agency's own name. A single word is qualified with its
    // region first: matchHechsher matches any alias over three characters that
    // appears anywhere in a piece of free text, so a bare "chabad" would put a
    // hechsher on every listing that happens to mention one.
    let alias = name.toLowerCase();
    if (!/\s/.test(alias) || usedAliases.has(alias)) alias = `${name} ${region}`.toLowerCase();
    usedAliases.add(alias);

    let logo = "";
    if (logoUrl) {
      const got = await downloadLogo(logoUrl, id);
      if (got.ok) logo = got.path;
      else notes.noLogo.push(`${name} (${region}) — ${got.why}`);
    } else {
      notes.noLogo.push(`${name} (${region}) — the source has no picture for it`);
    }

    let website = websiteFrom(cert);
    if (website && !(await websiteAnswers(website))) {
      notes.deadSite.push(`${name} — ${website}`);
      website = "";
    }

    rows.push({ id, name, mark: markFor(name), region, alias, logo, website });
  }

  rows.sort((a, b) => a.region.localeCompare(b.region, "en") || a.name.localeCompare(b.name, "en"));

  const escape = (value) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const body = rows
    .map((row) => {
      const parts = [
        `    id: "${escape(row.id)}"`,
        `    name: "${escape(row.name)}"`,
        `    mark: "${escape(row.mark)}"`,
        `    region: "${escape(row.region)}"`,
        `    aliases: ["${escape(row.alias)}"]`,
      ];
      if (row.logo) parts.push(`    logo: "${row.logo}"`);
      if (row.website) parts.push(`    website: "${escape(row.website)}"`);
      parts.push(`    sourceUrl: "${SOURCE_URL}"`);
      return `  {\n${parts.join(",\n")},\n  },`;
    })
    .join("\n");

  const file = `// Certifying bodies listed by the Kosher Information Bureau.
//
// WHERE THIS CAME FROM. Every entry below is read off Rabbi Eliezer Eidlitz's
// list of kosher certification symbols at ${SOURCE_URL},
// and each one carries that address in its own sourceUrl. Nothing here is
// remembered, inferred or filled in from anywhere else.
//
// WHAT IT SAYS, AND WHAT IT DOES NOT. The same line data/hechsherim.ts draws in
// its opening paragraph holds here: this says who exists. It does not say who
// certifies what, it does not rank one body against another, and where the
// source page's own wording amounts to a judgement about a hechsher, that
// wording is not carried across. Which hechsherim to rely on is a question for
// somebody's rov.
//
// THE MARKS are the pictures the source publishes, saved under
// public/hechsherim/<id> so the site serves its own copies. An agency whose
// picture could not be fetched, or was not a picture at all, has none — the
// circle falls back to letters rather than showing a broken image.
//
// REBUILDING: node scripts/import-kosherquest-hechsherim.mjs

import type { Hechsher } from "@/data/hechsherim";

export const kosherQuestHechsherim: Hechsher[] = [
${body}
];
`;

  writeFileSync(OUT, file);

  const overlayLines = [...overlays].map(([id, path]) => `${id} -> ${path}`);
  console.log(`agencies on the source page: ${Object.keys(certs).length}`);
  console.log(`new entries written:         ${rows.length}`);
  console.log(`marks attached to existing:  ${overlays.size}`);
  console.log(`\n--- overlays for data/hechsherim.ts ---\n${overlayLines.join("\n")}`);
  for (const [label, list] of Object.entries(notes)) {
    console.log(`\n--- ${label} (${list.length}) ---`);
    for (const line of list) console.log(`  ${line}`);
  }
}

await main();
