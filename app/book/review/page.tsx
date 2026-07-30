import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import FlightReview from "@/components/FlightReview";
import { pageMetadata } from "@/lib/seo";

// Step two of the one booking flow. It was /booking/review; that address still
// works and redirects here (see next.config.ts).
//
// The flight being reviewed comes from sessionStorage, so this page is
// personal and momentary — there is nothing here for a search engine to index,
// and a crawler that found it would only ever see "Choose a flight first."
export const metadata = pageMetadata({
  title: "Review Your Flight | White Glove Itineraries",
  description: "Confirm the flight you selected and enter traveler details before booking.",
  path: "/book/review",
  noIndex: true,
});

export default function BookReviewPage() {
  return <main className="min-h-screen bg-[var(--cream)]"><Navbar /><FlightReview /><Footer /></main>;
}
