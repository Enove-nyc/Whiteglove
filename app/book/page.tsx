import type { Metadata } from "next";
import BookPartners from "@/components/BookPartners";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Book with cash or with miles — White Glove Itineraries",
  description: "Book flights, hotels and rental cars for your kosher-travel journey — paying with cash, or with your miles and points — then keep the rest of your trip organized with White Glove.",
};

export default function BookPage() {
  // Affiliate slots — set these env vars once you join the partner programs and
  // the Book links start carrying your tracking IDs (no code change needed).
  const affiliate = {
    bookingAid: process.env.BOOKING_AFFILIATE_ID?.trim() || "",
    kayakParams: process.env.KAYAK_AFFILIATE_PARAMS?.trim() || "",
    // Travelpayouts: one free account covering flights, hotels and insurance.
    travelpayoutsMarker: process.env.TRAVELPAYOUTS_MARKER?.trim() || "",
  };
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">Book with cash, or with miles</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-stone-600">
              Start by choosing how you&apos;re paying. Under either one you can book flights, hotels or a rental car — then keep your kevarim, shomer details and guidance together in White Glove.
            </p>
            <p className="mt-6 border-l-2 border-[var(--gold)] pl-4 text-sm leading-7 text-stone-600">
              <strong className="text-[var(--navy)]">Paying cash</strong> opens a trusted partner where you compare and pay securely.{" "}
              <strong className="text-[var(--navy)]">Paying with miles</strong>{" "}finds the award, checks it&apos;s worth the points, and sends you to your own program to book — we never see your balances or your login.
            </p>
          </div>
          <div className="min-w-0"><BookPartners affiliate={affiliate} /></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {[
            {
              heading: "Booking with cash",
              lead: "Compare live prices and pay by card with a partner that handles the transaction.",
              rows: [
                ["Flights", "Compare airlines and routes to the destinations that matter for your trip."],
                ["Hotels", "Find kosher-friendly stays near the kever or in the city, for your dates."],
                ["Cars", "Arrange a rental for getting between towns and kevarim at your own pace."],
              ],
            },
            {
              heading: "Booking with miles & points",
              lead: "Find the award, check the value, then book it inside your own loyalty account.",
              rows: [
                ["Flights", "Search award seats across programs, then confirm the cents-per-point before you transfer."],
                ["Hotels", "See which chains have a property in town, and whether the points beat the cash rate."],
                ["Cars", "Card portals will take points for a rental — the calculator shows you whether that is a good idea."],
              ],
            },
          ].map((col) => (
            <div key={col.heading}>
              <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{col.heading}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{col.lead}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {col.rows.map(([title, text]) => (
                  <article key={title} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
                    <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
