import Link from "next/link";
import Footer from "@/components/Footer";
import InquiryForm from "@/components/InquiryForm";
import KosherFinder from "@/components/KosherFinder";
import Navbar from "@/components/Navbar";
import PageBody from "@/components/PageBody";
import { resolvePage } from "@/lib/pages";
import { honeymoonDestinations, honeymoonPlans } from "@/data/trip-ideas";

const offerings = [
  {
    title: "Kosher honeymoon destinations",
    text: "Romantic trips in Europe and beyond, with kosher food and practical travel details built in from the start.",
  },
  {
    title: "Romantic accommodations",
    text: "Private rooms, suites, and boutique stays that fit a quiet, well-planned honeymoon.",
  },
  {
    title: "Kosher dining",
    text: "Restaurant planning, catered meals, and Shabbos-friendly food options wherever you go.",
  },
  {
    title: "Private experiences",
    text: "Thoughtful outings and memorable moments without losing the structure and standards you need.",
  },
  {
    title: "Sample itineraries",
    text: "1-day, 3-day, and longer honeymoon plans that can be adapted around flights and accommodations.",
  },
  {
    title: "Request a quote",
    text: "Send us your dates and preferences, and we can shape a honeymoon plan around your needs.",
  },
];

export default async function HoneymoonPage() {
  const page = (await resolvePage("honeymoon"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">{page.eyebrow}</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">{page.title}</h1>
          <PageBody body={page.body} className="mt-7 max-w-2xl text-lg leading-8 text-stone-600" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {offerings.map((item) => (
            <article key={item.title} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
              <p className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">{item.title}</p>
              <p className="mt-4 text-sm leading-7 text-stone-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Curated destination ideas */}
      <section className="border-t border-[var(--gold-light)] bg-[#fcfaf6] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Where to go</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Kosher-friendly honeymoon destinations</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">Ideas to start from — every one has kosher food you can plan around. Use the finder below to see real kosher places in any city you&apos;re considering.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {honeymoonDestinations.map((d) => (
              <article key={d.region} className="border border-[var(--gold-light)] bg-white p-6">
                <p className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">{d.region}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-[var(--gold)]">{d.places}</p>
                <p className="mt-3 text-sm leading-7 text-stone-600">{d.blurb}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Sample plans */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Sample plans</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">A shape to start from</h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {honeymoonPlans.map((plan) => (
            <article key={plan.title} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)]">{plan.length}</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{plan.title}</p>
              <ol className="mt-4 space-y-2">
                {plan.days.map((day, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-6 text-stone-600"><span className="font-semibold text-[var(--gold)]">{i + 1}.</span>{day}</li>
                ))}
              </ol>
              {plan.note && <p className="mt-4 border-t border-[var(--gold-light)] pt-3 text-sm text-stone-500">{plan.note}</p>}
            </article>
          ))}
        </div>
        <Link href="/itinerary" className="mt-8 inline-block border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]">Build it in the planner →</Link>
      </section>

      {/* Live kosher finder */}
      <section className="border-t border-[var(--gold-light)] bg-[#fcfaf6] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Kosher wherever you land</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Find kosher food in any city</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">Search a destination you&apos;re considering to see real kosher restaurants and shops nearby.</p>
          <div className="mt-8"><KosherFinder showAddToTrip={false} /></div>
        </div>
      </section>

      <section className="border-y border-[var(--gold-light)] bg-[#fcfaf6] px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.95fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Request a quote</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Tell us what kind of trip you want.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
              Tell us your destination ideas, dates, budget, and what matters most — kosher needs, privacy, and the details that make it special — and we&apos;ll plan it end to end.
            </p>
          </div>

          <InquiryForm subject="Honeymoon request" whenLabel="Dates" whenPlaceholder="When are you traveling?" detailsLabel="Notes" detailsPlaceholder="Destination ideas, budget, kosher needs, privacy preferences, and anything else we should know." />
        </div>
      </section>

      <Footer />
    </main>
  );
}
