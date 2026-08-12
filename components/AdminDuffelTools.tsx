"use client";

import { useState } from "react";
import BookingSearch from "@/components/BookingSearch";

type Kind = "flights" | "hotels";

/**
 * Admin-only Duffel search. Flights can continue to ticketing; stays are
 * search-only until Duffel Stays is approved on the account.
 */
export default function AdminDuffelTools() {
  const [kind, setKind] = useState<Kind>("flights");

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3" data-choice-row="duffel search">
        {([
          ["flights", "Flights"],
          ["hotels", "Stays"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`min-h-11 w-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] sm:w-auto ${
              kind === value
                ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                : "border-[var(--gold-light)] text-[var(--navy)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {kind === "hotels" ? (
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
          Stay search needs Duffel Stays enabled on the account. If Duffel has not approved it, the search is refused
          and nothing is booked. There is no stay checkout here — only search.
        </p>
      ) : (
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
          Choose a flight to open traveler details and Duffel&rsquo;s card form. That step issues a ticket.
        </p>
      )}
      <div className="mt-6">
        <BookingSearch key={kind} only={kind} reviewHref="/admin/duffel/review" />
      </div>
    </div>
  );
}
