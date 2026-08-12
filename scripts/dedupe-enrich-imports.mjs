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
/** Soft religious suffixes only — never strip park/museum/hotel (false merges). */
const SUFFIX_RE =
  /\s+(synagogue|synagoge|shul|beit knesset|beis knesses|mikvah|mikveh|mikve|mikva|cemetery|beis hachaim|beit hachaim|orthodox|chabad)$/;
/** Editorial staging noise — "AMIA memorial framing" ≡ "AMIA Memorial". */
const EDITORIAL_RE = /\s+(framing|orientation|listing|candidate|draft|placeholder|stub)$/;

/** Common transliteration / spelling folds for fuzzy matching. */
const TRANSLIT = [
  [/ph/g, "f"],
  [/kh/g, "ch"],
  [/q/g, "k"],
  [/ou/g, "u"],
  [/ee/g, "i"],
  [/aa/g, "a"],
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

function coreName(name, locality) {
  let n = normalizeText(name);
  const loc = normalizeText(locality);
  if (loc) {
    const re = new RegExp(`(^|\\s)${escapeRegExp(loc)}(\\s|$)`, "g");
    n = n.replace(re, " ").trim().replace(/\s+/g, " ");
  }
  // Strip trailing country words sometimes pasted into names
  n = n.replace(PREFIX_RE, "").replace(SUFFIX_RE, "").replace(EDITORIAL_RE, "").trim();
  return foldTranslit(n);
}

function kindBucket(row) {
  const et = row.entityType || "";
  const ik = row.importKind || row.kind || "";
  if (et === "shul" || et === "mikvah" || et === "beis_hachaim") return et;
  if (et === "stay_anchor" || ik === "PLACE_TO_STAY") return "stay";
  if (et === "vacation_destination") return "destination";
  if (et === "kosher_travel_resource" || et === "practical_travel_resource" || et === "practical_travel_anchor")
    return "resource";
  if (ik === "ATTRACTION" || et === "attraction") return "attraction";
  if (ik === "PRACTICAL") return "practical";
  return et || ik || "other";
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
  const re = new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`);
  const m = body.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/["']([^"']*)["']/g)].map((x) => x[1]);
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
  const re = /\b(sourceDraft|draft|destination|attraction|stayAnchor|kosherResource|practicalResource)\s*\(\s*\{/g;
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

function clusterKey(row) {
  return [
    normalizeText(row.locality),
    normalizeText(row.country),
    kindBucket(row),
    coreName(row.name, row.locality),
  ].join("::");
}

function strictKey(row) {
  return [
    row.entityType || "",
    normalizeText(row.name),
    normalizeText(row.locality),
    normalizeText(row.country),
  ].join("::");
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
  // Prefer a customer-facing name without editorial "framing"
  if (/\bframing\b/i.test(keep.name || "") && drop.name && !/\bframing\b/i.test(drop.name)) {
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
  const aliasSet = new Set([...(keep.aliases || []), ...(drop.aliases || []), drop.name, keep.name].filter(Boolean));
  keep.aliases = [...aliasSet];
  const kw = new Set([...(keep.keywords || []), ...(drop.keywords || [])].filter(Boolean));
  keep.keywords = [...kw];
  // Preserve helper style of the kept pack
  keep._helper = keep._helper || inferHelper(keep, keep.pack);
  return keep;
}

function dedupeAll(rows) {
  const removed = [];
  const samples = [];

  // Pass 1: exact id
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

  // Pass 2: strict entity+name+place
  const byStrict = new Map();
  const afterStrict = [];
  for (const row of afterId) {
    const k = strictKey(row);
    if (!byStrict.has(k)) {
      byStrict.set(k, row);
      afterStrict.push(row);
    } else {
      const prev = byStrict.get(k);
      const keepIdx = afterStrict.findIndex((r) => r === prev);
      const merged = mergeKeep(prev, row);
      byStrict.set(k, merged);
      if (keepIdx >= 0) afterStrict[keepIdx] = merged;
      removed.push({ reason: "exact-name-place-type", key: k, drop: describe(row), keep: describe(merged) });
    }
  }

  // Pass 3: fuzzy near-dupes
  const byFuzzy = new Map();
  const afterFuzzy = [];
  for (const row of afterStrict) {
    const k = clusterKey(row);
    // Skip empty core names (would over-merge)
    const core = coreName(row.name, row.locality);
    if (!core || core.length < 2) {
      afterFuzzy.push(row);
      continue;
    }
    if (!byFuzzy.has(k)) {
      byFuzzy.set(k, row);
      afterFuzzy.push(row);
    } else {
      const prev = byFuzzy.get(k);
      // Require same importKind family already in key; extra guard: names must be close
      if (!namesNearDuplicate(prev.name, row.name, row.locality)) {
        afterFuzzy.push(row);
        continue;
      }
      const keepIdx = afterFuzzy.findIndex((r) => r === prev);
      const merged = mergeKeep(prev, row);
      byFuzzy.set(k, merged);
      if (keepIdx >= 0) afterFuzzy[keepIdx] = merged;
      removed.push({ reason: "near-duplicate", key: k, drop: describe(row), keep: describe(merged) });
      if (samples.length < 40) {
        samples.push({
          key: k,
          kept: describe(merged),
          removed: describe(row),
        });
      }
    }
  }

  return { kept: afterFuzzy, removed, samples };
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

function namesNearDuplicate(a, b, locality) {
  const ca = coreName(a, locality);
  const cb = coreName(b, locality);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  // Full normalized equality after fold (before locality strip differences)
  if (foldTranslit(a) === foldTranslit(b)) return true;
  // one contains the other — only when the shorter is a substantial phrase
  const shorter = ca.length <= cb.length ? ca : cb;
  const longer = ca.length <= cb.length ? cb : ca;
  if (shorter.length >= 6 && longer.includes(shorter)) {
    // Reject when the only extra tokens are distinguishing type words
    const extra = longer
      .replace(shorter, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const distinguishing = new Set([
      "park",
      "museum",
      "garden",
      "gardens",
      "hotel",
      "market",
      "bridge",
      "tower",
      "castle",
      "beach",
      "lake",
      "river",
      "square",
      "plaza",
      "cathedral",
      "church",
      "mosque",
      "zoo",
      "aquarium",
    ]);
    if (extra.some((t) => distinguishing.has(t))) return false;
    return true;
  }
  // token Jaccard
  const ta = new Set(ca.split(" ").filter(Boolean));
  const tb = new Set(cb.split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return false;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  const j = inter / union;
  if (j >= 0.9 && inter >= 2) return true;
  // edit distance for short names (Aima / Ayma / AIMA)
  if (ca.length <= 24 && cb.length <= 24 && Math.abs(ca.length - cb.length) <= 2) {
    const dist = levenshtein(ca, cb);
    if (dist <= 1) return true;
    if (dist <= 2 && ca.length >= 5) return true;
  }
  return false;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 99;
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

function serializeRow(row, packSlug) {
  const q = (s) => JSON.stringify(s ?? "");
  const arr = (a) => `[${(a || []).map((x) => JSON.stringify(x)).join(", ")}]`;
  const usesCity = packSlug === "white-glove-europe-batch";
  const enrichable = ENRICHABLE_PACKS.has(packSlug);
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
    if (row.coordinates) lines.push(`    coordinates: ${q(row.coordinates)},`);
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
    aliases: r.aliases || [r.name],
    keywords: r.keywords || [],
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

function loadFromDump() {
  const dumpPath = path.join(ROOT, "scripts", "_all-import-candidates.json");
  if (!fs.existsSync(dumpPath)) return null;
  const dump = JSON.parse(fs.readFileSync(dumpPath, "utf8"));
  return dump.rows.map((r) => ({
    ...r,
    locality: r.locality || r.city || "",
    city: r.city || r.locality || "",
    _helper: inferHelper(r, r.pack),
    _src: "dump",
  }));
}

function main() {
  console.log(DRY ? "DRY RUN" : "WRITE MODE");
  const known = loadKnownPlaces();
  console.log(`Known places loaded: ${known.size}`);

  let all = [];
  const packCountsBefore = {};
  const dumped = loadFromDump();
  if (dumped) {
    console.log(`Loaded dump: ${dumped.length} rows`);
    all = dumped;
    for (const pack of PACKS) {
      packCountsBefore[pack.slug] = dumped.filter((r) => r.pack === pack.slug).length;
      console.log(`  ${pack.slug}: ${packCountsBefore[pack.slug]}`);
    }
  } else {
    for (const pack of PACKS) {
      const dir = path.join(IMPORTS, pack.slug);
      let rows =
        pack.kind === "json"
          ? parseJsonPack(dir, pack.slug)
          : parseTsCandidates(path.join(dir, "candidates.ts"), pack.slug);
      packCountsBefore[pack.slug] = rows.length;
      console.log(`Loaded ${pack.slug}: ${rows.length}`);
      all = all.concat(rows);
    }
  }
  const before = all.length;
  const beforeCov = coverage(all);
  console.log(`Before total: ${before}`);

  const nightlife = filterNightlife(all);
  all = nightlife.kept;

  const { kept, removed, samples } = dedupeAll(all);
  console.log(`Removed nightlife: ${nightlife.removed.length}`);
  console.log(`Removed duplicates: ${removed.length}`);
  console.log(`After dedupe: ${kept.length}`);

  const enriched = kept.map((r) => {
    // Only mutate enrichable packs' stored fields; older packs still get
    // category normalization for staging via import-prefill.
    if (ENRICHABLE_PACKS.has(r.pack)) return enrichRow(r, known);
    return {
      ...r,
      category: normalizeCategory(r.category, r.listingLabel, r.entityType),
    };
  });
  const afterCov = coverage(enriched.filter((r) => ENRICHABLE_PACKS.has(r.pack)));
  const beforeEnrichableCov = coverage(all.filter((r) => ENRICHABLE_PACKS.has(r.pack)));

  // Prefer keeping rows in their original pack; group for rewrite
  const byPack = new Map(PACKS.map((p) => [p.slug, []]));
  for (const row of enriched) {
    if (!byPack.has(row.pack)) byPack.set(row.pack, []);
    byPack.get(row.pack).push(row);
  }

  const packCountsAfter = {};
  for (const pack of PACKS) {
    const rows = byPack.get(pack.slug) || [];
    packCountsAfter[pack.slug] = rows.length;
    const countChanged = rows.length !== packCountsBefore[pack.slug];
    const enrichable = ENRICHABLE_PACKS.has(pack.slug);
    // Leave curated early packs byte-stable when we only dropped their
    // duplicates from later packs. Enrich + rewrite batch 3/4/5.
    if (!enrichable && !countChanged) {
      console.log(`Skipped ${pack.slug}: unchanged (${rows.length})`);
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

  const report = {
    originalBaseline: 24077,
    before,
    after: enriched.length,
    removed: before - enriched.length,
    removedFromOriginal: 24077 - enriched.length,
    nightlifeRemoved: nightlife.removed.length,
    duplicateRemoved: removed.length,
    packCountsBefore,
    packCountsAfter,
    coverageBefore: beforeCov,
    coverageAfterAll: coverage(enriched),
    coverageEnrichableBefore: beforeEnrichableCov,
    coverageEnrichableAfter: afterCov,
    sampleClusters: samples.slice(0, 25),
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

main();
