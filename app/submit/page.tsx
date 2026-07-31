import { pageMetadata } from "@/lib/seo";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import SubmitEntryForm from "@/components/SubmitEntryForm";
import { resolvePage } from "@/lib/pages";

export async function generateMetadata() {
  const page = await resolvePage("submit");
  // The owner writes the title and description in the admin; the
  // canonical URL and the share card come from the page it is.
  return pageMetadata({
    title: page?.seoTitle ?? "White Glove Itineraries",
    description: page?.seoDescription ?? "Thoughtfully planned kosher travel and Jewish heritage journeys.",
    path: "/submit",
  });
}

// The words at the top are editable; the form below them is a tool, not
// content, so it stays in code.
export default async function SubmitPage() {
  const page = (await resolvePage("submit"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={page.blocks} />
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <SubmitEntryForm />
      </section>
      <Footer />
    </main>
  );
}
