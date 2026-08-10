import type { CaseStudy } from "@/data/case-studies";

/**
 * Public case studies — renders nothing when the list is empty.
 *
 * Deliberately separate from the sample itinerary: this is a permitted client
 * outcome, not an illustrative deliverable.
 */
export default function CaseStudiesSection({ studies }: { studies: CaseStudy[] }) {
  if (studies.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">From real trips</p>
      <h2 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
        What planning looked like for someone else.
      </h2>
      <p className="mt-4 max-w-2xl leading-7 text-stone-600">
        Each note below is from a trip we planned, published only with permission. This is not the sample itinerary —
        that page shows the shape of a deliverable; these are outcomes.
      </p>
      <ul className="mt-10 grid gap-8 lg:grid-cols-2">
        {studies.map((study) => (
          <li key={study.id} className="border-t border-[var(--gold-light)] pt-5">
            <p className="text-sm font-semibold text-[var(--navy)]">
              {study.attribution}
              {study.anonymised && (
                <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500">Name withheld</span>
              )}
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              <span className="font-semibold text-stone-700">They asked for: </span>
              {study.tripRequest}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              <span className="font-semibold text-stone-700">What we solved: </span>
              {study.whatSolved}
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              <span className="font-semibold text-stone-700">Outcome: </span>
              {study.outcome}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
