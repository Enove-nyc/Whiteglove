import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SubBrandBanner from "@/components/SubBrand";
import SavePlaceButtons from "@/components/SavePlaceButtons";
import SuggestEditButton from "@/components/SuggestEditButton";
import { getCemetery } from "@/data/cemeteries";
import SectionHeading from "@/components/SectionHeading";
import PracticalInformation from "@/components/PracticalInformation";
import { cityGuides, getCityGuide } from "@/data/city-guides";
import { placeDirectionsUrl } from "@/data/route-utils";
import { getDestinationRecord } from "@/data/destination-database";
import { getPublishedDestinationContent } from "@/lib/content";

export function generateStaticParams() {
  return cityGuides.map(({ slug }) => ({ city: slug }));
}

// Re-render at most hourly; admin edits also trigger on-demand revalidation.
export const revalidate = 3600;

export default async function CityGuidePage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const guide = getCityGuide(city);
  if (!guide) notFound();
  const cemetery = getCemetery(guide.slug);
  const destinationRecord = getDestinationRecord(guide.slug);
  // DB-backed practical listings, when the content database is connected.
  const dbContent = await getPublishedDestinationContent(guide.slug);
  // Prefer DB-managed contacts when the admin has entered any; otherwise the
  // static guide contacts. Both shapes expose label/phone/email/note.
  const accessContacts = dbContent?.contacts.length
    ? dbContent.contacts
    : guide.accessContacts ?? (guide.accessContact ? [guide.accessContact] : []);

  const graveMapUrl = guide.graveAddress ? placeDirectionsUrl(guide.graveAddress, guide.graveCoordinates) : undefined;

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <SubBrandBanner />

      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">City guide · {guide.country}</p>
          <h1 dir="rtl" className="mt-5 font-[family-name:var(--font-display)] text-6xl leading-tight text-[var(--navy)] sm:text-7xl">{guide.yiddishCity}</h1>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-stone-500 sm:text-4xl">{guide.city}</p>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-stone-600">A White Glove guide to the journey, the tzaddik, and the practical details that matter most.</p>
        </div>
      </section>

      {guide.safetyNote && (
        <section className="border-b border-amber-200 bg-[#fff8e8] px-5 py-5 sm:px-8">
          <div className="mx-auto max-w-7xl text-sm leading-7 text-stone-700"><strong className="font-semibold text-[var(--navy)]">Current travel notice:</strong> {guide.safetyNote}</div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold)]">At the kever</p>
            <h2 dir="rtl" className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">{guide.yiddishTzaddik}</h2>
            <p className="mt-3 font-[family-name:var(--font-display)] text-2xl leading-tight text-stone-500 sm:text-3xl">{guide.tzaddik}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              {graveMapUrl && <a href={graveMapUrl} target="_blank" rel="noreferrer" className="inline-block bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)]">Navigate to the kever →</a>}
              {cemetery && <a href={`/cemeteries/${cemetery.slug}`} className="inline-block bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)]">View this בית החיים →</a>}
            </div>
            <SavePlaceButtons place={{ id: guide.slug, name: guide.city, yiddishName: guide.yiddishCity, address: guide.graveAddress ?? `${guide.city}, ${guide.country}`, coordinates: guide.graveCoordinates, href: `/${guide.slug}` }} />

            {guide.findingNotes && <div className="mt-8 border-t border-[var(--gold-light)] pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Finding the kever</p>
              <ol className="mt-4 space-y-3">
                {guide.findingNotes.map((note, index) => <li key={note} className="flex gap-3 text-sm leading-6 text-stone-600"><span className="font-semibold text-[var(--gold)]">{index + 1}.</span><span>{note}</span></li>)}
              </ol>
            </div>}
            <SuggestEditButton targetType="location" targetId={guide.slug} title={guide.city} currentInfo={`${guide.yiddishCity}\n${guide.tzaddik}\n${guide.graveAddress ?? ""}`} />
          </div>

          <div className="border-l border-[var(--gold)] pl-6">
            <p className="text-lg leading-8 text-stone-600">{guide.overview}</p>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold)]">Seforim</p><p dir="rtl" className="mt-2 font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">{guide.seforim}</p></div>
              <div><p dir="rtl" className="text-xs font-bold tracking-[0.12em] text-[var(--gold)]">יארצייט</p><p dir="rtl" className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{guide.yahrzeit}</p></div>
              <div><p dir="rtl" className="text-xs font-bold tracking-[0.12em] text-[var(--gold)]">שנת פטירה</p><p dir="rtl" className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{guide.niftar}</p></div>
            </div>

            {accessContacts.length > 0 ? <div className="mt-8 border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold)]">Shomer & access contact</p>
              <div className="mt-4 space-y-5">
                {accessContacts.map((contact) => <div key={`${contact.label}-${contact.phone ?? contact.email}`} className="border-t border-[var(--gold-light)] pt-4 first:border-t-0 first:pt-0"><h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{contact.label}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{contact.note}</p><div className="mt-3 flex flex-wrap gap-3">{contact.phone && <a href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className="border border-[var(--gold)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Call {contact.phone}</a>}{contact.email && <a href={`mailto:${contact.email}`} className="border border-[var(--gold-light)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Email access desk</a>}</div></div>)}
              </div>
            </div> : <div className="mt-8 border border-dashed border-[var(--gold-light)] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold)]">Shomer & access contact</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">A current public shomer or cemetery-access number has not yet been verified for this kever. The guide includes the exact map pin; do not rely on an old number from a travel list without confirming it first.</p>
            </div>}
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Practical guide" title="Everything around the visit." description="Accommodations, food, minyanim, mikvaos, and transport are kept together here. A detail appears only when it has been checked for this exact destination." />
          {destinationRecord && <PracticalInformation record={destinationRecord} places={dbContent?.places ?? []} />}
          <a href={guide.sourceUrl} target="_blank" rel="noreferrer" className="mt-8 inline-block border border-[var(--gold)] px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Read source information</a>
        </div>
      </section>
      <Footer />
    </main>
  );
}
