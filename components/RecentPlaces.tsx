"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RecentPlace } from "@/data/recent-places";

/**
 * PICK UP WHERE YOU LEFT OFF.
 *
 * Planning happens over a fortnight, on a phone in the evening and a laptop at
 * the weekend. This is the short way back to what somebody was reading, and it
 * is on the account rather than in one browser because that is the whole
 * point.
 *
 * IT SHOWS EVERYTHING IT KNOWS. Eight entries, a fortnight, and a button that
 * forgets them — there is no longer list behind this one. A traveller who can
 * see the whole of what is kept has nothing to wonder about.
 *
 * Nothing at all is rendered when the list is empty, so an account that has
 * not been anywhere does not carry a heading explaining that.
 */
export default function RecentPlaces() {
  const [recent, setRecent] = useState<RecentPlace[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/recent", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as { recent?: RecentPlace[] } | null;
        if (!cancelled && data?.recent) setRecent(data.recent);
      } catch {
        // Nothing to show is the right answer when nothing can be read.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (recent.length === 0) return null;

  async function forget() {
    setBusy(true);
    try {
      await fetch("/api/account/recent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "forget" }),
      });
      setRecent([]);
    } catch {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="account-recent" className="mt-8">
      <h2 id="account-recent" className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
        Pick up where you left off
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        The last few places you were reading about, on whichever device you were using. Kept for a fortnight, and never
        used for anything but this list.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {recent.map((place) => (
          <li key={place.href}>
            <Link
              href={place.href}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              {place.name}
            </Link>
            {place.where && <span className="ml-2 text-sm text-stone-500">{place.where}</span>}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => void forget()}
        disabled={busy}
        className="mt-4 inline-flex min-h-11 items-center rounded-md border border-[var(--gold-light)] bg-white px-4 text-sm font-semibold text-[var(--navy)] disabled:opacity-60"
      >
        Forget these
      </button>
    </section>
  );
}
