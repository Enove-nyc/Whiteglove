"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { type BetaNotice, DISMISS_KEY, readDismissed, shouldShow } from "@/lib/beta-notice";

/**
 * "Travel information changes. Here is how we label what we have checked."
 *
 * WHAT IT SAYS CHANGED, AND WHY. It used to lead with the site being
 * unfinished, and its examples were towns, kevarim, phone numbers and opening
 * times — three of the four being the heritage database. So the first thing a
 * family asking about the Dolomites read, at the top of every page, was an
 * apology about a different business. The wording is in lib/beta-notice.ts and
 * the reasoning is written out there.
 *
 * THREE ACTIONS, and each is a different thing somebody might want at that
 * moment: read how the labels work, tell us something is out of date, or make
 * the strip go away. The third used to be "I understand", which is not an
 * action and does not say what pressing it does.
 *
 * THIS USED TO BE A MODAL, and it was the first thing every visitor met: a
 * dialog over the front page, before they had seen a single word about what
 * the site does. The content was right and the placement was wrong. A person
 * who has just arrived has not yet decided to care, and the first thing you
 * hand them should not be a box they have to dismiss to find out what you
 * sell.
 *
 * So it is a strip at the top of the page instead. Same words, same settings,
 * same once-per-visitor rule — and the caution, which is the part that does
 * the work, now also lives beside the individual facts it is about: every
 * practical detail on the site carries its own Verified / Reported / Being
 * checked / Reconfirm-before-travel label, and /verification explains them.
 * That is a better answer than one sentence at the door, because it arrives at
 * the moment somebody is actually deciding whether to rely on something.
 *
 * WHAT IS KEPT FROM THE MODAL. It is still read from the owner's settings, so
 * the day the site stops being new he can turn it off without a deploy. It is
 * still dismissed once per wording — bumping the version brings it back,
 * because somebody who dismissed the old wording has not agreed to the new
 * one. It still never appears over the admin or a sign-in box.
 *
 * WHAT IS DELIBERATELY GONE: the focus trap, the scroll lock, and the
 * backdrop. This is not a dialog and must not pretend to be one — a strip that
 * traps focus is worse than a modal, not better.
 */

const UNKNOWN = "unknown";

function subscribeDismissal(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function dismissalNow(): string {
  try {
    return `known:${localStorage.getItem(DISMISS_KEY) ?? ""}`;
  } catch {
    // Private browsing with storage blocked. Showing it every visit is the
    // safe end of that, and better than never showing it at all.
    return "known:";
  }
}

export default function NewSiteNotice({ notice }: { notice: BetaNotice }) {
  const path = usePathname() ?? "/";
  // Pressed, this visit. Separate from what is stored, so it goes at once
  // rather than waiting for a storage event that never comes in this tab.
  const [answered, setAnswered] = useState(false);

  // READ AS AN OUTSIDE THING rather than copied into state in an effect.
  // localStorage is not React's, another tab can change it, and the server
  // cannot see it at all — so its answer is UNKNOWN, a real third state.
  // Without it the strip would render on the server for everybody and vanish
  // on hydration for anybody who had already dismissed it.
  const dismissed = useSyncExternalStore(subscribeDismissal, dismissalNow, () => UNKNOWN);
  const open =
    dismissed !== UNKNOWN &&
    !answered &&
    shouldShow(notice, { dismissedVersion: readDismissed(dismissed.slice("known:".length)), path });

  if (!open) return null;

  function close() {
    setAnswered(true);
    try {
      localStorage.setItem(DISMISS_KEY, notice.version);
    } catch {
      /* nothing to do about it */
    }
  }

  return (
    <aside
      aria-label="About this site"
      className="border-b border-[var(--gold)] bg-[#fcf6e9] px-5 py-3 text-[var(--navy)] sm:px-8"
    >
      {/* Every field the owner can edit is rendered. A settings screen with a
          line on it that no page shows is the exact failure data/site-words.ts
          was written to end, and dropping "body" and "feedback" when this
          stopped being a modal would have recreated it. */}
      {/* STACKED FIRST, side by side only when there is room.
          It was `flex-wrap` with a `shrink-0` column of buttons beside a
          `flex-1` paragraph, and on a 390px screen the buttons took the whole
          row: the text column was squeezed to a few characters wide and the
          notice grew to eight thousand pixels tall. Nothing overflowed and
          nothing looked broken above the fold, which is why `npm run
          audit:ui` — which measures the real page at the real widths — is the
          only thing that found it. */}
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
        <div className="min-w-0 flex-1 text-sm leading-6">
          <p>
            <span className="font-bold">{notice.heading}.</span> {notice.body}
          </p>
          <p className="mt-1 text-stone-600">{notice.caution}</p>
        </div>
        {/* STACKED FIRST, side by side only when there is room.
            It was `flex-wrap` with a `shrink-0` column of buttons beside a
            `flex-1` paragraph, and on a 390px screen the buttons took the
            whole row: the text column was squeezed to a few characters wide
            and the notice grew to eight thousand pixels tall. Nothing
            overflowed and nothing looked broken above the fold, which is why
            `npm run audit:ui` — which measures the real page at the real
            widths — is the only thing that found it. */}
        <div className="flex shrink-0 flex-col gap-1.5 sm:max-w-sm">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/verification"
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-4 text-xs font-bold uppercase tracking-[0.1em] transition hover:bg-[var(--gold)] hover:text-white"
            >
              How verification works
            </Link>
            <Link
              href={notice.feedbackHref}
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-4 text-xs font-bold uppercase tracking-[0.1em] transition hover:bg-[var(--gold)] hover:text-white"
            >
              {notice.feedbackLabel}
            </Link>
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-11 items-center rounded-md px-4 text-xs font-bold uppercase tracking-[0.1em] transition hover:bg-[var(--cream-deep)]"
            >
              {/* The owner's word for it. It used to be "I understand", which
                  is not an action and does not say what pressing it does — a
                  screen reader listing this page's buttons could not tell it
                  from the eleven others. */}
              {notice.dismissLabel}
            </button>
          </div>
          <p className="text-xs leading-5 text-stone-600">{notice.feedback}</p>
        </div>
      </div>
    </aside>
  );
}
