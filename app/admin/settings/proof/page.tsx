import CaseStudiesForm from "@/components/CaseStudiesForm";
import { caseStudiesStoreAvailable, readCaseStudiesFresh } from "@/lib/case-studies-store";

export const dynamic = "force-dynamic";

export default async function ProofSettingsPage() {
  const [studies, storeReady] = await Promise.all([readCaseStudiesFresh(), Promise.resolve(caseStudiesStoreAvailable())]);

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Case studies</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Real trip outcomes only — with permission. Nothing appears on the public site until a record is complete,
          permission is recorded, and you approve it. Do not invent testimonials. Distinct from the sample itinerary.
        </p>
      </header>
      <CaseStudiesForm studies={studies} storeReady={storeReady} />
    </>
  );
}
