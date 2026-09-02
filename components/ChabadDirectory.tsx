"use client";

import { useMemo, useState } from "react";
import { SaveListingButton } from "@/components/SaveListingButton";
import {
  CHABAD_FEATURE_KEYS,
  CHABAD_FEATURE_LABELS,
  chabadCountries,
  confirmedFeaturesOf,
  type ChabadListing,
  type ChabadFeatureKey,
} from "@/lib/chabad-directory";
import { placeMapUrl } from "@/data/route-utils";

const FEATURE_FILTERS = CHABAD_FEATURE_KEYS;
const PAGE_SIZE = 60;

/**
 * Search + filter UI for the Chabad House Finder.
 *
 * Client-side only, over the listings the server component already fetched
 * (there is no live database behind this directory yet — see
 * data/chabad-directory.ts). A card shows only the features that listing's
 * own source actually confirms; every unconfirmed feature is simply absent
 * from the card rather than shown as a "no", so the page never implies a
 * negative nobody checked.
 *
 * Search is sticky at the top of the results — with 2,000+ listings
 * worldwide, scrolling past the controls to search again is the failure
 * this fixes — and results render PAGE_SIZE at a time behind a "Show more"
 * button rather than every match at once, which is both an endless scroll
 * and a real render-cost problem at this size.
 */
export default function ChabadDirectory({ listings }: { listings: ChabadListing[] }) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [features, setFeatures] = useState<Set<ChabadFeatureKey>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const countries = useMemo(() => chabadCountries(listings), [listings]);

  const toggleFeature = (key: ChabadFeatureKey) => {
    setFeatures((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("en");
    return listings.filter((listing) => {
      if (country && listing.country !== country) return false;
      if (needle) {
        const haystack = `${listing.name} ${listing.city} ${listing.country} ${listing.address}`.toLocaleLowerCase("en");
        if (!haystack.includes(needle)) return false;
      }
      if (features.size > 0) {
        const confirmed = new Set(confirmedFeaturesOf(listing).map((feature) => feature.key));
        for (const key of features) if (!confirmed.has(key)) return false;
      }
      return true;
    });
  }, [listings, query, country, features]);

  // A new search or filter starts back at the first page — otherwise a
  // narrower result set could sit entirely past whatever page you'd already
  // scrolled to, and look empty.
  // Adjusted during render rather than after the commit: as an effect this
  // painted the old page size against the new results first — briefly showing
  // rows from a filter that no longer applies — and only then reset. Compared
  // by identity on the same three values the dep array named; `features` is
  // replaced wholesale rather than mutated, so identity is the right test.
  const [seenFilters, setSeenFilters] = useState({ query, country, features });
  if (seenFilters.query !== query || seenFilters.country !== country || seenFilters.features !== features) {
    setSeenFilters({ query, country, features });
    setVisibleCount(PAGE_SIZE);
  }

  const visible = filtered.slice(0, visibleCount);

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-5 border-b border-[var(--gold-light)] bg-[var(--cream)]/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex-1 sm:max-w-sm">
            <span className="sr-only">Search by name, city or country</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, city or country"
              autoFocus
              className="min-h-12 w-full rounded-full border-2 border-[var(--gold)] bg-[var(--surface)] px-5 text-base text-[var(--ink)] placeholder:text-stone-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
            />
          </label>

          <label className="sm:w-56">
            <span className="sr-only">Country</span>
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="min-h-11 w-full rounded-full border border-[var(--gold-light)] bg-[var(--surface)] px-4 text-sm text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
            >
              <option value="">All countries</option>
              {countries.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by confirmed feature">
            {FEATURE_FILTERS.map((key) => {
              const active = features.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFeature(key)}
                  aria-pressed={active}
                  className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition ${
                    active
                      ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                      : "border-[var(--gold-light)] bg-[var(--surface)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"
                  }`}
                >
                  {CHABAD_FEATURE_LABELS[key]}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mx-auto mt-3 max-w-7xl text-sm text-stone-500">
          {filtered.length} of {listings.length} listing{listings.length === 1 ? "" : "s"} match
          {query || country || features.size > 0 ? "" : " — search above or pick a country to narrow this down"}.
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 max-w-2xl leading-7 text-stone-600">
          No listing matches that search. Try clearing a filter, or search by country instead.
        </p>
      ) : (
        <>
          <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((listing) => (
              <ChabadCard key={listing.id} listing={listing} />
            ))}
          </ul>

          {visibleCount < filtered.length && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-sm text-stone-500">
                Showing {visible.length} of {filtered.length}.
              </p>
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="min-h-11 rounded-full border-2 border-[var(--navy)] bg-[var(--surface)] px-6 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
              >
                Show {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChabadCard({ listing }: { listing: ChabadListing }) {
  const confirmed = confirmedFeaturesOf(listing);
  return (
    <li className="flex flex-col rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
        {listing.city}, {listing.country}
      </p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <h3 className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">
          {listing.name}
        </h3>
        {/* A shul is one of the things people most want to keep hold of while
            planning, and it could not be saved at all. */}
        <SaveListingButton
          what="shul"
          place={{
            id: `shul-${listing.id}`,
            name: listing.name,
            address: listing.address || [listing.city, listing.country].filter(Boolean).join(", "),
          }}
        />
      </div>
      <p className="mt-2 text-sm leading-6 text-stone-600">{listing.address}</p>

      {confirmed.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {confirmed.map((feature) => (
            <li
              key={feature.key}
              className="rounded-full border border-[var(--gold-light)] bg-[var(--cream)] px-2.5 py-1 text-[11px] font-semibold text-[var(--navy)]"
            >
              {feature.label}
            </li>
          ))}
        </ul>
      )}

      {listing.reservation_required !== null && (
        <p className="mt-3 text-sm leading-6 text-stone-600">
          <span className="font-semibold text-[var(--navy)]">Reservation:</span>{" "}
          {listing.reservation_required ? "required" : "not required"}
        </p>
      )}

      {confirmed
        .filter((feature) => feature.notes)
        .map((feature) => (
          <p key={feature.key} className="mt-2 text-sm leading-6 text-stone-600">
            <span className="font-semibold text-[var(--navy)]">{feature.label}:</span> {feature.notes}
          </p>
        ))}

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {listing.phone && (
          <a
            href={`tel:${listing.phone.replace(/[^+\d]/g, "")}`}
            className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
          >
            Call
          </a>
        )}
        {listing.whatsapp && (
          <a
            href={`https://wa.me/${listing.whatsapp.replace(/[^\d]/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
          >
            WhatsApp
          </a>
        )}
        {listing.email && (
          <a
            href={`mailto:${listing.email}`}
            className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
          >
            Email
          </a>
        )}
        {listing.website && (
          <a
            href={listing.website}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
          >
            Website
          </a>
        )}
        <a
          href={placeMapUrl(listing.address)}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
        >
          Map
        </a>
        <a
          href={listing.source_url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
        >
          Official Chabad.org page
        </a>
      </div>

      <p className="mt-3 text-xs text-stone-400">Last verified {listing.last_verified}</p>
    </li>
  );
}
