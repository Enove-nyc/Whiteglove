/**
 * "Travel information changes. Here is how we label what we have checked."
 *
 * WHAT IT USED TO SAY, AND WHY THAT WAS THE PROBLEM. "We are still building
 * this. Towns, kevarim, phone numbers and opening times are being added and
 * checked all the time." Two things were wrong with it at once, and they
 * compounded.
 *
 * It led with the site being unfinished. The first sentence a visitor read,
 * before anything about kosher vacations, was an apology — which is a strange
 * thing to hand somebody who has not yet decided to care, and which invites
 * them to discount everything that follows.
 *
 * And the examples were towns, kevarim, phone numbers and opening times. Three
 * of those four are the heritage database. A family asking about a week in the
 * Dolomites read a strip at the top of every page listing the things this site
 * is uncertain about, and every one of them belonged to a different business
 * than the one they came for. The whole redesign was about not doing that.
 *
 * WHAT IT SAYS NOW is the true and useful half of the old notice without the
 * apology: travel information changes, every practical detail on this site
 * carries a label saying how far it has been checked, and anything you should
 * reconfirm before travelling is flagged as such. That is a statement about
 * method rather than about how finished the site is — it stays true on the day
 * the site is finished, which is the test a good notice passes.
 *
 * WHY IT IS WORTH BEING CAREFUL WITH THE WORDS. On most sites a beta notice is
 * a formality. Here it is not: people plan real journeys on this, to places
 * where the difference between a shomer's old number and his current one is
 * standing outside a locked gate at four in the afternoon. "Use with caution"
 * has to say what to be cautious ABOUT, or it is decoration.
 *
 * SHOWN ONCE. A notice on every page is an obstacle, and one that reappears
 * teaches people to dismiss things without reading them — including the next
 * notice, which might matter more.
 *
 * SWITCHED OFF WITHOUT A DEPLOY. The day this site stops being new, the owner
 * has to be able to turn this off himself. Every word of it is in the settings
 * beside the rest of the site's words, and nothing here is hardcoded except the
 * fallbacks below, which exist so an unconfigured site still says something
 * sensible rather than showing empty headings.
 */

export type BetaNotice = {
  /** Off entirely. The state this should end up in. */
  on: boolean;
  heading: string;
  /** The main paragraph. */
  body: string;
  /** What specifically to check. The part that does the work. */
  caution: string;
  /** The invitation to write in. */
  feedback: string;
  /** Where the feedback button goes. */
  feedbackHref: string;
  feedbackLabel: string;
  dismissLabel: string;
  /**
   * Changing this makes everybody see the notice again.
   *
   * A version rather than a date, so it moves when the owner decides it should
   * and not merely because time has passed. Somebody who dismissed the old
   * wording has not agreed to the new wording.
   */
  version: string;
};

/**
 * What it says when nobody has set anything.
 *
 * Written to be shippable as-is: if the owner never opens the settings, this is
 * what the first visitor reads, and it should be the right thing.
 */
export const DEFAULT_NOTICE: BetaNotice = {
  on: true,
  heading: "Before you travel",
  // THE OWNER ASKED FOR THE FIRST SENTENCE, and it is written forwards rather
  // than as an apology — a guide that grows every day is a reason to come back,
  // where "we are still building this" is a reason to discount what is already
  // here. That was the whole of the last rewrite and it survives this one.
  body:
    "White Glove is new and growing: listings are added and updated every day. Travel details change too, so confirm kosher certification, opening hours and Shabbos arrangements directly before you rely on them for your own dates.",
  caution:
    "Whether somewhere is kosher is the certifying body's statement rather than ours, so ask to see the current teudah before you eat.",
  feedback: "If something here is wrong, missing or out of date, we would be glad to hear it — it is quicker than you think.",
  feedbackHref: "/contact?reason=correction",
  feedbackLabel: "Report an update",
  dismissLabel: "Hide this notice",
  // BUMPED AGAIN, and a dismissal is per version, so everybody meets this one.
  // Version 3 said the traveler-facing caution as a page strip. Version 4 was
  // the same words as a dismissible popup. Version 5 adds that the site is new
  // and added to daily — a visitor who hid version 4 has never been told that,
  // and it is the half of this notice that asks them back.
  version: "5",
};

