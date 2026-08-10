"use client";

import { useEffect, useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import { type Leg, type SearchShape, airportCode, describeSearch, searchProblem } from "@/lib/kayak-search";
import { hotelButtonLabel } from "@/lib/stay22";
import DateField from "@/components/DateField";
import type { AffiliateRequest } from "@/lib/affiliate/partners";
import { goHref } from "@/lib/affiliate/request";
import { useFocusTrap } from "@/components/useFocusTrap";
import { emptyItinerary, nextDate, type ItinActivity, type ItinFlight, type ItinLodging, type Itinerary } from "@/data/itinerary";
import { correctedEnd, earliestEnd, nextDay, notBefore, today } from "@/lib/date-range";

// Unified "Book" experience. The traveler makes two choices, in order:
//   1. how they're paying — cash or miles/points;
//   2. what they're booking — flights, hotels or cars.
// Cash hands off to a partner that takes payment (affiliate-ready deep links).
// Miles can't be handed off the same way: award seats and award nights come
// out of the traveler's own loyalty account, so nobody but them can complete
// the booking. There we help them find the award and check it's worth the
// points, then send them to their own program.
// Either way an item can be saved to their itinerary before they book.

type Pay = "cash" | "miles";
type Kind = "flights" | "hotels" | "cars";
type TripKind = "round-trip" | "one-way" | "multi-city";

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
const LS_KEY = "whiteGloveItinerary";
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
export default function BookPartners({ prefill, multiCity = true }: { prefill?: Prefill; multiCity?: boolean }) {
  const [pay, setPay] = useState<Pay>("cash");
  // HOTELS OPENS, not flights. Accommodation is the one product this site
  // knows something a comparison site does not — which quarter makes Shabbos
  // walkable, what is within a walk of it — so it is the tab that earns the
  // visit. Flights and cars are the same search anybody can run anywhere.
  const [kind, setKind] = useState<Kind>("hotels");
  const [added, setAdded] = useState(false);
  const [pending, setPending] = useState<PendingBooking | null>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("type");
    if (requested === "flights" || requested === "hotels" || requested === "cars") setKind(requested);
  }, []);

  // Save items into the traveler's itinerary (localStorage + account sync).
  function addToTrip(patch: { flights?: ItinFlight[]; lodging?: ItinLodging[]; activities?: ItinActivity[]; dates?: string[] }) {
    let itin: Itinerary = emptyItinerary();
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) itin = { ...emptyItinerary(), ...JSON.parse(saved) };
    } catch {
      /* start fresh */
    }
    const next: Itinerary = {
      ...itin,
      flights: [...(itin.flights ?? []), ...(patch.flights ?? [])],
      lodging: [...(itin.lodging ?? []), ...(patch.lodging ?? [])],
      activities: [...(itin.activities ?? []), ...(patch.activities ?? [])],
    };
    const dates = (patch.dates ?? []).filter(Boolean).sort();
    if (dates.length) {
      if (!next.startDate || dates[0] < next.startDate) next.startDate = dates[0];
      if (!next.endDate || dates[dates.length - 1] > next.endDate) next.endDate = dates[dates.length - 1];
    }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    void fetch("/api/account/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itinerary: next }),
    }).catch(() => undefined);
    setAdded(true);
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
          {pay === "miles" ? "Find the award, check the value, book it in your own program." : "Compare and pay by card with a trusted partner."}
        </p>
      </div>

      {/* ---- What are you booking? ---- */}
      <div className="grid grid-cols-3 gap-1.5 border-b border-[var(--gold-light)] bg-white px-5 py-4 sm:px-8">
        <TabButton active={kind === "hotels"} onClick={() => setKind("hotels")}>Hotels</TabButton>
        <TabButton active={kind === "flights"} onClick={() => setKind("flights")}>Flights</TabButton>
        <TabButton active={kind === "cars"} onClick={() => setKind("cars")}>Cars</TabButton>
      </div>

      <div className="px-5 py-7 sm:px-8 sm:py-9">

      {added && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--gold)] bg-[var(--cream)] p-4 text-sm">
          <span className="font-semibold text-[var(--navy)]">✓ Added to your trip.</span>
          <a href="/itinerary" className="rounded-full border border-[var(--navy)] bg-[var(--navy)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]">Open my itinerary planner →</a>
        </div>
      )}

      {/* NO IN-SITE SEARCH ANY MORE. Both of these used to have a Duffel
          branch that searched and booked on this page — a card taken and a
          ticket issued, which is a different business from sending somebody to
          a partner. Duffel is at /admin/duffel now and the public page has one
          path per product. See lib/booking-partners.ts. */}
      {pay === "cash" && kind === "flights" && (
        <FlightsForm onAdd={addToTrip} onOpened={setPending} prefill={prefill} multiCity={multiCity} />
      )}
      {pay === "cash" && kind === "hotels" && <HotelsForm onAdd={addToTrip} onOpened={setPending} />}
      {pay === "cash" && kind === "cars" && <CarsForm onAdd={addToTrip} onOpened={setPending} />}

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
          : "Cash searches open with a trusted booking partner, where you compare and pay securely. Save an item to your trip to keep it in your White Glove itinerary."}
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
export type Prefill = { from?: string; to?: string; depart?: string; ret?: string };

