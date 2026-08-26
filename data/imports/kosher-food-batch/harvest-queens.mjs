/**
 * Parse Vaad Harabonim of Queens certified establishments (named restaurants + addresses).
 * 15s timeout. Append unique rows to _harvested.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const UA = "Mozilla/5.0 (compatible; WhiteGloveKosherResearch/1.0)";
const SKIP_NAME = /kosher[-\s]?style|israeli[-\s]?style|jewish[-\s]?style|party equipment/i;
const SHUL_ONLY = /^(chabad|synagogue|shul)\b/i;
const FOOD_HINT = /restaurant|kitchen|dining|bakery|grocery|butcher|cafe|pizza|grill|deli|market|cater|sushi|fish|food|meat|dairy|take/i;
const STREET = /\d|street|st\.|avenue|ave|road|rd\.|blvd|drive|dr\.|lane|ln\.|place|pl\.|tpke|turnpike|mill rd/i;

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

function categoryFrom(text) {
  const t = (text || "").toLowerCase();
  if (/butcher/.test(t)) return "Butcher";
  if (/baker|bagel|ice cream/.test(t)) return "Bakery";
  if (/grocery|supermarket|market|shop/.test(t) && !/restaurant/.test(t)) return "Grocery";
  if (/cafe|dairy/.test(t)) return "Cafe";
  if (/take|cater/.test(t)) return "Takeaway";
  return "Restaurant";
}

function makeRow(name, address, locality, type, listingUrl) {
  const cleanName = decode(name);
  const cleanAddress = decode(address);
  if (!cleanName || SKIP_NAME.test(cleanName) || cleanName.length < 2) return null;
  if (!cleanAddress || cleanAddress.length < 6 || !STREET.test(cleanAddress)) return null;
  if (SHUL_ONLY.test(cleanName) && !FOOD_HINT.test(`${cleanName} ${type}`)) return null;
  const category = categoryFrom(`${type} ${cleanName}`);
  return {
    sourceKey: "queens-vaad",
    name: cleanName,
    address: cleanAddress,
    locality: locality || "Queens",
    destination: locality || "Queens",
    country: "United States",
    category,
    listingUrl,
    website: null,
    type: decode(type || category),
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by Vaad Harabonim of Queens. Confirm current supervision on the cited page before relying on it.`,
  };
}

const r = await fetch("https://queensvaad.org/kashrus/certified-establishments/", {
  headers: { "user-agent": UA, accept: "text/html" },
  signal: AbortSignal.timeout(15000),
  redirect: "follow",
});
const html = await r.text();
if (/techloq|Just a moment|cf-mitigated/i.test(html.slice(0, 2000))) {
  console.log("[skip-blocked]");
  process.exit(1);
}
console.log("fetched", r.status, html.length);

const incoming = [];
const cards = [...html.matchAll(/data-title="([^"]+)"\s+data-permalink="([^"]+)"([\s\S]{0,3500}?)(?=data-title="|np-map-listing|$)/gi)];
console.log("cards", cards.length);
for (const m of cards) {
  const name = decode(m[1]);
  const listingUrl = m[2];
  const chunk = m[3];
  const type = decode((chunk.match(/fi-rr-restaurant[\s\S]{0,120}?<p>([^<]+)<\/p>/i) || [])[1] || "Restaurant");
  const locality = decode((chunk.match(/fi-rr-region-pin-alt[\s\S]{0,120}?<p>([^<]+)<\/p>/i) || [])[1] || "Queens");
  const mapsQ = (chunk.match(/google\.com\/maps\?q=([^"&]+)/i) || [])[1];
  const markerText = decode((chunk.match(/fi-rr-marker[\s\S]{0,200}?<a[^>]*>([^<]+)<\/a>/i) || [])[1] || "");
  let address = "";
  if (mapsQ) {
    try {
      address = decodeURIComponent(mapsQ.replace(/\+/g, " "));
    } catch {
      address = markerText;
    }
  } else {
    address = markerText;
  }
  if (address && !/,/.test(address) && locality) address = `${address}, ${locality}, NY, United States`;
  const row = makeRow(name, address, locality, type, listingUrl);
  if (row) incoming.push(row);
}

const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
const seen = new Set(harvested.map((row) => `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`));
let added = 0;
for (const row of incoming) {
  const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}::${row.locality}`;
  if (seen.has(key)) continue;
  seen.add(key);
  harvested.push(row);
  added += 1;
}
fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
console.log(JSON.stringify({
  incoming: incoming.length,
  added,
  total: harvested.length,
  sample: incoming.slice(0, 3).map((r) => `${r.name} | ${r.address}`),
}, null, 2));
