"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  emptyAnswers,
  INTERESTS,
  KOSHER_REQUIREMENTS,
  PACES,
  progressOf,
  SHABBOS_REQUIREMENTS,
  STEPS,
  summarize,
  TRIP_KINDS,
  TRIP_PLAN_KEY,
  type PlanningMethod,
  type TripKind,
  type TripPlanAnswers,
} from "@/lib/trip-plan";

/**
 * The three questions before the planner.
 *
 * WHAT MAKES THIS DIFFERENT FROM A LEAD-CAPTURE WIZARD, which is what most
 * "plan your trip" flows are:
 *
 *   • NOTHING IS REQUIRED. There is no field that blocks the next step, no
 *     asterisk, and no email box in front of the answers. The visitor this
 *     exists for is the one who does not know where they are going; a form
 *     that demands a destination turns them away, and they were the customer.
 *
 *   • Every question offers "I don't know yet" as a real answer rather than
 *     leaving it blank, because the two are different: one is a decision to
 *     tell us, the other is a question they did not see.
 *
 *   • The answers are theirs. They are kept in this browser as they are typed,
 *     and they are used at the end to fill in whichever of the two paths gets
 *     chosen — the planner, or the request form. Nobody types their dates
 *     twice.
 *
 * WRITTEN FROM THE EVENT, NOT FROM AN EFFECT. Typing is what makes an answer
 * worth keeping, so the handler that hears the typing is what stores it. Same
 * rule, and the same reason, as components/useFormDraft.ts.
 *
 * FOCUS MOVES WITH THE STEP. Pressing "Next" and leaving the focus on a button
 * that no longer exists strands a keyboard user at the top of the document. The
 * new step's heading is focused instead, which also makes a screen reader
 * announce what step it is.
 */

const field =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const label = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-600";
const chip = "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition";
const chipOff = `${chip} border-[var(--gold-light)] bg-white text-stone-700 hover:border-[var(--gold)] hover:text-[var(--navy)]`;
const chipOn = `${chip} border-[var(--navy)] bg-[var(--navy)] text-white`;

