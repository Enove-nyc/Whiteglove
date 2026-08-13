import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const STREET = /(?:\d{1,5}[,\s]+\S.{1,90}(?:blvd|boulevard|ave\.?|avenue|st\.?|street|rd\.?|road|dr\.?|drive|way|rue|place|lane|calle|via|strasse|straße|gasse|rua|avenida|straat|laan|plein|platz|weg|ulice|piazza|viale|colon(?:ia)?))|(?:(?:calle|via|strasse|straße|gasse|rue|straat|laan|ulice|piazza|viale|avenida|platz|weg)\s+\S.{2,80}?\s+\d{1,5}\b)/i;
const BAD = /^(address|phone|hours|tel|fax|website|email|map|home|menu|copyright|compliance|screen-reader|keyboard)/i;
const JUNK = /copyright|compliance status|screen-reader|keyboard navigation|wcag|{{reg|cookie|privacy policy/i;
const FOOD = /restaurant|kitchen|dining|bakery|grocery|cafe|café|deli|market|food|cater|pizza|grill|eatery|kosher|casher|koscher/i;
const BLOCKED = /techloq|Just a moment|cf-mitigated|_Incapsula_Resource|Attention Required!|sorry, you have been blocked/i;

async function get(url) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    const text = await r.text();
    if (BLOCKED.test(`${r.url}\n${text.slice(0, 2500)}`)) {
      console.log("[skip-blocked]", url);
      return { kind: "blocked", url: r.url };
    }
    if (r.status === 404) {
      console.log("[404]", url);
      return { kind: "fail", url: r.url, status: 404 };
    }
    if (!text || text.length < 1500) {
      console.log("[skip-stub]", r.status, text.length, url);
      return { kind: "stub", url: r.url };
    }
    console.log("[get]", r.status, text.length, r.url);
    return { kind: "ok", url: r.url, text, status: r.status };
  } catch (e) {
    console.log("[fail]", url, String(e.message || e).slice(0, 80));
    return { kind: "fail", url };
  }
}

function absUrl(base, href) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function firstMatchingLink(html, pageUrl, re) {
  const hrefs = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    if (!re.test(href)) continue;
    if (/\.(css|js|png|jpg|jpeg|gif|svg|pdf|json)(\?|$)/i.test(href)) continue;
    if (/wp-json|wp-admin|mailto:|javascript:/i.test(href)) continue;
    const abs = absUrl(pageUrl, href);
    if (abs && abs !== pageUrl) return abs;
  }
  return null;
}

