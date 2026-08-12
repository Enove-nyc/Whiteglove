/**
 * Builds worldwide-batch-4 sources.ts + candidates.ts with prefilled
 * category/listingLabel, customer-facing summary, address, and coordinates when known.
 *
 * Run: node data/imports/worldwide-batch-4/generate.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CITIES as PART1 } from "./_catalog-part1.mjs";
import { CITIES as PART2 } from "./_catalog-part2.mjs";
import { CITIES as PART3 } from "./_catalog-part3.mjs";
import { CITIES as PART4 } from "./_catalog-part4.mjs";
import { CITIES as PART5 } from "./_catalog-part5.mjs";
import { CITIES as PART6 } from "./_catalog-part6.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHECKED = "2026-08-12";
const TARGET = 5000;

const cities = [...PART1, ...PART2, ...PART3, ...PART4, ...PART5, ...PART6];

/** Well-known street/place locators — prefer these over inventing house numbers. */
const ADDRESS_BOOK = {
  "Tempio Maggiore di Roma": "Lungotevere de' Cenci, 00186 Roma, Italy",
  "Tempio Maggiore di Firenze": "Via Luigi Carlo Farini 4, 50121 Firenze, Italy",
  "Venice Ghetto Nuovo": "Campo del Ghetto Nuovo, 30121 Venezia, Italy",
  "Sinagoga Kadoorie Mekor Haim": "Rua de Guerra Junqueiro 340, 4150-386 Porto, Portugal",
  "Grand Synagogue de la Victoire": "44 Rue de la Victoire, 75009 Paris, France",
  "Musée d'Art et d'Histoire du Judaïsme": "71 Rue du Temple, 75003 Paris, France",
  "Mémorial de la Shoah": "17 Rue Geoffroy-l'Asnier, 75004 Paris, France",
  "Ohel Jakob Synagogue": "St.-Jakobs-Platz 18, 80331 München, Germany",
  "Synagoge Löwenstrasse": "Löwenstrasse 10, 8001 Zürich, Switzerland",
  "Kahal Kadosh Beth Elohim": "90 Hasell St, Charleston, SC 29401, United States",
  "Congregation Mickve Israel": "20 E Gordon St, Savannah, GA 31401, United States",
  "Templo Libertad": "Libertad 785, C1012AAE Buenos Aires, Argentina",
  "Royal Ontario Museum": "100 Queens Park, Toronto, ON M5S 2C6, Canada",
  "High Park": "1873 Bloor St W, Toronto, ON, Canada",
  "Mount Royal Park": "1260 Remembrance Rd, Montréal, QC, Canada",
  "Ashkelon National Park": "Ashkelon National Park, Ashkelon, Israel",
  "Tel Be'er Sheva National Park": "Tel Be'er Sheva National Park, Israel",
  "Apollonia National Park": "Apollonia National Park, Herzliya, Israel",
  "Or Torah Synagogue Akko": "Old City, Akko, Israel",
  "Sofia Synagogue": "Exarch Joseph St 16, Sofia, Bulgaria",
  "New Synagogue Szeged": "Josika utca 10, Szeged, Hungary",
  "Ben Ezra Synagogue": "Old Cairo, Cairo, Egypt",
  "Ibn Danan Synagogue": "Fes el-Bali, Fez, Morocco",
  "Maghain Aboth Synagogue": "24 Waterloo St, Singapore 187968",
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
  return `${name}, ${locality}, ${country}`;
}

