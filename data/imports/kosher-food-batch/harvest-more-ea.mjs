/**
 * More Europe/Asia kosher directories. Appends unique rows to _harvested.json.
 * 15s timeouts. Does not publish.
 *
 * Run: node data/imports/kosher-food-batch/harvest-more-ea.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const RAW = path.join(__dirname, "_raw");
const UA = "Mozilla/5.0 (compatible; WhiteGloveKosherResearch/1.0)";
const TIMEOUT_MS = 15000;
const SKIP_NAME = /kosher[-\s]?style|israeli[-\s]?style|jewish[-\s]?style|type_text|color_link/i;

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

async function fetchT(url, timeout = TIMEOUT_MS) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/json,*/*" },
      signal: AbortSignal.timeout(timeout),
      redirect: "follow",
    });
    return { ok: r.ok, status: r.status, url: r.url, text: await r.text() };
  } catch (error) {
    console.log(`[fail] ${url} ${error.message || error}`);
    return null;
  }
}

function categoryFrom(text) {
  const t = (text || "").toLowerCase();
  if (/butcher|boucher/.test(t)) return "Butcher";
  if (/baker|ice cream/.test(t)) return "Bakery";
  if (/grocery|store|market|supermarket|wine/.test(t) && !/restaurant/.test(t)) return "Grocery";
  if (/cafe|dairy/.test(t)) return "Cafe";
  if (/take|cater|kitchen/.test(t)) return "Takeaway";
  return "Restaurant";
}

