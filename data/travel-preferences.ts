import {
  ACCESSIBILITY_NEEDS,
  INTERESTS,
  KOSHER_REQUIREMENTS,
  PACES,
  SHABBOS_REQUIREMENTS,
  type Pace,
} from "@/lib/trip-plan";

/**
 * WHAT THE SITE REMEMBERS ABOUT HOW SOMEBODY TRAVELS — and nothing else.
 *
 * A free account exists to save you saying the same things twice. Somebody who
 * keeps cholov yisroel, walks rather than drives, and needs a lift rather than
 * stairs has to say so on every trip they plan, and the site forgets it every
 * time. This is the memory that stops that.
 *
 * DURABLE, NEVER TRIP-SPECIFIC. That line is the whole design. Pace, interests,
 * kashrus, Shabbos, access, the kind of place you stay, how you get about —
 * these are true next year. Dates, a destination, who is coming and what this
 * one trip is for are NOT, and are deliberately absent: they belong to the trip
 * and live on it (lib/trip-plan.ts). A preference store that quietly absorbed
 * "Rome, June, four adults" would start answering next winter's questions with
 * last summer's trip.
 *
 * NOTHING IS LEARNED BY WATCHING. Every value here is one the traveller ticked
 * on a screen they can open, change and empty. Nothing is inferred from what
 * they searched, opened or said to the assistant — a passing question about
 * Rome is not a standing preference for Italy, and treating it as one is how
 * remembering turns into surveillance.
 *
 * AND EVERY VALUE IS FROM A FIXED LIST, WHICH IS A SECURITY PROPERTY, not
 * tidiness. These go into an assistant's prompt. If free text were stored here,
 * anything typed into this screen would reach a model as instructions —
 * cleanPreferences drops anything that is not one of the known options, so
 * there is no sentence to smuggle.
 *
 * Pure: what is kept, what is said, and what a bad value does can all be tested
 * without a store or a model.
 */

/** Where somebody would rather stay. Short, because a long list is a survey. */
export const LODGING_PREFERENCES: readonly string[] = [
  "Hotel",
  "Apartment with a kitchen",
  "Somewhere central",
  "Somewhere quiet",
  "Near a shul",
  "Whatever is best value",
] as const;

/** How somebody would rather get about once they are there. */
export const TRANSPORT_PREFERENCES: readonly string[] = [
  "Walking where possible",
  "A hire car",
  "A driver",
  "Public transport",
  "Taxis",
] as const;

export type TravelPreferences = {
  pace: Pace | "";
  interests: string[];
  kosher: string[];
  shabbos: string[];
  accessibility: string[];
  lodging: string[];
  transport: string[];
  /** When the traveller last changed these. Shown to them, never to a model. */
  updatedAt: string;
};

export function emptyPreferences(): TravelPreferences {
  return { pace: "", interests: [], kosher: [], shabbos: [], accessibility: [], lodging: [], transport: [], updatedAt: "" };
}

/** Every list a value may come from, in the order the screen shows them. */
export const PREFERENCE_GROUPS = [
  { key: "interests", label: "What you like doing", options: INTERESTS },
  { key: "kosher", label: "Kashrus", options: KOSHER_REQUIREMENTS },
  { key: "shabbos", label: "Shabbos", options: SHABBOS_REQUIREMENTS },
  { key: "lodging", label: "Where you stay", options: LODGING_PREFERENCES },
  { key: "transport", label: "Getting about", options: TRANSPORT_PREFERENCES },
  { key: "accessibility", label: "Access", options: ACCESSIBILITY_NEEDS },
] as const satisfies ReadonlyArray<{ key: keyof TravelPreferences; label: string; options: readonly string[] }>;

const PACE_VALUES = PACES.map((p) => p.value) as readonly string[];

function onlyKnown(value: unknown, options: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  // Deduped and capped: a repeated or endless list is not a preference.
  return [...new Set(value.filter((v): v is string => typeof v === "string" && options.includes(v)))].slice(0, options.length);
}

/**
 * Keep only what is genuinely one of the options.
 *
 * This is the boundary. Anything arriving from a browser passes through here
 * before it is stored, so the store cannot hold a sentence, and the assistant
 * cannot be handed one. A value that is not on a list is dropped silently
 * rather than rejected — there is no legitimate way for a browser to send one,
 * so it is a forgery, not a mistake to explain.
 */
export function cleanPreferences(input: unknown): TravelPreferences {
  const raw = (input ?? {}) as Record<string, unknown>;
  const pace = typeof raw.pace === "string" && PACE_VALUES.includes(raw.pace) ? (raw.pace as Pace) : "";
  return {
    pace,
    interests: onlyKnown(raw.interests, INTERESTS),
    kosher: onlyKnown(raw.kosher, KOSHER_REQUIREMENTS),
    shabbos: onlyKnown(raw.shabbos, SHABBOS_REQUIREMENTS),
    accessibility: onlyKnown(raw.accessibility, ACCESSIBILITY_NEEDS),
    lodging: onlyKnown(raw.lodging, LODGING_PREFERENCES),
    transport: onlyKnown(raw.transport, TRANSPORT_PREFERENCES),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  };
}

/** Whether anything is remembered at all. Decides if the account says so. */
export function hasAnything(prefs: TravelPreferences): boolean {
  return Boolean(
    prefs.pace ||
      prefs.interests.length ||
      prefs.kosher.length ||
      prefs.shabbos.length ||
      prefs.accessibility.length ||
      prefs.lodging.length ||
      prefs.transport.length,
  );
}

/**
 * EXACTLY WHAT AN ASSISTANT IS TOLD, and it is worth reading in full.
 *
 * One function, so "what does the AI know about me" has a single answer that
 * can be shown to the traveller word for word and asserted in a test. There is
 * no path from the store to a model that does not come through here.
 *
 * Note what is absent: no name, no email, no account id, no trip, no dates, no
 * history of anything asked before. The model is told how somebody likes to
 * travel and nothing about who they are.
 */
export function describeForAssistant(prefs: TravelPreferences): string {
  if (!hasAnything(prefs)) return "";
  const parts: string[] = [];
  const pace = PACES.find((p) => p.value === prefs.pace);
  if (pace && prefs.pace !== "unknown") parts.push(`Prefers a ${pace.label.toLowerCase()} pace.`);
  if (prefs.interests.length) parts.push(`Interested in: ${prefs.interests.join(", ")}.`);
  if (prefs.kosher.length) parts.push(`Kashrus: ${prefs.kosher.join(", ")}.`);
  if (prefs.shabbos.length) parts.push(`Shabbos: ${prefs.shabbos.join(", ")}.`);
  if (prefs.lodging.length) parts.push(`Where they stay: ${prefs.lodging.join(", ")}.`);
  if (prefs.transport.length) parts.push(`Getting about: ${prefs.transport.join(", ")}.`);
  if (prefs.accessibility.length) parts.push(`Access needs: ${prefs.accessibility.join(", ")}.`);
  return parts.join(" ");
}

/** The same thing in the traveller's own words, for the screen that shows it. */
export function summaryLines(prefs: TravelPreferences): string[] {
  return PREFERENCE_GROUPS.flatMap((group) => {
    const chosen = prefs[group.key] as string[];
    return chosen.length ? [`${group.label}: ${chosen.join(", ")}`] : [];
  }).concat(prefs.pace && prefs.pace !== "unknown" ? [`Pace: ${PACES.find((p) => p.value === prefs.pace)?.label ?? ""}`] : []);
}
