"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { type Draft, draftableValues, readDraft, sameValues } from "@/lib/drafts";

/**
 * Keeps what somebody has typed into a form, in their own browser.
 *
 * The admin saves on a button press and not before, which is right — a
 * half-typed overview should not be on the website. It also means twenty
 * minutes of writing lives nowhere until Save is pressed.
 *
 * READ THROUGH useSyncExternalStore, not copied into state. localStorage is an
 * outside thing that another tab can change, and a copy in state would be a
 * second version of it that can disagree. It is also the only way to read it
 * without asking during render, which a component may not do.
 *
 * WRITTEN FROM THE EVENT, not from an effect. Typing is what makes a draft
 * worth keeping, so the handler that hears the typing is where it belongs. A
 * short pause first, so a paragraph is one write rather than four hundred.
 *
 * MEASURED AGAINST WHAT THE FORM WAS LOADED WITH. A draft is kept only while
 * the fields differ from the values they were given, so typing a letter and
 * deleting it leaves nothing behind. Otherwise the offer to put work back
 * would appear for somebody who has no work to put back.
 */

const CHANGED = "whiteglove-draft-changed";
const SETTLE_MS = 400;

/**
 * Parsed once per key per distinct stored string.
 *
 * useSyncExternalStore compares snapshots by identity, so handing back a
 * freshly parsed object every read would tell React the value changed and it
 * would render forever.
 *
 * ONE SLOT PER KEY, not one slot. An editor screen has a dozen of these forms
 * on it, and a single shared slot would be thrown away by every other form's
 * read — so each would re-parse, each would hand back a new object, and the
 * page would spin. Keyed, they never disturb one another.
 */
const cache = new Map<string, { raw: string | null; value: Draft | null }>();

function snapshotOf(key: string): Draft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  const held = cache.get(key);
  if (held && held.raw === raw) return held.value;
  const value = readDraft(raw);
  cache.set(key, { raw, value });
  return value;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function announce() {
  window.dispatchEvent(new Event(CHANGED));
}

/**
 * Roughly now, as an epoch, without asking during render.
 *
 * "You typed this 8 minutes ago" needs a clock, and a component may not read
 * one while it renders — the answer changes, and React is entitled to render
 * twice. So the clock is subscribed to like any other outside thing. Once a
 * minute is as often as the sentence changes.
 */
const MINUTE = 60_000;
let clockTicking: ReturnType<typeof setInterval> | null = null;
const clockListeners = new Set<() => void>();
let clockSnapshot = 0;

function subscribeClock(onChange: () => void) {
  clockListeners.add(onChange);
  if (!clockTicking) {
    clockSnapshot = Date.now();
    clockTicking = setInterval(() => {
      clockSnapshot = Date.now();
      for (const listener of clockListeners) listener();
    }, MINUTE);
  }
  return () => {
    clockListeners.delete(onChange);
    if (clockListeners.size === 0 && clockTicking) {
      clearInterval(clockTicking);
      clockTicking = null;
    }
  };
}

function clockNow(): number {
  if (!clockSnapshot) clockSnapshot = Date.now();
  return clockSnapshot;
}

export type FormDraft = {
  /** What is stored for this form, or null. */
  draft: Draft | null;
  /**
   * Roughly now, for judging how old the draft is.
   *
   * Handed back rather than left to the caller, so nothing has to reach for a
   * clock while it renders.
   */
  now: number;
  /**
   * Put this on the <form>.
   *
   * It reads the fields once, as the browser lays them out, to know what they
   * started as. A ref rather than an effect because it must happen before
   * anybody can type — by the first keystroke it is already too late to ask
   * what the form was given.
   */
  watch: (form: HTMLFormElement | null) => void;
  /** Call from the form's onInput. */
  remember: () => void;
  /** Put the stored values back into the form's fields. */
  restoreInto: () => void;
  /** Throw it away — on a successful save, or when asked. */
  forget: () => void;
};

export function useFormDraft(key: string): FormDraft {
  const timer = useRef<number | undefined>(undefined);
  const form = useRef<HTMLFormElement | null>(null);
  const loadedWith = useRef<Record<string, string> | null>(null);

  // Zero on the server, which every rule below reads as "cannot tell how old
  // this is" — and nothing is offered until the browser says otherwise.
  const now = useSyncExternalStore(subscribeClock, clockNow, () => 0);

  const draft = useSyncExternalStore(
    subscribe,
    useCallback(() => snapshotOf(key), [key]),
    // Nothing on the server: it has no browser to have stored anything in.
    () => null,
  );

  // The pending write is cancelled if the component goes; an unmount is not a
  // reason to lose the last four hundred milliseconds of typing, but it is a
  // reason not to fire a timer into a page that has moved on.
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const watch = useCallback((element: HTMLFormElement | null) => {
    form.current = element;
    if (element && !loadedWith.current) loadedWith.current = draftableValues(new FormData(element).entries());
  }, []);

  const drop = useCallback(() => {
    try {
      localStorage.removeItem(key);
      announce();
    } catch {
      /* nothing to do about it */
    }
  }, [key]);

  const remember = useCallback(() => {
    window.clearTimeout(timer.current);
    if (!form.current) return;
    const values = draftableValues(new FormData(form.current).entries());
    timer.current = window.setTimeout(() => {
      // Back to what it was loaded with is not a draft, it is a form nobody has
      // changed — and anything kept from before it got back here is stale.
      if (loadedWith.current && sameValues(values, loadedWith.current)) {
        drop();
        return;
      }
      try {
        localStorage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), values }));
        announce();
      } catch {
        // A full or blocked storage is not worth breaking the form over. The
        // save button still works; only the safety net is missing.
      }
    }, SETTLE_MS);
  }, [key, drop]);

  const forget = useCallback(() => {
    window.clearTimeout(timer.current);
    // What is on screen now is the new nothing-to-rescue point: either it was
    // just saved, or the person said the typing was not worth keeping.
    if (form.current) loadedWith.current = draftableValues(new FormData(form.current).entries());
    drop();
  }, [drop]);

  const restoreInto = useCallback(() => {
    const stored = snapshotOf(key);
    if (!stored || !form.current) return;
    for (const [field, value] of Object.entries(stored.values)) {
      const element = form.current.elements.namedItem(field);
      // A radio group answers with a list; drafts hold one value per name, so
      // anything that is not a single field is left alone rather than guessed.
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
        element.value = value;
      }
    }
  }, [key]);

  return { draft, now, watch, remember, restoreInto, forget };
}
