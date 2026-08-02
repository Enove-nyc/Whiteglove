/**
 * The owner's figures for the route planner, on top of the built-in ones.
 *
 * Same shape as the airports and the border crossings: data/planner-assumptions.ts
 * is the built-in set, readable and impossible to damage from a form, and what
 * the owner saves is merged over it. Anything he has not touched keeps the
 * built-in figure, so this can never end up with half a set of numbers.
 *
 * WHAT MAKES THIS DIFFERENT FROM A SCREEN OF SLIDERS is the refusals and the
 * worked example. A number here does not change a label — it changes whether a
 * traveller is told his day is over-packed or wide open, and a wrong one is
 * invisible until somebody plans a day around it and arrives after the kever
 * has shut. So a figure that would break the arithmetic is refused by name, and
 * the screen shows what the numbers as typed make of three real legs before
 * anything is saved.
 */

import { estimateTravelMinutes, formatDuration, kmBetween } from "@/data/itinerary";
import { bandFor, BUILT_IN_ASSUMPTIONS, clockToMins, type PlannerAssumptions, usableDayHours } from "@/data/planner-assumptions";

/** What is kept in the store: only what the owner actually changed. */
export type StoredAssumptions = Partial<PlannerAssumptions>;

const NUMBER_KEYS = [
  "stopMins",
  "keverMins",
  "detourFactor",
  "transferMins",
  "townKmh",
  "ruralKmh",
  "regionalKmh",
  "motorwayKmh",
  "freeHoursWorthMentioning",
  "gapHoursWorthMentioning",
] as const satisfies readonly (keyof PlannerAssumptions)[];

const TIME_KEYS = ["dayStart", "dayEnd", "lateFinish"] as const satisfies readonly (keyof PlannerAssumptions)[];

/**
 * The built-in figures with the owner's on top.
 *
 * A stored value that is not a usable number or clock time is DROPPED rather
 * than used: a corrupted store must cost the owner his change, never leave the
 * planner dividing by a speed of zero on every trip on the site.
 */
export function mergeAssumptions(stored: StoredAssumptions | null | undefined): PlannerAssumptions {
  const merged: PlannerAssumptions = { ...BUILT_IN_ASSUMPTIONS };
  if (!stored || typeof stored !== "object") return merged;
  for (const key of NUMBER_KEYS) {
    const value = stored[key];
    if (typeof value === "number" && Number.isFinite(value)) merged[key] = value;
  }
  for (const key of TIME_KEYS) {
    const value = stored[key];
    if (typeof value === "string" && clockToMins(value) !== null) merged[key] = value.trim();
  }
  return merged;
}

/** Only what differs from the built-in set, so the store holds decisions. */
export function onlyChanges(a: PlannerAssumptions): StoredAssumptions {
  const out: StoredAssumptions = {};
  for (const key of [...NUMBER_KEYS, ...TIME_KEYS]) {
    if (a[key] !== BUILT_IN_ASSUMPTIONS[key]) Object.assign(out, { [key]: a[key] });
  }
  return out;
}

/* ---- what cannot be saved ----------------------------------------------- */

const MIN_DAY_HOURS = 4;
/** The Polish A4 runs at 140. Nothing on these routes is faster. */
const FASTEST_ROAD_KMH = 140;

/**
 * Why these figures cannot be saved, or null.
 *
 * Each refusal names the consequence rather than the rule, because the person
 * reading it is trying to fix a trip and not to pass validation.
 */
