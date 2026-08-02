"use client";

import { useEffect, useState } from "react";
import PrintableItinerary from "@/components/PrintableItinerary";
import { emptyItinerary, type Itinerary } from "@/data/itinerary";
import { useKeverBurials } from "@/lib/use-kever-burials";
import { usePlannerAssumptions } from "@/components/usePlannerAssumptions";

// The traveler printing their own trip.
//
// The document itself lives in PrintableItinerary, so this and the shared
// print produce the same PDF rather than two that drift apart.

const LS_KEY = "whiteGloveItinerary";

// A stable empty array, so the burials hook does not re-fetch every render
// while the itinerary is still loading.
const EMPTY_ACTIVITIES: Itinerary["activities"] = [];

export default function PrintItineraryPage() {
  const [itin, setItin] = useState<Itinerary | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/account/itinerary", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data?.itinerary) {
            setItin({ ...emptyItinerary(), ...data.itinerary });
            return;
          }
        }
      } catch {
        /* not signed in */
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

  if (!itin || !ready) return <main className="p-10 text-sm text-stone-500">Loading your itinerary…</main>;

  return <PrintableItinerary itin={itin} burials={burials} assume={assume} />;
}
