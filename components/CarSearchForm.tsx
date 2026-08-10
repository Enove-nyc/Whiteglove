"use client";

import { useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import DateField from "@/components/DateField";
import { correctedEnd, earliestEnd } from "@/lib/date-range";

/**
 * The car-hire search, with the site's own calendar and a city to pick from.
 *
 * WHAT WAS WRONG. /cars used the plain server-rendered PartnerSearchForm: a
 * bare text box for the pick-up and two `input type="date"`. The browser draws
 * its own white box and its own calendar for those, which is why the dates
 * here looked like they came from a different site than the ones on /book —
 * and why there was no list of cities to choose from, only somewhere to type.
 * Both are the controls the rest of the site already had; this page had never
 * been given them.
 *
 * SO THIS IS A CLIENT FORM, and that is a real trade against
 * PartnerSearchForm's no-JavaScript rule rather than an oversight. The reason
 * it is worth it here and not there: the pick-up is a place, and a place
 * somebody types by hand is the field that most often sends a search to the
 * wrong country. The autocomplete is the difference between "Nice" the city
 * and "nice" the adjective. The form is still a GET to /go with the same field
 * names, so what it submits is identical to what the plain form submitted.
 *
 * DATES ARE NOT REQUIRED, because whether they are used at all depends on the
 * partner. EconomyBookings' documented link format has no date fields — the
 * traveller picks them there — while Kayak needs both. `datesReach` says which
 * is true today so the form can be honest about it instead of collecting two
 * dates and silently dropping them.
 */

const label = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-600";
const shell =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-base text-[var(--navy)] shadow-sm focus-within:border-[var(--gold)] sm:text-sm";

export default function CarSearchForm({
  id,
  page,
  placement,
  submitLabel,
  destinationValue = "",
  datesReach,
}: {
  id: string;
  page: string;
  placement: string;
  submitLabel: string;
  destinationValue?: string;
  /**
   * Whether the partner this search opens can carry the dates. False for
   * EconomyBookings, whose link format has nowhere to put them.
   */
  datesReach: boolean;
}) {
  const [where, setWhere] = useState(destinationValue);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");

  return (
    <form
      action="/go"
      method="get"
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-5 sm:p-6"
    >
      <input type="hidden" name="product" value="car" />
      <input type="hidden" name="page" value={page} />
      <input type="hidden" name="placement" value={placement} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="block lg:col-span-2">
          <span className={label} id={`${id}-where-label`}>
            Picking up in
          </span>
          {/* mode="city": a car is collected in a town or at an airport, not
              at a street address. `name` makes it submit inside a plain form. */}
          <AddressAutocomplete
            name="destination"
            mode="city"
            required
            value={where}
            onChange={(next) => setWhere(next)}
            placeholder="A city, or an airport code"
            className={shell}
          />
        </div>

        <label className="block" htmlFor={`${id}-pickup`}>
          <span className={label}>Pick-up date</span>
          <DateField
            id={`${id}-pickup`}
            name="in"
            ariaLabel="Pick-up date"
            value={pickup}
            onChange={(next) => {
              setPickup(next);
              // Keep the return from falling behind the pick-up, the same way
              // the planner does rather than a second rule invented here.
              setDropoff((current) => correctedEnd(next, current));
            }}
            className={shell}
          />
        </label>

        <label className="block" htmlFor={`${id}-dropoff`}>
          <span className={label}>Drop-off date</span>
          <DateField
            id={`${id}-dropoff`}
            name="out"
            ariaLabel="Drop-off date"
            value={dropoff}
            min={earliestEnd(pickup)}
            onChange={(next) => setDropoff(correctedEnd(pickup, next))}
            className={shell}
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
        >
          {submitLabel}
        </button>
        <p className="text-xs leading-5 text-stone-500">
          Opens in a new tab.
          {/* Said here rather than discovered on arrival. Collecting two dates
              and not passing them on would be the quieter option and the
              worse one. */}
          {!datesReach && " Dates are chosen on the booking partner's own site."}
        </p>
      </div>
    </form>
  );
}
