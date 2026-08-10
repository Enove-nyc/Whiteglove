import BookingLink, { AffiliateDisclosure } from "@/components/BookingLink";
import { readAffiliateConfig } from "@/lib/affiliate/config";
import { resolveLink, type TravelProduct } from "@/lib/affiliate/partners";
import { readDestinationPlacements } from "@/lib/growth-settings-store";
import { staySearchHref } from "@/lib/stay-search";
import Link from "next/link";

/**
 * Tasteful booking hand-offs on a destination page.
 *
 * Only categories with a resolvable partner link (or our own stay search) are
 * shown. No generic banner row of empty promises — if transfers/insurance are
 * not connected, they simply do not appear. Travel Essentials (insurance,
 * eSIM, transfers, tours) is a separate section when those programmes are live.
 */

type Option = {
  product: TravelProduct;
  title: string;
  body: string;
  label: string;
  placement: string;
};

const OPTIONS: Option[] = [
  {
    product: "hotel",
    title: "Where to stay",
    body: "Search rooms near the quarters and walks that matter for this trip.",
    label: "Search places to stay",
    placement: "destination-booking-hotel",
  },
  {
    product: "flight",
    title: "Flights",
    body: "Open a flight search with our booking partner. Airport codes are chosen on the next step.",
    label: "Search flights",
    placement: "destination-booking-flight",
  },
  {
    product: "car",
    title: "Cars and transfers",
    body: "Car hire for the days between stops — useful when trains do not cover the route.",
    label: "Search cars",
    placement: "destination-booking-car",
  },
];

export default async function DestinationBookingOptions({
  destinationName,
  destinationSlug,
}: {
  destinationName: string;
  destinationSlug: string;
}) {
  const [config, placements] = await Promise.all([readAffiliateConfig(), readDestinationPlacements()]);
  if (!placements.sectionEnabled) return null;

  const page = `/destinations/${destinationSlug}`;

  const live = OPTIONS.filter((option) => {
    if (!placements.enabledProducts.includes(option.product)) return false;
    if (option.product === "hotel") {
      // On-site stay search always works; affiliate /go is additive.
      return true;
    }
    return Boolean(
      resolveLink(
        {
          product: option.product,
          destination: destinationName,
          destinationSlug,
          page,
          placement: option.placement,
        },
        config,
      ),
    );
  });

  if (live.length === 0) return null;

  return (
    <section
      id="book-this-trip"
      className="border-t border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-16"
      aria-labelledby="book-this-trip-heading"
    >
      <div className="mx-auto max-w-7xl">
        <h2 id="book-this-trip-heading" className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
          Book the practical pieces
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Searches for {destinationName} open with booking partners. Only options we can actually hand off are listed
          here.
        </p>
        <AffiliateDisclosure className="mt-3 max-w-2xl text-xs leading-5 text-stone-500" />

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {live.map((option) => (
            <li key={option.product} className="flex flex-col border-t border-[var(--gold-light)] pt-5">
              <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">{option.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-stone-600">{option.body}</p>
              <div className="mt-5">
                {option.product === "hotel" ? (
                  <span className="inline-flex flex-col items-start gap-1.5">
                    <Link
                      href={staySearchHref({ destination: destinationName })}
                      className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
                    >
                      {option.label}
                    </Link>
                    <BookingLink
                      request={{
                        product: "hotel",
                        destination: destinationName,
                        destinationSlug,
                        page,
                        placement: option.placement,
                      }}
                      label="Or search with a booking partner"
                      variant="quiet"
                      showDisclosure={false}
                    />
                  </span>
                ) : (
                  <BookingLink
                    request={{
                      product: option.product,
                      destination: destinationName,
                      destinationSlug,
                      page,
                      placement: option.placement,
                    }}
                    label={option.label}
                    variant="secondary"
                    showDisclosure={false}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
