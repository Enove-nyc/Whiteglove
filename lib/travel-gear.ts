/**
 * The Amazon travel-gear shelf — a travel blech, a hotplate, a plug adapter,
 * anything worth having in a suitcase.
 *
 * SAME SHAPE AS lib/travel-extras.ts, ONE STEP FURTHER. An extra is a name and
 * a link; a shelf of products needs a picture and a price to look like a shop
 * rather than a list of buttons. Everything travel-extras already got right
 * still holds here: free-form (no approved-partner list to keep in code),
 * nothing shown until it is finished, and Amazon's own disclosure sentence —
 * see isAmazonLink in travel-extras.ts — governs this list too.
 *
 * WHY THE PICTURE AND PRICE ARE TYPED IN, NOT FETCHED. Amazon's Product
 * Advertising API is the only sanctioned way to pull a title, image and price
 * from a link automatically, and Amazon does not grant — or keep — API access
 * for an Associates account without 3 qualifying sales in its first 180 days.
 * Scraping the product page directly is against the Associates Operating
 * Agreement and risks the account this whole shelf depends on. So today this
 * is typed in by hand, same as the name and the link always have been; the
 * API is a later, additive step once there is sales history to qualify with.
 *
 * WHY THE PRICE CARRIES A DATE. docs/vacation-expansion.md already settled
 * this for the rest of the site: no price is published without a way to tell
 * how current it is, because a price the site prints and never updates goes
 * stale and misleads. An Amazon price can move within the day. So the card
 * shows what was typed in as "checked" on a date, not as a live fact, and the
 * button goes to Amazon for the real one.
 */

export type TravelGearItem = {
  /** Stable across edits, so a row can be changed rather than replaced. */
  id: string;
  /** "Travel Shabbos blech", "Universal plug adapter". */
  name: string;
  /** One or two lines — what it is and why a traveller would want it. */
  description: string;
  /** A picture URL. Optional: a text-only card is still a real card. */
  imageUrl: string;
  /** "$24.99" — free text, since a currency symbol is not always "$". */
  price: string;
  /** ISO date the price was last looked at. Blank if price is blank. */
  priceCheckedAt: string;
  /** The Amazon (or other) affiliate link. */
  url: string;
  /** The words on the button. Optional; there is a sensible default. */
  cta?: string;
};

/** A whole shop page can hold more than a three-slot section under a search. */
export const MAX_GEAR_ITEMS = 60;

const LIMITS = { name: 60, description: 220, cta: 24 } as const;

/** Suggestions for the empty screen. Not a whitelist — anything can be added. */
export const GEAR_IDEAS = [
  "Travel Shabbos blech",
  "Travel hotplate",
  "Travel candlesticks",
  "Travel Havdalah set",
  "Universal plug adapter",
  "Portable luggage scale",
] as const;

function parseUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** What the button should say. Never blank. */
export function gearCtaFor(item: TravelGearItem): string {
  const own = item.cta?.trim();
  if (own) return own;
  return "See it on Amazon →";
}

/**
 * Names that are a note to self rather than a real product — the same signal
 * travel-extras uses, so a half-titled row cannot slip onto the shelf here
 * either.
 */
const PLACEHOLDER_NAME = /^(option|choice|item|product|thing|row|test|sample|example|placeholder|tbd|todo|untitled|new)\b[\s\-–—]*\d*$/i;

/**
 * Whether this row is still somebody's rough draft — a name, a description
 * and a price all present, or it is not ready for a traveller to see.
 *
 * Never blocks a save: the owner may want to park a row half-written, and
 * describeGearItem says plainly what is still missing.
 */
export function gearLooksUnfinished(item: TravelGearItem): string | null {
  const name = item.name.trim();
  if (PLACEHOLDER_NAME.test(name)) return "the name is still a placeholder — put the real product name here";
  if (!item.description.trim()) return "there is no description saying what it is";
  if (!item.price.trim()) return "there is no price — even a rough one, with today's date, beats none";
  return null;
}

