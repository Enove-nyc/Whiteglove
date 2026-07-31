import { BUILT_IN_CROSSINGS, type BuiltInCrossing } from "@/data/border-crossings";

/**
 * What the site knows about a border crossing, and what it refuses to guess.
 *
 * lib/borders.ts already noticed when a route crosses a border and said "allow
 * several hours". That sentence came from one rule — the two countries are on
 * different sides of the Schengen edge — and nothing else. It could not say
 * WHICH crossing, could not be corrected when a crossing shut, and could not
 * be improved by the one person who actually rings ahead.
 *
 * This is the data behind it. The crossings themselves ship with the site
 * because they do not move. Everything that moves — how long it is taking, and
 * whether it is open at all — is blank until somebody checks it and writes it
 * down, and the site says so in those words rather than inventing a number.
 *
 * A STALE CHECK IS WORSE THAN NO CHECK, so a check has a date on it and stops
 * being quoted as current after a month. "Two hours, checked in March" tells
 * somebody planning in August nothing useful and sounds like it does.
 */

/** What somebody found when they checked. Nothing here is ever assumed. */
export type CrossingState = "open" | "slow" | "closed";

export const CROSSING_STATES: CrossingState[] = ["open", "slow", "closed"];

export const STATE_WORDS: Record<CrossingState, { short: string; sentence: string }> = {
  open: { short: "Open", sentence: "was open and moving" },
  slow: { short: "Slow", sentence: "was open but queueing" },
  closed: { short: "Closed", sentence: "was closed" },
};

/** How long a check is worth quoting as current. */
export const STALE_AFTER_DAYS = 30;

/** What the owner has recorded on top of a crossing, or a crossing they added. */
export type StoredCrossing = {
  id: string;
  /** Only on one the owner added; a built-in crossing keeps its own. */
  countries?: [string, string];
  name?: string;
  towns?: [string, string];
  road?: string;
  coaches?: boolean;
  pedestrians?: boolean;
  note?: string;
  /** What it was like when somebody looked. */
  state?: CrossingState;
  /** In their own words — "about two hours for a coach, less at night". */
  wait?: string;
  /**
   * The same thing as a number, because the planner has to add it up.
   *
   * Separate from the words on purpose: "about two hours for a coach, less
   * before six" is what a traveller needs to read, and no amount of parsing
   * turns it into a figure the arithmetic can trust. Absent means the planner
   * falls back to a stated allowance rather than guessing at the sentence.
   */
  waitMinutes?: number;
  /** YYYY-MM-DD. Without this the state above is not shown at all. */
  checkedAt?: string;
  /** Taken out of the list without deleting what was learned about it. */
  hidden?: boolean;
};

export type Crossing = BuiltInCrossing & {
  state?: CrossingState;
  wait?: string;
  waitMinutes?: number;
  checkedAt?: string;
  hidden?: boolean;
  /** True when it is not one of the ones that ship with the site. */
  added?: boolean;
};

/** Countries compare without case or stray spacing; nothing else is normalised. */
function fold(country: string): string {
  return country.trim().toLowerCase();
}

/**
 * The unordered pair, as one string.
 *
 * Poland→Ukraine and Ukraine→Poland are one border. Storing them as two would
 * mean checking a crossing in one direction and not the other, which is not a
 * thing that happens at a barrier.
 */
export function borderKey(a: string, b: string): string {
  return [fold(a), fold(b)].sort().join("|");
}

/**
 * Built-in crossings with the owner's record laid over them.
 *
 * Stored fields win where they are set, so the owner can rename a crossing or
 * correct a road without the built-in list arguing back. An id nobody ships is
 * a crossing they added themselves, and needs its countries and towns from the
 * stored record — one missing those is dropped rather than shown half-formed.
 */
