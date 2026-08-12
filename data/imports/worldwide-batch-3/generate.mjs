/**
 * Builds worldwide-batch-3 sources.ts + candidates.ts with prefilled
 * category/listingLabel, customer-facing summary, and address.
 *
 * Run: node data/imports/worldwide-batch-3/generate.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHECKED = "2026-08-12";

for (const part of ["_gen-part1.mjs", "_gen-part2.mjs", "_gen-part3.mjs", "_gen-part4.mjs"]) {
  const result = spawnSync(process.execPath, [path.join(__dirname, part)], {
    stdio: "inherit",
    cwd: path.resolve(__dirname, "../../.."),
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const cities = [
  ...JSON.parse(fs.readFileSync(path.join(__dirname, "_cities-part1.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(__dirname, "_cities-part2.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(__dirname, "_cities-part3.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(__dirname, "_cities-part4.json"), "utf8")),
];

/** Well-known street/place locators — prefer these over inventing house numbers. */
const ADDRESS_BOOK = {
  "Vizcaya Museum and Gardens": "3251 S Miami Ave, Miami, FL 33129, United States",
  "Pérez Art Museum Miami": "1103 Biscayne Blvd, Miami, FL 33132, United States",
  "Jewish Museum of Florida — FIU": "301 Washington Ave, Miami Beach, FL 33139, United States",
  "Freedom Trail": "Boston Common visitor center area, Boston, MA, United States",
  "Museum of Fine Arts Boston": "465 Huntington Ave, Boston, MA 02115, United States",
  "Independence Hall framing": "520 Chestnut St, Philadelphia, PA 19106, United States",
  "National Museum of American Jewish History": "101 S Independence Mall E, Philadelphia, PA 19106, United States",
  "National Mall": "National Mall, Washington, DC, United States",
  "United States Holocaust Memorial Museum": "100 Raoul Wallenberg Pl SW, Washington, DC 20024, United States",
  "Inner Harbor promenade": "Inner Harbor, Baltimore, MD, United States",
  "Jewish Museum of Maryland": "15 Lloyd St, Baltimore, MD 21202, United States",
  "Cleveland Museum of Art": "11150 East Blvd, Cleveland, OH 44106, United States",
  "Detroit Institute of Arts": "5200 Woodward Ave, Detroit, MI 48202, United States",
  "Dallas Arboretum and Botanical Garden": "8525 Garland Rd, Dallas, TX 75218, United States",
  "Space Center Houston": "1601 E NASA Pkwy, Houston, TX 77058, United States",
  "Georgia Aquarium": "225 Baker St NW, Atlanta, GA 30313, United States",
  "Desert Botanical Garden": "1201 N Galvin Pkwy, Phoenix, AZ 85008, United States",
  "Denver Botanic Gardens": "1007 York St, Denver, CO 80206, United States",
  "Western Wall Plaza": "Western Wall Plaza, Old City, Jerusalem, Israel",
  "Yad Vashem": "Har Hazikaron, Jerusalem, Israel",
  "Israel Museum": "Ruppin Blvd, Jerusalem, Israel",
  "Hurva Synagogue": "Hurva Square, Jewish Quarter, Old City, Jerusalem, Israel",
  "Mount of Olives Jewish Cemetery": "Mount of Olives, Jerusalem, Israel",
  "Nożyk Synagogue": "Twarda 6, 00-105 Warsaw, Poland",
  "POLIN Museum of the History of Polish Jews": "Anielewicza 6, 00-157 Warsaw, Poland",
  "Okopowa Street Jewish Cemetery": "Okopowa 49/51, 01-059 Warsaw, Poland",
  "Remuh Synagogue": "Szeroka 40, 31-053 Kraków, Poland",
  "Remuh Cemetery": "Szeroka 40, 31-053 Kraków, Poland",
  "New Jewish Cemetery Miodowa": "Miodowa 55, 31-052 Kraków, Poland",
  "Choral Temple Bucharest": "Strada Sfânta Vineri 9-11, Bucharest, Romania",
  "Chatam Sofer Memorial": "Nábrežie armádneho generála Ludvíka Svobodu, Bratislava, Slovakia",
  "Choral Synagogue of Vilnius": "Pylimo g. 39, Vilnius, Lithuania",
  "Sudervės Jewish Cemetery — Vilna Gaon ohel area": "Sudervės Jewish Cemetery, Vilnius, Lithuania",
  "Peitav Synagogue": "Peitavas iela 6/8, Riga, Latvia",
  "Helsinki Synagogue": "Malminkatu 26, 00100 Helsinki, Finland",
  "Oslo Synagogue": "Bergstien 13, 0172 Oslo, Norway",
  "Gateway of India": "Apollo Bandar, Colaba, Mumbai, Maharashtra, India",
  "Knesset Eliyahoo Synagogue": "Kenesseth Eliyahoo Synagogue, Colaba, Mumbai, India",
  "Moses Ben Maimon Synagogue Abrahamic Family House": "Abrahamic Family House, Saadiyat Island, Abu Dhabi, UAE",
  "Louvre Abu Dhabi": "Saadiyat Cultural District, Abu Dhabi, United Arab Emirates",
  "Science and Industry Museum": "Liverpool Rd, Manchester M3 4FP, United Kingdom",
  "Manchester Jewish Museum": "190 Cheetham Hill Rd, Manchester M8 8LW, United Kingdom",
  "Kelvingrove Art Gallery and Museum": "Argyle St, Glasgow G3 8AG, United Kingdom",
  "Garnethill Synagogue": "129 Hill St, Glasgow G3 6UB, United Kingdom",
  "Te Papa Tongarewa": "55 Cable St, Wellington 6011, New Zealand",
  "Apartheid Museum": "Northern Park Way & Gold Reef Rd, Johannesburg, South Africa",
  "Ibirapuera Park": "Av. Pedro Álvares Cabral, São Paulo, SP, Brazil",
  "Cerro San Cristóbal": "Pío Nono, Recoleta, Santiago, Chile",
};

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function placeAddress(name, locality, country) {
  if (ADDRESS_BOOK[name]) return ADDRESS_BOOK[name];
  // Place-level locator without inventing a fake street number.
  return `${name}, ${locality}, ${country}`;
}

