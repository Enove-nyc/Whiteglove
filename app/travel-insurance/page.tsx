import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBody from "@/components/PageBody";
import { resolvePage } from "@/lib/pages";

const coverages = [
  ["Trip cancellation", "באַשטימט־קאַנסעלירונג", "Protects pre-paid parts of the trip when plans change."],
  ["Medical coverage", "מעדיצינישע קאָווערידזש", "Useful for illness, injury, or urgent assistance abroad."],
  ["Baggage coverage", "באַגאַזש־קאָווערידזש", "Helps if luggage is delayed, lost, or damaged."],
  ["Emergency assistance", "נויט־הילף", "24/7 support if something unexpected happens during travel."],
];

export default async function TravelInsurancePage() {
  const page = (await resolvePage("travel-insurance"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">{page.eyebrow}</p>
          <h1 dir="rtl" className="mt-5 font-[family-name:var(--font-display)] text-6xl leading-tight text-[var(--navy)] sm:text-7xl">רײַזע־אינשוראַנס</h1>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-stone-500 sm:text-4xl">{page.title}</p>
          <PageBody body={page.body} className="mt-7 max-w-3xl text-lg leading-8 text-stone-600" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {coverages.map(([title, yiddish, text]) => (
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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Disclosure</p>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            Any final insurance page should clearly state whether White Glove is only referring travelers or is licensed to sell coverage.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
