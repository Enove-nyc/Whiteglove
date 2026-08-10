import Link from "next/link";
import GloveMark from "@/components/GloveMark";
import { services } from "@/data/services";
import { bookingCallToAction } from "@/lib/booking-access";
import { readBookingLink } from "@/lib/booking-access-store";

/**
 * The six services, each answering the same six questions.
 *
 * RENDERED FROM DATA rather than written as prose, so no service can quietly
 * skip the awkward one. The awkward one is price: a services page that says
 * what everything is and never mentions cost reads as a page with something to
 * hide, and "contact us for pricing" on its own is the same thing with more
 * words. Every entry here says what to expect, including where the answer is
 * "free", "paid to somebody else", or "not open yet".
 *
 * Each service is an <article> with a heading, and the six answers are a
 * definition list — so a screen reader hears "Who it is for", "What is
 * included", and not six unlabelled paragraphs.
 */

function Detail({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[var(--gold-light)] pt-4">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">{term}</dt>
      <dd className="mt-2 leading-7 text-stone-600">{children}</dd>
    </div>
  );
}

export default async function ServiceCatalog() {
  // Resolved once for the page. A service whose action is the self-service
  // search gets the button and the opening step from here, so neither can
  // promise a search that is currently behind an access code.
  const booking = await readBookingLink();
  const selfService = bookingCallToAction(booking);
  return (
    <div className="space-y-8">
      {services.map((service, index) => {
        const action = service.usesBookingSearch ? { label: selfService.label, href: booking.href } : service.action;
        const process = service.usesBookingSearch ? [selfService.blurb, ...service.process] : service.process;
        // Two buttons to the same page read as a mistake, and that is exactly
        // what happens to "Search flights" / "Ask a person to look instead"
        // when the search is closed and both resolve to the assistance page.
        const secondary = service.secondary?.href === action.href ? undefined : service.secondary;
        return (
        <article
          key={service.id}
          id={service.id}
          className="scroll-mt-28 rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6 shadow-[0_8px_28px_rgba(23,45,82,.055)] sm:p-9"
        >
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span aria-hidden="true" className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
              {service.title}
            </h2>
          </div>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-stone-600">{service.summary}</p>

          <dl className="mt-8 grid gap-x-10 gap-y-6 lg:grid-cols-2">
            <Detail term="Who it is for">{service.who}</Detail>

            <Detail term="What is included">
              <ul className="glove-list space-y-2">
                {service.included.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Detail>

            <Detail term="How it works">
              <ol className="space-y-3">
                {process.map((step, stepIndex) => (
                  <li key={step} className="flex gap-3">
                    <span aria-hidden="true" className="shrink-0 text-xs font-bold text-[var(--gold-ink)]">
                      {stepIndex + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Detail>

            <Detail term="What you end up with">
              <ul className="glove-list space-y-2">
                {service.receive.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Detail>

            <div className="border-t border-[var(--gold-light)] pt-4 lg:col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">What it costs</dt>
              <dd className="mt-2 flex gap-3 leading-7 text-stone-600">
                <GloveMark size="sm" className="mt-1" />
                <span>{service.pricing}</span>
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-[var(--gold-light)] pt-6">
            <Link
              href={action.href}
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
            >
              {action.label}
            </Link>
            {secondary && (
              <Link
                href={secondary.href}
                className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
              >
                {secondary.label}
              </Link>
            )}
          </div>
        </article>
        );
      })}
    </div>
  );
}

/** The six, as jump links. A page this long needs a way past it. */
export function ServiceContents() {
  return (
    <nav aria-label="Services on this page">
      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {services.map((service) => (
          <li key={service.id}>
            <a
              href={`#${service.id}`}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold-light)] underline-offset-4 hover:decoration-[var(--gold)]"
            >
              {service.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
