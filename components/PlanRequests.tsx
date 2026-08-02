"use client";

import { useActionState } from "react";
import { type PlanRequest, PLAN_LABELS, waitingFor } from "@/lib/account-plans";
import { type ActionResult, declineRequestAction, grantRequestAction } from "@/app/admin/accounts/actions";

/**
 * Who has asked for a different kind of account.
 *
 * Granting one really does put the account on the plan — this is the only
 * place that happens from a request, so a person who has asked has not been
 * given anything until the owner presses it.
 *
 * `now` is passed in from the server rather than read here, so the "3 days
 * ago" is worked out once and no component reaches for a clock while it
 * renders.
 */

function Answer({ request, now }: { request: PlanRequest; now: string }) {
  const [granted, grant, granting] = useActionState(grantRequestAction, null);
  const [declined, decline, declining] = useActionState(declineRequestAction, null);
  const said: ActionResult | null = granted ?? declined;

  return (
    <div className="border border-[var(--gold-light)] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
            {request.businessName || request.account}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {request.businessName ? `${request.account} · ` : ""}
            asked {waitingFor(request, now)}
          </p>
        </div>
        <span className="shrink-0 border border-[var(--gold)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--gold)]">
          {PLAN_LABELS[request.wanted]}
        </span>
      </div>

      {request.note && <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-600">{request.note}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form action={grant}>
          <input type="hidden" name="account" value={request.account} />
          <button
            type="submit"
            disabled={granting || declining}
            className="min-h-11 rounded-md bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] disabled:opacity-50"
          >
            {granting ? "Setting…" : `Give them ${PLAN_LABELS[request.wanted]}`}
          </button>
        </form>
        <form action={decline}>
          <input type="hidden" name="account" value={request.account} />
          <button
            type="submit"
            disabled={granting || declining}
            className="min-h-11 rounded-md border border-[var(--gold-light)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-stone-500 transition hover:border-[var(--gold)] disabled:opacity-50"
          >
            {declining ? "Saving…" : "Not now"}
          </button>
        </form>
        {said && (
          <span className={`text-sm font-semibold ${said.ok ? "text-emerald-700" : "text-red-700"}`}>{said.message}</span>
        )}
      </div>
    </div>
  );
}

export default function PlanRequests({ requests, now }: { requests: PlanRequest[]; now: string }) {
  const open = requests.filter((r) => r.state === "asked");
  const answered = requests.filter((r) => r.state !== "asked").slice(0, 12);

  return (
    <section className="mt-10">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Pro and Business</p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Who has asked</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
        Nothing is behind Pro or Business yet, and nobody has been charged anything — this is a list of people who
        said they would like one. Giving somebody a plan changes their account and nothing else.
      </p>

      {open.length === 0 ? (
        <div className="mt-6 border border-dashed border-[var(--gold-light)] p-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Nobody is waiting.</p>
          <p className="mt-2 text-sm text-stone-600">Requests from the account page appear here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {open.map((request) => (
            <Answer key={`${request.account}:${request.askedAt}`} request={request} now={now} />
          ))}
        </div>
      )}

      {answered.length > 0 && (
        <div className="mt-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Already answered</p>
          <ul className="mt-3 space-y-1.5 text-sm leading-6 text-stone-500">
            {answered.map((request) => (
              <li key={`${request.account}:${request.askedAt}`}>
                {request.account} — {PLAN_LABELS[request.wanted]}{" "}
                {request.state === "granted" ? "given" : "not taken up"}
                {request.answeredBy ? ` by ${request.answeredBy}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
