import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PackingListPanel from "@/components/PackingListPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSignedIn } from "@/lib/require-signed-in";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";
import { AMAZON_DISCLOSURE, isAmazonLink } from "@/lib/travel-extras";
import { gearShownToVisitors } from "@/lib/travel-gear";
import { readGear } from "@/lib/travel-gear-store";

// Brand-aware, signed-in only: /packing is one of the itineraries domain's
// own pages, the same as /itinerary and /my-route — a personal-travel tool,
// not a client-facing one, so no plan gate here.
export async function generateMetadata() {
  const itineraries = (await currentBrand()) === "itineraries";
  return pageMetadata({
    title: itineraries ? "Packing list — White Glove Itineraries" : "Packing list — White Glove Kosher Travel",
    description: "An AI-suggested packing list for the trip in your planner right now.",
    path: "/packing",
    noIndex: true,
  });
}

export const dynamic = "force-dynamic";

export default async function PackingPage() {
  await requireSignedIn("/packing");

  // The gear shelf, read once here and handed to the list. A packing line
  // that names something on the shelf gets a quiet link to it — the one place
  // on the site where a traveller is already reading a list of things they
  // have to go and buy. Nothing is added to the list and nothing is reordered;
  // see data/packing-gear-match.ts.
  const shelf = gearShownToVisitors(await readGear()).map((item) => ({ id: item.id, name: item.name, url: item.url }));
  // Amazon's wording has to appear wherever its links do, not only on
  // /travel-gear — and only when one of the links actually shown is Amazon's.
  const amazon = shelf.some((item) => isAmazonLink(item.url));

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <PageHeader
          eyebrow="Packing list"
          title="What to pack"
          description="Suggested from this trip's destinations, dates and planned stops — check items off as you pack, and regenerate any time the trip changes."
        />
        <div className="mt-8">
          <PackingListPanel gear={shelf} />
        </div>
        {amazon && <p className="mt-8 text-xs leading-5 text-stone-500">{AMAZON_DISCLOSURE}</p>}
      </section>
      <Footer />
    </main>
  );
}
