import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SuggestEditButton from "@/components/SuggestEditButton";
import { getCemeteryList } from "@/lib/cemeteries-view";

export default async function CemeteriesPage() {
  const cemeteries = await getCemeteryList();
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">Cemetery directory</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl text-[var(--navy)] sm:text-6xl">בתי החיים</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            Open a cemetery page to see the known kevarim, direct navigation, and arrival notes. Each list is researched and will grow as more records are verified.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {cemeteries.map((cemetery) => (
            <Link
              key={cemetery.slug}
              href={`/cemeteries/${cemetery.slug}`}
              className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7 transition hover:border-[var(--gold)] hover:shadow-md"
            >
              <p dir="rtl" className="text-xl font-semibold leading-tight text-[var(--navy)]">{cemetery.yiddishCity}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">{cemetery.city} · {cemetery.country}</p>
              <h2 dir="rtl" className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)]">{cemetery.yiddishName}</h2>
              <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-stone-500">{cemetery.name}</p>
              <p className="mt-5 text-sm leading-6 text-stone-600">{cemetery.burialCount} known {cemetery.burialCount === 1 ? "kever" : "kevarim"} listed</p>
              {cemetery.ownerAdded && (
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)]">Newly added</p>
              )}
            </Link>
          ))}
        </div>

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
