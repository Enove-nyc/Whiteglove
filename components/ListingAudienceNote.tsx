/**
 * Shared customer-facing note for the listing-audience standard.
 * Wording lives in data/listing-audience.ts so every surface stays consistent.
 */

import { LISTING_AUDIENCE_COPY } from "@/data/listing-audience";

export default function ListingAudienceNote({ className }: { className?: string }) {
  return (
    <p className={className ?? "mt-4 max-w-2xl text-sm leading-7 text-stone-600"}>
      {LISTING_AUDIENCE_COPY}
    </p>
  );
}
