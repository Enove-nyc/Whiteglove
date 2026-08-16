"use client";

import { useState } from "react";
import Link from "next/link";
import AssistantAnswer from "@/components/AssistantAnswer";
import { Icon } from "@/components/icons/Icon";

/**
 * The AI assistant, folded behind one compact control.
 *
 * It used to open the /itinerary page as a large explained section above the
 * planner, which put a page of assistant copy in front of the tool the page is
 * named for. Now it is a single button — "Assistant" — and everything it has
 * to say about itself (what it can do, that it is AI, where the question goes)
 * lives INSIDE the opened panel, read by the people who open it.
 */

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
  "Where is kosher food in Paris?",
  "Compare Alpine destinations for kosher travelers.",
  "Help me plan Shabbos in Paris.",
  "Plan a three-day heritage journey in Poland.",
];

const VISIBLE_EXAMPLES = 3;

export default function TravelAssistantBox({ embedded = false }: { embedded?: boolean }) {
  const [open, setOpen] = useState(embedded);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showMoreExamples, setShowMoreExamples] = useState(false);

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

  const visible = showMoreExamples ? EXAMPLES : EXAMPLES.slice(0, VISIBLE_EXAMPLES);

  return (
    <div data-ai-assistant="">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="travel-assistant-panel"
        aria-label="Assistant — ask an AI kosher-travel question"
        title="Ask the AI assistant"
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--gold-light)] bg-[#fcfaf6] px-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)]"
      >
        <Icon name="sparkle" className="h-4 w-4" />
        Assistant
      </button>

      {open && (
        <div
          id="travel-assistant-panel"
          className="mt-3 rounded-xl border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-6"
        >
          <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">Assistant</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            AI-generated answers about destinations, kosher food, Shabbos and itineraries — not a search of White
            Glove&apos;s curated listings. For those, use the{" "}
            <Link href="/kosher" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
              kosher food finder
            </Link>
            .
          </p>

          <details className="mt-3 rounded-md border border-[var(--gold-light)] bg-white/70 px-4 py-2 sm:py-3">
            <summary className="flex min-h-11 cursor-pointer items-center text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)]">
              What this assistant can and cannot do
            </summary>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-stone-600">
              <li>
                It is an AI model answering in its own words, not a search of the destination, hotel and kosher pages on
                this site. Those pages name a source for each detail; the assistant does not, and it can be wrong or out
                of date about a particular place.
              </li>
              <li>
                Treat anything it says about a hechsher, a minyan, opening hours, prices or border and travel conditions
                as a starting point to confirm — with the place itself, with the local kehilla, or with us.
              </li>
              <li>
                It answers kosher-travel questions only, and it declines the rest. Kosher food means actually kosher —
                not kosher-style, and not Israeli-style as a stand-in.
              </li>
              <li>
                Your question is sent to the AI provider to be answered. We keep no copy of it and no conversation
                history: leaving this page ends it.
              </li>
            </ul>
          </details>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
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
            {visible.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setQuestion(ex);
                  ask(ex);
                }}
                className="min-h-11 border border-[var(--gold-light)] px-3 py-1.5 text-[11px] text-stone-600 transition hover:bg-[var(--cream-deep)]"
              >
                {ex}
              </button>
            ))}
            {EXAMPLES.length > VISIBLE_EXAMPLES ? (
              <button
                type="button"
                onClick={() => setShowMoreExamples((v) => !v)}
                className="min-h-11 border border-dashed border-[var(--gold)] px-3 py-1.5 text-[11px] font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
              >
                {showMoreExamples ? "Fewer examples" : "More examples"}
              </button>
            ) : null}
          </div>

          {answer && (
            <div className="mt-5 border-l-4 border-[var(--gold)] bg-white">
              <div className={`overflow-y-auto overscroll-contain p-4 text-sm leading-6 text-stone-700 ${expanded ? "" : "max-h-80"}`}>
                <AssistantAnswer answer={answer} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--gold-light)] px-4 py-2">
                <p className="text-[11px] text-stone-400">AI-generated — please confirm details (hours, access, kashrus) before you rely on them.</p>
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2"
                >
                  {expanded ? "Collapse" : "Expand full answer"}
                </button>
              </div>
            </div>
          )}
          {note && <p className="mt-5 text-sm font-semibold text-stone-500">{note}</p>}
        </div>
      )}
    </div>
  );
}
