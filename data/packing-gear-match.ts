/**
 * Matching a packing-list line to something on the travel-gear shelf.
 *
 * WHY THIS EXISTS. The gear shelf lives at /travel-gear, under "Before you
 * go", and a traveller has no particular reason to open it. The packing list
 * is the opposite: it is a list of things they have just been told they need
 * to bring. "Travel blech" on that list is the one moment in the whole site
 * where a link to a travel blech is a help rather than an advert. So the two
 * are joined here — not by putting the shop in front of everyone, but by
 * letting a line that already names a product carry a quiet link to it.
 *
 * WHY IT REFUSES RATHER THAN GUESSES. A wrong match is worse than no match:
 * sending someone who read "sunscreen" to a hotplate reads as the site
 * guessing, and the shelf's whole value is that it was chosen by hand. So a
 * line and a product are only joined when one names the other outright —
 * every meaningful word of the product appears in the line ("Plug adapter for
 * European sockets" names "Universal plug adapter"), or every meaningful word
 * of the line appears in the product ("Blech" names "Travel Shabbos blech").
 * Overlapping halves are not enough.
 *
 * AND WHERE TWO PRODUCTS FIT EQUALLY WELL, IT LINKS NEITHER. If the shelf
 * holds two adapters, a line that just says "adapter" has not chosen between
 * them and neither has the traveller — picking one would be the site
 * asserting a preference it does not have. Ambiguity links nothing.
 *
 * A line naming the whole product outranks a product merely containing the
 * line, so an exact "Blech" goes to the shelf's own "Blech" rather than being
 * lost to a tie with "Shabbos blech cover".
 */

/** The little of a gear item this needs — never the price, which goes stale. */
export type GearLink = {
  id: string;
  name: string;
  url: string;
};

export type PackingGearMatch = {
  /** The gear item to link to. */
  gear: GearLink;
  /** How strong the match is. Only ever compared, never displayed. */
  score: number;
};

/**
 * A line that names the whole product beats a product that merely contains
 * the line, whatever the word counts — so this sits above any score the
 * other direction can reach.
 */
const NAMES_THE_PRODUCT = 1000;

/**
 * Words that carry no identifying weight in a product name. Dropping them is
 * what lets "Travel Shabbos blech" match a line that just says "blech", while
 * still requiring the words that actually name the thing.
 *
 * "Travel" is here for the obvious reason: on a travel website it is in half
 * the product names and identifies nothing.
 */
const NOISE = new Set([
  "a",
  "an",
  "and",
  "for",
  "of",
  "the",
  "to",
  "with",
  "your",
  "travel",
  "travelling",
  "traveling",
  "portable",
  "compact",
  "mini",
  "small",
  "folding",
  "foldable",
  "universal",
  "kosher",
  "set",
  "kit",
  "pack",
  "size",
  "sized",
]);

/** Lowercase, strip punctuation, collapse whitespace. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Crude singularisation, on purpose. "candlesticks" and "candlestick" are the
 * same product and a traveller writing either means the same thing; anything
 * cleverer than a trailing "s" would need a word list this does not deserve.
 * "ss" is left alone so "dress" does not become "dres".
 */
function singular(word: string): string {
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function meaningfulWords(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter(Boolean)
    .map(singular)
    .filter((word) => word.length > 1 && !NOISE.has(word));
}

/** How well one product fits one line, or null if it does not fit at all. */
function scoreGear(words: Set<string>, gear: GearLink): number | null {
  const needed = meaningfulWords(gear.name);
  // A product named nothing but noise ("Travel kit") would otherwise be a
  // subset of every line and match all of them.
  if (needed.length === 0) return null;
  if (needed.every((word) => words.has(word))) return NAMES_THE_PRODUCT + needed.length;
  const inGear = new Set(needed);
  if ([...words].every((word) => inGear.has(word))) return words.size;
  return null;
}

/**
 * The best gear item for one packing line, or null when there is no fit — or
 * when two fit equally well, which is the same answer for the reason in this
 * file's header: an even tie is the site guessing, not choosing.
 */
export function matchGearToLabel(label: string, shelf: GearLink[]): PackingGearMatch | null {
  const words = new Set(meaningfulWords(label));
  if (words.size === 0) return null;

  let best: PackingGearMatch | null = null;
  let tied = false;
  for (const gear of shelf) {
    const score = scoreGear(words, gear);
    if (score === null) continue;
    if (!best || score > best.score) {
      best = { gear, score };
      tied = false;
    } else if (score === best.score) {
      tied = true;
    }
  }
  return tied ? null : best;
}

/**
 * Every packing-item id that has a gear match, as a lookup the view can read
 * per row without re-running the matching for each one.
 */
export function matchGearToItems(
  items: Array<{ id: string; label: string }>,
  shelf: GearLink[],
): Record<string, GearLink> {
  const found: Record<string, GearLink> = {};
  if (shelf.length === 0) return found;
  for (const item of items) {
    const match = matchGearToLabel(item.label, shelf);
    if (match) found[item.id] = match.gear;
  }
  return found;
}
