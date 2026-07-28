import { ADVISORY_LEVELS, ADVISORY_SOURCE_URL, advisoryFor, fetchAdvisories } from "@/lib/travel-advisories";

const TONE: Record<string, string> = {
  ok: "border-emerald-300 bg-emerald-50 text-emerald-900",
  caution: "border-amber-300 bg-amber-50 text-amber-900",
  warn: "border-orange-400 bg-orange-50 text-orange-900",
  danger: "border-red-400 bg-red-50 text-red-900",
};

/**
 * Live U.S. State Department advisory for one country. A server component, so
 * the government feed is read on the server and cached. Renders nothing when
 * there is no entry for the country rather than implying "all clear".
 */
export default async function TravelAdvisoryBadge({ country, compact = false }: { country: string; compact?: boolean }) {
  const result = await fetchAdvisories();
  if (!result.available) {
    if (compact) return null;
    return (
      <p className="mt-4 text-xs text-stone-500">
        Live travel advisories are unavailable right now — check the{" "}
        <a href={ADVISORY_SOURCE_URL} target="_blank" rel="noreferrer" className="underline decoration-[var(--gold)] underline-offset-2">
          State Department advisory page
        </a>{" "}
        directly before you travel.
      </p>
    );
  }

  const advisory = advisoryFor(result.advisories, country);
  if (!advisory) return null;

  const tone = advisory.level ? ADVISORY_LEVELS[advisory.level]?.tone ?? "caution" : "caution";
  const updated = advisory.updated ? new Date(advisory.updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : null;

  return (
    <div className={`mt-4 border-l-4 px-4 py-3 ${TONE[tone]}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em]">U.S. State Department · {advisory.country}</p>
      <p className="mt-1 font-semibold">{advisory.levelLabel}</p>
      {!compact && advisory.summary && <p className="mt-1 text-sm leading-6">{advisory.summary.slice(0, 320)}{advisory.summary.length > 320 ? "…" : ""}</p>}
      <p className="mt-2 text-xs">
        {updated ? `Updated ${updated}. ` : ""}
        <a href={advisory.link || ADVISORY_SOURCE_URL} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
          Read the full advisory →
        </a>
      </p>
    </div>
  );
}
