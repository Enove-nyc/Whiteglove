/**
 * Strict duplicate collapse for kosher food review leads.
 *
 * Prefer drop over keep when two rows may be the same door: same address,
 * same website, same phone, same slug in the same town, or the same name
 * under a spelling / word-order / transliteration variant.
 */
import { kosherEateries } from "@/data/kosher-eateries";
import { normalizeSourceUrl } from "@/lib/bulk-content";
import { normalizeText, type KosherFoodCandidate } from "./schema";

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

const GENERIC_NAME_WORDS = new Set([
  "kosher",
  "glatt",
  "orthodox",
  "restaurants",
  "meals",
  "meal",
  "dining",
  "room",
  "community",
  "guest",
  "house",
  "guesthouse",
  "hotel",
  "the",
  "and",
  "of",
  "at",
  "in",
  "for",
  "a",
  "an",
]);

const ADDRESS_NOISE = new Set([
  "ul",
  "utca",
  "u",
  "str",
  "street",
  "st",
  "avenue",
  "ave",
  "road",
  "rd",
  "platz",
  "square",
  "floor",
  "1st",
  "2nd",
  "3rd",
  "hungary",
  "poland",
  "ukraine",
  "slovakia",
  "austria",
  "czech",
  "republic",
  "italia",
  "italy",
]);

export function nameCore(name: string, locality?: string, country?: string): string {
  const extra = new Set<string>();
  for (const part of [locality, country]) {
    if (!part) continue;
    for (const token of normalizeText(part).split(" ")) extra.add(token);
  }
  const tokens = normalizeText(name)
    .split(" ")
    .filter((token) => token && !GENERIC_NAME_WORDS.has(token) && !extra.has(token))
    .sort();
  return tokens.join(" ");
}

export function addressKey(address: string, locality: string, country: string): string {
  const drop = new Set([...ADDRESS_NOISE, ...normalizeText(locality).split(" "), ...normalizeText(country).split(" ")]);
  const tokens = normalizeText(address)
    .replace(/\b\d{5}(?:-\d{4})?\b/g, " ")
    .split(" ")
    .filter((token) => token && !drop.has(token));
  return tokens.join(" ");
}

function websiteKey(url: string | null | undefined): string {
  const normalized = normalizeSourceUrl(url);
  if (!normalized) return "";
  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/$/, "");
    // A certifier / community food index is a source, not a venue website.
    if (/\/food\/?$/.test(path) || path.includes("/find-kosher") || path.includes("/kosher-food")) return "";
    if (path.includes("/retail-establishments") || path.includes("/kosher-establishments") || path.includes("/restaurant-guide")) return "";
    if (path.includes("/kosher-dining") || path.endsWith("/restaurants")) return "";
    if (host === "jguideeurope.org" || host === "worldjewishtravel.org" || host.endsWith(".jewishgen.org")) return "";
    // A chain homepage is not a single door.
    if (!path) return "";
    return `${host}${path}`.toLocaleLowerCase("en");
  } catch {
    return "";
  }
}

function slugKey(slug: string, locality: string, country: string): string {
  return `${normalizeText(slug)}::${normalizeText(locality)}::${normalizeText(country)}`;
}

function namePlaceKey(name: string, locality: string, country: string): string {
  const core = nameCore(name, locality, country);
  if (!core) return "";
  return `${core}::${normalizeText(locality)}::${normalizeText(country)}`;
}

function bump(report: DedupeReport, drop: DedupeDrop) {
  report.dropped += 1;
  report.byReason[drop.reason] = (report.byReason[drop.reason] ?? 0) + 1;
  report.drops.push(drop);
}

function publicFinderKeys() {
  const names = new Set<string>();
  const addresses = new Set<string>();
  const websites = new Set<string>();
  const slugs = new Set<string>();
  for (const eatery of kosherEateries) {
    const nameKey = namePlaceKey(eatery.name, eatery.city, eatery.country);
    if (nameKey) names.add(nameKey);
    if (eatery.address) {
      const key = addressKey(eatery.address, eatery.city, eatery.country);
      if (key) addresses.add(`${key}::${normalizeText(eatery.city)}::${normalizeText(eatery.country)}`);
    }
    const web = websiteKey(eatery.website || eatery.sourceUrl);
    if (web) websites.add(web);
    slugs.add(slugKey(eatery.slug, eatery.city, eatery.country));
  }
  return { names, addresses, websites, slugs };
}

