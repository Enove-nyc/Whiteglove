/**
 * What the site can honestly say about a vacation destination.
 *
 * THE TWO THINGS A KOSHER TRAVELER ASKS FIRST, before the beaches and the
 * museums, are "what will we eat" and "what happens on Shabbos". Every travel
 * site answers the first with a list of restaurants it copied from somewhere
 * and the second not at all.
 *
 * So both answers here are COMPUTED from what the site actually holds — the
 * quarters in data/kosher-stays.ts with their published anchors, the stays and
 * their `kosherClaim` and seasons, the eateries and their hechsher states, the
 * attractions and their Shabbos notes. Nothing in data/vacation-destinations.ts
 * asserts either one, and nothing here invents a level for a destination whose
 * cities match nothing: that comes out as "not checked yet", which is the true
 * answer and the one a traveler can act on.
 *
 * WHY A QUARTER IS THE STRONGEST SIGNAL FOR SHABBOS. The `kosherAreas` records
 * are not marketing — each is a real quarter with a published coordinate for
 * the shul or street it is measured from, and the note on each says what is
 * within walking distance of it. "There is a Jewish quarter with shuls and
 * kosher shops in it, here is where" is a fact about Shabbos that a hotel star
 * rating is not.
 *
 * WHY THE ALPINE CASE HAS ITS OWN LEVEL. The single most useful sentence this
 * site can say about a mountain holiday is that the scenery is in the valley
 * and the butcher is two hours away in the nearest city. `kosherBase` on a
 * destination names that city; this reads what is on record there and says so
 * plainly rather than reporting the valley as having nothing.
 *
 * Everything below is pure and takes its data as arguments, so the same
 * functions serve the page (which reads through lib/attractions-view.ts, and
 * therefore sees anything the owner has added) and the tests (which pass the
 * built-in files).
 */

import type { Season, TripTheme, VacationDestination } from "@/data/vacation-destinations";

/* ---- the shapes this needs, and no more --------------------------------- */
//
// Structural rather than imported concretely, so both the built-in data files
// and the owner-augmented lists from lib/attractions-view.ts fit without a
// cast, and so a test can hand in three objects.

export type AttractionLike = {
  slug: string;
  name: string;
  city: string;
  country: string;
  kind: string;
  summary: string;
  shabbos?: string;
};

export type StayLike = {
  slug: string;
  name: string;
  city: string;
  country: string;
  kind: string;
  summary: string;
  season?: string;
  kosherClaim: "none" | "reported" | "confirmed";
  anchor: { name: string; coordinates: string };
};

export type EateryLike = {
  slug: string;
  name: string;
  city: string;
  country: string;
  kind: string;
  diet: string;
  summary: string;
  hechsher: { state: "certified" | "reported" | "none" | "unverified" };
};

export type AreaLike = {
  slug: string;
  city: string;
  country: string;
  name: string;
  note: string;
  /**
   * The quarter's own published position — the shul or the street it is
   * measured from, not a guess at the middle of the city. It is what a live
   * kosher lookup on a destination page is centred on, which is why an
   * approximate one would be worse than none.
   */
  coordinates: string;
};

export type VacationSources = {
  attractions: readonly AttractionLike[];
  stays: readonly StayLike[];
  eateries: readonly EateryLike[];
  areas: readonly AreaLike[];
};

export const NO_SOURCES: VacationSources = { attractions: [], stays: [], eateries: [], areas: [] };

/** Everything on record for one destination, and for the town it shops in. */
export type VacationFacts = {
  attractions: AttractionLike[];
  stays: StayLike[];
  eateries: EateryLike[];
  areas: AreaLike[];
  /** The kosherBase town's own listings, when the destination names one. */
  base: { cities: string[]; note: string; stays: StayLike[]; eateries: EateryLike[]; areas: AreaLike[] } | null;
};

function inCities<T extends { city: string }>(items: readonly T[], cities: readonly string[]): T[] {
  const wanted = new Set(cities);
  return items.filter((item) => wanted.has(item.city));
}

export function factsFor(destination: VacationDestination, sources: VacationSources): VacationFacts {
  const base = destination.kosherBase
    ? {
        cities: [...destination.kosherBase.cities],
        note: destination.kosherBase.note,
        stays: inCities(sources.stays, destination.kosherBase.cities),
        eateries: inCities(sources.eateries, destination.kosherBase.cities),
        areas: inCities(sources.areas, destination.kosherBase.cities),
      }
    : null;
  return {
    attractions: inCities(sources.attractions, destination.cities),
    stays: inCities(sources.stays, destination.cities),
    eateries: inCities(sources.eateries, destination.cities),
    areas: inCities(sources.areas, destination.cities),
    base,
  };
}

/* ---- the two indicators -------------------------------------------------- */

export type SignalTone = "good" | "workable" | "plan" | "unknown";

