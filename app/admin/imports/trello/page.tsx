import Link from "next/link";
import TrelloCandidateReviewPanel from "@/components/TrelloCandidateReviewPanel";
import { getTrelloCandidateReviewCandidates } from "@/lib/trello-candidate-review-candidates";
import {
  getTrelloCandidateMappingSummary,
  getTrelloCandidateReviewReadiness,
  readTrelloCandidateReviewSettings,
} from "@/lib/trello-candidate-review-store";

export const dynamic = "force-dynamic";

export default async function TrelloCandidateReviewPage() {
  const [candidateSet, readiness, mappings, settings] = await Promise.all([
    getTrelloCandidateReviewCandidates(),
    getTrelloCandidateReviewReadiness(),
    getTrelloCandidateMappingSummary(),
    readTrelloCandidateReviewSettings(),
  ]);

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove admin · directory</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Trello review cards</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
              Send source-attributed editorial candidates to an internal review board without exposing unfinished information to visitors.
            </p>
          </div>
          <Link
            href="/admin/imports"
            className="inline-flex min-h-11 items-center border border-[var(--gold)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
          >
            Bulk imports
          </Link>
        </div>
      </header>

      <TrelloCandidateReviewPanel
        settings={settings.settings}
        readiness={readiness}
        mappings={mappings}
        candidateCount={candidateSet.candidates.filter((candidate) => candidate.status === "NEEDS_REVIEW").length}
        candidateSourceLabel={candidateSet.sourceLabel}
        candidateSourceAvailable={candidateSet.sourceAvailable}
        withheldForMissingProvenance={candidateSet.withheldForMissingProvenance}
      />
    </>
  );
}
