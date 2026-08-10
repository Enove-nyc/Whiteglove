import Link from "next/link";
import GloveMark from "@/components/GloveMark";
import {
  PRICING_OUTSTANDING_NOTE,
  publicPricingView,
  type PricingQuestion,
  type SiteWords,
} from "@/data/site-words";

/**
 * What to expect about price — only real answers, never a grid of placeholders.
 *
 * Admin → Settings → Words still holds every individual field. Until the owner
 * fills one, it is not a public row. Unfinished commercial terms collapse into
 * one polished note rather than six “ask when you write in” badges.
 */

/**
 * Each question with its answer read out by name.
 *
 * Named accessors rather than a list of key strings, deliberately: the rule in
 * tests/site-words.test.ts is that every editable line must be READ somewhere
 * in app/ or components/, and it finds `words.pricingStartsAt` rather than a
 * dynamic lookup.
 */
function questionsFrom(words: SiteWords): PricingQuestion[] {
  return [
    { id: "starts-at", question: "The fee", answer: words.pricingStartsAt },
    { id: "what-affects", question: "What the fee depends on", answer: words.pricingWhatAffects },
    { id: "turnaround", question: "Time to a first reply", answer: words.pricingTurnaround },
    { id: "revisions", question: "Changes to a plan", answer: words.pricingRevisions },
    { id: "booking", question: "Booking", answer: words.pricingBookingSupport },
    { id: "fee-credit", question: "The fee against a booking", answer: words.pricingFeeCredit },
    { id: "timeline", question: "How long the planning takes", answer: words.pricingTimeline },
    { id: "cancellation", question: "If the trip is called off", answer: words.pricingCancellation },
    { id: "support", question: "After the itinerary is sent", answer: words.pricingSupportAfter },
  ];
}

export default function ServicePricing({ words }: { words: SiteWords }) {
  const { answered, outstandingCount, showOutstandingNote } = publicPricingView(questionsFrom(words));
  const onlyNote = answered.length === 0 && showOutstandingNote;

  return (
    <section id="pricing" className="scroll-mt-28 rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-9">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <GloveMark size="lg" />
        <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
          What to expect about price
        </h2>
      </div>
      <p className="mt-4 max-w-3xl leading-7 text-stone-600">
        You will be told what a piece of work costs before any of it starts.
        {outstandingCount > 0 && answered.length > 0
          ? " A few commercial terms are set out in your quote once we understand the trip."
          : null}
      </p>

      {answered.length > 0 && (
        <dl className="mt-8 grid gap-x-10 gap-y-6 lg:grid-cols-2">
          {answered.map(({ id, question, answer }) => (
            <div key={id} className="border-t border-[var(--gold-light)] pt-4">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">{question}</dt>
              <dd className="mt-2 leading-7 text-stone-600">{answer}</dd>
            </div>
          ))}
        </dl>
      )}

      {showOutstandingNote && (
        <p
          className={`max-w-3xl leading-7 text-stone-600 ${onlyNote ? "mt-8" : "mt-8 border-t border-[var(--gold-light)] pt-6"}`}
        >
          {PRICING_OUTSTANDING_NOTE}
        </p>
      )}

      <p className="mt-8 text-sm leading-6 text-stone-600">
        The sample itinerary shows what the planning actually produces.{" "}
        <Link
          href="/sample-itinerary"
          className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
        >
          Read a sample itinerary
        </Link>
        .
      </p>
    </section>
  );
}