/** Where a dismissal is remembered, per version. */
export const DISMISS_KEY = "whiteGloveBetaNotice";

/**
 * Should this visitor see it?
 *
 * Five noes, and each is a place a notice would be wrong rather than merely
 * unnecessary: switched off; nothing to say; already answered THIS wording;
 * the owner looking at his own admin, where a notice telling him the site is
 * unfinished is telling him what he is in the middle of doing; or an embed
 * iframe that holds a partner search form, where a full-screen popup would
 * sit on top of the search.
 */
export function shouldShow(
  notice: BetaNotice,
  { dismissedVersion, path }: { dismissedVersion: string | null; path: string },
): boolean {
  if (!notice.on) return false;
  if (!notice.heading.trim() || !notice.body.trim()) return false;
  if (dismissedVersion === notice.version) return false;
  return !isOwnersOwnScreen(path);
}

/**
 * Screens where the notice is not for the person looking.
 *
 * The admin is the owner's workshop. The login and access pages are where
 * somebody is trying to get in, and a modal over a password box is an obstacle
 * rather than a courtesy. /embed is the partner search form iframed from /book.
 */
export function isOwnersOwnScreen(path: string): boolean {
  return /^\/(admin|login|access|embed)(\/|$)/.test(path);
}

/**
 * What was stored, or null.
 *
 * Anything unreadable reads as "not dismissed", so the worst a corrupted value
 * can do is show the notice one more time.
 */
export function readDismissed(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

/**
 * The notice as it will actually be shown.
 *
 * Every field falls back on its own, so the owner clearing one line does not
 * leave a gap under a heading — a blank paragraph reads as something that
 * failed to load, and this is the one screen where that would undermine the
 * whole point of it.
 */
export function noticeFrom(stored: Partial<BetaNotice> | null | undefined): BetaNotice {
  const pick = (value: unknown, fallback: string) => {
    const text = typeof value === "string" ? value.trim() : "";
    return text || fallback;
  };
  return {
    on: typeof stored?.on === "boolean" ? stored.on : DEFAULT_NOTICE.on,
    heading: pick(stored?.heading, DEFAULT_NOTICE.heading),
    body: pick(stored?.body, DEFAULT_NOTICE.body),
    caution: pick(stored?.caution, DEFAULT_NOTICE.caution),
    feedback: pick(stored?.feedback, DEFAULT_NOTICE.feedback),
    feedbackHref: pick(stored?.feedbackHref, DEFAULT_NOTICE.feedbackHref),
    feedbackLabel: pick(stored?.feedbackLabel, DEFAULT_NOTICE.feedbackLabel),
    dismissLabel: pick(stored?.dismissLabel, DEFAULT_NOTICE.dismissLabel),
    version: pick(stored?.version, DEFAULT_NOTICE.version),
  };
}

/**
 * Why this wording would not do its job, or null.
 *
 * Checked when the owner saves, because the failure here is silent: a notice
 * that says "use with caution" and nothing else looks finished and warns
 * nobody of anything.
 */
export function noticeProblem(notice: BetaNotice): string | null {
  if (!notice.on) return null;
  if (!notice.heading.trim()) return "Give it a heading.";
  if (notice.body.trim().length < 20) return "Say what is still being worked on. A line or two.";
  if (notice.caution.trim().length < 20) {
    return "Say what to check. “Use with caution” on its own warns nobody of anything — name the things people actually rely on.";
  }
  if (!/^(\/|https?:\/\/)/.test(notice.feedbackHref.trim())) {
    return "The feedback link should start with / or with http.";
  }
  return null;
}
