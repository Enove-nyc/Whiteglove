import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PartnerSearchForm from "@/components/PartnerSearchForm";
import SectionHeading from "@/components/SectionHeading";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Cars and transfers for a kosher trip | White Glove Itineraries",
  description:
    "Hire a car or arrange a transfer, and find out first whether the destination actually needs one — some are better without.",
  path: "/cars",
});

/**
 * Cars and transfers.
 *
 * THE USEFUL PART IS THE FIRST QUESTION, not the search. A city with a
 * walkable Jewish quarter is worse with a car — parking, Shabbos, and a cost
 * for something that sits still for a week — and an alpine valley is
 * impossible without one. Every destination page says which, and this page
 * says so before offering the search rather than after.
 *
 * Transfers and heritage-route drivers are named here and are NOT bookable:
 * no transfer programme is joined, and the driver side is the provider
 * directory rather than an affiliate. Saying so is better than a button that
 * cannot do anything.
 */
export default function CarsPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Cars and transfers</p>
          <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.08] text-[var(--navy)]">
            First, whether you need one at all.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            A car is the difference between an alpine week working and not working. In a city with a walkable quarter it
            is a parking problem you paid for. Each destination page says which of the two it is.
          </p>
          <div className="mt-8 max-w-4xl">
            <PartnerSearchForm
              id="cars"
              product="car"
              fields="stay"
              destinationLabel="Picking up in"
              page="/cars"
              placement="cars-page"
              submitLabel="Search car hire"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <SectionHeading
          eyebrow="Getting around"
          title="What we can and cannot arrange."
          description="Named plainly, including the ones that are not open — a button that cannot do anything is worse than a sentence saying so."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">Car hire</h2>
            <p className="mt-3 leading-7 text-stone-600">
              Searchable above, through a partner. Check the cross-border rules before you book if the trip crosses one —
              several hire companies forbid it outright.
            </p>
          </article>
          <article className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
              Airport transfers
            </h2>
            <p className="mt-3 leading-7 text-stone-600">
              We do not book transfers yet. For most trips the car search above covers it, and where a transfer is the
              better answer the destination page will say so.
            </p>
          </article>
          <article className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
              Drivers on a heritage route
            </h2>
            <p className="mt-3 leading-7 text-stone-600">
              A driver who knows the roads and the gates is a person, not a booking engine. They are in the provider
              directory, with what we hold on record about each.
            </p>
            <Link
              href="/directory"
              className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              Open the provider directory
            </Link>
          </article>
        </div>
      </section>

      <Footer />
    </main>
  );
}
