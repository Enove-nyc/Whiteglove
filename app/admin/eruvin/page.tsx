import Link from "next/link";
import EruvAdminForm from "@/components/EruvAdminForm";
import EruvRemoveButton from "@/components/EruvRemoveButton";
import { listAllEruvin } from "@/lib/eruvin";
import { eruvinStoreAvailable } from "@/lib/eruvin-store";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function AdminEruvinPage() {
  const [listings, storeReady] = await Promise.all([listAllEruvin(), Promise.resolve(eruvinStoreAvailable())]);
  const added = listings.filter((e) => e.added);

  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin" title="Eruvin" />
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Community eruvin for the public page. Each listing says the community maintains an eruv and links a source that
          establishes it — never a claim that the eruv is up — so the source link is the one field that must be a working
          web address. A boundary map is welcome where the community publishes one.
        </p>
        <p className="mt-3 text-sm text-stone-500">
          {listings.length} listed · {added.length} added here · {listings.length - added.length} built in
        </p>
      </header>

      <div className="mt-8">
        <Link
          href="/eruvin"
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
        >
          View public page
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Add an eruv</h2>
        <EruvAdminForm storeReady={storeReady} />
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
          Added here {added.length ? `(${added.length})` : ""}
        </h2>
        {added.length === 0 ? (
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
            Nothing added yet. Eruvin you add appear here, alongside the built-in list on the public page.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--gold-light)] border-y border-[var(--gold-light)]">
            {added.map((eruv) => (
              <li key={eruv.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-sm text-[var(--navy)]">
                  <strong>{eruv.name}</strong> — {eruv.city}, {eruv.country}
                  {eruv.covers ? <span className="text-stone-500"> · {eruv.covers}</span> : null}{" "}
                  <a href={eruv.sourceUrl} target="_blank" rel="noreferrer" className="text-stone-500 underline decoration-stone-300 underline-offset-4">
                    source
                  </a>
                  {eruv.mapUrl ? (
                    <>
                      {" · "}
                      <a href={eruv.mapUrl} target="_blank" rel="noreferrer" className="text-stone-500 underline decoration-stone-300 underline-offset-4">
                        map
                      </a>
                    </>
                  ) : null}
                </span>
                <EruvRemoveButton id={eruv.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
