/**
 * Wave 5: new unique kosher restaurants toward 2000.
 * Does not re-fetch KLBD, Dallas, Budapest, Warsaw, or Hamsza.
 * 15s timeouts. Skip blocked hosts. Skip shul-only Chabad.
 *
 * Run: node data/imports/kosher-food-batch/harvest-wave5.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const UA = "Mozilla/5.0 (compatible; WhiteGloveKosherResearch/1.0)";
const TIMEOUT_MS = 15000;
const SKIP_NAME = /kosher[-\s]?style|israeli[-\s]?style|jewish[-\s]?style|type_text|color_link|filter by/i;
const PRODUCT_NAME = /\d+\s*(?:מל|מ"?ל|גרם|ק"?ג|ml|kg)\b|שמן |קמח |סוכר |אורגני|כתית|תבלין|רכיב|coconut oil|corn starch/i;
const SKIP_PKG = /mazon|court_specialist|ingredient|additive|pesticide|מומחה|expert/i;
const FOOD_CHABAD = /restaurant|eatery|kitchen|dining|bakery|grocery|supermarket|butcher|cafe|cafeteria|takeaway|pizza|grill|deli|market|store|shop|meals?|food/i;
const SHUL_ONLY = /^(chabad|synagogue|shul|beit|beth|centre|center|house)\b/i;

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
  if (!cleanName || SKIP_NAME.test(cleanName) || PRODUCT_NAME.test(cleanName) || cleanName.length < 2) return null;
  if (!cleanAddress || cleanAddress.length < 6) return null;
  if (/<|>|type_text|color_link/.test(cleanAddress)) return null;
  if (SHUL_ONLY.test(cleanName) && !FOOD_CHABAD.test(`${cleanName} ${type || ""}`)) return null;
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
  if (!text || text.trim().startsWith("<")) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseFlowiz(html, sourceKey, agency, locality, country) {
  const rows = [];
  const cards = [...html.matchAll(/<a href="([^"]+\/(?:en\/)?food\/\d+\/?)"[\s\S]{0,2500}?<\/a>/gi)];
  for (const m of cards) {
    const name = decode((m[0].match(/<h3 class="item-name">\s*([^<]+)/i) || [])[1] || "");
    const address = decode((m[0].match(/<span class="item-text">\s*([^<]+)/i) || [])[1] || "");
    const type = decode((m[0].match(/<div class="item-tag">[\s\S]*?<span>([^<]+)/i) || [])[1] || "");
    if (!FOOD_CHABAD.test(`${name} ${type} ${address}`)) continue;
    const row = makeRow({
      sourceKey,
      agency,
      name,
      address,
      locality,
      country,
      type,
      listingUrl: m[1].startsWith("http") ? m[1] : `https://${m[1]}`,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseJsonLd(html, sourceKey, agency, locality, country, listingUrl) {
  const rows = [];
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    const json = parseJsonSafe(m[1]);
    const nodes = Array.isArray(json) ? json : json ? [json] : [];
    const flat = [];
    for (const node of nodes) {
      if (!node) continue;
      if (Array.isArray(node["@graph"])) flat.push(...node["@graph"]);
      else flat.push(node);
    }
    for (const node of flat) {
      const types = [].concat(node["@type"] || []).map(String);
      if (!types.some((t) => /Restaurant|FoodEstablishment|Bakery|CafeOrCoffeeShop|GroceryStore/i.test(t))) continue;
      const addr = node.address;
      const address = typeof addr === "string"
        ? addr
        : [addr?.streetAddress, addr?.addressLocality, addr?.addressRegion, addr?.postalCode, addr?.addressCountry].filter(Boolean).join(", ");
      const row = makeRow({
        sourceKey,
        agency,
        name: node.name,
        address: address || `${locality}, ${country}`,
        locality: (typeof addr === "object" && addr?.addressLocality) || locality,
        country,
        type: types[0] || "Restaurant",
        listingUrl: node.url || listingUrl,
        website: node.url || node.sameAs || null,
      });
      if (row) rows.push(row);
    }
  }
  return rows;
}

function parseNameAddressHtml(html, sourceKey, agency, locality, country, listingUrl) {
  const rows = parseJsonLd(html, sourceKey, agency, locality, country, listingUrl);
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

function israelLooksLikeEstablishment(name, address, city) {
  const n = decode(name);
  const a = decode(address);
  const c = decode(city);
  if (!n || n.length < 3) return false;
  if (PRODUCT_NAME.test(n)) return false;
  if (c && n === c) return false;
  if (/^י[קכ]נעם/.test(n) && (!a || a === c)) return false;
  const combined = `${a} ${c}`;
  if (combined.replace(/israel/i, "").trim().length < 4) return false;
  return /\d|רחוב|רח'|street|st\.|blvd|avenue|דרך|שדרות|כיכר/.test(combined) || a.length >= 8;
}

async function harvestIsrael() {
  const queries = [
    "https://data.gov.il/api/3/action/package_search?q=%D7%9B%D7%A9%D7%A8%D7%95%D7%AA&rows=30",
    "https://data.gov.il/api/3/action/package_search?q=kashrut&rows=20",
    "https://data.gov.il/api/3/action/package_search?q=%D7%AA%D7%A2%D7%95%D7%93%D7%AA+%D7%9B%D7%A9%D7%A8%D7%95%D7%AA&rows=20",
    "https://data.gov.il/api/3/action/package_search?q=%D7%91%D7%AA%D7%99+%D7%90%D7%95%D7%9B%D7%9C&rows=15",
  ];
  const seenPkg = new Set();
  const rows = [];
  for (const url of queries) {
    const r = await fetchT(url);
    const json = parseJsonSafe(r?.text);
    if (!json) {
      console.log("[israel] skip search", url.slice(-40));
      continue;
    }
    const packages = json.result?.results || [];
    console.log("[israel] packages", packages.map((p) => p.name).join(", ") || "(none)");
    for (const pkg of packages) {
      if (!pkg?.name || seenPkg.has(pkg.name) || SKIP_PKG.test(pkg.name) || pkg.name === "kosherbusiness") continue;
      seenPkg.add(pkg.name);
      for (const res of pkg.resources || []) {
        const id = res.id;
        const fmt = `${res.format || ""} ${res.url || ""}`;
        if (res.datastore_active && id) {
          const ds = await fetchT(`https://data.gov.il/api/3/action/datastore_search?resource_id=${id}&limit=8000`);
          const data = parseJsonSafe(ds?.text);
          const records = data?.result?.records || [];
          if (!records[0]) continue;
          const fields = (data.result?.fields || []).map((f) => f.id);
          console.log("[israel-ds]", pkg.name, records.length, fields.slice(0, 10).join("|"));
          const nameKey = fields.find((f) => /שם.?עסק|shem|business.?name|esek|mosad|restaurant|שם.?מוסד|name/i.test(f))
            || fields.find((f) => /שם|name/i.test(f));
          const addrKey = fields.find((f) => /כתובת|address|רחוב|street|ktovet/i.test(f));
          const cityKey = fields.find((f) => /ישוב|city|עיר|yishuv|locality/i.test(f));
          if (!nameKey) continue;
          let kept = 0;
          for (const rec of records) {
            const name = rec[nameKey];
            const address = addrKey ? rec[addrKey] : "";
            const city = cityKey ? rec[cityKey] : "";
            if (!israelLooksLikeEstablishment(name, address, city)) continue;
            const row = makeRow({
              sourceKey: "israel-kashrut-opendata",
              agency: "Israel open kashrut data",
              name,
              address: [address, city, "Israel"].filter(Boolean).join(", "),
              locality: city || "Israel",
              country: "Israel",
              type: rec.kosher_type || rec.sug || "Restaurant",
              listingUrl: `https://data.gov.il/dataset/${pkg.name}`,
            });
            if (row) {
              rows.push(row);
              kept += 1;
            }
          }
          console.log("[israel-kept]", pkg.name, kept);
        } else if (/csv/i.test(fmt) && res.url) {
          const csv = await fetchT(res.url);
          if (!csv?.ok || csv.text.trim().startsWith("<")) continue;
          const lines = csv.text.split(/\r?\n/).slice(0, 8001);
          if (lines.length < 3) continue;
          const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
          const nameIdx = headers.findIndex((h) => /שם|name|esek|business/i.test(h));
          const addrIdx = headers.findIndex((h) => /כתובת|address|רחוב|street/i.test(h));
          const cityIdx = headers.findIndex((h) => /ישוב|city|עיר/i.test(h));
          if (nameIdx < 0) continue;
          console.log("[israel-csv]", pkg.name, lines.length - 1, headers.slice(0, 8).join("|"));
          for (const line of lines.slice(1)) {
            const cols = line.split(",").map((c) => c.replace(/"/g, "").trim());
            const name = cols[nameIdx];
            const address = addrIdx >= 0 ? cols[addrIdx] : "";
            const city = cityIdx >= 0 ? cols[cityIdx] : "";
            if (!israelLooksLikeEstablishment(name, address, city)) continue;
            const row = makeRow({
              sourceKey: "israel-kashrut-opendata",
              agency: "Israel open kashrut data",
              name,
              address: [address, city, "Israel"].filter(Boolean).join(", "),
              locality: city || "Israel",
              country: "Israel",
              type: "Restaurant",
              listingUrl: `https://data.gov.il/dataset/${pkg.name}`,
            });
            if (row) rows.push(row);
          }
        }
      }
    }
  }
  console.log("[israel]", rows.length);
  return rows;
}

function parseOsmElements(json) {
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
    const address = t["addr:full"]
      || [t["addr:housenumber"], t["addr:street"], t["addr:city"], t["addr:postcode"], t["addr:country"]].filter(Boolean).join(" ");
    if (!address || address.length < 6) continue;
    const cc = (t["addr:country"] || "").toUpperCase();
    const country = cc === "IL" ? "Israel"
      : cc === "GB" || cc === "UK" ? "United Kingdom"
      : cc === "FR" ? "France"
      : cc === "US" || cc === "USA" ? "United States"
      : cc === "CA" ? "Canada"
      : cc === "AU" ? "Australia"
      : t["addr:city"] && /jerusalem|tel aviv|haifa|bnei|netanya/i.test(t["addr:city"]) ? "Israel"
      : t["addr:country"] || "Unknown";
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

async function harvestOsm() {
  const query = `[out:json][timeout:12];
(
  nwr["diet:kosher"="yes"]["website"]["addr:street"]["amenity"~"restaurant|cafe|fast_food|bakery|butcher|ice_cream|food_court"];
  nwr["diet:kosher"="yes"]["website"]["addr:full"]["amenity"~"restaurant|cafe|fast_food|bakery|butcher|ice_cream"];
  nwr["diet:kosher"="yes"]["website"]["addr:street"]["shop"~"supermarket|bakery|butcher|convenience|deli|greengrocer"];
);
out tags center;`;
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  for (const endpoint of endpoints) {
    const r = await fetchT(endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });
    const json = parseJsonSafe(r?.text);
    if (!json?.elements) {
      console.log("[osm] skip", endpoint);
      continue;
    }
    const rows = parseOsmElements(json);
    console.log("[osm]", rows.length, "elements", json.elements.length, endpoint);
    return rows;
  }
  return [];
}

function walkNamed(node, rows, pick) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) walkNamed(item, rows, pick);
    return;
  }
  if (typeof node !== "object") return;
  const picked = pick(node);
  if (picked) {
    rows.push(picked);
    return;
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === "object") walkNamed(value, rows, pick);
  }
}

async function harvestMiami() {
  const attempts = [
    () => fetchT("https://koshermiami.org/wp-admin/admin-ajax.php?action=getLocations", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        referer: "https://koshermiami.org/establishments/",
        origin: "https://koshermiami.org",
      },
      body: "location=",
    }),
    () => fetchT("https://koshermiami.org/wp-admin/admin-ajax.php?action=getLocations&location=", {
      headers: { referer: "https://koshermiami.org/establishments/" },
    }),
    () => fetchT("https://koshermiami.org/wp-json/wp/v2/types"),
  ];
  const rows = [];
  for (const attempt of attempts) {
    const r = await attempt();
    const json = parseJsonSafe(r?.text);
    if (!json) {
      console.log("[miami] skip", r?.status);
      continue;
    }
    if (json.locations || json.fullList || json.listView) {
      walkNamed(json, rows, (node) => {
        const name = node.name || node.title || node.company_name || node.location_name;
        const address = node.address || [node.street, node.street_address, node.city, node.state, node.zip, node.postal].filter(Boolean).join(", ");
        if (!name || !address || String(address).length < 6) return null;
        return makeRow({
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
      });
      console.log("[miami] ajax", rows.length);
      if (rows.length) return rows;
    }
    if (json.establishment || json.locations_cpt || Object.keys(json).some((k) => /estab|location|restaurant/i.test(k))) {
      const types = Object.keys(json).filter((k) => /estab|location|restaurant|dining|kosher/i.test(k));
      for (const type of types.slice(0, 4)) {
        const list = await fetchT(`https://koshermiami.org/wp-json/wp/v2/${type}?per_page=100`);
        const items = parseJsonSafe(list?.text);
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          const extracted = extractWpItem(item, "miami-establishments", "Kosher Miami", "Miami", "United States");
          if (extracted) rows.push(extracted);
        }
      }
      console.log("[miami] wp", rows.length, types);
    }
  }
  return rows;
}

function extractWpItem(item, sourceKey, agency, locality, country) {
  const name = decode(item.title?.rendered || item.title || item.name || "");
  const acf = item.acf && typeof item.acf === "object" ? item.acf : {};
  const meta = item.meta && typeof item.meta === "object" ? item.meta : {};
  const loc = acf.location || acf.address || meta.address || {};
  const address = decode(
    (typeof loc === "string" && loc)
    || acf.street_address
    || acf.address_line
    || meta.street
    || [acf.street, acf.city, acf.state, acf.zip].filter(Boolean).join(", ")
    || (typeof loc === "object" && [loc.street_address, loc.address, loc.city, loc.state].filter(Boolean).join(", "))
    || "",
  );
  const content = decode(item.content?.rendered || item.excerpt?.rendered || "");
  const fromContent = (content.match(/\d{1,5}\s+[A-Za-z][A-Za-z0-9 .,'-]{6,80}/) || [])[0] || "";
  const link = item.link || item.url || "";
  return makeRow({
    sourceKey,
    agency,
    name,
    address: address || (fromContent ? `${fromContent}, ${locality}, ${country}` : ""),
    locality: acf.city || (typeof loc === "object" && loc.city) || locality,
    country,
    type: item.type || "Restaurant",
    listingUrl: link,
    website: acf.website || item.website || null,
  });
}

async function harvestWpSite(base, sourceKey, agency, locality, country) {
  const typesR = await fetchT(`${base.replace(/\/$/, "")}/wp-json/wp/v2/types`);
  const typesJson = parseJsonSafe(typesR?.text);
  const typeNames = typesJson ? Object.keys(typesJson) : [];
  const interesting = typeNames.filter((t) => /restaurant|estab|dining|location|kosher|food|eater|store|shop|baker|vendor|place|listing|business|directory/i.test(t));
  console.log("[wp]", base.replace(/https?:\/\//, "").slice(0, 40), interesting.join(",") || typeNames.slice(0, 8).join(","));
  const rows = [];
  const tryTypes = interesting.length ? interesting.slice(0, 5) : [];
  for (const type of tryTypes) {
    const list = await fetchT(`${base.replace(/\/$/, "")}/wp-json/wp/v2/${encodeURIComponent(type)}?per_page=100`);
    const items = parseJsonSafe(list?.text);
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const row = extractWpItem(item, sourceKey, agency, locality, country);
      if (row) rows.push(row);
    }
  }
  return rows;
}

async function harvestHtmlDirectories() {
  const pages = [
    ["https://www.kof-k.org/consumers/kosher-restaurants/", "kof-k-restaurants", "Kof-K", "New York", "United States"],
    ["https://www.kof-k.org/restaurant-search/", "kof-k-restaurants", "Kof-K", "New York", "United States"],
    ["https://www.houstonkosher.org/restaurants/", "houston-kosher", "Houston Kashruth Association", "Houston", "United States"],
    ["https://www.houstonkosher.org/", "houston-kosher", "Houston Kashruth Association", "Houston", "United States"],
    ["https://www.go-kosher.org/restaurants", "go-kosher", "Go Kosher", "New York", "United States"],
    ["https://www.go-kosher.org/", "go-kosher", "Go Kosher", "New York", "United States"],
    ["https://scrollk.org/kosher-food-establishments/", "scroll-k-denver", "Scroll K", "Denver", "United States"],
    ["https://www.ka.org.au/eating-out", "ka-nsw", "Kashrut Authority NSW", "Sydney", "Australia"],
    ["https://www.kosher.org.au/consumers/kosher-food-guide/", "kosher-australia", "Kosher Australia", "Melbourne", "Australia"],
    ["https://www.uos.co.za/kosher/", "beth-din-johannesburg", "UOS Johannesburg", "Johannesburg", "South Africa"],
    ["https://rccvaad.org/kosher-establishments/", "rcc-california", "RCC Vaad", "Los Angeles", "United States"],
    ["https://kvhkosher.org/restaurants/", "kvh-new-england", "KVH Kosher", "Boston", "United States"],
    ["https://www.kosheratlanta.org/restaurants/", "atlanta-kosher", "Atlanta Kashruth Commission", "Atlanta", "United States"],
    ["https://www.federation.org.uk/kashrus/eating-out/", "federation-kashrus", "Federation Kashrus", "London", "United Kingdom"],
    ["https://thailandkosher.com/product-tag/kosher-restaurants-in-pattaya/", "chabad-food-asia", "Chabad of Thailand", "Pattaya", "Thailand"],
    ["https://thailandkosher.com/product-tag/kosher-restaurants-in-koh-samui/", "chabad-food-asia", "Chabad of Thailand", "Koh Samui", "Thailand"],
    ["https://www.jewishsingapore.com/templates/articlecco_cdo/aid/115255/jewish/Kosher-Food.htm", "chabad-food-asia", "Chabad of Singapore", "Singapore", "Singapore"],
    ["https://www.chabadhongkong.org/templates/articlecco_cdo/aid/553177/jewish/Kosher-Food.htm", "chabad-food-asia", "Chabad of Hong Kong", "Hong Kong", "China"],
    ["https://www.chabad.jp/templates/articlecco_cdo/aid/108108/jewish/Kosher-Food.htm", "chabad-food-asia", "Chabad of Japan", "Tokyo", "Japan"],
  ];
  const fetched = await Promise.all(pages.map(async ([url, sourceKey, agency, locality, country]) => {
    const r = await fetchT(url);
    if (!r?.ok) return [];
    const parsed = parseNameAddressHtml(r.text, sourceKey, agency, locality, country, url);
    console.log("[dir]", locality, parsed.length, url.slice(0, 70));
    return parsed;
  }));
  return fetched.flat();
}

async function harvestWpDirectories() {
  const sites = [
    ["https://www.kof-k.org", "kof-k-restaurants", "Kof-K", "New York", "United States"],
    ["https://www.houstonkosher.org", "houston-kosher", "Houston Kashruth Association", "Houston", "United States"],
    ["https://www.go-kosher.org", "go-kosher", "Go Kosher", "New York", "United States"],
    ["https://scrollk.org", "scroll-k-denver", "Scroll K", "Denver", "United States"],
    ["https://www.kosher.org.au", "kosher-australia", "Kosher Australia", "Melbourne", "Australia"],
    ["https://www.uos.co.za", "beth-din-johannesburg", "UOS Johannesburg", "Johannesburg", "South Africa"],
    ["https://kvhkosher.org", "kvh-new-england", "KVH Kosher", "Boston", "United States"],
    ["https://www.kosheratlanta.org", "atlanta-kosher", "Atlanta Kashruth Commission", "Atlanta", "United States"],
    ["https://rccvaad.org", "rcc-california", "RCC Vaad", "Los Angeles", "United States"],
    ["https://www.federation.org.uk", "federation-kashrus", "Federation Kashrus", "London", "United Kingdom"],
    ["https://koshermiami.org", "miami-establishments", "Kosher Miami", "Miami", "United States"],
  ];
  const batches = await Promise.all(sites.map((s) => harvestWpSite(...s)));
  return batches.flat();
}

async function harvestFlowiz() {
  const pages = [
    ["https://www.chabadprague.cz/en/food/", "chabad-food-europe", "Chabad of Prague", "Prague", "Czech Republic"],
    ["https://chabadberlin.de/en/food/", "chabad-food-europe", "Chabad of Berlin", "Berlin", "Germany"],
    ["https://www.chabad.be/en/food/", "chabad-food-europe", "Chabad of Brussels", "Brussels", "Belgium"],
    ["https://www.chabad.nl/en/food/", "chabad-food-europe", "Chabad of Amsterdam", "Amsterdam", "Netherlands"],
    ["https://chabadmadrid.com/en/food/", "chabad-food-europe", "Chabad of Madrid", "Madrid", "Spain"],
    ["https://jewishrome.com/en/food/", "chabad-food-europe", "Chabad of Rome", "Rome", "Italy"],
    ["https://www.chabad.ch/en/food/", "chabad-food-europe", "Chabad of Switzerland", "Zurich", "Switzerland"],
    ["https://www.chabad.gr/en/food/", "chabad-food-europe", "Chabad of Athens", "Athens", "Greece"],
    ["https://www.chabadistanbul.com/en/food/", "chabad-food-europe", "Chabad of Istanbul", "Istanbul", "Turkey"],
    ["https://www.chabad.org.sg/en/food/", "chabad-food-asia", "Chabad of Singapore", "Singapore", "Singapore"],
    ["https://www.chabadofhongkong.com/en/food/", "chabad-food-asia", "Chabad of Hong Kong", "Hong Kong", "China"],
    ["https://www.chabad.jp/en/food/", "chabad-food-asia", "Chabad of Japan", "Tokyo", "Japan"],
    ["https://www.chabadkorea.com/en/food/", "chabad-food-asia", "Chabad of Korea", "Seoul", "South Korea"],
    ["https://www.chabadofindia.com/en/food/", "chabad-food-asia", "Chabad of India", "Mumbai", "India"],
    ["https://www.chabaddubai.org/en/food/", "chabad-food-asia", "Chabad of Dubai", "Dubai", "United Arab Emirates"],
    ["https://www.chabadbeijing.com/en/food/", "chabad-food-asia", "Chabad of Beijing", "Beijing", "China"],
    ["https://www.chabadshanghai.com/en/food/", "chabad-food-asia", "Chabad of Shanghai", "Shanghai", "China"],
    ["https://www.jewishslovakia.com/en/food/", "chabad-food-europe", "Chabad of Slovakia", "Bratislava", "Slovakia"],
    ["https://www.chabad.ro/en/food/", "chabad-food-europe", "Chabad of Romania", "Bucharest", "Romania"],
    ["https://chabadbarcelona.org/en/food/", "chabad-food-europe", "Chabad of Barcelona", "Barcelona", "Spain"],
  ];
  const fetched = await Promise.all(pages.map(async ([url, sourceKey, agency, locality, country]) => {
    const r = await fetchT(url);
    if (!r?.ok) return [];
    const parsed = parseFlowiz(r.text, sourceKey, agency, locality, country);
    console.log("[flowiz]", locality, parsed.length);
    return parsed;
  }));
  return fetched.flat();
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
  const [israel, osm, miami, dirs, wp, flowiz] = await Promise.all([
    harvestIsrael(),
    harvestOsm(),
    harvestMiami(),
    harvestHtmlDirectories(),
    harvestWpDirectories(),
    harvestFlowiz(),
  ]);
  const incoming = [...israel, ...osm, ...miami, ...dirs, ...wp, ...flowiz];
  const { added, bySource } = merge(harvested, incoming);
  fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
  console.log(JSON.stringify({
    added,
    total: harvested.length,
    counts: {
      israel: israel.length,
      osm: osm.length,
      miami: miami.length,
      dirs: dirs.length,
      wp: wp.length,
      flowiz: flowiz.length,
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
