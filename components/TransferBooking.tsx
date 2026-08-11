import { AffiliateDisclosure } from "@/components/BookingLink";
import { readAffiliateConfig } from "@/lib/affiliate/config";
import { essentialsForContext } from "@/lib/travel-essentials";
import { readTravelEssentials } from "@/lib/travel-essentials-store";

/**
 * The transfer hand-off, given the weight of a booking panel.
 *
 * WHY THIS IS NOT A SEARCH FORM, and the decision is the whole of this file.
 *
 * Hotels, flights and cars are searches: the visitor types a place and dates,
 * and those travel into the partner's own URL, so the tab they land on is
 * already their search. That works because the format is known — Stay22
 * publishes theirs, and the other two are pasted redirects with the traveller's
 * search swapped in (lib/travelpayouts.ts).
 *
 * Kiwitaxi publishes no such format. Travelpayouts deep links reach a route or
 * a country page — kiwitaxi.com/en/italy — and there is no documented
 * parameter for a pickup, a drop-off, a date or a passenger count. So a form
 * here could collect all four and carry none of them: the traveller would type
 * their airport, their hotel and their landing time, press the button, and
 * arrive at a page asking for all of it again. That is the exact failure
 * app/book/page.tsx refuses to ship — "a tab that takes somebody's dates and
 * gives them nothing" — and it is worse here, because the fields would look
 * like they worked.
 *
 * WHAT IT DOES INSTEAD. It is a panel rather than a card, because on this page
 * the hand-off is the point rather than an add-on. It says what the partner
 * will ask for, so nobody arrives cold and nobody types anything twice. And it
 * says who takes the booking before the button rather than after it.
 *
 * THE DAY KIWITAXI PUBLISHES A SEARCH FORMAT, or the owner pastes per-route
 * deep links, this becomes a real form and the note below comes out. Until
 * then the honest version is the short one.
 *
 * Renders nothing at all when the owner has not enabled and configured the
 * transfer card — same rule as every other hand-off on the site.
 */

/** What Kiwitaxi asks for on the other side. Named so nobody arrives cold. */
const WHAT_THEY_ASK: Array<[string, string]> = [
  ["Where from and where to", "The airport, and the address you are going to. A hotel name is usually enough."],
  ["Arrival date and flight number", "The flight matters — a driver who has it waits when you land late."],
  ["How many of you, and the luggage", "Say if there are children, so the seats are right when the car arrives."],
];

export default async function TransferBooking() {
  const [settings, affiliate] = await Promise.all([readTravelEssentials(), readAffiliateConfig()]);
  if (!settings.sectionEnabled) return null;

  const cards = essentialsForContext(settings, affiliate, {
    pageType: "transfers",
    page: "/transfers",
    placement: "transfers-panel",
  });
  const transfer = cards.find((card) => card.id === "transfer");
  if (!transfer) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 pt-10 sm:px-8" aria-labelledby="transfer-booking-heading">
      <div className="rounded-3xl border border-[var(--gold-light)] bg-[var(--surface)] p-6 shadow-[0_18px_45px_rgba(23,45,82,.07)] sm:p-8">
        <h2
          id="transfer-booking-heading"
          className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]"
        >
          Book an airport transfer
        </h2>
        <p className="mt-2 max-w-2xl leading-7 text-stone-600">{transfer.blurb}</p>

        <div className="mt-7 grid gap-5 md:grid-cols-3">
          {WHAT_THEY_ASK.map(([heading, body]) => (
            <div key={heading} className="border-t border-[var(--gold-light)] pt-4">
              <h3 className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">
                {heading}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <a
            href={transfer.href}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="inline-flex min-h-12 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-7 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
          >
            {transfer.cta}
          </a>
          {/* Said before the new tab opens, not after. The price, the vehicle
              and how payment is taken are the transfer company's, and the
              payment part is the one that matters most on a Friday. */}
          <p className="max-w-md text-sm leading-6 text-stone-600">
            Opens with our transfer partner, who takes the booking and sets the price, the vehicle and how payment
            is handled. Confirm those before you book.
          </p>
        </div>

        <AffiliateDisclosure className="mt-6 max-w-2xl text-xs leading-5 text-stone-500" />
      </div>
    </section>
  );
}
