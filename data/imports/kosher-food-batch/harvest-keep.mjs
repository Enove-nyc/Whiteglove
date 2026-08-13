/**
 * Keep 1+ named+street rows from each unused directory. 15s. No WP loops.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const STREET =
  /\d{1,5},?\s+\S.{1,90}(?:blvd|boulevard|ave|avenue|avenida|st\.?|street|rd\.?|road|dr\.?|drive|way|hwy|pkwy|parkway|ct\.?|court|place|pl\.?|lane|rue|close|crescent|grove|parade|terrace|straat|strasse|straße|gasse|calle|platz|gracht)/i;
const BAD_NAME = /^(address|phone|hours|tel|fax|website|email|map|home|menu|restaurants|establishments|directory|contact|about|kosher|commerces)\b/i;
const SHUL_ONLY = /^(chabad|synagogue|shul|beit|beth israel|centre|center)\b/i;
const FOOD_HINT = /restaurant|kitchen|dining|bakery|grocery|cafe|deli|market|food|cater|pizza|grill|takeaway|meals/i;
const outcomes = [];
const sourcesUsed = [];

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
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
      outcomes.push(`${url} blocked`);
      return null;
    }
    if (!text || text.length < 1500) {
      console.log("[skip-stub]", r.status, text.length, r.url);
      outcomes.push(`${url} stub`);
      return null;
    }
    console.log("[get]", r.status, text.length, r.url);
    return { url: r.url, text };
  } catch (e) {
    console.log("[fail]", url, String(e.message || e).slice(0, 80));
    outcomes.push(`${url} fail`);
    return null;
  }
}

function categoryFrom(name) {
  const t = (name || "").toLowerCase();
  if (/butcher|meat/.test(t) && !/restaurant/.test(t)) return "Butcher";
  if (/baker|bagel|chocolate/.test(t)) return "Bakery";
  if (/market|grocery|supermarket/.test(t) && !/restaurant/.test(t)) return "Grocery";
  if (/cafe|pizza|dairy/.test(t)) return "Cafe";
  if (/cater|take/.test(t)) return "Takeaway";
  return "Restaurant";
}

function makeRow(sourceKey, agency, listingUrl, name, address, locality, country) {
  const cleanName = decode(name);
  const cleanAddress = decode(address).replace(/^(address)\s*:?\s*/i, "");
  if (!cleanName || cleanName.length < 2 || cleanName.length > 80) return null;
  if (BAD_NAME.test(cleanName)) return null;
  if (SHUL_ONLY.test(cleanName) && !FOOD_HINT.test(cleanName)) return null;
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
    .replace(/<\/(p|div|li|h[1-6]|tr|td|article|strong)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const rows = [];
  const seen = new Set();
  let pending = "";
  for (const line of lines) {
    if (/^(address|phone|hours|website|tel)\s*:?\s*$/i.test(line)) continue;
    const inline = line.match(/^([A-Za-z][^:]{1,70}?)\s+(\d{1,5},?\s+\S.{4,90})$/);
    if (inline && STREET.test(inline[2]) && !BAD_NAME.test(inline[1])) {
      const row = makeRow(sourceKey, agency, listingUrl, inline[1], inline[2], locality, country);
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
    if (STREET.test(line) && pending && !BAD_NAME.test(pending)) {
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
    if (STREET.test(line) || BAD_NAME.test(line)) continue;
    if (line.length >= 2 && line.length <= 80) pending = line;
  }
  return rows;
}

function restaurantLink(html, base) {
  const hrefs = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    if (!/restaurant|establishment|eating|dining|directory|licensed|commerces|kosher-food|kashrus|casher/i.test(href)) continue;
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
  ["https://www.consistoire.org/commerces/", "beth-din-paris", "Beth Din de Paris / Consistoire", "Paris", "France"],
  ["https://www.federation.org.uk/kashrus/", "federation-kashrus", "Federation Kashrus", "London", "United Kingdom"],
  ["https://www.ckcincinnati.org/", "cincinnati-vaad", "Vaad Hoer of Cincinnati", "Cincinnati", "United States"],
  ["https://www.minnkosher.org/", "minn-kosher", "Minneapolis Kosher", "Minneapolis", "United States"],
  ["https://www.lvvaad.org/", "lv-vaad", "Vaad HaKashrus of Las Vegas", "Las Vegas", "United States"],
  ["https://www.sandiegovaad.org/", "sd-vaad", "Vaad HaRabbonim of San Diego", "San Diego", "United States"],
  ["https://www.ikg-wien.at/", "ikg-vienna", "IKG Vienna", "Vienna", "Austria"],
  ["https://www.irgzuerich.ch/", "irg-zurich", "IRG Zurich", "Zurich", "Switzerland"],
  ["https://www.nihs.nl/", "nihs-amsterdam", "NIHS Amsterdam", "Amsterdam", "Netherlands"],
  ["https://www.cjm.org.mx/", "cjm-mexico", "Comunidad Judía de México", "Mexico City", "Mexico"],
  ["https://www.amia.org.ar/", "amia-buenos-aires", "AMIA", "Buenos Aires", "Argentina"],
  ["https://chabadprague.cz/en/food/", "chabad-food-europe", "Chabad Prague", "Prague", "Czechia"],
  ["https://www.chabadberlin.de/en/food/", "chabad-food-europe", "Chabad Berlin", "Berlin", "Germany"],
  ["https://jewishrome.com/en/food/", "chabad-food-europe", "Chabad Rome", "Rome", "Italy"],
  ["https://chabadbarcelona.org/en/food/", "chabad-food-europe", "Chabad Barcelona", "Barcelona", "Spain"],
];

const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
const have = new Set(harvested.map((row) => `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`));
let added = 0;
const kept = [];

for (const [url, sourceKey, agency, locality, country] of targets) {
  const page = await get(url);
  if (!page?.text) continue;
  let rows = parseHtml(page.text, sourceKey, agency, page.url, locality, country);
  let usedUrl = page.url;
  console.log("[parsed]", rows.length, page.url);
  if (rows.length < 1) {
    const next = restaurantLink(page.text, page.url);
    if (next) {
      const extra = await get(next);
      if (extra?.text) {
        rows = parseHtml(extra.text, sourceKey, agency, extra.url, locality, country);
        usedUrl = extra.url;
        console.log("[parsed-link]", rows.length, extra.url);
      }
    }
  }
  if (rows.length < 1) {
    outcomes.push(`${url} parsed-0`);
    continue;
  }
  let sourceAdded = 0;
  for (const row of rows) {
    const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}::${row.locality}`;
    if (have.has(key)) continue;
    have.add(key);
    harvested.push(row);
    added += 1;
    sourceAdded += 1;
  }
  if (sourceAdded) {
    sourcesUsed.push(usedUrl);
    kept.push({ url: usedUrl, kept: sourceAdded, sample: rows.slice(0, 3).map((r) => `${r.name} | ${r.address}`) });
  }
}

fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
console.log(JSON.stringify({ sourcesUsed, added, total: harvested.length, kept, outcomes }, null, 2));
if (!added) process.exit(1);
