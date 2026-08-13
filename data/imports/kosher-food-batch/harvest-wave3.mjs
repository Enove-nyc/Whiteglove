/**
 * New unique Europe/Asia-weighted kosher directories.
 * Does not re-fetch Hungary/Poland/Hamsza Chabad pages.
 * 15s timeouts. Skip blocked hosts. Append to _harvested.json.
 *
 * Run: node data/imports/kosher-food-batch/harvest-wave3.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const RAW = path.join(__dirname, "_raw");
const UA = "Mozilla/5.0 (compatible; WhiteGloveKosherResearch/1.0)";
const TIMEOUT_MS = 15000;
const SKIP_NAME = /kosher[-\s]?style|israeli[-\s]?style|jewish[-\s]?style|type_text|color_link|filter by|reset$/i;

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
  const head = `${text || ""} ${url || ""}`.slice(0, 2000);
  return /techloq|Just a moment|cf-mitigated|filter\.techloq/i.test(head);
}

async function fetchT(url) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/json,*/*" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
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

function parseKlbdHtml(html, listingUrl) {
  const rows = [];
  const re =
    /<h2 class="[^"]*post_title[^"]*"[^>]*>([^<]{2,90})<\/h2>[\s\S]{0,1200}?<span class="w-post-elm-value">([^<]{6,120})<\/span>/gi;
  for (const m of html.matchAll(re)) {
    const name = decode(m[1]);
    const address = decode(m[2]);
    const locality =
      (address.match(/\b(Hendon|Golders Green|Edgware|Borehamwood|Temple Fortune|Finchley|Stamford Hill|Ilford|Manchester|Leeds|Gatwick|Heathrow|Canary Wharf|Marylebone|West End|Soho|Edgwarebury)[^,]*/i) || [])[1] ||
      "London";
    const row = makeRow({
      sourceKey: "klbd-restaurants",
      agency: "KLBD",
      name,
      address: `${address}, United Kingdom`,
      locality,
      country: "United Kingdom",
      type: /baker|bagel/i.test(name) ? "Bakery" : /shop|store|market/i.test(name) ? "Grocery" : "Restaurant",
      listingUrl,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseDallasHtml(html) {
  const rows = [];
  const re = /<h3[^>]*>([^<]{2,80})<\/h3>\s*<p[^>]*>\s*<strong>([^<]{8,140})<\/strong>/gi;
  for (const m of html.matchAll(re)) {
    const name = decode(m[1]);
    const address = decode(m[2]).replace(/\s*\(\d[\d\- ]{6,}\)\s*$/, "").trim();
    if (/olive\s*&\s*fig|bar experience/i.test(name) && /bar\b/i.test(name)) continue;
    const row = makeRow({
      sourceKey: "dallas-kosher",
      agency: "Dallas Kosher",
      name,
      address: /dallas|plano|tx\b/i.test(address) ? address : `${address}, Dallas, TX, United States`,
      locality: /plano/i.test(address) ? "Plano" : "Dallas",
      country: "United States",
      type: "Restaurant",
      listingUrl: "https://www.dallaskosher.org/restaurants",
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseFlowiz(html, locality, country, listingUrl) {
  const rows = [];
  const cards = [...html.matchAll(/<a href="([^"]+\/(?:en\/)?food\/\d+\/?)"[\s\S]{0,2500}?<\/a>/gi)];
  for (const m of cards) {
    const name = decode((m[0].match(/<h3 class="item-name">\s*([^<]+)/i) || [])[1] || "");
    const address = decode((m[0].match(/<span class="item-text">\s*([^<]+)/i) || [])[1] || "");
    const type = decode((m[0].match(/<div class="item-tag">[\s\S]*?<span>([^<]+)/i) || [])[1] || "");
    const row = makeRow({
      sourceKey: country === "Thailand" || ["Japan", "China", "India", "Singapore", "Nepal", "Vietnam", "Philippines", "South Korea", "Taiwan", "United Arab Emirates", "Turkey"].includes(country)
        ? "chabad-food-asia"
        : "chabad-food-europe",
      agency: `Chabad of ${locality}`,
      name,
      address,
      locality,
      country,
      type,
      listingUrl: m[1] || listingUrl,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseKedassia(html) {
  const rows = [];
  const listingUrl = "https://www.kedassia.org/eating-out/";
  for (const m of html.matchAll(/<(?:h[2-4]|li|td|strong)[^>]*>([^<]{3,80})<\/(?:h[2-4]|li|td|strong)>[\s\S]{0,200}?(\d{1,4}\s+[A-Z][^<]{6,90})/gi)) {
    const row = makeRow({
      sourceKey: "kedassia-eating-out",
      agency: "Kedassia",
      name: m[1],
      address: `${decode(m[2])}, United Kingdom`,
      locality: "London",
      country: "United Kingdom",
      type: "Restaurant",
      listingUrl,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseOsm(json) {
  const rows = [];
  for (const el of json.elements || []) {
    const t = el.tags || {};
    const name = t.name || t["name:en"] || t["name:he"];
    let website = t.website || t["contact:website"];
    if (!name || !website) continue;
    if (SKIP_NAME.test(name)) continue;
    if (!/^https?:/i.test(website)) website = `https://${website}`;
    try {
      const host = new URL(website).hostname.replace(/^www\./, "");
      if (/google\.|openstreetmap|overpass|photon/.test(host)) continue;
    } catch {
      continue;
    }
    if (!/\bkosher\b|כשר/i.test(name) && t["diet:kosher"] !== "yes") continue;
    const address = [t["addr:housenumber"], t["addr:street"], t["addr:city"], t["addr:postcode"], t["addr:country"]].filter(Boolean).join(" ");
    if (!address) continue;
    const cc = (t["addr:country"] || "").toUpperCase();
    const country = cc === "IL" ? "Israel" : cc === "GB" ? "United Kingdom" : cc === "FR" ? "France" : cc === "DE" ? "Germany" : cc === "ES" ? "Spain" : cc === "IT" ? "Italy" : cc === "NL" ? "Netherlands" : cc === "BE" ? "Belgium" : cc === "CH" ? "Switzerland" : cc === "AT" ? "Austria" : cc === "PL" ? "Poland" : cc === "HU" ? "Hungary" : cc === "TH" ? "Thailand" : cc === "JP" ? "Japan" : cc === "CN" ? "China" : cc === "IN" ? "India" : t["addr:country"] || "Unknown";
    const row = makeRow({
      sourceKey: "named-kosher-website",
      agency: "the establishment's own site",
      name,
      address,
      locality: t["addr:city"] || country,
      country,
      type: t.amenity || t.shop || "Restaurant",
      listingUrl: website,
      website,
    });
    if (row) rows.push(row);
  }
  return rows;
}

async function harvestKlbd() {
  const rows = [];
  const saved = path.join(RAW, "klbd.html");
  if (fs.existsSync(saved)) {
    rows.push(...parseKlbdHtml(fs.readFileSync(saved, "utf8"), "https://kosher.org.uk/kosher-places/restaurants/"));
  }
  const pages = [
    "https://kosher.org.uk/kosher-places/restaurants/",
    "https://kosher.org.uk/kosher-places/bakeries/",
    "https://kosher.org.uk/kosher-places/shops/",
    "https://kosher.org.uk/wp-json/wp/v2/business?per_page=100",
  ];
  const fetched = await Promise.all(pages.map((url) => fetchT(url)));
  for (const [i, r] of fetched.entries()) {
    const url = pages[i];
    if (!r?.ok) continue;
    if (url.includes("wp-json")) {
      try {
        const items = JSON.parse(r.text);
        console.log("[klbd-json]", Array.isArray(items) ? items.length : typeof items);
        if (Array.isArray(items)) {
          for (const item of items) {
            const name = decode(item.title?.rendered || item.title || "");
            const address = decode(item.acf?.address || item.meta?.address || item.excerpt?.rendered || "");
            const row = makeRow({
              sourceKey: "klbd-restaurants",
              agency: "KLBD",
              name,
              address: address.length >= 6 ? `${address}, United Kingdom` : `${name}, listed by KLBD, United Kingdom`,
              locality: "London",
              country: "United Kingdom",
              type: "Restaurant",
              listingUrl: item.link || url,
            });
            if (row) rows.push(row);
          }
        }
      } catch (error) {
        console.log("[klbd-json] parse", error.message);
      }
      continue;
    }
    fs.writeFileSync(path.join(RAW, `klbd-${url.split("/").filter(Boolean).pop() || "page"}.html`), r.text.slice(0, 400000));
    rows.push(...parseKlbdHtml(r.text, url));
  }
  console.log("[klbd]", rows.length);
  return rows;
}

async function harvestConsistoire() {
  const r = await fetchT("https://www.consistoire.org/restaurants-ouverts-pendant-le-deuxieme-confinement-novembre-2020/");
  if (!r?.ok) return [];
  const rows = [];
  for (const m of r.text.matchAll(/<(?:h[2-4]|strong|b)[^>]*>([^<]{2,80})<\/(?:h[2-4]|strong|b)>[\s\S]{0,300}?(\d[^<]{6,90}(?:Paris|France)[^<]{0,40})/gi)) {
    const row = makeRow({
      sourceKey: "beth-din-paris",
      agency: "Beth Din de Paris / Consistoire",
      name: m[1],
      address: `${decode(m[2])}, France`,
      locality: "Paris",
      country: "France",
      type: "Restaurant",
      listingUrl: r.url,
    });
    if (row) rows.push(row);
  }
  console.log("[consistoire]", rows.length);
  return rows;
}

async function harvestKedassia() {
  const r = await fetchT("https://www.kedassia.org/eating-out/");
  if (!r?.ok) return [];
  fs.writeFileSync(path.join(RAW, "kedassia.html"), r.text.slice(0, 250000));
  const rows = parseKedassia(r.text);
  console.log("[kedassia]", rows.length);
  return rows;
}

async function harvestOsm() {
  const query = `[out:json][timeout:12];
(
  nwr["diet:kosher"="yes"]["name"~"[Kk]osher"]["website"]["amenity"~"restaurant|cafe|fast_food|bakery|butcher"]["addr:country"~"GB|FR|DE|ES|IT|NL|BE|CH|AT|PL|HU|CZ|IL|TH|JP|CN|IN|SG"];
  nwr["diet:kosher"="yes"]["name"~"כשר"]["website"]["amenity"~"restaurant|cafe|fast_food|bakery"];
);
out tags center;`;
  const r = await fetchT("https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query));
  if (!r?.ok) return [];
  try {
    const json = JSON.parse(r.text);
    const rows = parseOsm(json);
    console.log("[osm]", rows.length, "elements", (json.elements || []).length);
    return rows;
  } catch {
    console.log("[osm] skip");
    return [];
  }
}

async function harvestIsrael() {
  const r = await fetchT("https://data.gov.il/api/3/action/datastore_search?resource_id=c54032cb-5306-4be9-a20d-a0be0ba49cc1&limit=5000");
  if (!r?.ok || r.text.trim().startsWith("<")) {
    console.log("[israel] skip");
    return [];
  }
  try {
    const json = JSON.parse(r.text);
    const records = json.result?.records || [];
    const fields = (json.result?.fields || []).map((f) => f.id);
    console.log("[israel] records", records.length, "fields", fields);
    if (!records.length) return [];
    const nameKey = fields.find((f) => /שם|name|esek|business/i.test(f)) || Object.keys(records[0]).find((k) => k !== "_id");
    const addrKey = fields.find((f) => /כתובת|address|רחוב/i.test(f));
    const cityKey = fields.find((f) => /ישוב|city|עיר/i.test(f));
    const rows = [];
    for (const rec of records) {
      const row = makeRow({
        sourceKey: "israel-kashrut-opendata",
        agency: "Israel open kashrut data",
        name: rec[nameKey],
        address: `${addrKey ? rec[addrKey] : ""} ${cityKey ? rec[cityKey] : ""} Israel`.trim(),
        locality: cityKey ? rec[cityKey] : "Israel",
        country: "Israel",
        type: "Restaurant",
        listingUrl: "https://data.gov.il/dataset/kosherbusiness",
      });
      if (row) rows.push(row);
    }
    console.log("[israel]", rows.length);
    return rows;
  } catch (error) {
    console.log("[israel] parse", error.message);
    return [];
  }
}

async function harvestNewFlowiz() {
  const pages = [
    { url: "https://chabadsofia.org/en/food/", locality: "Sofia", country: "Bulgaria" },
    { url: "https://www.chabad.bg/en/food/", locality: "Sofia", country: "Bulgaria" },
    { url: "https://chabadzagreb.org/en/food/", locality: "Zagreb", country: "Croatia" },
    { url: "https://chabadbelgrade.org/en/food/", locality: "Belgrade", country: "Serbia" },
    { url: "https://chabadcyprus.com/en/food/", locality: "Nicosia", country: "Cyprus" },
    { url: "https://chabadporto.com/en/food/", locality: "Porto", country: "Portugal" },
    { url: "https://jewishlisbon.com/en/food/", locality: "Lisbon", country: "Portugal" },
    { url: "https://chabadseville.org/en/food/", locality: "Seville", country: "Spain" },
    { url: "https://chabadvalencia.com/en/food/", locality: "Valencia", country: "Spain" },
    { url: "https://chabadmanila.org/en/food/", locality: "Manila", country: "Philippines" },
    { url: "https://chabadsiemreap.com/en/food/", locality: "Siem Reap", country: "Cambodia" },
    { url: "https://jewishsaigon.com/en/food/", locality: "Ho Chi Minh City", country: "Vietnam" },
  ];
  const fetched = await Promise.all(pages.map(async (page) => {
    const r = await fetchT(page.url);
    if (!r?.ok) return [];
    const parsed = parseFlowiz(r.text, page.locality, page.country, page.url);
    console.log("[flowiz]", page.locality, parsed.length);
    return parsed;
  }));
  return fetched.flat();
}

function harvestDallasSaved() {
  const file = path.join(RAW, "dallas.html");
  if (!fs.existsSync(file)) return [];
  const rows = parseDallasHtml(fs.readFileSync(file, "utf8"));
  console.log("[dallas]", rows.length);
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
  const [klbd, kedassia, osm, israel, flowiz, consistoire] = await Promise.all([
    harvestKlbd(),
    harvestKedassia(),
    harvestOsm(),
    harvestIsrael(),
    harvestNewFlowiz(),
    harvestConsistoire(),
  ]);
  const dallas = harvestDallasSaved();
  const { added, bySource } = merge(harvested, [...klbd, ...kedassia, ...osm, ...israel, ...flowiz, ...consistoire, ...dallas]);
  fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
  console.log(JSON.stringify({
    added,
    total: harvested.length,
    counts: {
      klbd: klbd.length,
      kedassia: kedassia.length,
      osm: osm.length,
      israel: israel.length,
      flowiz: flowiz.length,
      consistoire: consistoire.length,
      dallas: dallas.length,
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
