import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import BookingSearch from "@/components/BookingSearch";

export default function BookingPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">Flights &amp; hotels</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-stone-600">Begin the travel side of your journey here. Search flight options and accommodations, then keep the rest of the journey—kevarim, shomer details, and practical guidance—together in White Glove.</p>
            <p className="mt-6 border-l-2 border-[var(--gold)] pl-4 text-sm leading-7 text-stone-600">Live availability is powered by Duffel. Final reservations and payment will be added after the live account is connected and approved.</p>
          </div>
          <BookingSearch />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><div className="grid gap-5 md:grid-cols-3"><article className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">01</p><h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Choose your travel</h2><p className="mt-3 text-sm leading-6 text-stone-600">Search the flight or hotel options that suit your dates.</p></article><article className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">02</p><h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Build your route</h2><p className="mt-3 text-sm leading-6 text-stone-600">Save the kevarim and destinations that matter to your trip.</p></article><article className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">03</p><h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Travel prepared</h2><p className="mt-3 text-sm leading-6 text-stone-600">Keep the address, access guidance, and available local contacts close by.</p></article></div></section>
      <Footer />
    </main>
  );
}
