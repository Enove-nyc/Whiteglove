/**
 * Prove there is not a single overlapping listing across every import pack.
 *
 * Checks every candidate against every other one, on all of:
 *   - slug, sourceId, dedupeKey collisions
 *   - exact name in the same place
 *   - soft name in the same place (Attraction vs Practical, "X" vs "X framing")
 *   - alias overlap in the same place
 *   - street address (numeric) shared by two listings of the same kind
 *   - identical name in one country under two city labels
 *   - near-duplicate pairs the pack dedupe matcher would still merge
 *
 * Usage: node scripts/audit-import-duplicates.mjs [--json]
 * Exit code 1 when any overlap remains.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const AS_JSON = process.argv.includes("--json");

const engine = await import(path.join(ROOT, "scripts", "dedupe-enrich-imports.mjs"));

const {
  parseTsCandidates,
  parseJsonPack,
  PACKS,
  IMPORTS,
  placeKey,
  metroPlaceKey,
  shouldMerge,
  normalizeText,
} = engine;

/** Mirrors softListingName in lib/bulk-content.ts. */
function softListingName(name) {
  return normalizeText(name)
    .replace(/\bheritage walking corridor\b/g, "heritage corridor")
    .replace(/\bcommunity heritage corridor\b/g, "heritage corridor")
    .replace(/\bjewish community heritage corridor\b/g, "jewish heritage corridor")
    .replace(/\bjewish visitor heritage orientation\b/g, "jewish visitor orientation")
    .replace(/\bjewish community visitor orientation\b/g, "jewish visitor orientation")
    .replace(/\bvisitor heritage orientation\b/g, "visitor orientation")
    .replace(/\bcommunity visitor orientation\b/g, "visitor orientation")
    .replace(/\bstaying near historic center\b/g, "staying near city center")
    .replace(/\bstaying near city(?! center)\b/g, "staying near city center")
    .replace(
      /\b(framing|daytime|courtyard|outdoor|approach|orientation|historic|visitor resource|tradition site|listing|candidate|stub|placeholder|exterior|walking|metro)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

/** Mirrors softLocationKey in lib/bulk-content.ts. */
function softLocationKey(name, city, country) {
  let soft = softListingName(name);
  if (!soft) return "";
  const cityNorm = normalizeText(city);
  for (const token of cityNorm.split(" ").filter((part) => part.length >= 3)) {
    soft = soft.replace(new RegExp(`(^|\\s)${token}(\\s|$)`, "g"), " ");
  }
  soft = soft
    .replace(/\bjewish community heritage corridor\b/g, "jewish heritage corridor")
    .replace(/\bcommunity heritage corridor\b/g, "heritage corridor")
    .replace(/\bjewish visitor heritage orientation\b/g, "jewish visitor orientation")
    .replace(/\bjewish community visitor orientation\b/g, "jewish visitor orientation")
    .replace(/\bvisitor heritage orientation\b/g, "visitor orientation")
    .replace(/\bcommunity visitor orientation\b/g, "visitor orientation")
    .replace(/\bstaying near\b/g, "stay")
    .replace(/\bcity center\b/g, "center")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((token, index, parts) => token && token !== parts[index - 1])
    .join(" ");
  if (!soft) return "";
  return `${soft}|${cityNorm}|${normalizeText(country)}`;
}

export function loadAllCandidates() {
  const rows = [];
  for (const pack of PACKS) {
    const dir = path.join(IMPORTS, pack.slug);
    const parsed =
      pack.kind === "json"
        ? parseJsonPack(dir, pack.slug)
        : parseTsCandidates(path.join(dir, "candidates.ts"), pack.slug);
    rows.push(...parsed);
  }
  return rows;
}

function describe(row) {
  return `[${row.pack}] ${row.name} (${row.entityType || row.importKind}) — ${row.locality || row.city}, ${row.country}`;
}

function groupOverlaps(rows, keyOf) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([key, members]) => ({ key, members: members.map(describe) }));
}

