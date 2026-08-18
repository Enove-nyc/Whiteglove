"use client";

import { useActionState, useState } from "react";
import { dismissChangeAction, undoChangeAction, type ActionResult } from "@/app/admin/history/actions";
import {
  CHANGE_WORDS,
  type Change,
  describeChange,
  fieldLabel,
  logSummary,
  changeMatchesQuery,
  shorten,
  whenWords,
} from "@/lib/changes";

/**
 * What changed, side by side with what it said before.
 *
 * The before and after are both shown, because "the overview changed" is not
 * information — the whole question somebody has when they arrive here is
 * whether the old wording was better, and they cannot answer it from a
 * summary. Long text is shortened in place rather than hidden behind a link:
 * a page that makes you click to see what you lost is a page you stop using.
 */

function Row({ change, today }: { change: Change; today: string }) {
  const [undoState, undo, undoing] = useActionState<ActionResult | null, FormData>(undoChangeAction, null);
  const [dismissState, dismiss, dismissing] = useActionState<ActionResult | null, FormData>(dismissChangeAction, null);
  const said = undoState ?? dismissState;

  return (
    <li className="py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="font-semibold text-[var(--navy)]">{change.title}</span>
            <span className="text-xs uppercase tracking-[0.1em] text-stone-400">{CHANGE_WORDS[change.kind]}</span>
          </p>
          <p className="mt-1 text-sm leading-6 text-stone-600">{describeChange(change)}</p>
          <p className="mt-0.5 text-xs text-stone-500">
            {whenWords(change.at, today)} · by {change.who}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <form action={undo}>
            <input type="hidden" name="id" value={change.id} />
            <button
              type="submit"
              disabled={undoing || dismissing}
              className="inline-flex min-h-11 items-center border border-[var(--navy)] bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60"
            >
              {undoing ? "Putting it back…" : "Put it back"}
            </button>
          </form>
          <form action={dismiss}>
            <input type="hidden" name="id" value={change.id} />
            <button
              type="submit"
              disabled={undoing || dismissing}
              className="inline-flex min-h-11 items-center border border-[var(--gold-light)] px-3 text-xs font-bold uppercase tracking-[0.1em] text-stone-500 transition hover:border-[var(--navy)] hover:text-[var(--navy)] disabled:opacity-60"
            >
              That is fine
            </button>
          </form>
        </div>
      </div>

      {said && (
        <p role="status" className={`mt-3 text-sm font-semibold ${said.ok ? "text-emerald-700" : "text-red-700"}`}>
          {said.message}
        </p>
      )}

      <dl className="mt-3 space-y-2 border-l-2 border-[var(--gold-light)] pl-4">
        {change.fields.map((field) => (
          <div key={field.field} className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500">{fieldLabel(field.field)}</dt>
            <dd className="text-sm leading-6">
              <span className="text-stone-500 line-through decoration-stone-300">{shorten(field.before)}</span>
              <span aria-hidden="true" className="mx-2 text-[var(--gold-ink)]">→</span>
              <span className="text-[var(--navy)]">{shorten(field.after)}</span>
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

export default function ChangeLog({
  changes,
  today,
  storageReady,
}: {
  changes: Change[];
  today: string;
  storageReady: boolean;
}) {
  const [query, setQuery] = useState("");
  if (!storageReady) {
    return (
      <p className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        Nothing is being recorded — keeping a history needs the private store connected. Editing still works, but there
        is no record of what anything said before. Ask for <code>UPSTASH_REDIS_REST_URL</code> and <code>_TOKEN</code>{" "}
        to be set.
      </p>
    );
  }

  const shown = changes.filter((change) => changeMatchesQuery(change, query));

  return (
    <div>
      <p className="text-sm leading-6 text-stone-600">{logSummary(changes)}</p>
      {changes.length > 0 && (
        <label className="mt-4 block max-w-xl text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">
          Search the log
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="A listing, a person, a field…"
            className="mt-1 w-full border border-[var(--gold-light)] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[var(--navy)] outline-none focus:border-[var(--gold)]"
          />
        </label>
      )}
      {query.trim() && (
        <p className="mt-3 text-sm text-stone-600">
          {shown.length === 0 ? "Nothing matches." : `${shown.length} of ${changes.length} match.`}
        </p>
      )}
      {shown.length > 0 && (
        <ul className="mt-4 divide-y divide-[var(--gold-light)] border-t border-[var(--gold-light)]">
          {shown.map((change) => (
            <Row key={change.id} change={change} today={today} />
          ))}
        </ul>
      )}
    </div>
  );
}
