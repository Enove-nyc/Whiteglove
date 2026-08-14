import Link from "next/link";
import PlannerAssumptionsForm from "@/components/PlannerAssumptionsForm";
import { changedFields } from "@/lib/planner-settings";
import { plannerStoreAvailable, readAssumptions } from "@/lib/planner-settings-store";

export const dynamic = "force-dynamic";

export default async function AdminPlannerPage() {
  const current = await readAssumptions();
  const changed = changedFields(current);

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Planner</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              How the planner judges a packed day, free hours, and arrival times.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              {changed.length === 0
                ? "Nothing here has been changed yet — the planner is using the figures the site ships with."
                : // Separated by a dot rather than a comma: one of the labels
                  // has a comma inside it, and a comma-joined list ran the
                  // items together into one unreadable sentence.
                  `Changed so far — ${changed.map((f) => f.label.toLowerCase()).join(" · ")}.`}
            </p>
          </div>
          <Link href="/admin" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Dashboard</Link>
        </div>
      </header>

      <PlannerAssumptionsForm current={current} storeReady={plannerStoreAvailable()} />
    </>
  );
}
