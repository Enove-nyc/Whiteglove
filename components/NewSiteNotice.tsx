"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import { type BetaNotice, DISMISS_KEY, readDismissed, shouldShow } from "@/lib/beta-notice";
import { useFocusTrap } from "@/components/useFocusTrap";

/**
 * "Travel information changes. Here is how we label what we have checked."
 *
 * WHAT IT SAYS CHANGED, AND WHY. It used to lead with the site being
 * unfinished, and its examples were towns, kevarim, phone numbers and opening
 * times — three of the four being the heritage database. So the first thing a
 * family asking about the Dolomites read was an apology about a different
 * business. The wording is in lib/beta-notice.ts and the reasoning is written
 * out there.
 *
 * THREE ACTIONS, and each is a different thing somebody might want at that
 * moment: read how the labels work, tell us something is out of date, or make
 * the notice go away. The third used to be "I understand", which is not an
 * action and does not say what pressing it does.
 *
 * IT IS A POPUP. It lived for a while as a strip under the top of every page
 * so visitors could read the site first; it is a dialog again because the
 * strip pushed the brand and the proposition down and read as chrome rather
 * than a caution. Same words, same settings, same once-per-visitor rule —
 * shown once, dismissible, never over the admin or a sign-in box.
 *
 * WHAT IS KEPT. It is still read from the owner's settings, so the day the
 * site stops being new he can turn it off without a deploy. It is still
 * dismissed once per wording — bumping the version brings it back, because
 * somebody who dismissed the old wording has not agreed to the new one.
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
  const titleId = useId();
  // Pressed, this visit. Separate from what is stored, so it goes at once
  // rather than waiting for a storage event that never comes in this tab.
  const [answered, setAnswered] = useState(false);

  // READ AS AN OUTSIDE THING rather than copied into state in an effect.
  // localStorage is not React's, another tab can change it, and the server
  // cannot see it at all — so its answer is UNKNOWN, a real third state.
  // Without it the dialog would flash on for everybody who had already
  // dismissed it, then vanish on hydration.
  const dismissed = useSyncExternalStore(subscribeDismissal, dismissalNow, () => UNKNOWN);
  const open =
    dismissed !== UNKNOWN &&
    !answered &&
    shouldShow(notice, { dismissedVersion: readDismissed(dismissed.slice("known:".length)), path });

  const close = useCallback(() => {
    setAnswered(true);
    try {
      localStorage.setItem(DISMISS_KEY, notice.version);
    } catch {
      /* nothing to do about it */
    }
  }, [notice.version]);

  const dialogRef = useFocusTrap<HTMLDivElement>(open, close);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--wg-z-modal)] flex items-end justify-center bg-[var(--navy)]/50 p-4 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-xl rounded-2xl border border-[var(--gold)] bg-[#fcf6e9] p-5 text-[var(--navy)] shadow-[0_24px_60px_rgba(23,45,82,.28)] outline-none sm:p-7"
      >
        {/* Every field the owner can edit is rendered. A settings screen with a
            line on it that no page shows is the exact failure data/site-words.ts
            was written to end. */}
        <div className="text-sm leading-6">
          <h2 id={titleId} className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)] sm:text-2xl">
            {notice.heading}
          </h2>
          <p className="mt-3">{notice.body}</p>
          <p className="mt-2 text-stone-600">{notice.caution}</p>
        </div>

        <div className="mt-5 flex flex-col gap-2">
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
              className="inline-flex min-h-11 items-center rounded-md bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[var(--gold)]"
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
    </div>
  );
}
