/**
 * Scan all NEEDS_REVIEW import packs, remove exact/near duplicates, enrich
 * address/category/summary/coords where possible, rewrite packs in place.
 *
 * Usage: node scripts/dedupe-enrich-imports.mjs [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IMPORTS = path.join(ROOT, "data", "imports");
const DRY = process.argv.includes("--dry-run");
const REPORT_PATH = path.join(ROOT, "scripts", "_dedupe-enrich-report.json");

const PACKS = [
  { slug: "white-glove-europe-batch", kind: "ts", exportName: "whiteGloveEuropeCandidates" },
  { slug: "white-glove-global-batch", kind: "ts", exportName: "whiteGloveGlobalCandidates" },
  { slug: "white-glove-fill-batch", kind: "ts", exportName: "whiteGloveFillCandidates" },
  { slug: "worldwide-batch-2", kind: "ts", exportName: "worldwideBatch2Candidates" },
  { slug: "worldwide-batch-3", kind: "ts", exportName: "worldwideBatch3Candidates" },
  { slug: "worldwide-batch-4", kind: "ts", exportName: "worldwideBatch4Candidates" },
  { slug: "worldwide-batch-5", kind: "json", exportName: "worldwideBatch5Candidates" },
];

const NIGHTLIFE_RE =
  /\b(nightclub|nightlife|strip club|casino|dance club|disco|bar crawl|night club|cabaret|burlesque)\b/i;

const CATEGORY_ALIASES = {
  "landmark attraction": "Landmark",
  landmark: "Landmark",
  sightseeing: "Landmark",
  "jewish heritage attraction": "Jewish heritage",
  "jewish heritage": "Jewish heritage",
  museum: "Museum",
  nature: "Nature",
  park: "Park",
  family: "Family",
  viewpoint: "Viewpoint",
  "vacation destination": "Vacation destination",
  "neighborhood anchor": "Neighborhood anchor",
  "jewish community resource": "Jewish community resource",
  "kosher certifier resource": "Kosher certifier resource",
  "community resource": "Jewish community resource",
  "beis hachaim": "Beis hachaim",
  cemetery: "Beis hachaim",
  kever: "Kever",
  shul: "MINYAN",
  minyan: "MINYAN",
  minyanim: "MINYAN",
  mikvah: "MIKVAH",
  mikvaos: "MIKVAH",
  "where to stay": "Ordinary hotel, well placed",
  "ordinary hotel, well placed": "Ordinary hotel, well placed",
  "kosher hotel": "Kosher hotel",
};

const LISTING_LABEL_CATEGORY = {
  Attraction: "Landmark",
  "Jewish heritage attraction": "Jewish heritage",
  Shul: "MINYAN",
  Mikvah: "MIKVAH",
  "Beis hachaim": "Beis hachaim",
  Kever: "Kever",
  "Where to stay": "Ordinary hotel, well placed",
  "Vacation destination": "Vacation destination",
  "Community resource": "Jewish community resource",
};

const PREFIX_RE = /^(the|le|la|les|el|los|las|der|die|das|il|lo|gli|a|an)\s+/;
const EDITORIAL_WORD_RE =
  /\b(framing|orientation|listing|candidate|draft|placeholder|stub|daytime|exterior|historic landscape|waterfront daytime)\b/g;
const TYPE_WORD_RE =
  /\b(memorial|synagogue|synagoge|synagogues|shul|shuls|beit knesset|beis knesses|hotel|hotels|park|parks|museum|museums|cemetery|cemeteries|beis hachaim|beit hachaim|beis|hachaim|kever|kevarim|mikvah|mikveh|mikve|mikva|mikvaos|congregation|congregations|congregacion|minyan|minyans|resource|resources)\b/g;

const STOP_TOKENS = new Set([
  "the","a","an","of","de","la","el","los","las","le","les","and","or","for","near","in","at","to",
  "du","des","di","del","da","do","van","von","ben","staying","visitor","traveller","traveler",
  "community","jewish","orthodox",
]);
const WEAK_TOKENS = new Set([
  "central","city","downtown","municipal","family","cultural","culture","historic","old","new","great",
  "grand","regional","national","local","main","public","outdoor","indoor","first","second","state","states",
  "neighbourhood","neighborhood","district","quarter","square","plaza","area","areas","walk","walking",
  "visit","circuit","approach","grounds","section","sections","wing","path","paths","corridor","strip",
  "fringe","base","amenities","lodging","orientation","heritage","site","sites","attraction",
]);
const GENERIC_STUBS = new Set([
  "museum","museums","park","parks","synagogue","synagogues","shul","shuls","cemetery","cemeteries",
  "hotel","hotels","garden","gardens","memorial","community","heritage","mikvah","plaza","square",
  "market","walk","quarter","corridor","resource","orientation","framing","attraction","site",
  "centre","center","gallery","tower","bridge","beach","lake","river","zoo","aquarium","castle",
  "palace","fort","harbour","harbor","pier","station","temple","cathedral","church","mosque",
]);
const DISTINGUISHING_TOKENS = new Set([
  "park","parque","museum","museo","garden","gardens","jardin","hotel","market","mercado",
  "bridge","puente","tower","torre","castle","castell","castillo","beach","playa","lake","river",
  "cathedral","church","iglesia","mosque","zoo","aquarium","palace","palacio","fort","forte",
  "harbour","harbor","pier","station","fountain","viewpoint","lookout","mirador","cemetery",
  "cementerio","alcazar","field","stadium","arena",
]);
const COUNTRY_ALIASES = {
  usa: "united states", us: "united states", "u s": "united states",
  "united states of america": "united states", uk: "united kingdom",
  "great britain": "united kingdom", uae: "united arab emirates",
  holland: "netherlands", "the netherlands": "netherlands",
};
const ORG_STEMS = [
  { re: /\bchabad\b/, key: "chabad" },
  { re: /\byoung israel\b/, key: "young-israel" },
  { re: /\baish hatorah\b|\baish ha torah\b/, key: "aish" },
];
const TRANSLIT = [
  [/ph/g, "f"],
  [/kh/g, "ch"],
  [/q/g, "k"],
  [/iy/g, "i"],
  [/yah$/g, "ya"],
  [/eh$/g, "e"],
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[''`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function foldTranslit(value) {
  let n = normalizeText(value);
  for (const [re, to] of TRANSLIT) n = n.replace(re, to);
  return n.replace(/\s+/g, " ").trim();
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function foldCountry(value) {
  const n = normalizeText(value);
  return COUNTRY_ALIASES[n] || n;
}

function placeKey(row) {
  let city = normalizeText(row.locality || row.city || "");
  const country = foldCountry(row.country || "");
  if (country && city !== country && (city.endsWith(` ${country}`) || city.endsWith(`, ${country}`))) {
    city = city.slice(0, city.length - country.length).replace(/[,\s]+$/g, "").trim();
  }
  city = city.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  city = city.replace(/^(city of|greater|metro)\s+/, "");
  if (city !== country) city = city.replace(/\s+(city|municipality|metro|greater)$/g, "");
  return `${city}::${country}`;
}

/** Adjacent cities that often host the same venue under two locality labels. */
const METRO_PLACE_ALIASES = {
  "hollywood::united states": "hollywood-fort-lauderdale::united states",
  "fort lauderdale::united states": "hollywood-fort-lauderdale::united states",
  "scottsdale::united states": "phoenix-scottsdale::united states",
  "phoenix::united states": "phoenix-scottsdale::united states",
};

function metroPlaceKey(row) {
  const pk = placeKey(row);
  return METRO_PLACE_ALIASES[pk] || pk;
}

/**
 * Stable key for known same-venue spelling / branding variants that do not share
 * a near-duplicate token core (Sant Pau, Malecón Miraflores, Mini-Europe, etc.).
 */
function knownVenueAliasKey(name) {
  const n = normalizeText(name);
  if (!n) return null;
  if (/\bsant antoni\b/.test(n)) return null;
  if (
    /\brecinte modernista de sant pau\b/.test(n) ||
    /\bsant pau art nouveau\b/.test(n) ||
    /\bhospital de sant pau\b/.test(n) ||
    /^sant pau$/.test(n)
  ) {
    return "sant-pau";
  }
  if (/\bmalecon miraflores\b/.test(n) || /\bmiraflores boardwalk\b/.test(n)) {
    return "malecon-miraflores";
  }
  if (/^mini europe\b/.test(n)) return "mini-europe";
  if (/\bjewish cultural quarter\b/.test(n)) return "jewish-cultural-quarter";
  return null;
}

