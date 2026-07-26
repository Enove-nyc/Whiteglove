import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBody from "@/components/PageBody";
import SectionHeading from "@/components/SectionHeading";
import { getaways } from "@/data/getaways";
import { resolvePage } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Kosher Getaways — White Glove Itineraries",
  description: "Kosher vacations, resorts, and city getaways — Italy, Paris, and more, planned with care.",
};

const mailto = (name: string) =>
  `mailto:whitegloveitineraries@gmail.com?subject=${encodeURIComponent(`Kosher getaway inquiry: ${name}`)}`;

export default async function GetawaysPage() {
  const page = (await resolvePage("getaways"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">{page.eyebrow}</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">
            {page.title}
          </h1>
          <PageBody body={page.body} className="mt-7 max-w-2xl text-lg leading-8 text-stone-600" />
          <a
            href="mailto:whitegloveitineraries@gmail.com?subject=Kosher%20getaway%20planning"
            className="mt-9 inline-block bg-[var(--navy)] px-7 py-4 text-xs font-bold uppercase tracking-[0.15em] text-white transition hover:bg-[var(--gold)]"
          >
            Start planning your trip →
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <SectionHeading
          eyebrow="Where to next"
          title="A few places to begin."
          description="A starting selection of kosher-friendly getaways. Tell us where you would like to go and we will shape the trip around you."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {getaways.map((g) => (
            <article key={g.slug} className="flex flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
              <span className="self-start rounded-full bg-[var(--gold-light)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--navy-deep)]">{g.type}</span>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{g.name}</h2>
              <p className="mt-1 text-sm text-stone-500">{g.country}</p>
              <p className="mt-4 flex-1 text-sm leading-6 text-stone-600">{g.summary}</p>
              <a href={mailto(`${g.name}, ${g.country}`)} className="mt-6 inline-block self-start border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.13em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">
                Inquire about {g.name} →
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <div className="grid gap-8 border border-[var(--gold-light)] bg-[var(--navy)] p-8 text-white sm:p-12 lg:grid-cols-[1.4fr_.6fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-light)]">Planning a nesiah instead?</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight sm:text-4xl">Our guides to kevarim and tzaddikim are right here.</h2>
          </div>
          <Link href="/stops" className="inline-block self-start border border-[var(--gold-light)] px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] transition hover:bg-[var(--gold)] hover:text-[var(--navy)] lg:justify-self-end">
            Kevarim &amp; nesios →
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
