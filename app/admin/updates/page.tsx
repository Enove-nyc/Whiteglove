import CurrentUpdatesManager from "@/components/CurrentUpdatesManager";
import { currentUpdatesStoreAvailable, readUpdatesFresh } from "@/lib/current-updates-store";
import { destinations } from "@/data/destinations";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function UpdatesAdminPage() {
  // The server's date, handed down, so the screen and the public pages agree
  // about what is current rather than each asking the browser.
  const today = new Date().toISOString().slice(0, 10);
  const [updates, storeReady] = await Promise.all([
    readUpdatesFresh(today),
    Promise.resolve(currentUpdatesStoreAvailable()),
  ]);

  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin" title="Current updates" />
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Short, dated notices on a destination page — a restaurant that moved, a minyan running only over Sukkos, a
          seasonal programme. Every one needs a date it stops being true, and it disappears on its own when it does.
        </p>
      </header>
      <CurrentUpdatesManager
        updates={updates}
        // Slug and name only — the picker needs nothing else, and handing a
        // client component the whole destination table would ship the guide to
        // the browser to fill a dropdown.
        destinations={destinations.map((d) => ({ slug: d.slug, name: `${d.city}, ${d.country}` })).sort((a, b) => a.name.localeCompare(b.name))}
        today={today}
        storeReady={storeReady}
      />
    </>
  );
}
