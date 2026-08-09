"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type AccountPlan,
  MAX_NOTE,
  type PlanRequest,
  PLAN_BLURB,
  PLAN_LABELS,
  plansToAskAbout,
  whatYouGet,
} from "@/lib/account-plans";

/**
 * What kind of account this is, and how to ask for a different one.
 *
 * TWO THINGS THIS PANEL MUST NEVER DO. It must not take money — there is no
 * payment anywhere on this site, and a panel that looks like a checkout and is
 * not one is worse than no panel. And it must not list what Pro includes,
 * because it does not include anything yet; the honest version says that in a
 * sentence, which is what the empty list from whatYouGet() stands for.
 *
 * So: it says what you are on, it lets you say what you would rather have, and
 * it tells you a person will answer. Nothing more, because nothing more is true.
 */

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] transition focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

export default function AccountPlanPanel({
  plan,
  limitsLine,
  usageLine,
  openRequest,
}: {
  plan: AccountPlan;
  /**
   * What this plan limits, worked out on the server. A sentence rather than
   * numbers, because it has to read the clock to say when the next printable
   * copy is due and a component may not do that while it renders.
   */
  limitsLine: string;
  /** Where they stand against those limits right now. */
  usageLine: string;
  openRequest: PlanRequest | null;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState<AccountPlan | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const choices = plansToAskAbout(plan);
  const included = whatYouGet(plan);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!asking) return;
    setSending(true);
    setMessage(null);
    const response = await fetch("/api/account/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wanted: asking, businessName, note }),
    });
    const data = await response.json().catch(() => null);
    setSending(false);
    if (!response.ok) {
      setMessage({ ok: false, text: data?.error || "That could not be sent." });
      return;
    }
    setAsking(null);
    setBusinessName("");
    setNote("");
    setMessage({ ok: true, text: "Noted — we have it, and we will be in touch. Nothing has been charged." });
    router.refresh();
  }

  return (
    <section className="mt-10 border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Your account</p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
        {PLAN_LABELS[plan]}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">{PLAN_BLURB[plan]}</p>

      {/* An empty list under a heading reads as something that failed to load,
          so the sentence is written out instead. */}
      {included.length === 0 ? (
        /* This used to end "nothing is behind them yet", which stopped being
           true the day the trip and print limits arrived. Somebody should meet
           a limit here, in a sentence, rather than at the moment it stops
           them. */
        <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-500">
          Every account has the whole site — the planner, your saved places, your trips and their documents. {limitsLine}
        </p>
      ) : (
        <ul className="mt-4 space-y-1.5 text-sm leading-7 text-stone-600">
          {included.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--navy)]">{usageLine}</p>

      {openRequest ? (
        <div className="mt-6 border-l-4 border-[var(--gold)] bg-white px-4 py-3">
          <p className="text-sm leading-7 text-stone-700">
            You asked about <strong>{PLAN_LABELS[openRequest.wanted]}</strong>
            {openRequest.businessName ? ` for ${openRequest.businessName}` : ""}. We have it, and we will be in touch.
            Nothing has been charged.
          </p>
        </div>
      ) : choices.length > 0 ? (
        <div className="mt-6">
          <p className="text-sm leading-7 text-stone-600">
            If you would like a different kind of account, say so and the owner will get in touch.
            {" "}
            <strong className="text-[var(--navy)]">There is nothing to pay</strong> — no card is taken and no
            subscription starts.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {choices.map((choice) => (
              <div key={choice} className="border border-[var(--gold-light)] bg-white p-5">
                <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{PLAN_LABELS[choice]}</h3>
                <p className="mt-2 text-sm leading-7 text-stone-600">{PLAN_BLURB[choice]}</p>
                <button
                  type="button"
                  onClick={() => {
                    setAsking(asking === choice ? null : choice);
                    setMessage(null);
                  }}
                  aria-expanded={asking === choice}
                  className="mt-4 min-h-11 rounded-md border border-[var(--navy)] bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:text-[var(--navy)]"
                >
                  {asking === choice ? "Never mind" : `Ask about ${PLAN_LABELS[choice]}`}
                </button>
              </div>
            ))}
          </div>

          {asking && (
            <form onSubmit={send} className="mt-5 border border-[var(--gold)] bg-white p-5">
              <p className="text-sm leading-7 text-stone-600">
                Asking about <strong className="text-[var(--navy)]">{PLAN_LABELS[asking]}</strong>.
              </p>
              {asking === "business" && (
                <label className="mt-4 block">
                  <span className={captionClass}>Name of the business</span>
                  <input
                    className={inputClass}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Hotel Sanz"
                    maxLength={120}
                    required
                  />
                </label>
              )}
              <label className="mt-4 block">
                <span className={captionClass}>Anything you want to say (optional)</span>
                <textarea
                  className={`${inputClass} min-h-24`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={MAX_NOTE}
                  placeholder="What you are hoping for"
                />
              </label>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={sending}
                  className="min-h-11 rounded-md bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send it"}
                </button>
                <span className="text-xs text-stone-400">Nothing is charged.</span>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {message && (
        <p className={`mt-4 text-sm font-semibold ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>
      )}
    </section>
  );
}
