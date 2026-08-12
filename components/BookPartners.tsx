"use client";

import { useEffect, useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import { airportCode } from "@/lib/kayak-search";
import { hotelButtonLabel } from "@/lib/stay22";
import DateField from "@/components/DateField";
import type { AffiliateRequest } from "@/lib/affiliate/partners";
import { goHref } from "@/lib/affiliate/request";
import { useFocusTrap } from "@/components/useFocusTrap";
import { useSaveAuth } from "@/components/SaveAuthProvider";
import type { ItinActivity, ItinFlight, ItinLodging } from "@/data/itinerary";
import { correctedEnd, earliestEnd, nextDay, notBefore, today } from "@/lib/date-range";
import { PartnerResultsPanel, moneyLabel, type PartnerResultRow } from "@/components/PartnerResultsPanel";
import PartnerSearchWidget from "@/components/PartnerSearchWidget";
import { carsEmbedPath, flightsEmbedPath } from "@/lib/partner-widget-paths";
import type { PartnerLiveCapabilities } from "@/lib/partner-live";

// Unified "Book" experience. The traveler makes two choices, in order:
//   1. how they're paying — cash or miles/points;
//   2. what they're booking — flights, hotels or cars.
// Cash hands off to a partner that takes payment (affiliate-ready deep links).
// Miles can't be handed off the same way: award seats and award nights come
// out of the traveler's own loyalty account, so nobody but them can complete
// the booking. There we help them find the award and check it's worth the
// points, then send them to their own program.
// After a cash partner handoff, a prompt asks them to save what they booked.

type Pay = "cash" | "miles";
type Kind = "flights" | "hotels" | "cars";

// The search panel is laid out the way booking sites lay one out: fields sit
// shoulder to shoulder inside a single bordered block, divided by hairlines,
// rather than floating as separate boxes with gaps between them. The hairlines
// come from a 1px grid gap over a gold background, so they stay perfectly even
// however the grid wraps.
const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-[var(--gold-light)] bg-white px-4 py-3 text-base text-[var(--navy)] shadow-[0_3px_10px_rgba(23,45,82,.04)] outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[rgba(170,139,82,.12)]";
const caption = "text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]";
const fieldLabel = "text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500";
/**
 * The field inside the panel, and why it has a height of its own.
 *
 * IT WAS 24 PIXELS TALL ON A PHONE — the height of one line of 15px text, with
 * the padding belonging to the label around it rather than to the control. The
 * label is what a tap lands on, so the form worked; what it cost was the thumb
 * accuracy every other control on this site is built for (min-h-11 is 44px, the
 * number in both the WCAG target-size rule and Apple's guidance), and a date or
 * a number input is exactly where a miss is expensive. The cell's own padding
 * comes down by the same amount the control goes up, so the panel is barely
 * taller than it was.
 */
const bareInput = "mt-1 min-h-11 w-full min-w-0 border-0 bg-transparent p-0 text-[15px] font-normal normal-case tracking-normal text-[var(--navy)] outline-none placeholder:text-stone-400";

function SearchGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  // overflow-visible so airport, address and date pickers can open below the
  // grid — overflow-hidden was clipping them and made every dropdown look dead.
  return <div className={`grid gap-px overflow-visible rounded-2xl border border-[var(--gold-light)] bg-[var(--gold-light)] shadow-[0_8px_24px_rgba(23,45,82,.06)] ${className}`}>{children}</div>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col justify-center bg-[#fcfaf6] px-4 py-2.5 transition focus-within:bg-white sm:py-3 ${className}`}>
      <span className={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`);

/**
 * Hand the traveller off, by asking /go for the partner rather than knowing one.
 *
 * THIS PAGE USED TO BUILD THE PARTNER URL ITSELF, which meant the page had to
 * be handed the money to build it with: the Stay22 ID, the Travelpayouts
 * marker, the Booking.com affiliate ID and the pasted redirect links. A client
 * component's props are serialised into the page, so every one of those was
 * readable in view-source by anybody who pressed Ctrl-U. Measured on the built
 * page before this changed, not assumed.
 *
 * Now it sends what the traveller typed to /go, which resolves the partner on
 * the server, records the click and redirects. Same door out as the rest of
 * the site — the reason for one door is still the months of car hire that went
 * out untagged while the settings screen said otherwise — and the account
 * numbers stay on the server where they belong.
 *
 * The new tab is opened synchronously with the press. Building the address
 * first and opening after an await would be the same thing to read and a popup
 * blocker to the browser, because the window would no longer be opening in
 * response to a click.
 */
function openPartner(request: AffiliateRequest) {
  if (typeof window === "undefined") return;
  window.open(goHref({ ...request, page: "/book" }), "_blank", "noopener,noreferrer");
}

/** What a form would put on the trip, once we know it was actually booked. */
export type PendingBooking = {
  kind: "flight" | "hotel" | "car";
  /** A line the traveler will recognise: "JFK → KRK, 11 Aug". */
  summary: string;
  /** Puts it on the trip, with the reference they were given. */
  save: (confirmation: string) => void;
};

/**
 * EVERY SEARCH ON THIS PAGE HANDS OFF TO A PARTNER. Nothing is booked here.
 *
 * There used to be a third option: Duffel, searching and booking in the site,
 * taking a card and issuing a ticket. That is a different business from being
 * paid to send somebody to a partner — it creates an obligation to the
 * traveler that a referral link does not — and it now lives at /admin/duffel,
 * off the public site entirely. lib/booking-partners.ts cannot route the
 * public site to it at all.
 */
export default function BookPartners({
  prefill,
  initialKind = "hotels",
}: {
  prefill?: Prefill;
  /**
   * Which tab opens. HOTELS BY DEFAULT, not flights: accommodation is the one
   * product this site knows something a comparison site does not — which
   * quarter makes Shabbos walkable, what is within a walk of it — so it is the
   * tab that earns the visit. Flights and cars are the same search anybody can
   * run anywhere.
   *
   * The page resolves `?type=` and hands it in, rather than this component
   * reading the URL in an effect after mount. It used to do the latter, which
   * meant a link to the car search painted Hotels first and swapped a frame
   * later — visible, and wrong for the whole of that frame. It matters more now
   * that /cars is this tab rather than a page.
   */
  initialKind?: Kind;
}) {
  const [pay, setPay] = useState<Pay>("cash");
  const [kind, setKind] = useState<Kind>(initialKind);
  const [pending, setPending] = useState<PendingBooking | null>(null);
  const { requireSave } = useSaveAuth();
  const [live, setLive] = useState<PartnerLiveCapabilities>({ hotels: false, flights: false, cars: false });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/partners/capabilities")
      .then((r) => r.json())
      .then((data: PartnerLiveCapabilities) => {
        if (!cancelled && data && typeof data === "object") {
          setLive({
            hotels: Boolean(data.hotels),
            flights: Boolean(data.flights),
            cars: Boolean(data.cars),
          });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function addToTrip(patch: { flights?: ItinFlight[]; lodging?: ItinLodging[]; activities?: ItinActivity[]; dates?: string[] }) {
    const successName =
      patch.flights?.[0] ? `${patch.flights[0].from} → ${patch.flights[0].to}` : patch.lodging?.[0]?.name || patch.activities?.[0]?.name;
    requireSave({ type: "merge-trip-patch", patch, successName });
  }

  // Whether the tab you are looking at searches here or hands off to a
  // partner. Both the note beside the toggle and the one under the panel say
  // what actually happens next, so neither can promise the wrong thing.

  return (
    <div className="overflow-visible rounded-[2rem] border border-[var(--gold-light)] bg-white shadow-[0_24px_60px_rgba(23,45,82,.10)]">
      {/* ---- How are you paying? A segmented control, so the choice reads as
           one control with two settings rather than two competing panels. ---- */}
      <div className="flex flex-wrap items-center justify-between gap-5 border-b border-[var(--gold-light)] bg-[#fcfaf6] px-5 py-5 sm:px-8 sm:py-6">
        <div className="relative grid h-14 w-full max-w-[21rem] min-w-0 grid-cols-2 overflow-hidden rounded-full border border-[var(--gold-light)] bg-white p-1.5 shadow-[0_4px_14px_rgba(23,45,82,.08)]">
          <span aria-hidden="true" className={`absolute bottom-1.5 left-1.5 top-1.5 w-[calc(50%-0.375rem)] rounded-full bg-[var(--navy)] shadow-sm transition-transform duration-300 ease-out ${pay === "miles" ? "translate-x-full" : "translate-x-0"}`} />
          <PayToggle active={pay === "cash"} onClick={() => setPay("cash")}>Cash</PayToggle>
          <PayToggle active={pay === "miles"} onClick={() => setPay("miles")}>Miles &amp; points</PayToggle>
        </div>
        <p className="min-w-0 text-xs leading-5 text-stone-500">
          {pay === "miles"
            ? "Find the award, check the value, book it in your own program."
            : "Compare options here — booking and payment happen with a trusted partner."}
        </p>
      </div>

      {/* ---- What are you booking? ---- */}
      <div className="grid grid-cols-3 gap-1.5 border-b border-[var(--gold-light)] bg-white px-5 py-4 sm:px-8">
        <TabButton active={kind === "hotels"} onClick={() => setKind("hotels")}>Where to stay</TabButton>
        <TabButton active={kind === "flights"} onClick={() => setKind("flights")}>Flights</TabButton>
        <TabButton active={kind === "cars"} onClick={() => setKind("cars")}>Cars</TabButton>
      </div>

      <div className="px-5 py-7 sm:px-8 sm:py-9">

      {/* Hotels: Stay22 live options when the API key is set. Flights and
          cars: partner search widgets (prices on their form, not ours).
          White Glove never takes payment — Duffel checkout stays admin-only. */}
      {pay === "cash" && kind === "flights" && (
        <FlightsForm onAdd={addToTrip} onOpened={setPending} prefill={prefill} />
      )}
      {pay === "cash" && kind === "hotels" && (
        <HotelsForm onAdd={addToTrip} onOpened={setPending} prefill={prefill} liveEnabled={live.hotels} />
      )}
      {pay === "cash" && kind === "cars" && <CarsForm onAdd={addToTrip} onOpened={setPending} prefill={prefill} />}

      {pay === "miles" && kind === "flights" && <MilesFlightsForm onAdd={addToTrip} />}
      {pay === "miles" && kind === "hotels" && <MilesHotelsForm onAdd={addToTrip} />}
      {pay === "miles" && kind === "cars" && <MilesCarsForm onAdd={addToTrip} />}

      </div>

      {pending && (
        <BookedPrompt
          booking={pending}
          onDone={() => setPending(null)}
          onDismiss={() => setPending(null)}
        />
      )}

      {/* Says what happens when you press the button on the tab you are
          actually looking at, rather than describing the page in general. */}
      <p className="border-t border-[var(--gold-light)] bg-[#fcfaf6] px-5 py-5 text-xs leading-6 text-stone-500 sm:px-8">
        {pay === "miles"
          ? "Award bookings are always finished inside your own loyalty account — we never see your balances or your login. Save the item to your trip so the rest of your itinerary stays in one place."
          : kind === "hotels"
            ? "Places to stay are listed here when live options are available. Booking and payment happen with a trusted partner. After you book, you can add the details to your White Glove itinerary."
            : "Search in the partner form on this page. Prices and payment stay with them — White Glove does not list a fare here. After you book, you can add the details to your itinerary."}
      </p>
    </div>
  );
}

type AddFn = (patch: { flights?: ItinFlight[]; lodging?: ItinLodging[]; activities?: ItinActivity[]; dates?: string[] }) => void;

/**
 * What the trip already knows, carried in the address.
 *
 * Somebody who has just written their dates into the planner should not have
 * to type them again to look at flights. Read once, at first render, so the
 * form stays theirs to change afterwards.
 */
/**
 * What a link may fill in before anybody types.
 *
 * `destination` is the place, and it belongs to the two searches that ask for
 * one — the car pick-up and the hotel city. It arrives from the destination
 * pages, which know where the visitor is going: `/book?type=cars&destination=Rome`
 * is what /cars used to be, and a link that says the site knows where you are
 * going and then asks again is worse than one that never claimed to.
 *
 * It is NOT used to prefill a flight. That form asks for an airport code, this
 * site holds none for a vacation destination, and several destinations are
 * regions with three airports — see components/DestinationStickyCta.tsx.
 */
export type Prefill = { from?: string; to?: string; depart?: string; ret?: string; destination?: string };

// ---- Cash --------------------------------------------------------------

/**
 * Cash flights — the Aviasales widget is the search.
 *
 * A White Glove from/to/dates form in front of this widget made people type
 * the same trip twice. Dates the planner already knows are passed into the
 * widget; everything else is filled once, in their form.
 */
function FlightsForm({
  onAdd,
  onOpened,
  prefill,
}: {
  onAdd: AddFn;
  onOpened: (b: PendingBooking) => void;
  prefill?: Prefill;
}) {
  const origin = airportCode(prefill?.from ?? "");
  const destination = airportCode(prefill?.to ?? "");
  const widgetSrc = flightsEmbedPath({
    origin,
    destination,
    departDate: prefill?.depart,
    returnDate: prefill?.ret,
  });
  const summary = [origin, destination].filter(Boolean).join(" → ") || "Flight";

  function addToTrip(confirmation?: string) {
    const date = prefill?.depart ?? "";
    if (origin && destination && date) {
      const flights: ItinFlight[] = [{ id: uid(), from: origin, to: destination, date, bookedOnSite: false, confirmation }];
      if (prefill?.ret) {
        flights.push({ id: uid(), from: destination, to: origin, date: prefill.ret, bookedOnSite: false, confirmation });
      }
      onAdd({ flights, dates: flights.map((f) => f.date) });
      return;
    }
    onAdd({
      activities: [
        {
          id: uid(),
          name: summary,
          date: date || prefill?.ret || "",
          notes: confirmation ? `Reference ${confirmation}` : "",
          bookedOnSite: false,
        },
      ],
    });
  }

  return (
    <div>
      <p className="text-sm leading-6 text-stone-600">
        Search and prices are in the form below. White Glove does not list a fare here.
      </p>
      <PartnerSearchWidget src={widgetSrc} title="Flight search" minHeight={520} />
      <button
        type="button"
        onClick={() => onOpened({ kind: "flight", summary, save: (confirmation) => addToTrip(confirmation) })}
        className="mt-4 min-h-11 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
      >
        I booked it — add it to my trip
      </button>
    </div>
  );
}

function HotelsForm({
  onAdd,
  onOpened,
  prefill,
  liveEnabled = false,
}: {
  onAdd: AddFn;
  onOpened: (b: PendingBooking) => void;
  prefill?: Prefill;
  liveEnabled?: boolean;
}) {
  const [dest, setDest] = useState(prefill?.destination ?? "");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState("2");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const [liveDetail, setLiveDetail] = useState("");
  const [rows, setRows] = useState<PartnerResultRow[]>([]);

  function validate() {
    if (!dest.trim()) {
      setError("Enter a city or destination.");
      return false;
    }
    if (!checkin || !checkout) {
      setError("Choose check-in and check-out dates.");
      return false;
    }
    if (checkout <= checkin) {
      setError("Check-out must be after check-in.");
      return false;
    }
    setError("");
    return true;
  }

  function handOff() {
    openPartner({
      product: "hotel",
      destination: dest.trim(),
      checkIn: checkin,
      checkOut: checkout,
      adults: Math.max(1, Number(guests) || 1),
      placement: "book-hotels",
    });
    onOpened({
      kind: "hotel",
      summary: `${dest.trim()}, ${checkin} → ${checkout}`,
      save: (confirmation) => addToTrip(confirmation),
    });
  }

  async function search() {
    if (!validate()) return;

    if (liveEnabled) {
      setLoading(true);
      setRows([]);
      setLiveMessage("");
      setLiveDetail("");
      try {
        const response = await fetch("/api/partners/hotels/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: dest.trim(),
            checkIn: checkin,
            checkOut: checkout,
            adults: Math.max(1, Number(guests) || 1),
          }),
        });
        const data = await response.json();
        if (data?.ok && data.mode === "live" && Array.isArray(data.stays)) {
          setLiveMessage(data.message ?? "");
          const nextRows: PartnerResultRow[] = data.stays.map(
            (stay: {
              id: string;
              name: string;
              address?: string;
              rating?: number | null;
              stars?: number | null;
              thumbnail?: string | null;
              freeCancellation?: boolean;
              priceTotal?: number | null;
              currency: string;
              nights?: number | null;
              bookUrl: string;
            }) => ({
              id: stay.id,
              title: stay.name,
              subtitle: stay.address,
              meta: [
                stay.stars != null ? `${stay.stars}★` : null,
                stay.rating != null ? `Guest ${stay.rating}` : null,
                stay.freeCancellation ? "Free cancellation" : null,
              ]
                .filter(Boolean)
                .join(" · "),
              priceLabel: moneyLabel(stay.priceTotal, stay.currency),
              priceNote: stay.nights ? `Total for ${stay.nights} night${stay.nights === 1 ? "" : "s"}` : "Total stay",
              imageUrl: stay.thumbnail,
              ctaLabel: "View & book",
              onOpen: () => {
                if (typeof window !== "undefined") {
                  window.open(stay.bookUrl, "_blank", "noopener,noreferrer");
                }
                onOpened({
                  kind: "hotel",
                  summary: `${stay.name}, ${checkin} → ${checkout}`,
                  save: (confirmation) => addToTrip(confirmation),
                });
              },
            }),
          );
          setRows(nextRows);
          setLoading(false);
          return;
        }
        setLiveMessage(data?.message ?? "Live places to stay are not available.");
        setLiveDetail(data?.detail ?? "Opening the partner search instead.");
      } catch {
        setLiveMessage("Live places to stay could not be loaded.");
        setLiveDetail("Opening the partner search instead.");
      }
      setLoading(false);
    }

    handOff();
  }

  function addToTrip(confirmation?: string) {
    if (!validate()) return;
    const lodging: ItinLodging[] = [
      {
        id: uid(),
        type: "hotel",
        name: `Hotel in ${dest.trim()}`,
        address: dest.trim(),
        checkIn: checkin,
        checkOut: checkout,
        bookedOnSite: false,
        confirmation,
      },
    ];
    onAdd({ lodging, dates: [checkin, checkout] });
  }

  return (
    <div>
      <SearchGrid className="sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_.8fr]">
        <Field label="Destination">
          <AddressAutocomplete mode="city" value={dest} onChange={(city) => setDest(city)} placeholder="City or town" className={bareInput} />
        </Field>
        <Field label="Check in">
          <DateField
            ariaLabel="Check-in date"
            value={checkin}
            min={today()}
            onChange={(v) => {
              setCheckin(v);
              setCheckout((c) => correctedEnd(v, c, "exclusive"));
            }}
            className={bareInput}
          />
        </Field>
        <Field label="Check out">
          <DateField
            ariaLabel="Check-out date"
            value={checkout}
            min={notBefore(nextDay(today()), earliestEnd(checkin, "exclusive"))}
            onChange={(v) => setCheckout(correctedEnd(checkin, v, "exclusive"))}
            className={bareInput}
          />
        </Field>
        <Field label="Guests">
          <input type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} className={bareInput} />
        </Field>
      </SearchGrid>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      <ActionRow
        onSearch={search}
        searchLabel={liveEnabled ? "Search places to stay" : hotelButtonLabel()}
        busy={loading}
        secondary={
          liveEnabled && rows.length > 0
            ? { label: "Compare all on partner", onClick: handOff }
            : undefined
        }
      />
      <PartnerResultsPanel loading={loading} message={liveMessage} detail={liveDetail} rows={rows} />
    </div>
  );
}

/**
 * Cash cars — the Localrent widget is the search.
 *
 * A White Glove city/dates form in front of this widget made people type the
 * same hire twice. A destination the site already knows is passed in; they
 * fill the rest once, in the partner form.
 */
function CarsForm({ onAdd, onOpened, prefill }: { onAdd: AddFn; onOpened: (b: PendingBooking) => void; prefill?: Prefill }) {
  const loc = (prefill?.destination ?? "").trim();
  const widgetSrc = carsEmbedPath({ location: loc });
  const summary = loc ? `Rental car — ${loc}` : "Rental car";

  function addToTrip(confirmation?: string) {
    onAdd({
      activities: [
        {
          id: uid(),
          name: summary,
          date: "",
          notes: confirmation ? `Reference ${confirmation}` : "",
          bookedOnSite: false,
        },
      ],
    });
  }

  return (
    <div>
      <p className="text-sm leading-6 text-stone-600">
        Search and prices are in the form below. White Glove does not list a price here.
      </p>
      <PartnerSearchWidget src={widgetSrc} title="Car search" minHeight={640} />
      <button
        type="button"
        onClick={() => onOpened({ kind: "car", summary, save: (confirmation) => addToTrip(confirmation) })}
        className="mt-4 min-h-11 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
      >
        I booked it — add it to my trip
      </button>
    </div>
  );
}

/**
 * "Did you book it?"
 *
 * The booking happens on the partner's site, in another tab, where we cannot
 * see it. So the trip has no idea about the flight somebody just paid for
 * unless they come back and say — and nobody thinks to, because as far as they
 * are concerned the job is done.
 *
 * This asks while it is still fresh. It appears the moment the partner opens,
 * behind them, and is waiting when they come back. Not booked, or not yet, is
 * one click; there is nothing to dismiss twice.
 */
function BookedPrompt({ booking, onDone, onDismiss }: { booking: PendingBooking; onDone: () => void; onDismiss: () => void }) {
  const [confirmation, setConfirmation] = useState("");
  const what = booking.kind === "flight" ? "flight" : booking.kind === "hotel" ? "hotel" : "car";
  // The keyboard stays in here while it is open, and goes back to whatever
  // opened it when it closes. Escape is "not yet", the same as the button.
  const dialogRef = useFocusTrap<HTMLDivElement>(true, onDismiss);

  return (
    <div className="fixed inset-0 z-[var(--wg-z-modal)] flex items-end justify-center bg-[rgba(13,31,59,.45)] p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="booked-title">
      <div ref={dialogRef} tabIndex={-1} className="w-full max-w-lg rounded-3xl border border-[var(--gold)] bg-[#fcfaf6] p-6 shadow-[0_24px_60px_rgba(23,45,82,.35)] outline-none sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Searching in the other tab</p>
        <h2 id="booked-title" className="mt-3 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)] sm:text-3xl">
          When you have booked, come back and tell us.
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          The booking happens on their site, so your itinerary does not know about it. Add the {what} here and it goes on
          your trip with everything else — and the reference is somewhere you can find it without digging through email.
        </p>
        <p className="mt-3 border-l-4 border-[var(--gold-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--navy)]">
          {booking.summary}
        </p>

        <label className="mt-5 block">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Booking reference (if you have it)</span>
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="e.g. XR4K9T"
            className="mt-1.5 w-full rounded-xl border border-[var(--gold-light)] bg-white px-4 py-3 text-sm text-[var(--navy)] outline-none focus:border-[var(--gold)] focus:ring-4 focus:ring-[rgba(170,139,82,.12)]"
          />
        </label>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              booking.save(confirmation.trim());
              onDone();
            }}
            className="min-h-[46px] flex-1 rounded-full border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
          >
            I booked it — add it to my trip
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[46px] rounded-full border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
          >
            Not yet
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-stone-500">
          Still looking? Close this and finish booking in the other tab. Search again here afterwards if you need this prompt back.
        </p>
      </div>
    </div>
  );
}

function ActionRow({
  onSearch,
  searchLabel,
  busy,
  secondary,
}: {
  onSearch: () => void;
  searchLabel: string;
  busy?: boolean;
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={onSearch}
        disabled={busy}
        className="min-h-[52px] min-w-0 flex-1 rounded-full bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-[0_8px_20px_rgba(23,45,82,.14)] transition hover:bg-[var(--gold)] disabled:opacity-60"
      >
        {busy ? "Searching…" : `${searchLabel} →`}
      </button>
      {secondary ? (
        <button
          type="button"
          onClick={secondary.onClick}
          className="min-h-[52px] rounded-full border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream)]"
        >
          {secondary.label}
        </button>
      ) : null}
    </div>
  );
}

function PayToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative z-10 flex min-h-11 min-w-0 items-center justify-center rounded-full px-3 text-center text-xs font-bold uppercase tracking-[0.1em] transition-colors duration-300 sm:px-5 sm:tracking-[0.12em] ${active ? "text-white" : "text-stone-500 hover:text-[var(--navy)]"}`}
    >
      {children}
    </button>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 rounded-full px-3 text-xs font-bold uppercase tracking-[0.1em] transition sm:px-5 sm:tracking-[0.14em] ${active ? "bg-[var(--cream-deep)] text-[var(--navy)] shadow-[inset_0_0_0_1px_var(--gold-light)]" : "text-stone-500 hover:bg-[var(--cream)] hover:text-[var(--navy)]"}`}
    >
      {children}
    </button>
  );
}

// ---- Booking with miles & points ---------------------------------------
// Award seats and award nights can only be redeemed inside the traveler's own
// loyalty account — no third party can book them. So each of these does the
// two things that genuinely help: find where the award is, and work out
// whether spending the points beats paying cash.

const FLIGHT_PROGRAMS: Array<{ label: string; award: string }> = [
  { label: "Amex Membership Rewards", award: "https://www.americanexpress.com/en-us/travel/" },
  { label: "Chase Ultimate Rewards", award: "https://ultimaterewards.chase.com/" },
  { label: "Capital One Miles", award: "https://travel.capitalone.com/" },
  { label: "United MileagePlus", award: "https://www.united.com/en/us/book-flight/united-award-travel" },
  { label: "Delta SkyMiles", award: "https://www.delta.com/" },
  { label: "American AAdvantage", award: "https://www.aa.com/" },
  { label: "Air Canada Aeroplan", award: "https://www.aircanada.com/aeroplan" },
  { label: "Flying Blue (Air France/KLM)", award: "https://wwws.airfrance.us/flying-blue" },
  { label: "El Al Matmid", award: "https://www.elal.com/" },
];

const HOTEL_PROGRAMS: Array<{ label: string; award: string }> = [
  { label: "Marriott Bonvoy", award: "https://www.marriott.com/" },
  { label: "Hilton Honors", award: "https://www.hilton.com/" },
  { label: "World of Hyatt", award: "https://www.hyatt.com/" },
  { label: "IHG One Rewards", award: "https://www.ihg.com/" },
  { label: "Accor ALL", award: "https://all.accor.com/" },
  { label: "Wyndham Rewards", award: "https://www.wyndhamhotels.com/wyndham-rewards" },
  { label: "Choice Privileges", award: "https://www.choicehotels.com/choice-privileges" },
  { label: "Amex Membership Rewards (travel portal)", award: "https://www.americanexpress.com/en-us/travel/" },
  { label: "Chase Ultimate Rewards (travel portal)", award: "https://ultimaterewards.chase.com/" },
  { label: "Capital One Miles (travel portal)", award: "https://travel.capitalone.com/" },
];

const CAR_PROGRAMS: Array<{ label: string; award: string }> = [
  { label: "Amex Travel (pay with points)", award: "https://www.americanexpress.com/en-us/travel/car-rental/" },
  { label: "Chase Travel (pay with points)", award: "https://ultimaterewards.chase.com/" },
  { label: "Capital One Travel (pay with miles)", award: "https://travel.capitalone.com/" },
  { label: "Avis Preferred", award: "https://www.avis.com/en/association/partners" },
  { label: "Hertz Gold Plus Rewards", award: "https://www.hertz.com/rentacar/loyalty/gold-plus-rewards" },
  { label: "Sixt Card", award: "https://www.sixt.com/sixt-card/" },
];

function ProgramSelect({ programs, value, onChange, label }: { programs: Array<{ label: string; award: string }>; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${bareInput} -ml-0.5 cursor-pointer`}>
        <option value="">Choose your program…</option>
        {programs.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
      </select>
    </Field>
  );
}

