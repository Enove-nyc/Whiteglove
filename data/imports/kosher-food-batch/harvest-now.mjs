import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const STREET = /\d{1,5},?\s+\S.{1,90}(?:blvd|boulevard|ave|avenue|st\.?|street|rd\.?|road|dr\.?|drive|way|rue|place|lane|calle|via|strasse|gasse|rua|avenida)/i;
const BAD = /^(address|phone|hours|tel|fax|website|email|map|home|menu|copyright|compliance|screen-reader|keyboard)/i;
const JUNK = /copyright|compliance status|screen-reader|keyboard navigation|wcag|{{reg/i;
const FOOD = /restaurant|kitchen|dining|bakery|grocery|cafe|deli|market|food|cater|pizza|grill|eatery/i;

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
    if (r.status === 404) {
      console.log("[404]", url);
      return { url: r.url, text, status: 404 };
    }
    if (!text || text.length < 1500) {
      console.log("[skip-stub]", r.status, text.length, url);
      return null;
    }
    console.log("[get]", r.status, text.length, r.url);
    return { url: r.url, text, status: r.status };
  } catch (e) {
    console.log("[fail]", url, String(e.message || e).slice(0, 80));
    return null;
  }
}

function makeRow(sourceKey, agency, listingUrl, name, address, locality, country) {
  const cleanName = String(name || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const cleanAddress = String(address || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!cleanName || cleanName.length < 2 || cleanName.length > 70) return null;
  if (BAD.test(cleanName) || JUNK.test(cleanName) || JUNK.test(cleanAddress)) return null;
  if (/^(chabad|synagogue|shul)\b/i.test(cleanName) && !FOOD.test(cleanName)) return null;
  if (cleanAddress.length > 120 || !STREET.test(cleanAddress)) return null;
  const t = cleanName.toLowerCase();
  const category = /baker/.test(t) ? "Bakery" : /market|grocery/.test(t) ? "Grocery" : /kitchen|cater/.test(t) ? "Takeaway" : "Restaurant";
  return {
    sourceKey, name: cleanName, address: cleanAddress, locality, destination: locality, country,
    category, listingUrl, website: null, type: category,
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by ${agency}. Confirm current supervision on the cited page before relying on it.`,
  };
}

function parseHtml(html, sourceKey, agency, listingUrl, locality, country) {
  const lines = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<(h[1-6])[^>]*>/gi, "\n").replace(/<\/(p|div|li|h[1-6]|tr|td|article|strong)>/gi, "\n").replace(/<[^>]+>/g, " ").split(/\n+/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const rows = [];
  const seen = new Set();
  let pending = "";
  for (const line of lines) {
    if (/^(address|phone|hours|website|tel)\s*:?\s*$/i.test(line) || JUNK.test(line)) continue;
    if (STREET.test(line) && pending && !BAD.test(pending) && !JUNK.test(pending)) {
      const row = makeRow(sourceKey, agency, listingUrl, pending, line, locality, country);
      if (row) {
        const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}`;
        if (!seen.has(key)) { seen.add(key); rows.push(row); }
      }
      pending = "";
      continue;
    }
    if (STREET.test(line) || BAD.test(line) || JUNK.test(line)) continue;
    if (line.length >= 2 && line.length <= 70) pending = line;
  }
  return rows;
}

const targets = [
  ["https://www.chabad.pt/en/food/", "https://www.chabad.pt/food/", "chabad-food-europe", "Chabad Lisbon", "Lisbon", "Portugal"],
  ["https://www.chabadmadrid.com/en/food/", "https://www.chabadmadrid.com/food/", "chabad-food-europe", "Chabad Madrid", "Madrid", "Spain"],
  ["https://www.chabadmunich.de/en/food/", "https://www.chabadmunich.de/food/", "chabad-food-europe", "Chabad Munich", "Munich", "Germany"],
  ["https://www.chabad.be/en/food/", "https://www.chabad.be/food/", "chabad-food-europe", "Chabad Brussels", "Brussels", "Belgium"],
  ["https://www.chabadsingapore.com/en/food/", "https://www.chabadsingapore.com/food/", "chabad-food-asia", "Chabad Singapore", "Singapore", "Singapore"],
  ["https://www.chabadhongkong.org/en/food/", "https://www.chabadhongkong.org/food/", "chabad-food-asia", "Chabad Hong Kong", "Hong Kong", "China"],
  ["https://www.chabad.jp/en/food/", "https://www.chabad.jp/food/", "chabad-food-asia", "Chabad Tokyo", "Tokyo", "Japan"],
  ["https://www.columbusvaad.org/establishments/", "https://www.columbusvaad.org/", "named-kosher-website", "Columbus Vaad", "Columbus", "United States"],
];

const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
const have = new Set(harvested.map((row) => `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`));
let added = 0;
const sourcesUsed = [];

for (const [url, alt, sourceKey, agency, locality, country] of targets) {
  let page = await get(url);
  if (page?.status === 404) page = await get(alt);
  if (!page?.text || page.status === 404) continue;
  const rows = parseHtml(page.text, sourceKey, agency, page.url, locality, country);
  console.log("[parsed]", rows.length, page.url, rows.slice(0, 2).map((r) => `${r.name} | ${r.address}`));
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
  if (n) sourcesUsed.push(page.url);
}

fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
console.log(JSON.stringify({ sourcesUsed, added, total: harvested.length }, null, 2));
