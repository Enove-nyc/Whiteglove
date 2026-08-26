import { UPDATE_KIND_LABEL, type CurrentUpdate } from "@/data/current-updates";

/**
 * What changed here recently, said in as few lines as it takes.
 *
 * RENDERS NOTHING WHEN THERE IS NOTHING. A heading over an empty box is the
 * site telling a reader it has current information and then not having any,
 * which is worse than the heading never appearing — see AGENTS.md on hiding
 * unfinished sections.
 *
 * NO SOURCE LINE, and that is deliberate rather than an omission. The owner
 * records where he knows each of these from, and it stays in the admin: a
 * source shown beside a claim reads as an endorsement of whatever it points
 * at, which is the same rule the listings follow.
 *
 * NO DATES ON SCREEN EITHER. The window decides whether a notice is here at
 * all, so printing "valid until 30 September" beside it would be saying twice
 * what its presence already says — and would invite a reader to work out
 * whether it had lapsed, which is the site's job and not theirs.
 */
export default function CurrentUpdatesNotice({ updates }: { updates: CurrentUpdate[] }) {
  if (updates.length === 0) return null;

  return (
    <section aria-labelledby="current-updates-heading" className="wg-page-section py-8">
      <h2
        id="current-updates-heading"
        className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)] sm:text-3xl"
      >
        Right now
      </h2>
      <ul className="mt-4 space-y-3">
        {updates.map((update) => (
          <li
            key={update.id}
            className="rounded-lg border-l-4 border-[var(--gold)] bg-[#fcfaf6] px-4 py-3"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">
              {UPDATE_KIND_LABEL[update.kind]}
            </p>
            <p className="mt-1 font-semibold leading-6 text-[var(--navy)]">{update.title}</p>
            <p className="mt-0.5 text-sm leading-6 text-stone-600">{update.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