/**
 * Cents per point = (what the cash booking costs, minus anything you still pay
 * on the award) ÷ the points it takes. The standard way to judge a redemption.
 */
function ValueCalculator({ unit, cashLabel, feesLabel, pointsPlaceholder, cashPlaceholder }: {
  unit: string;
  cashLabel: string;
  feesLabel: string;
  pointsPlaceholder: string;
  cashPlaceholder: string;
}) {
  const [points, setPoints] = useState("");
  const [cash, setCash] = useState("");
  const [fees, setFees] = useState("");

  const pointsNum = Number(points.replace(/[^\d.]/g, ""));
  const cashNum = Number(cash.replace(/[^\d.]/g, ""));
  const feesNum = Number(fees.replace(/[^\d.]/g, "")) || 0;
  const cpp = pointsNum > 0 && cashNum > 0 ? ((cashNum - feesNum) / pointsNum) * 100 : null;
  const verdict =
    cpp === null ? null
    : cpp >= 2 ? { text: "Strong value — worth redeeming.", tone: "text-emerald-700" }
    : cpp >= 1.2 ? { text: "Reasonable value.", tone: "text-[var(--navy)]" }
    : { text: "Weak value — paying cash is probably better.", tone: "text-amber-800" };

  return (
    <>
      <SearchGrid className="mt-2 sm:grid-cols-3">
        <Field label={`${unit} required`}><input inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value)} placeholder={pointsPlaceholder} className={bareInput} /></Field>
        <Field label={cashLabel}><input inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} placeholder={cashPlaceholder} className={bareInput} /></Field>
        <Field label={feesLabel}><input inputMode="decimal" value={fees} onChange={(e) => setFees(e.target.value)} placeholder="0" className={bareInput} /></Field>
      </SearchGrid>
      {cpp !== null && verdict && (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-l-4 border-[var(--gold)] bg-[#fcfaf6] px-4 py-4">
          <p className="font-[family-name:var(--font-display)] text-3xl leading-none text-[var(--navy)]">{cpp.toFixed(2)}¢ <span className="text-base text-stone-500">per point</span></p>
          <p className={`text-sm font-semibold ${verdict.tone}`}>{verdict.text}</p>
          <p className="mt-1 basis-full text-xs leading-5 text-stone-500">
            Worked out as (cash price − what you still pay on the award) ÷ points. Around 1.2¢ is typical; 2¢ or more is usually a good redemption.
            Compare against what your own program normally returns before you transfer anything.
          </p>
        </div>
      )}
    </>
  );
}

function MilesNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-[var(--gold)] bg-white px-4 py-3 text-sm leading-6 text-stone-700">{children}</div>
  );
}

function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return <p className="mt-8 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">{n} · {children}</p>;
}

const linkPrimary = "inline-flex min-h-[44px] items-center rounded-full border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]";
const linkGhost = "inline-flex min-h-[44px] items-center rounded-full border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white";

function MilesFlightsForm({ onAdd }: { onAdd: AddFn }) {
  const [program, setProgram] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [when, setWhen] = useState("");
  const selected = FLIGHT_PROGRAMS.find((p) => p.label === program);
  const query = from.trim() && to.trim() ? `?from=${encodeURIComponent(from.trim())}&to=${encodeURIComponent(to.trim())}` : "";

  function addToTrip() {
    const o = airportCode(from);
    const d = airportCode(to);
    if (!o || !d || !when) return;
    if (when < today()) return;
    onAdd({ flights: [{ id: uid(), from: o, to: d, date: when, bookedOnSite: false }], dates: [when] });
  }

  return (
    <div>
      <MilesNote>
        <strong className="text-[var(--navy)]">How award flights work.</strong>{" "}No website can redeem your miles for you — award seats
        come out of your own loyalty account, so the booking is always finished on the airline&apos;s own site. What we do here is help
        you find the seats and check the redemption is worth it.
      </MilesNote>

      <SearchGrid className="mt-6 sm:grid-cols-2 lg:grid-cols-4">
        <ProgramSelect programs={FLIGHT_PROGRAMS} value={program} onChange={setProgram} label="Your miles" />
        <Field label="From"><AirportAutocomplete value={from} onChange={setFrom} placeholder="City or airport" className={bareInput} /></Field>
        <Field label="To"><AirportAutocomplete value={to} onChange={setTo} placeholder="City or airport" className={bareInput} /></Field>
        <Field label="When"><DateField ariaLabel="Date" value={when} min={today()} onChange={setWhen} className={bareInput} /></Field>
      </SearchGrid>

      <StepLabel n={1}>Find award seats (free tools)</StepLabel>
      <div className="mt-2 flex flex-wrap gap-3">
        <a href={`https://www.pointsyeah.com/search${query}`} target="_blank" rel="noreferrer" className={linkPrimary}>Search award seats on PointsYeah →</a>
        <a href="https://seats.aero/search" target="_blank" rel="noreferrer" className={linkGhost}>Search on seats.aero →</a>
        {selected && <a href={selected.award} target="_blank" rel="noreferrer" className={linkGhost}>Open {program} →</a>}
      </div>
      <p className="mt-2 text-xs text-stone-500">Independent award-search sites, free to use. We don&apos;t see your balances or your account.</p>

      <StepLabel n={2}>Whether the miles are worth it</StepLabel>
      <ValueCalculator unit="Miles" cashLabel="Cash price of the same ticket" feesLabel="Taxes/fees you still pay" pointsPlaceholder="45000" cashPlaceholder="900" />

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={addToTrip} className={linkGhost}>+ Add this flight to my trip</button>
      </div>
      <p className="mt-6 text-xs leading-5 text-stone-500">
        Transfers from a card program to an airline are almost always one-way. Confirm the award seat exists first, then transfer, then book.
      </p>
    </div>
  );
}