function makeRow({ sourceKey, agency, name, address, locality, country, type, listingUrl, website }) {
  const cleanName = decode(name);
  const cleanAddress = decode(address);
  if (!cleanName || SKIP_NAME.test(cleanName) || cleanName.length < 2) return null;
  if (!cleanAddress || cleanAddress.length < 6) return null;
  if (/<|>/.test(cleanAddress)) return null;
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

function parseFlowiz(html, sourceKey, agency, locality, country) {
  const rows = [];
  const cards = [...html.matchAll(/<a href="([^"]+\/(?:en\/)?food\/\d+\/?)"[\s\S]{0,2500}?<\/a>/gi)];
  for (const m of cards) {
    const name = decode((m[0].match(/<h3 class="item-name">\s*([^<]+)/i) || [])[1] || "");
    const address = decode((m[0].match(/<span class="item-text">\s*([^<]+)/i) || [])[1] || "");
    const type = decode((m[0].match(/<div class="item-tag">[\s\S]*?<span>([^<]+)/i) || [])[1] || "");
    const row = makeRow({
      sourceKey,
      agency,
      name,
      address,
      locality,
      country,
      type,
      listingUrl: m[1],
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseKlbd(html) {
  const rows = [];
  const listingUrl = "https://www.kosher.org.uk/directory/restaurants";
  for (const m of html.matchAll(/<a[^>]+href="((?:https?:\/\/www\.kosher\.org\.uk)?\/directory\/[^"]+)"[^>]*>([^<]{3,80})<\/a>/gi)) {
    const href = m[1].startsWith("http") ? m[1] : `https://www.kosher.org.uk${m[1]}`;
    const name = decode(m[2]);
    if (/directory|restaurants|search|login|filter/i.test(name)) continue;
    const row = makeRow({
      sourceKey: "klbd-restaurants",
      agency: "KLBD",
      name,
      address: `${name}, listed by KLBD, United Kingdom`,
      locality: "London",
      country: "United Kingdom",
      type: "Restaurant",
      listingUrl: href,
    });
    if (row) rows.push(row);
  }
  return rows;
}

function parseCsv(text, listingUrl) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return rows;
  const split = (line) => {
    const cols = [];
    let cur = "";
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if ((ch === "," || ch === ";" || ch === "\t") && !q) {
        cols.push(cur);
        cur = "";
      } else cur += ch;
    }
    cols.push(cur);
    return cols.map((c) => c.trim().replace(/^"|"$/g, ""));
  };
  const header = split(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = header.findIndex((h) => /שם|name|esek|business|mosad|institution|restaurant/.test(h));
  const addrIdx = header.findIndex((h) => /כתובת|address|רחוב|street/.test(h));
  const cityIdx = header.findIndex((h) => /ישוב|city|עיר|yishuv|settlement/.test(h));
  if (nameIdx < 0) return rows;
  for (const line of lines.slice(1, 8000)) {
    if (!line.trim()) continue;
    const cols = split(line);
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
      listingUrl,
    });
    if (row) rows.push(row);
  }
  return rows;
}

async function harvestIsrael() {
  const rows = [];
  const searches = [
    "https://data.gov.il/api/3/action/package_search?q=%D7%9B%D7%A9%D7%A8%D7%95%D7%AA&rows=20",
    "https://data.gov.il/api/3/action/package_search?q=kashrut&rows=20",
  ];
  for (const url of searches) {
    const r = await fetchT(url, TIMEOUT_MS);
    if (!r?.ok) continue;
    if (r.text.trim().startsWith("<")) {
      console.log("[govil] html not json", r.status, r.text.slice(0, 80).replace(/\s+/g, " "));
      continue;
    }
    try {
      const json = JSON.parse(r.text);
      const packages = json.result?.results || [];
      console.log("[govil] packages", packages.length, packages.map((p) => p.name).slice(0, 6));
      for (const pkg of packages) {
        for (const res of pkg.resources || []) {
          const dataUrl = res.url;
          if (!dataUrl) continue;
          if (!/csv|json|xls/i.test(`${res.format || ""} ${dataUrl}`)) continue;
          const d = await fetchT(dataUrl, TIMEOUT_MS);
          if (!d?.ok) continue;
          const listingUrl = `https://data.gov.il/dataset/${pkg.name}`;
          if (/csv/i.test(res.format || dataUrl) || d.text.includes(",")) {
            const parsed = parseCsv(d.text, listingUrl);
            console.log("[govil-csv]", pkg.name, parsed.length);
            rows.push(...parsed);
          }
        }
      }
    } catch (error) {
      console.log("[govil] parse", error.message);
    }
  }
  return rows;
}

async function harvestKlbdLive() {
  const saved = path.join(RAW, "klbd.html");
  let html = fs.existsSync(saved) ? fs.readFileSync(saved, "utf8") : "";
  if (html.length < 1000) {
    const r = await fetchT("https://www.kosher.org.uk/directory/restaurants", TIMEOUT_MS);
    if (r?.ok) {
      html = r.text;
      fs.writeFileSync(saved, html.slice(0, 400000));
    }
  }
  const rows = html ? parseKlbd(html) : [];
  console.log("[klbd]", rows.length);
  return rows;
}

async function harvestConsistoire() {
  const rows = [];
  const urls = [
    "https://www.consistoire.org/commerces/",
    "https://www.consistoire.org/wp-json/wp/v2/pages?search=commerce&per_page=20",
  ];
  for (const url of urls) {
    const r = await fetchT(url, TIMEOUT_MS);
    if (!r?.ok) continue;
    fs.writeFileSync(path.join(RAW, `consistoire-${url.replace(/[^\w]+/g, "-").slice(0, 40)}.html`), r.text.slice(0, 250000));
    if (r.text.trim().startsWith("[") || r.text.trim().startsWith("{")) {
      try {
        const json = JSON.parse(r.text);
        const items = Array.isArray(json) ? json : [];
        console.log("[consistoire json]", items.length);
      } catch {
        /* ignore */
      }
    }
    const jsonUrls = [...r.text.matchAll(/https?:\/\/[^"'\\\s]+(?:commerces?|casher|restaurant)[^"'\\\s]*/gi)].slice(0, 10);
    console.log("[consistoire urls]", jsonUrls.map((m) => m[0]).slice(0, 5));
  }
  return rows;
}

async function harvestMoreFlowiz() {
  const pages = [
    ["https://chabadhungary.com/en/food/", "chabad-food-europe", "Chabad of Budapest", "Budapest", "Hungary"],
    ["https://chabadpoland.org/en/food/", "chabad-food-europe", "Chabad of Warsaw", "Warsaw", "Poland"],
    ["https://chabadbarcelona.org/en/food/", "chabad-food-europe", "Chabad of Barcelona", "Barcelona", "Spain"],
    ["https://www.chabad.ro/en/food/", "chabad-food-europe", "Chabad of Bucharest", "Bucharest", "Romania"],
    ["https://chabadkrakow.pl/en/food/", "chabad-food-europe", "Chabad of Kraków", "Kraków", "Poland"],
  ];
  const rows = [];
  for (const [url, sourceKey, agency, locality, country] of pages) {
    const r = await fetchT(url, TIMEOUT_MS);
    if (!r?.ok) continue;
    const parsed = parseFlowiz(r.text, sourceKey, agency, locality, country);
    console.log("[flowiz]", locality, parsed.length);
    rows.push(...parsed);
  }
  return rows;
}

function merge(existing, incoming) {
  const seen = new Set(existing.map((row) => `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`));
  let added = 0;
  for (const row of incoming) {
    const key = `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`;
    if (seen.has(key)) continue;
    seen.add(key);
    existing.push(row);
    added += 1;
  }
  return added;
}

async function main() {
  const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
  console.log("before", harvested.length);
  const [israel, klbd, consistoire, flowiz] = await Promise.all([
    harvestIsrael(),
    harvestKlbdLive(),
    harvestConsistoire(),
    harvestMoreFlowiz(),
  ]);
  const added = merge(harvested, [...israel, ...klbd, ...consistoire, ...flowiz]);
  fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
  const bySource = {};
  for (const row of harvested) bySource[row.sourceKey] = (bySource[row.sourceKey] || 0) + 1;
  console.log(JSON.stringify({
    added,
    total: harvested.length,
    israel: israel.length,
    klbd: klbd.length,
    consistoire: consistoire.length,
    flowiz: flowiz.length,
    bySource,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .then(() => process.exit(0));
