import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import DestinationActions from "@/components/DestinationActions";
import { airportsFor } from "@/lib/destination-actions";
import PhotoGallery from "@/components/PhotoGallery";
import PracticalInformation from "@/components/PracticalInformation";
import { bulkDestinations, getBulkDestination } from "@/data/destinations-bulk";
import { placeDirectionsUrl } from "@/data/route-utils";
import { getDestinationRecord } from "@/data/destination-database";
import { getPublishedDestinationContent } from "@/lib/content";
import StructuredData from "@/components/StructuredData";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs, touristAttraction } from "@/lib/structured-data";

export function generateStaticParams() {
  return bulkDestinations.map(({ slug }) => ({ place: slug }));
}

// Re-render at most hourly; admin edits also trigger on-demand revalidation.
// A minute, not an hour.
//
// This page shows listings the owner edits in the admin, and the admin says
// "changes go live within a minute — no code, no redeploy." It was an hour,
// so that promise was wrong by a factor of sixty and the owner would have
// concluded the editor was broken.
//
// Measured rather than assumed: with a sixty-second window an edit made after
// the build did appear. (That is not true of the pages whose reads are
// `cache: "no-store"` fetches — those needed force-dynamic. Prisma reads are
// not fetch-cached, so revalidation reaches them.)
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ place: string }> }) {
  const { place: slug } = await params;
  const destination = getBulkDestination(slug);
  if (!destination) return pageMetadata({ title: "Destination not found | White Glove Itineraries", description: "This destination could not be found.", path: `/heritage/towns/${slug}`, noIndex: true });
  return pageMetadata({
    title: `${destination.city}, ${destination.country} — Jewish Heritage Guide | White Glove`,
    description: destination.summary
      ? `${destination.summary} Practical details for ${destination.city} are published here once they have been checked.`
      : `${destination.city}, ${destination.country}: kevarim, addresses and travel details, published as each one is checked.`,
    path: `/heritage/towns/${destination.slug}`,
  });
}

export default async function BulkDestinationPage({ params }: { params: Promise<{ place: string }> }) {
  const { place: slug } = await params;
  const destination = getBulkDestination(slug);
  if (!destination) notFound();

  const record = getDestinationRecord(destination.slug);
  const dbContent = await getPublishedDestinationContent(destination.slug);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <StructuredData
        data={[
          touristAttraction({
            name: destination.city,
            description: destination.summary ?? `Jewish heritage destination in ${destination.country}.`,
            path: `/heritage/towns/${destination.slug}`,
            coordinates: record?.cemeteries[0]?.coordinates,
            country: destination.country,
            alternateNames: [destination.yiddishCity, ...(destination.aliases ?? [])],
          }),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Destinations", path: "/destinations" },
            { name: destination.city, path: `/heritage/towns/${destination.slug}` },
          ]),
        ]}
      />
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Destination directory · {destination.country}</p>
          <h1 dir="rtl" lang="yi" className="mt-5 font-[family-name:var(--font-display)] text-[clamp(2.75rem,8vw,5rem)] leading-tight text-[var(--navy)]">{destination.yiddishCity}</h1>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-stone-500 sm:text-4xl">{destination.city}</p>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">{destination.summary}</p>
          <DestinationActions place={{ id: `destination-${destination.slug}`, name: destination.city, yiddishName: destination.yiddishCity, address: `${destination.city}, ${destination.country}`, coordinates: record?.cemeteries[0]?.coordinates, href: `/destinations/${destination.slug}` }} airports={airportsFor(destination.country, `${destination.city}, ${destination.country}`, record?.cemeteries[0]?.coordinates)} />
          
          {/* A picture of the town, or of one of its listings. Nothing sent
              here appears until the owner has looked at it. */}
          
        </div>
      </section>

      {/* AN ADMIN PANEL USED TO BE HERE, on a public page: "Verification
          summary", "What is ready, and what still needs checking", a line
          asking the visitor to send us missing shomer numbers, and then
          "Destination record: Available", "Batei hachaim: 3" and "Practical
          sections are shown only when they exist in the destination
          database". Every line of it was written for the person maintaining
          the site, and it was shown to the person planning a journey. The
          batei hachaim themselves are below, which is what somebody came for.

          The per-cemetery "Needs verification / Unavailable" chips went with
          it — see lib/trust-status.ts on why the labels a customer meets are
          instructions rather than our queue position. */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Cemetery information</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Information is not available yet.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-stone-600">Names of the kevarim, arrival notes, and a shomer contact will appear here only after they are checked for this exact beis hachaim.</p>
          </div>
        )}

        <PhotoGallery photos={dbContent?.photos ?? []} />
        {record && <PracticalInformation record={record} places={dbContent?.places ?? []} />}
      </section>

      <Footer />
    </main>
  );
}
