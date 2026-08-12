"use client";

import { createPortal } from "react-dom";
import LoginForm from "@/components/LoginForm";
import { useFocusTrap } from "@/components/useFocusTrap";
import { SAVE_AUTH_BODY, SAVE_AUTH_HEADING } from "@/lib/save-copy";
import { returnToWithSaveFlag } from "@/lib/pending-save";

/**
 * The one sign-in dialog for every save action.
 *
 * Heading and body are fixed so every "Add to trip" on the site asks for an
 * account in the same words. The form itself is the existing LoginForm — Google,
 * password, create account, forgot password — so this is not a second auth
 * system. Closing it does not save anything.
 */
export default function SaveAuthModal({
  open,
  onClose,
  onSignedIn,
  googleAvailable,
  phoneSignupAvailable,
  googleProblem,
}: {
  open: boolean;
  onClose: () => void;
  onSignedIn: () => void;
  googleAvailable: boolean;
  phoneSignupAvailable: boolean;
  googleProblem?: string;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(open, onClose);
  if (!open || typeof document === "undefined") return null;

  const here = `${window.location.pathname}${window.location.search}`;
  const next = returnToWithSaveFlag(here);

  const dialog = (
    <div
      className="fixed inset-0 z-[var(--wg-z-modal,60)] flex items-end justify-center bg-[var(--navy)]/50 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-auth-title"
        tabIndex={-1}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--gold-light)] bg-white p-6 shadow-[0_24px_60px_rgba(23,45,82,.20)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="save-auth-title"
              className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)] sm:text-3xl"
            >
              {SAVE_AUTH_HEADING}
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">{SAVE_AUTH_BODY}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-stone-500 transition hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]"
          >
            ×
          </button>
        </div>
        <LoginForm
          phoneSignupAvailable={phoneSignupAvailable}
          next={next}
          googleAvailable={googleAvailable}
          googleProblem={googleProblem}
          onSignedIn={onSignedIn}
        />
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
