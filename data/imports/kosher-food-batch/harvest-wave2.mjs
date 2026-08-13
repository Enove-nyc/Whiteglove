/**
 * Second-wave harvest: MK, Kosher Miami, OSM (longer timeout), Israel open data,
 * extra certifier directories. Appends unique rows to _harvested.json.
 *
 * Run: node data/imports/kosher-food-batch/harvest-wave2.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const RAW = path.join(__dirname, "_raw");
const UA = "WhiteGloveKosherResearch/1.0";
const SKIP_NAME = /kosher[-\s]?style|israeli[-\s]?style|jewish[-\s]?style/i;

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#038;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchT(url, opts = {}) {
  const timeout = opts.timeout ?? 25000;
  const r = await fetch(url, {
    ...opts,
    signal: AbortSignal.timeout(timeout),
    headers: { "user-agent": UA, ...(opts.headers || {}) },
    redirect: "follow",
  });
  return { ok: r.ok, status: r.status, url: r.url, text: await r.text() };
}

async function tryFetch(label, url, opts = {}) {
  try {
    const r = await fetchT(url, opts);
    console.log(`[${label}] ${r.status} ${r.text.length}b`);
    return r;
  } catch (error) {
    console.log(`[${label}] FAIL ${error.message || error}`);
    return null;
  }
}

function categoryFrom(text) {
  const t = (text || "").toLowerCase();
  if (/butcher|meat market/.test(t)) return "Butcher";
  if (/baker|bagel|pastry/.test(t)) return "Bakery";
  if (/grocery|supermarket|market|store|shop/.test(t) && !/restaurant/.test(t)) return "Grocery";
  if (/cafe|coffee|ice cream/.test(t)) return "Cafe";
  if (/take\s*out|takeaway|cater/.test(t)) return "Takeaway";
  return "Restaurant";
}

function parsePlace(address, hintLocality = "", hintCountry = "") {
  const raw = decode(address);
  let locality = hintLocality;
  let country = hintCountry;
  if (/israel|ירושלים|תל אביב/i.test(raw) || country === "Israel") country = "Israel";
  else if (/canada|quebec|ontario|montreal|toronto/i.test(raw) || country === "Canada") country = "Canada";
  else if (/united kingdom|\buk\b|london/i.test(raw)) country = "United Kingdom";
  else if (/\b[A-Z]{2}\s+\d{5}\b|\bUSA\b/.test(raw) || country === "United States") country = "United States";
  const us = raw.match(/\b([A-Z][a-zA-Z .'-]+),?\s+([A-Z]{2})\s+\d{5}/);
  if (us && !locality) locality = us[1].trim();
  if (!locality) {
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) locality = parts[parts.length - 2].replace(/\b[A-Z]{2}\s+\d{5}.*$/, "").replace(/\bUSA\b/i, "").trim();
  }
  if (!country) country = hintCountry || "United States";
  if (!locality) locality = hintLocality || "Unknown";
  return { address: raw, locality, country };
}

function makeRow({ sourceKey, agency, name, address, locality, country, type, listingUrl, website, summary }) {
  if (!name || SKIP_NAME.test(name) || SKIP_NAME.test(type || "")) return null;
  if (!address || address.length < 6) return null;
  if (/type_text|color_link|<|>/.test(address)) return null;
  const place = parsePlace(address, locality, country);
  if (place.locality === "Unknown") return null;
  const category = categoryFrom(`${type} ${name}`);
  return {
    sourceKey,
    name: decode(name),
    address: place.address,
    locality: place.locality,
    destination: place.locality,
    country: place.country,
    category,
    listingUrl,
    website: website && /^https?:/i.test(website) ? website : null,
    type: decode(type || category),
    summary:
      summary ||
      `${decode(name)} is listed as a kosher ${category.toLowerCase()} by ${agency}. Confirm current supervision on the cited directory before relying on it.`,
  };
}

function parseMkBlocks(html) {
  const rows = [];
  const re =
    /<h4><a href="(https:\/\/mk\.ca\/dining-kosher\/[^"]+)">([^<]+)<\/a><\/h4>[\s\S]*?type-place[\s\S]*?<p>([^<]*)<\/p>[\s\S]*?address-place[\s\S]*?(?:&nbsp;|\u00a0)([^<]+)<\/p>/gi;
  for (const m of html.matchAll(re)) {
    const row = makeRow({
      sourceKey: "mk-dining",
      agency: "MK Kosher",
      name: m[2],
      address: m[4],
      locality: "Montreal",
      country: "Canada",
      type: m[3],
      listingUrl: m[1],
    });
    if (row) rows.push(row);
  }
  return rows;
}

async function harvestMk() {
  const local = fs.readFileSync(path.join(RAW, "mk.html"), "utf8");
  const rows = parseMkBlocks(local);
  const first = await tryFetch("mk-ajax", "https://mk.ca/wp-admin/admin-ajax.php", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "action=dining_ajax_filter_search&search=&address=&category=",
  });
  if (!first?.ok) return rows;
  let json;
  try {
    json = JSON.parse(first.text);
  } catch {
    return rows;
  }
  rows.push(...parseMkBlocks(json.content || ""));
  const max = Number(json.max_page) || 1;
  const query = typeof json.posts === "string" ? json.posts : JSON.stringify(json.posts || {});
  for (let page = 1; page < max && page < 30; page += 1) {
    const next = await tryFetch(`mk-p${page + 1}`, "https://mk.ca/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "more_post_ajax", query, page: String(page) }).toString(),
    });
    if (!next?.ok) break;
    try {
      const njson = JSON.parse(next.text);
      rows.push(...parseMkBlocks(njson.content || ""));
    } catch {
      rows.push(...parseMkBlocks(next.text));
    }
  }
  if (rows.length < 20) {
    const sm = await tryFetch("mk-sitemap", "https://mk.ca/dining-kosher-sitemap.xml");
    if (sm?.ok) {
      const urls = [...sm.text.matchAll(/<loc>(https:\/\/mk\.ca\/dining-kosher\/[^<]+)<\/loc>/g)].map((m) => m[1]);
      console.log("[mk-sitemap] urls", urls.length);
      for (const url of urls.slice(0, 200)) {
        const page = await tryFetch(`mk-pg ${url.split("/").slice(-2, -1)}`, url, { timeout: 12000 });
        if (!page?.ok) continue;
        const name = decode((page.text.match(/<h1[^>]*>([^<]+)<\/h1>/i) || page.text.match(/<title>([^<]+)<\/title>/i) || [])[1] || "");
        const addr = decode(
          (page.text.match(/address-place[\s\S]{0,200}?(?:&nbsp;|\u00a0)([^<]+)/i) ||
            page.text.match(/itemprop="streetAddress"[^>]*>([^<]+)/i) ||
            [])[1] || "",
        );
        const row = makeRow({
          sourceKey: "mk-dining",
          agency: "MK Kosher",
          name: name.replace(/ - MK.*$/i, "").trim(),
          address: addr,
          locality: "Montreal",
          country: "Canada",
          type: "Restaurant",
          listingUrl: url,
        });
        if (row) rows.push(row);
      }
    }
  }
  return rows;
}

function walkMiami(node, acc) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) walkMiami(item, acc);
    return;
  }
  if (typeof node !== "object") return;
  const name = node.name || node.title || node.company || node.establishment || node.post_title;
  const address =
    node.address ||
    node.street ||
    [node.address1, node.city, node.state, node.zip].filter(Boolean).join(", ") ||
    node.formatted_address;
  if (name && address && String(address).length > 8) {
    acc.push({ ...node, _name: name, _address: address });
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === "object") walkMiami(value, acc);
  }
}

async function harvestMiami() {
  const r = await tryFetch("miami", "https://koshermiami.org/wp-admin/admin-ajax.php?action=getLocations", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "",
    timeout: 30000,
  });
  if (!r?.ok || r.text === "0") return [];
  let json;
  try {
    json = JSON.parse(r.text);
  } catch {
    fs.writeFileSync(path.join(RAW, "miami-ajax.txt"), r.text.slice(0, 5000));
    return [];
  }
  fs.writeFileSync(path.join(RAW, "miami-ajax-keys.json"), JSON.stringify({ keys: Object.keys(json), type: typeof json.locations }, null, 2));
  const found = [];
  walkMiami(json, found);
  const rows = [];
  for (const loc of found) {
    const website = loc.website || loc.url || loc.permalink;
    const listing =
      loc.permalink ||
      loc.link ||
      (loc.id ? `https://koshermiami.org/establishments/?est=${loc.id}` : "https://koshermiami.org/establishments/");
    const row = makeRow({
      sourceKey: "miami-establishments",
      agency: "Kosher Miami",
      name: loc._name,
      address: loc._address,
      locality: loc.city || "Miami",
      country: "United States",
      type: loc.type || loc.category || loc.est_type || "Restaurant",
      listingUrl: listing,
      website: website && /^https?:/i.test(String(website)) ? website : null,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseOsmElements(json, sourceKey = "named-kosher-website") {
  const rows = [];
  for (const el of json.elements || []) {
    const t = el.tags || {};
    const name = t.name || t["name:en"] || t["name:he"];
    let website = t.website || t["contact:website"] || t["contact:facebook"];
    if (!name) continue;
    if (SKIP_NAME.test(name)) continue;
    if (!website) continue;
    if (!/^https?:/i.test(website)) website = `https://${website}`;
    try {
      const host = new URL(website).hostname.replace(/^www\./, "");
      if (/google\.|openstreetmap|overpass|photon/.test(host)) continue;
    } catch {
      continue;
    }
    const amenity = t.amenity || t.shop || "";
    if (!/restaurant|cafe|fast_food|bakery|butcher|ice_cream|supermarket|deli|food/i.test(amenity + name)) continue;
    const countryCode = (t["addr:country"] || "").toUpperCase();
    const isIsrael = countryCode === "IL" || /israel|ירושלים|תל אביב|חיפה|בני ברק/i.test(`${t["addr:city"] || ""} ${t["addr:country"] || ""}`);
    const clearlyKosher = /\bkosher\b|כשר|כשרות/i.test(name) || t.kashrut || t["diet:kosher"] === "yes";
    if (!clearlyKosher) continue;
    if (!isIsrael && !/\bkosher\b|כשר/i.test(name)) continue;
    const address = [
      t["addr:housenumber"],
      t["addr:street"],
      t["addr:city"] || t["addr:place"],
      t["addr:state"],
      t["addr:postcode"],
      t["addr:country"],
    ]
      .filter(Boolean)
      .join(" ");
    if (!address) continue;
    const country = isIsrael
      ? "Israel"
      : countryCode === "US"
        ? "United States"
        : countryCode === "CA"
          ? "Canada"
          : countryCode === "GB"
            ? "United Kingdom"
            : countryCode === "FR"
              ? "France"
              : t["addr:country"] || "United States";
    const row = makeRow({
      sourceKey,
      agency: "the establishment's own site",
      name,
      address,
      locality: t["addr:city"] || t["addr:place"] || (isIsrael ? "Israel" : ""),
      country,
      type: amenity || "Restaurant",
      listingUrl: website,
      website,
      summary: `${name} is named as a kosher food establishment on its own website. Confirm current supervision before relying on it.`,
    });
    if (row) rows.push(row);
  }
  return rows;
}

async function harvestOsm() {
  const queries = [
    ['osm-us', `[out:json][timeout:60];
area["ISO3166-1"="US"][admin_level=2]->.a;
nwr(area.a)["diet:kosher"="yes"]["amenity"~"restaurant|cafe|fast_food|bakery|butcher|ice_cream"]["website"]["name"~"[Kk]osher"];
out tags center;`],
    ['osm-il', `[out:json][timeout:60];
area["ISO3166-1"="IL"][admin_level=2]->.a;
nwr(area.a)["diet:kosher"="yes"]["amenity"~"restaurant|cafe|fast_food|bakery|butcher"]["website"]["name"~"kosher|כשר", i];
out tags center;`],
    ['osm-world-named', `[out:json][timeout:60];
nwr["diet:kosher"="yes"]["name"~"[Kk]osher"]["website"]["amenity"~"restaurant|cafe|fast_food|bakery|butcher|ice_cream"];
out tags center;`],
  ];
  const rows = [];
  for (const [label, query] of queries) {
    const r = await tryFetch(label, "https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      timeout: 90000,
    });
    if (!r?.ok) {
      const r2 = await tryFetch(`${label}-kumi`, "https://overpass.kumi.systems/api/interpreter", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        timeout: 90000,
      });
      if (!r2?.ok) continue;
      try {
        rows.push(...parseOsmElements(JSON.parse(r2.text)));
      } catch {
        /* skip */
      }
      continue;
    }
    try {
      const json = JSON.parse(r.text);
      console.log(`[${label}] elements`, (json.elements || []).length);
      rows.push(...parseOsmElements(json));
    } catch (error) {
      console.log(`[${label}] parse fail`, error.message);
    }
  }
  return rows;
}

