import { pageMetadata } from "@/lib/seo";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import EateryDirectory from "@/components/EateryDirectory";
import KosherFinder from "@/components/KosherFinder";
import { kosherEateries } from "@/data/kosher-eateries";
import { resolvePage } from "@/lib/pages";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await resolvePage("kosher");
  // The owner writes the title and description in the admin; the
  // canonical URL and the share card come from the page it is.
  return pageMetadata({
    title: page?.seoTitle ?? "White Glove Itineraries",
    description: page?.seoDescription ?? "Thoughtfully planned kosher travel and Jewish heritage journeys.",
    path: "/kosher",
  });
}

// The words at the top are editable; the finder below them is a tool, not
// content, so it stays in code.
export default async function KosherPage() {
  const page = (await resolvePage("kosher"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={page.blocks} />
      {/* The directory and finder share White Glove's curated collection. The
          directory provides the fuller card view; the finder narrows it. */}
      <section className="mx-auto max-w-7xl px-5 pb-4 sm:px-8">
        <EateryDirectory eateries={kosherEateries} />
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <KosherFinder />
      </section>
      <Footer />
    </main>
  );
}
