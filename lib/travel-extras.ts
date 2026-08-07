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
  const live = extras.filter((e) => !extraProblem(e));
  if (live.length === 0) {
    return "Nothing extra is being offered yet. An eSIM or travel insurance is the usual first one — a traveller who has just booked a flight is the person most likely to want it.";
  }
  const earning = live.filter((e) => looksTracked(e.url)).length;
  const noun = live.length === 1 ? "One thing is" : `${live.length} things are`;
  if (earning === live.length) return `${noun} offered on the booking page, and every link is tracked.`;
  if (earning === 0) return `${noun} offered on the booking page. None of the links is tracked, so none of them earns.`;
  return `${noun} offered on the booking page. ${earning} of the links ${earning === 1 ? "is" : "are"} tracked; the rest earn nothing.`;
}

/** Only the rows a visitor should see, in order. */
export function shownToVisitors(extras: TravelExtra[]): TravelExtra[] {
  return extras.filter((e) => !extraProblem(e)).slice(0, MAX_EXTRAS);
}
