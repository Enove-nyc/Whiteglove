import Link from "next/link";
import DestinationEditor from "@/components/DestinationEditor";
import {
  getDestinationForAdmin,
  isDbEnabled,
  listDestinationsForAdmin,
} from "@/lib/content-admin";

// Admin data must always reflect the latest DB state.
export const dynamic = "force-dynamic";

export default async function AdminDestinationsPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;
  const dbReady = isDbEnabled();

  const destinations = dbReady ? await listDestinationsForAdmin() : [];
  const selected = dbReady && slug ? await getDestinationForAdmin(slug) : null;

  // Group the picker by country for a friendly, scannable list.
  const byCountry = new Map<string, typeof destinations>();
  for (const destination of destinations) {
    const list = byCountry.get(destination.country) ?? [];
    list.push(destination);
    byCountry.set(destination.country, list);
  }
  const countries = [...byCountry.keys()].sort();

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <header className="border-b border-[var(--gold-light)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Destination editor</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              Edit the phone numbers, names, addresses, hours, and contacts shown on each destination page. Changes go live within a minute — no code, no redeploy.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Dashboard</Link>
            <Link href="/admin/content" className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Content manager</Link>
          </div>
        </div>
      </header>

      {!dbReady ? (
        <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Not connected yet</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">The content database isn&apos;t connected.</h2>
            <p className="mt-4 text-sm leading-7 text-stone-600">
              Once the database is set up, this page becomes your editor for every destination&apos;s practical details. Setup is a one-time step: create a free Neon database, add its connection string as <code className="rounded bg-[var(--cream)] px-1">DATABASE_URL</code>, then run the import. Full instructions are in <code className="rounded bg-[var(--cream)] px-1">docs/DATABASE.md</code>.
            </p>
          </div>
        </section>
      ) : (
        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[.9fr_2fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <form method="get" className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
              <label htmlFor="slug" className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Choose a destination</label>
              <select
                id="slug"
                name="slug"
                defaultValue={slug ?? ""}
                className="mt-3 w-full border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)]"
              >
                <option value="" disabled>Select a city…</option>
                {countries.map((country) => (
                  <optgroup key={country} label={country}>
                    {byCountry.get(country)!.map((destination) => (
                      <option key={destination.slug} value={destination.slug}>
                        {destination.city}
                        {destination._count.places || destination._count.contacts
                          ? ` (${destination._count.places} listings, ${destination._count.contacts} contacts)`
                          : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button type="submit" className="mt-4 w-full bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)]">
                Open editor
              </button>
              <p className="mt-3 text-xs leading-5 text-stone-500">{destinations.length} destinations in the database.</p>
            </form>
          </aside>

          <div>
            {selected ? (
              <DestinationEditor destination={selected} />
            ) : (
              <div className="border border-dashed border-[var(--gold-light)] p-10 text-center">
                <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Pick a destination to start editing.</p>
                <p className="mt-2 text-sm text-stone-600">Choose a city on the left and press “Open editor.”</p>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
