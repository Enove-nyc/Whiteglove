/**
 * Parse NEW directories that return named restaurants with street addresses.
 * Does not re-fetch KLBD, Dallas, Budapest, Warsaw, OU, Star-K, ORB, COR, cRc, OK, MK.
 * 15s timeouts. Skip Cloudflare. Skip shul-only Chabad.
 *
 * Run: node data/imports/kosher-food-batch/harvest-new-dirs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const UA = "Mozilla/5.0 (compatible; WhiteGloveKosherResearch/1.0)";
const TIMEOUT_MS = 15000;
const SKIP_NAME = /kosher[-\s]?style|israeli[-\s]?style|jewish[-\s]?style|type_text|color_link|filter by|party equipment/i;
const SHUL_ONLY = /^(chabad|synagogue|shul|beit|beth|centre|center|house)\b/i;
const FOOD_HINT = /restaurant|eatery|kitchen|dining|bakery|grocery|supermarket|butcher|cafe|cafeteria|takeaway|pizza|grill|deli|market|store|shop|meals?|food|cater|sushi|fish|ice cream|juice|confection/i;
const BAD_ADDR = /^(n\/a|na|-|–|none)$/i;
const STREET = /\d|street|st\.|avenue|ave|road|rd\.|blvd|boulevard|drive|dr\.|lane|ln\.|place|pl\.|tpke|turnpike|parade|head rd|head road/i;

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#038;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function blocked(text, url) {
  return /techloq|Just a moment|cf-mitigated|filter\.techloq/i.test(`${text || ""} ${url || ""}`.slice(0, 2000));
}

async function fetchT(url, opts = {}) {
  try {
    const r = await fetch(url, {
      ...opts,
      headers: { "user-agent": UA, accept: "text/html,application/json,*/*", ...(opts.headers || {}) },
      signal: AbortSignal.timeout(opts.timeout ?? TIMEOUT_MS),
      redirect: "follow",
    });
    const text = await r.text();
    if (blocked(text, r.url)) {
      console.log(`[skip-blocked] ${url}`);
      return null;
    }
    return { ok: r.ok, status: r.status, url: r.url, text };
  } catch (error) {
    console.log(`[fail] ${url} ${error.message || error}`);
    return null;
  }
}

function categoryFrom(text) {
  const t = (text || "").toLowerCase();
  if (/butcher/.test(t)) return "Butcher";
  if (/baker|bagel|ice cream/.test(t)) return "Bakery";
  if (/grocery|store|market|supermarket|shop/.test(t) && !/restaurant/.test(t)) return "Grocery";
  if (/cafe|dairy/.test(t)) return "Cafe";
  if (/take|cater|kitchen/.test(t)) return "Takeaway";
  return "Restaurant";
}

