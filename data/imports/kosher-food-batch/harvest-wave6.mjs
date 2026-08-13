/**
 * Try unused official directories until one parses >=3 named places with streets.
 * 15s timeout. Skip stub/block immediately. Follow at most ONE restaurants link. No WP loops.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const STREET =
  /\d{1,5}\s+\S.{1,90}(?:blvd|boulevard|ave|avenue|st\.?|street|rd\.?|road|dr\.?|drive|way|hwy|highway|pkwy|ct\.?|court|place|pl\.?|lane|ln\.?|circle|cir\.?|rue|straat|laan|close|crescent|grove|parade|terrace|weg)/i;

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#038;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function blocked(html, url) {
  const blob = `${url || ""}\n${(html || "").slice(0, 2500)}`;
  return /techloq|Just a moment|cf-mitigated|filter\.techloq|_Incapsula_Resource|incapsula incident/i.test(blob);
}

const outcomes = [];
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
      outcomes.push(`${url} blocked`);
      return null;
    }
    if (!text || text.length < 1500) {
      console.log("[skip-stub]", r.status, text.length, r.url);
      outcomes.push(`${url} stub`);
      return null;
    }
    console.log("[get]", r.status, text.length, r.url);
    return { status: r.status, url: r.url, text };
  } catch (e) {
    console.log("[fail]", url, String(e.message || e).slice(0, 80));
    outcomes.push(`${url} fail`);
    return null;
  }
}

function categoryFrom(name) {
  const t = (name || "").toLowerCase();
  if (/butcher/.test(t)) return "Butcher";
  if (/baker|bagel|ice cream|creamery/.test(t)) return "Bakery";
  if (/market|grocery|supermarket|shop/.test(t) && !/restaurant|grill|cafe/.test(t)) return "Grocery";
  if (/cafe|pizza|dairy/.test(t)) return "Cafe";
  if (/cater|take/.test(t)) return "Takeaway";
  return "Restaurant";
}

function makeRow(sourceKey, agency, listingUrl, name, address, locality, country) {
  const cleanName = decode(name).replace(/\s*\([^)]{0,40}\)\s*$/, "").trim();
  const cleanAddress = decode(address)
    .replace(/\s*\(\d{3}\)[-.\s]?\d{3}[-.\s]?\d{4}.*$/, "")
    .replace(/\s+\d{3}[-.\s]?\d{3}[-.\s]?\d{4}.*$/, "")
    .replace(/https?:\/\/\S+/g, "")
    .trim();
  if (!cleanName || cleanName.length < 2 || cleanName.length > 80) return null;
  if (/^(home|menu|restaurants|establishments|directory|contact|about|kosher|commerces)/i.test(cleanName)) return null;
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
    .replace(/<\/(p|div|li|h[1-6]|tr|td|article|strong)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "'")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const rows = [];
  const seen = new Set();
  function add(row) {
    if (!row) return;
    const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  }
  let pending = "";
  for (const line of lines) {
    const inline = line.match(
      /^([A-Za-z0-9][^()]{1,70}?)\s*(?:\([^)]{0,60}\))?\s+(\d{1,5}\s+\S.{2,90}?)(?:\s+\(?\d{3}[-.\s)]+\d{3}[-.\s]?\d{4}.*)?$/,
    );
    if (inline && STREET.test(inline[2])) {
      add(makeRow(sourceKey, agency, listingUrl, inline[1], inline[2], locality, country));
      pending = "";
      continue;
    }
    if (STREET.test(line) && pending) {
      add(makeRow(sourceKey, agency, listingUrl, pending, line, locality, country));
      pending = "";
      continue;
    }
    if (STREET.test(line)) continue;
    if (line.length >= 2 && line.length <= 70) pending = line;
  }
  return rows;
}

function restaurantLink(html, base) {
  const hrefs = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    if (!/restaurant|establishment|eating|dining|directory|certified|commerces|food-guide|kosher-food/i.test(href)) continue;
    if (/wp-json|wp-admin|page=|mazon/i.test(href)) continue;
    try {
      const abs = new URL(href, base).href;
      if (abs === base) continue;
      return abs;
    } catch {
      continue;
    }
  }
  return null;
}

const targets = [
  ["https://www.uos.co.za/kosher/", "beth-din-johannesburg", "UOS / Beth Din Johannesburg", "Johannesburg", "South Africa"],
  ["https://www.kosher.org.au/consumers/kosher-food-guide/", "kosher-australia", "Kosher Australia", "Melbourne", "Australia"],
  ["https://www.shomrehadas.be/", "shomrehadas", "Shomre Hadas Antwerp", "Antwerp", "Belgium"],
  ["https://www.clevelandkosher.org/", "cleveland-kosher", "Cleveland Kosher", "Cleveland", "United States"],
  ["https://www.skvosf.org/", "skv-norcal", "Vaad HaKashrus of Northern California", "San Francisco", "United States"],
  ["https://stlkosher.org/", "stl-kosher", "Vaad Hoeir of St. Louis", "St. Louis", "United States"],
  ["https://koshermiami.org/establishments/", "miami-establishments", "Kosher Miami", "Miami", "United States"],
  ["https://www.mbd.org.uk/", "manchester-mbd", "Manchester Beth Din", "Manchester", "United Kingdom"],
  ["https://www.kfkosher.org/", "kedassia", "Kedassia", "London", "United Kingdom"],
  ["https://www.consistoire.org/commerces/", "beth-din-paris", "Beth Din de Paris / Consistoire", "Paris", "France"],
];

let chosen = null;
let incoming = [];
for (const [url, sourceKey, agency, locality, country] of targets) {
  const page = await get(url);
  if (!page?.text) continue;
  let rows = parseHtml(page.text, sourceKey, agency, page.url, locality, country);
  console.log("[parsed]", rows.length, page.url);
  if (rows.length >= 3) {
    chosen = { url: page.url, sourceKey };
    incoming = rows;
    break;
  }
  const next = restaurantLink(page.text, page.url);
  if (next) {
    const extra = await get(next);
    if (extra?.text) {
      rows = parseHtml(extra.text, sourceKey, agency, extra.url, locality, country);
      console.log("[parsed-link]", rows.length, extra.url);
      if (rows.length >= 3) {
        chosen = { url: extra.url, sourceKey };
        incoming = rows;
        break;
      }
    }
  }
  outcomes.push(`${url} parsed-0`);
}

if (!incoming.length) {
  console.log(JSON.stringify({ source: null, incoming: 0, added: 0, outcomes }, null, 2));
  process.exit(1);
}

const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
const have = new Set(harvested.map((row) => `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`));
let added = 0;
for (const row of incoming) {
  const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}::${row.locality}`;
  if (have.has(key)) continue;
  have.add(key);
  harvested.push(row);
  added += 1;
}
fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
console.log(
  JSON.stringify(
    {
      source: chosen.url,
      sourceKey: chosen.sourceKey,
      incoming: incoming.length,
      added,
      total: harvested.length,
      sample: incoming.slice(0, 4).map((r) => `${r.name} | ${r.address}`),
    },
    null,
    2,
  ),
);