export function auditImportDuplicates(rows = loadAllCandidates()) {
  const findings = {};

  findings.slug = groupOverlaps(rows, (row) => (row.slug ? `${row.pack}:${row.slug}` : ""));
  findings.sourceId = groupOverlaps(rows, (row) => (row.sourceId ? normalizeText(row.sourceId) : ""));
  findings.dedupeKey = groupOverlaps(rows, (row) => (row.dedupeKey ? normalizeText(row.dedupeKey) : ""));

  findings.exactNameInPlace = groupOverlaps(rows, (row) =>
    normalizeText(row.name) ? `${normalizeText(row.name)}::${placeKey(row)}` : "",
  );
  findings.softNameInPlace = groupOverlaps(rows, (row) =>
    softLocationKey(row.name, row.locality || row.city || "", row.country || ""),
  );
  findings.exactNameInMetro = groupOverlaps(rows, (row) =>
    normalizeText(row.name) ? `${normalizeText(row.name)}::${metroPlaceKey(row)}` : "",
  );

  // An alias must not name a different listing in the same place. The city name
  // itself is not a signal — a destination row is named after its city and other
  // rows there legitimately carry the city as an alias.
  const byName = new Map();
  for (const row of rows) {
    const key = `${softListingName(row.name)}::${placeKey(row)}`;
    if (!byName.has(key)) byName.set(key, row);
  }
  findings.aliasOverlap = [];
  for (const row of rows) {
    const place = placeKey(row);
    const cityName = softListingName(row.locality || row.city || "");
    for (const alias of row.aliases || []) {
      const soft = softListingName(alias);
      if (!soft || soft.length < 5) continue;
      if (soft === cityName) continue;
      if (soft === softListingName(row.name)) continue;
      const owner = byName.get(`${soft}::${place}`);
      if (owner && owner !== row) {
        findings.aliasOverlap.push({ key: `${soft}::${place}`, members: [describe(owner), describe(row)] });
      }
    }
  }

  // Two listings of the same kind sharing one street address are the same door.
  findings.sharedStreetAddress = groupOverlaps(rows, (row) => {
    const address = row.address || "";
    if (!/\d/.test(address)) return "";
    const normalized = normalizeText(address);
    if (normalized.length < 12) return "";
    return `${normalized}::${row.entityType || row.importKind}`;
  });

  // Anything the pack dedupe matcher would still collapse.
  findings.nearDuplicatePairs = [];
  const byPlace = new Map();
  for (const row of rows) {
    const key = metroPlaceKey(row);
    if (!byPlace.has(key)) byPlace.set(key, []);
    byPlace.get(key).push(row);
  }
  for (const [key, members] of byPlace) {
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (shouldMerge(members[i], members[j])) {
          findings.nearDuplicatePairs.push({ key, members: [describe(members[i]), describe(members[j])] });
        }
      }
    }
  }

  const totals = Object.fromEntries(Object.entries(findings).map(([name, list]) => [name, list.length]));
  const overlaps = Object.values(totals).reduce((sum, count) => sum + count, 0);

  // Reported, never failed: one name can belong to two real places in different
  // cities (Grant Park in Chicago and Atlanta, Forest Park in Portland and
  // St. Louis). Collapsing those would delete a listing the traveller needs.
  const sameNameDifferentCity = groupOverlaps(rows, (row) =>
    normalizeText(row.name) ? `${normalizeText(row.name)}::${normalizeText(row.country)}` : "",
  ).filter((group) => new Set(group.members.map((member) => member.split("—")[1])).size > 1);

  return {
    total: rows.length,
    places: byPlace.size,
    totals,
    overlaps,
    findings,
    sameNameDifferentCity,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = loadAllCandidates();
  const result = auditImportDuplicates(rows);
  if (AS_JSON) {
    fs.writeFileSync(path.join(ROOT, "scripts", "_import-duplicate-audit.json"), JSON.stringify(result, null, 2) + "\n");
  }
  console.log(`Checked ${result.total} listings across ${result.places} places.`);
  for (const [check, count] of Object.entries(result.totals)) {
    console.log(`  ${check}: ${count}`);
  }
  console.log(`  (same name in two different cities, kept on purpose: ${result.sameNameDifferentCity.length})`);
  if (result.overlaps === 0) {
    console.log("No overlapping listings.");
  } else {
    console.log("\nOverlaps found:");
    for (const [check, list] of Object.entries(result.findings)) {
      for (const group of list) {
        console.log(`\n${check} — ${group.key}`);
        for (const member of group.members) console.log(`  - ${member}`);
      }
    }
    process.exitCode = 1;
  }
}
