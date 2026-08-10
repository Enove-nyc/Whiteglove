"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { BUILT_IN_WORDS, type SiteWords } from "@/data/site-words";
import {
  ACCESSIBILITY_NEEDS,
  INTERESTS,
  KOSHER_REQUIREMENTS,
  PACES,
  readAnswers,
  requestMessage,
  requestSubject,
  SHABBOS_REQUIREMENTS,
  summarize,
  TRIP_KINDS,
  TRIP_PLAN_KEY,
  emptyAnswers,
  hasAnswers,
  type TripKind,
  type TripPlanAnswers,
} from "@/lib/trip-plan";

/**
 * "Tell us about the trip you want to take."
 *
 * WHAT THIS REPLACES. The contact page asked for "your kevarim, dates, and
 * kosher needs" — of everybody, including a family asking about a week in the
 * Dolomites. A form that opens by asking which graves you want to visit tells
 * a vacation customer, in one line, that the site is not for them.
 *
 * SO THE KEVARIM QUESTION IS CONDITIONAL and nothing else is. It appears when
 * the trip is a heritage journey and at no other time. That is the whole rule,
 * and it is tested: lib/trip-plan.ts decides what a set of answers contains
 * and a test asserts that a beach holiday never carries a kevarim line.
 *
 * NOBODY TYPES ANYTHING TWICE. If they came through /plan, their answers are
 * in this browser, and the form is filled in from them the moment it mounts —
 * imperatively, on the form's own ref, before anybody can type into it. The
 * alternative was a controlled form initialised from localStorage, which the
 * server cannot see and which would hydrate wrong.
 *
 * IT IS OPEN, unlike the flight-booking form next door, and the difference is
 * real: that one asks a person here to buy a ticket on the traveler's behalf,
 * which is a service that is not switched on yet (lib/features.ts). This sends
 * a message to the same inbox the contact form has always delivered to, and
 * promises only that somebody will read it.
 */

const field =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const label = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-600";

/* ---- reading what /plan left behind -------------------------------------- */
//
// Through useSyncExternalStore, not copied into state in an effect:
// localStorage is an outside thing, another tab can change it, and mirroring
// it into state is the cascading render the lint rule is about. The server
// snapshot is null, which every branch below reads as "they came here
// directly" — the correct first paint for somebody who did.

let cachedRaw: string | null = null;
let cachedAnswers: TripPlanAnswers | null = null;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function storedAnswers(): TripPlanAnswers | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(TRIP_PLAN_KEY);
  } catch {
    return null;
  }
  // Parsed once per distinct stored string. useSyncExternalStore compares
  // snapshots by identity, so a fresh object every read would tell React the
  // value had changed and it would render for ever.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedAnswers = readAnswers(raw);
  }
  return cachedAnswers;
}

type Problem = { field: string; message: string };

