import { pageMetadata } from "@/lib/seo";

// The print view is a client component, and a client component cannot export
// metadata — so it lives here, in the layout beside it.
//
// Private to one person, and noindexed: somebody's printed trip is not a
// search result, and the page renders from their own browser storage anyway,
// so a crawler would only ever see an empty one.
export const metadata = pageMetadata({
  title: "Print your itinerary | White Glove Kosher Travel",
  description: "A printable version of your trip.",
  path: "/itinerary/print",
  noIndex: true,
});

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return children;
}
