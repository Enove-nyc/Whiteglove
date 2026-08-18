import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { isValidAccessToken } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Site status | White Glove Kosher Travel",
  robots: { index: false, follow: false },
};

/**
 * Railway uses this route as its health check, so it stays small, dynamic and
 * safe for a customer to reach directly.
 *
 * WHICH IS WHY THE COMMIT IS BEHIND THE ADMIN COOKIE RATHER THAN GONE.
 * A stranger has no business reading which build is running; the owner has
 * every business reading it, and reads it constantly — "did that deploy
 * land?" is unanswerable without it, and the honest failure mode is watching
 * an old page and concluding the code is broken. So an anonymous visitor gets
 * the status line and nothing else, and an authenticated admin gets the sha
 * underneath it.
 */
/**
 * Outside a request there is nobody signed in, which is the right answer.
 *
 * `cookies()` throws when this component is rendered outside a request scope —
 * a test rendering the page directly, for one. Treating that as "no admin"
 * gives exactly the customer-safe page, which is what a caller with no request
 * should see anyway, and lets the health check's own test render it.
 */
async function adminCookie(): Promise<string | undefined> {
  try {
    return (await cookies()).get("white_glove_admin")?.value;
  } catch {
    return undefined;
  }
}

export default async function VersionPage() {
  const admin = isValidAccessToken("admin", await adminCookie());
  // Vercel and Railway name these differently; whichever platform built the
  // site, this answers the same question.
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || "unknown (not a platform build)";
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE || process.env.RAILWAY_GIT_COMMIT_MESSAGE || "—";
  const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.RAILWAY_GIT_BRANCH || "—";

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">
        White Glove Kosher Travel
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Site status</h1>
      <p className="mt-4 leading-7 text-stone-600">White Glove is available.</p>
      {admin ? (
        <dl className="mt-8 space-y-3 font-mono text-sm text-stone-700">
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-stone-500">Commit</dt>
            <dd className="break-all text-base font-bold">{sha}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-stone-500">Short</dt>
            <dd className="text-base font-bold">{sha.slice(0, 7)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-stone-500">Message</dt>
            <dd>{message}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-stone-500">Branch</dt>
            <dd>{branch}</dd>
          </div>
        </dl>
      ) : null}

      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center border border-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
      >
        Return to the homepage
      </Link>
    </main>
  );
}
