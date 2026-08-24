import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PackingListPanel from "@/components/PackingListPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSignedIn } from "@/lib/require-signed-in";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";

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
          <PackingListPanel />
        </div>
      </section>
      <Footer />
    </main>
  );
}
