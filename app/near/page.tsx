import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import NearbyExplorer from "@/components/NearbyExplorer";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageMetadata } from "@/lib/seo";

/**
 * NEAR ANYWHERE A TRAVELER CAN NAME.
 *
 * The question a traveller asks once the hotel is booked and before Shabbos:
 * how far is the shul, and can I walk it. The site had every piece of that —
 * the quarters, the shuls, the things to do, all with coordinates — and for a
 * while only one way to ask it: the name of a hotel, on a metered key. A city,
 * an airport, a landmark and a postcode all work now, and so does the
 * browser's own location for anybody who offers it.
 *
 * IT ANSWERS WITH THE QUARTER FIRST, and that is a data decision as much as a
 * design one. 28 of the site's 1466 kosher food listings carry coordinates and
 * the mikvaos carry none, so "the nearest restaurant" is a question this site
 * cannot honestly answer — while "the Ghetto is 500m away, about eight
 * minutes" it can answer for every quarter it lists, and it is the more useful
 * sentence anyway, because the quarter is where the food and the shuls are.
 * data/near-me.ts holds that reasoning and the arithmetic.
 */

export const metadata = pageMetadata({
  title: "What is nearby — shuls, the Jewish quarter and what is walkable",
  description:
    "Name a city, an airport, a landmark or your hotel and see the Jewish quarter, the shuls, the kosher food and what is worth seeing around it, with walking distances.",
  path: "/near",
});

export default function NearPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <PageHeader
          eyebrow="Near you"
          title="What is nearby"
          description="Name a city, an airport, a landmark or the hotel, and see the Jewish quarter, the shuls, the kosher food and what is worth seeing around it — with the walk, which is the part that matters on Shabbos."
        />
        <div className="mt-8">
          <NearbyExplorer />
        </div>
        <p className="mt-12 text-sm leading-6 text-stone-600">
          Going for Shabbos?{" "}
          <Link href="/destinations" className="font-semibold text-[var(--gold-ink)] underline">
            Pick the destination
          </Link>{" "}
          for its candle-lighting, shuls, mikvaos and eruv on one page.
        </p>
      </section>
      <Footer />
    </main>
  );
}