function makeRow(sourceKey, agency, listingUrl, name, address, locality, country) {
  const cleanName = String(name || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#8217;/g, "'").replace(/\s+/g, " ").trim();
  const cleanAddress = String(address || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!cleanName || cleanName.length < 2 || cleanName.length > 70) return null;
  if (BAD.test(cleanName) || JUNK.test(cleanName) || JUNK.test(cleanAddress)) return null;
  if (/^(chabad|synagogue|shul|gemeinde|community)\b/i.test(cleanName) && !FOOD.test(cleanName)) return null;
  if (cleanAddress.length > 140 || !STREET.test(cleanAddress)) return null;
  const t = cleanName.toLowerCase();
  const category = /baker/.test(t) ? "Bakery" : /market|grocery/.test(t) ? "Grocery" : /kitchen|cater/.test(t) ? "Takeaway" : "Restaurant";
  return {
    sourceKey, name: cleanName, address: cleanAddress, locality, destination: locality, country,
    category, listingUrl, website: null, type: category,
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by ${agency}. Confirm current supervision on the cited page before relying on it.`,
  };
}

function parseHtml(html, sourceKey, agency, listingUrl, locality, country) {
  const lines = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<(h[1-6])[^>]*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|td|article|strong)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const rows = [];
  const seen = new Set();
  let pending = "";
  for (const line of lines) {
    if (/^(address|phone|hours|website|tel)\s*:?\s*$/i.test(line) || JUNK.test(line)) continue;
    if (STREET.test(line) && pending && !BAD.test(pending) && !JUNK.test(pending)) {
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
    if (STREET.test(line) || BAD.test(line) || JUNK.test(line)) continue;
    if (line.length >= 2 && line.length <= 70) pending = line;
  }
  return rows;
}

const cities = [
  {
    city: "San Diego",
    sourceKey: "named-kosher-website",
    agency: "San Diego Vaad",
    locality: "San Diego",
    country: "United States",
    urls: ["https://www.sandiegovaad.org/", "https://www.sandiegovaad.org/kosher-establishments/"],
    followFromHome: /establishments|restaurants/i,
  },
  {
    city: "Zurich",
    sourceKey: "named-kosher-website",
    agency: "IRG Zürich",
    locality: "Zurich",
    country: "Switzerland",
    urls: ["https://www.irgzuerich.ch/", "https://www.irgzuerich.ch/koscher/", "https://www.irgzuerich.ch/kashrut/"],
  },
  {
    city: "Amsterdam",
    sourceKey: "named-kosher-website",
    agency: "NIHS Amsterdam",
    locality: "Amsterdam",
    country: "Netherlands",
    urls: ["https://www.nihs.nl/", "https://www.nihs.nl/kosher/", "https://www.nihs.nl/kashrut/"],
  },
  {
    city: "Mexico City",
    sourceKey: "named-kosher-website",
    agency: "Comunidad Judía de México",
    locality: "Mexico City",
    country: "Mexico",
    urls: ["https://www.cjm.org.mx/"],
    followFromHome: /casher|kosher|directorio/i,
  },
  {
    city: "Berlin",
    sourceKey: "chabad-food-europe",
    agency: "Chabad Berlin",
    locality: "Berlin",
    country: "Germany",
    urls: [
      "https://www.chabadberlin.de/en/food/",
      "https://www.chabadberlin.de/food/",
      "https://www.chabadberlin.de/en/templates/articlecdo/aid/food",
    ],
  },
  {
    city: "Rome",
    sourceKey: "chabad-food-europe",
    agency: "Chabad Rome",
    locality: "Rome",
    country: "Italy",
    urls: [
      "https://jewishrome.com/en/food/",
      "https://www.jewishrome.com/food/",
      "https://www.chabadrome.com/en/food/",
      "https://www.chabadrome.com/food/",
    ],
  },
  {
    city: "Prague",
    sourceKey: "chabad-food-europe",
    agency: "Chabad Prague",
    locality: "Prague",
    country: "Czechia",
    urls: [
      "https://chabadprague.cz/en/food/",
      "https://www.chabadprague.cz/food/",
      "https://www.chabadprague.cz/en/templates/articlecdo/aid/",
    ],
  },
];

const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
const have = new Set(harvested.map((row) => `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`));
let added = 0;
const cityResults = [];

for (const city of cities) {
  const tried = [];
  let page = null;
  let followUsed = false;
  for (const url of city.urls) {
    const res = await get(url);
    tried.push(`${url} → ${res.kind}`);
    if (res.kind === "ok") {
      page = res;
      break;
    }
  }
  if (page?.kind === "ok" && city.followFromHome && !/establishments|restaurants|kosher|casher|directorio|koscher|kashrut|\/food/i.test(page.url)) {
    const next = firstMatchingLink(page.text, page.url, city.followFromHome);
    if (next && !tried.some((t) => t.startsWith(next))) {
      followUsed = true;
      const res = await get(next);
      tried.push(`${next} → ${res.kind} (one follow)`);
      if (res.kind === "ok") page = res;
    }
  }
  if (!page || page.kind !== "ok") {
    cityResults.push({ city: city.city, status: "fail/block", tried, kept: 0 });
    continue;
  }
  const rows = parseHtml(page.text, city.sourceKey, city.agency, page.url, city.locality, city.country);
  console.log("[parsed]", city.city, rows.length, page.url, rows.slice(0, 3).map((r) => `${r.name} | ${r.address}`));
  let n = 0;
  for (const row of rows) {
    const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}::${row.locality}`;
    if (have.has(key)) continue;
    have.add(key);
    harvested.push(row);
    added += 1;
    n += 1;
  }
  cityResults.push({
    city: city.city,
    status: n ? "worked" : rows.length ? "all-dupes" : "parsed-0",
    url: page.url,
    followUsed,
    parsed: rows.length,
    kept: n,
    sample: rows.slice(0, 3).map((r) => r.name),
  });
}

fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
console.log(JSON.stringify({ added, total: harvested.length, cityResults }, null, 2));
