import Link from "next/link";
import Footer from "@/components/Footer";
import InquiryForm from "@/components/InquiryForm";
import KosherFinder from "@/components/KosherFinder";
import Navbar from "@/components/Navbar";
import PageBody from "@/components/PageBody";
import { resolvePage } from "@/lib/pages";
import { plannerRoutes } from "@/data/trip-ideas";

const planningBlocks = [
  {
    title: "Route planning",
    text: "Tell us where you are going, what matters most, and how much flexibility you want. We’ll shape the trip around the actual route.",
  },
  {
    title: "Flights",
    text: "Keep air travel aligned with the rest of the trip, including arrival times, departure buffers, and connection details.",
  },
  {
    title: "Hotels",
    text: "Choose stays that work with your schedule, kosher needs, and walking or transport preferences.",
  },
  {
    title: "Kosher food",
    text: "Food planning for the whole journey, including Shabbos, travel days, and destination-specific arrangements.",
  },
  {
    title: "Religious needs",
    text: "Minyanim, mikvaos, tefillos, and access notes all kept in the same trip plan.",
  },
  {
    title: "Saved itinerary",
    text: "A single place to keep the trip organized, with room for notes, bookings, and future edits.",
  },
];

export default async function PlanningPage() {
  const page = (await resolvePage("planning"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">{page.eyebrow}</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">{page.title}</h1>
          <PageBody body={page.body} className="mt-7 max-w-3xl text-lg leading-8 text-stone-600" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {planningBlocks.map((block) => (
            <article key={block.title} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
              <p className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">{block.title}</p>
              <p className="mt-4 text-sm leading-7 text-stone-600">{block.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Build-your-own planner CTA */}
      <section className="border-t border-[var(--gold-light)] bg-[#fcfaf6] px-5 py-14 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Do it yourself</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Build your own trip, day by day.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">Add flights, hotels, and stops — pick kevarim straight from our directory, and see kosher food near each day. We&apos;ll flag empty days and nights with nowhere to sleep, and you can share it or add people to it.</p>
          </div>
          <Link href="/itinerary" className="shrink-0 border border-[var(--navy)] bg-[var(--navy)] px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]">Open the planner →</Link>
        </div>
      </section>

      {/* Sample routes */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Sample routes</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Kivrei tzaddikim trips to start from</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">Outlines built from places in our directory — adapt them to your dates, and confirm access and timing for each site.</p>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {plannerRoutes.map((route) => (
            <article key={route.title} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)]">{route.length}</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{route.title}</p>
              <ol className="mt-4 space-y-2">
                {route.days.map((day, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-6 text-stone-600"><span className="font-semibold text-[var(--gold)]">{i + 1}.</span>{day}</li>
                ))}
              </ol>
              {route.note && <p className="mt-4 border-t border-[var(--gold-light)] pt-3 text-sm text-stone-500">{route.note}</p>}
            </article>
          ))}
        </div>
      </section>

      {/* Live kosher finder */}
      <section className="border-t border-[var(--gold-light)] bg-[#fcfaf6] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Kosher food</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">See what&apos;s kosher along the way</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">Search any city on your route to see kosher restaurants and shops nearby — and add them straight to your trip.</p>
          <div className="mt-8"><KosherFinder /></div>
        </div>
      </section>

      <section className="border-y border-[var(--gold-light)] bg-[#fcfaf6] px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.95fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Tell us about the trip</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">We can turn a rough idea into a working plan.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
              Share your route, dates, and what matters most — flights, hotels, drivers, kosher food, and religious needs — and we&apos;ll come back to you with a plan built around it.
            </p>
          </div>

          <InquiryForm subject="Trip planning request" detailsPlaceholder="Flights, hotels, drivers, food, route preferences, and any religious needs." />
        </div>
      </section>

      <Footer />
    </main>
  );
}
