import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBody from "@/components/PageBody";
import { resolvePage } from "@/lib/pages";

const coverages = [
  ["Trip cancellation", "Protects pre-paid parts of the trip when plans change."],
  ["Medical coverage", "Useful for illness, injury, or urgent assistance abroad."],
  ["Baggage coverage", "Helps if luggage is delayed, lost, or damaged."],
  ["Emergency assistance", "24/7 support if something unexpected happens during travel."],
];

export default async function TravelInsurancePage() {
  const page = (await resolvePage("travel-insurance"))!;
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
        <div className="grid gap-5 md:grid-cols-2">
          {coverages.map(([title, text]) => (
            <article key={title} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
              <p className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">{title}</p>
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
