/**
 * Strict duplicate collapse for Nesiya Tova heritage / practical leads.
 * Prefer drop over a second row for the same door.
 */
import { normalizeText, type CandidateEntityType, type CandidateDraftRow } from "./schema";

export type DedupeDrop = {
  reason: string;
  dropped: string;
  kept?: string;
  detail: string;
};

export type DedupeReport = {
  drafted: number;
  kept: number;
  dropped: number;
  byReason: Record<string, number>;
  drops: DedupeDrop[];
};

const ADDRESS_NOISE = new Set([
  "ul",
  "utca",
  "u",
  "str",
  "street",
  "st",
  "road",
  "rd",
  "cesta",
  "bez",
  "nazvu",
  "unnamed",
  "hungary",
  "poland",
  "ukraine",
  "slovakia",
  "romania",
  "israel",
  "germany",
]);

const GENERIC_NAME_BITS = new Set([
  "beis",
  "hachaim",
  "beit",
  "chaim",
  "cemetery",
  "jewish",
  "new",
  "old",
  "mikvah",
  "mikveh",
  "hachnasas",
  "orchim",
  "guest",
  "house",
]);

export function addressKey(address: string, locality?: string, country?: string): string {
  const extra = new Set(
    [locality, country].flatMap((value) => normalizeText(value ?? "").split(" ")).filter(Boolean),
  );
  const tokens = normalizeText(address)
    .split(" ")
    .filter((token) => token && !ADDRESS_NOISE.has(token) && !extra.has(token));
  return tokens.join(" ");
}

export function namePlaceKeyFor(name: string, locality: string, country: string): string {
  const core = normalizeText(name)
    .split(" ")
    .filter((token) => token && !GENERIC_NAME_BITS.has(token) && token !== normalizeText(locality))
    .join(" ");
  if (!core) return "";
  return `${core}::${normalizeText(locality)}::${normalizeText(country)}`;
}

export function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "";
  return digits.replace(/^00/, "").replace(/^0/, "");
}

export function coordKey(coordinates: string | null | undefined): string {
  if (!coordinates?.trim()) return "";
  const [lat, lng] = coordinates.split(",").map((part) => Number(part.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

export type ExistingPlace = {
  name: string;
  city: string;
  country: string;
  address?: string | null;
  coordinates?: string | null;
  phone?: string | null;
  kind?: CandidateEntityType | "any";
};

function recordDrop(
  report: DedupeReport,
  reason: string,
  dropped: CandidateDraftRow,
  kept?: string,
  detail = "",
) {
  report.dropped += 1;
  report.byReason[reason] = (report.byReason[reason] ?? 0) + 1;
  report.drops.push({
    reason,
    dropped: `${dropped.listingLabel}: ${dropped.name} (${dropped.locality})`,
    kept,
    detail,
  });
}

export function collapseHeritageDrafts(
  drafts: readonly CandidateDraftRow[],
  existing: readonly ExistingPlace[],
): { kept: CandidateDraftRow[]; report: DedupeReport } {
  const report: DedupeReport = { drafted: drafts.length, kept: 0, dropped: 0, byReason: {}, drops: [] };
  const kept: CandidateDraftRow[] = [];
  const ids = new Set<string>();
  const keys = new Set<string>();
  const addresses = new Set<string>();
  const coords = new Set<string>();
  const phones = new Set<string>();
  const namePlaces = new Set<string>();

  const typed = (kind: string | undefined, value: string) => `${kind ?? "any"}::${value}`;

  for (const place of existing) {
    const kind = place.kind ?? "any";
    const addr = place.address ? addressKey(place.address, place.city, place.country) : "";
    if (addr) addresses.add(typed(kind, `${addr}::${normalizeText(place.city)}::${normalizeText(place.country)}`));
    const coord = coordKey(place.coordinates ?? null);
    if (coord) coords.add(typed(kind, coord));
    if (place.phone) {
      const key = phoneKey(place.phone);
      if (key) phones.add(typed(kind, key));
    }
    const nameKey = namePlaceKeyFor(place.name, place.city, place.country);
    if (nameKey) namePlaces.add(typed(kind, nameKey));
    keys.add(typed(kind, `${normalizeText(place.name)}::${normalizeText(place.city)}::${normalizeText(place.country)}`));
  }

  for (const draft of drafts) {
    const kind = draft.entityType;
    const id = `${draft.entityType}-${draft.slug}`;
    if (ids.has(id)) {
      recordDrop(report, "same-id", draft, undefined, id);
      continue;
    }
    const placeKey = typed(kind, `${normalizeText(draft.name)}::${normalizeText(draft.locality)}::${normalizeText(draft.country)}`);
    if (keys.has(placeKey)) {
      recordDrop(report, "same-name-place", draft, undefined, placeKey);
      continue;
    }
    const addr = addressKey(draft.address, draft.locality, draft.country);
    const addrKey = addr ? typed(kind, `${addr}::${normalizeText(draft.locality)}::${normalizeText(draft.country)}`) : "";
    if (addrKey && addresses.has(addrKey)) {
      recordDrop(report, "same-address", draft, undefined, addrKey);
      continue;
    }
    const coord = coordKey(draft.coordinates);
    const coordTyped = coord ? typed(kind, coord) : "";
    if (coordTyped && coords.has(coordTyped)) {
      recordDrop(report, "same-coordinates", draft, undefined, coordTyped);
      continue;
    }
    const nameKey = namePlaceKeyFor(draft.name, draft.locality, draft.country);
    const nameTyped = nameKey ? typed(kind, nameKey) : "";
    if (nameTyped && namePlaces.has(nameTyped)) {
      recordDrop(report, "same-name-core", draft, undefined, nameTyped);
      continue;
    }
    const draftPhones = draft.phones.map(phoneKey).filter(Boolean);
    const phoneHit = draftPhones.find((phone) => phones.has(typed(kind, phone)));
    if (phoneHit) {
      recordDrop(report, "same-phone", draft, undefined, phoneHit);
      continue;
    }

    ids.add(id);
    keys.add(placeKey);
    if (addrKey) addresses.add(addrKey);
    if (coordTyped) coords.add(coordTyped);
    if (nameTyped) namePlaces.add(nameTyped);
    for (const phone of draftPhones) phones.add(typed(kind, phone));
    kept.push(draft);
  }

  report.kept = kept.length;
  return { kept, report };
}
