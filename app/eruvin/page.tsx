import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SectionHeading from "@/components/SectionHeading";
import StructuredData from "@/components/StructuredData";
import { listEruvin, WORLDWIDE_ERUV_DIRECTORY } from "@/lib/eruvin";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Eruvin — community eruv status for travel | White Glove Kosher Travel",
  description:
    "Community eruvin for Jewish travel, each linked to its own status page. An eruv can be down on any Shabbos — always check the community's status before you carry.",
  path: "/eruvin",
});

/**
 * Community eruvin, each pointing at its own status page.
 *
 * The page leads with the one thing that matters: an eruv's status changes
 * every week, so the listing is a route to the community's live status rather
 * than a claim about it.
 */
export default function EruvinPage() {
  const listings = listEruvin();
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

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Kosher travel</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.08] text-[var(--navy)]">
            Eruvin
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">
            An eruv can come down on any Shabbos, sometimes without notice. Each community
            posts its own status every Erev Shabbos — check it before you carry. These
            listings link you straight to it.
          </p>
        </div>
      </section>

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
                    <div className="mt-4">
                      <a
                        href={listing.statusUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                      >
                        Check this week&rsquo;s status
                      </a>
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
