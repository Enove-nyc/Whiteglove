"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Itinerary } from "@/data/itinerary";
import { signInHref, useSignedIn } from "@/lib/use-signed-in";

const LS_KEY = "whiteGloveItinerary";

/**
 * What you can do with a trip somebody shared with you.
 *
 * Adding it used to replace whatever was in the planner, with a confirm box as
 * the only warning — so somebody who had spent an hour on Poland and was then
 * sent a friend's Uman itinerary had to choose between them. An account holds
 * as many trips as it needs, so adding a shared one now makes a trip of its
 * own and leaves everything else exactly where it was.
 *
 * Signed out there is nowhere to put a second trip, so it says so rather than
 * quietly overwriting the one this browser is holding.
 */
export default function SharedItineraryActions({ itinerary, shareId }: { itinerary: Itinerary; shareId: string }) {
  const router = useRouter();
  const signedIn = useSignedIn();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function addAsOwnTrip() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/account/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", itinerary, name: itinerary.title }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setNote({ ok: false, text: data?.error ?? "Could not add it. Try again." });
        return;
      }
      setNote({ ok: true, text: "Added as its own trip — your other trips are untouched." });
      router.push("/itinerary");
      router.refresh();
    } catch {
      setNote({ ok: false, text: "Could not reach the server." });
    } finally {
      setBusy(false);
    }
  }

  /** Signed out, this browser holds one trip and that is the only place for it. */
  function copyLocally() {
    try {
      const existing = localStorage.getItem(LS_KEY);
      let hasTrip = false;
      if (existing) {
        const parsed = JSON.parse(existing) as Partial<Itinerary>;
        hasTrip = Boolean(parsed.flights?.length || parsed.lodging?.length || parsed.activities?.length);
      }
      if (hasTrip && !window.confirm("You are not signed in, so this browser holds one trip and this will replace it. Sign in instead to keep both. Replace it?")) return;
      localStorage.setItem(LS_KEY, JSON.stringify({ ...itinerary, title: itinerary.title ? `${itinerary.title} (copy)` : "My trip" }));
      router.push("/itinerary");
    } catch {
      setNote({ ok: false, text: "Could not copy it — please try again." });
    }
  }

  const buttonBase = "inline-flex items-center min-h-[44px] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition";

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-3">
        {/* A real link, so it opens the printable document rather than
            printing whatever this page happens to look like. */}
        <Link
          href={`/i/${shareId}/print`}
          target="_blank"
          className={`${buttonBase} border border-[var(--gold)] text-[var(--navy)] hover:bg-[var(--navy)] hover:text-white`}
        >
          Print / Save as PDF
        </Link>

        {signedIn === false ? (
          <>
            <Link
              href={signInHref()}
              className={`${buttonBase} border border-[var(--navy)] bg-[var(--navy)] text-white hover:border-[var(--gold)] hover:bg-[var(--gold)]`}
            >
              Sign in to add it to my trips
            </Link>
            <button type="button" onClick={copyLocally} className={`${buttonBase} border border-[var(--gold-light)] text-stone-600 hover:bg-[var(--cream-deep)]`}>
              Just open it in this browser
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy || signedIn === null}
            onClick={() => void addAsOwnTrip()}
            className={`${buttonBase} border border-[var(--navy)] bg-[var(--navy)] text-white hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60`}
          >
            {busy ? "Adding…" : "Add to my trips"}
          </button>
        )}
      </div>

      {signedIn === false && (
        <p className="mt-2 text-xs leading-5 text-stone-500">
          Signed in, this is added as a trip of its own and whatever you are already planning stays exactly as it is.
        </p>
      )}
      {note && <p className={`mt-2 text-xs font-semibold ${note.ok ? "text-emerald-700" : "text-red-700"}`}>{note.text}</p>}
    </div>
  );
}
