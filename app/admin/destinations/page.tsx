import CompletenessQueue from "@/components/CompletenessQueue";
import DbSetupButton from "@/components/DbSetupButton";
import DestinationEditor from "@/components/DestinationEditor";
import DestinationPicker from "@/components/DestinationPicker";
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

  // When DATABASE_URL is set but the tables aren't created/seeded yet, the
  // query throws (missing table) or returns nothing — either way, show setup.
  let destinations: Awaited<ReturnType<typeof listDestinationsForAdmin>> = [];
  let needsSetup = false;
  if (dbReady) {
    try {
      destinations = await listDestinationsForAdmin();
      needsSetup = destinations.length === 0;
    } catch {
      needsSetup = true;
    }
  }
  const selected =
    dbReady && !needsSetup && slug ? await getDestinationForAdmin(slug) : null;

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Destination editor</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              Edit the phone numbers, names, addresses, hours, and contacts shown on each destination page. Changes go live within a minute — no code, no redeploy.
            </p>
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
      ) : needsSetup ? (
        <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <div className="border border-[var(--gold)] bg-[#fcfaf6] p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">One-time setup</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Set up your content database.</h2>
            <p className="mt-4 text-sm leading-7 text-stone-600">
              Your database is connected. Tap the button below once to create the tables and import all destinations from the current site (about 136 places). It takes roughly a minute. After it finishes, this page becomes your editor.
            </p>
            <div className="mt-6">
              <DbSetupButton />
            </div>
            <p className="mt-4 text-xs leading-5 text-stone-500">
              Safe to run again later — it reloads the imported content from the site&apos;s built-in data. Your own added listings live in separate tables and are not touched.
            </p>
          </div>
        </section>
      ) : (
        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[.9fr_2fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start space-y-6">
            <DestinationPicker destinations={destinations} selectedSlug={slug} />
            {/* Which records are thinnest, and what each is missing. The only
                place a percentage belongs. */}
            <CompletenessQueue />
            <details className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">
                Re-import built-in content
              </summary>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Reloads all destinations and the researched practical listings from the site&apos;s built-in data — use this after an update adds new content (e.g. the city-guide details). It refreshes the imported destinations, cemeteries, tzaddikim, contacts, and places.
              </p>
              <p className="mt-2 text-xs leading-5 text-amber-700">
                Note: this overwrites edits you made to <strong>imported</strong> destinations. Your added listings, page edits, and promotions are kept.
              </p>
              <div className="mt-4">
                <DbSetupButton
                  label="Re-import content now"
                  confirmMessage="Re-import the built-in content? This reloads imported destinations and practical listings and will overwrite edits made to imported destinations. Your added listings and page edits are kept."
                />
              </div>
            </details>
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
    </>
  );
}
