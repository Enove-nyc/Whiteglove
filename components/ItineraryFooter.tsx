import Link from "next/link";
import GloveMark from "@/components/GloveMark";
import PromotionBanner from "@/components/PromotionBanner";
import type { Promotion } from "@/lib/admin-content";

// The band at the bottom of an itinerary.
//
// An itinerary gets shared, printed and forwarded — it travels further than any
// other page on the site — so it is the one place worth signing. Any live
// promotion targeted at "Bottom of the itinerary" sits above the signature;
// with none set, the signature stands on its own rather than leaving a gap.
export default function ItineraryFooter({ promotion }: { promotion: Promotion | null }) {
  return (
    <div className="mt-14">
      {promotion && (
        <div className="mb-8">
          <PromotionBanner promotion={promotion} placement="itinerary-footer" />
        </div>
      )}

      <div className="border-t border-[var(--gold-light)] pt-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
              <GloveMark size="xs" />
              Planned with White Glove
            </p>
            <p className="mt-3 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
              White Glove Itineraries
            </p>
            <p className="mt-1 text-sm text-stone-600">
              Kevarim, kosher food and the whole trip — planned in one place at{" "}
              <span className="font-semibold text-[var(--navy)]">whitegloveitineraries.com</span>
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:shrink-0">
            <Link
              href="/contact"
              className="inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)] lg:w-52"
            >
              Have us plan it
            </Link>
            <Link
              href="/cemeteries"
              className="inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap border border-[var(--gold)] px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white lg:w-52"
            >
              Browse kevarim
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
