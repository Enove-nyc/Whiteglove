/**
 * Harvest named kosher establishments from certifier directories already
 * fetched, plus public JSON/AJAX with a 15s timeout. Never calls Google Places.
 *
 * Run: node data/imports/kosher-food-batch/harvest.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(__dirname, "_raw");
const TIMEOUT_MS = 15000;
const UA = "WhiteGloveKosherResearch/1.0";

const SKIP_TYPE = /gift\s*basket|slurpee|senior resident|conference & retreat|wholesale meat|factory|co-?packer|hospital(?!ity)/i;
const SKIP_NAME = /kosher[-\s]?style|israeli[-\s]?style|jewish[-\s]?style|kosher style/i;
const FOOD_OK = /restaurant|bakery|butcher|grocery|supermarket|cafe|caf[eé]|take\s*out|takeaway|deli|pizza|bagel|doughnut|donut|ice cream|coffee|fish|caterer|market|grill|sushi|shawarma|falafel|steak|diner|bistro|eatery|food|kitchen|pizz|meat|dairy|pareve|parve/i;

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\\u00e9/g, "é")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html) {
  return decode(html.replace(/<[^>]+>/g, " "));
}

async function fetchT(url, opts = {}) {
  const ctrl = AbortSignal.timeout(opts.timeout ?? TIMEOUT_MS);
  const r = await fetch(url, {
    ...opts,
    signal: ctrl,
    headers: { "user-agent": UA, ...(opts.headers || {}) },
    redirect: "follow",
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, url: r.url, text };
}

async function tryFetch(label, url, opts = {}) {
  try {
    const r = await fetchT(url, opts);
    console.log(`[${label}] ${r.status} ${r.text.length}b`);
    return r;
  } catch (error) {
    console.log(`[${label}] FAIL ${error.name || ""} ${error.message || error}`);
    return null;
  }
}

function categoryFrom(text) {
  const t = (text || "").toLocaleLowerCase("en");
  if (/butcher|meat market|fleisch/.test(t)) return "Butcher";
  if (/baker|bagel|doughnut|donut|pastry/.test(t)) return "Bakery";
  if (/grocery|supermarket|market|store|shop/.test(t) && !/restaurant/.test(t)) return "Grocery";
  if (/cafe|caf[eé]|coffee|ice cream/.test(t)) return "Cafe";
  if (/take\s*out|takeaway|cater/.test(t)) return "Takeaway";
  return "Restaurant";
}

const US_STATE = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DC: "District of Columbia", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", IA: "Iowa", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  MA: "Massachusetts", MD: "Maryland", ME: "Maine", MI: "Michigan", MN: "Minnesota",
  MO: "Missouri", MS: "Mississippi", MT: "Montana", NC: "North Carolina",
  ND: "North Dakota", NE: "Nebraska", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NV: "Nevada", NY: "New York", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VA: "Virginia",
  VT: "Vermont", WA: "Washington", WI: "Wisconsin", WV: "West Virginia", WY: "Wyoming",
};

function parsePlace(address, hintLocality = "", hintCountry = "") {
  const raw = decode(address).replace(/<br\s*\/?>/gi, ", ");
  const countryHint = hintCountry || (/israel/i.test(raw) ? "Israel"
    : /canada|quebec|ontario|montreal|toronto/i.test(raw) ? "Canada"
    : /united kingdom|\buk\b|london|manchester/i.test(raw) ? "United Kingdom"
    : /australia/i.test(raw) ? "Australia"
    : /usa\b|united states|\b[A-Z]{2}\s+\d{5}/.test(raw) ? "United States"
    : "");
  let locality = hintLocality;
  let country = countryHint;
  const us = raw.match(/\b([A-Z][a-zA-Z .'-]+),?\s+([A-Z]{2})\s+\d{5}(?:-\d{4})?\b/);
  if (us) {
    locality = locality || us[1].replace(/\s+/g, " ").trim();
    country = "United States";
  }
  const israel = raw.match(/\b(Jerusalem|Tel Aviv|Netanya|Haifa|Raanana|Ra'anana|Beit Shemesh|Ashdod|Eilat|Herzliya|Petach Tikva|Petah Tikva|Bnei Brak|Modiin|Modi'in)\b/i);
  if (israel) {
    locality = locality || israel[1];
    country = "Israel";
  }
  if (/montreal|côte saint-luc|cote saint-luc|ville saint|westmount|hampstead|outremont/i.test(raw)) {
    locality = locality || (raw.match(/Montreal|Côte Saint-Luc|Cote Saint-Luc|Ville Saint[- ]Laurent|Westmount|Hampstead|Outremont/i) || ["Montreal"])[0];
    country = "Canada";
  }
  if (/toronto|thornhill|vaughan|north york|york,\s*on/i.test(raw)) {
    locality = locality || (raw.match(/Toronto|Thornhill|Vaughan|North York/i) || ["Toronto"])[0];
    country = "Canada";
  }
  if (!locality) {
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) locality = parts[parts.length - 2].replace(/\b[A-Z]{2}\s+\d{5}.*$/, "").replace(/\bUSA\b/i, "").trim();
  }
  if (!country) country = "United States";
  if (!locality) locality = "Unknown";
  locality = locality.replace(/\bUSA\b/i, "").replace(/\s+/g, " ").trim();
  return { address: raw.replace(/\s+/g, " ").trim(), locality, country };
}

function keep(row) {
  if (!row.name || SKIP_NAME.test(row.name) || SKIP_NAME.test(row.summary || "") || SKIP_NAME.test(row.type || "")) return false;
  if (SKIP_TYPE.test(row.type || "") || SKIP_TYPE.test(row.name)) return false;
  if (!row.address || row.address.length < 8) return false;
  if (/^p\.?\s*o\.?\s*box/i.test(row.address)) return false;
  if (row.locality === "Unknown") return false;
  return true;
}

function rowOut(input) {
  const place = parsePlace(input.address, input.locality, input.country);
  const type = input.type || "";
  const category = input.category || categoryFrom(`${type} ${input.name}`);
  const listingUrl = input.listingUrl;
  const website = input.website && /^https?:/i.test(input.website) ? input.website : null;
  const out = {
    sourceKey: input.sourceKey,
    name: decode(input.name),
    address: place.address,
    locality: place.locality,
    destination: place.locality,
    country: place.country,
    category,
    listingUrl,
    website,
    type: decode(type),
    summary: input.summary || `${decode(input.name)} is listed as a kosher ${category.toLowerCase()} by ${input.agency}. Confirm current supervision on the cited directory before relying on it.`,
  };
  return keep(out) ? out : null;
}

function parseOrb(html) {
  const rows = [];
  const re = /<a class="viewmap"[^>]*title="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    const name = decode(m[1]);
    const address = decode(m[2]);
    if (/certificate|\.pdf/i.test(name) || /certificate|\.pdf/i.test(address)) continue;
    const row = rowOut({
      sourceKey: "orb-find-kosher",
      agency: "ORB Kosher",
      name,
      address,
      listingUrl: "https://www.orbkosher.com/find-kosher/",
      type: "Restaurant",
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseStarK(html) {
  const rows = [];
  const blocks = html.split(/<div class="box" id="item-/).slice(1);
  for (const block of blocks) {
    const id = (block.match(/^([^"]+)"/) || [])[1];
    const name = decode((block.match(/<span class="name">([^<]+)<\/span>/) || [])[1] || "");
    const address = stripTags((block.match(/<span class="address">([\s\S]*?)<\/span>/) || [])[1] || "");
    const type = decode((block.match(/<span class="desc">([^<]+)<\/span>/) || [])[1] || "");
    const site = (block.match(/href="(https?:\/\/[^"]+)"[^>]*>www\./) || [])[1];
    if (!name || !id) continue;
    const row = rowOut({
      sourceKey: "star-k-retail",
      agency: "Star-K",
      name,
      address,
      type,
      listingUrl: `https://www.star-k.org/retail-establishments#item-${id}`,
      website: site,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseCrc(html) {
  const rows = [];
  const re = /company_name:\s*"([^"]+)"[\s\S]*?address:\s*"([^"]+)"[\s\S]*?city:\s*"([^"]*)"[\s\S]*?state:\s*"([^"]*)"[\s\S]*?zip:\s*"([^"]*)"[\s\S]*?website:\s*"([^"]*)"[\s\S]*?comp_type:\s*"([^"]*)"/g;
  for (const m of html.matchAll(re)) {
    const name = decode(m[1]);
    if (name === "Your Current Location") continue;
    const city = decode(m[3]);
    const state = decode(m[4]);
    const zip = decode(m[5]);
    const address = `${decode(m[2])}, ${city}, ${state} ${zip} USA`;
    let website = decode(m[6]);
    if (website && !/^https?:/i.test(website)) website = `https://${website}`;
    const type = decode(m[7]);
    if (type && !FOOD_OK.test(type) && !FOOD_OK.test(name)) continue;
    const row = rowOut({
      sourceKey: "crc-establishments",
      agency: "cRc",
      name,
      address,
      locality: city,
      country: "United States",
      type,
      listingUrl: "https://consumer.crckosher.org/kosher-establishments/",
      website,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseMkHtml(html) {
  const rows = [];
  const re = /<h4><a href="(https:\/\/mk\.ca\/dining-kosher\/[^"]+\/)">([^<]+)<\/a><\/h4>[\s\S]*?<div class='type-place'>[\s\S]*?<p>([^<]*)<\/p>[\s\S]*?<div class='address-place'>[\s\S]*?<p>[^<]*<\/i>&nbsp;([^<]+)<\/p>/g;
  for (const m of html.matchAll(re)) {
    const row = rowOut({
      sourceKey: "mk-dining",
      agency: "MK Kosher",
      name: decode(m[2]),
      address: decode(m[4]),
      locality: "Montreal",
      country: "Canada",
      type: decode(m[3]),
      listingUrl: m[1],
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseMkAjaxContent(html) {
  return parseMkHtml(html.includes("<h4>") ? html : `<div>${html}</div>`);
}

function parseOuResults(json) {
  const rows = [];
  for (const item of json.results || []) {
    const types = (item.establishment || []).map((e) => e.name).join(", ");
    if (SKIP_TYPE.test(types)) continue;
    const loc = (item.location || []).map((l) => l.name);
    const country = loc.find((n) => /israel|canada|united kingdom|uk|france|mexico/i.test(n)) || "United States";
    const locality = loc.find((n) => !/israel|united states|usa|canada/i.test(n)) || loc[0] || "";
    const row = rowOut({
      sourceKey: "ou-restaurants",
      agency: "OU Kosher",
      name: item.name,
      address: item.address,
      locality,
      country: /israel/i.test(country) ? "Israel" : /canada/i.test(country) ? "Canada" : /kingdom|\buk\b/i.test(country) ? "United Kingdom" : "United States",
      type: types || "Restaurant",
      listingUrl: item.url,
      website: item.website && !/oukosher\.org/i.test(item.website) ? item.website : null,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseOkList(items) {
  const rows = [];
  for (const item of items) {
    const name = decode(item.title?.rendered || item.title || "");
    const link = item.link;
    const type = (item.class_list || []).find((c) => c.startsWith("ctax_restaurant_type-"))?.replace("ctax_restaurant_type-", "").replace(/-/g, " ") || "Restaurant";
    if (!name || !link) continue;
    // OK list JSON has no address; keep only if yoast or content later filled it.
    const yoast = item.yoast_head_json || {};
    const graph = yoast.schema?.["@graph"] || [];
    let address = "";
    for (const node of graph) {
      const a = node.address;
      if (a?.streetAddress) {
        address = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry].filter(Boolean).join(", ");
      }
    }
    if (!address) continue;
    const row = rowOut({
      sourceKey: "ok-restaurants",
      agency: "OK Kosher",
      name,
      address,
      type,
      listingUrl: link,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseOsm(json) {
  const rows = [];
  for (const el of json.elements || []) {
    const t = el.tags || {};
    const name = t.name;
    const website = t.website || t["contact:website"];
    if (!name || !website) continue;
    if (!/\bkosher\b/i.test(name)) continue;
    if (SKIP_NAME.test(name)) continue;
    const amenity = t.amenity || t.shop || "";
    if (!FOOD_OK.test(amenity) && !FOOD_OK.test(name)) continue;
    const address = [
      t["addr:housenumber"],
      t["addr:street"],
      t["addr:city"] || t["addr:place"],
      t["addr:state"],
      t["addr:postcode"],
      t["addr:country"],
    ].filter(Boolean).join(" ");
    if (!address) continue;
    let websiteUrl = website;
    if (!/^https?:/i.test(websiteUrl)) websiteUrl = `https://${websiteUrl}`;
    try {
      const host = new URL(websiteUrl).hostname.replace(/^www\./, "");
      if (/google\.|openstreetmap|overpass|photon/.test(host)) continue;
    } catch {
      continue;
    }
    const row = rowOut({
      sourceKey: "named-kosher-website",
      agency: "the establishment's own site",
      name,
      address,
      locality: t["addr:city"] || t["addr:place"] || "",
      country: countryFromOsm(t),
      type: amenity || "Restaurant",
      listingUrl: websiteUrl,
      website: websiteUrl,
      summary: `${name} is named as a kosher ${amenity || "food"} establishment on its own website. Confirm current supervision before relying on it.`,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function countryFromOsm(t) {
  const c = (t["addr:country"] || "").toUpperCase();
  if (c === "US" || c === "USA") return "United States";
  if (c === "IL") return "Israel";
  if (c === "CA") return "Canada";
  if (c === "GB" || c === "UK") return "United Kingdom";
  if (c === "FR") return "France";
  if (c === "AU") return "Australia";
  if (c === "HU") return "Hungary";
  if (c === "PL") return "Poland";
  const city = t["addr:city"] || "";
  if (/jerusalem|tel aviv|haifa/i.test(city)) return "Israel";
  return t["addr:country"] || "United States";
}

async function harvestOu() {
  const r = await tryFetch("ou-posts", "https://oukosher.org/wp-json/kosher-api/v1/restaurants/posts?limit=200");
  if (!r?.ok) return [];
  try {
    return parseOuResults(JSON.parse(r.text));
  } catch {
    return [];
  }
}

async function harvestOk() {
  const r = await tryFetch("ok-list", "https://www.ok.org/wp-json/wp/v2/cpt_restaurant?per_page=100");
  if (!r?.ok) return [];
  try {
    const items = JSON.parse(r.text);
    return parseOkList(Array.isArray(items) ? items : []);
  } catch {
    return [];
  }
}

async function harvestCor() {
  const r = await tryFetch("cor-search", "https://cor.ca/wp-admin/admin-ajax.php", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "action=cor_establishment_search&search=",
  });
  if (!r?.ok) return [];
  try {
    const json = JSON.parse(r.text);
    const results = json.result || json.results || json.data || [];
    const rows = [];
    for (const e of results) {
      const row = rowOut({
        sourceKey: "cor-dining",
        agency: "COR",
        name: e.name,
        address: e.address,
        locality: "Toronto",
        country: "Canada",
        type: e.category || "Restaurant",
        listingUrl: "https://cor.ca/consumers/kosher-dining-in-toronto/",
        website: e.web_site ? `https://${String(e.web_site).replace(/^https?:\/\//, "")}` : null,
      });
      if (row) rows.push(row);
    }
    return rows;
  } catch (error) {
    console.log("[cor-search] parse fail", error.message);
    return [];
  }
}

async function harvestMkAjax() {
  const first = await tryFetch("mk-ajax", "https://mk.ca/wp-admin/admin-ajax.php", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "action=dining_ajax_filter_search&search=&address=&category=",
  });
  if (!first?.ok) return [];
  let json;
  try {
    json = JSON.parse(first.text);
  } catch {
    return [];
  }
  const rows = parseMkAjaxContent(json.content || "");
  const max = Number(json.max_page) || 1;
  const query = typeof json.posts === "string" ? json.posts : JSON.stringify(json.posts || {});
  for (let page = 1; page < max && page < 30; page += 1) {
    const body = new URLSearchParams({
      action: "more_post_ajax",
      query,
      page: String(page),
    }).toString();
    const next = await tryFetch(`mk-page-${page + 1}`, "https://mk.ca/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!next?.ok) break;
    try {
      const njson = JSON.parse(next.text);
      rows.push(...parseMkAjaxContent(njson.content || next.text));
    } catch {
      rows.push(...parseMkAjaxContent(next.text));
    }
  }
  return rows;
}

async function harvestMiami() {
  const r = await tryFetch("miami", "https://koshermiami.org/wp-admin/admin-ajax.php?action=getLocations", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "location=Miami+Beach",
  });
  if (!r?.ok || r.text === "0") return [];
  try {
    const json = JSON.parse(r.text);
    const locations = json.locations || [];
    const rows = [];
    for (const loc of locations) {
      const name = loc.name || loc.title || loc.company_name;
      const address = loc.address || [loc.street, loc.city, loc.state, loc.zip].filter(Boolean).join(", ");
      const row = rowOut({
        sourceKey: "miami-establishments",
        agency: "Kosher Miami",
        name,
        address,
        locality: loc.city || "Miami",
        country: "United States",
        type: loc.type || loc.category || "Restaurant",
        listingUrl: loc.url || loc.permalink || "https://koshermiami.org/establishments/",
        website: loc.website || null,
      });
      if (row) rows.push(row);
    }
    return rows;
  } catch {
    return [];
  }
}

async function harvestOsm() {
  const query = `[out:json][timeout:12];
nwr["diet:kosher"="yes"]["name"~"[Kk]osher"]["website"]["amenity"~"restaurant|cafe|fast_food|bakery|butcher|ice_cream"];
out tags center;`;
  const r = await tryFetch(
    "osm-overpass",
    "https://overpass-api.de/api/interpreter",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      timeout: TIMEOUT_MS,
    },
  );
  if (!r?.ok) return [];
  try {
    return parseOsm(JSON.parse(r.text));
  } catch {
    return [];
  }
}

async function harvestKlbd() {
  const urls = [
    "https://www.kosher.org.uk/article/licensed-restaurants",
    "https://www.klbdkosher.org/restaurants/",
    "https://www.kosher.org.uk/directory/restaurants",
  ];
  const rows = [];
  for (const url of urls) {
    const r = await tryFetch(`klbd-${url}`, url);
    if (!r?.ok) continue;
    const re = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([^<]{3,80})<\/a>/g;
    // Prefer structured address blocks if present.
    const addrBlocks = [...r.text.matchAll(/<h[23][^>]*>([^<]+)<\/h[23]>[\s\S]{0,400}?(\d[^<]{8,80})/gi)].slice(0, 400);
    for (const m of addrBlocks) {
      const name = decode(m[1]);
      const address = decode(m[2]);
      if (!/\bkosher\b|restaurant|bakery|deli|grill/i.test(name + address)) continue;
      const row = rowOut({
        sourceKey: "klbd-restaurants",
        agency: "KLBD",
        name,
        address: `${address}, London, United Kingdom`,
        locality: "London",
        country: "United Kingdom",
        type: "Restaurant",
        listingUrl: url,
      });
      if (row) rows.push(row);
    }
    if (rows.length) break;
  }
  return rows;
}

function dedupeHarvest(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = `${row.name.toLocaleLowerCase("en")}::${row.address.toLocaleLowerCase("en")}::${row.locality.toLocaleLowerCase("en")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

async function main() {
  const orb = parseOrb(fs.readFileSync(path.join(RAW, "orb.html"), "utf8"));
  const star = parseStarK(fs.readFileSync(path.join(RAW, "star-k.html"), "utf8"));
  const crc = parseCrc(fs.readFileSync(path.join(RAW, "crc.html"), "utf8"));
  const mkHtml = parseMkHtml(fs.readFileSync(path.join(RAW, "mk.html"), "utf8"));
  console.log("local", { orb: orb.length, star: star.length, crc: crc.length, mkHtml: mkHtml.length });

  const [ou, ok, cor, mkAjax, miami, osm, klbd] = await Promise.all([
    harvestOu(),
    harvestOk(),
    harvestCor(),
    harvestMkAjax(),
    harvestMiami(),
    harvestOsm(),
    harvestKlbd(),
  ]);
  console.log("remote", {
    ou: ou.length,
    ok: ok.length,
    cor: cor.length,
    mkAjax: mkAjax.length,
    miami: miami.length,
    osm: osm.length,
    klbd: klbd.length,
  });

  const all = dedupeHarvest([...orb, ...star, ...crc, ...mkHtml, ...mkAjax, ...ou, ...ok, ...cor, ...miami, ...osm, ...klbd]);
  const bySource = {};
  for (const row of all) bySource[row.sourceKey] = (bySource[row.sourceKey] || 0) + 1;
  const outPath = path.join(__dirname, "_harvested.json");
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2));
  console.log(JSON.stringify({ total: all.length, bySource, outPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
