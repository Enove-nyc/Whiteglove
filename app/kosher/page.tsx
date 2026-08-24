import { pageMetadata } from "@/lib/seo";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import EateryDirectory from "@/components/EateryDirectory";
import { kosherEateries } from "@/data/kosher-eateries";
import { resolvePage } from "@/lib/pages";

export async function generateMetadata() {
  const page = await resolvePage("kosher");
  // The owner writes the title and description in the admin; the
  // canonical URL and the share card come from the page it is.
  return pageMetadata({
    title: page?.seoTitle ?? "White Glove Kosher Travel",
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
      {/* ONE SEARCH, NOT TWO. There used to be a second search box under this
          one — the same curated collection, searched again — so the page asked
          you to search twice for one thing. The directory is the kosher food
          finder: it searches those listings by city, country, kind or name,
          shows the fuller card, and puts a place on the trip. */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <EateryDirectory eateries={kosherEateries} />
      </section>
      <Footer />
    </main>
  );
}
