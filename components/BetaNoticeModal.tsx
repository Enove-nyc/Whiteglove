"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import GloveMark from "@/components/GloveMark";
import { type BetaNotice, DISMISS_KEY, readDismissed, shouldShow } from "@/lib/beta-notice";

/**
 * Whether this browser has already dismissed it.
 *
 * READ AS AN OUTSIDE THING, not copied into state in an effect. localStorage
 * is not React's, another tab can change it, and setting state from an effect
 * to mirror it causes the cascading render the lint rule is about.
 *
 * The server cannot see localStorage, so its answer is UNKNOWN rather than
 * "not dismissed" — a real third state. Without it the modal would render on
 * the server for everybody and then vanish on hydration for anybody who had
 * already answered it, which is a flash of a notice they had dealt with.
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

/**
 * "White Glove is new. Please check anything you are going to rely on."
 *
 * Shown once, on the first page somebody lands on, and then not again unless
 * the owner changes the wording. A notice that reappears teaches people to
 * dismiss things without reading them, including the next one.
 *
 * READ AFTER MOUNT, NOT DURING RENDER. Whether it has been dismissed lives in
 * localStorage, which the server cannot see — so the first paint has to be
 * "nothing", and the notice appears a moment later. That is the right way
 * round: a modal rendered on the server and then hidden would flash at
 * somebody who had already answered it.
 *
 * It is a real dialog: focus moves into it, Escape closes it, and the page
 * behind does not scroll while it is up. This is the first thing a visitor
 * sees, and a modal that traps nothing and announces nothing is the kind of
 * detail that makes a careful site feel careless.
 */
export default function BetaNoticeModal({ notice }: { notice: BetaNotice }) {
  const path = usePathname() ?? "/";
  const panel = useRef<HTMLDivElement>(null);
  // Pressed, this visit. Separate from what is stored, so the modal goes at
  // once rather than waiting for a storage event that never comes in this tab.
  const [answered, setAnswered] = useState(false);

  const dismissed = useSyncExternalStore(subscribeDismissal, dismissalNow, () => UNKNOWN);
  const open =
    dismissed !== UNKNOWN &&
    !answered &&
    shouldShow(notice, { dismissedVersion: readDismissed(dismissed.slice("known:".length)), path });

  function close() {
    setAnswered(true);
    try {
      localStorage.setItem(DISMISS_KEY, notice.version);
    } catch {
      /* nothing to do about it */
    }
  }

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    // The page behind should not move while a modal is over it.
    const had = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = had;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[var(--navy)]/50 p-4 backdrop-blur-[2px] sm:items-center">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="beta-notice-heading"
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto border border-[var(--gold)] bg-[#fcfaf6] shadow-2xl outline-none"
      >
        <div className="border-b border-[var(--gold-light)] bg-white px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <GloveMark size="lg" />
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove Itineraries</p>
          </div>
          <h2
            id="beta-notice-heading"
            className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl"
          >
            {notice.heading}
          </h2>
        </div>

        <div className="space-y-4 px-6 py-6 sm:px-8">
          <p className="text-sm leading-7 text-stone-600">{notice.body}</p>

          {/* The part that does the work. Set apart, because "use with caution"
              buried in a paragraph is a sentence nobody reads. */}
          <div className="border-l-4 border-[var(--gold)] bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Before you travel</p>
            <p className="mt-1.5 text-sm leading-7 text-stone-700">{notice.caution}</p>
          </div>

          <p className="text-sm leading-7 text-stone-600">{notice.feedback}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--gold-light)] bg-white px-6 py-5 sm:px-8">
          <button
            type="button"
            onClick={close}
            className="min-h-11 rounded-md bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)]"
          >
            {notice.dismissLabel}
          </button>
          <Link
            href={notice.feedbackHref}
            onClick={close}
            className="min-h-11 rounded-md border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.14em] leading-[2.75rem] text-[var(--navy)] transition hover:bg-[var(--cream)]"
          >
            {notice.feedbackLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
