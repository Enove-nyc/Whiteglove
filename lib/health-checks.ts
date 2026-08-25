/**
 * Whether the things this site depends on are actually working.
 *
 * WHY THIS EXISTS. lib/connections.ts says it plainly and then cannot do
 * anything about it: "SET IS NOT THE SAME AS WORKING... whether the key is
 * valid, the account is in credit, or the service is up is a different
 * question, and one only a real request can answer — which is what the test
 * buttons beside this are for." The buttons work. Nobody presses them. A key
 * that expires, an account that runs out of credit, a service that changes an
 * endpoint: each stops one feature quietly, and the screen that was meant to
 * catch it goes on saying "set" because the variable still has a value in it.
 *
 * FREE CHECKS ONLY, AND THE REST ARE NAMED. The existing test buttons call
 * Anthropic and Google Routes, which are billed per request. Running those
 * nightly would spend the owner's money to find out something he mostly
 * already knows. So this runs the checks that cost nothing — a read against
 * Redis, Postgres, Stripe and Resend — and the screen SAYS which connections
 * are not checked and why, rather than leaving a blank that reads as passing.
 * An unchecked thing looking identical to a working one is the whole failure
 * this file exists to end.
 *
 * TOLD ON CHANGE, NOT ON STATE. See tellAbout below: an email every night
 * saying everything is fine teaches somebody to filter it, and the night it
 * says something else it is filtered too.
 */

export type CheckId = "redis" | "postgres" | "stripe" | "resend";

export type CheckResult = {
  id: CheckId;
  ok: boolean;
  /** What happened, in words. Never carries a key — see lib/redact.ts. */
  detail: string;
  /** ISO. When this answer was obtained. */
  at: string;
};

export type CheckMeta = {
  id: CheckId;
  what: string;
  /** What a person loses, written as the consequence rather than the cause. */
  without: string;
  /** The variables it needs, so an unconfigured check can say so instead of failing. */
  vars: string[];
};

export const CHECKS: CheckMeta[] = [
  {
    id: "redis",
    what: "The private store",
    without: "Nobody can sign in, save a trip or upload a picture.",
    vars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  },
  {
    id: "postgres",
    what: "The content database",
    without: "Every town, kever and listing the owner added stops appearing.",
    vars: ["DATABASE_URL"],
  },
  {
    id: "stripe",
    what: "Payments",
    without: "Nobody can buy a plan or pay an invoice.",
    vars: ["STRIPE_SECRET_KEY"],
  },
  {
    id: "resend",
    what: "Email",
    without: "Sign-in codes, trip notes and the day's reminders go nowhere.",
    vars: ["RESEND_API_KEY"],
  },
];

/**
 * The connections deliberately NOT checked here, and why.
 *
 * Named rather than omitted. A screen listing four green ticks while six other
 * services go unmentioned is the same lie as a variable that is set and not
 * working: it reads as "everything is fine".
 */
export const NOT_CHECKED: Array<{ what: string; why: string }> = [
  { what: "Google Maps, Places and Routes", why: "billed per request — use the test buttons when you need to know" },
  { what: "Anthropic and Gemini", why: "billed per request" },
  { what: "Duffel and AeroDataBox", why: "billed or rate-limited per request" },
  { what: "Travelpayouts and Stay22", why: "affiliate links — a broken one shows as a booking that does not open, not as an error here" },
];

export type HealthState = Partial<Record<CheckId, CheckResult>>;

export type Transition = {
  id: CheckId;
  /** True when it has just started failing; false when it has just recovered. */
  broke: boolean;
  detail: string;
};

/**
 * What is worth an email tonight.
 *
 * ON CHANGE, NOT ON STATE. Something that was working and has stopped is news.
 * Something that was broken last night and is still broken is not — the owner
 * knows, and a second email says nothing the first did not. Recovery is news
 * too, and is the one that stops somebody chasing a problem that has already
 * gone away.
 *
 * A check with no previous answer at all is NOT reported as breaking. The
 * first run would otherwise email about every connection at once, including
 * the ones that are simply unconfigured on a fresh deployment.
 */
export function tellAbout(before: HealthState, after: readonly CheckResult[]): Transition[] {
  const out: Transition[] = [];
  for (const result of after) {
    const previous = before[result.id];
    if (!previous) continue;
    if (previous.ok === result.ok) continue;
    out.push({ id: result.id, broke: !result.ok, detail: result.detail });
  }
  return out;
}

/** How a transition reads in an email subject or a notification. */
export function describeTransition(transition: Transition): string {
  const meta = CHECKS.find((check) => check.id === transition.id);
  const what = meta?.what ?? transition.id;
  return transition.broke ? `${what} stopped working` : `${what} is working again`;
}

/** Merge a run's results over what was held, keeping checks this run did not do. */
export function foldResults(before: HealthState, results: readonly CheckResult[]): HealthState {
  const next: HealthState = { ...before };
  for (const result of results) next[result.id] = result;
  return next;
}

/** True when every check that ran is passing. */
export function allWell(state: HealthState): boolean {
  const results = Object.values(state).filter(Boolean) as CheckResult[];
  return results.length > 0 && results.every((result) => result.ok);
}
