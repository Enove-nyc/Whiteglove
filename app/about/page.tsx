import Link from "next/link";
import Footer from "@/components/Footer";
import GloveMark from "@/components/GloveMark";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import StartingPoints from "@/components/StartingPoints";
import { pageMetadata } from "@/lib/seo";
import { resolvePage } from "@/lib/pages";
import { readWords } from "@/lib/site-words-store";

export async function generateMetadata() {
  const page = await resolvePage("about");
  return pageMetadata({
    title: page?.seoTitle ?? "About — White Glove Itineraries",
    description:
      page?.seoDescription ??
      "Who is behind White Glove Itineraries, how the practical detail on this site is put together, and how to reach a person.",
    path: "/about",
  });
}

/**
 * Who is behind this.
 *
 * THE GAP THIS FILLS. The site explained what it does on nine pages and never
 * said who was doing it, where they were, or why somebody should hand them the
 * kosher side of a family holiday. A visitor asks that question quietly and
 * leaves quietly when it is not answered.
 *
 * THE PROSE IS EDITABLE (data/pages.ts, /admin/pages) so the owner can write
 * the personal half — his name, his background, where the business is based —
 * without a deploy. What ships is true of the site as it stands and nothing
 * more: no invented founder, no years in business, no client count.
 *
 * WHAT IS IN CODE RATHER THAN IN BLOCKS is the part that must not drift: the
 * way to reach a person. An about page that ends without an address is a page
 * about a company that does not want to be written to.
 */
export default async function AboutPage() {
  const [page, words] = await Promise.all([resolvePage("about"), readWords()]);

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />
      <PageBlocks blocks={page!.blocks} />

      {/* The direct contact method the brief asked for, in code so that no
          edit to the page above can leave it without one. Two ways, because
          some people write and some people would rather fill in a form. */}
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="rounded-2xl border border-[var(--navy)] bg-[var(--navy)] p-6 text-white sm:p-9">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <GloveMark size="lg" />
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight sm:text-4xl">
              Talk to a person
            </h2>
          </div>
          <p className="mt-4 max-w-2xl leading-7 text-slate-200">
            Write about a trip, tell us something on the site is wrong, or ask a question about a destination.{" "}
            {words.replyPromise}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center rounded-md bg-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy-deep)] transition hover:bg-[var(--gold-light)]"
            >
              Open the contact form
            </Link>
            <a
              href={`mailto:${words.contactEmail}`}
              className="inline-flex min-h-11 items-center rounded-md border border-white/30 px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold-light)] hover:text-[var(--gold-light)]"
            >
              {words.contactEmail}
            </a>
          </div>
        </div>
      </section>

      {/* Where to go next, in the site's own words for the four doors rather
          than in four more of this page's own. lib/starting-points.ts. */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <StartingPoints heading="Where to start" />
      </section>

      <Footer />
    </main>
  );
}
