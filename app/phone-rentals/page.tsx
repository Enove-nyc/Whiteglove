import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const items = [
  ["SIM cards", "סים־קאַרטלעך", "Country-specific connectivity for travelers who want a simple local solution."],
  ["eSIMs", "ע־סים", "Digital setup for phones that support it, without needing a physical card."],
  ["International rentals", "אינטערנאַציאָנאַלע רענטאַלס", "Short-term phone rentals for travelers who need a backup device."],
  ["Wi-Fi hotspot rentals", "ווײַ־פֿײַ האָצפּאָץ", "Portable internet for family trips, groups, or locations with limited access."],
];

export default function PhoneRentalsPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">Future service</p>
          <h1 dir="rtl" className="mt-5 font-[family-name:var(--font-display)] text-6xl leading-tight text-[var(--navy)] sm:text-7xl">פאָון־רענטאַלס</h1>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-stone-500 sm:text-4xl">Phone Rentals</p>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-stone-600">
            This page covers the future SIM, eSIM, hotspot, and phone rental offering so travelers can stay reachable without juggling setup details.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {items.map(([title, yiddish, text]) => (
            <article key={title} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
              <p dir="rtl" className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{yiddish}</p>
              <p className="mt-1 text-sm text-stone-500">{title}</p>
              <p className="mt-4 text-sm leading-7 text-stone-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Development note</p>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            We’ll keep this page simple until the vendor and fulfillment flow is chosen.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
