import Link from "next/link";
import { startingPointsExcept } from "@/lib/starting-points";

/**
 * "Which of these is the one I want?"
 *
 * The free ways in — get recommendations, build it yourself, search booking
 * partners — shown side by side with what each one actually does, so the
 * choice is made once rather than by trial and error through the navigation.
 * The wording is not written here: it comes from lib/starting-points.ts, which
 * is the single place any of the doors is named.
 *
 * PERSONAL PLANNING IS NOT ONE OF THEM, AND THAT IS ENFORCED HERE RATHER THAN
 * REMEMBERED AT EACH CALL SITE. It was an argument the front page made for
 * itself and every other page then got wrong: /book, /plan and /about all
 * offered it, because each passed `omit` for the door it was standing in and
 * nothing else.
 *
 * AGENTS.md, "Two things this site is not": planning is something the owner
 * does when somebody asks him. It gets one small link in the footer and its
 * place inside Contact, and it is not one of the site's ways to start. On a
 * tool page it turns something usable into a funnel into a phone call, which
 * is the whole reason it is kept where it is.
 *
 * So it is dropped by default, and the one page that genuinely lists it — the
 * services page, naming the free alternatives — opts in. A page added later
 * cannot promote it by forgetting to.
 */
export default function StartingPoints({
  omit = [],
  includePlanning = false,
  heading = "Ways to start",
  intro = "What each one is for.",
}: {
  omit?: string[];
  /** Only the services page, which is listing what you could do instead. */
  includePlanning?: boolean;
  heading?: string;
  intro?: string;
}) {
  const points = startingPointsExcept(...omit, ...(includePlanning ? [] : ["/services"]));
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
