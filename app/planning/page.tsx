import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBody from "@/components/PageBody";
import { resolvePage } from "@/lib/pages";

const planningBlocks = [
  {
    title: "Route planning",
    yiddish: "רוט־פּלאַנירונג",
    text: "Tell us where you are going, what matters most, and how much flexibility you want. We’ll shape the trip around the actual route.",
  },
  {
    title: "Flights",
    yiddish: "פליגערס",
    text: "Keep air travel aligned with the rest of the trip, including arrival times, departure buffers, and connection details.",
  },
  {
    title: "Hotels",
    yiddish: "האָטעלן",
    text: "Choose stays that work with your schedule, kosher needs, and walking or transport preferences.",
  },
  {
    title: "Kosher food",
    yiddish: "כשר עסן",
    text: "Food planning for the whole journey, including Shabbos, travel days, and destination-specific arrangements.",
  },
  {
    title: "Religious needs",
    yiddish: "רוחניות־דעטאַלן",
    text: "Minyanim, mikvaos, tefillos, and access notes all kept in the same trip plan.",
  },
  {
    title: "Saved itinerary",
    yiddish: "געפּאַרקטע רוטע",
    text: "A single place to keep the trip organized, with room for notes, bookings, and future edits.",
  },
];

export default async function PlanningPage() {
  const page = (await resolvePage("planning"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">{page.eyebrow}</p>
          <h1 dir="rtl" className="mt-5 font-[family-name:var(--font-display)] text-6xl leading-tight text-[var(--navy)] sm:text-7xl">פּלאַנירונג</h1>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-stone-500 sm:text-4xl">{page.title}</p>
          <PageBody body={page.body} className="mt-7 max-w-3xl text-lg leading-8 text-stone-600" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {planningBlocks.map((block) => (
            <article key={block.title} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
              <p dir="rtl" className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{block.yiddish}</p>
              <p className="mt-1 text-sm text-stone-500">{block.title}</p>
              <p className="mt-4 text-sm leading-7 text-stone-600">{block.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--gold-light)] bg-[#fcfaf6] px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.95fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Tell us about the trip</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">We can turn a rough idea into a working plan.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
              Step 37 in the roadmap is about giving the traveler one place to explain the journey. This version keeps the page simple and sets the structure for future quote and intake forms.
            </p>
          </div>

          <div className="border border-[var(--gold-light)] bg-white p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
                Name
                <input className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none" placeholder="Your name" />
              </label>
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
                Email
                <input className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none" placeholder="you@example.com" />
              </label>
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] sm:col-span-2">
                Travel window
                <input className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none" placeholder="Dates, flexibility, or season" />
              </label>
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] sm:col-span-2">
                What do you need?
                <textarea rows={4} className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none" placeholder="Flights, hotels, drivers, food, route preferences, and any religious needs." />
              </label>
            </div>
            <button type="button" className="mt-4 border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
              Save planning draft
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