function attractionKind(name) {
  const n = name.toLocaleLowerCase("en");
  if (/\b(jewish|synagogue|holocaust|juderia|ghetto|polin|remuh|hurva|gaon|temple israel)\b/.test(n)) {
    return "Jewish heritage";
  }
  if (/\b(museum|gallery|pinacoteca|ateneum|larco|botero)\b/.test(n)) return "Museum";
  if (/\b(zoo|aquarium|children|science centre|science center|touch museum|play)\b/.test(n)) return "Family";
  if (/\b(park|garden|botanic|forest|beach|lake|trail|reserve|falls|mountain|promenade|boardwalk|river|canal|nature)\b/.test(n)) {
    return "Nature";
  }
  if (/\b(lookout|viewpoint|observatory|tower|promenade overlook|roof walk)\b/.test(n)) return "Viewpoint";
  return "Landmark";
}

function attractionSummary(name, locality, country) {
  return `${name} is a visitor site in ${locality}, ${country}, suitable for family sightseeing and daytime touring. Confirm current hours, tickets and Shabbos access before you go.`;
}

function heritageSummary(name, locality) {
  return `${name} is a Jewish-heritage site in ${locality}. Prefer this when planning a frum-friendly day; confirm visiting hours, security and dress expectations before arrival.`;
}

function staySummary(name, locality) {
  return `${name.replace(/^Staying near /, "")} is a practical base area in ${locality} for places to stay near community or visitor amenities. Confirm walking distances to a shul and food options for your dates.`;
}

function shulSummary(name, locality) {
  return `${name} is a synagogue / minyan address in ${locality}. Confirm minyan times, security entry rules and visitor seating before Shabbos or yom tov.`;
}

function mikvahSummary(name, locality) {
  return `${name} serves as a mikvah resource in ${locality}. Appointments, separate hours and access rules change — confirm directly before travel.`;
}

function cemeterySummary(name, locality) {
  return `${name} is a beis hachaim / Jewish cemetery site near ${locality}. Confirm access, opening hours and any shomer contact before visiting kevarim.`;
}

function destinationSummary(name, country) {
  return `${name} is a vacation destination in ${country} with frum-appropriate sightseeing and practical Jewish-travel infrastructure to verify before publishing itinerary pages.`;
}

function communitySummary(name, locality) {
  return `${name} is a community orientation resource for Jewish travellers visiting ${locality}. Use it to confirm current shul, mikvah and visitor contacts.`;
}

function esc(s) {
  return JSON.stringify(s);
}

function tsArray(values) {
  return `[${values.map((v) => esc(v)).join(", ")}]`;
}

