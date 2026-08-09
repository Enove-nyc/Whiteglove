import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import ServiceCatalog, { ServiceContents } from "@/components/ServiceCatalog";
import { resolvePage } from "@/lib/pages";

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
  const page = (await resolvePage("services"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={page.blocks} />

      <section className="mx-auto max-w-7xl px-5 pb-4 sm:px-8">
        <ServiceContents />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <ServiceCatalog />
      </section>

      <section className="border-t border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.3fr_.7fr] lg:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
              Not sure which of these you need?
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
              That is the normal position. Answer the planning questions — a couple of minutes, nothing required — and
              we will tell you which of these the trip actually calls for.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/plan"
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
            >
              Start planning a trip
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
