/**
 * WHAT A SAVE SAYS WHILE IT IS HAPPENING, AND AFTER.
 *
 * The site had most of this already, written out by hand at every call site,
 * and the shape of what was missing only shows up when you count: "Saving…"
 * appears sixty-four times across the components, and "Saved." eight. So the
 * ordinary experience of saving something here was a button that went busy,
 * came back, and never said whether it had worked. The answer arrived only
 * when a save FAILED — which is the one time somebody has already assumed the
 * worst.
 *
 * THE STATE THAT WAS MISSING ENTIRELY IS OFFLINE. Nothing outside the client
 * app knew the device had lost its connection, so a save attempted in a lift,
 * on a train, or in an apartment in Rome with the wifi down said "Could not
 * save" — which reads as the site being broken, or the work being gone, and
 * earns a second and third press of the same button. It is the wrong sentence
 * for a travel site in particular: half of what this site is for happens
 * abroad, on somebody else's patchy connection.
 *
 * There were also six different sentences for the same failure — "Could not
 * save.", "Could not save that.", "Could not save your changes.", "Could not
 * save them. Check your connection and try again.", "Could not save that just
 * now.", "That did not save — try again." Six wordings is not six meanings; it
 * is one meaning nobody owned.
 *
 * WHAT THIS DOES NOT DO. It does not swallow what the server said. A route
 * that knows the real answer — a name already taken, a plan's limit reached,
 * a field the form got wrong — has said something worth reading, and that
 * sentence wins over the generic one. This is the floor, not a gag.
 */

export type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  /** The device has no connection. Not a failure of the site or the request. */
  | { kind: "offline" }
  | { kind: "failed"; message: string };

/** The four sentences, in one place, so they cannot become six again. */
export const SAVING = "Saving…";
export const SAVED = "Saved.";
export const OFFLINE = "You are offline, so that did not save. Try again when you have a signal.";
export const FAILED = "That did not save — try again.";

/**
 * How long "Saved." stays before the line goes quiet again.
 *
 * Long enough to be read by somebody who looked away as they pressed, short
 * enough that it is gone before the next edit — a stale "Saved." sitting over
 * an unsaved change is worse than no message at all.
 */
export const SAVED_FOR_MS = 4000;

/**
 * What to show once a save has come back.
 *
 * `online` is passed in rather than read here: this file is pure, so it can be
 * tested without a browser, and the caller already holds the answer from
 * useOnline(). Pass `true` when it is not known — a wrong "you are offline" is
 * worse than a generic failure, because it sends somebody to check their wifi
 * when the fault is ours.
 */
/** The two states a save that did not go through can be in. */
export type SaveProblem = { kind: "offline" } | { kind: "failed"; message: string };

export function saveProblem(result: {
  /** The HTTP status, when there was a response at all. */
  status?: number;
  /** Whatever the route itself said, which beats the generic sentence. */
  serverSaid?: string | null;
  /** navigator.onLine, via useOnline(). */
  online?: boolean;
}): SaveProblem {
  // A dropped connection first, because it is the one cause the visitor can do
  // something about and the only one where retrying now is pointless. A fetch
  // that never reached a server has no status at all, which is the shape this
  // arrives in.
  if (result.online === false) return { kind: "offline" };

  const said = result.serverSaid?.trim();
  if (said) return { kind: "failed", message: said };

  // 401 is worth its own sentence: "try again" is exactly the wrong advice for
  // somebody whose session ended while the tab sat open, and pressing the
  // button again produces the identical nothing.
  if (result.status === 401) {
    return { kind: "failed", message: "You are signed out. Sign in again and the change will save." };
  }

  return { kind: "failed", message: FAILED };
}

export function saveOutcome(result: {
  ok: boolean;
  status?: number;
  serverSaid?: string | null;
  online?: boolean;
}): SaveState {
  return result.ok ? { kind: "saved" } : saveProblem(result);
}

/** The line to print, or null when there is nothing to say. */
export function describeSave(state: SaveState): string | null {
  switch (state.kind) {
    case "saving":
      return SAVING;
    case "saved":
      return SAVED;
    case "offline":
      return OFFLINE;
    case "failed":
      return state.message;
    default:
      return null;
  }
}

/**
 * Whether the line is a problem, for whoever is choosing a colour.
 *
 * Offline counts, because it means the change did not happen — but it is the
 * one that is nobody's fault, and it is worded that way.
 */
export function saveWentWrong(state: SaveState): boolean {
  return state.kind === "failed" || state.kind === "offline";
}

/**
 * A save that cannot throw, and therefore cannot leave a button stuck.
 *
 * THE BUG THIS EXISTS FOR IS NOT THE WORDING, IT IS THE HANG. Most of the
 * save handlers on this site were written as a bare `await fetch(...)` with no
 * try around it. `fetch` rejects when the request never reaches a server —
 * which on a phone means a lift, a tunnel, a plane, an apartment whose wifi
 * dropped — and a rejected promise inside an async click handler goes nowhere.
 * The `setSaving(false)` after it never runs. So the button says "Saving…" for
 * ever, no message appears, and the only way out is to reload the page and
 * find out whether it went through.
 *
 * That is the worst failure this site had, and it happened in exactly the
 * conditions this site is used in.
 *
 * So: one call that returns a result instead of throwing one, with the state
 * already worked out. The caller cannot forget the catch, because there is
 * nothing to catch.
 */
export type SaveResult<T = Record<string, unknown>> =
  | { ok: true; data: T | null }
  /**
   * The body comes back on a failure too, because a refusal is sometimes the
   * most informative answer a route gives. The sign-in form is the example:
   * an unverified account is refused WITH `verificationRequired`, and the form
   * has to switch to the code screen off that flag. Throwing the body away
   * would have turned "here is your code screen" into "please try again".
   *
   * It is null when there was no response to read at all — which is exactly
   * the offline case.
   */
  | { ok: false; state: SaveProblem; data: T | null };

/** navigator.onLine where there is a navigator, and true where there is not. */
function deviceOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

export async function saveJson<T = Record<string, unknown>>(
  url: string,
  init?: RequestInit,
  /** Overridable so this can be tested without a browser. */
  online: boolean = deviceOnline(),
): Promise<SaveResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    // Never reached a server. Offline if the device says so, and a plain
    // failure otherwise — a request refused by the browser for some other
    // reason is not something to blame the visitor's signal for.
    return { ok: false, state: saveProblem({ online }), data: null };
  }

  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    return { ok: false, state: saveProblem({ status: response.status, serverSaid: body?.error, online }), data: body };
  }
  return { ok: true, data: body };
}
