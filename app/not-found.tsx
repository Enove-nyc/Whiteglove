import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

/**
 * The page for an address that is not here.
 *
 * WHAT WAS THERE BEFORE: Next's own 404 — "404 / This page could not be
 * found." on a white screen, with no navigation, no footer, no mark and one
 * link. Every mistyped address, every stale link from outside and every
 * expired share link landed on something that looks like a broken server
 * rather than like this site, and offered no way onward.
 *
 * SO IT IS THE ORDINARY SHELL, and deliberately nothing more. The bar at the
 * top is the whole navigation, so the body needs to do very little: say what
 * happened, and offer the one thing that actually finds a mistyped page — the
 * search. A second column of suggestions here would be a content page built
 * on somebody's typing mistake.
 *
 * No `pageMetadata` call: Next sets the 404 status itself and this page must
 * never be canonical or indexed for the address that missed.
 */
export const metadata = {
  title: "Page not found | White Glove Kosher Travel",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-xl px-5 py-16 sm:px-8 sm:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">Page not found</p>
        <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
          That page isn&rsquo;t here.
        </h1>
        <p className="mt-4 leading-7 text-stone-600">
          The address may have changed, or it may have been typed a little differently. Search the site and you will
          probably find what you were after.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/search"
            className="inline-flex min-h-11 items-center border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:opacity-90"
          >
            Search the site
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
          >
            Home
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
