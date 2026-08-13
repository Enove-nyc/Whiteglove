#!/usr/bin/env node
// Checks every checked-in bulk-import candidate — currently ~24,000 rows
// across worldwide-batch-2 through -5 and the three white-glove-* batches —
// for duplicates against each other, using the exact same signals the app
// uses to flag one: prepareBulkContentCandidate's normalizedLocation, plus
// sourceId/sourceUrl identity. This runs entirely against the files in
// data/imports/ — no DATABASE_URL, no live Neon connection, so it cannot
// itself cost network transfer.
//
// This is the "thoroughly" check the review-queue narrowing (see
// tests/dedupe-queue-scan.test.ts) does NOT do at review time: the queue
// query only checks a new/edited candidate against the rest of the table,
// one at a time. It does not, and should not, sweep the whole table on every
// edit — that was the bug. A full sweep belongs here, run on demand, not on
// every keystroke in the admin.
//
// Usage: npx tsx scripts/audit-import-duplicates.mjs

import { BUILT_IN_CONTENT_IMPORT_PACKAGES } from "../data/imports/index.ts";
import { prepareBulkContentCandidate } from "../lib/bulk-content.ts";

const all = [];
for (const pack of BUILT_IN_CONTENT_IMPORT_PACKAGES) {
  for (const candidate of pack.candidates) {
    all.push({ batch: pack.batch.slug, prepared: prepareBulkContentCandidate(candidate) });
  }
}

console.log(`Checked ${all.length} candidates across ${BUILT_IN_CONTENT_IMPORT_PACKAGES.length} packs.`);

// Group by the two signals findBulkContentDuplicate treats as a match:
// normalizedLocation (name+city+country), and sourceId (case-insensitive)
// when both rows carry a real sourceId + matching normalized sourceUrl.
const byLocation = new Map();
const bySourceKey = new Map();

function normalizeSourceUrl(value) {
  const text = (value ?? "").trim();
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    url.hash = "";
    url.searchParams.sort();
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

for (const row of all) {
  const p = row.prepared;
  const locKey = p.normalizedLocation;
  if (!byLocation.has(locKey)) byLocation.set(locKey, []);
  byLocation.get(locKey).push(row);

  const sourceId = p.sourceId.trim().toLowerCase();
  const sourceUrl = normalizeSourceUrl(p.sourceUrl);
  if (sourceId && sourceUrl) {
    const key = `${sourceUrl}#${sourceId}`;
    if (!bySourceKey.has(key)) bySourceKey.set(key, []);
    bySourceKey.get(key).push(row);
  }
}

const locationDupes = [...byLocation.entries()].filter(([, rows]) => rows.length > 1);
const sourceDupes = [...bySourceKey.entries()].filter(([, rows]) => rows.length > 1);

console.log(`\nSame name + city + country (${locationDupes.length} groups, ${locationDupes.reduce((n, [, r]) => n + r.length, 0)} rows):`);
for (const [key, rows] of locationDupes.slice(0, 200)) {
  const [name, city, country] = key.split("|");
  console.log(`  "${name}" in ${city}, ${country} — ${rows.length}x: ${rows.map((r) => `${r.batch}/${r.prepared.name}`).join("  |  ")}`);
}
if (locationDupes.length > 200) console.log(`  ...and ${locationDupes.length - 200} more groups (truncated for output size).`);

console.log(`\nSame source URL + source ID (${sourceDupes.length} groups, ${sourceDupes.reduce((n, [, r]) => n + r.length, 0)} rows):`);
for (const [key, rows] of sourceDupes.slice(0, 200)) {
  console.log(`  ${key} — ${rows.length}x: ${rows.map((r) => `${r.batch}/${r.prepared.name}`).join("  |  ")}`);
}
if (sourceDupes.length > 200) console.log(`  ...and ${sourceDupes.length - 200} more groups (truncated for output size).`);

const totalDupeRows = new Set();
for (const [, rows] of locationDupes) rows.slice(1).forEach((r) => totalDupeRows.add(r));
for (const [, rows] of sourceDupes) rows.slice(1).forEach((r) => totalDupeRows.add(r));
console.log(`\n${totalDupeRows.size} rows would be flagged DUPLICATE of an earlier row if staged in this order.`);

process.exit(locationDupes.length + sourceDupes.length > 0 ? 1 : 0);
