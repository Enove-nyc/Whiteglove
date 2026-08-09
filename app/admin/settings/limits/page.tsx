import Link from "next/link";
import PlanLimitsForm from "@/components/PlanLimitsForm";
import { getLimitOverridesFresh, limitsStoreAvailable } from "@/lib/account-limits-store";

export const dynamic = "force-dynamic";

export default async function PlanLimitsSettings() {
  const current = await getLimitOverridesFresh();

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">
              What a free account gets
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              Two limits, and only these two. Everything else on the site is the same on every plan — every kever,
              every guide, the planner, the map, and sharing a trip with anybody.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              <strong className="font-semibold text-[var(--navy)]">Nothing already made is ever taken away.</strong>{" "}
              Lowering a number stops new trips being started; it does not close, hide or delete a trip somebody
              already has. Somebody with five trips keeps five, and can still open, edit, print and share all of them.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
          >
            Settings
          </Link>
        </div>
      </header>

      <section className="mt-8 rounded-lg border border-[var(--gold-light)] bg-white p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">How the week is counted</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          A rolling seven days, not a calendar week — so nobody has to wait until Sunday, and nobody gets two copies by
          printing late on Saturday and again on Sunday morning. Reopening the same trip within half an hour does not
          count twice: a printer jams, a tab closes, and charging a week&rsquo;s allowance for a page nobody got out of
          the printer would read as a fault rather than a rule.
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          If the private store cannot be reached, the copy is allowed through. Somebody standing at a printer being
          told no for a reason that has nothing to do with them is a worse outcome than one extra copy.
        </p>
      </section>

      <PlanLimitsForm current={current} storeReady={limitsStoreAvailable()} />
    </>
  );
}
