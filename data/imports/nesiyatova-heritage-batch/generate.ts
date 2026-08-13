/**
 * Build the Nesiya Tova heritage / practical NEEDS_REVIEW pack from the
 * public mkmphone feed. Does not publish.
 *
 *   npx tsx data/imports/nesiyatova-heritage-batch/generate.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cemeteries } from "../../cemeteries";
import { practicalContent } from "../../practical-content";
import { isValidCoordinates } from "../../../lib/bulk-content";
import { collapseHeritageDrafts, type ExistingPlace } from "./dedupe";
import {
  type CandidateDraftRow,
  type CandidateEntityType,
  type ImportKind,
  type ListingLabel,
} from "./schema";

const here = dirname(fileURLToPath(import.meta.url));
const RAW_PATH = join(here, "_raw-mkmphone.json");
const DRAFTS_PATH = join(here, "_drafts.json");
const COUNTS_PATH = join(here, "_counts.json");
const API_URL = "https://api.nesiyatova.com/api/mkmphone";

const WANTED = new Set([1, 4, 7]);

const COUNTRY_ALIAS: Record<string, string> = {
  "The United States Of America": "United States",
  Latvija: "Latvia",
  Czechia: "Czech Republic",
};

const TITLE_ALIAS: Record<string, string> = {
  "בית החיים": "Beis hachaim",
  "בית החיים החדש": "New beis hachaim",
  "בית החיים הישן": "Old beis hachaim",
  "בית החיים א": "Beis hachaim A",
  "בית החיים ב": "Beis hachaim B",
  "בית החיים ג": "Beis hachaim C",
  מקוה: "Mikvah",
  מקווה: "Mikvah",
  "הכנסת אורחים": "Hachnasas orchim",
  "הכנסת אורחים - מלא": "Hachnasas orchim",
  "הכנסת אורחים מלא": "Hachnasas orchim",
};

type RawPlace = {
  id: number;
  categoryId: number;
  poi?: string;
  mkmTitle?: string;
  info?: string;
  sInfo?: string;
  streetName?: string;
  streetNumber?: string;
  cityE?: string;
  stateE?: string;
};

function extractPhones(...blobs: Array<string | undefined>): string[] {
  const found: string[] = [];
  for (const blob of blobs) {
    if (!blob) continue;
    const matches = blob.match(/\+?\d[\d\s()./-]{7,24}\d/g) ?? [];
    for (const match of matches) {
      const digits = match.replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 15) continue;
      if (/^(19|20)\d{2}$/.test(digits)) continue;
      found.push(match.replace(/\s+/g, " ").trim());
    }
  }
  return [...new Set(found)];
}

function englishLabel(categoryId: number, title: string): string {
  const trimmed = title.replace(/\s+/g, " ").trim();
  if (TITLE_ALIAS[trimmed]) return TITLE_ALIAS[trimmed];
  if (/[A-Za-z]/.test(trimmed)) return trimmed;
  if (categoryId === 7) return "Mikvah";
  if (categoryId === 4) return "Hachnasas orchim";
  return "Beis hachaim";
}

function kindFor(categoryId: number): {
  entityType: CandidateEntityType;
  importKind: ImportKind;
  category: string;
  listingLabel: ListingLabel;
} {
  if (categoryId === 7) {
    return { entityType: "mikvah", importKind: "PRACTICAL", category: "MIKVAH", listingLabel: "Mikvah" };
  }
  if (categoryId === 4) {
    return {
      entityType: "hachnasas_orchim",
      importKind: "PRACTICAL",
      category: "ACCOMMODATION",
      listingLabel: "Hachnasas orchim",
    };
  }
  return {
    entityType: "beis_hachaim",
    importKind: "ATTRACTION",
    category: "Beis hachaim",
    listingLabel: "Beis hachaim",
  };
}

function listingUrl(mkmId: number): string {
  return `https://app.nesiyatova.com/category-detail/?MkmId=${mkmId}`;
}

function existingPlaces(): ExistingPlace[] {
  const out: ExistingPlace[] = [];
  for (const cemetery of cemeteries) {
    out.push({
      name: cemetery.name,
      city: cemetery.city,
      country: cemetery.country,
      address: cemetery.address,
      coordinates: cemetery.coordinates,
      kind: "beis_hachaim",
    });
    for (const contact of cemetery.accessContacts ?? []) {
      if (contact.phone) {
        out.push({
          name: cemetery.name,
          city: cemetery.city,
          country: cemetery.country,
          phone: contact.phone,
          kind: "beis_hachaim",
        });
      }
    }
    for (const place of cemetery.places ?? []) {
      if (place.category !== "MIKVAH" && place.category !== "ACCOMMODATION") continue;
      out.push({
        name: place.name,
        city: cemetery.city,
        country: cemetery.country,
        address: place.address,
        coordinates: place.coordinates,
        phone: place.phone,
        kind: place.category === "MIKVAH" ? "mikvah" : "hachnasas_orchim",
      });
    }
  }
  for (const content of Object.values(practicalContent)) {
    for (const place of content.places ?? []) {
      if (place.category !== "MIKVAH" && place.category !== "ACCOMMODATION") continue;
      out.push({
        name: place.name,
        city: "",
        country: "",
        address: place.address,
        coordinates: place.coordinates,
        phone: place.phone,
        kind: place.category === "MIKVAH" ? "mikvah" : "hachnasas_orchim",
      });
    }
  }
  return out;
}

function toDraft(row: RawPlace): CandidateDraftRow | null {
  const city = (row.cityE ?? "").trim();
  const country = COUNTRY_ALIAS[(row.stateE ?? "").trim()] ?? (row.stateE ?? "").trim();
  const title = (row.mkmTitle ?? "").replace(/\s+/g, " ").trim();
  if (!city || !country || !title || !WANTED.has(row.categoryId)) return null;
  const kind = kindFor(row.categoryId);
  const label = englishLabel(row.categoryId, title);
  const street = [row.streetName, row.streetNumber].map((part) => part?.trim()).filter(Boolean).join(" ");
  const name = street && label.toLocaleLowerCase("en").includes(city.toLocaleLowerCase("en")) === false
    ? `${label}, ${city}`
    : `${label}, ${city}`;
  const distinguished = street ? `${label}, ${street}, ${city}` : name;
  const phones = extractPhones(row.sInfo, row.info);
  const rawCoordinates = row.poi?.trim() || null;
  const coordinates = rawCoordinates && isValidCoordinates(rawCoordinates) ? rawCoordinates : null;
  const address = [street, city, country].filter(Boolean).join(", ");
  const aliases = [...new Set([title, distinguished, name])];
  const keywords = [
    kind.listingLabel.toLocaleLowerCase("en"),
    city,
    country,
    kind.entityType.replace(/_/g, " "),
  ];
  const phoneNote = phones.length
    ? "Nesiya Tova lists a contact number — confirm it before publishing."
    : "Confirm access before publishing.";
  const summary = `${distinguished} in ${country} — ${kind.listingLabel.toLocaleLowerCase("en")} for heritage travel. ${phoneNote}`;
  return {
    market: `${normalizeCountrySlug(country)}-${normalizeCountrySlug(city)}`,
    entityType: kind.entityType,
    importKind: kind.importKind,
    category: kind.category,
    listingLabel: kind.listingLabel,
    slug: `nt-${row.categoryId}-${row.id}`,
    name: distinguished,
    aliases,
    keywords,
    locality: city,
    destination: city,
    country,
    address,
    summary,
    coordinates,
    website: null,
    listingSourceUrl: listingUrl(row.id),
    phones,
    nesiyatovaMkmId: row.id,
    sourceKey: "nesiyatova",
  };
}

function normalizeCountrySlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "place";
}

async function loadRaw(): Promise<RawPlace[]> {
  if (existsSync(RAW_PATH)) {
    return JSON.parse(readFileSync(RAW_PATH, "utf8")) as RawPlace[];
  }
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error(`Nesiya Tova mkmphone returned ${response.status}`);
  const data = (await response.json()) as RawPlace[];
  writeFileSync(RAW_PATH, JSON.stringify(data));
  return data;
}

async function main() {
  const raw = await loadRaw();
  const drafted = raw.map(toDraft).filter((row): row is CandidateDraftRow => Boolean(row));
  const { kept, report } = collapseHeritageDrafts(drafted, existingPlaces());
  writeFileSync(DRAFTS_PATH, `${JSON.stringify(kept)}\n`);
  writeFileSync(
    COUNTS_PATH,
    `${JSON.stringify(
      {
        raw: raw.length,
        wanted: drafted.length,
        drafted: report.drafted,
        kept: report.kept,
        dropped: report.dropped,
        byReason: report.byReason,
        byLabel: Object.fromEntries(
          [...kept.reduce((map, row) => map.set(row.listingLabel, (map.get(row.listingLabel) ?? 0) + 1), new Map<string, number>())].sort(),
        ),
        withPhones: kept.filter((row) => row.phones.length > 0).length,
        published: 0,
      },
      null,
      2,
    )}\n`,
  );
  console.log(JSON.stringify({ kept: kept.length, dropped: report.dropped, byReason: report.byReason, published: 0 }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
