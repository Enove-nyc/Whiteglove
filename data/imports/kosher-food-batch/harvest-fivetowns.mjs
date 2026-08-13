/**
 * Fetch Five Towns Vaad establishments (15s). Named restaurants + street addresses.
 * No WP pagination.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const LISTING = "https://vaadhakashrus.org/establishments/";
const STREET = /\d{1,5}\s+\S.{4,80}(?:blvd|boulevard|ave|avenue|st\.?|street|tpke|turnpike|rd\.?|road|hwy|highway|place|pl\.?)/i;

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

function categoryFrom(name) {
  const t = name.toLowerCase();
  if (/butcher|meat/.test(t) && !/restaurant|grill|burger/.test(t)) return "Butcher";
  if (/baker|bagel|ice cream|cafe chocolat/.test(t)) return "Bakery";
  if (/market|grocery|supermarket/.test(t)) return "Grocery";
  if (/pizza|cafe|dairy/.test(t)) return "Cafe";
  if (/cater|take/.test(t)) return "Takeaway";
  return "Restaurant";
}

function localityFrom(address) {
  const m = address.match(/\b(Cedarhurst|Lawrence|Hewlett|Woodmere|Inwood|Far Rockaway|Long Beach|Atlantic Beach|Valley Stream|Lynbrook|East Rockaway)\b/i);
  return m ? m[1] : "Five Towns";
}

function makeRow(name, address) {
  const cleanName = decode(name);
  let cleanAddress = decode(address).replace(/\s+\(?\d{3}[-.)\s]?\d{3}[-.\s]?\d{4}.*$/, "").trim();
  if (!cleanName || cleanName.length < 2 || /^search$/i.test(cleanName) || /^view any/i.test(cleanName)) return null;
  if (!STREET.test(cleanAddress)) return null;
  const locality = localityFrom(cleanAddress);
  const category = categoryFrom(cleanName);
  return {
    sourceKey: "five-towns-vaad",
    name: cleanName,
    address: cleanAddress,
    locality,
    destination: locality,
    country: "United States",
    category,
    listingUrl: LISTING,
    website: null,
    type: category,
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by the Vaad Hakashrus of the Five Towns. Confirm current supervision on the cited page before relying on it.`,
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

for (const m of html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>([\s\S]{0,800}?)(?=<h[23]|$)/gi)) {
  const name = decode(m[1]);
  const chunk = m[2];
  const addr = decode(
    (chunk.match(/(\d{1,5}[^<]{8,90}(?:Blvd|Boulevard|Ave|Avenue|Street|St\.|Turnpike|Tpke|Road|Rd)[^<]{0,40})/i) || [])[1]
    || "",
  );
  add(makeRow(name, addr));
}

if (incoming.length < 10) {
  const lines = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  let pending = "";
  for (const line of lines) {
    if (STREET.test(line) && pending) {
      add(makeRow(pending, line));
      pending = "";
      continue;
    }
    if (STREET.test(line)) continue;
    if (line.length >= 2 && line.length <= 70) pending = line;
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
