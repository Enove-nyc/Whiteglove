"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Itinerary } from "@/data/itinerary";
import { useRequireSignIn } from "@/components/SignInGate";
import { useSignedIn } from "@/lib/use-signed-in";

/**
 * What you can do with a trip somebody shared with you.
 *
 * Adding it used to replace whatever was in the planner, with a confirm box as
 * the only warning — so somebody who had spent an hour on Poland and was then
 * sent a friend's Uman itinerary had to choose between them. An account holds
 * as many trips as it needs, so adding a shared one now makes a trip of its
 * own and leaves everything else exactly where it was.
 *
 * NO SIGNED-OUT LOCAL COPY ANY MORE. There used to be a second button that
 * wrote the shared trip into this browser's own storage instead of an
 * account — exactly the kind of browser-only plan the brief says not to
 * keep. Pressing "Add to my itineraries" signed out now opens the sign-in dialog
 * and completes the same save the moment it succeeds.
 */
export default function SharedItineraryActions({ itinerary, shareId }: { itinerary: Itinerary; shareId: string }) {
  const router = useRouter();
  const signedIn = useSignedIn();
  const requireSignIn = useRequireSignIn();
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

        <button
          type="button"
          disabled={busy || signedIn === null}
          onClick={() => requireSignIn(() => void addAsOwnTrip(), "Sign in to save")}
          className={`${buttonBase} border border-[var(--navy)] bg-[var(--navy)] text-white hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60`}
        >
          {busy ? "Adding…" : "Add to my itineraries"}
        </button>
      </div>

      {note && <p className={`mt-2 text-xs font-semibold ${note.ok ? "text-emerald-700" : "text-red-700"}`}>{note.text}</p>}
    </div>
  );
}
