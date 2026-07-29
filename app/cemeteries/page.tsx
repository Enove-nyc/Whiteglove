import CemeteryDirectory from "@/components/CemeteryDirectory";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SubBrandBanner, { SubBrandCrest } from "@/components/SubBrand";
import SuggestEditButton from "@/components/SuggestEditButton";
import { getCemeteryList } from "@/lib/cemeteries-view";

export default async function CemeteriesPage() {
  const cemeteries = await getCemeteryList();
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <SubBrandBanner />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-12 gap-y-8">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">Cemetery directory</p>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl text-[var(--navy)] sm:text-6xl">בתי החיים</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
              Open a cemetery page to see the known kevarim, direct navigation, and arrival notes. Each list is researched and will grow as more records are verified.
            </p>
          </div>
          <SubBrandCrest className="hidden shrink-0 sm:block" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <CemeteryDirectory cemeteries={cemeteries} />

        <div className="mt-10">
          <SuggestEditButton
            targetType="site"
            targetId="cemeteries-index"
            title="Cemetery directory"
            currentInfo="Use this directory to report a missing burial, shomer number, or access note for any beis hachaim."
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
