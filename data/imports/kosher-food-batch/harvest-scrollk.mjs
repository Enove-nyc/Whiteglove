/**
 * Fetch Scroll K Denver establishments table (15s). Named restaurants + street addresses.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const LISTING = "https://scrollk.org/kosher-food-establishments/";
const STREET = /\d|street|st\.|avenue|ave|road|rd\.|blvd|drive|pkwy|parkway/i;
const BAD = /^(n\/a|na|-|–)?$/i;

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
  if (/baker|bagel|ice cream|creamery/.test(t)) return "Bakery";
  if (/grocery|supermarket|market/.test(t) && !/restaurant/.test(t)) return "Grocery";
  if (/cafe|dairy/.test(t)) return "Cafe";
  if (/take|cater/.test(t)) return "Takeaway";
  return "Restaurant";
}

function makeRow(name, address, type) {
  const cleanName = decode(name);
  const cleanAddress = decode(address);
  if (!cleanName || cleanName.length < 2 || /^establishment$/i.test(cleanName)) return null;
  if (!cleanAddress || BAD.test(cleanAddress) || !STREET.test(cleanAddress) || cleanAddress.length < 8) return null;
  const locality = /boulder/i.test(cleanAddress)
    ? "Boulder"
    : /aurora/i.test(cleanAddress)
      ? "Aurora"
      : /edgewater/i.test(cleanAddress)
        ? "Edgewater"
        : "Denver";
  const category = categoryFrom(type);
  return {
    sourceKey: "scroll-k-denver",
    name: cleanName,
    address: cleanAddress,
    locality,
    destination: locality,
    country: "United States",
    category,
    listingUrl: LISTING,
    website: null,
    type: decode(type || category),
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by Scroll K. Confirm current supervision on the cited page before relying on it.`,
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
for (const m of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
  const cells = [...m[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => decode(c[1]));
  if (cells.length < 3) continue;
  const row = makeRow(cells[0], cells[2], cells[3]);
  if (!row) continue;
  const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}`;
  if (seen.has(key)) continue;
  seen.add(key);
  incoming.push(row);
}
console.log("parsed", incoming.length, incoming.slice(0, 3).map((x) => `${x.name} | ${x.address}`));

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
