import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StructuredData from "@/components/StructuredData";
import { PageHeader } from "@/components/ui/PageHeader";
import { fridayOf, isEmpty, samePlaceName, shabbosIn, type ShabbosListing } from "@/data/shabbos-mode";
import { vacationDestinations } from "@/data/vacation-destinations";
import { kosherEateries } from "@/data/kosher-eateries";
import { listAllEruvin } from "@/lib/eruvin";
import { listPublishedMikvaos } from "@/lib/mikvaos";
import { listPublishedShuls } from "@/lib/shuls";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";
import { zmanimForDay } from "@/lib/zmanim-day-calculate";
import { zmanimPlaces } from "@/lib/zmanim-places";

/**
 * SHABBOS IN ONE PLACE.
 *
 * Everything here already existed, on five different pages: the shuls on
 * /shuls, the mikvaos on /mikvaos, the eruv on /eruvin, the food on /kosher,
 * the times on /zmanim. On a Thursday, in a city somebody does not know, that
 * is five searches to answer one question. This is the one page.
 *
 * NOTHING IS INVENTED FOR IT — see data/shabbos-mode.ts, which is where the
 * gathering lives and where the three refusals are written down: no minyan
 * time that was not published, no restaurant offered for Shabbos itself, no
 * walking distance from a starting point the site does not know.
 *
 * THE TIMES ARE COMPUTED, NOT FETCHED, by the same lib/zmanim-day-calculate.ts
 * the zmanim page uses — so this page cannot disagree with that one, and it
 * still works when nothing external answers. Candle-lighting is Friday's;
 * Shabbos ends at tzeis on Saturday. Both carry the site's standing caution to
 * confirm locally, because a computed time is not a local zman.
 */

export const revalidate = 3600;

export async function generateStaticParams() {
  return vacationDestinations.map((destination) => ({ destination: destination.slug }));
}

function destinationBySlug(slug: string) {
  return vacationDestinations.find((entry) => entry.slug === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ destination: string }> }) {
  const { destination: slug } = await params;
  const destination = destinationBySlug(slug);
  if (!destination) return pageMetadata({ title: "Shabbos", description: "", path: `/shabbos/${slug}`, noIndex: true });
  return pageMetadata({
    title: `Shabbos in ${destination.name} — shuls, mikvaos, eruv and times`,
    description: `Candle-lighting and the end of Shabbos in ${destination.name}, with the shuls, mikvaos, eruv and where to buy food before it comes in.`,
    path: `/shabbos/${slug}`,
  });
}

/** The two times that decide a Shabbos. Null when there is nowhere to compute from. */
function shabbosTimes(coordinates: string | null, country: string, friday: string) {
  if (!coordinates) return null;
  const shabbos = new Date(`${friday}T12:00:00Z`);
  shabbos.setUTCDate(shabbos.getUTCDate() + 1);
  const saturday = shabbos.toISOString().slice(0, 10);

  const place = { coordinates, country };
  const entriesOf = (date: string, id: string) =>
    zmanimForDay({ date, evening: place })
      .blocks.flatMap((block) => block.entries)
      .find((entry) => entry.id === id)?.time ?? null;

  const placeName = zmanimForDay({ date: friday, evening: place }).blocks[0]?.placeName ?? "";
  return {
    placeName,
    candleLighting: entriesOf(friday, "candle-lighting"),
    ends: entriesOf(saturday, "tzeit"),
  };
}

/**
 * A section's listings, or nothing at all.
 *
 * IT USED TO SAY "No mikvah is listed here yet." That is the site telling a
 * customer which records the owner has not filled in — a status line about the
 * database dressed as information about the town — and "yet" makes it a
 * promise as well. A traveller who needs a mikvah in Rome learns nothing from
 * it except that we do not have one, which is what an absent section says
 * anyway, without the apology.
 *
 * So the section does not render. The caller checks first: a heading over
 * nothing is the same defect one line higher up.
 */
function ListingRows({ rows }: { rows: ShabbosListing[] }) {
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => (
        <li key={row.id} className="border-l-2 border-[var(--gold-light)] pl-4">
          <Link href={row.href} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold-light)] underline-offset-4">
            {row.name}
          </Link>
          {row.address && <p className="mt-1 text-sm leading-6 text-stone-600">{row.address}</p>}
          {/* Only ever what the source published. */}
          {row.hours && <p className="mt-1 text-sm leading-6 text-stone-600">{row.hours}</p>}
          {row.phone && <p className="mt-1 text-sm leading-6 text-stone-600">{row.phone}</p>}
        </li>
      ))}
    </ul>
  );
}

