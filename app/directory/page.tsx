import { pageMetadata } from "@/lib/seo";
import DirectoryBrowser from "@/components/DirectoryBrowser";
import { featuredDisclosure } from "@/lib/features";
import Footer from "@/components/Footer";
import ListBusinessForm from "@/components/ListBusinessForm";
import Navbar from "@/components/Navbar";
import { getPublicProviders } from "@/lib/directory";

export const metadata = pageMetadata({
  title: "Directory — White Glove Itineraries",
  description: "Look up tour operators, vacation planners, travel agencies, guides and drivers for kosher and Jewish heritage travel.",
  path: "/directory",
});

export default async function DirectoryPage() {
  const providers = await getPublicProviders();

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">White Glove directory</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl lg:text-6xl">
            Find the people who make the trip happen.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">
            Look up tour operators, vacation planners, travel agencies, and private guides and drivers for kosher and Jewish heritage travel — search by name, region, or specialty.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <DirectoryBrowser providers={providers} featuredNote={featuredDisclosure()} />

        <div className="mt-12">
          <ListBusinessForm />
        </div>

        <p className="mt-8 max-w-3xl text-xs leading-5 text-stone-400">
          Listings are gathered from public sources and provider submissions. White Glove does not endorse or guarantee any provider — please confirm details and kashrus arrangements directly before booking.
        </p>
      </section>

      <Footer />
    </main>
  );
}
