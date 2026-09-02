"use client";

import { useEffect, useState } from "react";
import {
  PACES,
  type Pace,
} from "@/lib/trip-plan";
import {
  PREFERENCE_GROUPS,
  emptyPreferences,
  hasAnything,
  type TravelPreferences,
} from "@/data/travel-preferences";

/**
 * TRAVEL PREFERENCES — the memory, with the lid off.
 *
 * A site that remembers things about you and never shows you what is a site
 * you stop trusting the first time it surprises you. So this screen is the
 * whole of it: every value that is kept, a tick to change any of them, and one
 * button that forgets the lot.
 *
 * AND IT SHOWS THE MODEL'S SIDE VERBATIM. "What the assistant is told" is the
 * exact string the assistant receives — not a summary of it, not a reassurance
 * about it. If that line ever said something a traveller did not expect, they
 * would see it here first, which is the only version of this that deserves to
 * be believed.
 *
 * NOTHING ARRIVES HERE ON ITS OWN. Every value is one somebody ticked. Nothing
 * is learned from what was searched, opened or asked — a question about Rome
 * is not a standing preference for Italy, and the day this screen starts
 * filling itself in is the day it becomes something else.
 */
export default function TravelPreferencesPanel() {
  const [prefs, setPrefs] = useState<TravelPreferences>(emptyPreferences());
  const [assistantSees, setAssistantSees] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/preferences", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as
          | { preferences?: TravelPreferences; assistantSees?: string; ready?: boolean }
          | null;
        if (cancelled || !data?.preferences) return;
        setPrefs(data.preferences);
        setAssistantSees(data.assistantSees ?? "");
        setReady(data.ready !== false);
      } catch {
        if (!cancelled) setError("Could not read your preferences just now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; preferences?: TravelPreferences; assistantSees?: string; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        // What was ticked stays ticked — a failed save must not cost somebody
        // the answers they just gave.
        setError(data?.error || "Could not save that just now.");
        return false;
      }
      if (data.preferences) setPrefs(data.preferences);
      setAssistantSees(data.assistantSees ?? "");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
      return true;
    } catch {
      setError("Could not reach the server. Your answers are still here.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function toggle(key: keyof TravelPreferences, option: string) {
    setSaved(false);
    setPrefs((prev) => {
      const chosen = prev[key] as string[];
      return { ...prev, [key]: chosen.includes(option) ? chosen.filter((v) => v !== option) : [...chosen, option] };
    });
  }

  if (loading) return <p className="mt-4 text-sm text-stone-500">Reading your preferences…</p>;

  if (!ready) {
    return (
      <p className="mt-4 border border-[var(--gold-light)] bg-white px-4 py-3 text-sm leading-6 text-stone-600">
        This needs the private store connected before anything can be remembered.
      </p>
    );
  }

  const chip = (on: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm transition-colors ${
      on
        ? "border-[var(--gold)] bg-[var(--navy)] text-[var(--cream)]"
        : "border-[var(--gold-light)] bg-white text-[var(--navy)] hover:border-[var(--gold)]"
    }`;

  return (
    <div className="mt-4 flex flex-col gap-6">
      <p className="text-sm leading-6 text-stone-600">
        Tick what is true of how you travel and the site stops asking. It fills in your planning and, when you use the
        assistant, it is what the assistant is told. Nothing here is worked out from what you search or open — you set
        it, and you can empty it.
      </p>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-stone-500">Pace</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PACES.filter((p) => p.value !== "unknown").map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={prefs.pace === option.value}
              onClick={() => {
                setSaved(false);
                setPrefs((prev) => ({ ...prev, pace: prev.pace === option.value ? "" : (option.value as Pace) }));
              }}
              className={chip(prefs.pace === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {PREFERENCE_GROUPS.map((group) => (
        <div key={group.key}>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-stone-500">{group.label}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.options.map((option) => {
              const on = (prefs[group.key] as string[]).includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(group.key, option)}
                  className={chip(on)}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* THE MODEL'S SIDE, WORD FOR WORD. Not a description of it. */}
      <div className="border border-[var(--gold-light)] bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-stone-500">What the assistant is told</p>
        <p className="mt-2 text-sm leading-6 text-[var(--navy)]">
          {assistantSees || "Nothing yet — the assistant is told none of this until you tick something."}
        </p>
        <p className="mt-2 text-xs leading-5 text-stone-500">
          That is all of it. Not your name, not your email, not your trips, and nothing you have asked it before.
        </p>
      </div>

      {error && (
        <p role="alert" className="border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void send({ preferences: prefs })}
          className="inline-flex min-h-11 items-center rounded-md bg-[var(--navy)] px-4 text-sm font-semibold text-[var(--cream)] disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {hasAnything(prefs) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void (async () => {
                if (await send({ action: "forget" })) setPrefs(emptyPreferences());
              })();
            }}
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold-light)] bg-white px-4 text-sm font-semibold text-[var(--navy)] disabled:opacity-60"
          >
            Forget all of this
          </button>
        )}
        {saved && <span className="text-sm font-semibold text-[var(--gold-ink)]">Saved.</span>}
      </div>
    </div>
  );
}
