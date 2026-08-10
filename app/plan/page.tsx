import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StartingPoints from "@/components/StartingPoints";
import TripStartFlow from "@/components/TripStartFlow";
import { getVacationDestination } from "@/data/vacation-destinations";
import { pageMetadata } from "@/lib/seo";
import { TRIP_KINDS, type TripKind } from "@/lib/trip-plan";

export const metadata = pageMetadata({
  title: "Plan a kosher trip — start here | White Glove Itineraries",
  description:
    "Three short steps and you have a trip started: what kind of holiday, where and roughly when, and whether you would like to plan it yourself or have us do it.",
  path: "/plan",
});

/**
 * The front door to planning.
 *
 * It exists because the planner was the front door and should not have been:
 * it opens on an empty trip with eleven buttons, and somebody who has decided
 * they would like to go away this summer does not know which to press. The
 * three steps here are the ones a person actually answers first, and both
 * paths out of them arrive somewhere with the answers already filled in.
 *
 * THREE SHORT STEPS, NOT THREE QUESTIONS. Step two holds four fields, so
 * calling the whole thing "three questions" was a promise the page below did
 * not keep — and the counter under it said so out loud, in as many words.
 * Pace, interests, kashrus, Shabbos and access needs are asked afterwards, in
 * an optional section. See lib/trip-plan.ts.
 */
export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string; kind?: string }>;
}) {
  const { destination: slug, kind } = await searchParams;
  // "Add Rome to a trip" from a destination card. The slug is looked up rather
  // than printed, so a made-up query string cannot put arbitrary text into the
  // field as though the visitor had typed it.
  const destination = slug ? getVacationDestination(slug) : undefined;
  const initialKind = (TRIP_KINDS.find((entry) => entry.value === kind)?.value ?? "") as TripKind | "";

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Start a trip</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.08] text-[var(--navy)]">
            {destination ? `Let’s plan ${destination.name}.` : "Tell us roughly what you have in mind."}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            Three short steps. Nothing is required, every question can be skipped, and
            &ldquo;I don&rsquo;t know yet&rdquo; is a real answer — you can start here without having chosen a
            destination at all.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-500">
            Your answers stay in this browser until you choose to send them.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <TripStartFlow initialDestination={destination?.name ?? ""} initialKind={initialKind} />
      </section>

      {/* The other three doors, for somebody who opened this one and would
          rather browse, build it themselves, or hand it over.
          lib/starting-points.ts. */}
      <section className="mx-auto max-w-5xl px-5 pb-12 sm:px-8">
        <StartingPoints omit={["/plan"]} heading="Or start somewhere else" />
      </section>

      <section className="border-t border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-12 sm:px-8 sm:py-14">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-5">
          <p className="max-w-xl leading-7 text-stone-600">
            You can look at somewhere first and answer these afterwards.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/destinations"
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
            >
              Browse vacation ideas
            </Link>
            <Link
              href="/heritage"
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--surface)]"
            >
              Planning a heritage journey
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
