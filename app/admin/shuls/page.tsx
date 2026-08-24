import Link from "next/link";
import ShulAdminForm from "@/components/ShulAdminForm";
import ShulRemoveButton from "@/components/ShulRemoveButton";
import { listPublishedShuls } from "@/lib/shuls";
import { shulsStoreAvailable } from "@/lib/shuls-store";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function AdminShulsPage() {
  const [listings, storeReady] = await Promise.all([listPublishedShuls(), Promise.resolve(shulsStoreAvailable())]);
  const added = listings.filter((s) => s.added);

  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin" title="Shuls" />
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Shuls and minyanim for the public directory. Most come from the towns&rsquo; own write-ups and the built-in
          catalog; the ones you add here belong to no town on the site. Each needs a source, and coordinates put it on
          the map. Hours are not stored — a shul&rsquo;s zmanim change, so the link is how a reader gets them.
        </p>
        <p className="mt-3 text-sm text-stone-500">
          {listings.length} listed · {added.length} added here · {listings.length - added.length} built in
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/destinations"
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white"
        >
          Add a shul under a town
        </Link>
        <Link
          href="/shuls"
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
        >
          View public page
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Add a shul</h2>
        <ShulAdminForm storeReady={storeReady} />
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
          Added here {added.length ? `(${added.length})` : ""}
        </h2>
        {added.length === 0 ? (
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
            Nothing added yet. Shuls you add appear here, alongside the built-in directory on the public page.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--gold-light)] border-y border-[var(--gold-light)]">
            {added.map((shul) => (
              <li key={shul.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-sm text-[var(--navy)]">
                  <strong>{shul.name}</strong> — {shul.city}, {shul.country}
                  {shul.coordinates ? <span className="text-stone-500"> · on the map</span> : null}{" "}
                  <a href={shul.href} target="_blank" rel="noreferrer" className="text-stone-500 underline decoration-stone-300 underline-offset-4">
                    link
                  </a>
                </span>
                <ShulRemoveButton id={shul.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
