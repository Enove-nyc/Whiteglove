import { notFound } from "next/navigation";
import CaseStudiesSection from "@/components/CaseStudiesSection";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StructuredData from "@/components/StructuredData";
import { caseStudiesPageShouldExist } from "@/data/case-studies";
import { readPublicCaseStudies } from "@/lib/case-studies-store";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

export async function generateMetadata() {
  const studies = await readPublicCaseStudies();
  if (!caseStudiesPageShouldExist(studies)) {
    return { title: "Case studies — White Glove Itineraries", robots: { index: false, follow: false } };
  }
  return pageMetadata({
    title: "Case studies — real trips we planned | White Glove Itineraries",
    description:
      "Permitted outcomes from trips White Glove planned — not the sample itinerary. Published only with the traveller’s consent.",
    path: "/case-studies",
  });
}

/**
 * Dedicated case-study page — exists only when there is enough approved content.
 *
 * An empty public page would invent social proof by its absence of substance.
 * Below the threshold the route 404s; the sitemap and nav omit it too.
 */
export default async function CaseStudiesPage() {
  const studies = await readPublicCaseStudies();
  if (!caseStudiesPageShouldExist(studies)) notFound();

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Case studies", path: "/case-studies" },
        ])}
      />
      <Navbar />
      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">From real trips</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.08] text-[var(--navy)]">
            Case studies.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">
            Genuine trip outcomes, published only with permission. Distinct from the sample itinerary, which shows the
            shape of a deliverable rather than a client result.
          </p>
        </div>
      </section>
      <CaseStudiesSection studies={studies} variant="page" />
      <Footer />
    </main>
  );
}
