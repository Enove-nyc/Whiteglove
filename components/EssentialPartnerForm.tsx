"use client";

import { useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import DateField from "@/components/DateField";
import { goHref } from "@/lib/affiliate/request";
import type { TravelProduct } from "@/lib/affiliate/partners";
import { correctedEnd, earliestEnd, nextDay, notBefore, today } from "@/lib/date-range";

/**
 * On-site search for Travel Essentials landing products (tours, eSIM,
 * insurance, transfers). Submits through /go with destination and dates filled.
 * No live inventory API is wired for these desks; the partner takes payment.
 */

const fieldLabel = "text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500";
const bareInput =
  "mt-1 min-h-11 w-full min-w-0 border-0 bg-transparent p-0 text-[15px] font-normal normal-case tracking-normal text-[var(--navy)] outline-none placeholder:text-stone-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col justify-center bg-[#fcfaf6] px-4 py-2.5 transition focus-within:bg-white sm:py-3">
      <span className={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

export default function EssentialPartnerForm({
  product,
  offer = 0,
  name,
  blurb,
  cta,
  icon,
  page,
  placement,
  destinationSlug,
  defaultDestination = "",
  defaultCheckIn = "",
  defaultCheckOut = "",
  compact = false,
}: {
  product: TravelProduct;
  offer?: number;
  name: string;
  blurb: string;
  cta: string;
  icon: string;
  page: string;
  placement: string;
  destinationSlug?: string;
  defaultDestination?: string;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  /** Hide the card heading when the parent already named the product. */
  compact?: boolean;
}) {
  const [destination, setDestination] = useState(defaultDestination);
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [error, setError] = useState("");

  const wantsPlace =
    product === "activity" || product === "esim" || product === "transfer" || product === "insurance" || product === "programme";
  const wantsDates = product === "insurance" || product === "activity" || product === "programme";
  const wantsOneDate = product === "transfer";

  function open() {
    if (wantsPlace && !destination.trim()) {
      setError(product === "esim" ? "Enter a country or city." : "Enter a city or destination.");
      return;
    }
    if (wantsOneDate && !checkIn) {
      setError("Choose an arrival date.");
      return;
    }
    if (wantsDates && (!checkIn || !checkOut)) {
      setError("Choose both dates.");
      return;
    }
    if (wantsDates && checkOut <= checkIn) {
      setError("The end date must be after the start.");
      return;
    }
    setError("");
    if (typeof window === "undefined") return;
    window.open(
      goHref({
        product,
        destination: destination.trim(),
        destinationSlug,
        checkIn: checkIn || undefined,
        checkOut: wantsDates ? checkOut : undefined,
        offer,
        page,
        placement,
      }),
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="flex h-full flex-col justify-between border-t border-[var(--gold-light)] bg-transparent pt-5">
      {compact ? null : (
      <div>
        <p className="text-lg leading-none text-[var(--gold-ink)]" aria-hidden="true">
          {icon}
        </p>
        <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">{name}</h3>
        <p className="mt-2 text-sm leading-6 text-stone-600">{blurb}</p>
      </div>
      )}

      <div className="mt-5">
        <div className="grid gap-px overflow-visible rounded-2xl border border-[var(--gold-light)] bg-[var(--gold-light)]">
          {wantsPlace ? (
            <Field
              label={
                product === "esim"
                  ? "Country or city"
                  : product === "transfer"
                    ? "Airport or city"
                    : product === "programme"
                      ? "Place or programme"
                      : "Destination"
              }
            >
              <AddressAutocomplete
                mode="city"
                value={destination}
                onChange={(city) => setDestination(city)}
                placeholder={product === "esim" ? "Country or city" : "City or town"}
                className={bareInput}
              />
            </Field>
          ) : null}
          {wantsOneDate ? (
            <Field label="Arrival date">
              <DateField ariaLabel="Arrival date" value={checkIn} min={today()} onChange={setCheckIn} className={bareInput} />
            </Field>
          ) : null}
          {wantsDates ? (
            <>
              <Field label="From">
                <DateField
                  ariaLabel="Start date"
                  value={checkIn}
                  min={today()}
                  onChange={(v) => {
                    setCheckIn(v);
                    setCheckOut((c) => correctedEnd(v, c, "exclusive"));
                  }}
                  className={bareInput}
                />
              </Field>
              <Field label="Until">
                <DateField
                  ariaLabel="End date"
                  value={checkOut}
                  min={notBefore(nextDay(today()), earliestEnd(checkIn, "exclusive"))}
                  onChange={(v) => setCheckOut(correctedEnd(checkIn, v, "exclusive"))}
                  className={bareInput}
                />
              </Field>
            </>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
        <button
          type="button"
          onClick={open}
          className="mt-4 inline-flex min-h-11 items-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]"
        >
          {cta}
          <span className="sr-only"> — opens in a new tab</span>
        </button>
      </div>
    </div>
  );
}
