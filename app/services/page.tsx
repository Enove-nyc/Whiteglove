import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import ServiceCatalog, { ServiceContents } from "@/components/ServiceCatalog";
import ServicePricing from "@/components/ServicePricing";
import StartingPoints from "@/components/StartingPoints";
import { resolvePage } from "@/lib/pages";
import { readWords } from "@/lib/site-words-store";

export async function generateMetadata() {
  const page = await resolvePage("services");
  // The owner writes the title and description in the admin; the
  // canonical URL and the share card come from the page it is.
  return pageMetadata({
    title: page?.seoTitle ?? "White Glove Itineraries",
    description: page?.seoDescription ?? "Personal vacation planning, itinerary design, kosher and Shabbos arrangements, and heritage journeys.",
    path: "/services",
  });
}

/**
 * What we do.
 *
 * The words at the top stay editable in the admin; the six services below them
 * are structured (data/services.ts) so that each one answers the same
 * questions — who it is for, what is included, how it works, what you end up
 * with, what to do next, and what it costs. The old page was twelve cards with
 * a line each, and a visitor could read all of them without learning any of
 * those six things about any of them.
 */
export default async function ServicesPage() {
  const [page, words] = await Promise.all([resolvePage("services"), readWords()]);
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={page!.blocks} />

      <section className="mx-auto max-w-7xl px-5 pb-4 sm:px-8">
        <ServiceContents />
      </section>

      {/* THE DELIVERABLE, BEFORE THE LIST OF SERVICES. Somebody deciding
          whether to write in is deciding about the thing at the end, and the
          page below describes it six times without showing it once. */}
      <section className="mx-auto max-w-7xl px-5 pt-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[var(--navy)] bg-[var(--navy)] p-6 text-white sm:p-8">
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight sm:text-3xl">
              See what you actually receive.
            </h2>
            <p className="mt-2 max-w-2xl leading-7 text-slate-200">
              A whole week in Rome, as the itinerary is delivered — rendered by the same planner that builds a real one.
            </p>
          </div>
          <Link
            href="/sample-itinerary"
            className="inline-flex min-h-11 shrink-0 items-center rounded-md bg-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy-deep)] transition hover:bg-[var(--gold-light)]"
          >
            Read the sample itinerary
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <ServiceCatalog />
      </section>

      {/* The six questions every one of the services above used to answer with
          "quoted once we understand the trip". Three of them are still
          unanswered and say so; see components/ServicePricing.tsx. */}
      <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-8">
        <ServicePricing words={words} />
      </section>

      {/* Hiring us is one of four ways to use this site, and three of them are
          free. Saying so on the page that sells the fourth is the difference
          between a services page and a wall. lib/starting-points.ts. */}
      <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-8">
        <StartingPoints omit={["/services"]} includePlanning heading="Or do it yourself, free" />
      </section>

      <section className="border-t border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.3fr_.7fr] lg:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
              Choosing between them
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
              Most trips need one or two of these rather than all of them. Tell us the shape of the trip and we will
              say which.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/plan"
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
            >
              Get recommendations
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--surface)]"
            >
              Ask us a question
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
