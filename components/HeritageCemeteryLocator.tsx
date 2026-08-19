import Link from "next/link";
import { listAllHeritageCemeteries, type HeritageCemeteryListing } from "@/lib/heritage-cemeteries";
import { placeMapUrl } from "@/data/route-utils";

/**
 * The Nesiya Tova locator set, grouped by country.
 *
 * It used to be a page of its own at /cemeteries/heritage; it lives inside the
 * cemetery directory now, so one page holds both the curated grounds and the
 * worldwide locator. Each town links to its own page (our trip buttons, and a
 * forward to Nesiya Tova for the details); the Map link is a quick way straight
 * to directions.
 *
 * Deliberately not rich pages — these are locations with a source, nothing
 * invented. Many grounds are locked; the note says to confirm access first.
 */
export default async function HeritageCemeteryLocator() {
  const heritageCemeteries = await listAllHeritageCemeteries();
  const byCountry = new Map<string, HeritageCemeteryListing[]>();
  for (const cem of heritageCemeteries) {
    const list = byCountry.get(cem.country) ?? [];
    list.push(cem);
    byCountry.set(cem.country, list);
  }
  const countries = [...byCountry.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <section id="heritage" className="mt-16 scroll-mt-28 border-t border-[var(--gold-light)] pt-12">
      <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Heritage cemetery locator</p>
      <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
        Batei hachaim worldwide
      </h2>
      <p className="mt-4 max-w-3xl leading-7 text-stone-600">
        {heritageCemeteries.length.toLocaleString()} batei hachaim across {countries.length} countries, located from
        Nesiya Tova&rsquo;s heritage database. These are locations, not full guides — each opens a page with directions
        and White Glove&rsquo;s trip tools, and forwards to Nesiya Tova for access, hours and contacts. Many grounds are
        locked; confirm access before travelling.
      </p>

      <div className="mt-8 space-y-4">
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
  );
}
