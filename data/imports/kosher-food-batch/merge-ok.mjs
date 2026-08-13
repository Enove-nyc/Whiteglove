/**
 * Fetch OK Kosher restaurant CPT (15s timeout) and merge into _harvested.json.
 * Keeps named OK listings even when the API omits a street address, so they
 * can be staged as NEEDS_REVIEW leads. Does not publish.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const TIMEOUT_MS = 15000;

function decode(value) {
  return String(value || "")
    .replace(/&#8217;/g, "'")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryFrom(type) {
  const t = (type || "").toLowerCase();
  if (/baker/.test(t)) return "Bakery";
  if (/butcher|meat/.test(t) && !/caterer/.test(t)) return "Butcher";
  if (/supermarket|grocery/.test(t)) return "Grocery";
  if (/cafe|dairy/.test(t)) return "Cafe";
  if (/caterer|take/.test(t)) return "Takeaway";
  return "Restaurant";
}

async function fetchOk() {
  const r = await fetch("https://www.ok.org/wp-json/wp/v2/cpt_restaurant?per_page=100", {
    headers: { "user-agent": "WhiteGloveKosherResearch/1.0" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "follow",
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`OK list HTTP ${r.status}`);
  const items = JSON.parse(text);
  if (!Array.isArray(items)) throw new Error("OK list was not an array");
  return items;
}

function okRow(item) {
  const name = decode(item.title?.rendered || "");
  const slug = item.slug || "";
  const link = item.link || (slug ? `https://www.ok.org/restaurant/${slug}/` : "");
  if (!name || !link) return null;
  const type = (item.class_list || [])
    .filter((c) => String(c).startsWith("ctax_restaurant_type-"))
    .map((c) => String(c).replace("ctax_restaurant_type-", "").replace(/-/g, " "))
    .join(", ");
  const graph = item.yoast_head_json?.schema?.["@graph"] || [];
  let address = "";
  let locality = "";
  let country = "United States";
  for (const node of graph) {
    const a = node.address;
    if (a?.streetAddress) {
      address = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry]
        .filter(Boolean)
        .join(", ");
      locality = a.addressLocality || "";
      if (a.addressCountry === "IL" || /israel/i.test(a.addressCountry || "")) country = "Israel";
      if (a.addressCountry === "CA") country = "Canada";
    }
  }
  return {
    sourceKey: "ok-restaurants",
    name,
    address,
    locality: locality || "OK Kosher",
    destination: locality || "OK Kosher",
    country,
    category: categoryFrom(type),
    listingUrl: link,
    website: null,
    type: type || "Restaurant",
    summary: `${name} is listed as a kosher ${categoryFrom(type).toLowerCase()} on the OK Kosher restaurant guide. Confirm current supervision on the cited listing before relying on it.`,
  };
}

const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
const items = await fetchOk();
const okRows = items.map(okRow).filter(Boolean);
const seen = new Set(harvested.map((row) => `${row.sourceKey}::${row.name.toLowerCase()}::${row.address}`));
let added = 0;
for (const row of okRows) {
  const key = `${row.sourceKey}::${row.name.toLowerCase()}::${row.address}`;
  if (seen.has(key)) continue;
  seen.add(key);
  harvested.push(row);
  added += 1;
}
fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
const bySource = {};
for (const row of harvested) bySource[row.sourceKey] = (bySource[row.sourceKey] || 0) + 1;
console.log(JSON.stringify({
  okApiCount: items.length,
  okRows: okRows.length,
  okAdded: added,
  okWithAddress: okRows.filter((row) => row.address).length,
  harvestedTotal: harvested.length,
  bySource,
  sampleOk: okRows.slice(0, 3).map((row) => ({ name: row.name, address: row.address, url: row.listingUrl })),
}, null, 2));
