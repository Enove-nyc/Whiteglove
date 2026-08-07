"use client";

import { useActionState, useState } from "react";
import { saveLinksAction } from "@/app/admin/settings/earnings/actions";
import { describeSlot, linkProblem, markerIn, SLOTS, type TravelpayoutsLinks } from "@/lib/travelpayouts";

/**
 * Where each of the three searches goes, and whether it earns.
 *
 * EVERY ROW SAYS WHAT IS HAPPENING NOW, in a sentence, before anything is
 * typed. The failure this screen exists to prevent has no symptom: a search
 * that is not routed still opens, still works, still looks right, and simply
 * never pays. So the screen states the thing that cannot otherwise be seen —
 * "opens www.kayak.com directly, and earns nothing" — rather than showing an
 * empty box and leaving it to be inferred.
 *
 * AND IT CHECKS AS YOU TYPE, against the partner that search really opens. A
 * Booking.com link pasted into the flights row is the one mistake somebody
 * would make and never catch.
 */

const input =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 font-mono text-xs text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";

export default function EarningsForm({
  current,
  storeReady,
  hotelsElsewhere,
}: {
  current: TravelpayoutsLinks;
  storeReady: boolean;
  /**
   * Set when Stay22 has taken the hotel search over. Without it this screen
   * would go on saying hotels open Booking.com and earn nothing, which stopped
   * being true the moment the ID above was saved — and a settings screen that
   * contradicts the site is worse than one that says less.
   */
  hotelsElsewhere?: string;
}) {
  const [links, setLinks] = useState<TravelpayoutsLinks>(current);
  const [state, act, busy] = useActionState(saveLinksAction, null);

  // The same check the save does, run as they type, so a wrong link is caught
  // beside the box it was pasted into rather than in one message at the top.
  const problems = SLOTS.map((s) => ({ slot: s.slot, problem: linkProblem(links[s.slot] ?? "", s.slot) }));
  const firstProblem = problems.find((p) => p.problem)?.problem ?? null;

  return (
    <form action={act} className="mt-10 space-y-8">
      {!storeReady && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          The private store is not connected, so nothing here can be saved yet. Ask for UPSTASH_REDIS_REST_URL and
          UPSTASH_REDIS_REST_TOKEN to be set.
        </p>
      )}

      <div className="space-y-6">
        {SLOTS.map((s) => {
          const value = links[s.slot] ?? "";
          const problem = linkProblem(value, s.slot);
          const marker = markerIn(value);
          return (
            <label key={s.slot} className="block rounded-lg border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">{s.label}</span>
              <span className="mt-1 block text-sm leading-6 text-stone-600">
                {s.slot === "hotels" && hotelsElsewhere ? hotelsElsewhere : describeSlot(s.slot, value)}
              </span>
              <input
                name={s.slot}
                type="text"
                value={value}
                onChange={(e) => setLinks({ ...links, [s.slot]: e.target.value })}
                placeholder={`Paste the Travelpayouts link for ${s.host}`}
                className={input}
              />
              {problem ? (
                <span className="mt-1.5 block text-xs leading-5 text-red-700">{problem}</span>
              ) : (
                <span className="mt-1.5 block text-xs leading-5 text-stone-500">
                  Must be a link that forwards to <span className="text-[var(--navy)]">{s.host}</span> — that is where
                  this search opens.
                  {marker && <> Marker on this link: <span className="text-[var(--navy)]">{marker}</span>.</>}
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || !storeReady || Boolean(firstProblem)}
          className="bg-[var(--navy)] px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {firstProblem && <span className="text-sm font-semibold text-red-700">Fix the link above first.</span>}
        {state && !firstProblem && (
          <span className={`text-sm font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}