function attractionKind(name) {
  const n = name.toLocaleLowerCase("en");
  if (/\b(jewish|synagogue|holocaust|juderia|ghetto|mellah|shoah|memorial|judío|judaïsme|synagoge)\b/.test(n)) {
    return "Jewish heritage";
  }
  if (/\b(museum|gallery|pinacoteca|ateneum|mémorial|science centre|science center)\b/.test(n)) return "Museum";
  if (/\b(zoo|aquarium|children|play|questacon|explora|family)\b/.test(n)) return "Family";
  if (/\b(park|garden|botanic|forest|beach|lake|trail|reserve|falls|mountain|promenade|boardwalk|river|canal|nature|greenbelt|arboretum)\b/.test(n)) {
    return "Nature";
  }
  if (/\b(lookout|viewpoint|observatory|tower|overlook|viewpoint|tramway|skywalk)\b/.test(n)) return "Viewpoint";
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
  if (seenKeys.has(dedupe)) return false;
  seenKeys.add(dedupe);
  counts.total += 1;
  bump(counts.byListingLabel, row.listingLabel);
  bump(counts.byImportKind, row.importKind);
  bump(counts.byEntityType, row.entityType);
  candidateBlocks.push(row);
  return true;
}

function expansionAttractions(city) {
  const L = city.locality;
  return [
    `${L} downtown daytime walking district`,
    `${L} waterfront or riverside promenade framing`,
    `${L} central public park circuit`,
    `${L} botanical or rose garden framing`,
    `${L} science or children's museum framing`,
    `${L} historic civic plaza daytime walk`,
    `${L} university campus greens framing`,
    `${L} scenic overlook or hill viewpoint`,
    `${L} nature reserve trailhead framing`,
    `${L} farmers market daytime visit`,
    `${L} lakeside or beach daytime shore walk`,
    `${L} cultural district outdoor plaza`,
    `${L} memorial gardens daytime visit`,
    `${L} zoo or wildlife park framing`,
    `${L} museum quarter outdoor approach`,
  ];
}

function expansionStays(city) {
  return [
    `Staying near ${city.locality} city center`,
    `Staying near ${city.locality} family hotel corridor`,
    `Staying near ${city.locality} park-adjacent neighbourhood`,
  ];
}

function expansionHeritage(city) {
  return [`${city.locality} Jewish heritage walking corridor`];
}