function MilesHotelsForm({ onAdd }: { onAdd: AddFn }) {
  const [program, setProgram] = useState("");
  const [dest, setDest] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [error, setError] = useState("");
  const selected = HOTEL_PROGRAMS.find((p) => p.label === program);

  function addToTrip() {
    if (!dest.trim() || !checkin || !checkout) { setError("Enter a city and both dates first."); return; }
    if (checkout <= checkin) { setError("Check-out must be after check-in."); return; }
    setError("");
    onAdd({
      lodging: [{ id: uid(), type: "hotel", name: `Award stay in ${dest.trim()}${program ? ` (${program})` : ""}`, address: dest.trim(), checkIn: checkin, checkOut: checkout, bookedOnSite: false }],
      dates: [checkin, checkout],
    });
  }

  return (
    <div>
      <MilesNote>
        <strong className="text-[var(--navy)]">How award nights work.</strong>{" "}Points nights are booked inside your own hotel program,
        so the reservation is always completed on the chain&apos;s own site. Use the calculator below before you book — hotel points are
        worth very different amounts depending on the chain and the property.
      </MilesNote>

      <SearchGrid className="mt-6 sm:grid-cols-2 lg:grid-cols-4">
        <ProgramSelect programs={HOTEL_PROGRAMS} value={program} onChange={setProgram} label="Your points" />
        <Field label="Destination"><AddressAutocomplete mode="city" value={dest} onChange={(city) => setDest(city)} placeholder="City or town" className={bareInput} /></Field>
        <Field label="Check in"><DateField ariaLabel="Check-in date" value={checkin} min={today()} onChange={(v) => { setCheckin(v); setCheckout((c) => correctedEnd(v, c, "exclusive")); }} className={bareInput} /></Field>
        {/* A stay is a number of nights, so the earliest check-out is the night
            after the earliest check-in — tomorrow when nothing is chosen yet. */}
        <Field label="Check out"><DateField ariaLabel="Check-out date" value={checkout} min={notBefore(nextDay(today()), earliestEnd(checkin, "exclusive"))} onChange={(v) => setCheckout(correctedEnd(checkin, v, "exclusive"))} className={bareInput} /></Field>
      </SearchGrid>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

      <StepLabel n={1}>Find award availability</StepLabel>
      <div className="mt-2 flex flex-wrap gap-3">
        {selected
          ? <a href={selected.award} target="_blank" rel="noreferrer" className={linkPrimary}>Open {program} →</a>
          : <span className="text-sm text-stone-500">Choose your program above and its award booking page opens here.</span>}
        <a href="https://awardmapper.com/" target="_blank" rel="noreferrer" className={linkGhost}>See which chains have hotels here →</a>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Award Mapper is a free independent tool for seeing which loyalty programs have properties in a city — useful before you commit points.
      </p>

      <StepLabel n={2}>Whether the points are worth it</StepLabel>
      <ValueCalculator unit="Points" cashLabel="Cash price of the same stay" feesLabel="Resort/other fees still charged" pointsPlaceholder="60000" cashPlaceholder="750" />
      <p className="mt-3 text-xs leading-5 text-stone-500">
        Compare the whole stay, not one night — many programs discount longer award stays. Check the kosher-food situation separately;
        an award property miles from anything kosher can cost more in taxis than the points saved.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={addToTrip} className={linkGhost}>+ Add this stay to my trip</button>
      </div>
    </div>
  );
}

