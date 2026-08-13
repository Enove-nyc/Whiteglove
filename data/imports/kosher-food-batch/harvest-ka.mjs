/**
 * Fetch ka.org.au/establishments (15s). Parse named restaurants with street addresses.
 * No WP pagination.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const LISTING = "https://ka.org.au/establishments";
const SKIP_NAME = /kosher[-\s]?style|israeli[-\s]?style|party equipment/i;
const BAD_ADDR = /^(n\/a|na|-|–|none)$/i;
const STREET = /\d|street|st\.|avenue|ave|road|rd\.|blvd|drive|parade|lane|head rd|head road|place|pl\.|boulevard/i;

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
  if (/grocery|supermarket|shop/.test(t) && !/restaurant/.test(t)) return "Grocery";
  if (/cafe|dairy/.test(t)) return "Cafe";
  if (/take|cater/.test(t)) return "Takeaway";
  return "Restaurant";
}

function makeRow(name, address, suburb, type) {
  const cleanName = decode(name);
  const street = decode(address);
  const locality = decode(suburb);
  if (!cleanName || SKIP_NAME.test(cleanName) || cleanName.length < 2) return null;
  if (!street || BAD_ADDR.test(street) || street.length < 4) return null;
  if (!STREET.test(street) && (!locality || BAD_ADDR.test(locality))) return null;
  const fullAddress = [street, locality && !BAD_ADDR.test(locality) ? locality : null, "Australia"].filter(Boolean).join(", ");
  if (!STREET.test(fullAddress)) return null;
  const category = categoryFrom(`${type} ${cleanName}`);
  return {
    sourceKey: "ka-nsw",
    name: cleanName,
    address: fullAddress,
    locality: locality && !BAD_ADDR.test(locality) ? locality : "Sydney",
    destination: locality && !BAD_ADDR.test(locality) ? locality : "Sydney",
    country: "Australia",
    category,
    listingUrl: LISTING,
    website: null,
    type: decode(type || category),
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by Kashrut Authority NSW. Confirm current supervision on the cited page before relying on it.`,
  };
}

const r = await fetch(LISTING, {
  headers: { "user-agent": "Mozilla/5.0 (compatible; WhiteGloveKosherResearch/1.0)", accept: "text/html,application/json" },
  signal: AbortSignal.timeout(15000),
  redirect: "follow",
});
const html = await r.text();
if (/techloq|Just a moment|cf-mitigated/i.test(html.slice(0, 2000))) {
  console.log("[skip-blocked]", r.status);
  process.exit(1);
}
console.log("fetched", r.status, html.length, r.url);

const incoming = [];
const seenNames = new Set();

function add(row) {
  if (!row) return;
  const key = row.name.toLowerCase();
  if (seenNames.has(key)) return;
  seenNames.add(key);
  incoming.push(row);
}

for (const m of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
  const cells = [...m[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => decode(c[1]));
  if (cells.length < 3) continue;
  if (/^name$/i.test(cells[0]) || /sort/i.test(cells[0])) continue;
  add(makeRow(cells[0], cells[2], cells[3], cells[1]));
}

if (incoming.length < 5) {
  for (const m of html.matchAll(/<h2[^>]*>([^<]{2,80})<\/h2>([\s\S]{0,500}?)(?=<h2|$)/gi)) {
    const name = decode(m[1]);
    const block = m[2];
    const lines = decode(block).split(/(?<=Street|Road|Rd|Avenue|Ave|Parade|Lane|Place)\s+/i);
    const addr = (block.match(/\d[\dA-Za-z .'/ -]{4,60}(?:Street|St|Road|Rd|Avenue|Ave|Parade|Lane|Place)[^<]{0,20}/i) || [])[0]
      || (block.match(/>([A-Za-z0-9 .'/ -]{6,60}(?:Street|Road|Rd|Avenue|Parade))</i) || [])[1];
    const suburb = (block.match(/>(Surry Hills|Rose Bay|Bondi(?: Beach)?|Waverley|Kensington|Woollahra|Darlington|North Bondi|Hunters Hill|Matraville|Bondi Junction|Vaucluse|Coogee|Manly|Maroubra|Botany|Alexandria|St Ives|Kirrawee|Malvern|Windsor|Bar Beach|West End|Surfers Paradise)</i) || [])[1];
    const type = (block.match(/(Meat|Dairy|Bakery|Take Out|Catering|Butcher|Grocery|Pareve|Misc)[^<]{0,40}/) || [])[0];
    add(makeRow(name, addr || "", suburb || "Sydney", type));
  }
}

if (incoming.length < 5) {
  const jsonLd = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  console.log("jsonld", jsonLd.length);
  for (const m of html.matchAll(/"name"\s*:\s*"([^"]{2,80})"[^]{0,400}?"address"\s*:\s*"([^"]{6,120})"/gi)) {
    add(makeRow(m[1], m[2], "Sydney", "Restaurant"));
  }
  const next = html.match(/__NEXT_DATA__[^>]*>([\s\S]*?)<\/script>/);
  const nuxt = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  const blob = (html.match(/establishments"?\s*:\s*(\[[\s\S]{200,200000}?\])/i) || [])[1];
  if (blob) {
    try {
      const items = JSON.parse(blob);
      console.log("blob items", items.length);
      for (const item of items) {
        add(makeRow(item.name || item.Name, item.address || item.Address || item.street, item.suburb || item.Suburb || item.city, item.type || item.Type));
      }
    } catch (e) {
      console.log("blob parse", e.message);
    }
  }
  if (next) console.log("has next data");
  if (nuxt) console.log("has nuxt");
}

console.log("parsed", incoming.length, incoming.slice(0, 3).map((r) => `${r.name} | ${r.address}`));

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
console.log(JSON.stringify({ source: LISTING, incoming: incoming.length, added, total: harvested.length }, null, 2));
