import Link from "next/link";
import { notFound } from "next/navigation";
import AlertSignup from "@/components/AlertSignup";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SectionHeading from "@/components/SectionHeading";
import StructuredData from "@/components/StructuredData";
import VacationCard from "@/components/VacationCard";
import {
  collectionBySlug,
  collectionIsLive,
  destinationsInCollection,
  staysInCollection,
} from "@/lib/collections";
import { getStayList } from "@/lib/attractions-view";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs, collectionPage } from "@/lib/structured-data";
import { staySearchHref } from "@/lib/stay-search";
import { cardModels } from "@/lib/vacation-ideas";
import { vacationDestinations } from "@/data/vacation-destinations";
import { loadVacationSources } from "@/lib/vacation-sources";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const def = collectionBySlug(slug);
  if (!def) return pageMetadata({ title: "Collection not found", path: `/collections/${slug}`, noIndex: true });
  return pageMetadata({
    title: `${def.title} — White Glove Itineraries`,
    description: def.intro,
    path: def.path,
  });
}

/**
 * One commercial collection: a season, a kind of holiday, or seasonal programmes.
 *
 * 404 when the slug is unknown or the list would be empty — an empty labelled
 * collection is the thing the hub already refuses to offer.
 */
export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const def = collectionBySlug(slug);
  const stays = await getStayList();
  if (!def || !collectionIsLive(slug, vacationDestinations, stays)) notFound();

  const sources = await loadVacationSources();
  const destinations = destinationsInCollection(slug, vacationDestinations);
  const cards = cardModels(destinations, sources);
  const programmes = staysInCollection(slug, stays);
  const alertKind = def.kind === "seasonal-programmes" || def.kind === "season" ? "seasonal" : "general";

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <StructuredData
        data={[
          collectionPage({
            name: def.title,
            description: def.intro,
            path: def.path,
            count: cards.length + programmes.length,
          }),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
            { name: def.title, path: def.path },
          ]),
        ]}
      />
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Collection</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl lg:text-6xl">
            {def.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">{def.intro}</p>
        </div>
      </section>

      {cards.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <SectionHeading eyebrow="Destinations" title={def.title} description="Each card is a destination page this site already holds." />
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {cards.map((card) => (
              <li key={card.destination.slug}>
                <VacationCard card={card} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {programmes.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <SectionHeading
            eyebrow="Where to stay"
            title="Seasonal kosher programmes"
            description="The season is the fact that decides the trip. Confirm dates with the operator for the year you are going."
          />
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {programmes.map((stay) => (
              <li key={stay.slug}>
                <article className="wg-card flex h-full flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">
                    {stay.city} · {stay.country} · {stay.kind}
                  </p>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                    {stay.name}
                  </h2>
                  {stay.season && (
                    <p className="mt-3 border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                      <strong>Seasonal</strong> — {stay.season}
                    </p>
                  )}
                  <p className="mt-3 flex-1 text-sm leading-6 text-stone-600">{stay.summary}</p>
                  <p className="mt-5">
                    <Link
                      href={staySearchHref({ destination: stay.city })}
                      className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
                    >
                      See stays in {stay.city}
                    </Link>
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border-t border-[var(--gold-light)] px-5 py-14 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <AlertSignup kind={alertKind} sourcePage={def.path} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
