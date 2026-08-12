"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import SaveAuthModal from "@/components/SaveAuthModal";
import { executePendingSave, migrateLegacyTrip } from "@/lib/account-trip-client";
import {
  clearPendingSave,
  peekPendingSave,
  SAVE_RETURN_PARAM,
  stashPendingSave,
  stripSaveReturnFlag,
  takePendingSave,
  type PendingSave,
  type SaveNotice,
} from "@/lib/pending-save";
import { describeLegacyTrip, hasLegacyTrip } from "@/lib/legacy-trip-storage";
import { forgetSignedIn, useSignedIn } from "@/lib/use-signed-in";

type SaveAuth = {
  requireSave: (action: PendingSave) => void;
  busy: boolean;
};

const SaveAuthContext = createContext<SaveAuth | null>(null);

export function useSaveAuth(): SaveAuth {
  const value = useContext(SaveAuthContext);
  if (!value) {
    throw new Error("useSaveAuth must be used inside SaveAuthProvider");
  }
  return value;
}

/**
 * Account-gated saving for the whole public site.
 *
 * Signed in: the action runs against the account. Signed out: the modal opens
 * and the action is held in memory (and, for Google, in a short-lived session
 * stash) until they are in. Closing the modal drops the action. Signing in
 * finishes it once.
 */
export default function SaveAuthProvider({
  children,
  googleAvailable,
  phoneSignupAvailable,
}: {
  children: React.ReactNode;
  googleAvailable: boolean;
  phoneSignupAvailable: boolean;
}) {
  const signedIn = useSignedIn();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingSave | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const [legacyOffer, setLegacyOffer] = useState("");
  const running = useRef(false);

  const closeModal = useCallback(() => {
    setOpen(false);
    setPending(null);
    clearPendingSave();
  }, []);

  const runAction = useCallback(async (action: PendingSave) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      const result = await executePendingSave(action);
      if (result.ok) {
        setPending(null);
        clearPendingSave();
      }
      setNotice(result);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);

  const requireSave = useCallback(
    (action: PendingSave) => {
      if (signedIn === true) {
        void runAction(action);
        return;
      }
      setPending(action);
      stashPendingSave(action);
      if (signedIn === false) setOpen(true);
    },
    [runAction, signedIn],
  );

  const finishAfterAuth = useCallback(() => {
    forgetSignedIn();
    setOpen(false);
    const action = pending ?? takePendingSave();
    setPending(null);
    if (action) void runAction(action);
  }, [pending, runAction]);

  useEffect(() => {
    if (signedIn === false && pending) setOpen(true);
  }, [signedIn, pending]);

  useEffect(() => {
    if (signedIn === true && pending && !open) {
      const action = pending;
      setPending(null);
      clearPendingSave();
      void runAction(action);
    }
  }, [signedIn, pending, open, runAction]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (signedIn === null) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get(SAVE_RETURN_PARAM) !== "1") return;
    const next = `${window.location.pathname}${stripSaveReturnFlag(window.location.search)}${window.location.hash}`;
    window.history.replaceState(null, "", next);
    if (signedIn) {
      const action = takePendingSave();
      if (action) void runAction(action);
      return;
    }
    const action = peekPendingSave();
    if (action) {
      setPending(action);
      setOpen(true);
    }
  }, [signedIn, runAction]);

  useEffect(() => {
    if (signedIn !== true) return;
    if (!hasLegacyTrip()) return;
    setLegacyOffer(describeLegacyTrip());
  }, [signedIn]);

  return (
    <SaveAuthContext.Provider value={{ requireSave, busy }}>
      {children}
      <SaveAuthModal
        open={open}
        onClose={closeModal}
        onSignedIn={finishAfterAuth}
        googleAvailable={googleAvailable}
        phoneSignupAvailable={phoneSignupAvailable}
      />
      {notice && (
        <div
          role="status"
          className="fixed bottom-4 left-4 right-4 z-[var(--wg-z-modal,60)] mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--gold)] bg-white px-4 py-3 shadow-[0_16px_40px_rgba(23,45,82,.18)] sm:left-auto"
        >
          <p className={`text-sm font-semibold ${notice.ok ? "text-[var(--navy)]" : "text-red-700"}`}>{notice.message}</p>
          <div className="flex items-center gap-2">
            {notice.ok && notice.viewHref && (
              <Link
                href={notice.viewHref}
                className="inline-flex min-h-11 items-center rounded-full border border-[var(--navy)] bg-[var(--navy)] px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white"
              >
                {notice.viewLabel ?? "View trip"}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="inline-flex min-h-11 items-center px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {legacyOffer && signedIn && (
        <div className="fixed bottom-4 left-4 right-4 z-[var(--wg-z-popover,55)] mx-auto max-w-lg rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6] px-4 py-4 shadow-[0_16px_40px_rgba(23,45,82,.14)] sm:left-auto">
          <p className="font-[family-name:var(--font-display)] text-lg text-[var(--navy)]">Bring across what was in this browser?</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            This browser still has {legacyOffer}. Import it into your account once, then it follows you. Nothing is
            deleted until the import succeeds.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const result = await migrateLegacyTrip();
                setBusy(false);
                setNotice(result);
                if (result.ok) setLegacyOffer("");
              }}
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--navy)] bg-[var(--navy)] px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
            >
              {busy ? "Importing…" : "Import into my account"}
            </button>
            <button
              type="button"
              onClick={() => setLegacyOffer("")}
              className="inline-flex min-h-11 items-center px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </SaveAuthContext.Provider>
  );
}
