import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SectionHeading from "@/components/SectionHeading";
import VerificationBadge from "@/components/VerificationBadge";
import { pageMetadata } from "@/lib/seo";
import { TRUST_LEVELS, TRUST_ORDER } from "@/lib/trust-status";

export const metadata = pageMetadata({
  title: "How we check what is on this site | White Glove Itineraries",
  description:
    "Verified, Reported, Being checked, Reconfirm before travel — what each label means, how we check, and what we will not print.",
  path: "/verification",
});

/**
 * What the four labels mean.
 *
 * A badge that says "Reported" and explains itself nowhere is decoration. This
 * is the page every badge on the site links to, and it is written for somebody
 * deciding whether to drive four hours on the strength of a line on a page.
 *
 * It also says what we do not publish, which is the part that makes the rest
 * believable: a site that only ever tells you what it knows has no way to
 * prove it is not guessing.
 */

const WHAT_WE_DO_NOT_PRINT: Array<[string, string]> = [
  [
    "Opening hours and prices",
    "They change by season and by year. A stale hour sends a family across a city to a locked door on erev Shabbos, so every listing links to the place's own page instead — that is where the current answer lives.",
  ],
  [
    "A kashrus claim we have not been given",
    "Whether somewhere is kosher is the certifying body's statement, not ours. We record what the source says, name the source, and say how far it has been checked. Nothing researched from a directory is ever published as certified.",
  ],
  [
    "A coordinate nobody has stood at",
    "A pin that opens the nearest street rather than the gate is worse than no pin, because it looks like an answer. Where we do not have the exact location, the page says so.",
  ],
  [
    "Invented anything",
    "No sample testimonials, no placeholder destinations, no illustrative prices, no capabilities we do not have. If a section is empty on this site, it is empty because the work is not done.",
  ],
];

const HOW_WE_CHECK: Array<[string, string]> = [
  [
    "Against the place itself",
    "A phone call, an email, or the establishment's own published page. This is what moves something to Verified, and the date it happened is printed beside it.",
  ],
  [
    "Against the body that certifies it",
    "For kosher food, the certifying agency's own current list rather than a third-party directory that copied it some years ago.",
  ],
  [
    "Against travelers who were there",
    "Corrections sent in through the site are read before anything changes. A correction on its own makes something Reported; it is Verified once we have confirmed it ourselves.",
  ],
  [
    "Against the road",
    "Driving times between stops come from real road routing rather than straight-line distance, so a day's plan holds up.",
  ],
];

export default function VerificationPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">How we check</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.08] text-[var(--navy)]">
            What each label on this site means.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            People plan real journeys on this. So every practical detail carries one of four labels saying how far it has
            been checked — and where we have not finished checking, the page says that instead of filling the gap.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <SectionHeading
          eyebrow="The four labels"
          title="Verified, Reported, Being checked, Reconfirm before travel."
          description="They mean the same thing on a hotel, a kever, a restaurant and a destination page. Each label below is the badge you will see, at the size you will see it."
        />

        <dl className="mt-12 grid gap-5 md:grid-cols-2">
          {TRUST_ORDER.map((level) => {
            const descriptor = TRUST_LEVELS[level];
            return (
              <div
                key={level}
                id={level}
                className="wg-card scroll-mt-28 border border-[var(--gold-light)] bg-[var(--surface)] p-6"
              >
                <dt>
                  <VerificationBadge descriptor={descriptor} explain={false} />
                  <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                    {descriptor.label}
                  </h2>
                </dt>
                <dd className="mt-3 leading-7 text-stone-600">
                  {descriptor.meaning}
                  {descriptor.action && (
                    <span className="mt-3 block border-l-2 border-[var(--gold)] pl-4 text-sm font-semibold text-[var(--navy)]">
                      {descriptor.action}
                    </span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>

        <p className="mt-8 max-w-3xl rounded-lg border-l-4 border-[var(--gold)] bg-[#fcfaf6] px-5 py-4 text-sm leading-7 text-stone-700">
          <span className="font-semibold text-[var(--navy)]">Reconfirm before travel is not a weaker Verified.</span> A
          verified phone number and a reconfirm-before-travel phone number are the same number. The second is telling
          you what to do with it in four months&apos; time — because the shomer&apos;s number, the seasonal kosher
          programme and the arrangement to be let in are the three things that change without anybody announcing it.
        </p>
      </section>

      <section className="border-y border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="Our method" title="What checking actually means here." />
          <div className="mt-12 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {HOW_WE_CHECK.map(([title, body]) => (
              <div key={title} className="border-t border-[var(--gold-light)] pt-6">
                <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{title}</h3>
                <p className="mt-2 leading-7 text-stone-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <SectionHeading
          eyebrow="What we leave out"
          title="The things we will not print."
          description="A site that only ever tells you what it knows gives you no way to judge whether it is guessing."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {WHAT_WE_DO_NOT_PRINT.map(([title, body]) => (
            <article key={title} className="wg-card border border-[var(--gold-light)] bg-[var(--surface)] p-6">
              <h3 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">{title}</h3>
              <p className="mt-3 leading-7 text-stone-600">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/submit"
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
          >
            Send us a correction
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
          >
            Ask us about a specific detail
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
