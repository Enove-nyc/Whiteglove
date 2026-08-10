import Link from "next/link";
import GloveMark from "@/components/GloveMark";
import { PRICE_NOT_PUBLISHED, type SiteWords } from "@/data/site-words";

/**
 * The six questions a services page is asked about price.
 *
 * WHAT WAS THERE BEFORE. Every service said "quoted once we understand the
 * trip", and nothing else. That sentence is true, and it is also exactly what a
 * site with something to hide says — a person deciding whether to write in
 * cannot tell the two apart, so they read it as the second one.
 *
 * The six below are what they actually want to know: roughly what it costs,
 * what moves that number, how long until they hear back, whether changing the
 * plan costs extra, whether booking is a separate bill, and whether a planning
 * fee comes off anything.
 *
 * THREE OF THEM SAY "NOT PUBLISHED YET", AND THAT IS THE POINT. There is no
 * price list on this site to stand behind, and inventing a figure, a turnaround
 * or a credit policy would be the single worst thing to do on a site whose
 * whole argument is that what it prints has been checked. A gap that names
 * itself is worth more than a silence and far more than a plausible number: the
 * visitor knows the question is a fair one to ask, and knows they will get an
 * answer before any work starts.
 *
 * They are marked, visibly, so nobody mistakes an outstanding line for an
 * answer — and so the owner can see at a glance which of his own settings are
 * still unanswered. Every one is an editable line at /admin/settings/words; the
 * moment he answers one it stops matching PRICE_NOT_PUBLISHED and renders as an
 * ordinary answer.
 */

/**
 * Each question with its answer read out by name.
 *
 * Named accessors rather than a list of key strings, deliberately: the rule in
 * tests/site-words.test.ts is that every editable line must be READ somewhere
 * in app/ or components/, and it finds `words.pricingStartsAt` rather than a
 * dynamic lookup. A settings screen with a field on it that no page shows is
 * the exact failure data/site-words.ts exists to end, and a loop over string
 * keys would have hidden six of them from the check that catches it.
 */
function questionsFrom(words: SiteWords): Array<{ id: string; question: string; answer: string }> {
  return [
    { id: "starts-at", question: "What does it cost?", answer: words.pricingStartsAt },
    { id: "what-affects", question: "What moves the number?", answer: words.pricingWhatAffects },
    { id: "turnaround", question: "How long until I hear back?", answer: words.pricingTurnaround },
    { id: "revisions", question: "Do changes cost extra?", answer: words.pricingRevisions },
    { id: "booking", question: "Is booking a separate charge?", answer: words.pricingBookingSupport },
    { id: "fee-credit", question: "Does a planning fee come off anything?", answer: words.pricingFeeCredit },
  ];
}

export default function ServicePricing({ words }: { words: SiteWords }) {
  const questions = questionsFrom(words);
  const outstanding = questions.filter((entry) => entry.answer === PRICE_NOT_PUBLISHED).length;

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
        {outstanding > 0 && " Some of it depends on the trip, and we will answer those once we know what it is."}
      </p>

      <dl className="mt-8 grid gap-x-10 gap-y-6 lg:grid-cols-2">
        {questions.map(({ id, question, answer }) => {
          const unanswered = answer === PRICE_NOT_PUBLISHED;
          return (
            <div key={id} className="border-t border-[var(--gold-light)] pt-4">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">{question}</dt>
              <dd className={`mt-2 leading-7 ${unanswered ? "text-stone-500" : "text-stone-600"}`}>
                {unanswered && (
                  // A word, not only a colour: this is the one distinction on
                  // the panel that changes what the sentence means.
                  <span className="mr-2 inline-flex items-center rounded-md border border-stone-400 bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-stone-700">
                    Depends on the trip
                  </span>
                )}
                {unanswered ? "Ask when you write in, and we will tell you before any work starts." : answer}
              </dd>
            </div>
          );
        })}
      </dl>

      <p className="mt-8 text-sm leading-6 text-stone-600">
        Want to see what the planning actually produces before asking what it costs?{" "}
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
