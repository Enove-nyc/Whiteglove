/**
 * Try Houston / Atlanta / Kosher Quest once each (15s). Parse the first
 * directory that returns named restaurants with street addresses.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const UA = "Mozilla/5.0 (compatible; WhiteGloveKosherResearch/1.0)";
const STREET = /\d{1,5}\s+\S.{4,80}(?:blvd|boulevard|ave|avenue|st\.?|street|rd\.?|road|dr\.?|drive|pkwy|hwy|fondren|braeswood|beechnut|bissonnet|hillcroft|bellaire)/i;

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function blocked(html, url) {
  return /techloq|Just a moment|cf-mitigated|filter\.techloq/i.test(`${html || ""} ${url || ""}`.slice(0, 2500));
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
    console.log("[get]", r.status, text.length, r.url);
    return { status: r.status, url: r.url, text };
  } catch (e) {
    console.log("[fail]", url, String(e.message || e).slice(0, 80));
    return null;
  }
}

function categoryFrom(name) {
  const t = (name || "").toLowerCase();
  if (/butcher/.test(t)) return "Butcher";
  if (/baker|bagel|ice cream|gelato/.test(t)) return "Bakery";
  if (/market|grocery|heb|costco|kroger/.test(t) && !/restaurant|grill|cafe/.test(t)) return "Grocery";
  if (/cafe|pizza|dairy/.test(t)) return "Cafe";
  if (/cater/.test(t)) return "Takeaway";
  return "Restaurant";
}

function makeRow(sourceKey, agency, listingUrl, name, address, locality) {
  const cleanName = decode(name);
  const cleanAddress = decode(address).replace(/\s+\d{3}[-.\s]?\d{3}[-.\s]?\d{4}.*$/, "").trim();
  if (!cleanName || cleanName.length < 2 || cleanName.length > 80) return null;
  if (/^local info|^note:|^save money|^kosher in houston|^restaurants/i.test(cleanName)) return null;
  if (!STREET.test(cleanAddress)) return null;
  const category = categoryFrom(cleanName);
  return {
    sourceKey,
    name: cleanName,
    address: cleanAddress,
    locality: locality || "Houston",
    destination: locality || "Houston",
    country: "United States",
    category,
    listingUrl,
    website: null,
    type: category,
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by ${agency}. Confirm current supervision on the cited page before relying on it.`,
  };
}

function parseLines(html, sourceKey, agency, listingUrl, locality) {
  const lines = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|td|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const rows = [];
  const seen = new Set();
  let pending = "";
  for (const line of lines) {
    if (STREET.test(line) && pending) {
      const row = makeRow(sourceKey, agency, listingUrl, pending, line, locality);
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
    const inline = line.match(/^(.{2,70}?)\s+(\d{1,5}\s+\S.{8,90})$/);
    if (inline && STREET.test(inline[2])) {
      const row = makeRow(sourceKey, agency, listingUrl, inline[1], inline[2], locality);
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
    if (STREET.test(line)) continue;
    if (line.length >= 2 && line.length <= 70) pending = line;
  }
  return rows;
}

const targets = [
  ["https://kosherhouston.org/kosher-in-houston/", "houston-kosher", "Houston Kashruth Association", "Houston"],
  ["https://www.houstonkosher.org/restaurants", "houston-kosher", "Houston Kashruth Association", "Houston"],
  ["https://www.chabadhouston.com/templates/articlecco_cdo/aid/461514/jewish/Mehadrin-Kashrus-of-Texas.htm", "houston-kosher", "Mehadrin Kashrus of Texas", "Houston"],
  ["https://www.houstondirectory.org/directory/kosherinhouston.aspx", "houston-kosher", "Houston Kashruth Association", "Houston"],
  ["https://kosheratlanta.org/local-info/", "atlanta-kosher", "Atlanta Kashruth Commission", "Atlanta"],
  ["https://www.kosherquest.org/socal-kosher-restaurants/", "rcc-california", "Kosher Quest / RCC", "Los Angeles"],
];

let chosen = null;
let incoming = [];
for (const [url, sourceKey, agency, locality] of targets) {
  const page = await get(url);
  if (!page?.text || page.status === 404) continue;
  const rows = parseLines(page.text, sourceKey, agency, page.url, locality);
  console.log("[parsed]", rows.length, url);
  if (rows.length >= 3) {
    chosen = { url: page.url, sourceKey, agency };
    incoming = rows;
    break;
  }
}

if (!incoming.length) {
  console.log(JSON.stringify({ source: null, incoming: 0, added: 0 }));
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
console.log(JSON.stringify({
  source: chosen.url,
  sourceKey: chosen.sourceKey,
  incoming: incoming.length,
  added,
  total: harvested.length,
  sample: incoming.slice(0, 3).map((r) => `${r.name} | ${r.address}`),
}, null, 2));