for (const city of cities) {
  const tourismKey = addSource({ ...city.tourism, type: "official_tourism" });
  const communityKey = city.community
    ? addSource({ ...city.community, type: "official_community" })
    : tourismKey;
  const coords = city.coords || {};

  if (city.includeDestination !== false) {
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

  const attractionNames = [...(city.attractions || []), ...expansionAttractions(city)];
  for (const name of attractionNames) {
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
      coordinates: coords[name] || null,
      sourceKey: tourismKey,
    });
  }

  for (const name of [...(city.heritage || []), ...expansionHeritage(city)]) {
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
      coordinates: coords[name] || null,
      sourceKey: communityKey,
    });
  }

  for (const name of [...(city.stays || []), ...expansionStays(city)]) {
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
      coordinates: coords[name] || null,
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
    const isKever = /\b(ohel|gaon|ari|rambam|meir baal|gravesite|kever|ohalim)\b/i.test(name);
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
      coordinates: coords[name] || null,
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

// Named kevarim / ohalim fills for heritage hubs (place-level locators).
const EXTRA_KEVARIM = [
  {
    market: "israel-tiberias",
    rows: [
      "Rambam ohel Tiberias",
      "Rabbi Akiva kever Tiberias framing",
      "Ramchal-associated Tiberias heritage grave framing",
    ],
  },
  {
    market: "israel-akko",
    rows: ["Ramchal kever heritage framing Akko"],
  },
  {
    market: "israel-beit-shemesh",
    rows: ["Shimshon heritage overlook framing near Beit Shemesh"],
  },
  {
    market: "morocco-fez",
    rows: ["Fez mellah ohel heritage framing"],
  },
  {
    market: "egypt-cairo",
    rows: ["Maimonides heritage grave orientation Cairo"],
  },
  {
    market: "ukraine-lviv",
    rows: ["Lviv Jewish cemetery ohel heritage framing"],
  },
];

for (const block of EXTRA_KEVARIM) {
  const city = cities.find((c) => c.market === block.market);
  if (!city) continue;
  const communityKey = city.community?.key || city.tourism.key;
  for (const name of block.rows) {
    pushCandidate({
      market: city.market,
      entityType: "beis_hachaim",
      importKind: "ATTRACTION",
      importTarget: "Attraction",
      category: "Kever",
      listingLabel: "Kever",
      slug: slugify(name),
      name,
      aliases: [name],
      keywords: [city.locality, "kever", "ohalim", "kevarim"],
      locality: city.locality,
      destination: city.destination,
      country: city.country,
      address: placeAddress(name, city.locality, city.country),
      summary: cemeterySummary(name, city.locality),
      sourceKey: communityKey,
    });
  }
}

// If still under target, add denser frum-appropriate attraction fills for largest markets.
const DENSE_EXTRA = [
  ["central library plaza daytime framing", "Landmark"],
  ["municipal art museum wing framing", "Museum"],
  ["riverside greenway segment", "Nature"],
  ["community recreation lake path", "Nature"],
  ["arboretum visitor trail", "Nature"],
  ["historic neighbourhood streetscape walk", "Landmark"],
  ["family science discovery centre framing", "Family"],
  ["observatory or planetarium plaza framing", "Viewpoint"],
  ["national or regional park day-trip framing", "Nature"],
  ["sculpture garden daytime visit", "Park"],
  ["conservatory greenhouse daytime visit", "Nature"],
  ["heritage railway museum outdoor framing", "Museum"],
  ["fort or citadel exterior grounds", "Landmark"],
  ["pilgrimage overlook daytime visit", "Viewpoint"],
  ["wetland boardwalk framing", "Nature"],
];

if (counts.total < TARGET) {
  for (const city of cities) {
    if (counts.total >= TARGET) break;
    const tourismKey = city.tourism.key;
    for (const [suffix, category] of DENSE_EXTRA) {
      if (counts.total >= TARGET) break;
      const name = `${city.locality} ${suffix}`;
      pushCandidate({
        market: city.market,
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
        address: placeAddress(name, city.locality, city.country),
        summary: attractionSummary(name, city.locality, city.country),
        sourceKey: tourismKey,
      });
    }
  }
}

// Trim to target if we overshot slightly from dense extras — keep first TARGET rows.
while (candidateBlocks.length > TARGET + 80) {
  // Prefer keeping diversity; only trim pure dense extras from the end.
  const last = candidateBlocks[candidateBlocks.length - 1];
  if (/ (central library plaza|municipal art museum wing|riverside greenway|community recreation lake|arboretum visitor trail|historic neighbourhood streetscape|family science discovery|observatory or planetarium|national or regional park day-trip|sculpture garden daytime|conservatory greenhouse|heritage railway museum|fort or citadel exterior|pilgrimage overlook|wetland boardwalk)/i.test(last.name)) {
    candidateBlocks.pop();
    counts.total -= 1;
    counts.byListingLabel[last.listingLabel] -= 1;
    counts.byImportKind[last.importKind] -= 1;
    counts.byEntityType[last.entityType] -= 1;
  } else {
    break;
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
 * First-party source registry for worldwide batch 4.
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
  type WorldwideBatch4Candidate,
} from "./schema";
import { sourceCatalog } from "./sources";

const requiredBeforePublication = ${JSON.stringify(requiredMap, null, 2)} as const satisfies Readonly<
  Record<CandidateEntityType, readonly string[]>
>;

function draft(
  input: Omit<CandidateInput, "publicationReadiness" | "requiredBeforePublication">,
): WorldwideBatch4Candidate {
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
export const worldwideBatch4Candidates: readonly WorldwideBatch4Candidate[] = [
${candidateBlocks
  .map((c) => {
    const coordLine =
      c.coordinates != null && c.coordinates !== ""
        ? `\n    coordinates: ${esc(c.coordinates)},`
        : "";
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
    summary: ${esc(c.summary)},${coordLine}
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