function makeRow({ sourceKey, agency, name, address, locality, country, type, listingUrl, website }) {
  const cleanName = decode(name);
  const cleanAddress = decode(address);
  if (!cleanName || SKIP_NAME.test(cleanName) || cleanName.length < 2) return null;
  if (!cleanAddress || cleanAddress.length < 6 || BAD_ADDR.test(cleanAddress)) return null;
  if (!STREET.test(cleanAddress)) return null;
  if (/<|>|type_text|color_link/.test(cleanAddress)) return null;
  if (SHUL_ONLY.test(cleanName) && !FOOD_HINT.test(`${cleanName} ${type || ""}`)) return null;
  const category = categoryFrom(`${type} ${cleanName}`);
  return {
    sourceKey,
    name: cleanName,
    address: cleanAddress,
    locality: locality || "Unknown",
    destination: locality || "Unknown",
    country,
    category,
    listingUrl,
    website: website || null,
    type: decode(type || category),
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by ${agency}. Confirm current supervision on the cited page before relying on it.`,
  };
}

function parseJsonSafe(text) {
  if (!text || !(text.trim().startsWith("{") || text.trim().startsWith("["))) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseKaEstablishments(html) {
  const rows = [];
  const listingUrl = "https://ka.org.au/establishments";
  for (const m of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const cells = [...m[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => decode(c[1]));
    if (cells.length < 4) continue;
    const [name, type, address, suburb] = cells;
    if (/^name$/i.test(name) || /sort descending/i.test(name)) continue;
    const row = makeRow({
      sourceKey: "ka-nsw",
      agency: "Kashrut Authority NSW",
      name,
      address: `${address}, ${suburb}, Australia`,
      locality: suburb && !BAD_ADDR.test(suburb) ? suburb : "Sydney",
      country: "Australia",
      type,
      listingUrl,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseQueensHtml(html) {
  const rows = [];
  const blocks = [...html.matchAll(/href="(https:\/\/queensvaad\.org\/location\/[^"]+)"[^>]*>([^<]{2,80})<\/a>([\s\S]{0,900}?)(?=href="https:\/\/queensvaad\.org\/location\/|<\/main>|$)/gi)];
  for (const m of blocks) {
    const listingUrl = m[1];
    const name = decode(m[2]);
    const chunk = m[3];
    const addr = decode(
      (chunk.match(/(?:<li[^>]*>|<p[^>]*>|<div[^>]*class="[^"]*address[^"]*"[^>]*>)[\s\S]*?(\d[\dA-Za-z\/. -]{2,8}\s+[A-Za-z][^<]{3,60})/i) || [])[1]
      || (chunk.match(/>(\d{1,5}[-–\/]?\d{0,4}\s+[A-Za-z][A-Za-z0-9 .'-]{4,50}(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Place|Pl\.?|Tpke|Turnpike|Mill Rd)[^<]{0,20})</i) || [])[1]
      || "",
    );
    const type = decode((chunk.match(/(?:Meat|Dairy|Pizza|Bakery|Cafe|Sushi|Grocery|Supermarket|Butcher|Fish|Catering|Take Out|Ice Cream|Juice|Confectionary|Events)[^<]{0,40}/) || [])[0] || "Restaurant");
    const locality = decode(
      (chunk.match(/\b(Flushing|Forest Hills|Fresh Meadows|Rego Park|Great Neck|Kew Gardens|Jamaica|Briarwood|Elmhurst|Elmont|Long Beach|New Hyde Park|Valley Stream|West Hempstead|Scarsdale|Roslyn|Plainview|New Rochelle|Bronx|Queens|Great Neck Plaza)\b/) || [])[1] || "Queens",
    );
    const row = makeRow({
      sourceKey: "queens-vaad",
      agency: "Vaad Harabonim of Queens",
      name,
      address: addr ? `${addr}, ${locality}, NY, United States` : "",
      locality,
      country: "United States",
      type,
      listingUrl,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function extractWpItem(item, sourceKey, agency, locality, country) {
  const name = decode(item.title?.rendered || item.title || item.name || "");
  const acf = item.acf && typeof item.acf === "object" ? item.acf : {};
  const loc = acf.location || acf.address || {};
  const address = decode(
    (typeof loc === "string" && loc)
    || acf.street_address
    || acf.address_line
    || [acf.street, acf.city, acf.state, acf.zip].filter(Boolean).join(", ")
    || (typeof loc === "object" && [loc.street_address, loc.address, loc.city, loc.state].filter(Boolean).join(", "))
    || "",
  );
  const content = decode(item.content?.rendered || item.excerpt?.rendered || "");
  const fromContent = (content.match(/\d{1,5}[-–\/]?\d{0,4}\s+[A-Za-z][A-Za-z0-9 .'-]{4,50}(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Blvd|Drive|Turnpike|Tpke)[^,]{0,20}/i) || [])[0] || "";
  return makeRow({
    sourceKey,
    agency,
    name,
    address: address || (fromContent ? `${fromContent}, ${locality}, ${country}` : ""),
    locality: acf.city || (typeof loc === "object" && loc.city) || locality,
    country,
    type: item.type || acf.type || "Restaurant",
    listingUrl: item.link || item.url || "",
    website: acf.website || item.website || null,
  });
}

async function harvestWpCpt(base, typeHint, sourceKey, agency, locality, country) {
  const typesR = await fetchT(`${base.replace(/\/$/, "")}/wp-json/wp/v2/types`);
  const typesJson = parseJsonSafe(typesR?.text);
  const typeNames = typesJson ? Object.keys(typesJson) : [];
  const interesting = typeNames.filter((t) => /restaurant|estab|dining|location|kosher|food|eater|listing|business|directory/i.test(t));
  if (typeHint) interesting.unshift(typeHint);
  console.log("[wp]", base.replace(/https?:\/\//, "").slice(0, 40), interesting.join(",") || typeNames.slice(0, 8).join(","));
  const rows = [];
  for (const type of [...new Set(interesting)].slice(0, 4)) {
    for (let page = 1; page <= 8; page += 1) {
      const list = await fetchT(`${base.replace(/\/$/, "")}/wp-json/wp/v2/${encodeURIComponent(type)}?per_page=100&page=${page}`);
      const items = parseJsonSafe(list?.text);
      if (!Array.isArray(items) || !items.length) break;
      for (const item of items) {
        const row = extractWpItem(item, sourceKey, agency, locality, country);
        if (row) rows.push(row);
      }
      if (items.length < 100) break;
    }
  }
  return rows;
}

async function harvestOsmIsrael() {
  const query = `[out:json][timeout:12];
nwr["diet:kosher"="yes"]["website"]["addr:street"](29.4,34.2,33.4,35.9);
out tags 400;`;
  const r = await fetchT("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  const json = parseJsonSafe(r?.text);
  if (!json?.elements) {
    console.log("[osm-il] skip", r?.status);
    return [];
  }
  const rows = [];
  for (const el of json.elements) {
    const t = el.tags || {};
    const name = t.name || t["name:en"] || t["name:he"];
    let website = t.website || t["contact:website"];
    if (!name || !website) continue;
    if (!/^https?:/i.test(website)) website = `https://${website}`;
    try {
      const host = new URL(website).hostname.replace(/^www\./, "");
      if (/google\.|openstreetmap|overpass|photon/.test(host)) continue;
    } catch {
      continue;
    }
    const address = [t["addr:housenumber"], t["addr:street"], t["addr:city"], t["addr:postcode"]].filter(Boolean).join(" ");
    const row = makeRow({
      sourceKey: "named-kosher-website",
      agency: "the establishment's own site",
      name,
      address,
      locality: t["addr:city"] || "Israel",
      country: "Israel",
      type: t.amenity || t.shop || "Restaurant",
      listingUrl: website,
      website,
    });
    if (row) rows.push(row);
  }
  console.log("[osm-il]", rows.length, "elements", json.elements.length);
  return rows;
}

