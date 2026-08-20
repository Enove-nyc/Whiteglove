import Link from "next/link";
import KosherApartmentAdminForm from "@/components/KosherApartmentAdminForm";
import KosherApartmentRemoveButton from "@/components/KosherApartmentRemoveButton";
import { listAllApartmentProviders } from "@/lib/kosher-apartments";
import { apartmentsStoreAvailable } from "@/lib/kosher-apartments-store";

export const dynamic = "force-dynamic";

export default async function AdminKosherApartmentsPage() {
  const [listings, storeReady] = await Promise.all([
    listAllApartmentProviders(),
    Promise.resolve(apartmentsStoreAvailable()),
  ]);
  const added = listings.filter((p) => p.added);

  return (
    <>
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove admin</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Kosher apartments</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          The sites, agencies and hosts that rent kosher-equipped apartments and vacation flats — for the Where to stay
          page. These are where a traveller goes to <em>find</em> an apartment, not a booking we take. Each needs at least
          one way to reach it: a website, a phone number, or a WhatsApp number.
        </p>
        <p className="mt-3 text-sm text-stone-500">
          {listings.length} listed · {added.length} added here · {listings.length - added.length} built in
        </p>
      </header>

      <div className="mt-8">
        <Link
          href="/hotels"
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
        >
          View public page
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Add a provider</h2>
        <KosherApartmentAdminForm storeReady={storeReady} />
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
          Added here {added.length ? `(${added.length})` : ""}
        </h2>
        {added.length === 0 ? (
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
            Nothing added yet. Providers you add appear here, and in the Kosher apartments section of the Where to stay
            page.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--gold-light)] border-y border-[var(--gold-light)]">
            {added.map((provider) => (
              <li key={provider.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-sm text-[var(--navy)]">
                  <strong>{provider.name}</strong> — {provider.area}
                  {provider.note ? <span className="text-stone-500"> · {provider.note}</span> : null}{" "}
                  {provider.url ? (
                    <a
                      href={provider.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-stone-500 underline decoration-stone-300 underline-offset-4"
                    >
                      website
                    </a>
                  ) : null}
                  {provider.phone ? <span className="text-stone-500"> · {provider.phone}</span> : null}
                  {provider.whatsapp ? <span className="text-stone-500"> · WhatsApp {provider.whatsapp}</span> : null}
                </span>
                <KosherApartmentRemoveButton id={provider.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
