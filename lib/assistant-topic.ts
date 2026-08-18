/**
 * Whether a question put to the travel assistant is about travel at all.
 *
 * WHY IT IS HERE AND NOT IN THE ROUTE. It used to live inside
 * app/api/itinerary/ai/route.ts, where a route file may only export handlers —
 * so the one piece of logic that can turn a real traveller away had no test of
 * any kind. It turned one away: "high five vacations" was refused before the
 * model ever saw it, because the list held "vacation" and the match demanded a
 * whole word. The owner watched his own site tell him a travel question was
 * not a travel question.
 *
 * WHY REFUSE BEFORE THE CALL AT ALL. The model already declines anything that
 * is not travel, but the refusal is written BY the model, so the model is
 * called and the call is paid for. With the system prompt and the page context
 * going up every time, "write me a poem" cost very nearly what a real answer
 * costs. The topic rule protected the brand; it never protected the bill.
 *
 * DELIBERATELY GENEROUS, AND IN THAT DIRECTION ON PURPOSE. Turning away a real
 * traveller is a far worse failure than paying for one junk answer. A question
 * is refused only when it names no place this site knows AND contains not one
 * travel word in any ordinary inflection of it.
 */

/** Lower-case, punctuation flattened to single spaces. */
export function flattenQuestion(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Words that make a question a travel question on this site.
 *
 * The list grew by being tested against real phrasings rather than imagined
 * ones — "We have 4 hours, any ideas?" and "How far is Lizhensk from Krakow?"
 * are both travel questions containing none of the obvious nouns.
 *
 * Singulars only. Plurals are handled by the matcher, so nobody has to
 * remember to add both — which is the mistake that caused the refusal above.
 */
export const TRAVEL_WORDS = [
  // the trip itself
  "travel", "trip", "vacation", "holiday", "itinerary", "visit", "visiting", "go", "going", "stay", "staying",
  "hotel", "accommodation", "airbnb", "apartment", "flight", "fly", "flying", "airport",
  "drive", "driving", "car", "train", "bus", "transfer", "route", "day", "week", "weekend", "night",
  "summer", "winter", "spring", "autumn", "season", "pesach", "sukkos", "sukkot", "yom tov",
  // the kosher and Jewish side
  "kosher", "kashrus", "kashrut", "hechsher", "hechsherim", "teudah", "shabbos", "shabbat", "shul",
  "minyan", "minyanim", "daven", "davening", "mikvah", "mikveh", "mikvaos", "eruv", "kever",
  "kevarim", "kivrei", "tzadik", "tzaddik", "tzaddikim", "rebbe", "ohel", "cemetery", "beis hachaim",
  "heritage", "jewish", "chabad", "yeshiva", "cholov", "pas yisroel", "bishul",
  // the people who arrange it — the directory is part of this site, and asking
  // after a tour operator by name is as much a travel question as asking after
  // a town. This is the omission that made the refusal look absurd.
  "tour", "operator", "agency", "agent", "guide", "driver", "concierge", "planner", "company",
  // what a traveller asks
  "eat", "eating", "restaurant", "food", "bakery", "where", "what to do", "things to do",
  "see", "sightseeing", "attraction", "museum", "family", "children", "kid", "walk",
  "walking", "near", "nearby", "around", "recommend", "recommendation", "plan", "planning", "book", "booking",
  "country", "city", "town", "destination", "beach", "mountain", "weather",
  "hour", "idea", "far", "long", "close", "distance", "between", "from", "there",
  "anything", "somewhere", "suggest", "suggestion", "worth", "open", "closed", "time", "zman", "zmanim",
] as const;

const SINGLE = new Set(TRAVEL_WORDS.filter((word) => !word.includes(" ")).map(flattenQuestion));
const PHRASES = TRAVEL_WORDS.filter((word) => word.includes(" ")).map(flattenQuestion);

/**
 * One token, with the ordinary English endings taken off.
 *
 * Not a stemmer — deliberately. Four suffixes cover the inflections a traveller
 * actually types ("vacations", "hotels", "buses", "walking") and anything
 * cleverer would start matching words that are not on the list at all, which
 * is the one direction this must not fail in.
 */
function stems(token: string): string[] {
  const out = [token];
  if (token.endsWith("es") && token.length > 3) out.push(token.slice(0, -2));
  if (token.endsWith("s") && token.length > 2) out.push(token.slice(0, -1));
  if (token.endsWith("ing") && token.length > 4) out.push(token.slice(0, -3));
  return out;
}

/** Does this question contain a travel word, in any ordinary form of it? */
export function mentionsTravelWord(question: string): boolean {
  const flat = flattenQuestion(question);
  if (!flat) return false;
  if (PHRASES.some((phrase) => ` ${flat} `.includes(` ${phrase} `))) return true;
  return flat.split(" ").some((token) => stems(token).some((stem) => SINGLE.has(stem)));
}