export default function PlanningRequestForm({
  words = BUILT_IN_WORDS,
  initialKind = "",
  initialDestination = "",
  heading = "Tell us about the trip you want to take.",
}: {
  words?: SiteWords;
  /** From ?trip= on the link that brought them here. */
  initialKind?: TripKind | "";
  /** From ?destination= — a destination page's "Have us plan Rome". */
  initialDestination?: string;
  heading?: string;
}) {
  const carried = useSyncExternalStore(subscribe, storedAnswers, () => null);
  const fromPlan = hasAnswers(carried);

  const [kind, setKind] = useState<TripKind | "">(initialKind);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const filled = useRef(false);

  /**
   * Fill the fields in from the answers they already gave.
   *
   * A ref callback rather than an effect, because it has to happen before
   * anybody can type — by the first keystroke it is too late to ask what the
   * form was given. `filled` makes it once-only, so a re-render cannot wipe
   * out an edit they have just made.
   */
  const attach = useCallback(
    (form: HTMLFormElement | null) => {
      if (!form || filled.current) return;
      const answers = storedAnswers();
      if (!hasAnswers(answers) || !answers) return;
      filled.current = true;
      const set = (name: string, value: string) => {
        const element = form.elements.namedItem(name);
        if (!value) return;
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
          element.value = value;
        }
      };
      set("destination", answers.helpMeChoose ? "" : answers.destination);
      set("from", answers.from);
      set("startDate", answers.startDate);
      set("endDate", answers.endDate);
      set("approximateWhen", answers.approximateWhen);
      set("adults", answers.adults);
      set("children", answers.children);
      set("childAges", answers.childAges);
      set("kevarim", answers.kevarim);
      set("kosherNotes", answers.kosherNotes);
      set("notes", answers.notes);
      if (answers.pace !== "unknown") set("pace", answers.pace);
      if (answers.kind) setKind(answers.kind);
      // The four multi-select lists, ticked from what they chose in the flow.
      // Named rather than looped over every checkbox on the form, so a new
      // checkbox somewhere else cannot quietly join this.
      for (const [name, chosen] of [
        ["kosher", answers.kosher],
        ["shabbos", answers.shabbos],
        ["interests", answers.interests],
        ["accessibility", answers.accessibility],
      ] as const) {
        for (const box of form.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${name}"]`)) {
          box.checked = chosen.includes(box.value);
        }
      }
    },
    [],
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailed(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const many = (name: string) => data.getAll(name).map(String);

    // Three things are genuinely needed: who you are, where to write back, and
    // something to read. Everything else on this form is optional and says so.
    const found: Problem[] = [];
    if (!text("name")) found.push({ field: "request-name", message: "Add your name so we know who we are writing back to." });
    if (!text("email")) found.push({ field: "request-email", message: "Add an email address — it is the only way we can reply." });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text("email")))
      found.push({ field: "request-email", message: "That email address does not look complete. Check it over." });
    if (found.length) {
      setProblems(found);
      // Move to the summary rather than to the first field: somebody using a
      // screen reader needs to hear how many things are wrong before being
      // dropped into one of them.
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setProblems([]);

    const answers: TripPlanAnswers = {
      ...(carried ?? emptyAnswers()),
      kind,
      destination: text("destination"),
      helpMeChoose: !text("destination"),
      dateMode: text("startDate") ? "exact" : text("approximateWhen") ? "approximate" : "unknown",
      startDate: text("startDate"),
      endDate: text("endDate"),
      approximateWhen: text("approximateWhen"),
      from: text("from"),
      adults: text("adults"),
      children: text("children"),
      childAges: text("childAges"),
      pace: (["slow", "balanced", "full"] as const).find((p) => p === text("pace")) ?? "unknown",
      interests: many("interests"),
      kosher: many("kosher"),
      kosherNotes: text("kosherNotes"),
      shabbos: many("shabbos"),
      accessibility: many("accessibility"),
      // Only ever present when the heritage block was on screen, because that
      // is the only time the field exists to be read.
      kevarim: kind === "heritage" ? text("kevarim") : "",
      notes: text("notes"),
    };

    setBusy(true);
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: text("name"),
        email: text("email"),
        phone: text("phone"),
        subject: requestSubject(answers),
        message: requestMessage(answers),
      }),
    }).catch(() => null);
    setBusy(false);

    if (!response || !response.ok) {
      const body = response ? await response.json().catch(() => ({})) : {};
      setFailed(
        (body as { error?: string }).error ||
          `We could not send that just now. Please try again, or email ${words.contactEmail} directly.`,
      );
      return;
    }
    setSent(true);
    try {
      // Their answers have arrived somewhere; leaving them in the browser
      // would refill this form the next time they open it and look like the
      // message had not gone.
      localStorage.removeItem(TRIP_PLAN_KEY);
    } catch {
      /* nothing to do about it */
    }
  }

  if (sent) {
    return (
      <div className="wg-card border border-[var(--gold-light)] bg-[#fcfaf6] p-8 text-center" role="status">
        <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
          Thank you — that is with us.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-stone-600">
          {words.replyPromise} Nothing has been booked; this is the start of a
          conversation. For anything urgent, email {words.contactEmail}.
        </p>
        <p className="mt-6">
          <Link
            href="/itinerary"
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
          >
            Keep building the trip yourself meanwhile
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form ref={attach} onSubmit={submit} noValidate className="wg-card border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-8">
      <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{heading}</h2>
      <p className="mt-3 max-w-2xl leading-7 text-stone-600">
        Whatever kind of trip it is — and whether or not you know where you are going. Only your name and an email
        address are needed; everything else helps and none of it is required.
      </p>

      {fromPlan && (
        <div className="mt-6 rounded-xl border border-[var(--gold)] bg-white p-5" role="status">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">
            Filled in from your planning answers
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            You answered these a moment ago, so we have put them in for you. Change anything you like.
          </p>
          <ul className="mt-3 grid gap-x-8 gap-y-1 text-sm text-stone-600 sm:grid-cols-2">
            {summarize(carried ?? emptyAnswers()).map(([term, value]) => (
              <li key={term}>
                <span className="font-semibold text-[var(--navy)]">{term}:</span> {value}
              </li>
            ))}
          </ul>
        </div>
      )}

      {problems.length > 0 && (
        /* An error summary at the top, focused, listing every problem with a
           link to the field it is about. Marking fields red and leaving
           somebody to find them is what this replaces. */
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="mt-6 rounded-xl border-2 border-red-700 bg-red-50 p-5 outline-none"
        >
          <h3 className="font-semibold text-red-900">
            {problems.length === 1 ? "One thing to fix before this can be sent" : `${problems.length} things to fix before this can be sent`}
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-900">
            {problems.map((problem) => (
              <li key={problem.field}>
                <a href={`#${problem.field}`} className="font-semibold underline underline-offset-2">
                  {problem.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <fieldset className="mt-8">
        <legend className={label}>Kind of trip</legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {TRIP_KINDS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              aria-pressed={kind === entry.value}
              onClick={() => setKind(kind === entry.value ? "" : entry.value)}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition ${
                kind === entry.value
                  ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                  : "border-[var(--gold-light)] bg-white text-stone-700 hover:border-[var(--gold)] hover:text-[var(--navy)]"
              }`}
            >
              <span aria-hidden="true" className="mr-2 text-xs">
                {kind === entry.value ? "✓" : "+"}
              </span>
              {entry.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Where to</span>
          <input
            name="destination"
            defaultValue={initialDestination}
            className={field}
            placeholder="A place, or leave it blank if you would like us to suggest one"
          />
        </label>
        <label className="block">
          <span className={label}>Travelling from</span>
          <input name="from" className={field} placeholder="e.g. New York, London, Tel Aviv" />
        </label>
        <label className="block">
          <span className={label}>Leaving (if you know)</span>
          <input type="date" name="startDate" className={field} />
        </label>
        <label className="block">
          <span className={label}>Coming back (if you know)</span>
          <input type="date" name="endDate" className={field} />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Or roughly when</span>
          <input name="approximateWhen" className={field} placeholder="e.g. July, after Pesach, a week in the winter" />
        </label>
        <label className="block">
          <span className={label}>Adults</span>
          <input type="number" min={0} max={40} inputMode="numeric" name="adults" className={field} />
        </label>
        <label className="block">
          <span className={label}>Children</span>
          <input type="number" min={0} max={40} inputMode="numeric" name="children" className={field} />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Children’s ages</span>
          <input name="childAges" className={field} placeholder="e.g. 4, 7 and 11" />
        </label>
      </div>

      {/* ---- the detail, asked HERE rather than in front of the planner -----
          These five used to be step two of /plan, in front of everybody,
          including the visitor who only wanted to open the planner. They belong
          on this form: somebody asking us to plan a trip is writing a brief,
          and pace, interests, kashrus, Shabbos and access needs are the brief.
          Still optional, still ticked in for anybody who answered them at
          /plan. */}
      <div className="mt-9 border-t border-[var(--gold-light)] pt-7">
        <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
          What would make it fit
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          None of this is required. Every answer here is one fewer question we have to come back and ask you.
        </p>

        <fieldset className="mt-6">
          <legend className={label}>Pace</legend>
          <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1">
            {PACES.filter((pace) => pace.value !== "unknown").map((pace) => (
              <label key={pace.value} className="flex min-h-11 items-center gap-2.5 text-sm text-stone-700">
                <input type="radio" name="pace" value={pace.value} className="h-4 w-4" />
                {pace.label}
                <span className="text-stone-500">— {pace.blurb}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className={label}>Interests</legend>
          <div className="mt-2.5 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {INTERESTS.map((interest) => (
              <label key={interest} className="flex min-h-11 items-center gap-2.5 text-sm text-stone-700">
                <input type="checkbox" name="interests" value={interest} className="h-4 w-4" />
                {interest}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className={label}>Kosher standards</legend>
          <div className="mt-2.5 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {KOSHER_REQUIREMENTS.map((requirement) => (
              <label key={requirement} className="flex min-h-11 items-center gap-2.5 text-sm text-stone-700">
                <input type="checkbox" name="kosher" value={requirement} className="h-4 w-4" />
                {requirement}
              </label>
            ))}
          </div>
          <label className="mt-4 block">
            <span className={label}>Anything else about food</span>
            <input
              name="kosherNotes"
              className={field}
              placeholder="Allergies, a hechsher you rely on, a child who eats nothing but pasta…"
            />
          </label>
        </fieldset>

        <fieldset className="mt-7">
          <legend className={label}>Shabbos requirements</legend>
          <div className="mt-2.5 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {SHABBOS_REQUIREMENTS.map((requirement) => (
              <label key={requirement} className="flex min-h-11 items-center gap-2.5 text-sm text-stone-700">
                <input type="checkbox" name="shabbos" value={requirement} className="h-4 w-4" />
                {requirement}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className={label}>Accessibility needs</legend>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            What the trip has to be able to do. This changes which hotel and which quarter we would suggest at all.
          </p>
          <div className="mt-2.5 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {ACCESSIBILITY_NEEDS.map((need) => (
              <label key={need} className="flex min-h-11 items-center gap-2.5 text-sm text-stone-700">
                <input type="checkbox" name="accessibility" value={need} className="h-4 w-4" />
                {need}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* ONLY FOR A HERITAGE JOURNEY. See the note at the top of this file:
          asking a family planning a week on a beach which kevarim they want to
          visit is what told vacation customers this site was not for them. */}
      {kind === "heritage" && (
        <div className="mt-7 rounded-xl border border-[var(--gold)] bg-white p-5">
          <label className="block">
            <span className={label}>Kevarim, towns or tzaddikim you want to reach</span>
            <textarea
              name="kevarim"
              rows={3}
              className={`${field} min-h-24`}
              placeholder="e.g. Lizhensk, Sanz, and whatever else is on the way"
            />
            <span className="mt-1.5 block text-xs leading-5 text-stone-500">
              Asked because you chose a heritage journey.{" "}
              <Link href="/heritage" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
                The kevarim directory
              </Link>{" "}
              is there if you would rather look first.
            </span>
          </label>
        </div>
      )}

      <label className="mt-7 block">
        <span className={label}>Additional notes</span>
        <textarea
          name="notes"
          rows={4}
          className={`${field} min-h-28`}
          placeholder="A simcha, an anniversary, somebody who cannot walk far, a budget you want to stay inside…"
        />
      </label>

      <div className="mt-8 border-t border-[var(--gold-light)] pt-7">
        <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">How to reach you</h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <label className="block" htmlFor="request-name">
            <span className={label}>Your name (required)</span>
            <input
              id="request-name"
              name="name"
              required
              aria-describedby={problems.some((p) => p.field === "request-name") ? "request-name-error" : undefined}
              aria-invalid={problems.some((p) => p.field === "request-name") || undefined}
              className={field}
            />
            {problems
              .filter((p) => p.field === "request-name")
              .map((p) => (
                <span key={p.message} id="request-name-error" className="mt-1 block text-sm font-semibold text-red-800">
                  {p.message}
                </span>
              ))}
          </label>
          <label className="block" htmlFor="request-email">
            <span className={label}>Email (required)</span>
            <input
              id="request-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              aria-describedby={problems.some((p) => p.field === "request-email") ? "request-email-error" : undefined}
              aria-invalid={problems.some((p) => p.field === "request-email") || undefined}
              className={field}
            />
            {problems
              .filter((p) => p.field === "request-email")
              .map((p) => (
                <span key={p.message} id="request-email-error" className="mt-1 block text-sm font-semibold text-red-800">
                  {p.message}
                </span>
              ))}
          </label>
          <label className="block" htmlFor="request-phone">
            <span className={label}>Phone (optional)</span>
            <input id="request-phone" name="phone" type="tel" autoComplete="tel" className={field} />
          </label>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          // Announced as well as disabled. A button that changes its own label
          // to "Sending…" tells a sighted person what is happening and tells a
          // screen reader nothing, because the name of the control that
          // currently has focus is not re-read when it changes.
          aria-busy={busy || undefined}
          className="inline-flex min-h-12 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-7 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send this to White Glove"}
        </button>
        <p className="text-sm leading-6 text-stone-600">
          Nothing is booked or charged by sending this. {words.replyPromise}
        </p>
      </div>

      {/* The three states of a submission, in one polite region: sending,
          and then either the thank-you (which replaces this whole form) or
          the failure below. Without it, pressing Send and waiting is silent. */}
      <p role="status" aria-live="polite" className="sr-only">
        {busy ? "Sending your planning request…" : ""}
      </p>

      {failed && (
        <p role="alert" className="mt-4 rounded-lg border-2 border-red-700 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
          {failed}
        </p>
      )}
    </form>
  );
}
