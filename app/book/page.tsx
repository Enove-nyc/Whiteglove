import type { Metadata } from "next";
import BookPartners from "@/components/BookPartners";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Book flights, hotels & cars — White Glove Itineraries",
  description: "Search and book flights, hotels, and rental cars for your kosher-travel journey, then keep the rest of your trip organized with White Glove.",
};

export default function BookPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div>
            <p dir="rtl" className="font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">בוכן</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-stone-500 sm:text-4xl">Book flights, hotels &amp; cars</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-stone-600">
              Everything for the travel side of your נסיעה in one place. Search flights, hotels, and rental cars, then keep your kevarim, shomer details, and guidance together in White Glove.
            </p>
            <p className="mt-6 border-l-2 border-[var(--gold)] pl-4 text-sm leading-7 text-stone-600">
              Each search opens with a trusted partner where you compare options and pay securely. Your itinerary and saved places stay here with White Glove.
            </p>
          </div>
          <BookPartners />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["Flights", "Compare airlines and routes to the destinations that matter for your trip."],
            ["Hotels", "Find kosher-friendly stays near the kever or in the city, for your dates."],
            ["Cars", "Arrange a rental for getting between towns and kevarim at your own pace."],
          ].map(([title, text]) => (
            <article key={title} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">{text}</p>
            </article>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
