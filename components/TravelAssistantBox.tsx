"use client";

import { useState } from "react";

const EXAMPLES = [
  "What's near the Baal Shem Tov's kever?",
  "Where can I get kosher food in Kraków?",
  "Plan 3 days of kevarim in Poland",
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
    <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Ask the White Glove assistant</p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Kosher travel questions, answered.</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">Ask about a destination, a kever, kosher food, or what to do somewhere. (Travel questions only.)</p>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(question); }}
        className="mt-5 flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          aria-label="Ask the travel assistant a question"
          placeholder="e.g. What should I do near Uman with a free afternoon?"
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
            <p className="whitespace-pre-line">{answer}</p>
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
