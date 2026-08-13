/**
 * Parse Cleveland from saved HTML using establishment names in h3 titles.
 * Strip junk Address:/category-only rows, then try one more unused directory.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const RAW = path.join(__dirname, "_raw", "cleveland.html");
const LISTING = "https://clevelandkosher.org/establishments/";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const STREET =
  /\d{1,5}\s+\S.{1,90}(?:blvd|boulevard|ave|avenue|st\.?|street|rd\.?|road|dr\.?|drive|way|hwy|pkwy|parkway|ct\.?|court|place|pl\.?|lane)/i;
const BAD_NAME =
  /^(address|phone|hours|website|email|fax|map|tel|restaurant|take-?out|sushi bar|butcher|grocery|rehab|long term|kashrus)\b/i;

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryFrom(name) {
  const t = (name || "").toLowerCase();
  if (/meat|butcher/.test(t)) return "Butcher";
  if (/baker|chocolate|coffee/.test(t)) return "Bakery";
  if (/market|grocery|speedway/.test(t)) return "Grocery";
  if (/cafe|sushi|milky/.test(t)) return "Cafe";
  if (/cater/.test(t)) return "Takeaway";
  return "Restaurant";
}

function makeRow(sourceKey, agency, listingUrl, name, address, locality, country) {
  const cleanName = decode(name);
  const cleanAddress = decode(address).replace(/<br\s*\/?>/gi, ", ").replace(/\s+/g, " ").trim();
  if (!cleanName || cleanName.length < 2 || cleanName.length > 80) return null;
  if (BAD_NAME.test(cleanName)) return null;
  if (!STREET.test(cleanAddress)) return null;
  const category = categoryFrom(cleanName);
  return {
    sourceKey,
    name: cleanName,
    address: cleanAddress,
    locality,
    destination: locality,
    country,
    category,
    listingUrl,
    website: null,
    type: category,
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by ${agency}. Confirm current supervision on the cited page before relying on it.`,
  };
}

function parseCleveland(html) {
  const rows = [];
  const seen = new Set();
  const blocks = html.split(/id="elementor-tab-content-/).slice(1);
  for (const block of blocks) {
    const nameM = block.match(/<h3 class="elementor-image-box-title">([^<]+)<\/h3>/);
    const addrM = block.match(
      /elementor-heading-title[^>]*>\s*(\d{1,5}\s+[^<]*(?:Road|Rd\.?|Street|St\.?|Ave|Parkway|Blvd)[^<]*)/i,
    );
    if (!nameM || !addrM) continue;
    const row = makeRow(
      "cleveland-kosher",
      "Cleveland Kosher",
      LISTING,
      nameM[1],
      addrM[1].replace(/<br\s*\/?>/gi, ", "),
      "Cleveland",
      "United States",
    );
    if (!row) continue;
    const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  return rows;
}

function blocked(html, url) {
  const blob = `${url || ""}\n${(html || "").slice(0, 2500)}`;
  return /techloq|Just a moment|cf-mitigated|filter\.techloq|_Incapsula_Resource/i.test(blob);
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
    if (!text || text.length < 1500) {
      console.log("[skip-stub]", r.status, text.length, r.url);
      return null;
    }
    console.log("[get]", r.status, text.length, r.url);
    return { url: r.url, text };
  } catch (e) {
    console.log("[fail]", url, String(e.message || e).slice(0, 80));
    return null;
  }
}

function parseGeneric(html, sourceKey, agency, listingUrl, locality, country) {
  const lines = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(h[1-6])[^>]*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|td)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const rows = [];
  const seen = new Set();
  let pending = "";
  for (const line of lines) {
    if (/^(address|phone|hours|website)\s*:?\s*$/i.test(line)) continue;
    if (STREET.test(line) && pending && !BAD_NAME.test(pending)) {
      const row = makeRow(sourceKey, agency, listingUrl, pending, line, locality, country);
      if (row) {
        const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          rows.push(row);
        }
      }
      pending = "";
      continue;
    }
    if (STREET.test(line) || BAD_NAME.test(line)) continue;
    if (line.length >= 2 && line.length <= 80) pending = line;
  }
  return rows;
}

function restaurantLink(html, base) {
  const hrefs = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    if (!/restaurant|establishment|eating|dining|directory|licensed|kosher-food/i.test(href)) continue;
    if (/wp-json|wp-admin|page=|\.css/i.test(href)) continue;
    try {
      const abs = new URL(href, base).href;
      if (abs === base) continue;
      return abs;
    } catch {
      continue;
    }
  }
  return null;
}

let harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
harvested = harvested.filter((row) => {
  if (row.sourceKey !== "cleveland-kosher") return true;
  return row.name && !BAD_NAME.test(row.name) && !/^address\s*:?\s*$/i.test(row.name);
});

const html = fs.readFileSync(RAW, "utf8");
const cleveland = parseCleveland(html);
console.log("[cleveland-named]", cleveland.length, cleveland.slice(0, 4).map((r) => `${r.name} | ${r.address}`));

const have = new Set(harvested.map((row) => `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`));
let added = 0;
for (const row of cleveland) {
  const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}::${row.locality}`;
  if (have.has(key)) continue;
  have.add(key);
  harvested.push(row);
  added += 1;
}
console.log("[cleveland-added]", added);

const sourcesUsed = [LISTING];
const more = [
  ["https://www.skvosf.org/", "skv-norcal", "Vaad HaKashrus of Northern California", "San Francisco", "United States"],
  ["https://www.kfkosher.org/", "kedassia", "Kedassia", "London", "United Kingdom"],
];
for (const [url, sourceKey, agency, locality, country] of more) {
  const page = await get(url);
  if (!page?.text) continue;
  let rows = parseGeneric(page.text, sourceKey, agency, page.url, locality, country);
  console.log("[parsed]", rows.length, page.url);
  if (rows.length < 3) {
    const next = restaurantLink(page.text, page.url);
    if (next) {
      const extra = await get(next);
      if (extra?.text) {
        rows = parseGeneric(extra.text, sourceKey, agency, extra.url, locality, country);
        console.log("[parsed-link]", rows.length, extra.url);
        if (rows.length >= 3) {
          for (const row of rows) {
            const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}::${row.locality}`;
            if (have.has(key)) continue;
            have.add(key);
            harvested.push(row);
            added += 1;
          }
          sourcesUsed.push(extra.url);
          break;
        }
      }
    }
    continue;
  }
  for (const row of rows) {
    const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}::${row.locality}`;
    if (have.has(key)) continue;
    have.add(key);
    harvested.push(row);
    added += 1;
  }
  sourcesUsed.push(page.url);
  break;
}

fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
console.log(JSON.stringify({ sourcesUsed, added, total: harvested.length }, null, 2));
