import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import StructuredData from "@/components/StructuredData";
import SubBrandBanner from "@/components/SubBrand";
import TzaddikimDirectory, { type TzaddikCard } from "@/components/TzaddikimDirectory";
import { extraSpellings } from "@/lib/place-search";
import { haystack, sortedTzaddikim } from "@/lib/tzaddikim";
import { pageMetadata } from "@/lib/seo";
import { resolvePage } from "@/lib/pages";
import { breadcrumbs, collectionPage } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Kevarim of Tzaddikim — Who is Buried Where | White Glove",
  description:
    "Every tzadik on the site, by name, with where he is buried and how to get there. Search by the name he is known by.",
  path: "/tzaddikim",
});

export const revalidate = 60;

/**
 * Everybody, by name.
 *
 * The cemetery directory answers "what is in Poland". This answers the other
 * question, which is the one people actually ask: where is he buried. Sorted
 * by the name he is known by rather than his surname — somebody looking for
 * the Noam Elimelech is not looking under W — and searchable by that name,
 * client-side, through the directory component.
 */
export default async function TzaddikimPage() {
  const page = await resolvePage("tzaddikim");
  const people: TzaddikCard[] = sortedTzaddikim().map((entry) => ({
    slug: entry.slug,
    yiddishName: entry.burial.yiddishName,
    name: entry.burial.name,
    knownAs: entry.burial.knownAs,
    yahrzeit: entry.burial.yahrzeit,
    city: entry.cemetery.city,
    country: entry.cemetery.country,
    search: [haystack(entry), extraSpellings([entry.cemetery.slug, entry.cemetery.city])].join(" "),
  }));

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      {/* The one directory on the site that carried none. /cemeteries, /stops,
          /heritage and /destinations all describe themselves as a collection;
          this page lists more entries than any of them and said nothing. Same
          two shapes, same helper, so there is one description of a directory
          and not a second dialect. Nothing on the page changes. */}
      <StructuredData
        data={[
          collectionPage({
            name: "Kevarim of tzaddikim",
            description: "Every tzadik on the site, by the name he is known by, with where he is buried.",
            path: "/tzaddikim",
            count: people.length,
          }),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Kevarim", path: "/tzaddikim" },
          ]),
        ]}
      />
      <Navbar />
      <SubBrandBanner />

      {page?.edited ? (
        <PageBlocks blocks={page.blocks} />
      ) : (
        <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Kevarim</p>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-[clamp(2.5rem,7vw,4.5rem)] leading-tight text-[var(--navy)]">
              Who is buried where
            </h1>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <TzaddikimDirectory people={people} />
      </section>

      <Footer />
    </main>
  );
}
