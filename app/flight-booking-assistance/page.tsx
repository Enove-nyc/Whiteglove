import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBody from "@/components/PageBody";
import { resolvePage } from "@/lib/pages";

const requestFields = [
  ["Origin and destination", "מוצא און ציל"],
  ["Dates", "דאַטעס"],
  ["Traveler count", "צאָל רייזנדע"],
  ["Cabin preference", "קאַבין־פּרעפֿערענץ"],
  ["Baggage needs", "באַגאַזש־דאַרפֿענישן"],
  ["Budget", "באַדזשעט"],
];

export default async function FlightBookingAssistancePage() {
  const page = (await resolvePage("flight-booking-assistance"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">{page.eyebrow}</p>
          <h1 dir="rtl" className="mt-5 font-[family-name:var(--font-display)] text-6xl leading-tight text-[var(--navy)] sm:text-7xl">פֿליגער־באָוקינג הילף</h1>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-stone-500 sm:text-4xl">{page.title}</p>
          <PageBody body={page.body} className="mt-7 max-w-3xl text-lg leading-8 text-stone-600" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {requestFields.map(([title, yiddish]) => (
            <article key={title} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
              <p dir="rtl" className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{yiddish}</p>
              <p className="mt-1 text-sm text-stone-500">{title}</p>
              <p className="mt-4 text-sm leading-7 text-stone-600">Gather this detail before the request is sent.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Next step</p>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            We can later connect this to a secure request form, trip notes, and an internal quote workflow.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
