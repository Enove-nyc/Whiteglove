import { readWords } from "@/lib/site-words-store";
import { readExtras } from "@/lib/travel-extras-store";
import TravelEssentials from "@/components/TravelEssentials";
import TravelExtras from "@/components/TravelExtras";
import BookPartners from "@/components/BookPartners";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { pageMetadata } from "@/lib/seo";

// The one booking page.
//
// THE SEARCH IS THE PAGE. Somebody arriving here has already decided to
// search, so the fields come first and the page does the one job. The long
// "cash or points, side by side" comparison, the "rest of the trip"
// explanation cards for products that are not bookable here, the heritage
// aside and the "if a search is not what you came for" list were all cut at
// the owner's word — a booking page that explains what it does not book, and
// offers other doors, is a booking page getting in the way of the search.
//
// REWRITTEN AROUND A HOLIDAY, not around a kevarim route. It used to compare
// "airlines and routes to the towns your trip is built around" and explain how
// a booking sits "alongside the kevarim and destinations the journey is
// actually built around". Those sentences were written when the site was a
// heritage database with a travel page attached, and a family booking a week
// in Rome read them as evidence that this page was not for them.
//
// HOTELS OPENS. Accommodation is the one product this site knows something a
// comparison site does not — which quarter makes Shabbos walkable — so it is
// the tab that earns the visit.
export const metadata = pageMetadata({
  title: "Search Booking Partners | White Glove Kosher Travel",
  description:
    "Search places to stay, flights and rental cars — with cash or miles. Booking and payment happen with trusted partners.",
  path: "/book",
});

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    depart?: string;
    return?: string;
    type?: string;
    destination?: string | string[];
  }>;
}) {
  // The planner links here with the trip's dates already worked out, so nobody
  // has to type them a second time.
  const q = await searchParams;
  // The paragraph under the heading. /admin/settings/words.
  const words = await readWords();
  const extras = await readExtras();
  const clean = (v?: string) => (typeof v === "string" ? v.slice(0, 60) : undefined);
  // Trimmed and capped rather than printed as given: it lands in a text field
  // as though the visitor had typed it, and a link is not a trustworthy author.
  // A repeated ?destination= arrives as an array, which would render as one.
  const rawDestination = Array.isArray(q.destination) ? q.destination[0] : q.destination;
  const destination = (rawDestination ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const prefill = {
    from: clean(q.from),
    to: clean(q.to),
    depart: clean(q.depart),
    ret: clean(q.return),
    destination: destination || undefined,
  };
  // Which tab opens. Resolved here so the link lands on the right search
  // painted correctly, rather than on Hotels for a frame — see BookPartners.
  const initialKind = q.type === "flights" || q.type === "cars" || q.type === "hotels" ? q.type : "hotels";

  // THE ACCOUNT NUMBERS ARE NOT READ HERE ANY MORE, and that is the point.
  //
  // This page used to gather the Stay22 ID, the Travelpayouts marker, the
  // Booking.com affiliate ID and the pasted redirect links, and hand them to
  // BookPartners so it could build partner URLs in the browser. BookPartners
  // is a client component, so all of it was serialised into the page and
  // readable in view-source. The searches now post to /go, which resolves the
  // partner on the server — so there is nothing commercial left to pass down,
  // and nothing to leak.

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />
      {/* THE FIELDS COME FIRST. A headline, the owner's notice and a
          heritage aside used to sit above the panel: three blocks of reading
          before anybody could type a city. Somebody arriving here has already
          decided to search — the page's job is to let them, and everything
          worth saying still gets said underneath. */}
      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(2rem,5vw,3rem)] leading-[1.1] text-[var(--navy)]">
            Search booking partners
          </h1>
          <div className="mt-6">
            <BookPartners prefill={prefill} initialKind={initialKind} />
          </div>
          {/*
            One line, under the searches, always.
            It used to be here, then moved to Terms and to each partner action.
            That left /book itself covered only by accident: the disclosure a
            visitor saw came from the Travel Essentials block below, so on a
            deployment where that block is empty all three earning searches sat
            on the page with nothing said. This does not depend on anything
            else being filled in. Kept as small as it can be and still be read
            — the owner's sentence, no heading, no panel.
          */}
          <p className="mt-3 max-w-2xl text-[11px] leading-4 text-stone-500">{words.affiliateDisclosure}</p>
          {/* Under the search, where it is read by somebody who has finished
              typing. The owner's line: /admin/settings/words. */}
          <p className="mt-6 max-w-2xl leading-7 text-stone-600">{words.bookingNotice}</p>
        </div>
      </section>

      {/* Structured Travel Essentials first; free-form custom extras after.
          These are real, bookable partner hand-offs — the page's one job is the
          search, and these extend it rather than explaining what it does not
          do. */}
      <TravelEssentials pageType="book" placement="book-essentials" destinationName={destination || undefined} />
      <TravelExtras extras={extras} />

      <Footer />
    </main>
  );
}
