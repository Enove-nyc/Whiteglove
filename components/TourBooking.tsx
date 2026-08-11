import { AffiliateDisclosure } from "@/components/BookingLink";
import { readAffiliateConfig } from "@/lib/affiliate/config";
import { essentialIsBookable } from "@/lib/travel-essentials";
import { readTravelEssentials } from "@/lib/travel-essentials-store";
import { readStay22Link, TOURS_DESK } from "@/lib/stay22";
import { vacationDestinations } from "@/data/vacation-destinations";

/**
 * Tickets and guided visits, as a search rather than a link.
 *
 * WHAT WAS WRONG WITH THE CARD IT REPLACES. The tours hand-off opened whatever
 * the owner had pasted, so a visitor who had spent five minutes reading about
 * Kraków arrived at the same GetYourGuide front page as one who had been
 * reading about Rome, and had to type the city again. The site knew where they
 * were — that is what the page they came from is about — and threw it away.
 *
 * SO THIS IS A REAL SEARCH, and it is the same mechanism the flight and car
 * searches use: Stay22's `link=` slot takes a URL this site builds, which is
 * why the traveller's own place survives the hand-off. lib/stay22.ts.
 *
 * A SELECT RATHER THAN A TEXT BOX, deliberately. The list is the destinations
 * this site actually holds, so every option leads somewhere the site can also
 * tell you about, and there is no misspelt city that returns nothing. Somebody
 * looking for a place not on the list is better served by the directory above
 * than by a search that comes back empty.
 *
 * IT RENDERS NOTHING unless the owner has the tours hand-off enabled AND the
 * pasted link is a Stay22 GetYourGuide desk. With a Travelpayouts link or a
 * plain partner URL there is no slot to put a search in, so the ordinary card
 * — which still works and still earns — is the right thing to show instead.
 */
export default async function TourBooking() {
  const [settings, affiliate] = await Promise.all([readTravelEssentials(), readAffiliateConfig()]);
  if (!essentialIsBookable("activity", settings)) return null;

  // Only a Stay22 tours desk has somewhere to put a search. Anything else keeps
  // the plain card, rather than a form whose city goes nowhere.
  const pasted = affiliate.essentialsLandings?.activity?.url ?? "";
  const link = readStay22Link(pasted);
  if (!link || link.desk !== TOURS_DESK) return null;

  const places = [...vacationDestinations].sort((a, b) => a.name.localeCompare(b.name));
  if (places.length === 0) return null;

  return (
    <section
      className="border-t border-[var(--gold-light)] bg-[#fcfaf6] px-5 py-14 sm:px-8 sm:py-16"
      aria-labelledby="tour-booking-heading"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="tour-booking-heading"
          className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]"
        >
          Tickets and guided visits
        </h2>
        <p className="mt-2 max-w-2xl leading-7 text-stone-600">
          For the places above that need booking ahead. Pick where you are going and the search opens on that city.
        </p>

        {/* A plain GET form to /go, like every other search on the site: it
            works before hydration, on a slow phone, and with scripts blocked.
            This is the money path; it should be the least fragile thing here. */}
        <form
          action="/go"
          method="get"
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="mt-8 rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-5 sm:p-6"
        >
          <input type="hidden" name="product" value="activity" />
          <input type="hidden" name="page" value="/things-to-do" />
          <input type="hidden" name="placement" value="things-to-do-search" />

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block" htmlFor="tour-destination">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-600">Where are you going</span>
              <select
                id="tour-destination"
                name="destination"
                defaultValue=""
                className="mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]"
              >
                {/* An empty value is a real answer: it opens the partner's own
                    page rather than a search for nowhere. */}
                <option value="">Anywhere — browse everything</option>
                {places.map((place) => (
                  <option key={place.slug} value={place.name}>
                    {place.name}, {place.country}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-7 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
            >
              Find tours and tickets
            </button>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
            Opens with our tours partner, who takes the booking and sets the price, the times and the terms. Check what
            a place does on Shabbos above before you book a date.
          </p>
          <AffiliateDisclosure className="mt-4 max-w-2xl text-xs leading-5 text-stone-500" />
        </form>
      </div>
    </section>
  );
}
