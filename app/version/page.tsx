import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Site status — White Glove Kosher Travel",
  robots: { index: false, follow: false },
};

// Railway uses this route as its health check, so it stays small, dynamic and
// safe for a customer to reach directly.
export default function VersionPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">
        White Glove Kosher Travel
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Site status</h1>
      <p className="mt-4 leading-7 text-stone-600">White Glove is available.</p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center border border-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
      >
        Return to the homepage
      </Link>
    </main>
  );
}