/**
 * Collapse a draft list. First occurrence wins. Uncertain same-door pairs are dropped.
 */
export function collapseKosherFoodDraft(draft: readonly KosherFoodCandidate[]): {
  kept: KosherFoodCandidate[];
  report: DedupeReport;
} {
  const report: DedupeReport = {
    drafted: draft.length,
    kept: 0,
    dropped: 0,
    byReason: {},
    drops: [],
  };
  const publicKeys = publicFinderKeys();
  const seenIds = new Set<string>();
  const seenNamePlace = new Map<string, KosherFoodCandidate>();
  const seenAddress = new Map<string, KosherFoodCandidate>();
  const seenWebsite = new Map<string, KosherFoodCandidate>();
  const seenSlug = new Map<string, KosherFoodCandidate>();
  const kept: KosherFoodCandidate[] = [];

  for (const row of draft) {
    if (seenIds.has(row.id)) {
      bump(report, {
        reason: "same-id",
        dropped: row.name,
        detail: row.id,
      });
      continue;
    }

    const nameKey = namePlaceKey(row.name, row.locality, row.country);
    const aliasKeys = row.aliases.map((alias) => namePlaceKey(alias, row.locality, row.country)).filter(Boolean);
    const addr = addressKey(row.address, row.locality, row.country);
    const addrKey = addr ? `${addr}::${normalizeText(row.locality)}::${normalizeText(row.country)}` : "";
    const web = websiteKey(row.website);
    const slug = slugKey(row.slug, row.locality, row.country);

    if (nameKey && publicKeys.names.has(nameKey)) {
      bump(report, {
        reason: "public-finder",
        dropped: row.name,
        detail: `${row.locality}, ${row.country}`,
      });
      continue;
    }
    if (addrKey && publicKeys.addresses.has(addrKey)) {
      bump(report, {
        reason: "public-finder-address",
        dropped: row.name,
        detail: row.address,
      });
      continue;
    }
    if (web && publicKeys.websites.has(web)) {
      bump(report, {
        reason: "public-finder-website",
        dropped: row.name,
        detail: row.website ?? "",
      });
      continue;
    }
    if (publicKeys.slugs.has(slug)) {
      bump(report, {
        reason: "public-finder-slug",
        dropped: row.name,
        detail: row.slug,
      });
      continue;
    }

    const nameHit = [nameKey, ...aliasKeys].map((key) => seenNamePlace.get(key)).find(Boolean);
    if (nameHit) {
      bump(report, {
        reason: "same-name",
        dropped: row.name,
        kept: nameHit.name,
        detail: `${row.locality}, ${row.country}`,
      });
      continue;
    }
    if (addrKey && seenAddress.has(addrKey)) {
      const prev = seenAddress.get(addrKey)!;
      bump(report, {
        reason: "same-address",
        dropped: row.name,
        kept: prev.name,
        detail: row.address,
      });
      continue;
    }
    if (web && seenWebsite.has(web)) {
      const prev = seenWebsite.get(web)!;
      bump(report, {
        reason: "same-website",
        dropped: row.name,
        kept: prev.name,
        detail: row.website ?? "",
      });
      continue;
    }
    if (seenSlug.has(slug)) {
      const prev = seenSlug.get(slug)!;
      bump(report, {
        reason: "same-slug",
        dropped: row.name,
        kept: prev.name,
        detail: row.slug,
      });
      continue;
    }

    seenIds.add(row.id);
    if (nameKey) seenNamePlace.set(nameKey, row);
    for (const key of aliasKeys) seenNamePlace.set(key, row);
    if (addrKey) seenAddress.set(addrKey, row);
    if (web) seenWebsite.set(web, row);
    seenSlug.set(slug, row);
    kept.push(row);
  }

  report.kept = kept.length;
  return { kept, report };
}

export function namePlaceKeyFor(name: string, city: string, country: string): string {
  return namePlaceKey(name, city, country);
}
