import Link from "next/link";
import { PLAN_LABELS, type AccountPlan } from "@/lib/account-plans";

/**
 * What an advisor tool actually offers, shown to somebody who cannot open it
 * yet — instead of one line of boilerplate repeated, word for word, on every
 * gated page. The bullets are the same facts the unlocked page already shows
 * once opened; this just says them a step earlier.
 */
export default function LockedToolCard({ toolLabel, plan, bullets }: { toolLabel: string; plan: AccountPlan; bullets: string[] }) {
  return (
    <div className="mt-8 max-w-xl rounded-2xl border border-[var(--gold-light)] bg-white p-6">
      <p className="text-base leading-7 text-stone-600">
        {toolLabel} is part of {PLAN_LABELS.starter} and up. You are on {PLAN_LABELS[plan]}.
      </p>
      <ul className="glove-list mt-4 space-y-2 text-sm leading-6 text-stone-600">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/account" className="rounded-full bg-[var(--navy)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
          Ask about {PLAN_LABELS.starter}
        </Link>
        <Link href="/itinerary" className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-white">
          Back to the planner
        </Link>
      </div>
    </div>
  );
}
