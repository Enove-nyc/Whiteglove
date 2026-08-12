import EsimOffers from "@/components/EsimOffers";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import SponsoredSlot from "@/components/SponsoredSlot";
import { pageMetadata } from "@/lib/seo";
import { resolvePage } from "@/lib/pages";
import { visibleBlocks } from "@/data/page-blocks";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await resolvePage("esim");
  return pageMetadata({
    title: page?.seoTitle ?? "eSIMs and data abroad for a kosher trip | White Glove Itineraries",
    description:
      page?.seoDescription ??
      "What an eSIM is, what to check before you buy one, and where to get a data plan for the country you are going to.",
    path: "/esim",
  });
}

/**
 * Data abroad.
 *
 * WHY THIS PAGE EXISTS. The eSIM hand-off was live for weeks and reachable
 * only by scrolling past a search on /book, a planner, or a destination guide.
 * There was no page, nothing in the menu, nothing in the footer, and no
 * mention of data anywhere a person could look for it — so somebody who wanted
 * a data plan could only stumble on one while doing something else. The owner
 * put it plainly: there is no path, and if he could not find it nobody would.
 *
 * ONE NAME: eSIM. The address is what people type and search for, the heading
 * says the same word, and every link to it uses it. "Connectivity" describes
 * the category better and is not a word anybody types.
 *
 * WHAT IT IS CAREFUL ABOUT. The two things that actually stop an eSIM working
 * are named before the buying, not after: a phone that cannot take one, and a
 * plan bought for the wrong country. Both are the traveller's to check, both
 * are cheap to check, and both are expensive to discover at an airport.
 *
 * NOT A PROMISE ABOUT PRICE OR COVERAGE. Those are the provider's and change
 * constantly. This page says what to look at; it does not compare on the
 * traveller's behalf, because it has no data with which to do so honestly.
 *
 * The words are editable. The provider cards stay in code — they render
 * nothing until a programme is configured, and they are not content.
 */
export default async function EsimPage() {
  const page = (await resolvePage("esim"))!;
  const blocks = visibleBlocks(page.blocks);
  const hero = blocks.filter((b) => b.kind === "hero");
  const rest = blocks.filter((b) => b.kind !== "hero");

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />
      <PageBlocks blocks={hero} />

      {/* The providers, side by side. Renders nothing until one is configured. */}
      <EsimOffers />
      <SponsoredSlot placement="before-you-go" />

      <PageBlocks blocks={rest} />
      <Footer />
    </main>
  );
}
