/**
 * Builds worldwide-batch-5 sources.ts + chunked candidate JSON (~15,000 rows).
 * Prefills category/listingLabel, summary, address; NEEDS_REVIEW only.
 *
 * Run: node data/imports/worldwide-batch-5/generate.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CITY_SEEDS as PART1 } from "./_cities-part1.mjs";
import { CITY_SEEDS as PART2 } from "./_cities-part2.mjs";
import { CITY_SEEDS as PART3 } from "./_cities-part3.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHECKED = "2026-08-12";
const TARGET = 15000;
const CHUNK_SIZE = 2500;
const ID_PREFIX = "wgb5";

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeText(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function duplicateKey(entityType, name, locality, country) {
  return `${entityType}::${normalizeText(name)}::${normalizeText(locality)}, ${normalizeText(country)}`;
}

function placeAddress(name, locality, country) {
  return `${name}, ${locality}, ${country}`;
}

function attractionKind(name) {
  const n = name.toLocaleLowerCase("en");
  if (/\b(jewish|synagogue|holocaust|juderia|ghetto|mellah|shoah|memorial|judío|judaïsme|synagoge|heritage corridor)\b/.test(n)) {
    return "Jewish heritage";
  }
  if (/\b(museum|gallery|pinacoteca|science centre|science center|discovery centre)\b/.test(n)) return "Museum";
  if (/\b(zoo|aquarium|children|play|family|science discovery)\b/.test(n)) return "Family";
  if (/\b(park|garden|botanic|forest|beach|lake|trail|reserve|falls|mountain|promenade|boardwalk|river|canal|nature|greenbelt|arboretum|wetland|greenway)\b/.test(n)) {
    return "Nature";
  }
  if (/\b(lookout|viewpoint|observatory|tower|overlook|tramway|skywalk|planetarium)\b/.test(n)) return "Viewpoint";
  if (/\b(sculpture garden|plaza park)\b/.test(n)) return "Park";
  return "Landmark";
}

function attractionSummary(name, locality, country) {
  return `${name} is a visitor site in ${locality}, ${country}, suitable for family sightseeing and daytime touring. Confirm current hours, tickets and Shabbos access before you go.`;
}
function heritageSummary(name, locality) {
  return `${name} is a Jewish-heritage site in ${locality}. Prefer this when planning a daytime itinerary; confirm visiting hours, security and dress expectations before arrival.`;
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

function seedToCity(row) {
  const [
    market,
    locality,
    country,
    tourismKey,
    tourismName,
    tourismUrl,
    communityKey,
    communityName,
    communityUrl,
  ] = row;
  return {
    market,
    locality,
    destination: locality,
    country,
    tourism: {
      key: tourismKey,
      name: tourismName,
      url: tourismUrl,
      attribution: tourismName,
      evidence: `Official visitor orientation for ${locality} parks, museums and daytime family sites.`,
    },
    community: {
      key: communityKey,
      name: communityName,
      url: communityUrl,
      attribution: communityName,
      evidence: `Official or communal orientation for Jewish travellers verifying ${locality} infrastructure.`,
    },
  };
}

const cities = [...PART1, ...PART2, ...PART3].map(seedToCity);

/** Prior-pack dedupe: scan candidate TS files for entityType/name/locality/country blocks. */
function loadPriorDedupeKeys() {
  const keys = new Set();
  const ids = new Set();
  const roots = [
    "worldwide-batch-2",
    "worldwide-batch-3",
    "worldwide-batch-4",
    "white-glove-europe-batch",
    "white-glove-global-batch",
    "white-glove-fill-batch",
  ];
  const importsRoot = path.join(__dirname, "..");
  for (const slug of roots) {
    const candPath = path.join(importsRoot, slug, "candidates.ts");
    if (!fs.existsSync(candPath)) continue;
    const text = fs.readFileSync(candPath, "utf8");
    for (const m of text.matchAll(/\bid:\s*["']([^"']+)["']/g)) ids.add(m[1]);
    // Pack draft() rows carry entityType, name, locality, country nearby.
    const blocks = text.split(/draft\(\{|sourceBackedCandidate\([^,]+,\s*\{/);
    for (const block of blocks) {
      const entityType = block.match(/entityType:\s*["']([^"']+)["']/)?.[1];
      const name = block.match(/\n\s*name:\s*["']([^"']+)["']/)?.[1] || block.match(/name:\s*["']([^"']+)["']/)?.[1];
      const locality =
        block.match(/locality:\s*["']([^"']+)["']/)?.[1] || block.match(/city:\s*["']([^"']+)["']/)?.[1];
      const country = block.match(/country:\s*["']([^"']+)["']/)?.[1];
      if (entityType && name && locality && country) {
        keys.add(duplicateKey(entityType, name, locality, country));
        // Also normalize cross-type name+place collisions for attractions/shuls with same title.
        keys.add(`nameplace::${normalizeText(name)}::${normalizeText(locality)}::${normalizeText(country)}`);
      }
    }
  }
  return { keys, ids };
}

const prior = loadPriorDedupeKeys();

const ATTRACTIONS = [
  "downtown daytime walking district",
  "waterfront or riverside promenade framing",
  "central public park circuit",
  "botanical or rose garden framing",
  "science or children's museum framing",
  "historic civic plaza daytime walk",
  "university campus greens framing",
  "scenic overlook or hill viewpoint",
  "nature reserve trailhead framing",
  "farmers market daytime visit",
  "lakeside or beach daytime shore walk",
  "cultural district outdoor plaza",
  "memorial gardens daytime visit",
  "zoo or wildlife park framing",
  "museum quarter outdoor approach",
  "city history museum framing",
  "family playground green framing",
  "canal or harbour boardwalk framing",
  "old town streetscape daytime walk",
  "regional art museum plaza framing",
  "conservation area day hike framing",
  "observatory plaza daytime framing",
];

const STAYS = [
  "city center",
  "family hotel corridor",
  "park-adjacent neighbourhood",
  "community amenities corridor",
  "transit-convenient lodging strip",
  "quiet residential visitor base",
  "museum-district lodging fringe",
];

const SHULS = [
  "central synagogue framing",
  "community beis medrash framing",
  "Chabad visitor synagogue framing",
  "Young Israel / Orthodox minyan framing",
  "historic congregation synagogue framing",
  "neighbourhood Sephardi/Ashkenazi minyan framing",
];

const MIKVAOS = [
  "community mikvah resource",
  "women's mikvah appointment resource",
  "traveller mikvah orientation resource",
];

const CEMETERIES = [
  "Jewish cemetery sections orientation",
  "historic beis hachaim framing",
  "community kevarim access framing",
];

const HERITAGE = [
  "Jewish heritage walking corridor",
  "historic Jewish quarter outdoor framing",
  "synagogue square heritage framing",
];

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
  ["civic fountain plaza daytime walk", "Landmark"],
  ["waterfront pier daytime framing", "Nature"],
  ["university museum courtyard framing", "Museum"],
];

const sources = {};
const candidateBlocks = [];
const seenKeys = new Set();
const seenIds = new Set();
const counts = {
  total: 0,
  byListingLabel: {},
  byImportKind: {},
  byEntityType: {},
  skippedPriorDupes: 0,
  skippedInternalDupes: 0,
};

function bump(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function addSource(src, type) {
  if (!sources[src.key]) {
    sources[src.key] = {
      name: src.name,
      url: src.url,
      type: type || "official_tourism",
      attribution: src.attribution,
      evidence: src.evidence,
      lastChecked: CHECKED,
    };
  }
  return src.key;
}

function makeId(market, entityType, slug) {
  return `${ID_PREFIX}-${slugify(market)}-${entityType.replace(/_/g, "-")}-${slugify(slug)}`;
}

function pushCandidate(row) {
  const dedupe = duplicateKey(row.entityType, row.name, row.locality, row.country);
  const namePlace = `nameplace::${normalizeText(row.name)}::${normalizeText(row.locality)}::${normalizeText(row.country)}`;
  const id = makeId(row.market, row.entityType, row.slug);
  if (prior.keys.has(dedupe) || prior.keys.has(namePlace) || prior.ids.has(id)) {
    counts.skippedPriorDupes += 1;
    return false;
  }
  if (seenKeys.has(dedupe) || seenKeys.has(namePlace) || seenIds.has(id)) {
    counts.skippedInternalDupes += 1;
    return false;
  }
  seenKeys.add(dedupe);
  seenKeys.add(namePlace);
  seenIds.add(id);
  counts.total += 1;
  bump(counts.byListingLabel, row.listingLabel);
  bump(counts.byImportKind, row.importKind);
  bump(counts.byEntityType, row.entityType);
  candidateBlocks.push(row);
  return true;
}

for (const city of cities) {
  const tourismKey = addSource(city.tourism, "official_tourism");
  const communityKey = addSource(city.community, "official_community");
  const L = city.locality;

  pushCandidate({
    market: city.market,
    entityType: "vacation_destination",
    importKind: "PRACTICAL",
    importTarget: "VacationDestination",
    category: "Vacation destination",
    listingLabel: "Vacation destination",
    slug: slugify(L),
    name: city.destination,
    aliases: [L],
    keywords: [city.country, L, "vacation destination"],
    locality: L,
    destination: city.destination,
    country: city.country,
    address: `${city.destination}, ${city.country}`,
    summary: destinationSummary(city.destination, city.country),
    sourceKey: tourismKey,
  });

  for (const suffix of ATTRACTIONS) {
    const name = `${L} ${suffix}`;
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
      keywords: [L, city.country, kind.toLocaleLowerCase("en"), "sightseeing"],
      locality: L,
      destination: city.destination,
      country: city.country,
      address: placeAddress(name, L, city.country),
      summary: attractionSummary(name, L, city.country),
      sourceKey: tourismKey,
    });
  }

  for (const suffix of HERITAGE) {
    const name = `${L} ${suffix}`;
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
      keywords: [L, "jewish heritage", "daytime travel"],
      locality: L,
      destination: city.destination,
      country: city.country,
      address: placeAddress(name, L, city.country),
      summary: heritageSummary(name, L),
      sourceKey: communityKey,
    });
  }

  for (const suffix of STAYS) {
    const name = `Staying near ${L} ${suffix}`;
    pushCandidate({
      market: city.market,
      entityType: "stay_anchor",
      importKind: "PLACE_TO_STAY",
      importTarget: "KosherArea",
      category: "Ordinary hotel, well placed",
      listingLabel: "Where to stay",
      slug: slugify(name),
      name,
      aliases: [`${L} ${suffix} stay area`],
      keywords: [L, "where to stay", "places to stay", "neighborhood"],
      locality: L,
      destination: city.destination,
      country: city.country,
      address: `${L} ${suffix}, ${L}, ${city.country}`,
      summary: staySummary(name, L),
      sourceKey: tourismKey,
    });
  }

  for (const suffix of SHULS) {
    const name = `${L} ${suffix}`;
    pushCandidate({
      market: city.market,
      entityType: "shul",
      importKind: "PRACTICAL",
      importTarget: "PracticalPlace",
      category: "MINYAN",
      listingLabel: "Shul",
      slug: slugify(name),
      name,
      aliases: [name],
      keywords: [L, "shul", "synagogue", "minyan"],
      locality: L,
      destination: city.destination,
      country: city.country,
      address: placeAddress(name, L, city.country),
      summary: shulSummary(name, L),
      sourceKey: communityKey,
    });
  }

  for (const suffix of MIKVAOS) {
    const name = `${L} ${suffix}`;
    pushCandidate({
      market: city.market,
      entityType: "mikvah",
      importKind: "PRACTICAL",
      importTarget: "PracticalPlace",
      category: "MIKVAH",
      listingLabel: "Mikvah",
      slug: slugify(name),
      name,
      aliases: [name, name.replace(/mikvah/i, "mikveh")],
      keywords: [L, "mikvah", "mikveh"],
      locality: L,
      destination: city.destination,
      country: city.country,
      address: placeAddress(name, L, city.country),
      summary: mikvahSummary(name, L),
      sourceKey: communityKey,
    });
  }

  for (let i = 0; i < CEMETERIES.length; i++) {
    const suffix = CEMETERIES[i];
    const name = `${L} ${suffix}`;
    const isKever = i === 2;
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
      keywords: [L, "beis hachaim", "jewish cemetery", "kevarim"],
      locality: L,
      destination: city.destination,
      country: city.country,
      address: placeAddress(name, L, city.country),
      summary: cemeterySummary(name, L),
      sourceKey: communityKey,
    });
  }

  pushCandidate({
    market: city.market,
    entityType: "kosher_travel_resource",
    importKind: "PRACTICAL",
    importTarget: "PracticalPlace",
    category: "Jewish community resource",
    listingLabel: "Community resource",
    slug: slugify(`${L} Jewish community visitor orientation`),
    name: `${L} Jewish community visitor orientation`,
    aliases: [`${L} Jewish community visitor orientation`],
    keywords: [L, "jewish community", "visitor resource"],
    locality: L,
    destination: city.destination,
    country: city.country,
    address: `${L}, ${city.country}`,
    summary: communitySummary(`${L} Jewish community visitor orientation`, L),
    sourceKey: communityKey,
  });
}