/** Why this row cannot be saved, or null. */
export function gearItemProblem(item: TravelGearItem): string | null {
  const name = item.name.trim();
  const url = item.url.trim();
  if (!name) return "Give it a name — that is what travellers see.";
  if (name.length > LIMITS.name) return `That name is too long for the card. Keep it under ${LIMITS.name} characters.`;
  if (!url) return "Paste the Amazon (or other) link travellers should be sent to.";
  if (!parseUrl(url)) return "That is not a link. Paste the whole address, starting with https://.";
  if (item.description.trim().length > LIMITS.description) {
    return `That description is too long. Keep it under ${LIMITS.description} characters.`;
  }
  if ((item.cta ?? "").trim().length > LIMITS.cta) return `The button words are too long. Keep them under ${LIMITS.cta} characters.`;
  if (item.imageUrl.trim() && !parseUrl(item.imageUrl)) return "The picture field needs a real link, or nothing at all.";
  // A price with no date is a price nobody can judge as current or stale —
  // the one thing docs/vacation-expansion.md's "no price without a way to
  // tell how current it is" rule actually requires.
  if (item.price.trim() && !item.priceCheckedAt.trim()) return "Set the date you checked that price.";
  return null;
}

/** Why the whole list cannot be saved, or null. */
export function gearListProblem(items: TravelGearItem[]): string | null {
  if (items.length > MAX_GEAR_ITEMS) return `That is more than ${MAX_GEAR_ITEMS}. Split the shelf rather than growing it past that.`;
  for (const item of items) {
    const problem = gearItemProblem(item);
    if (problem) return `${item.name.trim() || "The new one"}: ${problem}`;
  }
  const names = items.map((i) => i.name.trim().toLowerCase());
  const twice = names.find((n, i) => names.indexOf(n) !== i);
  if (twice) return `There are two called "${twice}". Travellers would see the same item twice.`;
  return null;
}

/** How stale a checked price is, in plain words. Null when there is no price. */
export function priceCheckedLabel(item: TravelGearItem): string | null {
  const price = item.price.trim();
  if (!price) return null;
  const checked = item.priceCheckedAt.trim();
  if (!checked) return price;
  const date = new Date(checked);
  if (Number.isNaN(date.getTime())) return price;
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  const when = days <= 0 ? "today" : days === 1 ? "yesterday" : days < 30 ? `${days} days ago` : "a while ago";
  return `${price} — checked ${when}`;
}

/** What this row is doing, for the admin. Never null. */
export function describeGearItem(item: TravelGearItem): string {
  const problem = gearItemProblem(item);
  if (problem) return `Not shown — ${problem}`;
  const unfinished = gearLooksUnfinished(item);
  if (unfinished) return `Saved, but not shown to travellers — ${unfinished}.`;
  return "Shown on the travel gear shelf.";
}

/** What the shelf as a whole is doing. Never null. */
export function describeGearItems(items: TravelGearItem[]): string {
  const saved = items.filter((i) => !gearItemProblem(i));
  const live = saved.filter((i) => !gearLooksUnfinished(i));
  if (live.length === 0) {
    const waiting = saved.length - live.length;
    if (waiting > 0) {
      return `Nothing is on the shelf yet. ${waiting === 1 ? "One row is" : `${waiting} rows are`} saved but still missing something.`;
    }
    return "Nothing is on the shelf yet — add a first finished item.";
  }
  const waiting = saved.length - live.length;
  const held = waiting > 0 ? ` ${waiting === 1 ? "One more row is" : `${waiting} more rows are`} saved but still unfinished, so travellers do not see ${waiting === 1 ? "it" : "them"}.` : "";
  return `${live.length === 1 ? "One item is" : `${live.length} items are`} on the travel gear page.${held}`;
}

/**
 * Only the rows a visitor should see, in order.
 *
 * Unfinished rows are dropped here rather than at save time, so nothing the
 * owner has typed is lost. With every row unfinished the page has nothing to
 * show — AGENTS.md: hide a section until it has customer-ready content in it.
 */
export function gearShownToVisitors(items: TravelGearItem[]): TravelGearItem[] {
  return items.filter((i) => !gearItemProblem(i) && !gearLooksUnfinished(i)).slice(0, MAX_GEAR_ITEMS);
}