export function assumptionProblem(a: PlannerAssumptions): string | null {
  const start = clockToMins(a.dayStart);
  const end = clockToMins(a.dayEnd);
  const late = clockToMins(a.lateFinish);
  if (start === null) return "The day’s start is a clock time, like 08:00.";
  if (end === null) return "The day’s end is a clock time, like 22:00.";
  if (late === null) return "The late-finish time is a clock time, like 21:00.";
  if (end <= start) return "The day ends before it begins. Check the two times.";
  if (end - start < MIN_DAY_HOURS * 60) {
    return `A planning day of under ${MIN_DAY_HOURS} hours would call almost every day over-packed. Give the traveller a longer day, or leave it as it was.`;
  }
  if (late < start) return "The late-finish time is before the day starts, so every day would be called a late finish.";

  for (const [key, label] of [
    ["stopMins", "A stop"],
    ["keverMins", "A beis hachaim"],
  ] as const) {
    const mins = a[key];
    if (!(mins > 0)) return `${label} that takes no time is one the planner will pack a day full of. Give it a length in minutes.`;
    if (mins > end - start) return `${label} longer than the whole day would make every single day over-packed.`;
  }

  if (!(a.detourFactor >= 1)) return "A road cannot be shorter than the straight line between its ends. The road allowance is 1 or more.";
  if (a.detourFactor > 3) return "Roads three times the straight-line distance would put hours on every leg. Something between 1.2 and 1.6 is usual.";
  if (a.transferMins < 0) return "Time added per leg cannot be negative — that would make the drive shorter the more legs there are.";
  if (a.transferMins > 120) return "Two hours added to every leg, including the five-minute one across town, would make short days look impossible.";

  const speeds = [
    ["townKmh", "the town speed"],
    ["ruralKmh", "the back-road speed"],
    ["regionalKmh", "the cross-country speed"],
    ["motorwayKmh", "the motorway speed"],
  ] as const;
  for (const [key, label] of speeds) {
    if (!(a[key] > 0)) return `A speed of zero for ${label} means a drive that never ends. Give it a real speed.`;
    if (a[key] > FASTEST_ROAD_KMH) return `${FASTEST_ROAD_KMH} km/h is the fastest road on these routes, and ${label} is set above it.`;
  }
  for (let i = 1; i < speeds.length; i += 1) {
    const [slowerKey, slowerLabel] = speeds[i - 1];
    const [fasterKey, fasterLabel] = speeds[i];
    if (a[slowerKey] > a[fasterKey]) {
      // Bands are picked by leg length, so an inverted pair makes a long drive
      // come out quicker than a short one. Nobody means that; it is a typo.
      return `${slowerLabel} is higher than ${fasterLabel}, which would make a long drive come out quicker than a short one. Check the order.`;
    }
  }

  const dayHours = (end - start) / 60;
  if (a.freeHoursWorthMentioning < 0 || a.gapHoursWorthMentioning < 0) return "Hours cannot be negative.";
  if (a.freeHoursWorthMentioning > dayHours) {
    return `A day only has ${Math.round(dayHours * 10) / 10} hours, so “room for another stop” would never appear. Set it below the length of the day.`;
  }
  if (a.gapHoursWorthMentioning > dayHours) {
    return `A gap longer than the day itself can never happen, so the notice would never appear.`;
  }
  return null;
}

/* ---- what each figure is, and what it changes --------------------------- */

export type FieldGroup = "day" | "stops" | "driving" | "notices";

export type AssumptionField = {
  key: keyof PlannerAssumptions;
  group: FieldGroup;
  label: string;
  /** What moves on the traveller's screen when this moves. */
  changes: string;
  kind: "time" | "number";
  step?: number;
  unit?: string;
};

export const GROUPS: Array<{ id: FieldGroup; title: string; note: string }> = [
  {
    id: "day",
    title: "How long a day is",
    note: "Everything the planner says about a day being full or free is measured against this. It is the figure most worth getting right for the way your travellers actually move — a group that davens before it drives and wants to be off the road before maariv does not have a fourteen-hour day.",
  },
  {
    id: "stops",
    title: "How long a stop takes",
    note: "Used only when the traveller has not put a length on the stop himself. A beis hachaim is separate because it is the one kind of stop the trip records — it is set when the stop came from our directory — and the one whose length is least like the others.",
  },
  {
    id: "driving",
    title: "How fast the driving goes",
    note: "The fallback estimate, used when a real road time could not be fetched. Deliberately cautious: a figure that runs long costs a traveller nothing, and one that runs short hands him hours that do not exist and a kever he reaches after it has shut. If you know these roads, you know better than the estimate does.",
  },
  {
    id: "notices",
    title: "When the planner speaks up",
    note: "How much empty time it takes before the planner offers to fill it. Lower numbers mean more suggestions.",
  },
];