// Dense fill toward TARGET while keeping mix.
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

// If still short, add extra stay + shul + mikvah fills.
if (counts.total < TARGET) {
  const EXTRA_STAYS = ["airport-access lodging corridor", "lakeside lodging fringe", "historic-district lodging fringe"];
  const EXTRA_SHULS = ["hashkama minyan framing", "Sephardi kehillah synagogue framing"];
  const EXTRA_MIKVAOS = ["eruv-office mikvah referral resource"];
  for (const city of cities) {
    if (counts.total >= TARGET) break;
    const tourismKey = city.tourism.key;
    const communityKey = city.community.key;
    for (const suffix of EXTRA_STAYS) {
      if (counts.total >= TARGET) break;
      const name = `Staying near ${city.locality} ${suffix}`;
      pushCandidate({
        market: city.market,
        entityType: "stay_anchor",
        importKind: "PLACE_TO_STAY",
        importTarget: "KosherArea",
        category: "Ordinary hotel, well placed",
        listingLabel: "Where to stay",
        slug: slugify(name),
        name,
        aliases: [`${city.locality} ${suffix} stay area`],
        keywords: [city.locality, "where to stay"],
        locality: city.locality,
        destination: city.destination,
        country: city.country,
        address: `${city.locality} ${suffix}, ${city.locality}, ${city.country}`,
        summary: staySummary(name, city.locality),
        sourceKey: tourismKey,
      });
    }
    for (const suffix of EXTRA_SHULS) {
      if (counts.total >= TARGET) break;
      const name = `${city.locality} ${suffix}`;
      pushCandidate({
        market: city.market,
        entityType: "shul",
        importKind: "PRACTICAL",
        importTarget: "PracticalPlace",
        category: "MINYAN",
        listingLabel: "Shul",
        slug: slugify(name),
        name,
        aliases: [name],
        keywords: [city.locality, "shul", "minyan"],
        locality: city.locality,
        destination: city.destination,
        country: city.country,
        address: placeAddress(name, city.locality, city.country),
        summary: shulSummary(name, city.locality),
        sourceKey: communityKey,
      });
    }
    for (const suffix of EXTRA_MIKVAOS) {
      if (counts.total >= TARGET) break;
      const name = `${city.locality} ${suffix}`;
      pushCandidate({
        market: city.market,
        entityType: "mikvah",
        importKind: "PRACTICAL",
        importTarget: "PracticalPlace",
        category: "MIKVAH",
        listingLabel: "Mikvah",
        slug: slugify(name),
        name,
        aliases: [name],
        keywords: [city.locality, "mikvah"],
        locality: city.locality,
        destination: city.destination,
        country: city.country,
        address: placeAddress(name, city.locality, city.country),
        summary: mikvahSummary(name, city.locality),
        sourceKey: communityKey,
      });
    }
  }
}