async function harvestIsraelOpenData() {
  const rows = [];
  const searches = [
    "https://data.gov.il/api/3/action/package_search?q=%D7%9B%D7%A9%D7%A8%D7%95%D7%AA",
    "https://data.gov.il/api/3/action/package_search?q=kashrut",
    "https://data.gov.il/api/3/action/package_search?q=%D7%91%D7%AA%D7%99+%D7%A2%D7%A1%D7%A7+%D7%9B%D7%A9%D7%A8",
  ];
  for (const url of searches) {
    const r = await tryFetch("govil", url, { timeout: 20000 });
    if (!r?.ok) continue;
    try {
      const json = JSON.parse(r.text);
      const packages = json.result?.results || [];
      console.log("[govil] packages", packages.length, packages.map((p) => p.title || p.name).slice(0, 8));
      for (const pkg of packages) {
        const resources = pkg.resources || [];
        for (const res of resources) {
          if (!/csv|json|xls/i.test(res.format || res.url || "")) continue;
          const dataUrl = res.url;
          if (!dataUrl) continue;
          const d = await tryFetch(`govil-res ${pkg.name}`, dataUrl, { timeout: 30000 });
          if (!d?.ok) continue;
          if (/csv/i.test(res.format || dataUrl)) {
            const lines = d.text.split(/\r?\n/).slice(0, 5000);
            const header = lines[0]?.split(/,|;|\t/) || [];
            const nameIdx = header.findIndex((h) => /שם|name|esek|business/i.test(h));
            const addrIdx = header.findIndex((h) => /כתובת|address|רחוב/i.test(h));
            const cityIdx = header.findIndex((h) => /ישוב|city|עיר/i.test(h));
            if (nameIdx < 0) continue;
            for (const line of lines.slice(1)) {
              const cols = line.split(/,|;|\t/);
              const name = decode(cols[nameIdx] || "");
              const city = decode(cols[cityIdx] || "Israel");
              const address = decode(cols[addrIdx] || "") || city;
              const row = makeRow({
                sourceKey: "israel-kashrut-opendata",
                agency: "Israel open kashrut data",
                name,
                address: `${address}, ${city}, Israel`,
                locality: city,
                country: "Israel",
                type: "Restaurant",
                listingUrl: pkg.url || `https://data.gov.il/dataset/${pkg.name}`,
              });
              if (row) rows.push(row);
            }
          }
        }
      }
    } catch (error) {
      console.log("[govil] parse", error.message);
    }
  }
  return rows;
}

