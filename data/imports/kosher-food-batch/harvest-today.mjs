/**
 * Finish today's harvest: remaining Five Towns pages, then unused official
 * directories. 15s timeout. Skip stubs and bot walls immediately. Keep a
 * source that yields even one named venue with a street address.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { categoryFor, fetchCandidate, get, parseGeneric, UA } from "./_engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "_harvested.json");
const FIVE_TOWNS = "https://vaadhakashrus.org/establishments/";
const AJAX = "https://vaadhakashrus.org/wp-admin/admin-ajax.php";

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&#038;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&rsquo;|&#039;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function localityFrom(address) {
  const m = address.match(
    /\b(Cedarhurst|Lawrence|Hewlett|Woodmere|Inwood|Far Rockaway|Long Beach|Atlantic Beach|Valley Stream|Lynbrook|East Rockaway|Oceanside|North Woodmere)\b/i,
  );
  return m ? m[1] : "Five Towns";
}

function fiveTownsRow(name, address) {
  const cleanName = decode(name);
  const cleanAddress = decode(address).replace(/\s+\(?\d{3}[-.)\s]?\d{3}[-.\s]?\d{4}.*$/, "").trim();
  if (!cleanName || cleanName.length < 2 || cleanName.length > 80) return null;
  if (!/\d/.test(cleanAddress) || cleanAddress.length < 10) return null;
  if (/^(address|phone|hours|search|view any)/i.test(cleanName)) return null;
  const locality = localityFrom(cleanAddress);
  const category = categoryFor(cleanName);
  return {
    sourceKey: "five-towns-vaad",
    name: cleanName,
    address: cleanAddress,
    locality,
    destination: locality,
    country: "United States",
    category,
    listingUrl: FIVE_TOWNS,
    website: null,
    type: category,
    summary: `${cleanName} is listed as a kosher ${category.toLowerCase()} by the Vaad Hakashrus of the Five Towns. Confirm current supervision on the cited page before relying on it.`,
  };
}

function parseFiveTownsCards(html) {
  const rows = [];
  const seen = new Set();
  const cards = html.split(/listing_title__2920A/);
  for (const card of cards.slice(1)) {
    const name = decode((card.match(/<a[^>]*>([\s\S]*?)<\/a>/i) || [])[1] || "");
    const address = decode(
      (card.match(/maps\/search\/([^"'<]+)/i) || [])[1] ||
        (card.match(/listing-item-map_tagline[^>]*>([\s\S]*?)<\//i) || [])[1] ||
        "",
    );
    const row = fiveTownsRow(name, decodeURIComponent(address.replace(/\+/g, " ")));
    if (!row) continue;
    const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  return rows;
}

async function fiveTownsPage(page) {
  const body = new URLSearchParams({
    action: "establishment_search",
    page: String(page),
    businesstype: "",
    esktype: "",
    estitle: "",
    address: "",
  });
  const r = await fetch(AJAX, {
    method: "POST",
    headers: {
      "user-agent": UA,
      accept: "text/html,*/*",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(15000),
  });
  const text = await r.text();
  if (!text || text.length < 200) return [];
  return parseFiveTownsCards(text);
}

