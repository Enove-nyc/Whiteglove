import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { dataHealth, healthSummary, type HealthSeverity } from "@/lib/data-health";

export const dynamic = "force-dynamic";

const TONE: Record<HealthSeverity, string> = {
  breaks: "border-red-300 bg-red-50 text-red-800",
  thin: "border-amber-300 bg-amber-50 text-amber-900",
  deliberate: "border-stone-300 bg-stone-50 text-stone-600",
};

const HEADING: Record<HealthSeverity, string> = {
  breaks: "Switches something off",
  thin: "Leaves a page thinner",
  deliberate: "Blank on purpose",
};

/**
 * What is missing across the real records, and what each gap costs.
 *
 * The Checklist is the owner's own notes against pages; Reports says which
 * empty pages people open. This reads the content itself — see lib/data-health.ts,
 * which also explains why the batei hachaim section is not a list of work.
 */
export default function DataHealthPage() {
  const checks = dataHealth();
  const groups: HealthSeverity[] = ["breaks", "thin", "deliberate"];

  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin" title="Data health" />
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">{healthSummary(checks)}</p>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-stone-500">
          Counted from the site&apos;s own listings, so these numbers are here whether or not the database is reachable.
          A row is listed only when something is actually missing.
        </p>
      </header>

      {checks.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-[var(--gold-light)] bg-[#FAF8F3] p-5 text-sm leading-6 text-stone-600">
          Nothing is missing that this knows how to look for.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {groups.map((severity) => {
            const rows = checks.filter((check) => check.severity === severity);
            // An empty group is not a heading over nothing.
            if (rows.length === 0) return null;
            return (
              <section key={severity}>
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">{HEADING[severity]}</h2>
                <ul className="mt-3 divide-y divide-[var(--gold-light)] rounded-lg border border-[var(--gold-light)]">
                  {rows.map((check) => (
                    <li key={check.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[var(--navy)]">{check.label}</span>
                          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${TONE[check.severity]}`}>
                            {check.affected.toLocaleString("en-US")} of {check.total.toLocaleString("en-US")}
                          </span>
                        </p>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">{check.costs}</p>
                      </div>
                      {/* Nothing to open for a blank that stays blank. */}
                      {check.severity !== "deliberate" && (
                        <Link
                          href={check.href}
                          className="inline-flex min-h-11 shrink-0 items-center text-xs font-semibold text-[var(--navy)] underline sm:min-h-0"
                        >
                          Open the list
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
