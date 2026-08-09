import { readWords } from "@/lib/site-words-store";
import { pageMetadata } from "@/lib/seo";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import PlanningRequestForm from "@/components/PlanningRequestForm";
import { resolvePage } from "@/lib/pages";
import { TRIP_KINDS, type TripKind } from "@/lib/trip-plan";

export async function generateMetadata() {
  const page = await resolvePage("contact");
  // The owner writes the title and description in the admin; the
  // canonical URL and the share card come from the page it is.
  return pageMetadata({
    title: page?.seoTitle ?? "White Glove Itineraries",
    description: page?.seoDescription ?? "Tell us about the trip you want to take, and we will help you plan it.",
    path: "/contact",
  });
}

/**
 * The words at the top are editable; the form below them is a tool, not
 * content, so it stays in code.
 *
 * The form used to be a plain five-field contact box under a heading that
 * asked for "your kevarim, dates, and kosher needs". It is a structured
 * planning request now, and the kevarim question is asked only of somebody
 * who has said they are planning a heritage journey — see
 * components/PlanningRequestForm.tsx.
 */
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string; destination?: string; from?: string }>;
}) {
  const { trip, destination } = await searchParams;
  const page = (await resolvePage("contact"))!;
  const initialKind = (TRIP_KINDS.find((entry) => entry.value === trip)?.value ?? "") as TripKind | "";
  // Trimmed and capped rather than printed as given: it lands in a text field
  // as though the visitor had typed it, and a link is not a trustworthy author.
  const initialDestination = typeof destination === "string" ? destination.replace(/\s+/g, " ").trim().slice(0, 80) : "";

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={page.blocks} />
      <section className="mx-auto max-w-5xl px-5 pb-16 sm:px-8">
        <PlanningRequestForm words={await readWords()} initialKind={initialKind} initialDestination={initialDestination} />
      </section>
      <Footer />
    </main>
  );
}
