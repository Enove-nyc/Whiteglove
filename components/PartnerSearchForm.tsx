import { AffiliateDisclosure } from "@/components/BookingLink";
import { readAffiliateConfig } from "@/lib/affiliate/config";
import { routeFor, type TravelProduct } from "@/lib/affiliate/partners";

/**
 * A search that hands off to a partner, as a plain HTML form.
 *
 * NO JAVASCRIPT, AND THAT IS THE DESIGN RATHER THAN A LIMITATION. /go is a GET
 * (lib/affiliate/request.ts), so the browser can build the query string itself
 * from named inputs. What that buys, in order of how much it matters:
 *
 *   • It works before hydration, on a slow phone, and with scripts blocked.
 *     This is the money path on the site; it should be the least fragile thing
 *     on it, not the most.
 *   • Keyboard and screen-reader behaviour is the browser's own. Enter
 *     submits, the date pickers are native, validation messages are the ones
 *     the user's own browser speaks.
 *   • The partner address still never appears in the markup: the form posts to
 *     /go, which resolves and records before redirecting.
 *
 * REQUIRED FIELDS ARE ALLOWED HERE, unlike in the planning flow where a single
 * one would turn away the visitor the whole thing exists for. The difference is
 * real: a hotel search with no dates is not a search, and the browser refusing
 * it is kinder than a partner page opening on the wrong month.
 *
 * NOT RENDERED AT ALL when there is no programme behind the product. A search
 * form for something this site cannot search is worse than no form: it takes
 * somebody's dates and gives them nothing.
 */

const field =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const label = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-600";

export type SearchFieldSet = "stay" | "journey";

export default async function PartnerSearchForm({
  product,
  fields,
  page,
  placement,
  submitLabel,
  destinationLabel = "Where to",
  destinationValue = "",
  destinationSlug = "",
  prefill,
  id,
}: {
  product: TravelProduct;
  /** "stay" asks where and when; "journey" asks from, to and when. */
  fields: SearchFieldSet;
  /** The page this sits on, for the click record. */
  page: string;
  placement: string;
  submitLabel: string;
  destinationLabel?: string;
  /** Filled in when a destination page owns this form. */
  destinationValue?: string;
  destinationSlug?: string;
  /**
   * What the visitor already typed, carried across.
   *
   * A search made on the front page and answered on /hotels must not ask for
   * the dates a second time on the way to the partner. Re-typing is where a
   * hand-off is abandoned, and a partner opened on the wrong month is worse
   * than one opened on none.
   */
  prefill?: {
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
    rooms?: number;
  };
  id: string;
}) {
  const route = routeFor(product, await readAffiliateConfig());
  // No programme, no form. The admin says which products are connected.
  if (!route.destinationLabel) return null;

  return (
    // data-search-memory: see components/SearchMemory.tsx. Empty fields only,
    // and never a date that has passed.
    <form
      action="/go"
      method="get"
      data-search-memory=""
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-5 sm:p-6"
    >
      {/* Everything the click record needs that the visitor does not type. */}
      <input type="hidden" name="product" value={product} />
      <input type="hidden" name="page" value={page} />
      <input type="hidden" name="placement" value={placement} />
      {destinationSlug && <input type="hidden" name="slug" value={destinationSlug} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fields === "stay" ? (
          <label className="block lg:col-span-2" htmlFor={`${id}-destination`}>
            <span className={label}>{destinationLabel}</span>
            <input
              id={`${id}-destination`}
              name="destination"
              required
              defaultValue={destinationValue}
              placeholder="A city or a town"
              className={field}
            />
          </label>
        ) : (
          <>
            <label className="block" htmlFor={`${id}-from`}>
              <span className={label}>Flying from</span>
              <input id={`${id}-from`} name="from" required placeholder="Airport code, e.g. JFK" className={field} />
            </label>
            <label className="block" htmlFor={`${id}-to`}>
              <span className={label}>Flying to</span>
              <input
                id={`${id}-to`}
                name="to"
                required
                defaultValue={destinationValue}
                placeholder="Airport code, e.g. FCO"
                className={field}
              />
            </label>
          </>
        )}

        <label className="block" htmlFor={`${id}-in`}>
          <span className={label}>{fields === "stay" ? "Check in" : "Leaving"}</span>
          <input
            id={`${id}-in`}
            name="in"
            type="date"
            required
            defaultValue={prefill?.checkIn ?? ""}
            className={field}
          />
        </label>
        <label className="block" htmlFor={`${id}-out`}>
          <span className={label}>{fields === "stay" ? "Check out" : "Coming back"}</span>
          {/* Optional on a journey: a one-way flight is a real search, and the
              registry builds one when this is empty. */}
          <input
            id={`${id}-out`}
            name="out"
            type="date"
            required={fields === "stay"}
            defaultValue={prefill?.checkOut ?? ""}
            className={field}
          />
        </label>

        <label className="block" htmlFor={`${id}-adults`}>
          <span className={label}>Adults</span>
          <input
            id={`${id}-adults`}
            name="adults"
            type="number"
            min={1}
            max={30}
            defaultValue={prefill?.adults ?? 2}
            inputMode="numeric"
            className={field}
          />
        </label>
        {product === "hotel" && (
          <>
            <label className="block" htmlFor={`${id}-children`}>
              <span className={label}>Children</span>
              <input
                id={`${id}-children`}
                name="children"
                type="number"
                min={0}
                max={30}
                defaultValue={prefill?.children ?? 0}
                inputMode="numeric"
                className={field}
              />
            </label>
            <label className="block" htmlFor={`${id}-rooms`}>
              <span className={label}>Rooms</span>
              <input
                id={`${id}-rooms`}
                name="rooms"
                type="number"
                min={1}
                max={10}
                defaultValue={prefill?.rooms ?? 1}
                inputMode="numeric"
                className={field}
              />
            </label>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="submit"
          className="inline-flex min-h-12 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-7 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
        >
          {submitLabel}
        </button>
        {/* The warning stays, the name does not — see hotelButtonLabel in
            lib/stay22.ts for why. A new tab opening unannounced is a problem
            whoever it belongs to; which network settles the commission is the
            site's own business. */}
        <p className="text-xs leading-5 text-stone-500">Opens in a new tab.</p>
      </div>

      <AffiliateDisclosure className="mt-4 text-xs leading-5 text-stone-500" />
    </form>
  );
}