const extra = [
  {
    key: "milwaukee-kosher",
    sourceKey: "milwaukee-kosher",
    agency: "Vaad Hakashrus of Milwaukee",
    locality: "Milwaukee",
    country: "United States",
    urls: ["https://www.milwaukeekosher.org/", "https://milwaukeekosher.org/establishments/", "https://www.vaadhakashrusmilwaukee.org/"],
    follow: /restaurant|establishment|kosher|dining/i,
  },
  {
    key: "ottawa-kosher",
    sourceKey: "ottawa-kosher",
    agency: "Ottawa Vaad HaKashruth",
    locality: "Ottawa",
    country: "Canada",
    urls: ["https://www.ottawakosher.org/", "https://ottawakosher.org/restaurants/", "https://www.theova.org/kosher"],
    follow: /restaurant|establishment|kosher/i,
  },
  {
    key: "hamilton-kosher",
    sourceKey: "hamilton-kosher",
    agency: "Hamilton Vaad Hakashruth",
    locality: "Hamilton",
    country: "Canada",
    urls: ["https://www.hamiltonkosher.ca/", "https://hamiltonjewish.ca/kosher/"],
    follow: /restaurant|establishment|kosher/i,
  },
  {
    key: "cape-town-uos",
    sourceKey: "cape-town-uos",
    agency: "Union of Orthodox Synagogues Cape Town",
    locality: "Cape Town",
    country: "South Africa",
    urls: ["https://www.uos.co.za/cape-town", "https://www.ctjc.co.za/kosher/", "https://www.uos.co.za/kashrut"],
    follow: /restaurant|establishment|kosher|kashrut/i,
  },
  {
    key: "tampa-vaad",
    sourceKey: "tampa-vaad",
    agency: "Vaad HaKashrus of Tampa Bay",
    locality: "Tampa",
    country: "United States",
    urls: ["https://www.tampabaykosher.org/", "https://tampabaykosher.com/", "https://www.kosherflorida.org/"],
    follow: /restaurant|establishment|kosher/i,
  },
  {
    key: "orlando-kosher",
    sourceKey: "orlando-kosher",
    agency: "Orlando Kosher",
    locality: "Orlando",
    country: "United States",
    urls: ["https://www.orlandokosher.org/", "https://orlandokosher.com/"],
    follow: /restaurant|establishment|kosher/i,
  },
  {
    key: "palm-beach-kosher",
    sourceKey: "palm-beach-kosher",
    agency: "Palm Beach Vaad Hakashrus",
    locality: "Palm Beach",
    country: "United States",
    urls: ["https://www.palmbeachkosher.org/", "https://palmbeachvaad.org/"],
    follow: /restaurant|establishment|kosher/i,
  },
  {
    key: "richmond-vaad",
    sourceKey: "richmond-vaad",
    agency: "Vaad of Richmond",
    locality: "Richmond",
    country: "United States",
    urls: ["https://www.richmondvaad.org/", "https://richmondkosher.org/"],
    follow: /restaurant|establishment|kosher/i,
  },
  {
    key: "louisville-kosher",
    sourceKey: "louisville-kosher",
    agency: "Louisville Vaad Hakashrus",
    locality: "Louisville",
    country: "United States",
    urls: ["https://www.louisvillekosher.org/", "https://jewishlouisville.org/kosher/"],
    follow: /restaurant|establishment|kosher/i,
  },
  {
    key: "passaic-vaad",
    sourceKey: "passaic-vaad",
    agency: "Vaad of Passaic-Clifton",
    locality: "Passaic",
    country: "United States",
    urls: ["https://www.passaicvaad.org/", "https://passaiccliftonvaad.org/"],
    follow: /restaurant|establishment|kosher/i,
  },
  {
    key: "brussels-kosher",
    sourceKey: "brussels-kosher",
    agency: "Communauté Israélite de Bruxelles",
    locality: "Brussels",
    country: "Belgium",
    urls: ["https://www.jewishbrussels.be/", "https://www.cib.be/", "https://www.brussels-kehilla.be/"],
    follow: /casher|cacher|kosher|restaurant/i,
  },
  {
    key: "munich-jg",
    sourceKey: "munich-jg",
    agency: "Israelitische Kultusgemeinde München",
    locality: "Munich",
    country: "Germany",
    urls: ["https://www.ikg-m.de/", "https://www.ikg-muenchen.de/koscher", "https://www.jgm.de/"],
    follow: /koscher|restaurant|essen/i,
  },
  {
    key: "athens-kis",
    sourceKey: "athens-kis",
    agency: "Central Board of Jewish Communities of Greece",
    locality: "Athens",
    country: "Greece",
    urls: ["https://www.kis.gr/en/kosher", "https://www.kis.gr/"],
    follow: /kosher|restaurant|food/i,
  },
  {
    key: "lisbon-cil",
    sourceKey: "lisbon-cil",
    agency: "Comunidade Israelita de Lisboa",
    locality: "Lisbon",
    country: "Portugal",
    urls: ["https://www.cilisboa.org/", "https://cilisboa.org/kosher/"],
    follow: /kosher|casher|restaurante/i,
  },
  {
    key: "singapore-jews",
    sourceKey: "singapore-jews",
    agency: "Jewish Welfare Board Singapore",
    locality: "Singapore",
    country: "Singapore",
    urls: ["https://www.singaporejews.com/kosher", "https://www.singaporejews.com/"],
    follow: /kosher|restaurant|food/i,
  },
  {
    key: "bangkok-jewish",
    sourceKey: "bangkok-jewish",
    agency: "Jewish Association of Thailand",
    locality: "Bangkok",
    country: "Thailand",
    urls: ["https://www.jewishthailand.com/", "https://jewishbangkok.com/"],
    follow: /kosher|restaurant|food/i,
  },
  {
    key: "lima-cip",
    sourceKey: "lima-cip",
    agency: "Asociación Judía del Perú",
    locality: "Lima",
    country: "Peru",
    urls: ["https://www.apj.org.pe/", "https://www.cip.org.pe/"],
    follow: /kosher|casher|restaurante/i,
  },
  {
    key: "panama-kol",
    sourceKey: "panama-kol",
    agency: "Kol Shearith Israel / Comunidad Judía de Panamá",
    locality: "Panama City",
    country: "Panama",
    urls: ["https://www.kolshearith.org/", "https://www.centroisraelita.org.pa/"],
    follow: /kosher|casher|restaurante/i,
  },
];

