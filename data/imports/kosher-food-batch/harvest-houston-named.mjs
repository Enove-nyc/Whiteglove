/**
 * Houston Kashruth Association — named restaurants with street addresses.
 * 15s timeout. No WP pagination.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const LISTING = "https://kosherhouston.org/kosher-in-houston/";
const STREET = /\d{1,5}\s+\S.{4,90}(?:blvd|boulevard|ave|avenue|st\.?|street|rd\.?|road|dr\.?|drive|pkwy|hwy|fondren|braeswood|beechnut|bissonnet|hillcroft|bellaire|memorial)/i;

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
  const t = (name || "").toLowerCase();
  if (/butcher/.test(t)) return "Butcher";
  if (/baker|bagel|gelato|ice cream|sweet/.test(t)) return "Bakery";
  if (/\b(heb|costco|kroger|randall|whole foods|market|grocery)\b/.test(t) && !/restaurant|grill|cafe|bar/.test(t)) return "Grocery";
  if (/cafe|pizza|dairy/.test(t)) return "Cafe";
  if (/cater/.test(t)) return "Takeaway";
  return "Restaurant";
}

function makeRow(name, address) {
  const cleanName = decode(name);
  const cleanAddress = decode(address).replace(/^address:\s*/i, "").replace(/\s+phone:.*$/i, "").trim();
  if (!cleanName || cleanName.length < 2 || cleanName.length > 80) return null;
  if (/^(phone|address|hours|website|email|fax|map):/i.test(cleanName)) return null;
  if (/^kosher in houston|^restaurants|^groceries|^caterers|^hotels|^hka /i.test(cleanName)) return null;
  if (!STREET.test(cleanAddress)) return null;
  const locality = /bellaire/i.test(cleanAddress) ? "Bellaire" : "Houston";
  const category = categoryFrom(cleanName);
  return {
    sourceKey: "houston-kosher",
    name: cleanName,
    address: /TX/i.test(cleanAddress) ? cleanAddress : `${cleanAddress}, Houston, TX`,
    locality,
    destination: locality,
    country: "United States",
    category,
    listingUrl: LISTING,
    website: null,
    type: category,
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by the Houston Kashruth Association. Confirm current supervision on the cited page before relying on it.`,
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

for (const m of html.matchAll(/<(?:h[2-4]|strong|b|h5)[^>]*>([\s\S]*?)<\/(?:h[2-4]|strong|b|h5)>([\s\S]{0,900}?)(?=<(?:h[2-4]|h5)|$)/gi)) {
  const name = decode(m[1]);
  const chunk = decode(m[2]);
  const addr = (chunk.match(/address:\s*([^|]{8,120})/i) || chunk.match(STREET) || [])[0] || "";
  add(makeRow(name, addr.replace(/^address:\s*/i, "")));
}

const lines = html
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<\/(p|div|li|h[1-6]|td|article)>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .split(/\n+/)
  .map((l) => l.replace(/\s+/g, " ").trim())
  .filter(Boolean);

let pending = "";
for (const line of lines) {
  if (/^phone:|^hours:|^website:|^email:/i.test(line)) continue;
  if (/^address:/i.test(line) || STREET.test(line)) {
    add(makeRow(pending, line.replace(/^address:\s*/i, "")));
    continue;
  }
  if (line.length >= 2 && line.length <= 70) pending = line;
}

console.log("parsed", incoming.length, incoming.slice(0, 5).map((x) => `${x.name} | ${x.address}`));

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
