"use client";

import Link from "next/link";
import { useSaveAuth } from "@/components/SaveAuthProvider";
import type { Itinerary } from "@/data/itinerary";
import { SAVE_ACCOUNT_BENEFIT } from "@/lib/save-copy";
import { useSignedIn } from "@/lib/use-signed-in";

/**
 * What you can do with a trip somebody shared with you.
 *
 * Adding it makes a trip of its own on the account. Signed out, the account
 * modal opens and the import runs once after sign-in — it is not copied into
 * this browser.
 */
export default function SharedItineraryActions({ itinerary, shareId }: { itinerary: Itinerary; shareId: string }) {
  const signedIn = useSignedIn();
  const { requireSave, busy } = useSaveAuth();

  const buttonBase = "inline-flex items-center min-h-[44px] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition";

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/i/${shareId}/print`}
          target="_blank"
          className={`${buttonBase} border border-[var(--gold)] text-[var(--navy)] hover:bg-[var(--navy)] hover:text-white`}
        >
          Print / Save as PDF
        </Link>

        <button
          type="button"
          disabled={busy || signedIn === null}
          onClick={() => requireSave({ type: "import-shared", itinerary })}
          className={`${buttonBase} border border-[var(--navy)] bg-[var(--navy)] text-white hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60`}
        >
          {busy ? "Adding…" : "Add to my trips"}
        </button>
      </div>

      {signedIn === false && <p className="mt-2 text-xs leading-5 text-stone-500">{SAVE_ACCOUNT_BENEFIT}</p>}
    </div>
  );
}
