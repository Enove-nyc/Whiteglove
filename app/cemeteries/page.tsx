import PageBlocks from "@/components/PageBlocks";
import CemeteryDirectory from "@/components/CemeteryDirectory";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SubBrandBanner, { SubBrandCrest } from "@/components/SubBrand";
import { getPublicCemeteryList } from "@/lib/cemeteries-view";
import { listAllHeritageCemeteries } from "@/lib/heritage-cemeteries";
import { cemeteryCountries, PAGE, searchCemeteryList } from "@/data/cemetery-list";
import StructuredData from "@/components/StructuredData";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs, collectionPage } from "@/lib/structured-data";
import { resolvePage } from "@/lib/pages";

export const metadata = pageMetadata({
  title: "Kivrei Tzadikim and Jewish Cemeteries Directory | White Glove",
  description:
    "Every beis hachaim we hold a record for: who is buried where, the exact address and coordinates, arrival notes, and shomer contacts where they have been checked.",
  path: "/cemeteries",
});

export default async function CemeteriesPage({ searchParams }: { searchParams: Promise<{ country?: string }> }) {
  const [{ country }, cemeteries, heritageCemeteries] = await Promise.all([
    searchParams,
    getPublicCemeteryList(),
    listAllHeritageCemeteries(),
  ]);
  // Only a country we actually hold records for. A made-up one would silently
  // filter the list down to nothing and read as a broken page.
  const initialCountry = cemeteries.some((entry) => entry.country === country) ? (country as string) : "";
  // The Nesiya Tova located set, trimmed to what the one directory needs — the
  // detail page carries the rest (directions, the forward to Nesiya Tova).
  const heritage = heritageCemeteries.map((h) => ({ slug: h.slug, city: h.city, country: h.country, address: h.address }));
  // The first page, chosen by the server: the page arrives whole and
  // indexable, and a visitor who reads what is in front of them makes no
  // request at all. Later searches ask /api/cemeteries/list.
  const first = searchCemeteryList({ guides: cemeteries, heritage }, { country: initialCountry, limit: PAGE });
  const countries = cemeteryCountries({ guides: cemeteries, heritage });
  const page = await resolvePage("cemeteries");
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <StructuredData
        data={[
          collectionPage({
            name: "Kivrei tzadikim and Jewish cemeteries",
            description: "Batei hachaim across Europe and beyond, with kevarim, addresses and access notes.",
            path: "/cemeteries",
            count: cemeteries.length,
          }),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Cemeteries", path: "/cemeteries" },
          ]),
        ]}
      />
      <Navbar />
      <SubBrandBanner />

      {page?.edited ? (
        <PageBlocks blocks={page.blocks} />
      ) : (
        <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-12 gap-y-8">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Cemetery directory</p>
              <h1 lang="he" dir="rtl" className="mt-5 font-[family-name:var(--font-display)] text-5xl text-[var(--navy)] sm:text-6xl">בתי החיים</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
                Known kevarim, navigation and arrival notes for each beis hachaim.
              </p>
              <p className="mt-4 max-w-2xl leading-7 text-stone-600">
                One directory for both: the kevarim guides here, and — the moment you search a town or choose a country —
                the batei hachaim located worldwide from Nesiya Tova for that place.
              </p>
            </div>
            <SubBrandCrest className="hidden shrink-0 sm:block" />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <CemeteryDirectory
          initial={first.rows}
          initialMore={first.more}
          initialNarrowed={first.narrowed}
          countries={countries}
          hasHeritage={heritage.length > 0}
          initialCountry={initialCountry}
        />
      </section>

      <Footer />
    </main>
  );
}