function stripPlaceFromName(name, locality, country) {
  let n = normalizeText(name);
  const loc = normalizeText(locality);
  const ctry = foldCountry(country);
  if (loc) n = n.replace(new RegExp(`(^|\\s)${escapeRegExp(loc)}(\\s|$)`, "g"), " ");
  for (const tok of loc.split(" ").filter((t) => t.length >= 4)) {
    n = n.replace(new RegExp(`(^|\\s)${escapeRegExp(tok)}(\\s|$)`, "g"), " ");
  }
  if (ctry && ctry !== loc) n = n.replace(new RegExp(`(^|\\s)${escapeRegExp(ctry)}(\\s|$)`, "g"), " ");
  n = n.replace(/\bstaying near\b/g, " ");
  n = n.replace(PREFIX_RE, "");
  return n.replace(/\s+/g, " ").trim();
}

function stripEditorial(name) {
  return String(name || "").replace(EDITORIAL_WORD_RE, " ").replace(/\s+/g, " ").trim();
}

function coreName(name, locality, country = "") {
  let n = stripPlaceFromName(stripEditorial(name), locality, country);
  n = n.replace(TYPE_WORD_RE, " ").replace(/\s+/g, " ").trim();
  return n;
}

function coreNameKeepVenue(name, locality, country = "") {
  return stripPlaceFromName(stripEditorial(name), locality, country);
}

function venueFamily(row) {
  const et = row.entityType || "";
  const ik = row.importKind || row.kind || "";
  if (et === "mikvah") return "mikvah";
  if (et === "beis_hachaim" || et === "kever") return "cemetery";
  if (et === "stay_anchor" || et === "practical_travel_anchor" || ik === "PLACE_TO_STAY") return "stay";
  if (et === "vacation_destination") return "destination";
  return "place";
}

function looksLikeCemetery(name) {
  return /\b(cemetery|cemeteries|beis hachaim|beit hachaim|kever|kevarim|ohel|ohalim|grave|gravesite)\b/i.test(name || "");
}

function familiesCanCollapse(a, b) {
  const fa = venueFamily(a);
  const fb = venueFamily(b);
  if (fa === fb) return true;
  return (
    ((fa === "place" && fb === "cemetery") || (fa === "cemetery" && fb === "place")) &&
    looksLikeCemetery(a.name) &&
    looksLikeCemetery(b.name)
  );
}

function kindBucket(row) {
  return venueFamily(row);
}

function orgStem(name) {
  const n = normalizeText(name);
  for (const stem of ORG_STEMS) if (stem.re.test(n)) return stem.key;
  return null;
}

function heritageSlot(name) {
  const n = normalizeText(name);
  return (
    /jewish heritage( walking)? corridor/.test(n) ||
    /historic jewish quarter/.test(n) ||
    /synagogue square heritage/.test(n) ||
    /jewish community heritage corridor/.test(n) ||
    /heritage walking corridor/.test(n)
  );
}

function genericMikvahSlot(name) {
  const n = normalizeText(name);
  return /\b(mikvah|mikveh|mikve)\b/.test(n) &&
    /\b(community|resource|orientation|appointment|traveller|traveler|women|womens)\b/.test(n);
}

function genericCemeterySlot(name) {
  const n = normalizeText(name);
  return /jewish cemetery sections|historic beis hachaim|community kevarim|cemetery orientation|jewish community cemetery/.test(n);
}

function significantTokens(core) {
  return String(core || "").split(" ").map((t) => t.trim()).filter((t) => t && t.length > 1 && !STOP_TOKENS.has(t) && !WEAK_TOKENS.has(t));
}

function hasProperToken(s) {
  return significantTokens(s).some((t) => t.length >= 4 && !GENERIC_STUBS.has(t));
}

function isGenericStub(s) {
  if (!s) return true;
  return !hasProperToken(s);
}

function isWeakCore(core) {
  if (!core) return true;
  if (significantTokens(core).length === 0) return true;
  if (core.length < 3) return true;
  return false;
}

function richness(row) {
  let s = 0;
  const addr = (row.address || "").trim();
  if (addr) {
    // Prefer real street-ish addresses over "Name, City, Country"
    const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3 && /\d/.test(addr)) s += 4;
    else if (parts.length >= 3) s += 2;
    else s += 1;
  }
  if ((row.summary || "").trim()) s += 2;
  if ((row.category || "").trim()) s += 1;
  if ((row.coordinates || "").trim()) s += 3;
  if ((row.website || "").trim()) s += 2;
  if ((row.aliases || []).length > 1) s += 1;
  if ((row.keywords || []).length > 2) s += 1;
  // Prefer rows that already look customer-facing (no internal jargon)
  if (row.summary && !/\bfrum\b/i.test(row.summary)) s += 1;
  const name = row.name || "";
  if (/\b(framing|orientation|placeholder|stub|draft)\b/i.test(name)) s -= 4;
  if (/\bdaytime\b/i.test(name)) s -= 2;
  if (heritageSlot(name) || genericMikvahSlot(name) || genericCemeterySlot(name)) s -= 2;
  return s;
}

function getField(body, key) {
  // Prefer double-quoted JSON-style values so Ra'anana / Be'er Sheva parse whole.
  const dq = body.match(new RegExp(`${key}:\\s*"((?:\\\\.|[^"\\\\])*)"`));
  if (dq) {
    try {
      return JSON.parse(`"${dq[1]}"`);
    } catch {
      return dq[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
  }
  const sq = body.match(new RegExp(`${key}:\\s*'([^']*)'`));
  return sq ? sq[1] : null;
}

function getArrayField(body, key) {
  const m = body.match(new RegExp(`${key}:\\s*(\\[[\\s\\S]*?\\])`));
  if (!m) return [];
  // Double-quoted entries are JSON, so Ra'anana / Be'er Sheva survive whole.
  try {
    const parsed = JSON.parse(m[1]);
    if (Array.isArray(parsed)) return parsed.filter((value) => typeof value === "string");
  } catch {
    // Fall through to the tolerant scan below.
  }
  return [...m[1].matchAll(/"((?:\\.|[^"\\])*)"/g)].map((match) => {
    try {
      return JSON.parse(`"${match[1]}"`);
    } catch {
      return match[1];
    }
  });
}

/** Infer entity/import fields when the pack uses thin helpers (batch-2). */
function inferFromHelper(helper, body) {
  if (helper === "destination") {
    return {
      entityType: "vacation_destination",
      importKind: "PRACTICAL",
      importTarget: "VacationDestination",
      category: getField(body, "category") || "Vacation destination",
    };
  }
  if (helper === "attraction") {
    return {
      entityType: "attraction",
      importKind: "ATTRACTION",
      importTarget: "Attraction",
      category: getField(body, "category") || "Landmark",
    };
  }
  if (helper === "stayAnchor") {
    return {
      entityType: "stay_anchor",
      importKind: "PLACE_TO_STAY",
      importTarget: "KosherArea",
      category: getField(body, "category") || "Neighborhood anchor",
    };
  }
  if (helper === "kosherResource") {
    return {
      entityType: "kosher_travel_resource",
      importKind: "PRACTICAL",
      importTarget: "PracticalPlace",
      category: getField(body, "category") || "Jewish community resource",
    };
  }
  if (helper === "practicalResource") {
    return {
      entityType: "practical_travel_resource",
      importKind: "PRACTICAL",
      importTarget: "PracticalPlace",
      category: getField(body, "category") || "Jewish community resource",
    };
  }
  if (helper === "resource") {
    return {
      entityType: "kosher_travel_resource",
      importKind: "PRACTICAL",
      importTarget: "PracticalPlace",
      category: getField(body, "category") || "Jewish community resource",
    };
  }
  return {
    entityType: getField(body, "entityType") || "attraction",
    importKind: getField(body, "importKind") || getField(body, "kind") || "ATTRACTION",
    importTarget: getField(body, "importTarget") || null,
    category: getField(body, "category") || "",
  };
}

