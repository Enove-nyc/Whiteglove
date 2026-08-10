import Link from "next/link";
import { startingPointsExcept } from "@/lib/starting-points";

/**
 * "Which of these four is the one I want?"
 *
 * Four front doors — get recommendations, build it yourself, search partners,
 * have us plan it — shown side by side with what each one actually does, so
 * the choice is made once rather than by trial and error through the
 * navigation. The wording is not written here: it comes from
 * lib/starting-points.ts, which is the single place any of the four is named.
 *
 * `omit` drops the door you are standing in. The front page also omits
 * /services deliberately and not for that reason — a front page that offers to
 * arrange the trip for you is a page about an agency, and every free tool below
 * it then reads as a funnel into a phone call. Personal assistance is offered
 * inside Contact and on its own page. See AGENTS.md and tests/homepage-order.
 */
export default function StartingPoints({
  omit = [],
  heading = "Four ways to start",
  intro = "Most people end up using two of them. This is what each one is for.",
}: {
  omit?: string[];
  heading?: string;
  intro?: string;
}) {
  const points = startingPointsExcept(...omit);
  if (points.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6 sm:p-9">
      <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
        {heading}
      </h2>
      <p className="mt-3 max-w-2xl leading-7 text-stone-600">{intro}</p>

      <ul className={`mt-8 grid gap-4 sm:grid-cols-2 ${points.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {points.map((point) => (
          <li key={point.href}>
            <Link
              href={point.href}
              className="wg-card group flex h-full flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">
                {point.cost === "Paid" ? "Paid service" : "Free to use"}
              </span>
              <span className="mt-2 block font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                {point.label}
              </span>
              <span className="mt-3 flex-1 text-sm leading-6 text-stone-600">{point.body}</span>
              <span className="mt-5 text-sm font-semibold text-[var(--navy)] transition group-hover:text-[var(--gold-ink)]">
                {point.cta} →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
