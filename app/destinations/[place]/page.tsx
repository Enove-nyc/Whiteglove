import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import DestinationActions from "@/components/DestinationActions";
import { airportsFor } from "@/lib/destination-actions";
import SuggestEditButton from "@/components/SuggestEditButton";
import PracticalInformation from "@/components/PracticalInformation";
import { bulkDestinations, getBulkDestination } from "@/data/destinations-bulk";
import { placeDirectionsUrl } from "@/data/route-utils";
import { getDestinationRecord } from "@/data/destination-database";
import { getPublishedDestinationContent } from "@/lib/content";

export function generateStaticParams() {
  return bulkDestinations.map(({ slug }) => ({ place: slug }));
}

// Re-render at most hourly; admin edits also trigger on-demand revalidation.
export const revalidate = 3600;

export default async function BulkDestinationPage({ params }: { params: Promise<{ place: string }> }) {
  const { place: slug } = await params;
  const destination = getBulkDestination(slug);
  if (!destination) notFound();

  const record = getDestinationRecord(destination.slug);
  const dbContent = await getPublishedDestinationContent(destination.slug);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">Destination directory · {destination.country}</p>
          <h1 dir="rtl" lang="yi" className="mt-5 font-[family-name:var(--font-display)] text-[clamp(2.75rem,8vw,5rem)] leading-tight text-[var(--navy)]">{destination.yiddishCity}</h1>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-stone-500 sm:text-4xl">{destination.city}</p>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">{destination.summary}</p>
          <DestinationActions place={{ id: `destination-${destination.slug}`, name: destination.city, yiddishName: destination.yiddishCity, address: `${destination.city}, ${destination.country}`, coordinates: record?.cemeteries[0]?.coordinates, href: `/destinations/${destination.slug}` }} airports={airportsFor(destination.country, `${destination.city}, ${destination.country}`, record?.cemeteries[0]?.coordinates)} />
          <SuggestEditButton targetType="location" targetId={destination.slug} title={destination.city} currentInfo={`${destination.yiddishCity}\n${destination.summary}`} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
          <div className="wg-card border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Verification summary</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">What is ready, and what still needs checking.</h2>
            <p className="mt-4 text-sm leading-7 text-stone-600">
              This page separates public details from items that still need verification. Use the edit form below to send missing shomer numbers, access notes, or accommodation details.
            </p>
            {record?.lastChecked && <p className="mt-4 text-xs uppercase tracking-[0.12em] text-stone-500">Last checked: {record.lastChecked}</p>}
            <div className="mt-5 space-y-3 text-sm leading-6 text-stone-600">
              <p>Destination record: {record ? "Available" : "Not available yet"}</p>
              <p>Research queue: {record?.cemeteries.length ?? 0} cemetery record(s).</p>
              <p>Practical sections are shown only when they exist in the destination database.</p>
            </div>
          </div>

          <div className="wg-card border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Quick actions</p>
            <div className="mt-4 space-y-3">
              {record?.cemeteries.map((cemetery) => (
                <div key={cemetery.id} className="border-b border-[var(--gold-light)] pb-3 last:border-b-0 last:pb-0">
                  <p dir="rtl" lang="yi" className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{cemetery.yiddishName}</p>
                  <p className="mt-1 text-sm text-stone-500">{cemetery.name}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-stone-500">
                    {cemetery.status === "verified" ? "Verified" : cemetery.status === "needs-verification" ? "Needs verification" : "Unavailable"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {record?.cemeteries.length ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {record.cemeteries.map((cemetery) => (
              <article key={cemetery.id} className="wg-card border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-6">
                <h2 dir="rtl" lang="yi" className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{cemetery.yiddishName}</h2>
                <p className="mt-1 text-sm text-stone-500">{cemetery.name}</p>
                {cemetery.address && <p className="mt-4 text-sm leading-6 text-stone-600">{cemetery.address}</p>}
                {cemetery.arrivalNotes[0] && <p className="mt-4 border-l-2 border-[var(--gold)] pl-3 text-sm leading-6 text-stone-600">{cemetery.arrivalNotes[0]}</p>}
                {cemetery.burials.length > 0 && <p className="mt-4 text-sm font-semibold text-[var(--navy)]">{cemetery.burials.length} known kevarim recorded.</p>}
                {cemetery.address && <a href={placeDirectionsUrl(cemetery.address, cemetery.coordinates)} target="_blank" rel="noreferrer" className="mt-5 inline-block text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">Navigate to this beis hachaim</a>}
              </article>
            ))}
          </div>
        ) : (
          <div className="wg-card mt-10 border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Cemetery information</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Information is not available yet.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-stone-600">Names of the kevarim, arrival notes, and a shomer contact will appear here only after they are checked for this exact beis hachaim.</p>
          </div>
        )}

        {record && <PracticalInformation record={record} places={dbContent?.places ?? []} />}
      </section>

      <Footer />
    </main>
  );
}