export function mergeCrossings(built: BuiltInCrossing[], stored: StoredCrossing[]): Crossing[] {
  const overlay = new Map(stored.map((row) => [row.id, row]));
  const out: Crossing[] = [];

  for (const crossing of built) {
    const over = overlay.get(crossing.id);
    overlay.delete(crossing.id);
    out.push({
      ...crossing,
      ...(over?.name ? { name: over.name } : {}),
      ...(over?.towns ? { towns: over.towns } : {}),
      ...(over?.road !== undefined ? { road: over.road } : {}),
      ...(over?.coaches !== undefined ? { coaches: over.coaches } : {}),
      ...(over?.pedestrians !== undefined ? { pedestrians: over.pedestrians } : {}),
      ...(over?.note !== undefined ? { note: over.note } : {}),
      state: over?.state,
      wait: over?.wait,
      waitMinutes: over?.waitMinutes,
      checkedAt: over?.checkedAt,
      hidden: over?.hidden,
    });
  }

  for (const row of overlay.values()) {
    if (!row.countries || !row.name || !row.towns) continue;
    out.push({
      id: row.id,
      countries: row.countries,
      name: row.name,
      towns: row.towns,
      road: row.road,
      coaches: row.coaches,
      pedestrians: row.pedestrians,
      note: row.note,
      state: row.state,
      wait: row.wait,
      waitMinutes: row.waitMinutes,
      checkedAt: row.checkedAt,
      hidden: row.hidden,
      added: true,
    });
  }

  return out;
}

/** Everything the site ships, with nothing recorded on it. */
export function builtInCrossings(): Crossing[] {
  return mergeCrossings(BUILT_IN_CROSSINGS, []);
}

/** Days between two YYYY-MM-DD dates, or null when either is unusable. */
export function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/**
 * Whether a check is still worth quoting, and how to say when it was.
 *
 * A check from the future is treated as today's rather than refused: a
 * mistyped year should not silently drop the only information there is.
 */
export function checkAge(checkedAt: string | undefined, today: string): {
  checked: boolean;
  fresh: boolean;
  says: string;
} {
  if (!checkedAt) return { checked: false, fresh: false, says: "Nobody has checked this one." };
  const days = daysBetween(checkedAt, today);
  if (days === null) return { checked: false, fresh: false, says: "Nobody has checked this one." };
  if (days <= 0) return { checked: true, fresh: true, says: "Checked today." };
  if (days === 1) return { checked: true, fresh: true, says: "Checked yesterday." };
  if (days <= STALE_AFTER_DAYS) return { checked: true, fresh: true, says: `Checked ${days} days ago.` };
  if (days < 365) return { checked: true, fresh: false, says: `Last checked ${Math.round(days / 30)} months ago.` };
  return { checked: true, fresh: false, says: `Last checked on ${checkedAt}.` };
}

/** The crossings on one border, the ones that ought to be tried first at the top. */
export function crossingsBetween(from: string, to: string, all: Crossing[], today: string): Crossing[] {
  const key = borderKey(from, to);
  return all
    .filter((crossing) => !crossing.hidden && borderKey(crossing.countries[0], crossing.countries[1]) === key)
    .sort((a, b) => rank(a, today) - rank(b, today) || a.name.localeCompare(b.name));
}

/**
 * Which to offer first.
 *
 * Known and usable, then unknown, then known and unusable:
 *
 *   found open → found queueing → nobody looked (coaches first) → found shut
 *
 * Queueing sits above unchecked on purpose. Three hours at Korczowa is a real
 * answer somebody can plan around; "nobody has looked at Budomierz" is not,
 * however hopeful it sounds. Shut goes last for the same reason it is not
 * hidden — it has to be visible, and it must not be the first thing tried.
 *
 * A stale check counts as nobody having looked. That is the whole point of
 * putting a date on one.
 */
function rank(crossing: Crossing, today: string): number {
  const age = checkAge(crossing.checkedAt, today);
  if (!age.fresh || !crossing.state) return crossing.coaches ? 2 : 3;
  if (crossing.state === "open") return 0;
  if (crossing.state === "slow") return 1;
  return 4;
}

/** How a crossing reads in a list: what it is, and what is known about it. */
export function describeCrossing(crossing: Crossing, today: string): string {
  const age = checkAge(crossing.checkedAt, today);
  const parts: string[] = [];
  if (crossing.road) parts.push(`On the ${crossing.road}.`);
  if (crossing.note) parts.push(crossing.note);
  if (age.fresh && crossing.state) {
    const wait = crossing.wait?.trim();
    parts.push(`It ${STATE_WORDS[crossing.state].sentence}${wait ? ` — ${wait}` : ""}. ${age.says}`);
  } else if (age.checked) {
    // Say when, and do not repeat what it said. A month-old queue length is
    // the kind of number somebody plans a day around.
    parts.push(`${age.says} Worth checking again before you rely on it.`);
  } else {
    parts.push(age.says);
  }
  return parts.join(" ");
}

