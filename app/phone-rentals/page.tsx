import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBody from "@/components/PageBody";
import { resolvePage } from "@/lib/pages";

const items = [
  ["SIM cards", "סים־קאַרטלעך", "Country-specific connectivity for travelers who want a simple local solution."],
  ["eSIMs", "ע־סים", "Digital setup for phones that support it, without needing a physical card."],
  ["International rentals", "אינטערנאַציאָנאַלע רענטאַלס", "Short-term phone rentals for travelers who need a backup device."],
  ["Wi-Fi hotspot rentals", "ווײַ־פֿײַ האָצפּאָץ", "Portable internet for family trips, groups, or locations with limited access."],
];

export default async function PhoneRentalsPage() {
  const page = (await resolvePage("phone-rentals"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">{page.eyebrow}</p>
          <h1 dir="rtl" className="mt-5 font-[family-name:var(--font-display)] text-6xl leading-tight text-[var(--navy)] sm:text-7xl">פאָון־רענטאַלס</h1>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-stone-500 sm:text-4xl">{page.title}</p>
          <PageBody body={page.body} className="mt-7 max-w-3xl text-lg leading-8 text-stone-600" />
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
        <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-8 sm:flex sm:items-center sm:justify-between sm:gap-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Stay connected abroad</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">Tell us your destinations and dates and we&apos;ll recommend the right SIM, eSIM, or hotspot for your trip.</p>
          </div>
          <Link href="/contact" className="mt-5 inline-block shrink-0 border border-[var(--navy)] bg-[var(--navy)] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] sm:mt-0">Ask us →</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
