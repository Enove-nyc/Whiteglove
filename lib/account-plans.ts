/**
 * What kind of account somebody has.
 *
 * Three: the one everybody starts on, Pro, and Business.
 *
 * TWO THINGS ARE NOW BEHIND THEM, and they arrived the way this file said they
 * would have to. It used to read: "a plan never decides what anybody can do…
 * if that changes, it changes on purpose, in one place, with the words on the
 * page changed to match — not by a gate quietly appearing somewhere and a
 * traveller finding out that something they had yesterday now costs money."
 *
 * That happened. The one place is **lib/account-limits.ts** — a Traveler may
 * have two trips at a time and print one copy a week — and the account page
 * says both before anybody meets them. Nothing else reads a plan to allow or
 * refuse anything, and a third limit belongs in that same file or nowhere.
 *
 * NOTHING ALREADY MADE IS TAKEN AWAY. The trip limit refuses a new trip; it
 * never closes, hides or deletes one that exists.
 *
 * NOTHING IS CHARGED FROM THIS FILE, AND NOTHING IS CHARGED BY DEFAULT. This
 * used to read "there is no payment of any kind on this site", and that stopped
 * being unconditionally true the day the owner asked for real subscriptions —
 * so here is the condition, in the place the old sentence was.
 *
 * Money is possible only when the offering in **lib/plan-billing.ts** is both
 * open AND set to "stripe", which is a setting only the owner can make, on a
 * screen that refuses it until Stripe's keys and prices genuinely exist. Unless
 * he has done that, asking for Pro does exactly what it always did: it registers
 * interest, tells him, takes no card, starts no subscription, and says so
 * plainly where it is asked for. A page that looks like a checkout and is not
 * one is still worse than no page.
 *
 * Nothing in THIS file reads that setting or knows anything about money. A plan
 * is what kind of account somebody has, however they came by it — granted by
 * hand or paid for — and everything downstream treats the two identically.
 */

export const ACCOUNT_PLANS = ["traveler", "pro", "business"] as const;
export type AccountPlan = (typeof ACCOUNT_PLANS)[number];

/** The one an account has when nobody has said otherwise. */
export const DEFAULT_PLAN: AccountPlan = "traveler";

/**
 * The names a person reads. The KEYS are not names: "pro" is what is stored on
 * an account, sent to Stripe and written back by the webhook, so it stays as
 * it is for ever — renaming the tier is a label change and nothing else, or
 * every existing account and every subscription stops matching itself.
 */
export const PLAN_LABELS: Record<AccountPlan, string> = {
  traveler: "Traveler",
  pro: "Gold",
  business: "Business",
};

/**
 * What each one is FOR — who it is meant for, not what it includes.
 *
 * Written this way on purpose. "Who this is for" is true today; "what you get"
 * would not be, and the moment it is written down somebody has been promised
 * it.
 */
export const PLAN_BLURB: Record<AccountPlan, string> = {
  traveler: "Everything on the site, for planning your own trips. This is what every account is.",
  pro: "For people who plan trips often, or plan them for others.",
  // THIS USED TO SAY "for a hotel, a kitchen, a shomer or a driver listed in
  // the directory", which described being IN the directory rather than using
  // the planner — and it was written before Business did anything. It does
  // something now: an agency plans in here and hands the client a document
  // with their own name on it, so the sentence names the people that is for.
  business: "For an agency, an office or anybody who plans trips for other people and hands them the itinerary.",
};

/** Higher means further up. Used only to work out what counts as an upgrade. */
const RANK: Record<AccountPlan, number> = { traveler: 0, pro: 1, business: 2 };

export function isAccountPlan(value: unknown): value is AccountPlan {
  return typeof value === "string" && (ACCOUNT_PLANS as readonly string[]).includes(value);
}

/**
 * The plan on a record.
 *
 * Anything unset or unrecognised is the default. An account made before plans
 * existed has no field at all, and it is a Traveler — which is exactly what it
 * was before, so nothing about it changes.
 */
export function planOf(record: { plan?: string } | null | undefined): AccountPlan {
  return isAccountPlan(record?.plan) ? record.plan : DEFAULT_PLAN;
}

/**
 * What a person on this plan can ask about.
 *
 * Only upwards, and never the one they are on — offering somebody an "upgrade"
 * to what they already have reads as the site not knowing who they are.
 * Business is not above Pro in what it costs or gives; it is a different thing,
 * so somebody on Pro can still ask about it.
 */
export function plansToAskAbout(current: AccountPlan): AccountPlan[] {
  return ACCOUNT_PLANS.filter((plan) => plan !== "traveler" && plan !== current && RANK[plan] >= RANK[current]);
}

