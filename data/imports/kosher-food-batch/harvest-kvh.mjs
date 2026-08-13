/**
 * KVH / RCN E certified establishments. Named places with street addresses.
 * 15s timeout. No WP pagination.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const LISTING = "https://kvhkosher.org/kosher-consumers/certified-establishments-food-service-providers1/";
const STREET = /\d{1,5}\s+\S.{4,110}(?:st\.?|street|ave|avenue|rd\.?|road|pkwy|parkway|blvd|boulevard|way|dr\.?|drive|row|path|hwy|highway|place|lane|ln\.?|court|ct\.?|circle|cir\.?)/i;

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

function categoryFrom(section, name) {
  const t = `${section} ${name}`.toLowerCase();
  if (/butcher|meat dept/.test(t) && !/restaurant/.test(t)) return "Butcher";
  if (/baker|bagel|ice cream|jplicks|frozen|desert/.test(t)) return "Bakery";
  if (/grocery|supermarket|shaw|star market|stop and shop|stop & shop/.test(t) && !/eatery|restaurant/.test(t)) return "Grocery";
  if (/cafe|dairy|pizza/.test(t)) return "Cafe";
  if (/cater|take|vending/.test(t)) return "Takeaway";
  return "Restaurant";
}

function localityFrom(address) {
  const m = address.match(/\b(Brookline|Boston|Cambridge|Newton Centre|Newton|Waltham|Canton|Sharon|Chestnut Hill|Somerville|Medford|Allston|Brighton|Stoughton|Dedham|Wellesley|Lynnfield|Jamaica Plain|West Roxbury|Auburn|Norton|Providence|Stamford|Teaneck|White Plains|Scarsdale)\b/i);
  return m ? m[1] : "Boston";
}

function qualifyName(name, section) {
  let n = decode(name)
    .replace(/\s*\|\s*$/, "")
    .replace(/^letter of certification.*$/i, "")
    .replace(/\s*status:.*$/i, "")
    .trim();
  if (/stop\s*&?\s*shop/i.test(section) && !/stop\s*&?\s*shop/i.test(n)) n = `Stop & Shop ${n}`;
  if (/\bshaw/i.test(section) && !/\bshaw/i.test(n)) n = `Shaw's ${n}`;
  if (/star market|star supermarket/i.test(section) && !/star (market|supermarket)/i.test(n)) n = `Star Market ${n}`;
  if (/jplicks/i.test(section) && /^jplicks/i.test(n) === false && /andover|assembly|boylston|brigham|charles|coolidge|davis|harvard square|jamaica|legacy|lynnfield|newbury|newton|south bay|wellesley|west broadway|west roxbury/i.test(n)) {
    n = `JPLicks ${n}`;
  }
  return n;
}

function makeRow(name, address, section) {
  const cleanName = qualifyName(name, section);
  let cleanAddress = decode(address)
    .replace(/\s*\(\d{3}\)[-.\s]?\d{3}[-.\s]?\d{4}.*$/, "")
    .replace(/\s*letter of certification.*$/i, "")
    .replace(/\s*status:.*$/i, "")
    .replace(/\s*https?:\/\/\S+/i, "")
    .trim();
  if (!cleanName || cleanName.length < 2 || cleanName.length > 90) return null;
  if (/^(bakeries|eatery|eateries|grocery|in-store|snacks|university|full service|hotnosh|see letter|remember|status:|a symbol of|look for the)/i.test(cleanName)) return null;
  if (!STREET.test(cleanAddress)) return null;
  const locality = localityFrom(cleanAddress);
  const category = categoryFrom(section, cleanName);
  return {
    sourceKey: "kvh-new-england",
    name: cleanName,
    address: cleanAddress,
    locality,
    destination: locality,
    country: "United States",
    category,
    listingUrl: LISTING,
    website: null,
    type: category,
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by KVH Kosher. Confirm current supervision on the cited page before relying on it.`,
  };
}

const r = await fetch(LISTING, {
  headers: { "user-agent": "Mozilla/5.0 (compatible; WhiteGloveKosherResearch/1.0)", accept: "text/html" },
  signal: AbortSignal.timeout(15000),
  redirect: "follow",
});
const html = await r.text();
if (/techloq|Just a moment|cf-mitigated|filter\.techloq/i.test(`${html} ${r.url}`.slice(0, 2500))) {
  console.log("[skip-blocked]", r.status, r.url);
  process.exit(1);
}
console.log("fetched", r.status, html.length, r.url);

const incoming = [];
const seen = new Set();
function add(row) {
  if (!row) return;
  const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}`;
  if (seen.has(key)) return;
  seen.add(key);
  incoming.push(row);
}

let section = "Eatery";
const text = html
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<\/(p|div|li|h[1-6]|td)>/gi, "\n")
  .replace(/<(h[1-6]|p|div|li)[^>]*>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&nbsp;/g, " ")
  .replace(/&#8217;/g, "'")
  .replace(/&#039;/g, "'");

const lines = text.split(/\n+/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];
  if (/^(bakeries|eatery|eateries|frozen|grocery|in-store|snacks|university dining|full service catering|hotnosh|shaw.?s|star market|stop\s*&?\s*shop|jplicks)/i.test(line) && line.length < 50) {
    section = line;
    continue;
  }
  const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    for (let j = 0; j < parts.length - 1; j += 1) {
      if (STREET.test(parts[j + 1]) && !STREET.test(parts[j])) {
        add(makeRow(parts[j], parts[j + 1], section));
      }
    }
  }
  const loose = [...line.matchAll(/([A-Za-z][A-Za-z0-9'’&.#\/@ -]{2,70}?)\s*\|\s*(\d{1,5}[^|]{10,110})/g)];
  for (const m of loose) add(makeRow(m[1], m[2], section));
  const next = lines[i + 1] || "";
  if (!STREET.test(line) && STREET.test(next) && line.length < 80) {
    add(makeRow(line, next, section));
  }
}

console.log("parsed", incoming.length, incoming.slice(0, 4).map((x) => `${x.name} | ${x.address}`));

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
console.log(JSON.stringify({ source: LISTING, incoming: incoming.length, added, total: harvested.length }, null, 2));