async function harvestKlbd() {
  const r = await tryFetch("klbd-dir", "https://www.kosher.org.uk/directory/restaurants", { timeout: 25000 });
  if (!r?.ok) return [];
  fs.writeFileSync(path.join(RAW, "klbd.html"), r.text);
  const rows = [];
  const cards = [...r.text.matchAll(/<(?:article|div)[^>]{0,80}(?:restaurant|listing|views-row)[^>]*>[\s\S]{0,1200}?<\/(?:article|div)>/gi)];
  console.log("[klbd] cards", cards.length);
  const nameAddr = [...r.text.matchAll(/<a[^>]+href="(\/directory\/[^"]+|https?:\/\/www\.kosher\.org\.uk\/directory\/[^"]+)"[^>]*>([^<]{3,80})<\/a>[\s\S]{0,500}?(\d[^<]{6,90})/gi)];
  for (const m of nameAddr) {
    const href = m[1].startsWith("http") ? m[1] : `https://www.kosher.org.uk${m[1]}`;
    const row = makeRow({
      sourceKey: "klbd-restaurants",
      agency: "KLBD",
      name: m[2],
      address: `${decode(m[3])}, United Kingdom`,
      locality: "London",
      country: "United Kingdom",
      type: "Restaurant",
      listingUrl: href,
    });
    if (row) rows.push(row);
  }
  return rows;
}

