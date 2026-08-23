import Link from "next/link";
import { destinationHref } from "@/lib/vacation-ideas";
import type { VacationDestinationItem } from "@/lib/vacation-destinations-view";

/**
 * A compact "featured this season" strip above the destinations filter row.
 *
 * Renders nothing unless there is at least one destination that is both
 * active and explicitly opted into featuring by an admin AND genuinely
 * carries the current season — see lib/vacation-ideas.ts `featuredThisSeason`.
 * No heading logic here decides *when* to show; this component only decides
 * *how*, so there is nowhere for a hardcoded season to sneak back in.
 */
export default function SeasonalFeaturedRow({ destinations }: { destinations: readonly VacationDestinationItem[] }) {
  if (destinations.length === 0) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">
        Featured this season
      </span>
      {destinations.map((d) => (
        <Link
          key={d.slug}
          href={destinationHref(d)}
          className="inline-flex min-h-9 items-center rounded-full border border-[var(--gold)] bg-white px-3 text-xs font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
        >
          {d.name}
        </Link>
      ))}
    </div>
  );
}
