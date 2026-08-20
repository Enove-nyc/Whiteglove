import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import SectionHeading from "@/components/SectionHeading";
import SourceNote from "@/components/SourceNote";
import StructuredData from "@/components/StructuredData";
import { listPublishedMikvaos } from "@/lib/mikvaos";
import { resolvePage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";
import { placeMapUrl } from "@/data/route-utils";

// Not force-dynamic. listPublishedMikvaos (lib/mikvaos.ts) is a tagged
// unstable_cache now, busted the moment a practical listing is actually
// written, rather than this page running a real database read on every
// visit.
export const metadata = pageMetadata({
  title: "Mikvaos — source-backed listings for travel | White Glove Kosher Travel",
  description:
    "Mikvah listings White Glove holds for Jewish travel, with addresses, contacts and the source behind each one. Confirm access and hours locally before you go.",
  path: "/mikvaos",
});

/**
 * Source-backed mikvah listings, in one place.
 *
 * These are White Glove curated listings from PracticalPlace (category MIKVAH)
 * or the static seed catalog when the database is empty — never an OSM dump.
 */
export default async function MikvaosPage() {
  const listings = await listPublishedMikvaos();
  const page = await resolvePage("mikvaos");
  const byCountry = new Map<string, typeof listings>();
  for (const listing of listings) {
    const list = byCountry.get(listing.country) ?? [];
    list.push(listing);
    byCountry.set(listing.country, list);
  }

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Kosher travel", path: "/kosher-travel" },
          { name: "Mikvaos", path: "/mikvaos" },
        ])}
      />
      <Navbar />

      {page?.edited ? (
        <PageBlocks blocks={page.blocks} />
      ) : (
      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Kosher travel</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.08] text-[var(--navy)]">
            Mikvaos
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">
            {listings.length > 0
              ? "Every listing carries its source. Hours and access change — confirm with the community before you travel."
              : "Mikvah listings appear here once they have a source and are ready to publish."}
          </p>
          <p className="mt-4 max-w-3xl leading-7 text-stone-600">
            Looking for halachic times for a place?{" "}
            <Link
              href="/zmanim"
              className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              Open zmanim
            </Link>
            .
          </p>
        </div>
      </section>
      )}

      {listings.length === 0 ? (
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <p className="max-w-2xl leading-7 text-stone-600">
            Nothing published yet. Destination guides and the{" "}
            <Link href="/kosher-travel" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">
              kosher travel hub
            </Link>{" "}
            still cover how mikvaos fit into trip planning.
          </p>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <SectionHeading eyebrow="Listings" title="By country" />
          <div className="mt-10 space-y-12">
            {[...byCountry].map(([country, list]) => (
              <div key={country}>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{country}</h2>
                <ul className="mt-5 grid gap-4 md:grid-cols-2">
                  {list.map((listing) => (
                    <li key={listing.id} className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                        {listing.city}
                      </p>
                      <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">
                        {listing.name}
                      </h3>
                      {listing.address && (
                        <p className="mt-2 text-sm leading-6 text-stone-600">{listing.address}</p>
                      )}
                      {listing.hours && (
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          <span className="font-semibold text-[var(--navy)]">Hours:</span> {listing.hours}
                        </p>
                      )}
                      {listing.notes && (
                        <p className="mt-2 text-sm leading-6 text-stone-600">{listing.notes}</p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-3 text-sm">
                        {listing.phone && (
                          <a
                            href={`tel:${listing.phone.replace(/[^+\d]/g, "")}`}
                            className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                          >
                            Call
                          </a>
                        )}
                        {listing.website && (
                          <a
                            href={listing.website}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                          >
                            Website
                          </a>
                        )}
                        {listing.address && (
                          <a
                            href={placeMapUrl(listing.address, listing.coordinates)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                          >
                            Map
                          </a>
                        )}
                        <Link
                          href={listing.href}
                          className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                        >
                          Destination
                        </Link>
                      </div>
                      {listing.sourceUrl && <SourceNote url={listing.sourceUrl} className="mt-2" />}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