function merge(existing, incoming) {
  const seen = new Set(existing.map((row) => `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`));
  let added = 0;
  const bySource = {};
  for (const row of incoming) {
    const key = `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`;
    if (seen.has(key)) continue;
    seen.add(key);
    existing.push(row);
    added += 1;
    bySource[row.sourceKey] = (bySource[row.sourceKey] || 0) + 1;
  }
  return { added, bySource };
}

async function main() {
  const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
  console.log("before", harvested.length);

  const [kaPage, queensPage, queensWp, osm, fiveTowns, kehilla] = await Promise.all([
    fetchT("https://ka.org.au/establishments"),
    fetchT("https://queensvaad.org/kashrus/certified-establishments/"),
    harvestWpCpt("https://queensvaad.org", "location", "queens-vaad", "Vaad Harabonim of Queens", "Queens", "United States"),
    harvestOsmIsrael(),
    harvestWpCpt("https://www.5tvaad.org", "location", "named-kosher-website", "Vaad of the Five Towns", "Five Towns", "United States"),
    harvestWpCpt("https://kehillakosher.org", "restaurant", "rcc-california", "Kehilla Kosher", "Los Angeles", "United States"),
  ]);

  const ka = kaPage?.ok ? parseKaEstablishments(kaPage.text) : [];
  const queensHtml = queensPage?.ok ? parseQueensHtml(queensPage.text) : [];
  console.log("[ka]", ka.length, kaPage?.status);
  console.log("[queens-html]", queensHtml.length, queensPage?.status);
  console.log("[queens-wp]", queensWp.length);

  const incoming = [...ka, ...queensHtml, ...queensWp, ...osm, ...fiveTowns, ...kehilla];
  const { added, bySource } = merge(harvested, incoming);
  fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
  console.log(JSON.stringify({
    added,
    total: harvested.length,
    counts: {
      ka: ka.length,
      queensHtml: queensHtml.length,
      queensWp: queensWp.length,
      osm: osm.length,
      fiveTowns: fiveTowns.length,
      kehilla: kehilla.length,
    },
    newBySource: bySource,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .then(() => process.exit(0));
