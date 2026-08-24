import { emptySmartImportResult, type ImportedItem, type ImportedItemKind, type SmartImportResult } from "@/data/smart-import";

/**
 * The pure half of Smart Import: turning the model's raw (and untrusted) JSON
 * text into a validated result. No network call, no server-only API — kept
 * separate from lib/smart-import.ts (which does both and is server-only) so
 * this half can be imported directly by a test, the same split
 * lib/companion-trip.ts (pure) keeps from lib/companion-build.ts (fetches).
 *
 * NEVER INVENTS A FIELD. The extraction prompt asks the model not to, and
 * this is where that is actually enforced in code: a bad kind, a date that
 * isn't YYYY-MM-DD, a time that isn't HH:MM, is dropped rather than guessed
 * at or passed through.
 */

const KINDS: ImportedItemKind[] = ["flight", "lodging", "activity"];

function clip(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function clipDate(v: unknown): string | undefined {
  const t = clip(v, 10);
  return t && DATE_RE.test(t) ? t : undefined;
}

function clipTime(v: unknown): string | undefined {
  const t = clip(v, 5);
  return t && TIME_RE.test(t) ? t : undefined;
}

let seq = 0;
function nextId(): string {
  seq += 1;
  return `si${Date.now().toString(36)}${seq}`;
}

export function parseModelJson(raw: string): SmartImportResult {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return emptySmartImportResult();
  let data: unknown;
  try {
    data = JSON.parse(match[0]);
  } catch {
    return emptySmartImportResult();
  }
  if (!data || typeof data !== "object") return emptySmartImportResult();
  const rawItems = Array.isArray((data as { items?: unknown }).items) ? (data as { items: unknown[] }).items : [];
  const rawWarnings = Array.isArray((data as { warnings?: unknown }).warnings) ? (data as { warnings: unknown[] }).warnings : [];

  const items: ImportedItem[] = [];
  for (const entry of rawItems.slice(0, 25)) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const kind = KINDS.includes(e.kind as ImportedItemKind) ? (e.kind as ImportedItemKind) : null;
    if (!kind) continue;
    const item: ImportedItem = {
      id: nextId(),
      kind,
      airline: clip(e.airline, 60),
      flightNo: clip(e.flightNo, 20),
      from: clip(e.from, 80),
      to: clip(e.to, 80),
      date: clipDate(e.date),
      departTime: clipTime(e.departTime),
      arriveTime: clipTime(e.arriveTime),
      arriveDate: clipDate(e.arriveDate),
      name: clip(e.name, 160),
      address: clip(e.address, 300),
      phone: clip(e.phone, 40),
      checkIn: clipDate(e.checkIn),
      checkOut: clipDate(e.checkOut),
      confirmation: clip(e.confirmation, 60),
      notes: clip(e.notes, 500),
      sourceExcerpt: clip(e.sourceExcerpt, 300),
    };
    // A row with nothing recognizable in it is not worth showing.
    if (Object.values(item).filter((v) => v !== undefined && v !== item.id && v !== item.kind).length === 0) continue;
    items.push(item);
  }

  const warnings = rawWarnings
    .map((w) => clip(w, 200))
    .filter((w): w is string => Boolean(w))
    .slice(0, 10);

  return { items, warnings };
}