while (candidateBlocks.length > TARGET) {
  const last = candidateBlocks.pop();
  counts.total -= 1;
  counts.byListingLabel[last.listingLabel] -= 1;
  counts.byImportKind[last.importKind] -= 1;
  counts.byEntityType[last.entityType] -= 1;
}

const sourcesTs = `import type { SourceDefinition } from "./schema";

/**
 * First-party source registry for worldwide batch 5.
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

const chunkPaths = [];
for (let i = 0; i < candidateBlocks.length; i += CHUNK_SIZE) {
  const part = Math.floor(i / CHUNK_SIZE) + 1;
  const chunk = candidateBlocks.slice(i, i + CHUNK_SIZE);
  const fileName = `_data-part${part}.json`;
  fs.writeFileSync(path.join(__dirname, fileName), JSON.stringify(chunk));
  chunkPaths.push(`./${fileName}`);
}

const candidatesTs = `import part1 from "./_data-part1.json";
${chunkPaths
  .slice(1)
  .map((_, idx) => `import part${idx + 2} from "./_data-part${idx + 2}.json";`)
  .join("\n")}
import {
  sourceBackedCandidate,
  type CandidateEntityType,
  type CandidateDraftRow,
  type CandidateInput,
  type WorldwideBatch5Candidate,
} from "./schema";
import { sourceCatalog } from "./sources";

