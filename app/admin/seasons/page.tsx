import SeasonalWindowsManager from "@/components/SeasonalWindowsManager";
import { PageHeader } from "@/components/ui/PageHeader";
import { readSeasonalWindowsFresh, seasonalStoreAvailable } from "@/lib/seasonal-windows-store";
import { spotlightCounts, MIN_SPOTLIGHT_DESTINATIONS } from "@/lib/seasonal-spotlight-view";
import { getVacationDestinations } from "@/lib/vacation-destinations-view";

export const dynamic = "force-dynamic";

export default async function SeasonsAdminPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [windows, destinations] = await Promise.all([readSeasonalWindowsFresh(today), getVacationDestinations()]);

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
    </>
  );
}