export const FIELDS: AssumptionField[] = [
  { key: "dayStart", group: "day", kind: "time", label: "A day starts at", changes: "Where the first stop is timed from, and the arrival time of everything after it." },
  { key: "dayEnd", group: "day", kind: "time", label: "A day ends at", changes: "The length of the day everything is measured against — the free hours, and whether a day is called over-packed." },
  { key: "lateFinish", group: "day", kind: "time", label: "Finishing after this is late", changes: "When the planner says a day finishes later than most kevarim and hotels expect." },

  { key: "stopMins", group: "stops", kind: "number", unit: "minutes", step: 5, label: "A stop, when nobody has said", changes: "How much of the day each untimed stop is counted as using." },
  { key: "keverMins", group: "stops", kind: "number", unit: "minutes", step: 5, label: "A beis hachaim, when nobody has said", changes: "The same, for a stop taken from our kever directory." },

  { key: "detourFactor", group: "driving", kind: "number", step: 0.05, label: "Roads are longer than the straight line by", changes: "Every estimated distance, and so every estimated driving time." },
  { key: "transferMins", group: "driving", kind: "number", unit: "minutes", step: 5, label: "Parking and getting going, per leg", changes: "A fixed amount added to every leg of every day." },
  { key: "townKmh", group: "driving", kind: "number", unit: "km/h", step: 1, label: "Across a town (under 5 km)", changes: "Short hops between stops in the same place." },
  { key: "ruralKmh", group: "driving", kind: "number", unit: "km/h", step: 1, label: "Back roads (under 25 km)", changes: "The drive between two neighbouring shtetlach." },
  { key: "regionalKmh", group: "driving", kind: "number", unit: "km/h", step: 1, label: "Cross-country (under 100 km)", changes: "Most of a day's driving on a kever trip." },
  { key: "motorwayKmh", group: "driving", kind: "number", unit: "km/h", step: 1, label: "Motorway (over 100 km)", changes: "The long legs — Kraków to Lizhensk, Lizhensk to Uman." },

  { key: "freeHoursWorthMentioning", group: "notices", kind: "number", unit: "hours", step: 0.5, label: "Free hours before offering another stop", changes: "When a day is told it has room for something else." },
  { key: "gapHoursWorthMentioning", group: "notices", kind: "number", unit: "hours", step: 0.5, label: "A gap worth pointing out", changes: "When an empty stretch between two timed stops is mentioned." },
];

/* ---- what the numbers make of a real day -------------------------------- */

/**
 * Four legs this site actually sends people on, with real coordinates — ONE FOR
 * EACH SPEED BAND, so every driving figure on the screen visibly moves a row.
 *
 * Not an invented example. Changing the motorway speed and watching
 * Lizhensk → Uman move is the only way to see what a figure does before a
 * traveller finds out the hard way.
 */
const REAL_LEGS: Array<{ label: string; from: string; to: string }> = [
  { label: "Across Kraków — Kazimierz to Płaszów", from: "50.0512,19.9448", to: "50.0293,19.9750" },
  { label: "Kraków to the airport (KRK)", from: "50.0512,19.9448", to: "50.0777,19.7848" },
  { label: "Lizhensk to Rzeszów", from: "50.2622,22.4204", to: "50.0413,21.9990" },
  { label: "Lizhensk to Uman", from: "50.2622,22.4204", to: "48.7500,30.2200" },
];

export type ExampleLeg = { label: string; km: number; says: string; band: string };

/** What these figures make of the four legs, for the screen. */
export function workedExample(a: PlannerAssumptions): ExampleLeg[] {
  return REAL_LEGS.map(({ label, from, to }) => {
    const km = kmBetween(from, to) ?? 0;
    const mins = estimateTravelMinutes(km, a);
    return {
      label,
      km: Math.round(km),
      says: mins === null ? "—" : (formatDuration(mins) ?? "—"),
      // Read from the same list the arithmetic uses, so a row cannot be
      // labelled with a band it is not actually driven at — and so a changed
      // road allowance visibly moves a leg from one band into the next.
      band: bandFor(km, a).label,
    };
  });
}

/** The one-line version of the day these figures describe. */
export function describeDay(a: PlannerAssumptions): string {
  const hours = usableDayHours(a);
  const stop = formatDuration(a.stopMins) ?? `${a.stopMins} min`;
  const kever = formatDuration(a.keverMins) ?? `${a.keverMins} min`;
  const same = a.stopMins === a.keverMins;
  return (
    `A day runs ${a.dayStart} to ${a.dayEnd} — ${hours} hours. ` +
    (same
      ? `A stop nobody has timed takes ${stop}, a beis hachaim included.`
      : `A stop nobody has timed takes ${stop}; a beis hachaim takes ${kever}.`)
  );
}

/**
 * Which figures are no longer the built-in ones.
 *
 * Shown on the screen so it is obvious at a glance what has been decided here
 * and what is simply the figure the site shipped with.
 */
export function changedFields(a: PlannerAssumptions): AssumptionField[] {
  return FIELDS.filter((f) => a[f.key] !== BUILT_IN_ASSUMPTIONS[f.key]);
}
