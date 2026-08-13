/**
 * New unique sources toward 2000. Does not re-fetch KLBD, Dallas,
 * Budapest, Warsaw, or Hamsza. 15s timeouts. Skip blocked hosts.
 *
 * Run: node data/imports/kosher-food-batch/harvest-wave4.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const RAW = path.join(__dirname, "_raw");
const UA = "Mozilla/5.0 (compatible; WhiteGloveKosherResearch/1.0)";
const TIMEOUT_MS = 15000;
const SKIP_NAME = /kosher[-\s]?style|israeli[-\s]?style|jewish[-\s]?style|type_text|color_link|filter by/i;

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
  if (!cleanAddress || cleanAddress.length < 6) return null;
  if (/<|>|type_text|color_link/.test(cleanAddress)) return null;
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

function parseNameAddressHtml(html, sourceKey, agency, locality, country, listingUrl) {
  const rows = [];
  const patterns = [
    /<h[23][^>]*>([^<]{2,80})<\/h[23]>[\s\S]{0,400}?(\d{1,5}[^<]{8,100})/gi,
    /<(?:strong|b|h4)[^>]*>([^<]{2,80})<\/(?:strong|b|h4)>[\s\S]{0,300}?(\d{1,5}\s+[A-Za-z][^<]{6,90})/gi,
  ];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      const row = makeRow({
        sourceKey,
        agency,
        name: m[1],
        address: `${decode(m[2])}, ${locality}, ${country}`,
        locality,
        country,
        type: "Restaurant",
        listingUrl,
      });
      if (row) rows.push(row);
    }
  }
  return rows;
}

function walkMiami(node, rows) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) walkMiami(item, rows);
    return;
  }
  if (typeof node !== "object") return;
  const name = node.name || node.title || node.company_name || node.location_name;
  const address = node.address || [node.street, node.street_address, node.city, node.state, node.zip, node.postal].filter(Boolean).join(", ");
  if (name && address && String(address).length >= 6) {
    const row = makeRow({
      sourceKey: "miami-establishments",
      agency: "Kosher Miami",
      name,
      address,
      locality: node.city || "Miami",
      country: "United States",
      type: node.type || node.category || node.establishment_type || "Restaurant",
      listingUrl: node.url || node.permalink || node.link || "https://koshermiami.org/establishments/",
      website: node.website || null,
    });
    if (row) rows.push(row);
    return;
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === "object") walkMiami(value, rows);
  }
}

async function harvestMiami() {
  const r = await fetchT("https://koshermiami.org/wp-admin/admin-ajax.php?action=getLocations", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "location=",
  });
  if (!r?.ok || r.text === "0" || r.text.trim().startsWith("<")) {
    console.log("[miami] skip", r?.status);
    return [];
  }
  try {
    const json = JSON.parse(r.text);
    const rows = [];
    walkMiami(json.locations, rows);
    walkMiami(json.fullList, rows);
    walkMiami(json.listView, rows);
    console.log("[miami]", rows.length);
    return rows;
  } catch (error) {
    console.log("[miami] parse", error.message);
    return [];
  }
}

async function harvestOsm() {
  const query = `[out:json][timeout:12];
nwr["diet:kosher"="yes"]["amenity"~"restaurant|cafe|fast_food|bakery|butcher"]["addr:street"]["website"];
out tags center;`;
  const r = await fetchT("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!r?.ok || r.text.trim().startsWith("<")) {
    console.log("[osm] skip");
    return [];
  }
  try {
    const json = JSON.parse(r.text);
    const rows = [];
    for (const el of json.elements || []) {
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
      const address = [t["addr:housenumber"], t["addr:street"], t["addr:city"], t["addr:postcode"], t["addr:country"]].filter(Boolean).join(" ");
      if (!address) continue;
      const cc = (t["addr:country"] || "").toUpperCase();
      const country = cc === "IL" ? "Israel" : cc === "GB" ? "United Kingdom" : cc === "FR" ? "France" : cc === "US" ? "United States" : cc === "CA" ? "Canada" : t["addr:country"] || "Unknown";
      const row = makeRow({
        sourceKey: "named-kosher-website",
        agency: "the establishment's own site",
        name,
        address,
        locality: t["addr:city"] || country,
        country,
        type: t.amenity || "Restaurant",
        listingUrl: website,
        website,
      });
      if (row) rows.push(row);
    }
    console.log("[osm]", rows.length, "elements", (json.elements || []).length);
    return rows;
  } catch (error) {
    console.log("[osm] parse", error.message);
    return [];
  }
}

async function harvestIsrael() {
  const r = await fetchT("https://data.gov.il/api/3/action/package_search?q=%D7%9B%D7%A9%D7%A8%D7%95%D7%AA&rows=20");
  if (!r?.ok || r.text.trim().startsWith("<")) {
    console.log("[israel] skip search");
    return [];
  }
  const rows = [];
  try {
    const json = JSON.parse(r.text);
    const packages = json.result?.results || [];
    console.log("[israel] packages", packages.map((p) => p.name));
    for (const pkg of packages) {
      if (pkg.name === "kosherbusiness") continue;
      for (const res of pkg.resources || []) {
        if (!res.datastore_active && !/csv|json/i.test(`${res.format || ""} ${res.url || ""}`)) continue;
        const id = res.id;
        const ds = await fetchT(`https://data.gov.il/api/3/action/datastore_search?resource_id=${id}&limit=5000`);
        if (!ds?.ok || ds.text.trim().startsWith("<")) continue;
        try {
          const data = JSON.parse(ds.text);
          const records = data.result?.records || [];
          const fields = (data.result?.fields || []).map((f) => f.id);
          console.log("[israel-res]", pkg.name, records.length, fields.slice(0, 8));
          if (!records[0]) continue;
          const nameKey = fields.find((f) => /שם|name|esek|business|mosad/i.test(f)) || Object.keys(records[0]).find((k) => k !== "_id");
          const addrKey = fields.find((f) => /כתובת|address|רחוב|street/i.test(f));
          const cityKey = fields.find((f) => /ישוב|city|עיר/i.test(f));
          for (const rec of records) {
            const row = makeRow({
              sourceKey: "israel-kashrut-opendata",
              agency: "Israel open kashrut data",
              name: rec[nameKey],
              address: `${addrKey ? rec[addrKey] : ""} ${cityKey ? rec[cityKey] : ""} Israel`.trim(),
              locality: cityKey ? rec[cityKey] : "Israel",
              country: "Israel",
              type: "Restaurant",
              listingUrl: `https://data.gov.il/dataset/${pkg.name}`,
            });
            if (row) rows.push(row);
          }
        } catch {
          /* skip resource */
        }
      }
    }
  } catch (error) {
    console.log("[israel] parse", error.message);
  }
  console.log("[israel]", rows.length);
  return rows;
}

