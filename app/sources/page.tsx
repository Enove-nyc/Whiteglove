import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { pageMetadata } from "@/lib/seo";
import { sourceIndex, SOURCE_CATEGORY_ORDER } from "@/data/sources-index.generated";

export const metadata = pageMetadata({
  title: "Sources — White Glove Kosher Travel",
  description:
    "The directories and public pages White Glove draws on to compile its listings, credited in one place.",
  path: "/sources",
});

/**
 * Where the listings come from, all in one place.
 *
 * The site compiles what it shows from other people's directories and public
 * pages. That credit is owed, but it does not belong on a listing beside a
 * kever, where a link reads as an endorsement of whatever it points at. So it
 * is collected here instead: every source site the listings cite, once each,
 * grouped for reading. The list is generated from the data itself
 * (data/sources-index.generated.ts) so it stays in step with the site and is
 * never kept by hand.
 *
 * WHAT THIS PAGE SAYS, AND WHAT IT DOES NOT. It says which sites the site drew
 * on. It is an acknowledgement, not a recommendation: a link here is not the
 * site vouching for that source, ranking it, or saying anything about whose
 * hashkafah it carries. It is only a record of where the information came from.
 */
export default function SourcesPage() {
  const byCategory = new Map<string, typeof sourceIndex>();
  for (const entry of sourceIndex) {
    const list = byCategory.get(entry.category) ?? [];
    list.push(entry);
    byCategory.set(entry.category, list);
  }
  const categories = [
    ...SOURCE_CATEGORY_ORDER.filter((c) => byCategory.has(c)),
    ...[...byCategory.keys()].filter((c) => !SOURCE_CATEGORY_ORDER.includes(c as never)),
  ];

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Sources</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
          Where the listings come from.
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-stone-600">
          White Glove compiles its listings from the directories and public pages below. They are
          gathered here as a single acknowledgement of the work we drew on. A site listed here is
          credited, not endorsed — its presence says only that some information came from it.
        </p>

        <div className="mt-14 space-y-14">
          {categories.map((category) => {
            const list = byCategory.get(category) ?? [];
            return (
              <section key={category}>
                <h2 className="border-b border-[var(--gold-light)] pb-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
                  {category}
                  <span className="ml-2 align-middle text-sm font-normal text-stone-400">{list.length}</span>
                </h2>
                <ul className="mt-5 gap-x-8 sm:columns-2 lg:columns-3 [&>li]:break-inside-avoid">
                  {list.map((entry) => (
                    <li key={entry.host} className="mb-2 text-sm leading-6">
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noreferrer nofollow"
                        className="text-stone-600 underline decoration-stone-300 underline-offset-2 hover:text-[var(--navy)]"
                      >
                        {entry.host}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
      <Footer />
    </main>
  );
}
