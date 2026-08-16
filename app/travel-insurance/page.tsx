import { pageMetadata } from "@/lib/seo";
import Footer from "@/components/Footer";
import InsurancePanel from "@/components/InsurancePanel";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import { resolvePage } from "@/lib/pages";

export async function generateMetadata() {
  const page = await resolvePage("travel-insurance");
  // The owner writes the title and description in the admin; the
  // canonical URL and the share card come from the page it is.
  return pageMetadata({
    title: page?.seoTitle ?? "White Glove Kosher Travel",
    description: page?.seoDescription ?? "Thoughtfully planned kosher travel and Jewish heritage journeys.",
    path: "/travel-insurance",
  });
}

export default async function TravelInsurancePage() {
  const page = (await resolvePage("travel-insurance"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={page.blocks} />
      {/* The hand-off, under what cover means rather than over it — somebody
          who has just read which four things a policy usually covers is the
          person ready to compare them. Renders nothing until the insurance card
          is enabled and configured. */}
      <InsurancePanel />
      <Footer />
    </main>
  );
}
