import Link from "next/link";
import Footer from "@/components/Footer";
import MixedText from "@/components/MixedText";
import Navbar from "@/components/Navbar";
import SubBrandBanner from "@/components/SubBrand";
import { sortedTzaddikim } from "@/lib/tzaddikim";
import { pageMetadata } from "@/lib/seo";

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
 * the Noam Elimelech is not looking under W.
 */
export default function TzaddikimPage() {
  const people = sortedTzaddikim();

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <SubBrandBanner />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Kevarim</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-[clamp(2.5rem,7vw,4.5rem)] leading-tight text-[var(--navy)]">
            Who is buried where
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            {people.length} kevarim, by the name he is known by. Press a name for his seforim, his yahrzeit, and
            how to reach the kever.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map(({ slug, burial, cemetery }) => (
            <li key={slug}>
              <Link
                href={`/tzaddikim/${slug}`}
                className="wg-card block h-full border border-[var(--gold-light)] bg-[#fcfaf6] p-5 transition hover:border-[var(--gold)] hover:shadow-md"
              >
                {burial.yiddishName && (
                  <span dir="rtl" lang="yi" className="block font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                    <MixedText text={burial.yiddishName} lang="yi" />
                  </span>
                )}
                <span className="mt-1 block font-semibold text-[var(--navy)]">{burial.knownAs || burial.name}</span>
                {burial.knownAs && <span className="block text-sm text-stone-500">{burial.name}</span>}
                <span className="mt-2 block text-sm text-stone-500">
                  {cemetery.city} · {cemetery.country}
                </span>
                {burial.yahrzeit && (
                  <span className="mt-1 block text-xs text-stone-400"><MixedText text={burial.yahrzeit} /></span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Footer />
    </main>
  );
}
