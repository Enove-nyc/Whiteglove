"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * When a page fails.
 *
 * THERE WAS NO ERROR BOUNDARY, so a page that threw showed Next.js's own
 * screen: a grey box with a digest string on it. To a traveler that is
 * indistinguishable from the site being gone, and it offers nothing to do
 * next — which matters most for the people this site is for, who are often
 * looking something up the day before they fly.
 *
 * WHAT AN ERROR SCREEN OWES SOMEBODY. Three things, and the third is the one
 * that is usually missing: say plainly that it is our fault and not theirs;
 * give them a way to try again that actually retries rather than reloading the
 * whole application; and give them somewhere else to go, because the thing
 * they came for might be one link away.
 *
 * `unstable_retry` re-fetches and re-renders this segment. `reset` only clears
 * the boundary without re-fetching, which for a server-rendered page here
 * would put the same failure straight back on screen — see the note in the
 * Next.js error.js reference.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // The digest is what ties this screen to a line in the server log. Nothing
    // is sent anywhere from here; there is no error service wired up, and
    // pretending otherwise would be worse than the console.
    console.error("[page]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--cream)] px-5 py-20 text-[var(--ink)]">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-8 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-ink)]">Something went wrong</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
          This page did not load.
        </h1>
        <p className="mt-4 leading-7 text-stone-600">
          That is at our end, not yours, and nothing you were doing has been lost — a saved trip is saved. Try it again;
          if it keeps happening, tell us and we will look at it.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
          >
            Try this page again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
          >
            Back to the front page
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center rounded-md px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
          >
            Tell us it broke
          </Link>
        </div>

        {error.digest && (
          /* The one string that lets somebody find this in the log. Shown
             rather than hidden, so a person reporting it can quote it. */
          <p className="mt-8 border-t border-[var(--gold-light)] pt-5 text-xs text-stone-500">
            If you are writing to us, this reference helps us find it:{" "}
            <code className="font-mono text-stone-700">{error.digest}</code>
          </p>
        )}
      </div>
    </main>
  );
}
