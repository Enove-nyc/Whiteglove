"use client";

import { useState } from "react";
import AssistantAnswer from "@/components/AssistantAnswer";

/**
 * The questions offered before anybody types.
 *
 * These are not decoration: an empty box with a cursor in it gets typed into
 * by almost nobody, and whatever the examples say is what people believe the
 * assistant is for. All three used to be about kevarim, which taught every
 * visitor that this was a kevarim tool. Vacation planning comes first now, and
 * the heritage question is still there because it is still one of the things
 * this site is best at.
 */
const EXAMPLES = [
  "Find a kosher summer vacation for a family.",
  "Plan four days in Rome for a couple.",
  "Compare Alpine destinations for kosher travelers.",
  "Help me plan Shabbos in Paris.",
  "Plan a three-day heritage journey in Poland.",
];

export default function TravelAssistantBox() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function ask(q: string) {
    const value = q.trim();
    if (!value) return;
    setBusy(true);
    setAnswer(null);
    setNote(null);
    setExpanded(false);
    try {
      const res = await fetch("/api/itinerary/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value }),
      });
      const data = await res.json().catch(() => ({ available: false, reason: "Something went wrong." }));
      if (data.available) setAnswer(data.text || "");
      else setNote(data.reason || "The assistant is unavailable right now.");
    } catch {
      setNote("Could not reach the assistant. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Ask the White Glove assistant</p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-[1.75rem] leading-tight text-[var(--navy)] sm:text-3xl">Kosher travel, answered</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">Where to go, how long to give it, kosher food, Shabbos, or a kever. Travel only.</p>

      {/* WHAT IT IS, BEFORE THE BOX RATHER THAN UNDER THE ANSWER.
          There was one line of small print and it only appeared once an answer
          had already been given — by which point somebody has read the answer
          and formed a view of where it came from. The three things they are
          entitled to know before they type are: this is a language model and
          not a search of our own pages, so it can be wrong about a specific
          place; kashrus and anything time-sensitive still has to be confirmed;
          and what happens to what they type. The last one is a fact about this
          code, not a policy: the question goes to the model provider to be
          answered and this site keeps no copy and no history — reload the page
          and it is gone. */}
      <details className="mt-3 rounded-md border border-[var(--gold-light)] bg-white/70 px-4 py-2 sm:py-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)]">
          What this assistant can and cannot do
        </summary>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-stone-600">
          <li>
            It is an AI model answering in its own words, not a search of the destination, hotel and kosher pages on
            this site. Those pages name a source for each detail; the assistant does not, and it can be wrong or out of
            date about a particular place.
          </li>
          <li>
            Treat anything it says about a hechsher, a minyan, opening hours, prices or border and travel conditions as
            a starting point to confirm — with the place itself, with the local kehilla, or with us.
          </li>
          <li>
            It answers kosher-travel questions only, and it declines the rest.
          </li>
          <li>
            Your question is sent to the AI provider to be answered. We keep no copy of it and no conversation history:
            leaving this page ends it.
          </li>
        </ul>
      </details>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(question); }}
        className="mt-5 flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          aria-label="Ask the travel assistant a question"
          placeholder="e.g. A week in July with the children"
          className="w-full rounded-md border border-[var(--gold-light)] bg-white px-4 py-3 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]"
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 shrink-0 border border-[var(--navy)] bg-[var(--navy)] px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-60"
        >
          {busy ? "Thinking…" : "Ask"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => { setQuestion(ex); ask(ex); }} className="min-h-11 border border-[var(--gold-light)] px-3 py-1.5 text-[11px] text-stone-600 transition hover:bg-[var(--cream-deep)]">
            {ex}
          </button>
        ))}
      </div>

      {answer && (
        <div className="mt-5 border-l-4 border-[var(--gold)] bg-white">
          {/* Long answers scroll inside the box instead of being cut off. */}
          <div className={`overflow-y-auto overscroll-contain p-4 text-sm leading-6 text-stone-700 ${expanded ? "" : "max-h-80"}`}>
            {/* Set in the site's own type — headings, lists and emphasis
                as themselves, rather than the asterisks and hyphens a model
                writes them with. */}
            <AssistantAnswer answer={answer} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--gold-light)] px-4 py-2">
            <p className="text-[11px] text-stone-400">AI-generated — please confirm details (hours, access, kashrus) before you rely on them.</p>
            <button type="button" onClick={() => setExpanded((v) => !v)} className="shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
              {expanded ? "Collapse" : "Expand full answer"}
            </button>
          </div>
        </div>
      )}
      {note && <p className="mt-5 text-sm font-semibold text-stone-500">{note}</p>}
    </div>
  );
}
