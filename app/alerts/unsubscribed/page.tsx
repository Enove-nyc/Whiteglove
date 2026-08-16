import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Email alerts | White Glove Kosher Travel",
  description: "Unsubscribe from White Glove travel alerts.",
  path: "/alerts/unsubscribed",
  noIndex: true,
});

export default async function AlertsUnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; test?: string }>;
}) {
  const params = await searchParams;
  const ok = params.ok === "1";
  /** The link in a message the owner sent himself. Nobody was removed. */
  const wasTest = params.test === "1";

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-xl px-5 py-16 sm:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">
          {wasTest ? "This was a test message" : ok ? "You are unsubscribed" : "We could not update that"}
        </h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">
          {wasTest
            ? "Nobody has been unsubscribed. In a real update this link takes the reader off the list straight away, without asking them anything else."
            : ok
              ? "You will not receive further alert emails from this list. You can sign up again at any time from the travel updates page."
              : params.error || "That unsubscribe link is not valid or alerts are not connected yet."}
        </p>
        {!ok && !wasTest && (
          // A person whose link has genuinely failed is somebody who wants to
          // stop hearing from us and cannot. Leaving them at a dead end is how
          // that becomes a spam report rather than an unsubscribe.
          <p className="mt-3 text-sm leading-7 text-stone-600">
            Write to us from the{" "}
            <Link href="/contact" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4">
              contact page
            </Link>{" "}
            and we will take you off the list by hand.
          </p>
        )}
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white"
        >
          Back to White Glove
        </Link>
      </section>
      <Footer />
    </main>
  );
}