function MilesCarsForm({ onAdd }: { onAdd: AddFn }) {
  const [program, setProgram] = useState("");
  const [loc, setLoc] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [error, setError] = useState("");
  const selected = CAR_PROGRAMS.find((p) => p.label === program);

  function addToTrip() {
    if (!loc.trim() || !pickup || !dropoff) { setError("Enter a pick-up city and both dates first."); return; }
    if (dropoff < pickup) { setError("Drop-off must be on or after pick-up."); return; }
    setError("");
    onAdd({
      activities: [{ id: uid(), name: `Rental car — ${loc.trim()}`, date: pickup, notes: `Drop-off ${dropoff}${program ? ` · booking with ${program}` : ""}`, bookedOnSite: false }],
      dates: [pickup, dropoff],
    });
  }

  return (
    <div>
      <MilesNote>
        <strong className="text-[var(--navy)]">Be honest about cars.</strong>{" "}Rental cars are usually the weakest way to spend points —
        card travel portals let you pay for one with points at a fixed rate, which is convenient but rarely good value. Run the numbers
        below before you do it; paying cash and keeping the points for a flight is very often the better trip.
      </MilesNote>

      <SearchGrid className="mt-6 sm:grid-cols-2 lg:grid-cols-4">
        <ProgramSelect programs={CAR_PROGRAMS} value={program} onChange={setProgram} label="Your program" />
        <Field label="Pick-up location"><AddressAutocomplete mode="city" value={loc} onChange={(city) => setLoc(city)} placeholder="City or airport" className={bareInput} /></Field>
        <Field label="Pick-up date"><DateField ariaLabel="Pick-up date" value={pickup} min={today()} onChange={(v) => { setPickup(v); setDropoff((d) => correctedEnd(v, d)); }} className={bareInput} /></Field>
        <Field label="Drop-off date"><DateField ariaLabel="Drop-off date" value={dropoff} min={notBefore(today(), earliestEnd(pickup))} onChange={(v) => setDropoff(correctedEnd(pickup, v))} className={bareInput} /></Field>
      </SearchGrid>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

      <StepLabel n={1}>Book with your points</StepLabel>
      <div className="mt-2 flex flex-wrap gap-3">
        {selected
          ? <a href={selected.award} target="_blank" rel="noreferrer" className={linkPrimary}>Open {program} →</a>
          : <span className="text-sm text-stone-500">Choose a program above and its booking page opens here.</span>}
        {/* "Check the cash price" is a partner search like any other, and it
            was going straight out to a hand-written kayak.com address —
            untracked, unchangeable, and earning nothing whatever the earnings
            screen said. Exactly the car-hire failure this file's test exists
            for, hiding one tab along in the points section. */}
        {loc.trim() && pickup && dropoff ? (
          <a
            href={goHref({ product: "car", destination: loc.trim(), checkIn: pickup, checkOut: dropoff, page: "/book", placement: "book-cars-miles" })}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className={linkGhost}
          >
            Check the cash price →
          </a>
        ) : (
          <span className="text-sm text-stone-500">Fill in the pick-up and dates to compare the cash price.</span>
        )}
      </div>

      <StepLabel n={2}>Whether the points are worth it</StepLabel>
      <ValueCalculator unit="Points" cashLabel="Cash price of the same rental" feesLabel="Anything still charged at the counter" pointsPlaceholder="30000" cashPlaceholder="300" />

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={addToTrip} className={linkGhost}>+ Add this car to my trip</button>
      </div>
      <p className="mt-6 text-xs leading-5 text-stone-500">
        Rental-car loyalty programs mostly earn you airline miles rather than let you spend them — worth linking your frequent-flyer
        number at the counter either way.
      </p>
    </div>
  );
}
