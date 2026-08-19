/**
 * The day-suggestion answer, read back into stops a traveller can add.
 *
 * The planner asks the model for one place per line — "- Name — why" — so this
 * pulls the name off the front of each bullet and keeps the reason as a note.
 * It is deliberately forgiving: anything it cannot make sense of is left out,
 * and if nothing parses the planner still shows the model's prose as before.
 * The traveller adds a suggestion; nothing is placed on the day for them, and
 * no time is invented — which is the line this site does not cross.
 *
 * It lives here rather than in the route so it can be tested without pulling
 * next/server in behind it — the reason the route's own logic keeps escaping
 * its tests.
 */
export type DayStop = { name: string; note?: string };

export function parseDayStops(text: string): DayStop[] {
  const out: DayStop[] = [];
  const seen = new Set<string>();
  for (const rawLine of text.split("\n")) {
    const bullet = rawLine.trim().match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (!bullet) continue;
    const body = bullet[1].replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").trim();
    const split = body.match(/^(.+?)(?:\s+[—–-]\s+|:\s+)(.*)$/);
    const name = (split ? split[1] : body).trim().replace(/[.,;:]+$/, "");
    const note = split ? split[2].trim().replace(/\s+/g, " ") : undefined;
    const key = name.toLowerCase();
    if (name.length < 2 || name.length > 80 || seen.has(key)) continue;
    seen.add(key);
    out.push(note ? { name, note } : { name });
    if (out.length >= 6) break;
  }
  return out;
}
