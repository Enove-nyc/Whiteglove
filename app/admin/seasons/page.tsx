import SeasonalWindowsManager from "@/components/SeasonalWindowsManager";
import PlanningNowManager from "@/components/PlanningNowManager";
import { PageHeader } from "@/components/ui/PageHeader";
import { readSeasonalWindowsFresh, seasonalStoreAvailable } from "@/lib/seasonal-windows-store";
import { planningNowStoreAvailable, readPlanningChipsFresh } from "@/lib/planning-now-store";
import { spotlightCounts, MIN_SPOTLIGHT_DESTINATIONS } from "@/lib/seasonal-spotlight-view";
import { getVacationDestinations } from "@/lib/vacation-destinations-view";

export const dynamic = "force-dynamic";

export default async function SeasonsAdminPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [windows, destinations, chips] = await Promise.all([
    readSeasonalWindowsFresh(today),
    getVacationDestinations(),
    readPlanningChipsFresh(today),
  ]);

  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin" title="Seasons" />
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          When a Yom Tov prompt appears on the front page and above the destination filters. Pesach and Sukkos already
          follow the calendar every year — change the dates only if you want a different run-up. Yeshiva week is not a
          date anybody can work out, so it shows only if you set one.
        </p>
      </header>
      <SeasonalWindowsManager
        windows={windows}
        today={today}
        counts={spotlightCounts(destinations)}
        minimum={MIN_SPOTLIGHT_DESTINATIONS}
        storeReady={seasonalStoreAvailable()}
      />
      {/* The other half of "what does the front page say about the time of
          year" — same screen, separate store, so one being unavailable does
          not take the other down with it. */}
      <PlanningNowManager chips={chips} today={today} storeReady={planningNowStoreAvailable()} />
    </>
  );
}
