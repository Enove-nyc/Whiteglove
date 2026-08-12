import { AffiliateDisclosure } from "@/components/BookingLink";
import EssentialPartnerForm from "@/components/EssentialPartnerForm";
import { readAffiliateConfig } from "@/lib/affiliate/config";
import { essentialsForContext } from "@/lib/travel-essentials";
import { readTravelEssentials } from "@/lib/travel-essentials-store";

/**
 * The transfer hand-off, given the weight of a booking panel.
 *
 * Kiwitaxi (and similar) publish no search format for pickup, drop-off or
 * passenger count — inventing those parameters would look like a search and
 * drop every field. This panel still collects the airport/city and arrival
 * date so /go records them and Stay22 GetYourGuide-style wraps that CAN carry
 * a place do. The partner asks for the rest on their side.
 *
 * Renders nothing when the owner has not enabled and configured the transfer
 * card — same rule as every other hand-off on the site.
 */

/** What the partner still asks for on the other side. Named so nobody arrives cold. */
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

        <div className="mt-8 max-w-xl">
          <EssentialPartnerForm
            product={transfer.product}
            offer={transfer.offer}
            name={transfer.name}
            blurb="Enter the airport or city and the arrival date. The partner will ask for the address, flight number and party size."
            cta={transfer.cta}
            icon={transfer.icon}
            page="/transfers"
            placement="transfers-panel"
            compact
          />
        </div>

        <p className="mt-4 max-w-md text-sm leading-6 text-stone-600">
          Opens with our transfer partner, who takes the booking and sets the price, the vehicle and how payment is
          handled. Confirm those before you book.
        </p>

        <AffiliateDisclosure className="mt-6 max-w-2xl text-xs leading-5 text-stone-500" />
      </div>
    </section>
  );
}
