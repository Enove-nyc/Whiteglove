import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Email alerts | White Glove Itineraries",
  description: "Unsubscribe from White Glove travel alerts.",
  path: "/alerts/unsubscribed",
  noIndex: true,
});

export default async function AlertsUnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const ok = params.ok === "1";

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-xl px-5 py-16 sm:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">
          {ok ? "You are unsubscribed" : "We could not update that"}
        </h1>
        <p className="mt-4 text-sm leading-7 text-stone-600">
          {ok
            ? "You will not receive further alert emails from this list. You can sign up again from a destination page if you change your mind."
            : params.error || "That unsubscribe link is not valid or alerts are not connected yet."}
        </p>
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
