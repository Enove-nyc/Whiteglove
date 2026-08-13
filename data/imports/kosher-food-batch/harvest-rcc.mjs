/**
 * Fetch RCC kosher directory (15s). Named establishments with street addresses.
 * No WP pagination.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const LISTING = "https://rccvaad.org/kosher-directory/";
const STREET = /\d{1,5}\s+\S.{3,60}(?:blvd|boulevard|ave|avenue|st\.?|street|way|dr\.?|drive|rd\.?|road|pkwy|blvd\.|ct\.?|court|place|pl\.?|lane|ln\.?)/i;
const SKIP_NAME = /kosher[-\s]?style|industrial bakery|for more information|click here|^type:/i;

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

function categoryFrom(section, type, name) {
  const t = `${section} ${type} ${name}`.toLowerCase();
  if (/butcher|meat dept/.test(t) && !/restaurant/.test(t)) return "Butcher";
  if (/baker|bagel|ice cream|creamery/.test(t)) return "Bakery";
  if (/market|grocery|supermarket/.test(t) && !/restaurant/.test(t)) return "Grocery";
  if (/cafe|dairy|pizza/.test(t)) return "Cafe";
  if (/cater|take/.test(t)) return "Takeaway";
  return "Restaurant";
}

function localityFrom(address) {
  const m = address.match(/\b(Los Angeles|Encino|Valley Village|Beverly Hills|Sherman Oaks|Tarzana|Van Nuys|Reseda|Glendale|West Hills|Woodland Hills|North Hollywood|N\. Hollywood|Studio City|Canoga Park|La Jolla|Santa Clarita|Running Springs)\b/i);
  return m ? m[1] : "Los Angeles";
}

function makeRow(name, address, type, section) {
  const cleanName = decode(name);
  const cleanAddress = decode(address).replace(/\s+\d{3}[-.\s]?\d{3}[-.\s]?\d{4}.*$/, "").replace(/https?:\/\/\S+/g, "").trim();
  if (!cleanName || SKIP_NAME.test(cleanName) || cleanName.length < 2 || cleanName.length > 80) return null;
  if (!STREET.test(cleanAddress)) return null;
  const locality = localityFrom(cleanAddress);
  const category = categoryFrom(section, type, cleanName);
  return {
    sourceKey: "rcc-california",
    name: cleanName,
    address: /CA/i.test(cleanAddress) ? cleanAddress : `${cleanAddress}, CA`,
    locality,
    destination: locality,
    country: "United States",
    category,
    listingUrl: LISTING,
    website: null,
    type: decode(type || category),
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by the Rabbinical Council of California. Confirm current supervision on the cited page before relying on it.`,
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

let section = "Restaurants";
const lines = html
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<\/(p|div|li|h[1-6]|tr|section|article|header)>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&nbsp;/g, " ")
  .replace(/&#8217;/g, "'")
  .replace(/&#039;/g, "'")
  .split(/\n+/)
  .map((l) => l.replace(/\s+/g, " ").trim())
  .filter(Boolean);

let pendingName = "";
let pendingType = "";
for (const line of lines) {
  if (/^(bakeries|butchers and markets|caterers|community services|ice cream|nuts & candy|restaurants|specialty foods|pareve|meat|dairy|fish|cholov)/i.test(line) && line.length < 50) {
    if (/baker|butcher|market|cater|restaurant|ice cream|community/i.test(line)) section = line;
    continue;
  }
  if (/^type:/i.test(line)) {
    pendingType = line.replace(/^type:\s*/i, "");
    continue;
  }
  if (STREET.test(line) && pendingName) {
    add(makeRow(pendingName, line, pendingType, section));
    pendingName = "";
    pendingType = "";
    continue;
  }
  const inline = line.match(/^(.{2,70}?)\s+(?:Type:\s*.+?\s+)?(\d{1,5}\s+\S.{6,80}(?:Blvd|Ave|St\.?|Street|Way|Dr\.?|Rd\.?|Pkwy)[^]*?\bCA\b.*)$/i);
  if (inline && !/^type:/i.test(inline[1])) {
    add(makeRow(inline[1], inline[2], pendingType, section));
    pendingName = "";
    pendingType = "";
    continue;
  }
  if (STREET.test(line)) continue;
  if (line.length >= 2 && line.length <= 70 && !/^https?:/i.test(line) && !/^\d{3}[-.\s]?\d{3}/.test(line)) {
    pendingName = line;
    pendingType = "";
  }
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