function Toggles({
  legend,
  hint,
  options,
  chosen,
  onToggle,
}: {
  legend: string;
  hint?: string;
  options: readonly string[];
  chosen: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className={label}>{legend}</legend>
      {hint && <p className="mt-1 text-xs leading-5 text-stone-500">{hint}</p>}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((option) => {
          const on = chosen.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(option)}
              className={on ? chipOn : chipOff}
            >
              {/* A tick as well as the fill, so "chosen" is not carried by
                  colour alone. */}
              <span aria-hidden="true" className="mr-2 text-xs">
                {on ? "✓" : "+"}
              </span>
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function TripStartFlow({
  initialDestination = "",
  initialKind = "",
}: {
  /** Arrived from a destination card: "Add Rome to a trip". */
  initialDestination?: string;
  initialKind?: TripKind | "";
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<TripPlanAnswers>(() => ({
    ...emptyAnswers(),
    destination: initialDestination,
    kind: initialKind,
  }));
  const headingRef = useRef<HTMLHeadingElement>(null);

  function update(patch: Partial<TripPlanAnswers>) {
    const next = { ...answers, ...patch };
    setAnswers(next);
    try {
      localStorage.setItem(TRIP_PLAN_KEY, JSON.stringify(next));
    } catch {
      // A full or blocked storage is not worth breaking the flow over. The
      // answers still work for this visit; only carrying them to the next page
      // is lost, and the pages that read them treat absence as normal.
    }
  }

  function goToStep(next: number) {
    setStep(next);
    // After the render that swaps the step in. Without this the focus is left
    // on a button that has just been removed from the document.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function toggle(key: "interests" | "kosher" | "shabbos", value: string) {
    const current = answers[key];
    update({ [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] });
  }

  function choose(method: PlanningMethod) {
    update({ method });
    if (method === "myself") router.push("/itinerary?from=plan");
    else if (method === "white-glove") router.push("/contact?from=plan");
    else router.push("/vacation-ideas");
  }

  const progress = progressOf(answers);
  const current = STEPS[step - 1];
  const isHeritage = answers.kind === "heritage";

  return (
    <div>
      {/* ---- where you are ------------------------------------------------ */}
      <nav aria-label="Progress through planning" className="rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
        <ol className="flex flex-wrap gap-x-6 gap-y-2">
          {STEPS.map((entry) => {
            const state = entry.number === step ? "current" : entry.number < step ? "done" : "todo";
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => goToStep(entry.number)}
                  aria-current={state === "current" ? "step" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 text-sm font-semibold transition ${
                    state === "current"
                      ? "text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-8"
                      : "text-stone-600 hover:text-[var(--navy)]"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
                      state === "done"
                        ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                        : state === "current"
                          ? "border-[var(--navy)] text-[var(--navy)]"
                          : "border-[var(--gold-light)] text-stone-500"
                    }`}
                  >
                    {state === "done" ? "✓" : entry.number}
                  </span>
                  <span>
                    <span className="sr-only">Step {entry.number}: </span>
                    {entry.title}
                    {state === "done" && <span className="sr-only"> — answered</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-3 border-t border-[var(--gold-light)] pt-3">
          {/* The bar is decoration; the sentence is the information. A
              progress bar with no words beside it tells a screen reader
              nothing useful, and tells a sighted person only roughly. */}
          <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--cream-deep)]">
            <div className="h-full rounded-full bg-[var(--gold)] transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <p aria-live="polite" className="mt-2 text-xs text-stone-600">
            {progress.answered} of {progress.total} questions answered.{" "}
            <span className="font-semibold text-[var(--navy)]">Every one of them is optional</span> — skip anything you
            have not decided.
          </p>
        </div>
      </nav>

      {/* ---- the step ------------------------------------------------------ */}
      <section className="mt-8">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] outline-none sm:text-4xl"
        >
          {current.title}
        </h2>
        <p className="mt-2 text-lg leading-8 text-stone-600">{current.blurb}</p>

        {step === 1 && (
          <fieldset className="mt-8">
            <legend className="sr-only">What kind of trip are you planning?</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TRIP_KINDS.map((kind) => {
                const on = answers.kind === kind.value;
                return (
                  <button
                    key={kind.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      update({ kind: kind.value });
                      goToStep(2);
                    }}
                    className={`wg-card flex h-full flex-col items-start border p-5 text-left transition ${
                      on
                        ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                        : "border-[var(--gold-light)] bg-[var(--surface)] hover:border-[var(--gold)]"
                    }`}
                  >
                    <span className={`font-[family-name:var(--font-display)] text-2xl leading-tight ${on ? "text-white" : "text-[var(--navy)]"}`}>
                      {kind.label}
                    </span>
                    <span className={`mt-2 text-sm leading-6 ${on ? "text-slate-200" : "text-stone-600"}`}>{kind.blurb}</span>
                    {on && <span className="sr-only">Selected</span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
              >
                Skip this and carry on
              </button>
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <div className="mt-8 space-y-8">
            <div className="grid gap-5 rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-5 sm:p-6 lg:grid-cols-2">
              <div>
                <label className="block" htmlFor="plan-destination">
                  <span className={label}>Where to</span>
                </label>
                <input
                  id="plan-destination"
                  className={field}
                  value={answers.destination}
                  disabled={answers.helpMeChoose}
                  placeholder="A city, a country, or “somewhere warm”"
                  onChange={(event) => update({ destination: event.target.value })}
                />
                <label className="mt-3 flex min-h-11 items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={answers.helpMeChoose}
                    onChange={(event) => update({ helpMeChoose: event.target.checked })}
                    className="h-4 w-4"
                  />
                  Help me choose — I don’t know yet
                </label>
              </div>

              <div>
                <label className="block" htmlFor="plan-from">
                  <span className={label}>Flying from</span>
                </label>
                <input
                  id="plan-from"
                  className={field}
                  value={answers.from}
                  placeholder="e.g. New York, London, Tel Aviv"
                  onChange={(event) => update({ from: event.target.value })}
                />
              </div>

              <fieldset className="lg:col-span-2">
                <legend className={label}>When</legend>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {(
                    [
                      ["exact", "I know the dates"],
                      ["approximate", "Roughly"],
                      ["unknown", "I don’t know yet"],
                    ] as const
                  ).map(([value, text]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={answers.dateMode === value}
                      onClick={() => update({ dateMode: value })}
                      className={answers.dateMode === value ? chipOn : chipOff}
                    >
                      {text}
                    </button>
                  ))}
                </div>

                {answers.dateMode === "exact" && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={label}>Leaving</span>
                      <input
                        type="date"
                        className={field}
                        value={answers.startDate}
                        onChange={(event) => update({ startDate: event.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className={label}>Coming back</span>
                      <input
                        type="date"
                        className={field}
                        min={answers.startDate || undefined}
                        value={answers.endDate}
                        onChange={(event) => update({ endDate: event.target.value })}
                      />
                    </label>
                  </div>
                )}

                {answers.dateMode === "approximate" && (
                  <label className="mt-4 block">
                    <span className={label}>Roughly when</span>
                    <input
                      className={field}
                      value={answers.approximateWhen}
                      placeholder="e.g. July, after Pesach, the winter — a week or so"
                      onChange={(event) => update({ approximateWhen: event.target.value })}
                    />
                  </label>
                )}
              </fieldset>

              <fieldset className="lg:col-span-2">
                <legend className={label}>Who is coming</legend>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  Ages matter more than the number — what suits a four-year-old is not what suits a fourteen-year-old.
                </p>
                <div className="mt-2.5 grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className={label}>Adults</span>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      inputMode="numeric"
                      className={field}
                      value={answers.adults}
                      onChange={(event) => update({ adults: event.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className={label}>Children</span>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      inputMode="numeric"
                      className={field}
                      value={answers.children}
                      onChange={(event) => update({ children: event.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className={label}>Their ages</span>
                    <input
                      className={field}
                      value={answers.childAges}
                      placeholder="e.g. 4, 7 and 11"
                      onChange={(event) => update({ childAges: event.target.value })}
                    />
                  </label>
                </div>
              </fieldset>
            </div>

            <div className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-5 sm:p-6">
              <fieldset>
                <legend className={label}>Pace</legend>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {PACES.map((pace) => (
                    <button
                      key={pace.value}
                      type="button"
                      aria-pressed={answers.pace === pace.value}
                      onClick={() => update({ pace: pace.value })}
                      className={answers.pace === pace.value ? chipOn : chipOff}
                      title={pace.blurb}
                    >
                      {pace.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="mt-6">
                <Toggles legend="Interests" options={INTERESTS} chosen={answers.interests} onToggle={(v) => toggle("interests", v)} />
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-5 sm:p-6">
              <Toggles
                legend="Kosher requirements"
                hint="So we know which shops and which arrangements actually help. Choose as many as apply."
                options={KOSHER_REQUIREMENTS}
                chosen={answers.kosher}
                onToggle={(v) => toggle("kosher", v)}
              />
              <label className="mt-5 block">
                <span className={label}>Anything else about food</span>
                <input
                  className={field}
                  value={answers.kosherNotes}
                  placeholder="Allergies, a hechsher you rely on, a child who eats nothing but pasta…"
                  onChange={(event) => update({ kosherNotes: event.target.value })}
                />
              </label>

              <div className="mt-6">
                <Toggles
                  legend="Shabbos"
                  hint="Shabbos is the part of a trip that is hardest to fix once you have booked. Worth answering even roughly."
                  options={SHABBOS_REQUIREMENTS}
                  chosen={answers.shabbos}
                  onToggle={(v) => toggle("shabbos", v)}
                />
              </div>
            </div>

            {/* Asked ONLY for a heritage journey. Somebody planning a week on a
                beach should never be asked which kevarim they want to visit —
                that question was on the front of the old contact form for
                everybody, and it told a vacation customer this site was not
                for them. */}
            {isHeritage && (
              <div className="rounded-2xl border border-[var(--gold)] bg-[#fcfaf6] p-5 sm:p-6">
                <label className="block">
                  <span className={label}>Kevarim, towns or tzaddikim you want to reach</span>
                  <textarea
                    rows={3}
                    className={`${field} min-h-24`}
                    value={answers.kevarim}
                    placeholder="e.g. Lizhensk, Sanz, and whatever else is on the way"
                    onChange={(event) => update({ kevarim: event.target.value })}
                  />
                  <span className="mt-1.5 block text-xs leading-5 text-stone-500">
                    You are seeing this because you chose a heritage journey.{" "}
                    <Link href="/heritage" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
                      Browse the kevarim directory
                    </Link>{" "}
                    if you would rather look first.
                  </span>
                </label>
              </div>
            )}

            <label className="block rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-5 sm:p-6">
              <span className={label}>Anything else we should know</span>
              <textarea
                rows={3}
                className={`${field} min-h-24`}
                value={answers.notes}
                placeholder="A simcha, an anniversary, somebody who cannot walk far, a budget you want to stay inside…"
                onChange={(event) => update({ notes: event.target.value })}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => goToStep(1)}
                className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
              >
                Back to the kind of trip
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-8 space-y-8">
            <div className="grid gap-5 lg:grid-cols-2">
              <button
                type="button"
                onClick={() => choose("myself")}
                className="wg-card flex h-full flex-col items-start border border-[var(--gold-light)] bg-[var(--surface)] p-7 text-left transition hover:border-[var(--gold)]"
              >
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">Free, and yours</span>
                <span className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">
                  I want to plan it myself
                </span>
                <span className="mt-3 leading-7 text-stone-600">
                  Opens the planner with your answers already in it — the name, the dates and the travelers. Add
                  flights, hotels and stops as you go, and it works out the driving between them.
                </span>
                <span className="mt-5 text-sm font-semibold text-[var(--navy)]">Open the planner →</span>
              </button>

              <button
                type="button"
                onClick={() => choose("white-glove")}
                className="wg-card flex h-full flex-col items-start border border-[var(--navy)] bg-[var(--navy)] p-7 text-left text-white transition hover:bg-[var(--navy-deep)]"
              >
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-light)]">Have us do it</span>
                <span className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight">
                  I want White Glove to help
                </span>
                <span className="mt-3 leading-7 text-slate-200">
                  Sends everything you have just answered to us, so you do not type it again. We read it and come back
                  to you — nothing is charged and nothing is booked by sending it.
                </span>
                <span className="mt-5 text-sm font-semibold text-[var(--gold-light)]">Send my answers →</span>
              </button>
            </div>

            <div className="rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">Not decided?</p>
              <p className="mt-2 leading-7 text-stone-600">
                You can look around first and come back — your answers stay in this browser either way.
              </p>
              <button
                type="button"
                onClick={() => choose("unsure")}
                className="mt-4 inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
              >
                Show me some destinations first
              </button>
            </div>

            {/* What we have, in their own words, before either button is
                pressed. A wizard that sends a summary you were never shown is
                how somebody finds out afterwards that it said the wrong thing. */}
            <div className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-5 sm:p-6">
              <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">What you have told us</h3>
              {summarize(answers).length > 0 ? (
                <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {summarize(answers).map(([term, value]) => (
                    <div key={term}>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">{term}</dt>
                      <dd className="mt-0.5 leading-6 text-[var(--navy)]">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 leading-7 text-stone-600">
                  Nothing yet — which is fine. Both paths above work from an empty start, and the planner will ask for
                  the dates when you are ready.
                </p>
              )}
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
              >
                Change these answers
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
