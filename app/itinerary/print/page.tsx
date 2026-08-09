"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PrintableItinerary from "@/components/PrintableItinerary";
import { emptyItinerary, type Itinerary } from "@/data/itinerary";
import { useKeverBurials } from "@/lib/use-kever-burials";
import { usePlannerAssumptions } from "@/components/usePlannerAssumptions";

// The traveler printing their own trip.
//
// The document itself lives in PrintableItinerary, so this and the shared
// print produce the same PDF rather than two that drift apart.
//
// THE COPY IS CLAIMED BEFORE IT IS DRAWN. A free account gets one printable
// copy a week (lib/account-limits.ts), and the check has to happen before the
// itinerary is on the page — rendering it and then covering it up would put the
// whole trip in the HTML for anybody who opens the inspector. Not signed in is
// never refused, and every failure on the way lets the copy through: being told
// no at a printer because a store blinked is worse than one extra copy.

const LS_KEY = "whiteGloveItinerary";

// A stable empty array, so the burials hook does not re-fetch every render
// while the itinerary is still loading.
const EMPTY_ACTIVITIES: Itinerary["activities"] = [];

type Claim = { allowed: boolean; message: string };

export default function PrintItineraryPage() {
  const [itin, setItin] = useState<Itinerary | null>(null);
  const [claim, setClaim] = useState<Claim | null>(null);

  useEffect(() => {
    (async () => {
      // Asked first, and awaited, so nothing is drawn until the answer is in.
      let tripId = "";
      let loaded: Itinerary | null = null;
      try {
        const res = await fetch("/api/account/itinerary", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          tripId = typeof data?.tripId === "string" ? data.tripId : "";
          if (data?.itinerary) loaded = { ...emptyItinerary(), ...data.itinerary };
        }
      } catch {
        /* not signed in */
      }

      try {
        const res = await fetch("/api/account/print", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId }),
        });
        const answer = (await res.json()) as Claim;
        setClaim(answer?.allowed === false ? { allowed: false, message: answer.message } : { allowed: true, message: "" });
        if (answer?.allowed === false) return;
      } catch {
        setClaim({ allowed: true, message: "" });
      }

      if (loaded) {
        setItin(loaded);
        return;
      }
      try {
        const local = localStorage.getItem(LS_KEY);
        setItin(local ? { ...emptyItinerary(), ...JSON.parse(local) } : emptyItinerary());
      } catch {
        setItin(emptyItinerary());
      }
    })();
  }, []);

  const burials = useKeverBurials(itin?.activities ?? EMPTY_ACTIVITIES);
  // Waited for here, unlike everywhere else this is read. A page somebody is
  // about to send to a printer should be laid out once, with the right times
  // on it, rather than redrawn under their hands.
  const { assume, ready } = usePlannerAssumptions();

  if (claim && !claim.allowed) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">
          Not this week
        </h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">{claim.message}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/itinerary"
            className="bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white"
          >
            Back to my trip
          </Link>
          <Link
            href="/account"
            className="border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
          >
            My account
          </Link>
        </div>
      </main>
    );
  }

  if (!itin || !ready || !claim) return <main className="p-10 text-sm text-stone-500">Loading your itinerary…</main>;

  return <PrintableItinerary itin={itin} burials={burials} assume={assume} />;
}
