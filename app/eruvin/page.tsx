import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import SectionHeading from "@/components/SectionHeading";
import StructuredData from "@/components/StructuredData";
import { listAllEruvin, WORLDWIDE_ERUV_DIRECTORY } from "@/lib/eruvin";
import { resolvePage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Eruvin — community eruvin for Jewish travel | White Glove Kosher Travel",
  description:
    "Community eruvin for Jewish travel, each linked to a source that establishes it and a boundary map where the community publishes one. An eruv can be down on any Shabbos — rely on the community's own word before you carry.",
  path: "/eruvin",
});

/**
 * Community eruvin, each pointing at a source that establishes it.
 *
 * A listing says the community maintains an eruv and links what documents it —
 * the community's own page, or an authoritative reference — with a boundary map
 * where one is published. It is never a claim that the eruv is up on the day
 * you travel; the community's own current word is what a traveller relies on.
 */
export default async function EruvinPage() {
  const listings = await listAllEruvin();
  const page = await resolvePage("eruvin");
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
          { name: "Eruvin", path: "/eruvin" },
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
            Eruvin
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">
            These are communities that maintain an eruv, each with a source that establishes it
            and, where the community publishes one, a map of its boundary. An eruv can come down
            on any Shabbos — the community&rsquo;s own current word is what to rely on before you carry.
          </p>
        </div>
      </section>
      )}

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <SectionHeading eyebrow="Community eruvin" title="By country" />
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
                    {listing.covers && (
                      <p className="mt-2 text-sm leading-6 text-stone-600">Covers {listing.covers}.</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                      <a
                        href={listing.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                      >
                        See the community eruv
                      </a>
                      {listing.mapUrl && (
                        <a
                          href={listing.mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                        >
                          Boundary map
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-12 max-w-3xl leading-7 text-stone-600">
          A community not listed here can be found on the{" "}
          <a
            href={WORLDWIDE_ERUV_DIRECTORY}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
          >
            worldwide eruv directory
          </a>
          . Whichever one you rely on, its own status the day you travel is the only one that counts.
        </p>
      </section>

      <Footer />
    </main>
  );
}
