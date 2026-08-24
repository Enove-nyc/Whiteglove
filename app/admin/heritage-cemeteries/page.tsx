import Link from "next/link";
import HeritageAdminForm from "@/components/HeritageAdminForm";
import HeritageRemoveButton from "@/components/HeritageRemoveButton";
import { listAllHeritageCemeteries } from "@/lib/heritage-cemeteries";
import { heritageStoreAvailable } from "@/lib/heritage-cemeteries-store";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function AdminHeritageCemeteriesPage() {
  const [listings, storeReady] = await Promise.all([listAllHeritageCemeteries(), Promise.resolve(heritageStoreAvailable())]);
  const added = listings.filter((c) => c.added);

  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin" title="Heritage cemeteries" />
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          The batei hachaim locator — where each cemetery is, with a link to its source for the details. Most come from
          Nesiya Tova; the ones you add here sit alongside them on the map and in the locator, each with its own page
          that forwards to the source. No details are copied — a locator entry is a point and a link.
        </p>
        <p className="mt-3 text-sm text-stone-500">
          {listings.length.toLocaleString()} located · {added.length} added here · {(listings.length - added.length).toLocaleString()} built in
        </p>
      </header>

      <div className="mt-8">
        <Link
          href="/cemeteries#heritage"
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
        >
          View the locator
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Add a cemetery</h2>
        <HeritageAdminForm storeReady={storeReady} />
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
          Added here {added.length ? `(${added.length})` : ""}
        </h2>
        {added.length === 0 ? (
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
            Nothing added yet. Cemeteries you add appear here, alongside the built-in locator on the map and the page.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--gold-light)] border-y border-[var(--gold-light)]">
            {added.map((cem) => (
              <li key={cem.slug} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-sm text-[var(--navy)]">
                  <strong>{cem.name}</strong> — {cem.city}, {cem.country}{" "}
                  <Link href={`/cemeteries/heritage/${cem.slug}`} className="text-stone-500 underline decoration-stone-300 underline-offset-4">
                    page
                  </Link>{" "}
                  <a href={cem.sourceUrl} target="_blank" rel="noreferrer" className="text-stone-500 underline decoration-stone-300 underline-offset-4">
                    source
                  </a>
                </span>
                <HeritageRemoveButton slug={cem.slug} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
