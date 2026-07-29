"use client";

import { useEffect, useState } from "react";

/**
 * Is there somebody signed in?
 *
 * Asked once per page rather than once per button: a kever page can carry a
 * dozen "add to my route" buttons, and twelve identical requests for the same
 * answer is silly. The answer is cached in the module for the life of the page,
 * and cleared when a sign-in or sign-out happens so buttons update without a
 * reload.
 *
 * `null` means "not known yet". Buttons should stay quiet in that moment rather
 * than flashing "sign in" at somebody who is already signed in.
 */

let cached: Promise<boolean> | null = null;
const listeners = new Set<(value: boolean) => void>();

function ask(): Promise<boolean> {
  cached ??= fetch("/api/account/me", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => Boolean(d?.signedIn))
    .catch(() => false);
  return cached;
}

/** Ask again — after signing in or out, so the buttons catch up. */
export function forgetSignedIn() {
  cached = null;
  void ask().then((value) => {
    for (const listener of listeners) listener(value);
  });
}

export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    const update = (value: boolean) => {
      if (live) setSignedIn(value);
    };
    listeners.add(update);
    void ask().then(update);
    return () => {
      live = false;
      listeners.delete(update);
    };
  }, []);

  return signedIn;
}

/** Where to send somebody to sign in, and come back to where they were. */
export function signInHref(): string {
  if (typeof window === "undefined") return "/login";
  const here = `${window.location.pathname}${window.location.search}`;
  return `/login?next=${encodeURIComponent(here)}`;
}
