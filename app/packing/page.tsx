import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PackingListPanel from "@/components/PackingListPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { isSignedIn } from "@/lib/require-signed-in";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";
import { AMAZON_DISCLOSURE, isAmazonLink } from "@/lib/travel-extras";
import { gearShownToVisitors } from "@/lib/travel-gear";
import { readGear } from "@/lib/travel-gear-store";

// Brand-aware and OPEN. This used to be signed-in only, and a visitor who
// wanted to know what to pack met the login door instead of an answer. It now
// opens with the starter list (data/packing-basics.ts) for everybody, and a
// signed-in visitor with a trip in the planner gets the list generated from
// that trip in its place. No plan gate either: a personal-travel tool, the
// same as /itinerary and /my-route.
export async function generateMetadata() {
  const itineraries = (await currentBrand()) === "itineraries";
  return pageMetadata({
    title: itineraries ? "Packing list — White Glove Itineraries" : "Packing list — White Glove Kosher Travel",
    description: "What to pack for a kosher trip — documents, Shabbos, food, and the rest. Build a trip and the list is made for it.",
    path: "/packing",
  });
}

export const dynamic = "force-dynamic";

export default async function PackingPage() {
  // Whether to ask the account for a trip at all. A signed-out visitor gets
  // the starter list without a round trip that could only return a 401.
  const signedIn = await isSignedIn();
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
          description="A starting list for a kosher trip, to check off as you pack. With a trip in the planner it is built from where you are going, when, and what you have planned."
        />
        <div className="mt-8">
          <PackingListPanel gear={shelf} signedIn={signedIn} />
        </div>
        {amazon && <p className="mt-8 text-xs leading-5 text-stone-500">{AMAZON_DISCLOSURE}</p>}
      </section>
      <Footer />
    </main>
  );
}
