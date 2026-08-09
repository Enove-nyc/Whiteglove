"use client";

import { useState } from "react";
import { placeDirectionsUrl, placeMapUrl, toDMS } from "@/data/route-utils";

/**
 * How to get to a kever: the address first, the coordinates underneath.
 *
 * It used to be the other way round — the coordinates set large in a bordered
 * box, the address a small grey line below it. That is backwards for a person.
 * "Górna 16, Leżajsk" is what you tell a driver, what you recognise when you
 * arrive, and what you can hold in your head. 50°15'04.1"N 22°25'21.4"E is
 * something you paste into a phone; nobody reads it, and nobody wants it as
 * the headline of the page.
 *
 * The coordinates stay, small and still one tap to copy, because they are what
 * gets you to the grave rather than to the gate — and the buttons still use
 * them in preference to the address for exactly that reason.
 */
export default function KeverCoordinates({
  coordinates,
  address,
  label = "How to get there",
}: {
  coordinates?: string;
  address?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState<"dms" | "decimal" | "address" | null>(null);
  const dms = toDMS(coordinates);
  const decimal = (coordinates ?? "").trim();
  const street = (address ?? "").trim();

  function copy(value: string, which: "dms" | "decimal" | "address") {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => undefined);
  }

  const linkClass =
    "inline-flex min-h-[44px] items-center text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2";

  return (
    <div className="border border-[var(--gold)] bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">{label}</p>

      {/* The address, as the headline. This is the thing a person reads out. */}
      {street ? (
        <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl leading-snug text-[var(--navy)]">{street}</p>
      ) : (
        <p className="mt-1.5 text-sm leading-6 text-stone-600">
          No street address recorded for this beis hachaim yet.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4">
        {/* Both of these already prefer the coordinates over the address when
            there are any — see mapsDestination. An address can resolve to the
            middle of a town; a coordinate lands on the kever. */}
        <a href={placeDirectionsUrl(address, coordinates)} target="_blank" rel="noreferrer" className={linkClass}>
          Navigate →
        </a>
        <a href={placeMapUrl(address, coordinates)} target="_blank" rel="noreferrer" className={linkClass}>
          Show on map →
        </a>
        {street && (
          <button type="button" onClick={() => copy(street, "address")} className={linkClass}>
            {copied === "address" ? "Copied!" : "Copy address"}
          </button>
        )}
      </div>

      {/* The coordinates, small, under the address — for the phone, not the eye. */}
      <div className="mt-3 border-t border-[var(--gold-light)] pt-3">
        {dms ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Exact coordinates</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={() => copy(dms, "dms")}
                className="select-all font-mono text-xs text-stone-500 underline decoration-[var(--gold-light)] underline-offset-2 hover:text-[var(--navy)]"
              >
                {copied === "dms" ? "Copied!" : dms}
              </button>
              {decimal && (
                <button
                  type="button"
                  onClick={() => copy(decimal, "decimal")}
                  className="font-mono text-[11px] text-stone-400 hover:text-[var(--navy)]"
                >
                  {copied === "decimal" ? "Copied!" : decimal}
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs leading-5 text-stone-500">
            The exact grave coordinates are not confirmed yet — go by the address and ask locally. We don&apos;t
            publish a coordinate we haven&apos;t checked.
          </p>
        )}
      </div>
    </div>
  );
}
