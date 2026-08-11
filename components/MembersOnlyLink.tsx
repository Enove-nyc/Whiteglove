"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/components/useFocusTrap";
import { type GatedFeature, promptFor, SIGN_IN_LABEL, signInTo } from "@/lib/members-only";
import { useSignedIn } from "@/lib/use-signed-in";

/**
 * A link to something an account is for — always shown, whoever is looking.
 *
 * IT IS A REAL LINK, not a button that navigates. Middle-click, right-click,
 * open-in-new-tab and the keyboard all have to work, and they only do if the
 * href is genuinely there. Signed out, the click is intercepted and the note
 * opens instead; everything else about it behaves like a link.
 *
 * WHILE WE DO NOT YET KNOW who is looking, the link works normally. The old
 * behaviour was to render nothing until the answer came back, which is how the
 * planner came to be invisible to everybody signed out — showing it and
 * deciding on the press is the way round that cannot hide anything.
 *
 * THE NOTE IS PORTALLED TO THE BODY, and it has to be. This link lives in the
 * navbar, and the navbar is `backdrop-blur-md` — a backdrop-filter makes an
 * element the containing block for every `position: fixed` descendant, so
 * `fixed inset-0` here meant the navbar's own 235px-tall box rather than the
 * screen. Bottom-aligned inside it, the note hung 281px above the top of a
 * phone: the heading and the whole first paragraph were off-screen with no way
 * to scroll to them, and all anybody saw was the tail of the second sentence
 * above three buttons.
 */
export default function MembersOnlyLink({
  feature,
  className,
  onNavigate,
}: {
  feature: GatedFeature;
  className?: string;
  /** So a menu can close itself when this is used. */
  onNavigate?: () => void;
}) {
  const signedIn = useSignedIn();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dialogRef = useFocusTrap<HTMLDivElement>(open, () => setOpen(false));
  const prompt = promptFor(feature);

  const note = (
    <div
      className="fixed inset-0 z-[var(--wg-z-modal,200)] flex items-end justify-center bg-[var(--navy)]/50 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`members-${feature.key}-title`}
        // Never taller than the screen it is on, and scrolls when the words do
        // not fit — a short phone in landscape still gets to the heading.
        // dvh rather than vh so the browser's own address bar is counted.
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--gold-light)] bg-white p-6 shadow-[0_24px_60px_rgba(23,45,82,.20)] sm:p-8"
      >
        <h2
          id={`members-${feature.key}-title`}
          className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]"
        >
          {prompt.title}
        </h2>
        {prompt.body.map((line) => (
          <p key={line} className="mt-3 text-sm leading-7 text-stone-600">
            {line}
          </p>
        ))}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={signInTo(feature)}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)]"
          >
            {SIGN_IN_LABEL}
          </Link>
          {prompt.canContinue && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
                router.push(feature.href);
              }}
              className="border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
            >
              {prompt.continueLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-stone-500 transition hover:text-[var(--navy)]"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Link
        href={feature.href}
        className={className}
        onClick={(event) => {
          // Only a plain left click. A modifier means they asked for a new tab,
          // and taking that away to show a note would be worse than the note is
          // worth.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          if (signedIn === false) {
            event.preventDefault();
            setOpen(true);
            return;
          }
          onNavigate?.();
        }}
      >
        {feature.label}
      </Link>

      {/*
        No mounted guard, and none is needed: `open` starts false and only a
        click can set it, so the portal never renders on the server or during
        hydration, and by the time it does there is a document to put it in.
      */}
      {open && createPortal(note, document.body)}
    </>
  );
}
