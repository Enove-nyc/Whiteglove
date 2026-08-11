import Link from "next/link";
import { notFound } from "next/navigation";
import ContentImportCandidateEditor from "@/components/ContentImportCandidateEditor";
import { getContentImportCandidate } from "@/lib/content-imports";

export const dynamic = "force-dynamic";

export default async function ContentImportCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await getContentImportCandidate(id);
  if (!candidate) notFound();

  return (
    <>
      <Link href="/admin/imports" className="text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">
        ← Back to bulk content imports
      </Link>
      <header className="mt-7">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">{candidate.kindLabel} · {candidate.city}, {candidate.country}</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">{candidate.name}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
          Review the source evidence and complete the listing. Saving keeps it private; publishing is available only when the record meets the public-listing rules.
        </p>
      </header>
      <section className="mt-8 max-w-5xl">
        <ContentImportCandidateEditor candidate={candidate} />
      </section>
    </>
  );
}
