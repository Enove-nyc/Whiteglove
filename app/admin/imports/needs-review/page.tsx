import Link from "next/link";
import ImportNeedsReviewQueue from "@/components/ImportNeedsReviewQueue";
import ReconcileImportDuplicatesButton from "@/components/ReconcileImportDuplicatesButton";
import { getImportReviewQueue } from "@/lib/import-review-queue";
import { reconcileOpenImportDuplicates } from "@/lib/content-imports";

export const dynamic = "force-dynamic";

export default async function AdminImportNeedsReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // Housekeeping for older staged rows: every kind is checked (attractions,
  // practical, stays, food). Same-place doubles must not both sit in Needs
  // review. Soft-fail so a database hiccup still renders the queue.
  let reconcileNote: string | null = null;
  try {
    const reconciled = await reconcileOpenImportDuplicates();
    if (reconciled.marked > 0) {
      reconcileNote = `Checked every open listing and marked ${reconciled.marked} same-place doubles across ${reconciled.groups} places. The stronger listing stays in Needs review; the rest moved to Possible duplicates.`;
    }
  } catch {
    reconcileNote = null;
  }

  const queue = await getImportReviewQueue();
  const { q = "" } = await searchParams;

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove admin · directory</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Needs review</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
              Every listing candidate that still needs verification before it can become a public White Glove listing. Nothing here is published automatically. Packs prefill category, summary, and address when known — open a row, check it, then publish. Attractions and lodging do not have to be Jewish or kosher — audience-appropriate is not kosher-only — but they must suit Orthodox / Torah-observant travelers (reject clubs, nightlife, mixed concerts, and similar). Reserve kosher checks for food / kashrus candidates. Beis hachaim and kevarim stay on their own admin screens.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ReconcileImportDuplicatesButton />
            <Link
              href="/admin/imports"
              className="inline-flex min-h-11 items-center border border-[var(--gold)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
            >
              Bulk imports
            </Link>
            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center border border-[var(--gold-light)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {reconcileNote && (
        <section className="mt-8 border border-amber-200 bg-amber-50 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-900">Same-place doubles cleared</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-amber-950">{reconcileNote}</p>
        </section>
      )}

      {queue.error && (
        <section className="mt-8 border border-rose-200 bg-rose-50 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-800">Could not load the queue</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-rose-900">{queue.error}</p>
        </section>
      )}

      {!queue.error && <ImportNeedsReviewQueue queue={queue} initialQuery={q} />}
    </>
  );
}