function parseTsCandidates(file, pack) {
  const full = fs.readFileSync(file, "utf8");
  // Only scan the exported candidates array — skip helper function bodies
  // that wrap sourceDraft({ ...row }).
  const exportMatch = full.match(/export const \w+Candidates[\s\S]*?=\s*\[/);
  if (!exportMatch) throw new Error(`No candidates export in ${file}`);
  const text = full.slice(exportMatch.index + exportMatch[0].length - 1);
  const rows = [];
  // Match object literals passed to draft/sourceDraft/batch-2 helpers
  const re = /\b(sourceDraft|draft|destination|attraction|stayAnchor|kosherResource|practicalResource|resource)\s*\(\s*\{/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const helper = match[1];
    const start = match.index + match[0].length - 1; // at '{'
    let depth = 0;
    let i = start;
    for (; i < text.length; i++) {
      const ch = text[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    const body = text.slice(start + 1, i - 1);
    const name = getField(body, "name");
    if (!name) continue;
    const locality = getField(body, "locality") || getField(body, "city") || "";
    const inferred = inferFromHelper(helper, body);
    rows.push({
      pack,
      name,
      locality,
      city: getField(body, "city") || locality,
      country: getField(body, "country") || "",
      entityType: inferred.entityType,
      importKind: inferred.importKind,
      kind: getField(body, "kind") || (helper === "sourceDraft" ? inferred.importKind : null),
      importTarget: inferred.importTarget,
      category: inferred.category,
      listingLabel: getField(body, "listingLabel") || null,
      slug: getField(body, "slug") || "",
      market: getField(body, "market") || "",
      destination: getField(body, "destination") || locality,
      address: getField(body, "address"),
      summary: getField(body, "summary"),
      coordinates: getField(body, "coordinates"),
      website: getField(body, "website"),
      destinationSlug: getField(body, "destinationSlug"),
      sourceKey: getField(body, "sourceKey"),
      aliases: getArrayField(body, "aliases"),
      keywords: getArrayField(body, "keywords"),
      id: getField(body, "id"),
      _helper: helper,
      _src: "ts",
      _file: file,
      _rawStart: match.index,
      _rawEnd: i,
    });
  }
  rows.push(...parseMappedNameGroups(text, pack, file));
  return rows;
}

function parseMappedNameGroups(text, pack, file) {
  const rows = [];
  const re =
    /\.\.\.\[([\s\S]*?)\]\.map\(\s*\(?\s*name\s*\)?\s*=>\s*(attraction|destination|stayAnchor|resource|kosherResource|practicalResource)\s*\(\s*\{/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const names = [...match[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    const helper = match[2];
    const start = match.index + match[0].length - 1;
    let depth = 0;
    let i = start;
    for (; i < text.length; i++) {
      const ch = text[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    const body = text.slice(start + 1, i - 1);
    const locality = getField(body, "locality") || getField(body, "city") || "";
    const inferred = inferFromHelper(helper, body);
    const keywords = getArrayField(body, "keywords");
    for (const name of names) {
      rows.push({
        pack,
        name,
        locality,
        city: getField(body, "city") || locality,
        country: getField(body, "country") || "",
        entityType: inferred.entityType,
        importKind: inferred.importKind,
        kind: inferred.importKind,
        importTarget: inferred.importTarget,
        category: inferred.category,
        listingLabel: getField(body, "listingLabel") || null,
        slug: String(name).toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        market: getField(body, "market") || "",
        destination: getField(body, "destination") || locality,
        address: null,
        summary: null,
        coordinates: null,
        website: null,
        destinationSlug: null,
        sourceKey: getField(body, "sourceKey"),
        aliases: [name],
        keywords,
        id: null,
        _helper: helper,
        _src: "ts-mapped",
        _file: file,
        _mapped: true,
      });
    }
  }
  return rows;
}

function parseJsonPack(dir, pack) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^_data-part\d+\.json$/.test(f))
    .sort();
  const rows = [];
  for (const f of files) {
    const file = path.join(dir, f);
    const arr = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const r of arr) {
      rows.push({
        ...r,
        pack,
        locality: r.locality || r.city || "",
        city: r.city || r.locality || "",
        _src: "json",
        _file: file,
      });
    }
  }
  return rows;
}

function loadKnownPlaces() {
  const map = new Map();
  const add = (place) => {
    if (!place?.name || !place?.city) return;
    const key = `${normalizeText(place.name)}|${normalizeText(place.city)}`;
    if (!map.has(key)) map.set(key, place);
    const ck = `${coreName(place.name, place.city)}|${normalizeText(place.city)}|${normalizeText(
      place.country || "",
    )}`;
    if (!map.has(ck)) map.set(ck, place);
  };
  const tryLoad = (rel, mapper) => {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) return;
    const text = fs.readFileSync(p, "utf8");
    const objects = [
      ...text.matchAll(/\{\s*\n(?:\s*\/\/[^\n]*\n)*\s*(?:slug|id|name):\s*["'][^"']+["'][\s\S]*?\n\s*\},?/g),
    ];
    for (const m of objects) {
      const body = m[0];
      const get = (k) => {
        const mm = body.match(new RegExp(`(?:^|\\n)\\s*${k}:\\s*["']([^"']*)["']`));
        return mm ? mm[1] : null;
      };
      add(mapper(get, body));
    }
  };
  tryLoad("data/attractions.ts", (get) => ({
    name: get("name"),
    city: get("city"),
    country: get("country"),
    address: get("address") || undefined,
    coordinates: get("coordinates") || undefined,
    website: get("website") || undefined,
    summary: get("summary") || undefined,
    category: get("kind") || undefined,
  }));
  tryLoad("data/kosher-stays.ts", (get) => ({
    name: get("name"),
    city: get("city"),
    country: get("country"),
    website: get("website") || undefined,
    summary: get("summary") || undefined,
  }));
  tryLoad("data/cemeteries.ts", (get) => ({
    name: get("name"),
    city: get("city"),
    country: get("country"),
    address: get("address") || undefined,
    coordinates: get("coordinates") || undefined,
    summary: get("accessNote") || undefined,
  }));
  return map;
}

function normalizeCategory(raw, listingLabel, entityType) {
  const trimmed = (raw || "").trim();
  if (trimmed) {
    if (CATEGORY_ALIASES[trimmed.toLocaleLowerCase("en")]) {
      return CATEGORY_ALIASES[trimmed.toLocaleLowerCase("en")];
    }
    return trimmed;
  }
  if (listingLabel && LISTING_LABEL_CATEGORY[listingLabel]) return LISTING_LABEL_CATEGORY[listingLabel];
  if (entityType === "shul") return "MINYAN";
  if (entityType === "mikvah") return "MIKVAH";
  if (entityType === "beis_hachaim") return "Beis hachaim";
  if (entityType === "stay_anchor") return "Ordinary hotel, well placed";
  if (entityType === "vacation_destination") return "Vacation destination";
  if (entityType === "kosher_travel_resource") return "Jewish community resource";
  return "Landmark";
}

function categoryLabel(category) {
  return category || "listing";
}

function draftSummary(row) {
  const city = row.locality || row.city || "";
  const country = row.country || "";
  const category = row.category || "listing";
  const label = categoryLabel(category).toLocaleLowerCase("en");
  if (row.entityType === "vacation_destination") {
    return `${row.name} is a vacation destination in ${country} with sightseeing and practical Jewish-travel infrastructure suitable for Orthodox / Torah-observant travelers. Confirm details against the cited source before publishing.`;
  }
  const base = `${row.name} in ${city}, ${country} — ${label} for trip planning.`;
  const keywords = (row.keywords || [])
    .map((w) => String(w).trim())
    .filter((w) => w && !normalizeText(w).includes(normalizeText(city)))
    .slice(0, 3)
    .join(", ");
  if (!keywords) {
    return `${base} Confirm visit details against the cited source before publishing.`;
  }
  return `${base} Related: ${keywords}. Confirm visit details against the cited source before publishing.`;
}

function placeAddress(row) {
  const city = row.locality || row.city || "";
  const country = row.country || "";
  if (!city || !country) return null;
  return `${row.name}, ${city}, ${country}`;
}

function scrubSummary(summary) {
  if (!summary) return summary;
  return summary
    // Prefer grammatical replacements for common staged templates
    .replace(
      /\bwith frum-appropriate sightseeing\b/gi,
      "with sightseeing suitable for Orthodox / Torah-observant travelers",
    )
    .replace(/\bfrum-appropriate\b/gi, "audience-appropriate")
    .replace(/\bfrum\b/gi, "Orthodox / Torah-observant")
    // Repair earlier over-eager scrub that produced "with suitable for … sightseeing"
    .replace(
      /\bwith suitable for Orthodox \/ Torah-observant travelers sightseeing\b/gi,
      "with sightseeing suitable for Orthodox / Torah-observant travelers",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function enrichRow(row, known) {
  const out = { ...row };
  out.category = normalizeCategory(out.category, out.listingLabel, out.entityType);

  const key1 = `${normalizeText(out.name)}|${normalizeText(out.locality)}`;
  const key2 = `${coreName(out.name, out.locality)}|${normalizeText(out.locality)}|${normalizeText(out.country)}`;
  const knownPlace = known.get(key1) || known.get(key2);

  if (knownPlace) {
    const packAddr = (out.address || "").trim();
    const knownAddr = (knownPlace.address || "").trim();
    const packIsPlaceLevel =
      !packAddr ||
      packAddr === `${out.name}, ${out.locality}, ${out.country}` ||
      packAddr === `${out.locality}, ${out.country}` ||
      !/\d/.test(packAddr);
    if (knownAddr && (packIsPlaceLevel || !packAddr)) out.address = knownAddr;
    if (!out.coordinates?.trim() && knownPlace.coordinates) out.coordinates = knownPlace.coordinates;
    if (!out.website?.trim() && knownPlace.website) out.website = knownPlace.website;
    if ((!out.summary?.trim() || /\bfrum\b/i.test(out.summary)) && knownPlace.summary) {
      out.summary = knownPlace.summary;
    }
    if (knownPlace.category && (!out.category || out.category === "Landmark")) {
      out.category = normalizeCategory(knownPlace.category, out.listingLabel, out.entityType);
    }
  }

  if (!out.address?.trim()) out.address = placeAddress(out);
  const rawSummary = out.summary?.trim() ? out.summary : draftSummary(out);
  out.summary = scrubSummary(rawSummary);
  // If scrub left a broken destination template, rewrite it cleanly
  if (
    out.entityType === "vacation_destination" &&
    /with suitable for Orthodox/.test(out.summary || "")
  ) {
    out.summary = draftSummary(out);
  }
  // Prefer a real place name without trailing "framing" when we kept a richer row
  if (/\bframing\b/i.test(out.name || "") && (out.aliases || []).length) {
    const cleaner = (out.aliases || []).find(
      (a) => a && !/\bframing\b/i.test(a) && normalizeText(a).includes(coreName(out.name, out.locality).slice(0, 8)),
    );
    if (cleaner) out.name = cleaner;
  }
  if (!out.aliases || out.aliases.length === 0) out.aliases = [out.name];

  return out;
}

function exactPlaceNameKey(row) {
  const folded = foldTranslit(stripEditorial(row.name || ""));
  return `${folded}::${metroPlaceKey(row)}`;
}

function idKey(row) {
  return row.id || null;
}

const PACK_PRIORITY = {
  "white-glove-europe-batch": 0,
  "white-glove-global-batch": 1,
  "white-glove-fill-batch": 2,
  "worldwide-batch-2": 3,
  "worldwide-batch-3": 4,
  "worldwide-batch-4": 5,
  "worldwide-batch-5": 6,
};

function packRank(pack) {
  return PACK_PRIORITY[pack] ?? 99;
}

function mergeKeep(a, b) {
  // Prefer curated earlier packs; copy richer fields from the duplicate into the keeper.
  const preferA =
    packRank(a.pack) < packRank(b.pack)
      ? true
      : packRank(a.pack) > packRank(b.pack)
        ? false
        : richness(a) >= richness(b);
  const keep = preferA ? { ...a } : { ...b };
  const drop = preferA ? b : a;
  if (
    /\b(framing|orientation|daytime|placeholder|stub)\b/i.test(keep.name || "") &&
    drop.name &&
    !/\b(framing|orientation|daytime|placeholder|stub)\b/i.test(drop.name)
  ) {
    keep.name = drop.name;
  }
  for (const field of [
    "address",
    "summary",
    "coordinates",
    "website",
    "destinationSlug",
    "category",
    "listingLabel",
  ]) {
    const keepVal = keep[field];
    const dropVal = drop[field];
    if ((!keepVal || !String(keepVal).trim()) && dropVal) keep[field] = dropVal;
    else if (field === "address" && dropVal && /\d/.test(String(dropVal)) && !/\d/.test(String(keepVal || ""))) {
      keep[field] = dropVal;
    } else if (field === "summary" && dropVal && /\bfrum\b/i.test(String(keepVal || "")) && !/\bfrum\b/i.test(String(dropVal))) {
      keep[field] = dropVal;
    } else if (
      field === "summary" &&
      dropVal &&
      /with suitable for Orthodox/.test(String(keepVal || "")) &&
      !/with suitable for Orthodox/.test(String(dropVal))
    ) {
      keep[field] = dropVal;
    } else if (field === "coordinates" && dropVal && !keepVal) {
      keep[field] = dropVal;
    }
  }
  // Prefer curated pack's category taxonomy when present
  if (drop.category && (!keep.category || keep.category === "Landmark attraction")) {
    keep.category = normalizeCategory(keep.category || drop.category, keep.listingLabel, keep.entityType);
  }
  const aliasSet = new Set();
  const aliases = [];
  for (const v of [...(keep.aliases || []), ...(drop.aliases || []), drop.name, keep.name]) {
    if (!v) continue;
    const k = normalizeText(v);
    if (!k || aliasSet.has(k)) continue;
    aliasSet.add(k);
    aliases.push(v);
  }
  keep.aliases = aliases;
  const kwSet = new Set();
  const keywords = [];
  for (const v of [...(keep.keywords || []), ...(drop.keywords || [])]) {
    if (!v) continue;
    const k = normalizeText(v);
    if (!k || kwSet.has(k)) continue;
    kwSet.add(k);
    keywords.push(v);
  }
  keep.keywords = keywords;
  // Preserve helper style of the kept pack
  keep._helper = keep._helper || inferHelper(keep, keep.pack);
  return keep;
}

function dedupeAll(rows) {
  const removed = [];
  const largestClusters = [];

  const byId = new Map();
  const afterId = [];
  for (const row of rows) {
    const id = idKey(row);
    if (!id) {
      afterId.push(row);
      continue;
    }
    if (!byId.has(id)) {
      byId.set(id, row);
      afterId.push(row);
    } else {
      const keepIdx = afterId.findIndex((r) => r === byId.get(id));
      const merged = mergeKeep(byId.get(id), row);
      byId.set(id, merged);
      if (keepIdx >= 0) afterId[keepIdx] = merged;
      removed.push({ reason: "exact-id", id, drop: describe(row), keep: describe(merged) });
    }
  }

  const byExact = new Map();
  const afterExact = [];
  for (const row of afterId) {
    const k = exactPlaceNameKey(row);
    if (!k.startsWith("::")) {
      if (!byExact.has(k)) {
        byExact.set(k, row);
        afterExact.push(row);
      } else {
        const prev = byExact.get(k);
        if (!familiesCanCollapse(prev, row)) {
          afterExact.push(row);
          continue;
        }
        const keepIdx = afterExact.findIndex((r) => r === prev);
        const merged = mergeKeep(prev, row);
        byExact.set(k, merged);
        if (keepIdx >= 0) afterExact[keepIdx] = merged;
        removed.push({ reason: "exact-name-place", key: k, drop: describe(row), keep: describe(merged) });
      }
    } else {
      afterExact.push(row);
    }
  }

  const byPlace = new Map();
  for (const row of afterExact) {
    const pk = placeKey(row);
    if (!byPlace.has(pk)) byPlace.set(pk, []);
    byPlace.get(pk).push(row);
  }

  const kept = [];
  for (const [pk, group] of byPlace) {
    const n = group.length;
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (i) => {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    };
    const union = (i, j) => {
      const a = find(i);
      const b = find(j);
      if (a !== b) parent[a] = b;
    };
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (find(i) === find(j)) continue;
        if (shouldMerge(group[i], group[j])) union(i, j);
      }
    }
    const buckets = new Map();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!buckets.has(root)) buckets.set(root, []);
      buckets.get(root).push(group[i]);
    }
    for (const members of buckets.values()) {
      if (members.length === 1) {
        kept.push(members[0]);
        continue;
      }
      members.sort((a, b) => {
        const pa = packRank(a.pack);
        const pb = packRank(b.pack);
        if (pa !== pb) return pa - pb;
        return richness(b) - richness(a);
      });
      let merged = members[0];
      for (let k = 1; k < members.length; k++) {
        const drop = members[k];
        const next = mergeKeep(merged, drop);
        removed.push({ reason: "near-duplicate", key: pk, drop: describe(drop), keep: describe(next) });
        merged = next;
      }
      kept.push(merged);
      largestClusters.push({
        place: pk,
        size: members.length,
        kept: `${merged.name} [${merged.entityType} / ${merged.pack}]`,
        variants: members.map((m) => `${m.name} [${m.entityType} / ${m.pack}]`),
      });
    }
  }

  largestClusters.sort((a, b) => b.size - a.size || a.place.localeCompare(b.place));
  return { kept, removed, samples: largestClusters.slice(0, 40), largestClusters };
}

function describe(row) {
  return {
    pack: row.pack,
    name: row.name,
    locality: row.locality,
    country: row.country,
    entityType: row.entityType,
    importKind: row.importKind || row.kind,
  };
}

function shouldMerge(a, b) {
  const fa = venueFamily(a);
  const fb = venueFamily(b);
  if (fa !== fb) {
    const cemeteryBridge =
      ((fa === "place" && fb === "cemetery") || (fa === "cemetery" && fb === "place")) &&
      looksLikeCemetery(a.name) &&
      looksLikeCemetery(b.name);
    if (!cemeteryBridge) return false;
  }
  const aliasA = knownVenueAliasKey(a.name);
  const aliasB = knownVenueAliasKey(b.name);
  if (aliasA && aliasB && aliasA === aliasB) return true;
  const loc = a.locality || a.city || b.locality || "";
  const country = a.country || b.country || "";
  const stemA = orgStem(a.name);
  const stemB = orgStem(b.name);
  if (stemA && stemA === stemB && fa === "place" && fb === "place") return true;
  if (heritageSlot(a.name) && heritageSlot(b.name) && fa === "place" && fb === "place") return true;
  if (genericMikvahSlot(a.name) && genericMikvahSlot(b.name) && fa === "mikvah" && fb === "mikvah") {
    const ca = coreName(a.name, loc, country);
    const cb = coreName(b.name, loc, country);
    if (isGenericStub(ca) && isGenericStub(cb)) return true;
    if (ca && ca === cb && !isGenericStub(ca)) return true;
    return false;
  }
  if (genericCemeterySlot(a.name) && genericCemeterySlot(b.name) && fa === "cemetery" && fb === "cemetery") {
    const ca = coreName(a.name, loc, country);
    const cb = coreName(b.name, loc, country);
    if (isGenericStub(ca) && isGenericStub(cb)) return true;
    if (ca && ca === cb) return true;
    return false;
  }
  return namesNearDuplicate(a.name, b.name, loc, country, fa, fb);
}

function namesNearDuplicate(a, b, locality, country = "", familyA = "place", familyB = "place") {
  if (!a || !b) return false;
  if (foldTranslit(stripEditorial(a)) === foldTranslit(stripEditorial(b))) return true;
  const venueA = coreNameKeepVenue(a, locality, country);
  const venueB = coreNameKeepVenue(b, locality, country);
  const ca = coreName(a, locality, country);
  const cb = coreName(b, locality, country);
  const DISTINGUISHING = DISTINGUISHING_TOKENS;
  const SAME_ORG_EXTRA = new Set([
    "memorial","synagogue","synagogues","shul","shuls","community","framing","orientation","visitor",
    "resource","daytime","walk","walking","exterior","historic","site","of","de","the","la","el","jewish",
  ]);
  if (venueA && venueB && venueA === venueB && !isGenericStub(venueA)) return true;
  if (ca && cb && ca === cb && !isWeakCore(ca) && !isGenericStub(ca)) {
    const extraA = venueA.split(" ").filter((t) => t && !ca.split(" ").includes(t));
    const extraB = venueB.split(" ").filter((t) => t && !cb.split(" ").includes(t));
    const typeA = extraA.find((t) => DISTINGUISHING.has(t));
    const typeB = extraB.find((t) => DISTINGUISHING.has(t));
    if (typeA && typeB && typeA !== typeB) return false;
    if (familyA === "stay" || familyB === "stay") return familyA === familyB;
    return true;
  }
  const shorterV = venueA.length <= venueB.length ? venueA : venueB;
  const longerV = venueA.length <= venueB.length ? venueB : venueA;
  if (shorterV.length >= 5 && longerV.includes(shorterV)) {
    const extra = longerV.replace(shorterV, "").trim().split(/\s+/).filter(Boolean);
    if (extra.some((t) => DISTINGUISHING.has(t))) return false;
    const extrasAreSameOrg = extra.every(
      (t) => SAME_ORG_EXTRA.has(t) || STOP_TOKENS.has(t) || WEAK_TOKENS.has(t) || GENERIC_STUBS.has(t),
    );
    if (hasProperToken(shorterV) || extrasAreSameOrg) return true;
  }
  const shorterC = ca.length <= cb.length ? ca : cb;
  const longerC = ca.length <= cb.length ? cb : ca;
  if (
    !isWeakCore(shorterC) &&
    !isGenericStub(shorterC) &&
    hasProperToken(shorterC) &&
    shorterC.length >= 4 &&
    ` ${longerC} `.includes(` ${shorterC} `)
  ) {
    const extra = longerC.replace(shorterC, "").trim().split(/\s+/).filter(Boolean);
    if (extra.some((t) => DISTINGUISHING.has(t))) return false;
    const extrasAreSameOrg = extra.every(
      (t) => SAME_ORG_EXTRA.has(t) || STOP_TOKENS.has(t) || WEAK_TOKENS.has(t) || GENERIC_STUBS.has(t),
    );
    if (extrasAreSameOrg) return true;
  }
  const ta = new Set(significantTokens(ca).filter((t) => !GENERIC_STUBS.has(t)));
  const tb = new Set(significantTokens(cb).filter((t) => !GENERIC_STUBS.has(t)));
  if (ta.size && tb.size) {
    let inter = 0;
    for (const t of ta) if (tb.has(t)) inter++;
    const union = ta.size + tb.size - inter;
    const j = inter / union;
    if (j >= 0.55 && inter >= 1) {
      const shared = [...ta].filter((t) => tb.has(t));
      if (shared.some((t) => t.length >= 4 && !GENERIC_STUBS.has(t) && !DISTINGUISHING.has(t))) return true;
    }
  }
  if (ca && cb && !isWeakCore(ca) && !isWeakCore(cb) && hasProperToken(ca) && hasProperToken(cb)) {
    const short = ca.length <= cb.length ? ca : cb;
    const long = ca.length <= cb.length ? cb : ca;
    if (short.length >= 4 && !isGenericStub(short) && long.startsWith(`${short} `)) return true;
  }
  const la = isGenericStub(ca) ? "" : foldTranslit(ca);
  const lb = isGenericStub(cb) ? "" : foldTranslit(cb);
  if (la && lb && la.length <= 24 && lb.length <= 24 && Math.abs(la.length - lb.length) <= 2) {
    if (isTransposition(la, lb) && Math.min(la.length, lb.length) >= 4) return true;
    const dist = levenshtein(la, lb);
    if (dist <= 1 && Math.min(la.length, lb.length) >= 4) return true;
    if (dist <= 2 && Math.min(la.length, lb.length) >= 4) return true;
  }
  return false;
}

function isTransposition(a, b) {
  if (a.length !== b.length) return false;
  const diffs = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diffs.push(i);
  return diffs.length === 2 && diffs[1] === diffs[0] + 1 && a[diffs[0]] === b[diffs[1]] && a[diffs[1]] === b[diffs[0]];
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function coverage(rows) {
  const total = rows.length || 1;
  let address = 0;
  let summary = 0;
  let category = 0;
  let coordinates = 0;
  for (const r of rows) {
    if ((r.address || "").trim()) address++;
    if ((r.summary || "").trim()) summary++;
    if ((r.category || "").trim()) category++;
    if ((r.coordinates || "").trim()) coordinates++;
  }
  const pct = (n) => Math.round((1000 * n) / total) / 10;
  return {
    total: rows.length,
    address: pct(address),
    summary: pct(summary),
    category: pct(category),
    coordinates: pct(coordinates),
    addressCount: address,
    summaryCount: summary,
    categoryCount: category,
    coordinatesCount: coordinates,
  };
}

const ENRICHABLE_PACKS = new Set([
  "worldwide-batch-3",
  "worldwide-batch-4",
  "worldwide-batch-5",
]);

function uniqueNormalizedList(values) {
  const seen = new Set();
  const out = [];
  for (const v of values || []) {
    if (!v) continue;
    const k = normalizeText(v);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function serializeRow(row, packSlug) {
  const q = (s) => JSON.stringify(s ?? "");
  const arr = (a) => `[${uniqueNormalizedList(a).map((x) => JSON.stringify(x)).join(", ")}]`;
  const usesCity = packSlug === "white-glove-europe-batch";
  const enrichable = ENRICHABLE_PACKS.has(packSlug);
  const allowCoords = packSlug === "worldwide-batch-4" || packSlug === "worldwide-batch-5";
  const helper = row._helper || (packSlug.includes("europe") || packSlug.includes("global") || packSlug.includes("fill") ? "sourceDraft" : "draft");

  // Batch-2 / fill thin helpers
  if (["destination", "attraction", "stayAnchor", "kosherResource", "resource", "practicalResource"].includes(helper)) {
    const lines = [`  ${helper}({`];
    lines.push(`    market: ${q(row.market)},`);
    lines.push(`    slug: ${q(row.slug)},`);
    lines.push(`    name: ${q(row.name)},`);
    lines.push(`    aliases: ${arr(row.aliases)},`);
    lines.push(`    keywords: ${arr(row.keywords)},`);
    lines.push(`    locality: ${q(row.locality || row.city)},`);
    lines.push(`    destination: ${q(row.destination || row.locality)},`);
    lines.push(`    country: ${q(row.country)},`);
    lines.push(`    sourceKey: ${q(row.sourceKey)},`);
    if (helper === "attraction" || helper === "kosherResource" || helper === "resource" || helper === "practicalResource") {
      lines.push(`    category: ${q(row.category)},`);
    }
    lines.push("  }),");
    return lines.join("\n");
  }

  const lines = [`  ${helper === "sourceDraft" ? "sourceDraft" : "draft"}({`];
  lines.push(`    market: ${q(row.market)},`);
  lines.push(`    entityType: ${q(row.entityType)},`);
  if (usesCity || helper === "sourceDraft") {
    // Europe uses kind; global/fill use importKind
    if (usesCity) lines.push(`    kind: ${q(row.kind || row.importKind || "ATTRACTION")},`);
    else lines.push(`    importKind: ${q(row.importKind || "ATTRACTION")},`);
  } else {
    lines.push(`    importKind: ${q(row.importKind || "ATTRACTION")},`);
  }
  if (row.importTarget) lines.push(`    importTarget: ${q(row.importTarget)},`);
  lines.push(`    category: ${q(row.category)},`);
  if (row.listingLabel) lines.push(`    listingLabel: ${q(row.listingLabel)},`);
  lines.push(`    slug: ${q(row.slug)},`);
  lines.push(`    name: ${q(row.name)},`);
  lines.push(`    aliases: ${arr(row.aliases)},`);
  lines.push(`    keywords: ${arr(row.keywords)},`);
  if (usesCity) lines.push(`    city: ${q(row.locality || row.city)},`);
  else lines.push(`    locality: ${q(row.locality || row.city)},`);
  lines.push(`    destination: ${q(row.destination || row.locality)},`);
  lines.push(`    country: ${q(row.country)},`);
  if (enrichable) {
    if (row.address) lines.push(`    address: ${q(row.address)},`);
    if (row.summary) lines.push(`    summary: ${q(row.summary)},`);
    if (allowCoords && row.coordinates) lines.push(`    coordinates: ${q(row.coordinates)},`);
    if (row.website) lines.push(`    website: ${q(row.website)},`);
    if (row.destinationSlug) lines.push(`    destinationSlug: ${q(row.destinationSlug)},`);
  }
  lines.push(`    sourceKey: ${q(row.sourceKey)},`);
  lines.push("  }),");
  return lines.join("\n");
}

function extractTsHeader(file) {
  const text = fs.readFileSync(file, "utf8");
  // Keep everything up to and including the `= [` of the export array
  const m = text.match(/^([\s\S]*?export const \w+Candidates:[\s\S]*?=\s*\[)/);
  if (!m) throw new Error(`Cannot find candidates export in ${file}`);
  return m[1];
}

function writeTsPack(packMeta, rows) {
  const file = path.join(IMPORTS, packMeta.slug, "candidates.ts");
  const header = extractTsHeader(file);
  const body = rows.map((r) => serializeRow(r, packMeta.slug)).join("\n");
  // Refresh approximate count in the header comment when present
  let hdr = header.replace(/Private NEEDS_REVIEW candidates \(~\d+\)/, `Private NEEDS_REVIEW candidates (~${rows.length})`);
  hdr = hdr.replace(/~?\d+(?=\)\.)/, String(rows.length));
  const out = `${hdr}\n${body}\n];\n`;
  fs.writeFileSync(file, out, "utf8");
}

function writeJsonPack(packMeta, rows) {
  const dir = path.join(IMPORTS, packMeta.slug);
  const chunkSize = 2500;
  // Remove old parts
  for (const f of fs.readdirSync(dir)) {
    if (/^_data-part\d+\.json$/.test(f)) fs.unlinkSync(path.join(dir, f));
  }
  const chunks = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    chunks.push(rows.slice(i, i + chunkSize));
  }
  if (chunks.length === 0) chunks.push([]);
  const imports = [];
  const spreads = [];
  for (let i = 0; i < chunks.length; i++) {
    const part = i + 1;
    const file = path.join(dir, `_data-part${part}.json`);
    const cleaned = chunks[i].map((r) => cleanJsonRow(r));
    fs.writeFileSync(file, JSON.stringify(cleaned), "utf8");
    imports.push(`import part${part} from "./_data-part${part}.json";`);
    spreads.push(`  ...(part${part} as CandidateDraftRow[])`);
  }

  // Rewrite candidates.ts imports if chunk count changed
  const candPath = path.join(dir, "candidates.ts");
  let cand = fs.readFileSync(candPath, "utf8");
  cand = cand.replace(
    /^(?:import part\d+ from "\.\/_data-part\d+\.json";\n)+/m,
    `${imports.join("\n")}\n`,
  );
  cand = cand.replace(
    /const rows = \[[\s\S]*?\] as const;/,
    `const rows = [\n${spreads.join(",\n")},\n] as const;`,
  );
  cand = cand.replace(/~?\d+(?=\)\.)/, `~${rows.length}`);
  cand = cand.replace(/Private NEEDS_REVIEW candidates \(~\d+\)/, `Private NEEDS_REVIEW candidates (~${rows.length})`);
  fs.writeFileSync(candPath, cand, "utf8");

  // Update _counts.json if present
  const countsPath = path.join(dir, "_counts.json");
  if (fs.existsSync(countsPath)) {
    const byListingLabel = {};
    const byImportKind = {};
    const byEntityType = {};
    for (const r of rows) {
      if (r.listingLabel) byListingLabel[r.listingLabel] = (byListingLabel[r.listingLabel] || 0) + 1;
      const ik = r.importKind || "ATTRACTION";
      byImportKind[ik] = (byImportKind[ik] || 0) + 1;
      byEntityType[r.entityType] = (byEntityType[r.entityType] || 0) + 1;
    }
    const prev = JSON.parse(fs.readFileSync(countsPath, "utf8"));
    fs.writeFileSync(
      countsPath,
      JSON.stringify(
        {
          ...prev,
          total: rows.length,
          chunks: chunks.length,
          byListingLabel,
          byImportKind,
          byEntityType,
          dedupedAt: new Date().toISOString().slice(0, 10),
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
  }
}

function cleanJsonRow(r) {
  const out = {
    market: r.market,
    entityType: r.entityType,
    importKind: r.importKind,
    importTarget: r.importTarget,
    category: r.category,
    listingLabel: r.listingLabel,
    slug: r.slug,
    name: r.name,
    aliases: uniqueNormalizedList(r.aliases || [r.name]),
    keywords: uniqueNormalizedList(r.keywords || []),
    locality: r.locality || r.city,
    destination: r.destination || r.locality || r.city,
    country: r.country,
    address: r.address,
    summary: r.summary,
    sourceKey: r.sourceKey,
  };
  if (r.coordinates) out.coordinates = r.coordinates;
  if (r.website) out.website = r.website;
  if (r.destinationSlug) out.destinationSlug = r.destinationSlug;
  return out;
}

function filterNightlife(rows) {
  const kept = [];
  const removed = [];
  for (const r of rows) {
    const hay = `${r.name} ${r.summary || ""} ${(r.keywords || []).join(" ")}`;
    if (NIGHTLIFE_RE.test(hay)) {
      removed.push({ reason: "nightlife", drop: describe(r) });
    } else {
      kept.push(r);
    }
  }
  return { kept, removed };
}

function updateBatch4Counts(rows) {
  const countsPath = path.join(IMPORTS, "worldwide-batch-4", "_counts.json");
  if (!fs.existsSync(countsPath)) return;
  const byListingLabel = {};
  const byImportKind = {};
  const byEntityType = {};
  for (const r of rows) {
    if (r.listingLabel) byListingLabel[r.listingLabel] = (byListingLabel[r.listingLabel] || 0) + 1;
    const ik = r.importKind || "ATTRACTION";
    byImportKind[ik] = (byImportKind[ik] || 0) + 1;
    byEntityType[r.entityType] = (byEntityType[r.entityType] || 0) + 1;
  }
  const prev = JSON.parse(fs.readFileSync(countsPath, "utf8"));
  fs.writeFileSync(
    countsPath,
    JSON.stringify(
      {
        ...prev,
        total: rows.length,
        byListingLabel,
        byImportKind,
        byEntityType,
        dedupedAt: new Date().toISOString().slice(0, 10),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

function updateBatch3Counts(rows) {
  const countsPath = path.join(IMPORTS, "worldwide-batch-3", "_counts.json");
  if (!fs.existsSync(countsPath)) return;
  const byListingLabel = {};
  const byImportKind = {};
  const byEntityType = {};
  for (const r of rows) {
    if (r.listingLabel) byListingLabel[r.listingLabel] = (byListingLabel[r.listingLabel] || 0) + 1;
    const ik = r.importKind || "ATTRACTION";
    byImportKind[ik] = (byImportKind[ik] || 0) + 1;
    byEntityType[r.entityType] = (byEntityType[r.entityType] || 0) + 1;
  }
  const prev = JSON.parse(fs.readFileSync(countsPath, "utf8"));
  fs.writeFileSync(
    countsPath,
    JSON.stringify(
      {
        ...prev,
        total: rows.length,
        byListingLabel,
        byImportKind,
        byEntityType,
        dedupedAt: new Date().toISOString().slice(0, 10),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

function inferHelper(row, packSlug) {
  if (packSlug === "white-glove-europe-batch") return "sourceDraft";
  if (packSlug === "white-glove-global-batch") return "sourceDraft";
  if (packSlug === "white-glove-fill-batch") {
    if (row.entityType === "vacation_destination") return "destination";
    if (row.entityType === "attraction") return "attraction";
    if (row.entityType === "stay_anchor") return "stayAnchor";
    return "resource";
  }
  if (packSlug === "worldwide-batch-2") {
    if (row.entityType === "vacation_destination") return "destination";
    if (row.entityType === "attraction") return "attraction";
    if (row.entityType === "stay_anchor") return "stayAnchor";
    return "kosherResource";
  }
  return "draft";
}

function leftoverCollisions(rows) {
  const exact = new Map();
  for (const r of rows) {
    const k = `${foldTranslit(stripEditorial(r.name))}::${placeKey(r)}`;
    if (!exact.has(k)) exact.set(k, []);
    exact.get(k).push(r);
  }
  const exactGroups = [...exact.values()].filter((g) => g.length > 1);
  let fuzzyPairs = 0;
  const byPlace = new Map();
  for (const r of rows) {
    const pk = placeKey(r);
    if (!byPlace.has(pk)) byPlace.set(pk, []);
    byPlace.get(pk).push(r);
  }
  for (const group of byPlace.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (shouldMerge(group[i], group[j])) fuzzyPairs += 1;
      }
    }
  }
  const nearMisses = [];
  for (const [pk, group] of byPlace) {
    if (group.length < 2) continue;
    const byToken = new Map();
    for (const r of group) {
      const core = coreName(r.name, r.locality || r.city, r.country);
      const toks = significantTokens(core).filter((t) => t.length >= 4 && !GENERIC_STUBS.has(t));
      for (const t of toks) {
        if (!byToken.has(t)) byToken.set(t, []);
        byToken.get(t).push(r);
      }
    }
    for (const [tok, members] of byToken) {
      const uniq = [];
      const seen = new Set();
      for (const m of members) {
        const id = m.slug || `${m.name}::${m.entityType}`;
        if (seen.has(id)) continue;
        seen.add(id);
        uniq.push(m);
      }
      if (uniq.length < 2) continue;
      nearMisses.push({
        place: pk,
        sharedToken: tok,
        size: uniq.length,
        names: uniq.map((m) => `${m.name} [${m.entityType}]`),
      });
    }
  }
  nearMisses.sort((a, b) => b.size - a.size || a.place.localeCompare(b.place));
  return {
    exactNamePlaceGroups: exactGroups.length,
    extraExactRows: exactGroups.reduce((s, g) => s + g.length - 1, 0),
    remainingMergeablePairs: fuzzyPairs,
    remainingSharedTokenGroups: nearMisses.length,
    remainingSharedTokenExtraRows: nearMisses.reduce((s, g) => s + g.size - 1, 0),
    sampleRemainingSharedTokenGroups: nearMisses.slice(0, 15),
  };
}

function sampleCity(rows, localityNeedle) {
  const needle = normalizeText(localityNeedle);
  const hits = rows.filter((r) => normalizeText(r.locality || r.city || "").includes(needle));
  return {
    count: hits.length,
    names: hits.map((r) => `${r.name} [${r.entityType} / ${r.pack}]`),
  };
}

function R(name, locality, country, entityType, importKind) {
  return { name, locality, country, entityType, importKind };
}

function selfCheck() {
  const checks = {
    "AMIA + Memorial": shouldMerge(R("AMIA", "Buenos Aires", "Argentina", "kosher_travel_resource", "PRACTICAL"), R("AMIA Memorial", "Buenos Aires", "Argentina", "attraction", "ATTRACTION")),
    "AMIA + Aima": shouldMerge(R("AMIA", "Buenos Aires", "Argentina", "kosher_travel_resource", "PRACTICAL"), R("Aima", "Buenos Aires", "Argentina", "attraction", "ATTRACTION")),
    "AMIA + community synagogues": shouldMerge(R("AMIA", "Buenos Aires", "Argentina", "kosher_travel_resource", "PRACTICAL"), R("AMIA community synagogues framing", "Buenos Aires", "Argentina", "shul", "PRACTICAL")),
    "Templo Libertad attraction + shul": shouldMerge(R("Templo Libertad", "Buenos Aires", "Argentina", "attraction", "ATTRACTION"), R("Templo Libertad", "Buenos Aires", "Argentina", "shul", "PRACTICAL")),
    "Judah Hyam heritage + shul": shouldMerge(R("Judah Hyam Synagogue Delhi", "New Delhi", "India", "attraction", "ATTRACTION"), R("Judah Hyam Synagogue", "New Delhi", "India", "shul", "PRACTICAL")),
    "hotel vs park (must be false)": shouldMerge(R("Central Hotel", "Buenos Aires", "Argentina", "stay_anchor", "PLACE_TO_STAY"), R("Central Park", "Buenos Aires", "Argentina", "attraction", "ATTRACTION")),
    "Melbourne Museum vs Immigration Museum (must be false)": shouldMerge(R("Melbourne Museum", "Melbourne", "Australia", "attraction", "ATTRACTION"), R("Immigration Museum Melbourne", "Melbourne", "Australia", "attraction", "ATTRACTION")),
    "Cluj park vs Chabad (must be false)": shouldMerge(R("Central Park Cluj", "Cluj-Napoca", "Romania", "attraction", "ATTRACTION"), R("Chabad of Cluj framing", "Cluj-Napoca", "Romania", "shul", "PRACTICAL")),
    "Ramchal shul vs kever (must be false)": shouldMerge(R("Ramchal Synagogue Akko", "Akko", "Israel", "shul", "PRACTICAL"), R("Ramchal kever heritage framing Akko", "Akko", "Israel", "beis_hachaim", "ATTRACTION")),
    "museum quarter vs heritage walk (must be false)": shouldMerge(R("Aarhus museum quarter outdoor approach", "Aarhus", "Denmark", "attraction", "ATTRACTION"), R("Aarhus Jewish heritage walking corridor", "Aarhus", "Denmark", "attraction", "ATTRACTION")),
    "Montjuic vs Castell (must be false)": shouldMerge(R("Montjuïc", "Barcelona", "Spain", "attraction", "ATTRACTION"), R("Castell de Montjuïc", "Barcelona", "Spain", "attraction", "ATTRACTION")),
    "Triana vs Puente (must be false)": shouldMerge(R("Triana", "Seville", "Spain", "attraction", "ATTRACTION"), R("Puente de Triana", "Seville", "Spain", "attraction", "ATTRACTION")),
    "Santa Cruz stay vs barrio (must be false)": shouldMerge(R("Staying near Santa Cruz, Seville", "Seville", "Spain", "practical_travel_anchor", "PLACE_TO_STAY"), R("Barrio Santa Cruz", "Seville", "Spain", "attraction", "ATTRACTION")),
    "heritage walk vs historic quarter": shouldMerge(R("Aarhus Jewish heritage walking corridor", "Aarhus", "Denmark", "attraction", "ATTRACTION"), R("Aarhus historic Jewish quarter outdoor framing", "Aarhus", "Denmark", "attraction", "ATTRACTION")),
    "Jewish Cultural Quarter vs visitor resource": shouldMerge(R("Jewish Cultural Quarter", "Amsterdam", "Netherlands", "attraction", "ATTRACTION"), R("Jewish Cultural Quarter visitor resource", "Amsterdam", "Netherlands", "kosher_travel_resource", "PRACTICAL")),
    "Jewish Cultural Quarter vs cultural plaza (must be false)": shouldMerge(R("Jewish Cultural Quarter", "Amsterdam", "Netherlands", "attraction", "ATTRACTION"), R("Amsterdam cultural district outdoor plaza", "Amsterdam", "Netherlands", "attraction", "ATTRACTION")),
    "Field Museum vs Wrigley Field (must be false)": shouldMerge(R("Field Museum", "Chicago", "United States", "attraction", "ATTRACTION"), R("Wrigley Field framing", "Chicago", "United States", "attraction", "ATTRACTION")),
    "Texas Capitol vs Bullock Museum (must be false)": shouldMerge(R("Texas State Capitol grounds", "Austin", "United States", "attraction", "ATTRACTION"), R("Bullock Texas State History Museum", "Austin", "United States", "attraction", "ATTRACTION")),
    "Casa Batllo vs Casa Mila (must be false)": shouldMerge(R("Casa Batlló", "Barcelona", "Spain", "attraction", "ATTRACTION"), R("Casa Milà", "Barcelona", "Spain", "attraction", "ATTRACTION")),
    "Sant Pau hospital vs art nouveau site": shouldMerge(R("Hospital de Sant Pau", "Barcelona", "Spain", "attraction", "ATTRACTION"), R("Sant Pau Art Nouveau Site", "Barcelona", "Spain", "attraction", "ATTRACTION")),
    "Sant Pau vs Recinte Modernista": shouldMerge(R("Sant Pau Art Nouveau Site", "Barcelona", "Spain", "attraction", "ATTRACTION"), R("Recinte Modernista de Sant Pau", "Barcelona", "Spain", "attraction", "ATTRACTION")),
    "Sant Pau vs Sant Antoni (must be false)": shouldMerge(R("Hospital de Sant Pau", "Barcelona", "Spain", "attraction", "ATTRACTION"), R("Mercat de Sant Antoni", "Barcelona", "Spain", "attraction", "ATTRACTION")),
    "Malecon vs Miraflores boardwalk": shouldMerge(R("Malecón Miraflores", "Lima", "Peru", "attraction", "ATTRACTION"), R("Miraflores boardwalk", "Lima", "Peru", "attraction", "ATTRACTION")),
    "Mini-Europe vs framing variant": shouldMerge(R("Mini-Europe", "Brussels", "Belgium", "attraction", "ATTRACTION"), R("Mini-Europe outdoor daytime family framing", "Brussels", "Belgium", "attraction", "ATTRACTION")),
    "Anne Kolb Hollywood vs Fort Lauderdale exact key":
      exactPlaceNameKey(R("Anne Kolb Nature Center", "Hollywood", "United States", "attraction", "ATTRACTION")) ===
      exactPlaceNameKey(R("Anne Kolb Nature Center", "Fort Lauderdale", "United States", "attraction", "ATTRACTION")),
    "Grant Park Chicago vs Atlanta keep separate exact keys":
      exactPlaceNameKey(R("Grant Park", "Chicago", "United States", "attraction", "ATTRACTION")) !==
      exactPlaceNameKey(R("Grant Park", "Atlanta", "United States", "attraction", "ATTRACTION")),
  };
  console.log("Matcher self-check:", checks);
  const failed = Object.entries(checks).filter(([k, v]) => (k.includes("must be false") ? v !== false : v !== true));
  if (failed.length) {
    console.error("Self-check failures:", Object.fromEntries(failed));
    process.exit(1);
  }
  return checks;
}

function main() {
  if (process.argv.includes("--self-check")) {
    selfCheck();
    console.log("Self-check passed");
    return;
  }
  console.log(DRY ? "DRY RUN" : "WRITE MODE");
  const checks = selfCheck();
  const known = loadKnownPlaces();
  console.log(`Known places loaded: ${known.size}`);

  let all = [];
  const packCountsBefore = {};
  for (const pack of PACKS) {
    const dir = path.join(IMPORTS, pack.slug);
    const rows =
      pack.kind === "json"
        ? parseJsonPack(dir, pack.slug)
        : parseTsCandidates(path.join(dir, "candidates.ts"), pack.slug);
    packCountsBefore[pack.slug] = rows.length;
    console.log(`Loaded ${pack.slug}: ${rows.length}`);
    all = all.concat(rows);
  }
  const before = all.length;
  const beforeCov = coverage(all);
  console.log(`Before total: ${before}`);
  const buenosBefore = sampleCity(all, "buenos aires");

  const nightlife = filterNightlife(all);
  all = nightlife.kept;

  const { kept, removed, samples, largestClusters } = dedupeAll(all);
  console.log(`Removed nightlife: ${nightlife.removed.length}`);
  console.log(`Removed duplicates: ${removed.length}`);
  console.log(`After dedupe: ${kept.length}`);

  const leftovers = leftoverCollisions(kept);
  const buenosAfter = sampleCity(kept, "buenos aires");

  const enriched = kept.map((r) => {
    if (ENRICHABLE_PACKS.has(r.pack)) return enrichRow(r, known);
    return { ...r, category: normalizeCategory(r.category, r.listingLabel, r.entityType) };
  });
  const afterCov = coverage(enriched.filter((r) => ENRICHABLE_PACKS.has(r.pack)));
  const beforeEnrichableCov = coverage(all.filter((r) => ENRICHABLE_PACKS.has(r.pack)));

  const byPack = new Map(PACKS.map((p) => [p.slug, []]));
  for (const row of enriched) {
    if (!byPack.has(row.pack)) byPack.set(row.pack, []);
    byPack.get(row.pack).push(row);
  }

  const packCountsAfter = {};
  for (const pack of PACKS) {
    const rows = byPack.get(pack.slug) || [];
    packCountsAfter[pack.slug] = rows.length;
    const candFile = path.join(IMPORTS, pack.slug, "candidates.ts");
    const mappedSource = fs.existsSync(candFile) && /\.map\(\s*\(?\s*name/.test(fs.readFileSync(candFile, "utf8"));
    if (mappedSource) {
      console.log(`Skipped ${pack.slug}: mapped source left in place (${packCountsBefore[pack.slug]} file rows, ${rows.length} after in-memory dedupe)`);
      packCountsAfter[pack.slug] = packCountsBefore[pack.slug];
      continue;
    }
    if (DRY) {
      console.log(`Would rewrite ${pack.slug}: ${packCountsBefore[pack.slug]} → ${rows.length}`);
      continue;
    }
    if (pack.kind === "json") writeJsonPack(pack, rows);
    else writeTsPack(pack, rows);
    if (pack.slug === "worldwide-batch-4") updateBatch4Counts(rows);
    if (pack.slug === "worldwide-batch-3") updateBatch3Counts(rows);
    console.log(`Rewrote ${pack.slug}: ${packCountsBefore[pack.slug]} → ${rows.length}`);
  }

  const amiaCluster = (largestClusters || []).find((c) => (c.variants || []).some((v) => /amia|aima/i.test(v)));
  let prevReport = null;
  if (fs.existsSync(REPORT_PATH)) {
    try {
      prevReport = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
    } catch {
      prevReport = null;
    }
  }
  const originalBaseline = prevReport?.originalBaseline || 24077;
  const firstPassBefore = prevReport?.firstPassBefore || (prevReport?.before > before ? prevReport.before : 23994);
  const firstPackCountsBefore = prevReport?.firstPackCountsBefore || (prevReport?.before > before ? prevReport.packCountsBefore : packCountsBefore);
  const diskAfter = Object.values(packCountsAfter).reduce((s, n) => s + n, 0);
  const report = {
    originalBaseline,
    firstPassBefore,
    firstPackCountsBefore,
    before: firstPassBefore,
    thisPassLoaded: before,
    after: diskAfter,
    afterInMemory: enriched.length,
    removed: firstPassBefore - diskAfter,
    removedThisPass: before - enriched.length,
    removedFromOriginal: originalBaseline - diskAfter,
    nightlifeRemoved: nightlife.removed.length,
    duplicateRemoved: firstPassBefore - diskAfter,
    packCountsBefore: firstPackCountsBefore,
    packCountsThisPass: packCountsBefore,
    packCountsAfter,
    coverageBefore: beforeCov,
    coverageAfterAll: coverage(enriched),
    coverageEnrichableBefore: beforeEnrichableCov,
    coverageEnrichableAfter: afterCov,
    matcherSelfCheck: checks,
    buenosAiresBefore: buenosBefore.count,
    buenosAiresAfter: buenosAfter.count,
    buenosAiresNamesAfter: buenosAfter.names.filter((n) => /amia|aima|templo libertad|chabad/i.test(n)),
    amiaCluster: amiaCluster || prevReport?.amiaCluster || null,
    largestClustersThisPass: (largestClusters || []).slice(0, 25),
    sampleClusters: samples.slice(0, 25),
    leftovers,
    removedByReason: removed.reduce((acc, r) => {
      acc[r.reason] = (acc[r.reason] || 0) + 1;
      return acc;
    }, {}),
    dryRun: DRY,
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log("\n=== REPORT ===");
  console.log(JSON.stringify(report, null, 2));
}

// Importable so the duplicate audit can reuse one matcher rather than keeping a
// second copy of it. Rewriting packs still only happens when run directly.
export {
  PACKS,
  IMPORTS,
  parseTsCandidates,
  parseJsonPack,
  normalizeText,
  placeKey,
  metroPlaceKey,
  exactPlaceNameKey,
  shouldMerge,
  namesNearDuplicate,
  venueFamily,
  coreName,
  dedupeAll,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