export type Signal<L extends string> = {
  level: L;
  /** Short, for the card. */
  label: string;
  /**
   * Never colour alone. The card puts a glyph beside the label so the level
   * survives a screen that cannot separate the greens from the ambers.
   */
  glyph: string;
  tone: SignalTone;
  /** The sentence under it, and the accessible name of the whole indicator. */
  detail: string;
};

export type KosherLevel = "in-town" | "from-a-base" | "not-checked";
export type ShabbosLevel = "walkable-quarter" | "seasonal" | "arrange-ahead" | "not-checked";

function count(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * What we hold about kosher food where you are going.
 *
 * Phrased throughout as what is ON RECORD HERE, not as what exists in the
 * town. The site holding nothing about Merano is a fact about the site; the
 * page must not turn it into a claim about Merano, and must not turn one
 * listing into "great kosher food".
 */
export function kosherAvailability(destination: VacationDestination, facts: VacationFacts): Signal<KosherLevel> {
  const listings = facts.eateries.length;
  const quarters = facts.areas.length;

  if (listings > 0 || quarters > 0) {
    const parts: string[] = [];
    if (listings) parts.push(`${count(listings, "kosher food listing")}`);
    if (quarters) parts.push(`${count(quarters, "Jewish quarter", "Jewish quarters")} on record`);
    return {
      level: "in-town",
      label: "Kosher food in town",
      glyph: "●",
      tone: "good",
      detail: `${parts.join(" and ")} in ${destination.name}. Check each listing's own source close to your dates — restaurants change hands and hechsherim lapse.`,
    };
  }

  if (facts.base && (facts.base.eateries.length > 0 || facts.base.areas.length > 0)) {
    return {
      level: "from-a-base",
      label: "Bring it in from a base",
      glyph: "◐",
      tone: "workable",
      detail: `Nothing on record in ${destination.name} itself. ${facts.base.note}`,
    };
  }

  return {
    level: "not-checked",
    label: "Not checked yet",
    glyph: "○",
    tone: "unknown",
    detail: `We do not yet hold kosher food listings for ${destination.name}. Ask us and we will find out what is there before you book.`,
  };
}

/**
 * Whether Shabbos works without a car.
 *
 * The order matters and is deliberately pessimistic. A quarter beats a hotel:
 * a seasonal kosher hotel that is not running the week you arrive gets you a
 * room and nothing to eat, and that failure is exactly what the season field
 * in data/kosher-stays.ts exists to prevent.
 */
export function shabbosPracticality(destination: VacationDestination, facts: VacationFacts): Signal<ShabbosLevel> {
  if (facts.areas.length > 0) {
    const named = facts.areas[0];
    return {
      level: "walkable-quarter",
      label: "Walkable quarter",
      glyph: "●",
      tone: "good",
      detail: `${named.name} — a quarter with the shul and the kosher provision in it, so Shabbos does not need a car. Staying inside it is the whole trick.`,
    };
  }

  const seasonal = facts.stays.filter((stay) => Boolean(stay.season));
  if (seasonal.length > 0 && seasonal.length === facts.stays.filter((s) => s.kosherClaim !== "none").length) {
    return {
      level: "seasonal",
      label: "Seasonal kosher programme",
      glyph: "◐",
      tone: "workable",
      detail: `The kosher provision here runs in season only (${seasonal[0].season}). Turning up outside it gets you a room and nothing to eat — confirm the dates before booking anything else.`,
    };
  }

  if (facts.stays.length > 0 || facts.base) {
    return {
      level: "arrange-ahead",
      label: "Arrange Shabbos ahead",
      glyph: "◐",
      tone: "plan",
      detail: `No walkable Jewish quarter on record in ${destination.name}. Food and davening are arrangeable here, and they have to be arranged before you travel rather than found when you arrive.`,
    };
  }

  return {
    level: "not-checked",
    label: "Not checked yet",
    glyph: "○",
    tone: "unknown",
    detail: `We have not yet checked what Shabbos looks like in ${destination.name}. Ask us before you plan a Friday around it.`,
  };
}

/* ---- the card ------------------------------------------------------------ */

export type VacationCardModel = {
  destination: VacationDestination;
  kosher: Signal<KosherLevel>;
  shabbos: Signal<ShabbosLevel>;
  /** How many things to do we hold for it. Shown only when it is not zero. */
  thingsToDo: number;
  /** How many places to stay we hold. Same rule. */
  places: number;
};

export function cardModel(destination: VacationDestination, sources: VacationSources): VacationCardModel {
  const facts = factsFor(destination, sources);
  return {
    destination,
    kosher: kosherAvailability(destination, facts),
    shabbos: shabbosPracticality(destination, facts),
    thingsToDo: facts.attractions.length,
    places: facts.stays.length,
  };
}

export function cardModels(
  destinations: readonly VacationDestination[],
  sources: VacationSources,
): VacationCardModel[] {
  return destinations.map((destination) => cardModel(destination, sources));
}

/* ---- filtering ----------------------------------------------------------- */

export type VacationFilters = {
  query: string;
  theme: TripTheme | "";
  season: Season | "";
  country: string;
  kosher: KosherLevel | "";
  shabbos: ShabbosLevel | "";
};

export const NO_VACATION_FILTERS: VacationFilters = {
  query: "",
  theme: "",
  season: "",
  country: "",
  kosher: "",
  shabbos: "",
};

function haystack(card: VacationCardModel): string {
  const d = card.destination;
  return [d.name, d.country, d.region, ...d.cities, ...d.bestFor, d.whyGo].filter(Boolean).join(" ").toLowerCase();
}

export function filterVacations(cards: readonly VacationCardModel[], filters: VacationFilters): VacationCardModel[] {
  const query = filters.query.trim().toLowerCase();
  return cards.filter((card) => {
    if (query && !haystack(card).includes(query)) return false;
    if (filters.theme && !card.destination.themes.includes(filters.theme)) return false;
    if (filters.season && !card.destination.seasons.includes(filters.season)) return false;
    if (filters.country && card.destination.country !== filters.country) return false;
    if (filters.kosher && card.kosher.level !== filters.kosher) return false;
    if (filters.shabbos && card.shabbos.level !== filters.shabbos) return false;
    return true;
  });
}

export function activeFilterCount(filters: VacationFilters): number {
  return (["theme", "season", "country", "kosher", "shabbos"] as const).filter((key) => filters[key] !== "").length +
    (filters.query.trim() ? 1 : 0);
}

/**
 * Only the filter options that would actually return something.
 *
 * A filter row with "Beach and resort (0)" in it is a promise the site cannot
 * keep, and pressing it to find an empty page is worse than never offering it.
 * So every option carries its own count and an option with no destinations
 * behind it is not rendered at all.
 */
export type FilterOption<V extends string> = { value: V; label: string; count: number };

function tally<V extends string>(
  cards: readonly VacationCardModel[],
  options: ReadonlyArray<{ value: V; label: string }>,
  has: (card: VacationCardModel, value: V) => boolean,
): Array<FilterOption<V>> {
  return options
    .map((option) => ({ ...option, count: cards.filter((card) => has(card, option.value)).length }))
    .filter((option) => option.count > 0);
}

export function themeOptions(
  cards: readonly VacationCardModel[],
  themes: ReadonlyArray<{ value: TripTheme; label: string }>,
): Array<FilterOption<TripTheme>> {
  return tally(cards, themes, (card, value) => card.destination.themes.includes(value));
}

export function seasonOptions(
  cards: readonly VacationCardModel[],
  seasons: ReadonlyArray<{ value: Season; label: string }>,
): Array<FilterOption<Season>> {
  return tally(cards, seasons, (card, value) => card.destination.seasons.includes(value));
}

export function countryOptions(cards: readonly VacationCardModel[]): Array<FilterOption<string>> {
  const countries = [...new Set(cards.map((card) => card.destination.country))].sort();
  return tally(
    cards,
    countries.map((country) => ({ value: country, label: country })),
    (card, value) => card.destination.country === value,
  );
}

export const KOSHER_FILTERS: ReadonlyArray<{ value: KosherLevel; label: string }> = [
  { value: "in-town", label: "Kosher food in town" },
  { value: "from-a-base", label: "Bring it in from a base" },
  { value: "not-checked", label: "Not checked yet" },
] as const;

export const SHABBOS_FILTERS: ReadonlyArray<{ value: ShabbosLevel; label: string }> = [
  { value: "walkable-quarter", label: "Walkable quarter" },
  { value: "seasonal", label: "Seasonal programme" },
  { value: "arrange-ahead", label: "Arrange ahead" },
  { value: "not-checked", label: "Not checked yet" },
] as const;

export function kosherOptions(cards: readonly VacationCardModel[]): Array<FilterOption<KosherLevel>> {
  return tally(cards, KOSHER_FILTERS, (card, value) => card.kosher.level === value);
}

export function shabbosOptions(cards: readonly VacationCardModel[]): Array<FilterOption<ShabbosLevel>> {
  return tally(cards, SHABBOS_FILTERS, (card, value) => card.shabbos.level === value);
}

/** Tailwind per tone. Kept here so a second component cannot invent a palette. */
export const SIGNAL_CLASSES: Record<SignalTone, string> = {
  good: "border-emerald-700 bg-emerald-50 text-emerald-900",
  workable: "border-amber-600 bg-amber-50 text-amber-900",
  plan: "border-[var(--gold)] bg-[#fcf6e9] text-[var(--navy)]",
  unknown: "border-stone-400 bg-stone-100 text-stone-700",
};

/**
 * Where "add this to a trip" goes.
 *
 * The guided flow rather than a saved list, because a destination is not a
 * stop: pressing this means "I want to go here", and the next question is when
 * and with whom. The planner is two answers away and the destination is
 * already filled in when it opens.
 */
export function addToTripHref(destination: VacationDestination): string {
  return `/plan?destination=${encodeURIComponent(destination.slug)}`;
}

export function destinationHref(destination: VacationDestination): string {
  return `/vacation-ideas/${destination.slug}`;
}
