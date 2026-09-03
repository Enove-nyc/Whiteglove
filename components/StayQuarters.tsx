import { AffiliateDisclosure } from "@/components/BookingLink";
import { readAffiliateConfig } from "@/lib/affiliate/config";
import { goHref } from "@/lib/affiliate/request";
import { routeFor } from "@/lib/affiliate/partners";
import { offerableQuarters, quarterAddress, quarterRequest, type QuarterLike } from "@/lib/quarter-search";
import type { StaySearch } from "@/lib/stay-search";

/**
 * "Where should I stay?" — the quarters, each one searchable.
 *
 * This is the list /hotels already showed, with the one thing it was missing:
 * the quarter we recommend is now the quarter you can search. See
 * `lib/quarter-search.ts` for why that is an address string rather than a
 * partner filter.
 *
 * THE NOTE STAYS ABOVE THE BUTTON. The reason to be in a quarter is the reason
 * somebody is on this page instead of a comparison site, and a layout that put
 * the commercial action first would be a worse comparison site with our
 * research used as decoration. Same argument as the page's own ordering.
 *
 * NO BUTTON WHEN NOTHING IS CONNECTED. With no hotel programme joined,
 * `routeFor` reports no destination and the quarters render as the plain
 * reference list they were — the research is still worth reading when there is
 * nothing to earn from it. A dead button in its place would take a click and
 * give back a redirect to the homepage.
 *
 * A LINK RATHER THAN A FORM, because there is nothing left to type: the dates
 * and the party came from the search that produced this page. It is still a
 * GET to /go, so the partner address never reaches the markup and the click is
 * recorded before the redirect.
 */
export default async function StayQuarters({
  areas,
  search,
}: {
  areas: readonly QuarterLike[];
  search: StaySearch;
}) {
  const offerable = offerableQuarters(areas);
  if (offerable.length === 0) return null;

  const route = routeFor("hotel", await readAffiliateConfig());
  const searchable = Boolean(route.destinationLabel);

  return (
    <div className="border border-[var(--gold-light)] bg-[#FAF8F3] p-6 sm:p-8">
      <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Where should I stay?</h2>

      {/* TWO COLUMNS ON A DESKTOP, because there are thirty-two of these and
          one column of them was 7,512 pixels — over half the height of
          /hotels, above the directory somebody came for. Each row is already
          lean (a city, the quarter, a line about it, and the search); what was
          wrong was running them down the middle of a 1280px page.

          NOT CAPPED, unlike the other long lists on the site. Every one of
          these is an anchor that /stops, the map and the admin link straight
          to — /hotels#rome-ghetto — and an anchor inside display:none is a
          link that lands nowhere. Two columns costs nothing and breaks
          nothing. */}
      <ul className="mt-6 border-t border-[var(--gold-light)] md:grid md:grid-cols-2 md:gap-x-10">
        {offerable.map((area) => (
          <li key={area.slug} id={area.slug} className="scroll-mt-24 border-b border-[var(--gold-light)] py-5">
            <p className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">
              {area.city}, {area.country}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--gold-ink)]">{area.name}</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">{area.note}</p>

            {searchable && (
              <p className="mt-3">
                {/* min-h-[44px]: npm run audit:ui measures touch targets, and
                    caught this one at 38px on a 375px screen. */}
                <a
                  href={goHref(quarterRequest(area, search))}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-[var(--gold)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--navy)] shadow-sm transition hover:bg-[var(--gold-light)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]"
                >
                  {/* Named, so a screen reader moving button to button hears
                      which quarter each one searches rather than five
                      identical "see places to stay". */}
                  See places to stay in {area.name}
                  <span aria-hidden="true">→</span>
                </a>
                <span className="sr-only"> Searches {quarterAddress(area)} with our booking partner.</span>
              </p>
            )}
          </li>
        ))}
      </ul>

      {/* Adjacent to the commercial action, not only in the footer. */}
      {searchable && <AffiliateDisclosure className="mt-6 text-xs leading-5 text-stone-500" />}
    </div>
  );
}