export default async function ShabbosModePage({ params }: { params: Promise<{ destination: string }> }) {
  const { destination: slug } = await params;
  const destination = destinationBySlug(slug);
  if (!destination) notFound();

  const [shuls, mikvaos, eruvin] = await Promise.all([listPublishedShuls(), listPublishedMikvaos(), listAllEruvin()]);

  const place = shabbosIn({
    name: destination.name,
    cities: destination.cities,
    country: destination.country,
    shuls,
    mikvaos,
    eruvin,
    food: kosherEateries.map((eatery) => ({
      id: eatery.slug,
      name: eatery.name,
      city: eatery.city,
      country: eatery.country,
      kind: eatery.kind,
      address: eatery.address ?? null,
      hours: null,
      phone: null,
      website: eatery.website ?? null,
      href: `/kosher#${eatery.slug}`,
    })),
  });

  // Coordinates for the times: the site's own zmanim places first, since they
  // carry a real IANA timezone, then any shul in the destination that
  // published its own. Neither is a guess; without either, the page shows the
  // listings and no times rather than a time from an invented centre.
  const zmanimPlace = zmanimPlaces().find(
    (entry) =>
      samePlaceName(entry.country, destination.country) &&
      destination.cities.some((city) => samePlaceName(entry.city, city)),
  );
  const coordinates = zmanimPlace?.coordinates ?? shuls.find((s) => s.coordinates && place.shuls.some((p) => p.id === s.id))?.coordinates ?? null;

  const friday = fridayOf(new Date());
  const times = shabbosTimes(coordinates, destination.country, friday);

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: destination.name, path: `/destinations/${destination.slug}` },
          { name: "Shabbos", path: `/shabbos/${destination.slug}` },
        ])}
      />
      <Navbar />

      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <Breadcrumbs trail={[{ name: destination.name, href: `/destinations/${destination.slug}` }, { name: "Shabbos" }]} />
        <PageHeader
          eyebrow="Shabbos"
          title={`Shabbos in ${destination.name}`}
          description="The shuls, the mikvaos, the eruv, and where to buy before it comes in — everything this site has for one Shabbos, on one page."
        />

        {times && (times.candleLighting || times.ends) && (
          <div className="mt-8 border border-[var(--gold-light)] bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">
              {times.placeName || destination.name}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-10 gap-y-3">
              {times.candleLighting && (
                <div>
                  <p className="text-2xl font-bold text-[var(--navy)]">{times.candleLighting}</p>
                  <p className="text-sm text-stone-600">Candle-lighting, Friday</p>
                </div>
              )}
              {times.ends && (
                <div>
                  <p className="text-2xl font-bold text-[var(--navy)]">{times.ends}</p>
                  <p className="text-sm text-stone-600">Shabbos ends</p>
                </div>
              )}
            </div>
            <p className="mt-4 text-xs leading-5 text-stone-500">
              Calculated for this location, not taken from a local calendar. Confirm with the kehilla you are davening
              with. <Link href="/zmanim" className="underline">Full zmanim</Link>
            </p>
          </div>
        )}

        {isEmpty(place) ? (
          // No listings for this one yet. Say where to go next and nothing
          // about why — AGENTS.md keeps the site's own content status out of
          // customer-facing copy.
          <p className="mt-8 leading-7 text-stone-600">
            Start from the{" "}
            <Link href={`/destinations/${destination.slug}`} className="font-semibold text-[var(--gold-ink)] underline">
              {destination.name} page
            </Link>
            , which carries the kosher food, the places to stay and what is nearby.
          </p>
        ) : (
          <div className="mt-10 flex flex-col gap-10">
            {place.shuls.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-[var(--navy)]">Shuls</h2>
                <div className="mt-4">
                  <ListingRows rows={place.shuls} />
                </div>
              </section>
            )}

            {place.mikvaos.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-[var(--navy)]">Mikvaos</h2>
                <div className="mt-4">
                  <ListingRows rows={place.mikvaos} />
                </div>
              </section>
            )}

            {place.eruvin.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-[var(--navy)]">Eruv</h2>
                <ul className="mt-4 flex flex-col gap-4">
                  {place.eruvin.map((entry) => (
                    <li key={entry.id} className="border-l-2 border-[var(--gold-light)] pl-4">
                      <p className="font-semibold text-[var(--navy)]">{entry.name}</p>
                      {entry.covers && <p className="mt-1 text-sm leading-6 text-stone-600">{entry.covers}</p>}
                      <p className="mt-1 text-sm leading-6 text-stone-500">
                        An eruv&apos;s status can change week to week. Check with the community before relying on it.
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {place.foodBeforeShabbos.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-[var(--navy)]">Before it comes in</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Where to buy while things are still open. Bakeries, groceries and butchers first.
                </p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {place.foodBeforeShabbos.map((item) => (
                    <li key={item.id} className="border border-[var(--gold-light)] bg-white p-4">
                      <p className="font-semibold text-[var(--navy)]">{item.name}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">{item.kind}</p>
                      {item.address && <p className="mt-1 text-sm leading-6 text-stone-600">{item.address}</p>}
                    </li>
                  ))}
                </ul>
                {place.moreFood > 0 && (
                  <p className="mt-4 text-sm leading-6 text-stone-600">
                    <Link href="/kosher" className="font-semibold text-[var(--gold-ink)] underline">
                      {place.moreFood} more in the kosher food finder
                    </Link>
                  </p>
                )}
              </section>
            )}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
