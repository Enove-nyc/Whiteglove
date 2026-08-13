import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const STREET = /\d{1,5},?\s+\S.{1,80}(?:blvd|boulevard|ave|avenue|st\.?|street|rd\.?|road|dr\.?|drive|rue|place|lane|calle|carrer|via|strasse|gasse|straat)/i;
const BAD = /^(address|phone|hours|tel|fax|website|email|map|home|menu|copyright|compliance|screen-reader|keyboard|grocery store)/i;
const JUNK = /copyright|compliance|screen-reader|keyboard navigation|wcag|{{reg/i;

async function get(url) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html" },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    const text = await r.text();
    if (/techloq|Just a moment|cf-mitigated|_Incapsula_Resource/i.test(`${r.url}\n${text.slice(0, 2500)}`)) {
      console.log("[skip-blocked]", url);
      return null;
    }
    if (!text || text.length < 1500) {
      console.log("[skip-stub]", r.status, text.length, url);
      return null;
    }
    console.log("[get]", r.status, text.length, r.url);
    return { url: r.url, text };
  } catch (e) {
    console.log("[fail]", url, String(e.message || e).slice(0, 80));
    return null;
  }
}

function makeRow(sourceKey, agency, listingUrl, name, address, locality, country) {
  const cleanName = String(name || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const cleanAddress = String(address || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!cleanName || cleanName.length < 2 || cleanName.length > 70) return null;
  if (BAD.test(cleanName) || JUNK.test(cleanName) || JUNK.test(cleanAddress)) return null;
  if (/^(chabad|synagogue|shul)\b/i.test(cleanName) && !/kitchen|restaurant|food|dining|bakery|cafe/i.test(cleanName)) return null;
  if (cleanAddress.length > 120 || !STREET.test(cleanAddress)) return null;
  const t = cleanName.toLowerCase();
  const category = /baker/.test(t) ? "Bakery" : /market|grocery/.test(t) ? "Grocery" : "Restaurant";
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
    if (/^(address|phone|hours|website|tel)\s*:?\s*$/i.test(line) || JUNK.test(line)) continue;
    if (STREET.test(line) && pending && !BAD.test(pending) && !JUNK.test(pending)) {
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
    if (STREET.test(line) || BAD.test(line) || JUNK.test(line)) continue;
    if (line.length >= 2 && line.length <= 70) pending = line;
  }
  return rows;
}

function foodLink(html, base) {
  const hrefs = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    if (!/restaurant|food|kitchen|dining|establishment/i.test(href)) continue;
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

const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
const have = new Set(harvested.map((row) => `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`));
let added = 0;
const sourcesUsed = [];

for (const [url, sourceKey, agency, locality, country] of targets) {
  const page = await get(url);
  if (!page?.text) continue;
  let rows = parseHtml(page.text, sourceKey, agency, page.url, locality, country);
  let used = page.url;
  console.log("[parsed]", rows.length, page.url);
  if (!rows.length) {
    const next = foodLink(page.text, page.url);
    if (next) {
      const extra = await get(next);
      if (extra?.text) {
        rows = parseHtml(extra.text, sourceKey, agency, extra.url, locality, country);
        used = extra.url;
        console.log("[parsed-link]", rows.length, extra.url);
      }
    }
  }
  if (!rows.length) continue;
  let n = 0;
  for (const row of rows) {
    const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}::${row.locality}`;
    if (have.has(key)) continue;
    have.add(key);
    harvested.push(row);
    added += 1;
    n += 1;
  }
  if (n) sourcesUsed.push(used);
}

fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
console.log(JSON.stringify({ sourcesUsed, added, total: harvested.length }, null, 2));
