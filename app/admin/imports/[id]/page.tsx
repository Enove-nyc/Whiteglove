import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import ContentImportCandidateEditor from "@/components/ContentImportCandidateEditor";
import { contentImportCandidatePath } from "@/lib/bulk-content";
import { getContentImportCandidate } from "@/lib/content-imports";
import { listDestinationsForAdmin } from "@/lib/content-admin";
import { nextReviewCandidateAfter } from "@/lib/import-review-queue";

export const dynamic = "force-dynamic";

export default async function ContentImportCandidatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ candidate?: string; just?: string }>;
}) {
  const { id } = await params;
  const { candidate: candidateId, just } = await searchParams;
  const candidate = await getContentImportCandidate(id, candidateId);
  if (!candidate) notFound();
  if (id === candidate.id) permanentRedirect(contentImportCandidatePath(candidate.sourceId, candidate.id));
  // The towns this listing can be linked to — a picker, not a slug to type.
  // "Link this to an existing destination" was a free-text field asking for an
  // internal slug ("e.g. miami"), which is the thing the owner could not
  // understand. An unreachable database leaves the list empty rather than
  // breaking the page.
  const destinations = await listDestinationsForAdmin()
    .then((rows) => rows.map((d) => ({ slug: d.slug, city: d.city, country: d.country })))
    .catch(() => [] as Array<{ slug: string; city: string; country: string }>);

  // The next one waiting, so a candidate that needs more work than there is
  // time for can be left for later without deciding anything about it.
  const next = candidate.status === "NEEDS_REVIEW" ? await nextReviewCandidateAfter(candidate.id).catch(() => null) : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/imports" className="text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">
          ← Back to bulk content imports
        </Link>
        {next && (
          <Link
            href={next.href}
            className="inline-flex min-h-11 items-center border border-[var(--gold)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
          >
            Skip — next waiting: {next.name} →
          </Link>
        )}
      </div>
      {just && (
        <p className="mt-6 border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
          The previous one was {just}. This is the next candidate waiting for review.
        </p>
      )}
      <header className="mt-7">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">{candidate.kindLabel} · {candidate.city}, {candidate.country}</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">{candidate.name}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
          Review the source evidence and complete the listing. Saving keeps it private; publishing is available only when the record meets the public-listing rules.
        </p>
      </header>
      <section className="mt-8 max-w-5xl">
        <ContentImportCandidateEditor key={candidate.id} candidate={candidate} destinations={destinations} />
      </section>
    </>
  );
}
