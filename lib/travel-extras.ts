/**
 * The things a traveller buys that are not a flight, a room or a car.
 *
 * An eSIM, travel insurance, an airport transfer, luggage storage, a tour. They
 * have nothing in common with the three searches and should not be built like
 * them: THERE IS NOTHING TO SWAP IN. A search has to carry the traveller's own
 * cities and dates into the partner's URL, which is why those are checked
 * against the partner they open. One of these is a link somebody clicks, so the
 * link the owner pastes is the link that opens — and it earns the moment it is
 * saved, with no format to get wrong.
 *
 * WHICH IS WHY THEY ARE FREE-FORM. The site does not hold a list of approved
 * partners, because the owner's programmes will change and a list in the code
 * would mean a deploy every time. He types a name, a line of description and a
 * link. Anything Travelpayouts carries — or anything else he joins — goes up
 * the same way.
 *
 * WHAT THIS WILL NOT DO is claim a link earns when it does not. A pasted link
 * that goes straight to the partner works perfectly and pays nothing, and there
 * is no way to see the difference from the page. So the screen says which it
 * is, every time, and does not refuse either — a link to something he simply
 * wants travellers to have is a fair thing to put on a website.
 */

export type TravelExtra = {
  /** Stable across edits, so a row can be changed rather than replaced. */
  id: string;
  /** "eSIM data", "Travel insurance". */
  name: string;
  /** One line under the name. */
  blurb: string;
  /** Where the button goes. */
  url: string;
  /** The words on the button. Optional; there is a sensible default. */
  cta?: string;
};

/** The most a list can hold before the section stops being scannable. */
export const MAX_EXTRAS = 8;

const LIMITS = { name: 40, blurb: 140, cta: 24 } as const;

/** Suggestions for the empty screen. Not a whitelist — anything can be added. */
export const IDEAS = [
  "eSIM data",
  "Travel insurance",
  "Airport transfer",
  "Luggage storage",
  "Car hire",
  "Tours and tickets",
] as const;

/** The hosts a link goes through when somebody is being credited for it. */
const TRACKED = [
  "tp.media",
  "tp.st",
  "c.travelpayouts.com",
  "travelpayouts.com",
  "stay22.com",
  "go.skimresources.com",
  "shareasale.com",
  "awin1.com",
  "anrdoezrs.net",
  "dpbolvw.net",
  "jdoqocy.com",
  "kqzyfj.com",
  "tkqlhce.com",
];