const harvested = JSON.parse(fs.readFileSync(OUT, "utf8"));
const have = new Set(
  harvested.map((row) => `${row.name.toLowerCase()}::${(row.address || "").toLowerCase()}::${row.locality}`),
);
const outcomes = [];
const kept = [];
let added = 0;

function absorb(rows, label) {
  let sourceAdded = 0;
  for (const row of rows) {
    const key = `${row.name.toLowerCase()}::${row.address.toLowerCase()}::${row.locality}`;
    if (have.has(key)) continue;
    have.add(key);
    harvested.push(row);
    added += 1;
    sourceAdded += 1;
  }
  if (sourceAdded) kept.push({ label, kept: sourceAdded, sample: rows.slice(0, 3).map((r) => `${r.name} | ${r.address}`) });
  return sourceAdded;
}

const first = await get(FIVE_TOWNS);
if (first.kind === "ok") {
  const page1 = parseFiveTownsCards(first.text);
  console.log("[five-towns page1]", page1.length);
  absorb(page1, FIVE_TOWNS);
  for (let page = 2; page <= 5; page += 1) {
    try {
      const rows = await fiveTownsPage(page);
      console.log(`[five-towns page${page}]`, rows.length);
      absorb(rows, `${FIVE_TOWNS}#${page}`);
    } catch (error) {
      console.log("[five-towns fail]", page, String(error.message || error).slice(0, 80));
      outcomes.push(`five-towns page ${page} fail`);
    }
  }
} else {
  console.log("[five-towns]", first.kind, first.error || first.status || "");
  outcomes.push(`five-towns ${first.kind}`);
}

for (const cfg of extra) {
  const { page, tried } = await fetchCandidate(cfg);
  if (!page) {
    console.log("[miss]", cfg.key, tried.join(" | "));
    outcomes.push(`${cfg.key} ${tried[tried.length - 1] || "none"}`);
    continue;
  }
  const rows = parseGeneric(
    page.text,
    {
      sourceKey: cfg.sourceKey,
      agency: cfg.agency,
      locality: cfg.locality,
      country: cfg.country,
    },
    page.url,
  );
  console.log("[parsed]", cfg.key, rows.length, page.url);
  if (!rows.length) {
    outcomes.push(`${cfg.key} parsed-0 ${page.url}`);
    continue;
  }
  absorb(rows, page.url);
}

fs.writeFileSync(OUT, JSON.stringify(harvested, null, 2));
console.log(JSON.stringify({ added, total: harvested.length, kept, outcomes }, null, 2));