async function harvestExtraDirectories() {
  const pages = [
    ["scroll-k", "https://www.scrollk.org/", "scroll-k-denver"],
    ["kosher-au", "https://www.kosher.org.au/consumers/kosher-food-guide/", "kosher-australia"],
    ["dallas", "https://www.dallaskosher.org/restaurants", "dallas-kosher"],
    ["rcc", "https://rccvaad.org/kosher-establishments/", "rcc-california"],
    ["jhb", "https://www.uos.co.za/kosher/", "beth-din-johannesburg"],
    ["ka-nsw", "https://www.ka.org.au/eating-out", "ka-nsw"],
  ];
  const rows = [];
  for (const [label, url] of pages) {
    const r = await tryFetch(label, url, { timeout: 20000 });
    if (!r?.ok) continue;
    fs.writeFileSync(path.join(RAW, `${label}.html`), r.text.slice(0, 400000));
  }
  return rows;
}

function merge(existing, incoming) {
  const seen = new Set(existing.map((row) => `${row.sourceKey}::${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}`));
  let added = 0;
  for (const row of incoming) {
    const key = `${row.sourceKey}::${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    existing.push(row);
    added += 1;
  }
  return added;
}

const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
console.log("before", harvested.length);

const [mk, miami, osm, govil, klbd] = await Promise.all([
  harvestMk(),
  harvestMiami(),
  harvestOsm(),
  harvestIsraelOpenData(),
  harvestKlbd(),
]);
await harvestExtraDirectories();

console.log("wave2", {
  mk: mk.length,
  miami: miami.length,
  osm: osm.length,
  govil: govil.length,
  klbd: klbd.length,
});

const added = merge(harvested, [...mk, ...miami, ...osm, ...govil, ...klbd]);
fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
const bySource = {};
for (const row of harvested) bySource[row.sourceKey] = (bySource[row.sourceKey] || 0) + 1;
console.log(JSON.stringify({ added, total: harvested.length, bySource }, null, 2));
process.exit(0);