async function harvestHtmlDirectories() {
  const pages = [
    ["https://rccvaad.org/kosher-establishments/", "rcc-california", "RCC Vaad", "Los Angeles", "United States"],
    ["https://www.federation.org.uk/kashrus/", "federation-kashrus", "Federation Kashrus", "London", "United Kingdom"],
    ["https://kvhkosher.org/restaurants/", "kvh-new-england", "KVH Kosher", "Boston", "United States"],
    ["https://kvhkosher.org/", "kvh-new-england", "KVH Kosher", "Boston", "United States"],
    ["https://www.kosheratlanta.org/restaurants/", "atlanta-kosher", "Atlanta Kashruth Commission", "Atlanta", "United States"],
    ["https://www.kosheratlanta.org/", "atlanta-kosher", "Atlanta Kashruth Commission", "Atlanta", "United States"],
    ["https://scrollk.org/kosher-food-establishments/", "named-kosher-website", "Scroll K", "Denver", "United States"],
    ["https://www.mbd.org.uk/kosher/", "federation-kashrus", "Manchester Beth Din", "Manchester", "United Kingdom"],
    ["https://www.manchesterbethdin.com/kosher", "federation-kashrus", "Manchester Beth Din", "Manchester", "United Kingdom"],
    ["https://www.theus.org.uk/article/eating-out", "federation-kashrus", "United Synagogue", "London", "United Kingdom"],
    ["https://thailandkosher.com/product-tag/kosher-restaurants-in-bangkok/", "chabad-food-asia", "Chabad of Thailand", "Bangkok", "Thailand"],
    ["https://thailandkosher.com/product-tag/kosher-restaurants-in-phuket/", "chabad-food-asia", "Chabad of Thailand", "Phuket", "Thailand"],
  ];
  const fetched = await Promise.all(pages.map(async ([url, sourceKey, agency, locality, country]) => {
    const r = await fetchT(url);
    if (!r?.ok) return [];
    const parsed = parseNameAddressHtml(r.text, sourceKey, agency, locality, country, url);
    console.log("[dir]", locality, parsed.length, url.slice(0, 60));
    return parsed;
  }));
  return fetched.flat();
}

async function harvestMkLeftovers() {
  const r = await fetchT("https://mk.ca/wp-admin/admin-ajax.php", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "action=dining_ajax_filter_search&search=&address=&category=",
  });
  if (!r?.ok || r.text.trim().startsWith("<")) {
    console.log("[mk] skip");
    return [];
  }
  try {
    const json = JSON.parse(r.text);
    const max = Number(json.max_page) || 1;
    console.log("[mk] max_page", max);
    const html = json.content || "";
    const re = /<h4><a href="(https:\/\/mk\.ca\/dining-kosher\/[^"]+\/)">([^<]+)<\/a><\/h4>[\s\S]{0,500}?<div class='address-place'>[\s\S]*?<p>[^<]*<\/i>&nbsp;([^<]+)<\/p>/g;
    const rows = [];
    for (const m of html.matchAll(re)) {
      const row = makeRow({
        sourceKey: "mk-dining",
        agency: "MK Kosher",
        name: m[2],
        address: decode(m[3]),
        locality: "Montreal",
        country: "Canada",
        type: "Restaurant",
        listingUrl: m[1],
      });
      if (row) rows.push(row);
    }
    console.log("[mk]", rows.length);
    return rows;
  } catch (error) {
    console.log("[mk] parse", error.message);
    return [];
  }
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
  const [miami, osm, israel, dirs, mk] = await Promise.all([
    harvestMiami(),
    harvestOsm(),
    harvestIsrael(),
    harvestHtmlDirectories(),
    harvestMkLeftovers(),
  ]);
  const { added, bySource } = merge(harvested, [...miami, ...osm, ...israel, ...dirs, ...mk]);
  fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
  console.log(JSON.stringify({
    added,
    total: harvested.length,
    counts: {
      miami: miami.length,
      osm: osm.length,
      israel: israel.length,
      dirs: dirs.length,
      mk: mk.length,
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