export function isUpgrade(from: AccountPlan, to: AccountPlan): boolean {
  return to !== "traveler" && to !== from && RANK[to] >= RANK[from];
}

/**
 * What each plan gets you, over and above the whole site every account already
 * has — in words.
 *
 * These are the things a plan UNLOCKS. The trip and print ceilings are not here:
 * they are numbers the owner can change, so describeLimits() in
 * lib/account-limits.ts says those instead, and a page shows both together so
 * each plan reads out everything it can do. Traveler unlocks nothing extra and
 * keeps an empty list, which the pages cope with by saying it in a sentence
 * rather than printing an empty heading.
 *
 * The words are what the traveler GETS, not what the code calls it, and each
 * line has a gate behind it in lib/account-limits.ts — the assistant-memory
 * line tracks keepsAssistantHistory, the branding line tracks
 * mayBrandOwnItinerary. The two must not drift apart: tests/site-assistant.test.ts
 * and tests/account-plans.test.ts hold them together.
 */
const PLAN_INCLUDES: Record<AccountPlan, readonly string[]> = {
  traveler: [],
  pro: [
    "The assistant remembers your conversation between visits",
    "The White Glove app for your own trips — your itinerary on your phone, a day at a time, kept for when there is no signal",
  ],
  business: [
    "The assistant remembers your conversation between visits",
    "Your own logo and business name on every itinerary you print, in place of the White Glove crest",
    "The White Glove app for the travellers you plan for — a link that opens their trip on their phone, and a chat with each one",
  ],
};

export function whatYouGet(plan: AccountPlan): readonly string[] {
  return PLAN_INCLUDES[plan] ?? [];
}

/* ---- asking for one ---------------------------------------------------- */

/** Where a request has got to. */
export type PlanRequestState = "asked" | "granted" | "declined";

export type PlanRequest = {
  /** The account that asked — an email or a phone, the same string it signs in with. */
  account: string;
  wanted: AccountPlan;
  /** Named when the request is for a Business account. */
  businessName?: string;
  /** Anything they wanted to say. Never required. */
  note?: string;
  askedAt: string;
  state: PlanRequestState;
  /** When it stopped being "asked". */
  answeredAt?: string;
  /** Who answered it — a name, or "the shared password". */
  answeredBy?: string;
};

export const MAX_NOTE = 600;
export const MAX_BUSINESS_NAME = 120;

/**
 * Why this request cannot be taken, or null.
 *
 * A Business account has to name the business. Not paperwork: the whole point
 * of one is that it belongs to a business somebody can find in the directory,
 * and a request that does not say which is a request nobody can act on.
 */
export function requestProblem(input: {
  current: AccountPlan;
  wanted: unknown;
  businessName?: string;
  note?: string;
}): string | null {
  if (!isAccountPlan(input.wanted)) return "Choose which kind of account you want.";
  if (!isUpgrade(input.current, input.wanted)) {
    return input.wanted === input.current
      ? `You are already on ${PLAN_LABELS[input.wanted]}.`
      : "That is not a change this can make.";
  }
  if (input.wanted === "business" && !input.businessName?.trim()) return "Tell us the name of the business.";
  if ((input.businessName?.trim().length ?? 0) > MAX_BUSINESS_NAME) return `Keep the business name under ${MAX_BUSINESS_NAME} characters.`;
  if ((input.note?.trim().length ?? 0) > MAX_NOTE) return `Keep the note under ${MAX_NOTE} characters.`;
  return null;
}

/**
 * "asked 3 days ago" — how long a request has been sitting there.
 *
 * `now` is an ISO timestamp rather than an epoch because this is worked out on
 * the server and handed to a screen: a component may not read a clock while it
 * renders, so the page reads one once and passes the answer down.
 */
export function waitingFor(request: PlanRequest, now: string): string {
  const then = Date.parse(request.askedAt);
  const at = Date.parse(now);
  if (Number.isNaN(then) || Number.isNaN(at)) return "at some point";
  const hours = Math.floor((at - then) / 3_600_000);
  if (hours < 1) return "in the last hour";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/**
 * What to say about somebody's plan on their own account page.
 *
 * Says what they are on and, when they have asked for something, that the ask
 * is sitting with a person rather than with a machine that has forgotten it.
 */
export function describePlan(plan: AccountPlan, open: PlanRequest | null): string {
  if (open) {
    return `You are on ${PLAN_LABELS[plan]}. You asked about ${PLAN_LABELS[open.wanted]} — we have it, and we will be in touch.`;
  }
  return `You are on ${PLAN_LABELS[plan]}.`;
}
