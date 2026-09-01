import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import type { PlanningChip } from "@/data/planning-now";

/**
 * WHAT PEOPLE ARE PLANNING RIGHT NOW — one quiet line under the search.
 *
 * IT IS SECONDARY AND HAS TO STAY THAT WAY. The homepage opens on the search
 * and nothing above it; this sits under the hero, above Featured, in small
 * type. It is a hint about the season, not a second navigation — so no
 * headline, no cards, no images, no counts, and at most three of them.
 *
 * WHEN NOTHING IS IN SEASON IT RENDERS NOTHING AT ALL. Not an empty container
 * with its margins still on it — a homepage with a hole in it for most of the
 * year is worse than one that never had a row. The caller can therefore place
 * this unconditionally.
 *
 * NO CAROUSEL, AND NO SIDEWAYS SCROLL. Three short chips wrap onto a second
 * line on a narrow phone, which is the whole reason the label is capped at 24
 * characters.
 */
export function PlanningNowRow({ chips }: { chips: PlanningChip[] }) {
  if (chips.length === 0) return null;
  return (
    <nav aria-label="Planning now" className="mx-auto max-w-7xl px-5 pt-8 sm:px-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">Planning now</span>
        <ul className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <li key={chip.id}>
              <Link
                href={chip.href}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--gold-light)] bg-white px-4 text-sm font-semibold text-[var(--navy)] transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
              >
                {chip.icon && <Icon name={chip.icon} className="h-4 w-4 text-[var(--gold-ink)]" />}
                {chip.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
