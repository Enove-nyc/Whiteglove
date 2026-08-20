import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/**
 * The home page for whitegloveitineraries.com.
 *
 * The same app, worn as a general itinerary tool rather than a kosher travel
 * site. It leads with the thing this domain is for — planning a trip and
 * handing it to somebody on their phone — and leaves the kosher directory on
 * the other domain. Everything it links to already exists; this is a front
 * door, not a new section.
 */
export default function ItinerariesHome() {
  const cta =
    "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition";
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar brand="itineraries" />

      <section className="relative overflow-hidden bg-[var(--navy)] px-5 py-20 text-white sm:px-8 sm:py-28">
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[var(--navy)] via-[#24405f] to-[#3a5462]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e7d3ad]">White Glove Itineraries</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-6xl">
            The trip you plan, in your client&apos;s pocket.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#c9d3da] sm:text-lg">
            Build an itinerary a day at a time, then hand it over as an app on their phone —
            the days, the map, a travel wallet kept for when there is no signal, and a chat
            with you. One link per client.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/itinerary" className={`${cta} bg-white text-[var(--navy)] hover:bg-[var(--gold-light)]`}>
              Build a trip
            </Link>
            <Link href="/app" className={`${cta} border border-white/40 text-white hover:bg-white/10`}>
              See the app
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Plan it",
              body: "Dates, where they are staying, the stops, the flights. The planner keeps the day-by-day in order.",
              href: "/itinerary",
              link: "Open the planner",
            },
            {
              title: "Hand it over",
              body: "Create a client link for a trip. It opens as an app on their phone — no account, only their itinerary.",
              href: "/app",
              link: "See the app",
            },
            {
              title: "Stay in touch",
              body: "Every client is a chat. You see all of them in one inbox; they reach you from their trip.",
              href: "/app",
              link: "Open your inbox",
            },
          ].map((c) => (
            <div key={c.title} className="flex flex-col rounded-2xl border border-[var(--gold-light)] bg-white p-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{c.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-stone-600">{c.body}</p>
              <Link href={c.href} className="mt-4 text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
                {c.link} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
