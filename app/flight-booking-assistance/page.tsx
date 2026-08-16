import { readWords } from "@/lib/site-words-store";
import { pageMetadata } from "@/lib/seo";
import FlightRequestForm from "@/components/FlightRequestForm";
import Footer from "@/components/Footer";
import { GloveList } from "@/components/GloveMark";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import { visibleBlocks } from "@/data/page-blocks";
import { tripArrangementOpen } from "@/lib/features";
import { resolvePage } from "@/lib/pages";

export async function generateMetadata() {
  const page = await resolvePage("flight-booking-assistance");
  // The owner writes the title and description in the admin; the
  // canonical URL and the share card come from the page it is.
  return pageMetadata({
    title: page?.seoTitle ?? "White Glove Kosher Travel",
    description: page?.seoDescription ?? "Thoughtfully planned kosher travel and Jewish heritage journeys.",
    path: "/flight-booking-assistance",
  });
}

export default async function FlightBookingAssistancePage() {
  const page = (await resolvePage("flight-booking-assistance"))!;
  const blocks = visibleBlocks(page.blocks);
  const heroBlocks = blocks.filter((block) => block.kind === "hero");
  const checklist = blocks.find((block) => block.kind === "list");
  const supportingBlocks = blocks.filter((block) => block.kind !== "hero" && block !== checklist);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={heroBlocks} />
      {supportingBlocks.length > 0 && <PageBlocks blocks={supportingBlocks} />}
      {/* The page lists what to send us; this is how it gets sent. Kept out of
          the blocks so the page stays editable in the admin without the form
          being something that can be deleted by accident. */}
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.65fr)] lg:items-start lg:gap-12">
        {checklist?.kind === "list" && (
          <aside className="rounded-3xl border border-[var(--gold-light)] bg-[var(--cream-deep)] p-6 shadow-[0_14px_38px_rgba(23,45,82,.06)] sm:p-8 lg:sticky lg:top-32">
            {checklist.heading && (
              <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">
                {checklist.heading}
              </h2>
            )}
            <GloveList items={checklist.items.filter(Boolean)} className="mt-6 space-y-4 text-base leading-7 text-stone-600" />
          </aside>
        )}
        {/* The page keeps saying what we do — that is the service, and it is
            true. The form is what waits: it does not take requests until the
            concierge side is open. */}
        <FlightRequestForm open={tripArrangementOpen()} words={await readWords()} />
      </section>
      <Footer />
    </main>
  );
}
