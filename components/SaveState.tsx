"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { describeSave, type SaveState, SAVED_FOR_MS, saveWentWrong } from "@/lib/save-state";

/**
 * The one line that says how a save went, and the hook that knows whether the
 * device can save at all.
 *
 * See lib/save-state.ts for why this exists. In short: the site said "Saving…"
 * sixty-four times and "Saved." eight, so most saves here never confirmed
 * themselves; and nothing outside the client app knew when the connection had
 * dropped, so a save attempted with no signal blamed the site.
 */

/**
 * Whether THIS DEVICE currently has a connection.
 *
 * Starts true, always — see the server snapshot below.
 *
 * The client app has carried its own copy of this since it was written
 * (components/companion/CompanionApp.tsx); this is the same logic where the
 * rest of the site can reach it.
 */
function subscribeToConnection(notify: () => void) {
  window.addEventListener("offline", notify);
  window.addEventListener("online", notify);
  return () => {
    window.removeEventListener("offline", notify);
    window.removeEventListener("online", notify);
  };
}

export function useOnline(): boolean {
  /**
   * useSyncExternalStore rather than an effect that calls setState.
   *
   * navigator.onLine IS an external store, which is what this hook is for: it
   * takes a subscribe, a client snapshot and — the part that matters here — a
   * SERVER snapshot, which is where the "always true on the server" rule
   * belongs. Reading it in an effect and calling setState would work, but it
   * costs a second render on every page carrying a save button, and React's
   * own lint rule says so.
   */
  return useSyncExternalStore(
    subscribeToConnection,
    () => navigator.onLine,
    // There is no navigator on the server, and a page that renders "you are
    // offline" during hydration and then takes it back is worse than one that
    // waits for the browser to say so.
    () => true,
  );
}

/**
 * Holds a save's state, and clears "Saved." after a few seconds on its own.
 *
 * The clearing is the part worth having in one place. A "Saved." left sitting
 * above a field somebody has since edited is a message that has become untrue,
 * and every surface that wrote its own confirmation either had to remember a
 * timer or leave one there for ever. Most left it there for ever.
 */
export function useSaveState(): {
  state: SaveState;
  set: (next: SaveState) => void;
  online: boolean;
} {
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const online = useOnline();

  useEffect(() => {
    if (state.kind !== "saved") return;
    const t = setTimeout(() => setState({ kind: "idle" }), SAVED_FOR_MS);
    return () => clearTimeout(t);
  }, [state]);

  return { state, set: setState, online };
}

/**
 * The line itself.
 *
 * role="status" rather than role="alert": a save going through is not an
 * interruption, and a screen reader announcing "Saved." over the next thing
 * somebody typed is the reason polite exists. Nothing renders while idle, so
 * this takes no room on a form nobody has touched.
 */
export default function SaveStateLine({ state, className = "" }: { state: SaveState; className?: string }) {
  const said = describeSave(state);
  if (!said) return null;
  return (
    <p
      role="status"
      className={`text-sm font-semibold ${saveWentWrong(state) ? "text-[var(--navy)]" : "text-stone-600"} ${className}`}
    >
      {said}
    </p>
  );
}
