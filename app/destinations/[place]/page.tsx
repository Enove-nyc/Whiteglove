import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SavePlaceButtons from "@/components/SavePlaceButtons";
import { bulkDestinations, getBulkDestination } from "@/data/bulk-destinations";

export function generateStaticParams() {
  return bulkDestinations.map(({ slug }) => ({ place: slug }));
}

export default async function BulkDestinationPage({ params }: { params: Promise<{ place: string }> }) {
  const { place: slug } = await params;
  const destination = getBulkDestination(slug);
  if (!destination) notFound();

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">Destination directory · {destination.country}</p>
          <h1 dir="rtl" className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">{destination.yiddishCity}</h1>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-stone-500 sm:text-4xl">{destination.city}</p>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">{destination.summary}</p>
          <SavePlaceButtons place={{ id: `destination-${destination.slug}`, name: destination.city, yiddishName: destination.yiddishCity, address: `${destination.city}, ${destination.country}`, href: `/destinations/${destination.slug}` }} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {["Kivrei tzaddikim", "Shomer & access", "Accommodations", "Kosher food", "Minyanim & mikvaos", "Transport & local contacts"].map((section) => (
            <article key={section} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{section}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">Information is not available yet. We will add it only after it has been checked for this exact destination.</p>
            </article>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