function parse(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Whether this link is one somebody gets paid for.
 *
 * A guess, and an honest one: it recognises the redirect hosts the big networks
 * use. A link it does not recognise may still earn — plenty of programmes track
 * on the partner's own domain with a parameter. So this drives what the screen
 * SAYS, never what it allows.
 */
export function looksTracked(url: string): boolean {
  const parsed = parse(url);
  if (!parsed) return false;
  const host = parsed.host.toLowerCase();
  if (TRACKED.some((h) => host === h || host.endsWith(`.${h}`))) return true;
  // The other common shape: the partner's own domain carrying an affiliate
  // parameter.
  return ["marker", "aid", "affiliate_id", "partner", "irclickid", "utm_source"].some((k) => parsed.searchParams.has(k));
}

/** The marker or ID this link carries, for showing back. "" when there is none. */
export function idIn(url: string): string {
  const parsed = parse(url);
  if (!parsed) return "";
  for (const key of ["marker", "aid", "affiliate_id", "partner"]) {
    const value = parsed.searchParams.get(key)?.trim();
    if (value) return value;
  }
  return "";
}

/**
 * Names that are a note to self rather than a partner.
 *
 * "Option 1" and "Option 2" sat on the live booking page for weeks, beside an
 * "eSIM data" card with no description under it, and the section read exactly
 * like what it was: a screen somebody had started filling in. A traveller
 * cannot tell a placeholder from a partner they have not heard of, so the page
 * has to.
 */
const PLACEHOLDER_NAME = /^(option|choice|partner|provider|link|item|thing|row|test|sample|example|placeholder|tbd|todo|untitled|new)\b[\s\-–—]*\d*$/i;

/**
 * Whether this row is still somebody's rough draft.
 *
 * TWO SIGNALS, AND EITHER IS ENOUGH. A name that numbers itself rather than
 * naming a company, or a card with nothing under the heading — the description
 * is the only thing on the card that tells a traveller what they would be
 * buying, and a card without one is a link with a mystery on it.
 *
 * This decides what a VISITOR sees. It never blocks a save: the owner may want
 * to park a row half-written, and describeExtra tells him plainly that it is
 * not on the page yet and what is missing.
 */
export function looksUnfinished(extra: TravelExtra): string | null {
  const name = extra.name.trim();
  if (PLACEHOLDER_NAME.test(name)) return "the name is still a placeholder — put the partner's real name here";
  if (!extra.blurb.trim()) return "there is no line under the name saying what it is";
  return null;
}

/** Why this row cannot be saved, or null. */
export function extraProblem(extra: TravelExtra): string | null {
  const name = extra.name.trim();
  const url = extra.url.trim();
  if (!name) return "Give it a name — that is what travellers see.";
  if (name.length > LIMITS.name) return `That name is too long for the card. Keep it under ${LIMITS.name} characters.`;
  if (!url) return "Paste the link travellers should be sent to.";
  if (!parse(url)) return "That is not a link. Paste the whole address, starting with https://.";
  if (extra.blurb.trim().length > LIMITS.blurb) return `That description is too long. Keep it under ${LIMITS.blurb} characters.`;
  if ((extra.cta ?? "").trim().length > LIMITS.cta) return `The button words are too long. Keep them under ${LIMITS.cta} characters.`;
  return null;
}

/** Why the whole list cannot be saved, or null. */
export function listProblem(extras: TravelExtra[]): string | null {
  if (extras.length > MAX_EXTRAS) return `That is more than ${MAX_EXTRAS}. Any more and nobody reads any of them.`;
  for (const extra of extras) {
    const problem = extraProblem(extra);
    if (problem) return `${extra.name.trim() || "The new one"}: ${problem}`;
  }
  const names = extras.map((e) => e.name.trim().toLowerCase());
  const twice = names.find((n, i) => names.indexOf(n) !== i);
  if (twice) return `There are two called “${twice}”. Travellers would see the same name twice.`;
  return null;
}

/**
 * Is this an Amazon link?
 *
 * ASKED BECAUSE AMAZON REQUIRES ITS OWN SENTENCE. The Associates Operating
 * Agreement is specific about the wording — "As an Amazon Associate I earn from
 * qualifying purchases" — and it has to appear with the links rather than
 * somewhere in the terms. This site's own disclosure says "qualifying
 * BOOKINGS", which is the right idea and the wrong words, and Amazon enforces
 * this one: accounts are closed over it.
 *
 * So the sentence appears only when there is an Amazon link to justify it. A
 * site that carries Amazon's disclosure while linking to nothing of theirs is
 * making a claim about a relationship it does not have.
 *
 * Matches the storefront domains rather than every host that contains the word:
 * "amazonaws.com" is not a shop, and "notamazon.example" is not Amazon.
 */
const AMAZON_HOSTS = /(^|\.)(amazon\.(com|co\.uk|ca|de|fr|it|es|nl|com\.au|co\.jp|in|com\.mx|com\.br|se|pl|sg|ae)|amzn\.to|amzn\.com)$/i;

export function isAmazonLink(url: string): boolean {
  try {
    return AMAZON_HOSTS.test(new URL(url.trim()).host.toLowerCase());
  } catch {
    return false;
  }
}

/** Does this list contain anything Amazon's own disclosure has to cover? */
export function needsAmazonDisclosure(extras: TravelExtra[]): boolean {
  return shownToVisitors(extras).some((extra) => isAmazonLink(extra.url));
}

/** Amazon's required wording, verbatim. Not ours to reword. */
export const AMAZON_DISCLOSURE = "As an Amazon Associate I earn from qualifying purchases.";

/** What the button should say. Never blank. */
export function ctaFor(extra: TravelExtra): string {
  const own = extra.cta?.trim();
  if (own) return own;
  return `Get ${extra.name.trim().toLowerCase()} →`;
}

/** What this row is doing, for the admin. Never null. */
export function describeExtra(extra: TravelExtra): string {
  const problem = extraProblem(extra);
  if (problem) return `Not shown — ${problem}`;
  const unfinished = looksUnfinished(extra);
  if (unfinished) return `Saved, but not shown to travellers — ${unfinished}.`;
  const id = idIn(extra.url);
  if (looksTracked(extra.url)) {
    return id
      ? `Shows on the booking page, and a purchase should be credited to you (${id}).`
      : "Shows on the booking page, and a purchase should be credited to you.";
  }
  return "Shows on the booking page. This link goes straight to the partner, so it earns nothing — which is fine if that is what you meant.";
}

/** What the list as a whole is doing. Never null. */
export function describeExtras(extras: TravelExtra[]): string {
  const saved = extras.filter((e) => !extraProblem(e));
  const live = saved.filter((e) => !looksUnfinished(e));
  if (live.length === 0) {
    const waiting = saved.length - live.length;
    if (waiting > 0) {
      return `Nothing is being offered on the booking page. ${waiting === 1 ? "One row is" : `${waiting} rows are`} saved but still unfinished — a row shows to travellers once it has a real partner name and a line saying what it is.`;
    }
    return "Nothing extra is being offered yet. An eSIM or travel insurance is the usual first one — a traveller who has just booked a flight is the person most likely to want it.";
  }
  const earning = live.filter((e) => looksTracked(e.url)).length;
  const noun = live.length === 1 ? "One thing is" : `${live.length} things are`;
  const waiting = saved.length - live.length;
  const held = waiting > 0 ? ` ${waiting === 1 ? "One more row is" : `${waiting} more rows are`} saved but still unfinished, so travellers do not see ${waiting === 1 ? "it" : "them"}.` : "";
  if (earning === live.length) return `${noun} offered on the booking page, and every link is tracked.${held}`;
  if (earning === 0) return `${noun} offered on the booking page. None of the links is tracked, so none of them earns.${held}`;
  return `${noun} offered on the booking page. ${earning} of the links ${earning === 1 ? "is" : "are"} tracked; the rest earn nothing.${held}`;
}

/**
 * Only the rows a visitor should see, in order.
 *
 * Unfinished rows are dropped here rather than at save time, so nothing the
 * owner has typed is lost and the booking page still cannot show it. With
 * every row unfinished the list comes back empty and TravelExtras renders
 * nothing at all — AGENTS.md: hide a section until it has customer-ready
 * content in it.
 */
export function shownToVisitors(extras: TravelExtra[]): TravelExtra[] {
  return extras.filter((e) => !extraProblem(e) && !looksUnfinished(e)).slice(0, MAX_EXTRAS);
}
