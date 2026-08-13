/**
 * Fetch Consistoire + unused dirs. Keep 1+ named+street rows. 15s. No WP loops.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const STREET =
  /\d{1,5},?\s+\S.{1,80}(?:blvd|boulevard|ave|avenue|st\.?|street|rd\.?|road|dr\.?|drive|way|rue|place|pl\.?|lane|close|strasse|gasse|calle|carrer|via|straat)/i;
const BAD_NAME =
  /^(address|phone|hours|tel|fax|website|email|map|home|menu|restaurants|establishments|directory|contact|about|kosher|commerces|copyright|compliance|screen-reader|keyboard|shaila|maaser|zemanim|toute la france)/i;
const JUNK = /copyright|compliance status|screen-reader|keyboard navigation|shailatext|maasertext|zemanim|wcag|{{reg/i;

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function blocked(html, url) {
  return /techloq|Just a moment|cf-mitigated|filter\.techloq|_Incapsula_Resource/i.test(
    `${url || ""}\n${(html || "").slice(0, 2500)}`,
  );
}

async function get(url) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html" },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    const text = await r.text();
    if (blocked(text, r.url)) {
      console.log("[skip-blocked]", url);
      return null;
    }
    if (!text || text.length < 1500) {
      console.log("[skip-stub]", r.status, text.length, r.url);
      return null;
    }
    console.log("[get]", r.status, text.length, r.url);
    return { url: r.url, text };
  } catch (e) {
    console.log("[fail]", url, String(e.message || e).slice(0, 80));
    return null;
  }
}

function categoryFrom(name) {
  const t = (name || "").toLowerCase();
  if (/boucher|butcher|meat/.test(t) && !/restaurant/.test(t)) return "Butcher";
  if (/boulang|patiss|baker/.test(t)) return "Bakery";
  if (/market|grocery|supermar|epicerie/.test(t)) return "Grocery";
  if (/cafe|pizza|dairy/.test(t)) return "Cafe";
  if (/traiteur|cater|take/.test(t)) return "Takeaway";
  return "Restaurant";
}

function makeRow(sourceKey, agency, listingUrl, name, address, locality, country) {
  const cleanName = decode(name);
  const cleanAddress = decode(address).replace(/^(address)\s*:?\s*/i, "");
  if (!cleanName || cleanName.length < 2 || cleanName.length > 70) return null;
  if (BAD_NAME.test(cleanName) || JUNK.test(cleanName) || JUNK.test(cleanAddress)) return null;
  if (/^(chabad|synagogue|shul)\b/i.test(cleanName) && !/kitchen|restaurant|food|dining|bakery|grocery|cafe/i.test(cleanName)) return null;
  if (cleanAddress.length > 120) return null;
  if (!STREET.test(cleanAddress)) return null;
  const category = categoryFrom(cleanName);
  return {
    sourceKey,
    name: cleanName,
    address: cleanAddress,
    locality,
    destination: locality,
    country,
    category,
    listingUrl,
    website: null,
    type: category,
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by ${agency}. Confirm current supervision on the cited page before relying on it.`,
  };
}

function parseHtml(html, sourceKey, agency, listingUrl, locality, country) {
  const lines = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<(h[1-6])[^>]*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|td|article|strong|h3)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const rows = [];
  const seen = new Set();
  let pending = "";
  for (const line of lines) {
    if (/^(address|phone|hours|website|tel)\s*:?\s*$/i.test(line) || JUNK.test(line)) {
      if (!STREET.test(line)) pending = pending && !JUNK.test(pending) ? pending : "";
      continue;
    }
    if (STREET.test(line) && pending && !BAD_NAME.test(pending) && !JUNK.test(pending)) {
      const row = makeRow(sourceKey, agency, listingUrl, pending, line, locality, country);
      if (row) {
        const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          rows.push(row);
        }
      }
      pending = "";
      continue;
    }
    if (STREET.test(line) || BAD_NAME.test(line) || JUNK.test(line)) continue;
    if (line.length >= 2 && line.length <= 70) pending = line;
  }
  return rows;
}

function restaurantLink(html, base) {
  const hrefs = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    if (!/restaurant|establishment|eating|dining|directory|licensed|commerces|kashrus|casher/i.test(href)) continue;
    if (/wp-json|wp-admin|page=|\.css|\.js/i.test(href)) continue;
    try {
      const abs = new URL(href, base).href;
      if (abs.split("?")[0] === base.split("?")[0]) continue;
      return abs;
    } catch {
      continue;
    }
  }
  return null;
}

const targets = [
  ["https://www.sandiegovaad.org/", "sd-vaad", "Vaad HaRabbonim of San Diego", "San Diego", "United States"],
  ["https://www.irgzuerich.ch/", "irg-zurich", "IRG Zurich", "Zurich", "Switzerland"],
  ["https://www.nihs.nl/", "nihs-amsterdam", "NIHS Amsterdam", "Amsterdam", "Netherlands"],
  ["https://www.cjm.org.mx/", "cjm-mexico", "Comunidad Judía de México", "Mexico City", "Mexico"],
  ["https://chabadprague.cz/en/food/", "chabad-food-europe", "Chabad Prague", "Prague", "Czechia"],
  ["https://www.chabadberlin.de/en/food/", "chabad-food-europe", "Chabad Berlin", "Berlin", "Germany"],
  ["https://jewishrome.com/en/food/", "chabad-food-europe", "Chabad Rome", "Rome", "Italy"],
  ["https://chabadbarcelona.org/en/food/", "chabad-food-europe", "Chabad Barcelona", "Barcelona", "Spain"],
];

const harvested = JSON.parse(fs.readFileSync(OUT, "utf8")).filter(
  (row) => !JUNK.test(row.name || "") && !JUNK.test(row.address || "") && (row.address || "").length <= 120,
);
const have = new Set(harvested.map((row) => `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`));
let added = 0;
const sourcesUsed = [];
const kept = [];

for (const [url, sourceKey, agency, locality, country] of targets) {
  const page = await get(url);
  if (!page?.text) continue;
  let rows = parseHtml(page.text, sourceKey, agency, page.url, locality, country);
  let usedUrl = page.url;
  console.log("[parsed]", rows.length, page.url, rows.slice(0, 3).map((r) => `${r.name} | ${r.address}`));
  if (rows.length < 1) {
    const next = restaurantLink(page.text, page.url);
    if (next) {
      const extra = await get(next);
      if (extra?.text) {
        rows = parseHtml(extra.text, sourceKey, agency, extra.url, locality, country);
        usedUrl = extra.url;
        console.log("[parsed-link]", rows.length, extra.url, rows.slice(0, 3).map((r) => `${r.name} | ${r.address}`));
      }
    }
  }
  if (rows.length < 1) continue;
  let n = 0;
  for (const row of rows) {
    const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}::${row.locality}`;
    if (have.has(key)) continue;
    have.add(key);
    harvested.push(row);
    added += 1;
    n += 1;
  }
  if (n) {
    sourcesUsed.push(usedUrl);
    kept.push({ url: usedUrl, n });
  }
}

fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
console.log(JSON.stringify({ sourcesUsed, added, total: harvested.length, kept }, null, 2));
