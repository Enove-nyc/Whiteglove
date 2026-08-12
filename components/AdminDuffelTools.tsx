"use client";

import { useState } from "react";
import AdminDuffelStays from "@/components/AdminDuffelStays";
import BookingSearch from "@/components/BookingSearch";

type Kind = "flights" | "hotels";

/**
 * Admin-only Duffel search. Flights can continue to ticketing; stays search
 * Duffel's API from this screen and nowhere else. Visitors use Stay22 on /book.
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
          Type a city or place. The search looks it up, then asks Duffel for stays nearby. If Stays is not enabled on
          the account, Duffel refuses and nothing is invented. There is no stay checkout here — continue in the Duffel
          dashboard.
        </p>
      ) : (
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
          Choose a flight to open traveler details and Duffel&rsquo;s card form. That step issues a ticket.
        </p>
      )}
      <div className="mt-6">
        {kind === "hotels" ? (
          <AdminDuffelStays />
        ) : (
          <BookingSearch only="flights" reviewHref="/admin/duffel/review" />
        )}
      </div>
    </div>
  );
}
