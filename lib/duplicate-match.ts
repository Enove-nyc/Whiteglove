/**
 * Conservative near-duplicate signals for admin review.
 *
 * Nothing here deletes or merges. A match is a warning for the editor.
 */

const HONORIFICS = /\b(ha-?rav|harav|rabbi|rebbe|rav|reb|r)\b\.?/g;

const TOWN_VARIANTS: Record<string, string> = {
  lizhensk: "lezajsk",
  lezajsk: "lezajsk",
  lizensk: "lezajsk",
  belz: "belz",
  belzec: "belz",
  sannikov: "sanz",
  sanz: "sanz",
  nowysacz: "sanz",
  "nowy sacz": "sanz",
  uman: "uman",
  humann: "uman",
};

export function foldMarks(value: string): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0591-\u05C7]/g, "");
}

export function normalizePersonName(value: string): string {
  return foldMarks(value)
    .toLocaleLowerCase("en")
    .replace(/['’`]/g, "")
    .replace(/[-–—]/g, " ")
    .replace(HONORIFICS, " ")
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeTownName(value: string): string {
  const folded = normalizePersonName(value);
  return TOWN_VARIANTS[folded] ?? folded;
}

function nameTokensMatch(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (left === right) return true;
  const a = left.split(" ").filter(Boolean);
  const b = right.split(" ").filter(Boolean);
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length > 0 && short.every((token) => long.includes(token));
}

export function normalizePhone(value: string): string {
  const digits = (value ?? "").replace(/\D+/g, "");
  return digits.replace(/^00/, "").replace(/^0/, "");
}

export function parseCoordinates(value: string | null | undefined): { lat: number; lng: number } | null {
  if (!value) return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Rough metres between two WGS84 points. Good enough for "same doorway". */
export function metresBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export type DuplicateRecord = {
  id: string;
  name: string;
  aliases?: string[];
  city?: string;
  country?: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  sourceUrl?: string | null;
  coordinates?: string | null;
};

export type NearDuplicateHit = {
  id: string;
  confidence: "exact" | "likely" | "possible";
  matched: string[];
};

export function findNearDuplicates(candidate: DuplicateRecord, existing: readonly DuplicateRecord[]): NearDuplicateHit[] {
  const hits: NearDuplicateHit[] = [];
  const candidateNames = new Set(
    [candidate.name, ...(candidate.aliases ?? [])].map(normalizePersonName).filter(Boolean),
  );
  const candidateTown = normalizeTownName(candidate.city ?? "");
  const candidateCountry = normalizePersonName(candidate.country ?? "");
  const candidatePhone = normalizePhone(candidate.phone ?? "");
  const candidateCoords = parseCoordinates(candidate.coordinates ?? "");
  const candidateUrl = (candidate.website || candidate.sourceUrl || "").trim().replace(/\/$/, "").toLocaleLowerCase("en");

  for (const item of existing) {
    if (item.id === candidate.id) continue;
    const matched: string[] = [];
    const names = new Set([item.name, ...(item.aliases ?? [])].map(normalizePersonName).filter(Boolean));
    const sameName = [...candidateNames].some((left) => [...names].some((right) => nameTokensMatch(left, right)));
    if (sameName) matched.push("name");
    if (candidateTown && candidateTown === normalizeTownName(item.city ?? "")) matched.push("town");
    if (candidateCountry && candidateCountry === normalizePersonName(item.country ?? "")) matched.push("country");
    if (candidatePhone && candidatePhone === normalizePhone(item.phone ?? "")) matched.push("phone");
    const itemUrl = (item.website || item.sourceUrl || "").trim().replace(/\/$/, "").toLocaleLowerCase("en");
    if (candidateUrl && itemUrl && candidateUrl === itemUrl) matched.push("url");
    const itemCoords = parseCoordinates(item.coordinates ?? "");
    if (candidateCoords && itemCoords && metresBetween(candidateCoords, itemCoords) <= 75) matched.push("coordinates");

    if (matched.includes("url") || (matched.includes("name") && matched.includes("town") && matched.includes("country"))) {
      hits.push({ id: item.id, confidence: matched.includes("url") || matched.includes("phone") ? "exact" : "likely", matched });
      continue;
    }
    if (matched.includes("coordinates") && matched.includes("name")) {
      hits.push({ id: item.id, confidence: "likely", matched });
      continue;
    }
    if (matched.includes("name") && (matched.includes("town") || matched.includes("coordinates") || matched.includes("phone"))) {
      hits.push({ id: item.id, confidence: "possible", matched });
    }
  }
  return hits;
}
