import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SavePlaceButtons from "@/components/SavePlaceButtons";
import SuggestEditButton from "@/components/SuggestEditButton";
import { cemeteries, getCemetery } from "@/data/cemeteries";

export function generateStaticParams() {
  return cemeteries.map(({ slug }) => ({ cemetery: slug }));
}

export default async function CemeteryPage({ params }: { params: Promise<{ cemetery: string }> }) {
  const { cemetery: slug } = await params;
  const cemetery = getCemetery(slug);
  if (!cemetery) notFound();

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cemetery.address} ${cemetery.coordinates ?? ""}`)}`;

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">Beis hachaim · {cemetery.country}</p>
          <h1 dir="rtl" className="mt-5 font-[family-name:var(--font-display)] text-6xl leading-tight text-[var(--navy)] sm:text-7xl">{cemetery.yiddishName}</h1>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-stone-500 sm:text-4xl">{cemetery.name}</p>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">{cemetery.city} · {cemetery.yiddishCity}</p>
          <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-8 inline-block bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)]">Navigate to this beis hachaim →</a>
          <SavePlaceButtons place={{ id: `cemetery-${cemetery.slug}`, name: cemetery.name, yiddishName: cemetery.yiddishName, address: cemetery.address, coordinates: cemetery.coordinates, href: `/cemeteries/${cemetery.slug}` }} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
          <aside className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">How to get there</p>
            <p className="mt-4 text-sm leading-7 text-stone-600">{cemetery.address}</p>
            <ol className="mt-6 space-y-4 border-t border-[var(--gold-light)] pt-5">
              {cemetery.arrivalNotes.map((note, index) => <li key={note} className="flex gap-3 text-sm leading-6 text-stone-600"><span className="font-semibold text-[var(--gold)]">{index + 1}.</span>{note}</li>)}
            </ol>
            {cemetery.accessNote && <p className="mt-6 border-t border-[var(--gold-light)] pt-5 text-sm leading-6 text-stone-600">{cemetery.accessNote}</p>}
            {cemetery.accessContacts && <div className="mt-5 space-y-4">
              {cemetery.accessContacts.map((contact) => <div key={`${contact.label}-${contact.phone ?? contact.email}`}>
                <p className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">{contact.label}</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">{contact.note}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {contact.phone && <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className="border border-[var(--gold)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Call {contact.phone}</a>}
                  {contact.email && <a href={`mailto:${contact.email}`} className="border border-[var(--gold-light)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Email access desk</a>}
                </div>
              </div>)}
            </div>}
            <SuggestEditButton targetType="location" targetId={cemetery.slug} title={cemetery.name} currentInfo={`${cemetery.yiddishName}\n${cemetery.address}\n${cemetery.accessNote ?? ""}`} />
          </aside>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Who is buried here</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Known kevarim</h2>
            <div className="mt-8 space-y-4">
              {cemetery.burials.map((burial) => <article key={burial.name} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
                <h3 dir="rtl" className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)]">{burial.yiddishName}</h3>
                <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-stone-500">{burial.name}</p>
                {burial.knownAs && <p className="mt-3 text-sm font-semibold text-stone-700">{burial.knownAs}</p>}
                {burial.seforim && <p dir="rtl" className="mt-3 text-lg text-[var(--navy)]">{burial.seforim}</p>}
                {burial.yahrzeit && <p className="mt-3 text-sm text-stone-600">Yahrzeit: {burial.yahrzeit}</p>}
                {burial.note && <p className="mt-3 text-sm leading-6 text-stone-600">{burial.note}</p>}
              </article>)}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-7xl"><a href={cemetery.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">Read the cemetery source →</a></div>
      </section>
      <Footer />
    </main>
  );
}
