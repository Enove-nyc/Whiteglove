/**
 * Shabbos in one place — what the site already knows, and nothing else.
 *
 * WHAT THIS IS FOR. Everything a traveller needs for Shabbos exists on this
 * site and is spread across five pages: the shuls are on /shuls, the mikvaos
 * on /mikvaos, the eruv on /eruvin, the food on /kosher and the candle-lighting
 * on /zmanim. On a Thursday, in a city they do not know, that is five searches
 * to answer one question. This gathers the answer for one city onto one page.
 *
 * IT ADDS NO FACTS. Every line comes from a listing that already exists, with
 * its own source behind it, and a city with nothing on record produces a page
 * that says so rather than a page of empty headings.
 *
 * THREE THINGS IT DELIBERATELY DOES NOT DO:
 *
 *   • It does not print minyan times it was not given. A shul listing carries
 *     hours only when the source published them, and this shows what is there
 *     and no more. A davening time invented for a page like this is the kind
 *     of error somebody discovers by missing it.
 *
 *   • It does not offer restaurants for Shabbos. They are shut. The food
 *     section is explicitly what is open BEFORE it comes in, which is a
 *     different question and the one actually worth answering on a Friday —
 *     so bakeries, groceries, butchers and takeaways lead it.
 *
 *   • It does not claim walking distances. A walking distance needs a starting
 *     point, and the site does not know where anybody is staying. Distances
 *     from an invented centre would read as fact and be wrong for most people.
 */

export type ShabbosListing = {
  id: string;
  name: string;
  address: string | null;
  /** Only ever what the source published. Never a guess at a minyan time. */
  hours: string | null;
  phone: string | null;
  website: string | null;
  /** Where the full listing lives on this site. */
  href: string;
};

export type ShabbosEruv = {
  id: string;
  name: string;
  /** "Golders Green, Hendon and the surrounding streets", when given. */
  covers: string | null;
  sourceUrl: string;
  mapUrl: string | null;
};

/** A kosher place worth reaching before Shabbos starts. */
export type ShabbosFood = ShabbosListing & {
  kind: string;
};

/**
 * How many food places are worth listing. London has 116 on record and a list
 * of 116 is not an answer to "where do I buy before Shabbos" — it is the
 * kosher food finder with a different heading on it. The first dozen, in the
 * order a Friday needs them, and the rest stay one link away.
 */
export const MAX_FOOD = 12;

export type ShabbosPlace = {
  /** What the destination is called — may cover more than one town. */
  name: string;
  country: string;
  shuls: ShabbosListing[];
  mikvaos: ShabbosListing[];
  eruvin: ShabbosEruv[];
  /** Bakeries, groceries and butchers first — see the header. At most MAX_FOOD. */
  foodBeforeShabbos: ShabbosFood[];
  /** How many more there are on the kosher food finder. 0 when all are shown. */
  moreFood: number;
};

/** Nothing at all on record for this place. */
export function isEmpty(place: ShabbosPlace): boolean {
  return (
    place.shuls.length === 0 &&
    place.mikvaos.length === 0 &&
    place.eruvin.length === 0 &&
    place.foodBeforeShabbos.length === 0
  );
}

/**
 * Compare two place names the way a person would: case and accents ignored,
 * so "Kraków" finds "Krakow" and "TEL AVIV" finds "Tel Aviv". Anything
 * cleverer — fuzzy matching, near-misses — would start joining one town's
 * listings onto another's, and a shul in the wrong city is worse than a shul
 * this page did not find.
 */
export function samePlaceName(a: string, b: string): boolean {
  return normalizePlace(a) === normalizePlace(b);
}

function normalizePlace(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The order food is useful in on a Friday afternoon. A bakery and a grocery
 * are what somebody actually needs before Shabbos; a restaurant is on the
 * list because it may sell food to take away, not because it will be open.
 */
const FOOD_ORDER = ["Bakery", "Grocery", "Butcher", "Takeaway", "Cafe", "Restaurant"];

function foodRank(kind: string): number {
  const index = FOOD_ORDER.indexOf(kind);
  return index === -1 ? FOOD_ORDER.length : index;
}

type CityRow = { city: string; country: string };

/**
 * A destination is not always one town — data/vacation-destinations.ts gives
 * each one a `cities` list spelled exactly as the listing files spell it, and
 * that is the join this uses. Matching on a single city would quietly drop
 * every listing in the other towns of a region.
 */
function here<T extends CityRow>(rows: readonly T[], cities: readonly string[], country: string): T[] {
  return rows.filter(
    (row) => samePlaceName(row.country, country) && cities.some((city) => samePlaceName(row.city, city)),
  );
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}

/**
 * Everything on record for Shabbos in one city.
 *
 * Pure: the caller does the reading. That keeps this testable against fixed
 * rows and keeps the page free to read shuls from the database and food from
 * a flat file without this knowing the difference.
 */
export function shabbosIn(input: {
  /** What the place is called on the page. */
  name: string;
  /** Every town this destination covers — see here() below. */
  cities: readonly string[];
  country: string;
  shuls: readonly (CityRow & Omit<ShabbosListing, "id"> & { id: string })[];
  mikvaos: readonly (CityRow & Omit<ShabbosListing, "id"> & { id: string })[];
  eruvin: readonly (CityRow & ShabbosEruv)[];
  food: readonly (CityRow & Omit<ShabbosFood, "id"> & { id: string })[];
}): ShabbosPlace {
  const food = here(input.food, input.cities, input.country)
    .slice()
    .sort((a, b) => foodRank(a.kind) - foodRank(b.kind) || byName(a, b));

  return {
    name: input.name,
    country: input.country,
    shuls: here(input.shuls, input.cities, input.country).slice().sort(byName),
    mikvaos: here(input.mikvaos, input.cities, input.country).slice().sort(byName),
    eruvin: here(input.eruvin, input.cities, input.country).slice().sort(byName),
    foodBeforeShabbos: food.slice(0, MAX_FOOD),
    moreFood: Math.max(0, food.length - MAX_FOOD),
  };
}

/**
 * The date of the Shabbos a traveller means when they ask "this Shabbos".
 *
 * Friday's date, because candle-lighting is what they are looking for and it
 * is Friday's. On Shabbos itself it stays on the Shabbos already in progress
 * rather than jumping a week — somebody opening this on a Saturday night
 * wants havdalah, not next Friday. From Sunday it looks forward.
 *
 * `today` is passed in rather than read: this has to be testable, and the
 * page knows the traveller's date better than this file does.
 */
export function fridayOf(today: Date): string {
  const day = today.getUTCDay(); // 0 Sunday … 5 Friday, 6 Shabbos
  const delta = day === 6 ? -1 : 5 - day;
  const friday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + delta));
  return friday.toISOString().slice(0, 10);
}
