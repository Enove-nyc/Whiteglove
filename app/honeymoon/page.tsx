import Footer from "@/components/Footer";
import InquiryForm from "@/components/InquiryForm";
import Navbar from "@/components/Navbar";
import PageBody from "@/components/PageBody";
import { resolvePage } from "@/lib/pages";

const offerings = [
  {
    title: "Kosher honeymoon destinations",
    yiddish: "כשר־האָנימאָן דעסטאַניישאַנז",
    text: "Romantic trips in Europe and beyond, with kosher food and practical travel details built in from the start.",
  },
  {
    title: "Romantic accommodations",
    yiddish: "ראָמאַנטישע אַכסניות",
    text: "Private rooms, suites, and boutique stays that fit a quiet, well-planned honeymoon.",
  },
  {
    title: "Kosher dining",
    yiddish: "כשר עסן",
    text: "Restaurant planning, catered meals, and Shabbos-friendly food options wherever you go.",
  },
  {
    title: "Private experiences",
    yiddish: "פּריוואַטע ערפֿאַרונגען",
    text: "Thoughtful outings and memorable moments without losing the structure and standards you need.",
  },
  {
    title: "Sample itineraries",
    yiddish: "בייַשפּיל־רוטעס",
    text: "1-day, 3-day, and longer honeymoon plans that can be adapted around flights and accommodations.",
  },
  {
    title: "Request a quote",
    yiddish: "בעטן אַ פּרײַז־פֿאָרשלאָג",
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
          <h1 dir="rtl" className="mt-5 font-[family-name:var(--font-display)] text-6xl leading-tight text-[var(--navy)] sm:text-7xl">האָנימאָן</h1>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-stone-500 sm:text-4xl">{page.title}</p>
          <PageBody body={page.body} className="mt-7 max-w-2xl text-lg leading-8 text-stone-600" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {offerings.map((item) => (
            <article key={item.title} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
              <p dir="rtl" className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{item.yiddish}</p>
              <p className="mt-1 text-sm text-stone-500">{item.title}</p>
              <p className="mt-4 text-sm leading-7 text-stone-600">{item.text}</p>
            </article>
          ))}
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
