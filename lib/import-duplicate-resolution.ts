/**
 * How an editor resolves a flagged import duplicate.
 *
 * Fuzzy matching never merges. Keep-both records the pair so the same two
 * rows are not flagged again. Merge copies unique aliases onto the kept
 * record and marks the source as a duplicate — it does not delete either row.
 */

export type KeepBothEvidence = {
  keepBothWith?: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function keepBothIdsFromEvidence(evidence: unknown): string[] {
  const ids = asRecord(evidence).keepBothWith;
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0))];
}

export function recordKeepBoth(evidence: unknown, otherId: string): KeepBothEvidence & Record<string, unknown> {
  const current = asRecord(evidence);
  const ids = keepBothIdsFromEvidence(evidence);
  if (!ids.includes(otherId)) ids.push(otherId);
  return { ...current, keepBothWith: ids };
}

/** Keep-both pairs survive an editor save that rewrites source evidence. */
export function mergeKeepBothEvidence(existing: unknown, incoming: unknown): unknown {
  const base = incoming === undefined || incoming === null ? existing : incoming;
  let result = base;
  for (const id of keepBothIdsFromEvidence(existing)) {
    result = recordKeepBoth(result, id);
  }
  return result;
}

export function uniqueAliases(existing: readonly string[], incoming: readonly string[]): string[] {
  const seen = new Set(existing.map((alias) => alias.trim().toLocaleLowerCase("en")).filter(Boolean));
  const out = existing.map((alias) => alias.trim()).filter(Boolean);
  for (const alias of incoming) {
    const trimmed = alias.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase("en");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function notesWithAliases(notes: string | null | undefined, aliases: readonly string[]): string {
  const extra = aliases.filter(Boolean);
  if (extra.length === 0) return (notes ?? "").trim();
  const line = `Also known as: ${extra.join(", ")}.`;
  const current = (notes ?? "").trim();
  if (current.includes(line)) return current;
  return current ? `${current}\n\n${line}` : line;
}

export function noteListWithAliases(notes: readonly string[] | null | undefined, aliases: readonly string[]): string[] {
  const extra = aliases.filter(Boolean);
  const current = [...(notes ?? [])];
  if (extra.length === 0) return current;
  const line = `Also known as: ${extra.join(", ")}.`;
  if (current.some((note) => note.includes(line))) return current;
  return [...current, line];
}

export function parseDuplicateTarget(duplicateOf: string | null | undefined): { kind: string; key: string } | null {
  const value = duplicateOf?.trim();
  if (!value) return null;
  const match = value.match(/^(candidate|attraction|stay|place|food):(.+)$/);
  if (match) return { kind: match[1], key: match[2] };
  return { kind: "candidate", key: value };
}
