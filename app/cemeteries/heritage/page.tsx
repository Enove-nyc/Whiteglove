import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StructuredData from "@/components/StructuredData";
import { heritageCemeteries } from "@/data/heritage-cemeteries";
import { placeMapUrl } from "@/data/route-utils";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Heritage cemetery locator | White Glove Kosher Travel",
  description:
    "A worldwide locator of Jewish cemeteries from Nesiya Tova — where each bais hachaim is, with a link to the source for access and details. Confirm access before travelling.",
  path: "/cemeteries/heritage",
});

/**
 * The Nesiya Tova locator set, grouped by country.
 *
 * Deliberately not a set of rich kever pages — these are locations with a
 * source, nothing invented. Each links out to Nesiya Tova for the live
 * details, and the map plots them alongside the curated grounds.
 */
export default function HeritageCemeteriesPage() {
  const byCountry = new Map<string, typeof heritageCemeteries>();
  for (const cem of heritageCemeteries) {
    const list = byCountry.get(cem.country) ?? [];
    list.push(cem);
    byCountry.set(cem.country, list);
  }
  const countries = [...byCountry.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Kosher travel", path: "/kosher-travel" },
          { name: "Cemeteries", path: "/cemeteries" },
          { name: "Heritage locator", path: "/cemeteries/heritage" },
        ])}
      />
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Kosher travel</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.08] text-[var(--navy)]">
            Heritage cemetery locator
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">
            {heritageCemeteries.length.toLocaleString()} batei hachaim across {countries.length} countries,
            located from Nesiya Tova&rsquo;s heritage database. These are locations, not full guides — each
            links to Nesiya Tova for access, hours and contacts. Many grounds are locked; confirm access
            before travelling.
          </p>
          <p className="mt-4 max-w-3xl leading-7 text-stone-600">
            The larger grounds and kevarim of tzaddikim have their own{" "}
            <Link href="/cemeteries" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">
              cemetery pages
            </Link>
            , and every location here is also on the{" "}
            <Link href="/map" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">
              map
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="space-y-4">
          {countries.map(([country, list]) => (
            <details key={country} className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-5">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">
                <span>{country}</span>
                <span className="text-sm font-normal tabular-nums text-stone-500">{list.length}</span>
              </summary>
              <ul className="mt-4 grid gap-2 border-t border-[var(--gold-light)] pt-4 sm:grid-cols-2">
                {list
                  .slice()
                  .sort((a, b) => a.city.localeCompare(b.city))
                  .map((cem) => (
                    <li key={cem.slug} className="flex items-baseline justify-between gap-3 text-sm">
                      <Link
                        href={`/cemeteries/heritage/${cem.slug}`}
                        className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4"
                      >
                        {cem.city}
                      </Link>
                      <a
                        href={placeMapUrl(cem.address, cem.coordinates)}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-stone-500 underline decoration-stone-300 underline-offset-4"
                      >
                        Map
                      </a>
                    </li>
                  ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