export type BorderAdvice = {
  from: string;
  to: string;
  /** True when it leaves or enters the Schengen area — the ones that queue. */
  major: boolean;
  /** The crossings on this border, best first. Empty when none are recorded. */
  crossings: Crossing[];
  /** The first line, which is true whether or not anything has been checked. */
  headline: string;
  /** Present only when somebody has actually checked something recently. */
  latest?: string;
};

/**
 * What to tell somebody about this border.
 *
 * The headline never depends on the store: a crossing takes time whether or
 * not anybody has looked at it this week, and that sentence has to survive
 * Redis being away. Anything checked is added after it, attributed to when it
 * was checked.
 */
export function borderAdvice(input: {
  from: string;
  to: string;
  major: boolean;
  all: Crossing[];
  today: string;
}): BorderAdvice {
  const crossings = crossingsBetween(input.from, input.to, input.all, input.today);
  const headline = input.major
    ? "This is an external EU border — allow several hours, and more at the end of a week or around a yom tov. Passports for everyone travelling."
    : "Normally drive-through, but carry passports.";

  const checked = crossings.filter((crossing) => checkAge(crossing.checkedAt, input.today).fresh && crossing.state);
  let latest: string | undefined;
  if (checked.length) {
    const open = checked.filter((crossing) => crossing.state === "open");
    const shut = checked.filter((crossing) => crossing.state === "closed");
    if (open.length) {
      latest = `${open[0].name} ${STATE_WORDS.open.sentence} when it was last checked${open[0].wait ? ` — ${open[0].wait}` : ""}.`;
    } else if (shut.length === checked.length) {
      latest = `Every crossing checked on this border was closed. Do not plan a day around it without ringing first.`;
    } else {
      const slow = checked.find((crossing) => crossing.state === "slow");
      if (slow) latest = `${slow.name} was queueing when it was last checked${slow.wait ? ` — ${slow.wait}` : ""}.`;
    }
  }

  return { from: input.from, to: input.to, major: input.major, crossings, headline, latest };
}

/**
 * Is this admin entry usable?
 *
 * A check with no date is the one that must not get through: it would be shown
 * as current forever, which is the failure this whole file exists to avoid.
 */
export function crossingProblem(input: {
  name?: string;
  countries?: [string, string];
  towns?: [string, string];
  state?: CrossingState | "";
  checkedAt?: string;
  added?: boolean;
}): string | null {
  if (input.added) {
    if (!input.name?.trim()) return "Give the crossing a name — the two towns is how people say it.";
    if (!input.countries?.[0]?.trim() || !input.countries?.[1]?.trim()) return "Say which two countries it joins.";
    if (fold(input.countries[0]) === fold(input.countries[1])) return "Those are the same country — a border needs two.";
    if (!input.towns?.[0]?.trim() || !input.towns?.[1]?.trim()) return "Say which town is on each side.";
  }
  if (input.state && !input.checkedAt?.trim()) {
    return "Put the date you checked it. Without one it would be shown as current forever.";
  }
  if (input.checkedAt?.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(input.checkedAt.trim())) {
    return "That date does not look right.";
  }
  return null;
}

/** An id from a name, for a crossing the owner adds. */
export function crossingIdFrom(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Every border the crossings cover, for the admin list. */
export function bordersCovered(all: Crossing[]): Array<{ key: string; countries: [string, string]; crossings: Crossing[] }> {
  const groups = new Map<string, { key: string; countries: [string, string]; crossings: Crossing[] }>();
  for (const crossing of all) {
    const key = borderKey(crossing.countries[0], crossing.countries[1]);
    const found = groups.get(key);
    if (found) found.crossings.push(crossing);
    else groups.set(key, { key, countries: crossing.countries, crossings: [crossing] });
  }
  return [...groups.values()].sort((a, b) => a.countries.join().localeCompare(b.countries.join()));
}

/**
 * The borders with nothing checked on them recently.
 *
 * The point of the admin screen is knowing where to look next, and a list of
 * thirty crossings does not answer that on its own.
 */
export function bordersNeedingACheck(all: Crossing[], today: string): string[] {
  return bordersCovered(all)
    .filter((group) =>
      group.crossings.every((crossing) => crossing.hidden || !checkAge(crossing.checkedAt, today).fresh),
    )
    .map((group) => `${group.countries[0]} – ${group.countries[1]}`);
}
