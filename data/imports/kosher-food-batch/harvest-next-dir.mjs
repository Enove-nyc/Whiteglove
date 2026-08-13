/**
 * Try unused directories until one returns named restaurants + street addresses.
 * 15s timeout. Skip tiny/stub/blocked pages immediately. No WP pagination.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const STREET =
  /\d{1,5}\s+\S.{1,90}(?:blvd|boulevard|ave|avenue|st\.?|street|rd\.?|road|dr\.?|drive|way|hwy|highway|pkwy|ct\.?|court|place|pl\.?|lane|ln\.?|pico|olympic|beverly|ventura|burbank|robertson|fairfax|wilshire|oxnard|canwood|peachtree|roswell)/i;

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

function blocked(html, url) {
  const blob = `${url || ""}\n${(html || "").slice(0, 2500)}`;
  return /techloq|Just a moment|cf-mitigated|filter\.techloq|_Incapsula_Resource|incapsula incident/i.test(blob);
}

function stub(html) {
  return !html || html.length < 1500;
}

async function get(url) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html" },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    const text = await r.text();
    if (blocked(text, r.url)) {
      console.log("[skip-blocked]", url);
      return null;
    }
    if (stub(text)) {
      console.log("[skip-stub]", r.status, text.length, r.url);
      return null;
    }
    console.log("[get]", r.status, text.length, r.url);
    return { status: r.status, url: r.url, text };
  } catch (e) {
    console.log("[fail]", url, String(e.message || e).slice(0, 80));
    return null;
  }
}

function categoryFrom(name) {
  const t = (name || "").toLowerCase();
  if (/butcher/.test(t)) return "Butcher";
  if (/baker|bagel|ice cream|creamery|candy|pastry/.test(t)) return "Bakery";
  if (/market|grocery|supermarket/.test(t) && !/restaurant|grill|cafe/.test(t)) return "Grocery";
  if (/cafe|pizza|dairy/.test(t)) return "Cafe";
  if (/cater|take/.test(t)) return "Takeaway";
  return "Restaurant";
}

function localityFrom(address, fallback) {
  const m = address.match(
    /\b(Los Angeles|Beverly Hills|Encino|Valley Village|Sherman Oaks|Tarzana|Woodland Hills|North Hollywood|Malibu|Reseda|Atlanta|Sandy Springs|Marietta|New York|Brooklyn|Queens)\b/i,
  );
  return m ? m[1] : fallback;
}

function makeRow(sourceKey, agency, listingUrl, name, address, fallbackLocality) {
  let cleanName = decode(name)
    .replace(/\s*\((?:RCC|O\/K|OK|OU|Kehilla|Cholov Yisroel|dairy|meat)[^)]*\)\s*$/i, "")
    .replace(/\s*\([^)]{0,40}\)\s*$/, "")
    .trim();
  const cleanAddress = decode(address)
    .replace(/\s*\(\d{3}\)[-.\s]?\d{3}[-.\s]?\d{4}.*$/, "")
    .replace(/\s+\d{3}[-.\s]?\d{3}[-.\s]?\d{4}.*$/, "")
    .replace(/https?:\/\/\S+/g, "")
    .trim();
  if (!cleanName || cleanName.length < 2 || cleanName.length > 80) return null;
  if (/^(los angeles|la valley|restaurants|local info|kosher|west coast|click|home|menu)/i.test(cleanName)) return null;
  if (!STREET.test(cleanAddress)) return null;
  const locality = localityFrom(cleanAddress, fallbackLocality);
  const category = categoryFrom(cleanName);
  return {
    sourceKey,
    name: cleanName,
    address: cleanAddress,
    locality,
    destination: locality,
    country: "United States",
    category,
    listingUrl,
    website: null,
    type: category,
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by ${agency}. Confirm current supervision on the cited page before relying on it.`,
  };
}

function parseHtml(html, sourceKey, agency, listingUrl, locality) {
  const lines = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|td|article|strong)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "'")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const rows = [];
  const seen = new Set();
  function add(row) {
    if (!row) return;
    const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  }
  let pending = "";
  for (const line of lines) {
    const inline = line.match(
      /^([A-Za-z0-9][^()]{1,70}?)\s*(?:\([^)]{0,60}\))?\s+(\d{1,5}\s+\S.{2,90}?)(?:\s+\(?\d{3}[-.\s)]+\d{3}[-.\s]?\d{4}.*)?$/,
    );
    if (inline && STREET.test(inline[2])) {
      add(makeRow(sourceKey, agency, listingUrl, inline[1], inline[2], locality));
      pending = "";
      continue;
    }
    if (STREET.test(line) && pending) {
      add(makeRow(sourceKey, agency, listingUrl, pending, line, locality));
      pending = "";
      continue;
    }
    if (STREET.test(line)) continue;
    if (line.length >= 2 && line.length <= 70) pending = line;
  }
  return rows;
}

const targets = [
  ["https://www.kosherquest.org/socal-kosher-restaurants/", "kosher-quest", "Kosher Quest", "Los Angeles"],
  ["https://www.go-kosher.org/", "go-kosher", "Go Kosher", "New York"],
  ["https://kosheratlanta.org/local-info/", "atlanta-kosher", "Atlanta Kashruth Commission", "Atlanta"],
  ["https://www.kosheratlanta.org/restaurants/", "atlanta-kosher", "Atlanta Kashruth Commission", "Atlanta"],
];

let chosen = null;
let incoming = [];
for (const [url, sourceKey, agency, locality] of targets) {
  const page = await get(url);
  if (!page?.text) continue;
  const rows = parseHtml(page.text, sourceKey, agency, page.url, locality);
  console.log("[parsed]", rows.length, url);
  if (rows.length >= 3) {
    chosen = { url: page.url, sourceKey, agency };
    incoming = rows;
    break;
  }
}

if (!incoming.length) {
  console.log(JSON.stringify({ source: null, incoming: 0, added: 0 }));
  process.exit(1);
}

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
console.log(
  JSON.stringify(
    {
      source: chosen.url,
      sourceKey: chosen.sourceKey,
      incoming: incoming.length,
      added,
      total: harvested.length,
      sample: incoming.slice(0, 4).map((r) => `${r.name} | ${r.address}`),
    },
    null,
    2,
  ),
);