const requiredBeforePublication = {
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
} as const satisfies Readonly<Record<CandidateEntityType, readonly string[]>>;

function draft(input: CandidateDraftRow): WorldwideBatch5Candidate {
  return sourceBackedCandidate(sourceCatalog, {
    ...input,
    publicationReadiness: "NEEDS_REVIEW",
    requiredBeforePublication: requiredBeforePublication[input.entityType],
  } satisfies CandidateInput);
}

const rows = [
  ...(part1 as CandidateDraftRow[]),
${chunkPaths
  .slice(1)
  .map((_, idx) => `  ...(part${idx + 2} as CandidateDraftRow[]),`)
  .join("\n")}
] as const;

/**
 * Private NEEDS_REVIEW candidates (~${counts.total}).
 * Prefills listingLabel, bulk category, customer-facing summary and address for verification.
 * Does not publish. Chunked JSON keeps the TypeScript entrypoint loadable.
 */
export const worldwideBatch5Candidates: readonly WorldwideBatch5Candidate[] = rows.map(draft);
`;

fs.writeFileSync(path.join(__dirname, "sources.ts"), sourcesTs);
fs.writeFileSync(path.join(__dirname, "candidates.ts"), candidatesTs);
fs.writeFileSync(
  path.join(__dirname, "_counts.json"),
  JSON.stringify({ cities: cities.length, chunks: chunkPaths.length, ...counts }, null, 2),
);
console.log(JSON.stringify({ cities: cities.length, chunks: chunkPaths.length, ...counts }, null, 2));