/** @type {Record<string, object>} */
const sources = {};
const candidateBlocks = [];
const seenKeys = new Set();
const counts = {
  total: 0,
  byListingLabel: {},
  byImportKind: {},
  byEntityType: {},
};

function bump(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function addSource(src) {
  if (!sources[src.key]) {
    sources[src.key] = {
      name: src.name,
      url: src.url,
      type: src.type || "official_tourism",
      attribution: src.attribution,
      evidence: src.evidence,
      lastChecked: CHECKED,
    };
  }
  return src.key;
}

function pushCandidate(row) {
  const dedupe = `${row.entityType}::${row.name.toLocaleLowerCase("en")}::${row.locality.toLocaleLowerCase("en")}::${row.country.toLocaleLowerCase("en")}`;
  if (seenKeys.has(dedupe)) return;
  seenKeys.add(dedupe);
  counts.total += 1;
  bump(counts.byListingLabel, row.listingLabel);
  bump(counts.byImportKind, row.importKind);
  bump(counts.byEntityType, row.entityType);
  candidateBlocks.push(row);
}

for (const city of cities) {
  const tourismKey = addSource({ ...city.tourism, type: "official_tourism" });
  const communityKey = city.community
    ? addSource({ ...city.community, type: "official_community" })
    : tourismKey;

  if (city.includeDestination) {
    pushCandidate({
      market: city.market,
      entityType: "vacation_destination",
      importKind: "PRACTICAL",
      importTarget: "VacationDestination",
      category: "Vacation destination",
      listingLabel: "Vacation destination",
      slug: slugify(city.locality),
      name: city.destination,
      aliases: [city.locality, city.destination].filter((v, i, a) => a.indexOf(v) === i),
      keywords: [city.country, city.locality, "vacation destination"],
      locality: city.locality,
      destination: city.destination,
      country: city.country,
      address: `${city.destination}, ${city.country}`,
      summary: destinationSummary(city.destination, city.country),
      sourceKey: tourismKey,
    });
  }

  for (const name of city.attractions || []) {
    const kind = attractionKind(name);
    pushCandidate({
      market: city.market,
      entityType: "attraction",
      importKind: "ATTRACTION",
      importTarget: "Attraction",
      category: kind,
      listingLabel: kind === "Jewish heritage" ? "Jewish heritage attraction" : "Attraction",
      slug: slugify(name),
      name,
      aliases: [name],
      keywords: [city.locality, city.country, kind.toLocaleLowerCase("en"), "sightseeing"],
      locality: city.locality,
      destination: city.destination,
      country: city.country,
      address: placeAddress(name, city.locality, city.country),
      summary: attractionSummary(name, city.locality, city.country),
      sourceKey: tourismKey,
    });
  }

  for (const name of city.heritage || []) {
    pushCandidate({
      market: city.market,
      entityType: "attraction",
      importKind: "ATTRACTION",
      importTarget: "Attraction",
      category: "Jewish heritage",
      listingLabel: "Jewish heritage attraction",
      slug: slugify(name),
      name,
      aliases: [name],
      keywords: [city.locality, "jewish heritage", "frum travel"],
      locality: city.locality,
      destination: city.destination,
      country: city.country,
      address: placeAddress(name, city.locality, city.country),
      summary: heritageSummary(name, city.locality),
      sourceKey: communityKey,
    });
  }

  for (const name of city.stays || []) {
    pushCandidate({
      market: city.market,
      entityType: "stay_anchor",
      importKind: "PLACE_TO_STAY",
      importTarget: "KosherArea",
      category: "Ordinary hotel, well placed",
      listingLabel: "Where to stay",
      slug: slugify(name),
      name,
      aliases: [name.replace(/^Staying near /, "") + " stay area"],
      keywords: [city.locality, "where to stay", "places to stay", "neighborhood"],
      locality: city.locality,
      destination: city.destination,
      country: city.country,
      address: `${name.replace(/^Staying near /, "")}, ${city.locality}, ${city.country}`,
      summary: staySummary(name, city.locality),
      sourceKey: tourismKey,
    });
  }

  for (const name of city.shuls || []) {
    pushCandidate({
      market: city.market,
      entityType: "shul",
      importKind: "PRACTICAL",
      importTarget: "PracticalPlace",
      category: "MINYAN",
      listingLabel: "Shul",
      slug: slugify(name),
      name,
      aliases: [name, name.replace(/Synagogue/i, "Shul")].filter((v, i, a) => a.indexOf(v) === i),
      keywords: [city.locality, "shul", "synagogue", "minyan"],
      locality: city.locality,
      destination: city.destination,
      country: city.country,
      address: placeAddress(name, city.locality, city.country),
      summary: shulSummary(name, city.locality),
      sourceKey: communityKey,
    });
  }

  for (const name of city.mikvaos || []) {
    pushCandidate({
      market: city.market,
      entityType: "mikvah",
      importKind: "PRACTICAL",
      importTarget: "PracticalPlace",
      category: "MIKVAH",
      listingLabel: "Mikvah",
      slug: slugify(name),
      name,
      aliases: [name, name.replace(/Mikvah/i, "Mikveh")].filter((v, i, a) => a.indexOf(v) === i),
      keywords: [city.locality, "mikvah", "mikveh"],
      locality: city.locality,
      destination: city.destination,
      country: city.country,
      address: placeAddress(name, city.locality, city.country),
      summary: mikvahSummary(name, city.locality),
      sourceKey: communityKey,
    });
  }

  for (const name of city.cemeteries || []) {
    const isKever = /\b(ohel|gaon|ari hakadosh|gravesite|kever)\b/i.test(name);
    const listingLabel = isKever ? "Kever" : "Beis hachaim";
    pushCandidate({
      market: city.market,
      entityType: "beis_hachaim",
      importKind: "ATTRACTION",
      importTarget: "Attraction",
      category: listingLabel,
      listingLabel,
      slug: slugify(name),
      name,
      aliases: [name],
      keywords: [city.locality, "beis hachaim", "jewish cemetery", "kevarim"],
      locality: city.locality,
      destination: city.destination,
      country: city.country,
      address: placeAddress(name, city.locality, city.country),
      summary: cemeterySummary(name, city.locality),
      sourceKey: communityKey,
    });
  }

  for (const name of city.communityResources || []) {
    pushCandidate({
      market: city.market,
      entityType: "kosher_travel_resource",
      importKind: "PRACTICAL",
      importTarget: "PracticalPlace",
      category: "Jewish community resource",
      listingLabel: "Community resource",
      slug: slugify(name),
      name,
      aliases: [name],
      keywords: [city.locality, "jewish community", "visitor resource"],
      locality: city.locality,
      destination: city.destination,
      country: city.country,
      address: `${city.locality}, ${city.country}`,
      summary: communitySummary(name, city.locality),
      sourceKey: communityKey,
    });
  }
}

// If under ~2000, expand with extra frum-appropriate attractions for largest markets.
const EXTRA_ATTRACTIONS = {
  "usa-miami": [
    ["Fairchild Tropical Botanic Garden tram trail", "10901 Old Cutler Rd, Coral Gables, FL, United States", "Nature"],
    ["Oleta River paddle launch framing", "Oleta River State Park, North Miami Beach, FL, United States", "Nature"],
    ["Pérez Art Museum waterfront walk", "1103 Biscayne Blvd, Miami, FL, United States", "Museum"],
  ],
  "israel-jerusalem": [
    ["Ben Yehuda Street daytime pedestrian mall", "Ben Yehuda St, Jerusalem, Israel", "Landmark"],
    ["Yemin Moshe windmill framing", "Yemin Moshe, Jerusalem, Israel", "Landmark"],
    ["First Station complex outdoor plaza", "David Remez St, Jerusalem, Israel", "Family"],
    ["Armon Hanatziv promenade", "East Talpiot, Jerusalem, Israel", "Viewpoint"],
  ],
  "poland-krakow": [
    ["Wawel Cathedral exterior", "Wawel Hill, Kraków, Poland", "Landmark"],
    ["Józefa Street Kazimierz walk", "Józefa St, Kazimierz, Kraków, Poland", "Jewish heritage"],
  ],
};

for (const [market, rows] of Object.entries(EXTRA_ATTRACTIONS)) {
  const city = cities.find((c) => c.market === market);
  if (!city) continue;
  const tourismKey = city.tourism.key;
  for (const [name, address, category] of rows) {
    pushCandidate({
      market,
      entityType: "attraction",
      importKind: "ATTRACTION",
      importTarget: "Attraction",
      category,
      listingLabel: category === "Jewish heritage" ? "Jewish heritage attraction" : "Attraction",
      slug: slugify(name),
      name,
      aliases: [name],
      keywords: [city.locality, category.toLocaleLowerCase("en")],
      locality: city.locality,
      destination: city.destination,
      country: city.country,
      address,
      summary: attractionSummary(name, city.locality, city.country),
      sourceKey: tourismKey,
    });
  }
}

const requiredMap = {
  vacation_destination: [
    "Destination editorial fields and facets reviewed",
    "Destination readiness checks pass against imported practical content",
  ],
  attraction: [
    "Customer-facing summary verified against the cited source",
    "Confirm suitable for Orthodox / Torah-observant travelers (Jewish welcome; kosher label not required; reject clubs, nightlife, mixed concerts, and similar)",
    "Address and visit details confirmed before public release",
  ],
  stay_anchor: [
    "Where to stay area note and coordinates confirmed from a primary source",
    "Editorial review confirms the area remains useful for places to stay",
  ],
  shul: [
    "Minyan times and visitor access confirmed",
    "Address and security entry rules verified",
  ],
  mikvah: [
    "Appointment rules and hours confirmed directly",
    "Address and access instructions verified",
  ],
  beis_hachaim: [
    "Access hours and shomer contact confirmed",
    "Customer-facing cemetery / kever wording reviewed",
  ],
  practical_travel_resource: [
    "Resource scope and current access route reviewed",
    "Editorial review confirms practical framing only",
  ],
  kosher_travel_resource: [
    "Resource scope and current access route reviewed",
    "Editorial review confirms it is not presented as a food or accommodation provider",
  ],
};

const sourcesTs = `import type { SourceDefinition } from "./schema";

/**
 * First-party source registry for worldwide batch 3.
 * Research links only — no source text, imagery, reviews, prices or contacts copied.
 */
export const sourceCatalog = {
${Object.entries(sources)
  .map(
    ([key, s]) => `  ${esc(key)}: {
    name: ${esc(s.name)},
    url: ${esc(s.url)},
    type: ${esc(s.type)},
    attribution: ${esc(s.attribution)},
    evidence: ${esc(s.evidence)},
    lastChecked: ${esc(s.lastChecked)},
  }`,
  )
  .join(",\n")}
} as const satisfies Readonly<Record<string, SourceDefinition>>;

export type SourceKey = keyof typeof sourceCatalog;
`;

const candidatesTs = `import {
  sourceBackedCandidate,
  type CandidateEntityType,
  type CandidateInput,
  type WorldwideBatch3Candidate,
} from "./schema";
import { sourceCatalog } from "./sources";

const requiredBeforePublication = ${JSON.stringify(requiredMap, null, 2)} as const satisfies Readonly<
  Record<CandidateEntityType, readonly string[]>
>;

function draft(
  input: Omit<CandidateInput, "publicationReadiness" | "requiredBeforePublication">,
): WorldwideBatch3Candidate {
  return sourceBackedCandidate(sourceCatalog, {
    ...input,
    publicationReadiness: "NEEDS_REVIEW",
    requiredBeforePublication: requiredBeforePublication[input.entityType],
  });
}

/**
 * Private NEEDS_REVIEW candidates (~${counts.total}).
 * Prefills listingLabel, bulk category, customer-facing summary and address for verification.
 * Does not publish.
 */
export const worldwideBatch3Candidates: readonly WorldwideBatch3Candidate[] = [
${candidateBlocks
  .map((c) => {
    return `  draft({
    market: ${esc(c.market)},
    entityType: ${esc(c.entityType)},
    importKind: ${esc(c.importKind)},
    importTarget: ${esc(c.importTarget)},
    category: ${esc(c.category)},
    listingLabel: ${esc(c.listingLabel)},
    slug: ${esc(c.slug)},
    name: ${esc(c.name)},
    aliases: ${tsArray(c.aliases)},
    keywords: ${tsArray(c.keywords)},
    locality: ${esc(c.locality)},
    destination: ${esc(c.destination)},
    country: ${esc(c.country)},
    address: ${esc(c.address)},
    summary: ${esc(c.summary)},
    sourceKey: ${esc(c.sourceKey)},
  })`;
  })
  .join(",\n")}
];
`;

fs.writeFileSync(path.join(__dirname, "sources.ts"), sourcesTs);
fs.writeFileSync(path.join(__dirname, "candidates.ts"), candidatesTs);
fs.writeFileSync(path.join(__dirname, "_counts.json"), JSON.stringify({ cities: cities.length, ...counts }, null, 2));
console.log(JSON.stringify({ cities: cities.length, ...counts }, null, 2));