// ---- Cash --------------------------------------------------------------

function FlightsForm({ onAdd, onOpened, prefill, multiCity = true }: { onAdd: AddFn; onOpened: (b: PendingBooking) => void; prefill?: Prefill; multiCity?: boolean }) {
  const [trip, setTrip] = useState<TripKind>("round-trip");
  const [legs, setLegs] = useState<Leg[]>([{ from: prefill?.from ?? "", to: prefill?.to ?? "", date: prefill?.depart ?? "" }]);
  const [ret, setRet] = useState(prefill?.ret ?? "");
  const [nonstop, setNonstop] = useState(false);
  const [error, setError] = useState("");

  const setLeg = (index: number, patch: Partial<Leg>) =>
    setLegs((current) => current.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)));

  /**
   * Switching trip type keeps what has been typed.
   *
   * Somebody who has filled in JFK → Kraków and then realises they want a
   * second leg should not have to type it again. Going back to one leg keeps
   * the first, which is the one they started with.
   */
  function chooseTrip(next: TripKind) {
    setTrip(next);
    setError("");
    if (next === "multi-city") {
      setLegs((current) => (current.length > 1 ? current : [...current, { from: current[0]?.to ?? "", to: "", date: "" }]));
    } else {
      setLegs((current) => [current[0]]);
    }
  }

  const shape = (): SearchShape =>
    trip === "round-trip"
      ? { trip: "round-trip", legs: [legs[0]], ret }
      : trip === "one-way"
        ? { trip: "one-way", legs: [legs[0]] }
        : { trip: "multi-city", legs };

  function checked(): SearchShape | null {
    const wanted = shape();
    const problem = searchProblem(wanted);
    setError(problem ?? "");
    return problem ? null : wanted;
  }

  function search() {
    const wanted = checked();
    if (!wanted) return;
    // WHICH PARTNER THIS OPENS IS NO LONGER DECIDED HERE. /go picks it from the
    // owner's settings and builds the address, so a programme that changes is
    // a setting rather than a redeploy — and, more to the point, this page no
    // longer has to be handed the account numbers in order to guess.
    //
    // The whole journey goes, not the first leg of it: a multi-city trip that
    // arrived as a single leg would open a working search for the wrong
    // journey, which nobody would report as a bug.
    // Said BEFORE a tab is opened. /go would decline to build a link it
    // cannot build, which is right, but the traveller would see a new tab
    // bounce straight back and be told nothing. The partner is not named —
    // visitors are not told which one a search opens.
    if (wanted.trip === "multi-city" && !multiCity) {
      setError("Multi-city searches are not available at the moment. Search one journey at a time, and each one can be saved to the trip.");
      return;
    }
    // CODES, NOT WHAT THE BOX SAYS. The airport field holds a label after a
    // pick — "New York (JFK)" — and this used to hand that straight to /go,
    // which encodes a leg as three hyphen-separated fields. A city with a
    // hyphen in its name split into four and the leg was dropped on arrival,
    // so the whole search resolved to nothing: the tab opened, bounced back to
    // the site, and the referral was gone. Cluj-Napoca did it on production.
    // The leg type has always been a code; only the caller disagreed.
    openPartner({
      product: "flight",
      legs: wanted.legs.map((l) => ({ from: airportCode(l.from), to: airportCode(l.to), date: l.date })),
      checkOut: wanted.trip === "round-trip" ? wanted.ret : "",
      nonstop,
      placement: "book-flights",
    });
    // The booking itself happens on the other site, where we cannot see it.
    // So ask for it back, with the reference, rather than letting the trip
    // quietly not know about the flight they just paid for.
    onOpened({ kind: "flight", summary: describeSearch(wanted), save: (confirmation) => addToTrip(confirmation) });
  }

  function addToTrip(confirmation?: string) {
    const wanted = checked();
    if (!wanted) return;
    const flights: ItinFlight[] = wanted.legs.map((leg) => ({
      id: uid(),
      from: airportCode(leg.from),
      to: airportCode(leg.to),
      date: leg.date,
      bookedOnSite: false,
      confirmation,
    }));
    // The return leg of a round trip is a flight in its own right on the
    // itinerary, even though Kayak searches it as one journey.
    if (wanted.trip === "round-trip") {
      flights.push({ id: uid(), from: airportCode(wanted.legs[0].to), to: airportCode(wanted.legs[0].from), date: wanted.ret, bookedOnSite: false, confirmation });
    }
    onAdd({ flights, dates: flights.map((f) => f.date) });
  }

  const multi = trip === "multi-city";

  return (
    <div>
      {/* THREE ACROSS, ALWAYS. This was a wrapping row, and on a phone the third
          one — Multi-city — dropped onto a line of its own below the fold. The
          row that was left read as the whole choice: round trip or one way, and
          multi-city looked like something this site could not do. Reported
          twice as "there is no multi city", which is exactly what it looked
          like. A grid of equal thirds cannot come apart at any width. */}
      <div className="mb-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center" data-choice-row="trip type">
        <TripTypeButton active={trip === "round-trip"} onClick={() => chooseTrip("round-trip")}>Round trip</TripTypeButton>
        <TripTypeButton active={trip === "one-way"} onClick={() => chooseTrip("one-way")}>One way</TripTypeButton>
        <TripTypeButton active={multi} onClick={() => chooseTrip("multi-city")}>Multi-city</TripTypeButton>
        {/* Its own row on a phone, where there is no width left beside them. */}
        <label className="col-span-3 flex min-h-11 items-center gap-2 text-xs font-semibold text-[var(--navy)] sm:ml-auto sm:min-h-0">
          <input type="checkbox" checked={nonstop} onChange={(e) => setNonstop(e.target.checked)} className="h-4 w-4 accent-[var(--navy)]" />
          Nonstop only
        </label>
      </div>

      {legs.map((leg, index) => (
        <SearchGrid key={index} className={`sm:grid-cols-2 lg:grid-cols-4 ${index > 0 ? "mt-4" : ""}`}>
          <Field label={multi ? `From — flight ${index + 1}` : "From"}>
            <AirportAutocomplete value={leg.from} onChange={(from) => setLeg(index, { from })} placeholder="City or airport" className={bareInput} />
          </Field>
          <Field label={multi ? `To — flight ${index + 1}` : "To"}>
            <AirportAutocomplete value={leg.to} onChange={(to) => setLeg(index, { to })} placeholder="City or airport" className={bareInput} />
          </Field>
          <Field label={multi ? `Departure — flight ${index + 1}` : "Departure"}>
            <DateField
              ariaLabel={`Departure date${multi ? ` for flight ${index + 1}` : ""}`}
              value={leg.date}
              // Not in the past, and — on a multi-city trip — not before the
              // flight before it, since the legs are flown in the order they
              // are listed.
              min={notBefore(today(), index > 0 ? legs[index - 1]?.date : undefined)}
              onChange={(v) => { setLeg(index, { date: v }); if (index === 0 && !multi) setRet((r) => correctedEnd(v, r)); }}
              className={bareInput}
            />
          </Field>
          {multi ? (
            index > 0 ? (
              <div className="flex items-end">
                <button type="button" onClick={() => setLegs((c) => c.filter((_, i) => i !== index))} className="min-h-11 w-full border border-[var(--gold-light)] px-3 text-xs font-bold uppercase tracking-[0.1em] text-stone-500 transition hover:border-red-300 hover:text-red-700">
                  Remove flight
                </button>
              </div>
            ) : (
              <div aria-hidden="true" />
            )
          ) : (
            <Field label="Return" className={trip === "one-way" ? "opacity-45" : ""}>
              <DateField ariaLabel="Return date" value={ret} disabled={trip === "one-way"} min={notBefore(today(), earliestEnd(legs[0]?.date ?? ""))} onChange={(v) => setRet(correctedEnd(legs[0]?.date ?? "", v))} className={bareInput} />
            </Field>
          )}
        </SearchGrid>
      ))}

      {multi && (
        <button type="button" onClick={() => setLegs((c) => [...c, { from: c[c.length - 1]?.to ?? "", to: "", date: "" }])} className="mt-4 min-h-11 border border-[var(--gold)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--cream)]">
          + Add another flight
        </button>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      <ActionRow onSearch={search} onAdd={() => addToTrip()} searchLabel="Search flights" />
    </div>
  );
}

function HotelsForm({ onAdd, onOpened }: { onAdd: AddFn; onOpened: (b: PendingBooking) => void }) {
  const [dest, setDest] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState("2");
  const [error, setError] = useState("");

  function validate() {
    if (!dest.trim()) { setError("Enter a city or destination."); return false; }
    if (!checkin || !checkout) { setError("Choose check-in and check-out dates."); return false; }
    if (checkout <= checkin) { setError("Check-out must be after check-in."); return false; }
    setError("");
    return true;
  }

  function search() {
    if (!validate()) return;
    // Stay22 or Booking.com, and which one is /go's decision now. The choice
    // needed the Stay22 ID to make, and having the ID here is what put it in
    // the page source.
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

  function addToTrip(confirmation?: string) {
    if (!validate()) return;
    const lodging: ItinLodging[] = [{ id: uid(), type: "hotel", name: `Hotel in ${dest.trim()}`, address: dest.trim(), checkIn: checkin, checkOut: checkout, bookedOnSite: false, confirmation }];
    onAdd({ lodging, dates: [checkin, checkout] });
  }

  return (
    <div>
      <SearchGrid className="sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_.8fr]">
        <Field label="Destination"><AddressAutocomplete mode="city" value={dest} onChange={(city) => setDest(city)} placeholder="City or town" className={bareInput} /></Field>
        <Field label="Check in"><DateField ariaLabel="Check-in date" value={checkin} min={today()} onChange={(v) => { setCheckin(v); setCheckout((c) => correctedEnd(v, c, "exclusive")); }} className={bareInput} /></Field>
        {/* A stay is a number of nights, so the earliest check-out is the night
            after the earliest check-in — tomorrow when nothing is chosen yet. */}
        <Field label="Check out"><DateField ariaLabel="Check-out date" value={checkout} min={notBefore(nextDay(today()), earliestEnd(checkin, "exclusive"))} onChange={(v) => setCheckout(correctedEnd(checkin, v, "exclusive"))} className={bareInput} /></Field>
        <Field label="Guests"><input type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} className={bareInput} /></Field>
      </SearchGrid>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      <ActionRow onSearch={search} onAdd={() => addToTrip()} searchLabel={hotelButtonLabel()} />
    </div>
  );
}

/**
 * Car hire.
 *
 * The affiliate key was never passed in here at all — flights and hotels each
 * tagged their outgoing link and this one did not, so every car search opened
 * on Kayak untagged and earned nothing no matter what was configured. The
 * connections screen has always said KAYAK_AFFILIATE_PARAMS is "your affiliate
 * key for the flight AND CAR searches that open on Kayak", which was a promise
 * the code did not keep.
 */
function CarsForm({ onAdd, onOpened }: { onAdd: AddFn; onOpened: (b: PendingBooking) => void }) {
  const [loc, setLoc] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [error, setError] = useState("");

  function validate() {
    if (!loc.trim()) { setError("Enter a pick-up city or airport."); return false; }
    if (!pickup || !dropoff) { setError("Choose pick-up and drop-off dates."); return false; }
    if (dropoff < pickup) { setError("Drop-off must be on or after pick-up."); return false; }
    setError("");
    return true;
  }

  function search() {
    if (!validate()) return;
    openPartner({
      product: "car",
      destination: loc.trim(),
      checkIn: pickup,
      checkOut: dropoff,
      placement: "book-cars",
    });
    onOpened({
      kind: "car",
      summary: `${loc.trim()}, ${pickup} → ${dropoff}`,
      save: (confirmation) => addToTrip(confirmation),
    });
  }

  function addToTrip(confirmation?: string) {
    if (!validate()) return;
    const activities: ItinActivity[] = [{
      id: uid(),
      name: `Rental car — ${loc.trim()}`,
      date: pickup,
      notes: [`Drop-off ${dropoff}`, confirmation ? `Reference ${confirmation}` : ""].filter(Boolean).join(" · "),
      bookedOnSite: false,
    }];
    onAdd({ activities, dates: [pickup, dropoff] });
  }

  return (
    <div>
      <SearchGrid className="sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
        <Field label="Pick-up location"><AddressAutocomplete mode="city" value={loc} onChange={(city) => setLoc(city)} placeholder="City or airport" className={bareInput} /></Field>
        <Field label="Pick-up date"><DateField ariaLabel="Pick-up date" value={pickup} min={today()} onChange={(v) => { setPickup(v); setDropoff((d) => correctedEnd(v, d)); }} className={bareInput} /></Field>
        <Field label="Drop-off date"><DateField ariaLabel="Drop-off date" value={dropoff} min={notBefore(today(), earliestEnd(pickup))} onChange={(v) => setDropoff(correctedEnd(pickup, v))} className={bareInput} /></Field>
      </SearchGrid>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      <ActionRow onSearch={search} onAdd={() => addToTrip()} searchLabel="Search cars" />
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
          Still looking? Close this, book in the other tab, then use <strong>+ Add to my trip</strong> when you get back.
        </p>
      </div>
    </div>
  );
}

function ActionRow({ onSearch, onAdd, searchLabel }: { onSearch: () => void; onAdd: () => void; searchLabel: string }) {
  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
      <button type="button" onClick={onSearch} className="min-h-[52px] min-w-0 flex-1 rounded-full bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-[0_8px_20px_rgba(23,45,82,.14)] transition hover:bg-[var(--gold)]">{searchLabel} →</button>
      <button type="button" onClick={onAdd} className="min-h-[52px] min-w-0 rounded-full border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:border-[var(--navy)] hover:bg-[var(--navy)] hover:text-white">+ Add to my trip</button>
    </div>
  );
}

function TripTypeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 w-full rounded-full border px-2 text-[11px] font-bold uppercase tracking-[0.12em] transition sm:w-auto sm:px-4 ${active ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--gold-light)] bg-white text-stone-500 hover:border-[var(--gold)] hover:text-[var(--navy)]"}`}
    >
      {children}
    </button>
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
