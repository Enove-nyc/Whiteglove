import Footer from "@/components/Footer";
import MyRouteDashboard from "@/components/MyRouteDashboard";
import Navbar from "@/components/Navbar";
import { allCrossings } from "@/lib/border-store";

import { pageMetadata } from "@/lib/seo";

// Private to one person. Nothing here belongs in a search result.
export const metadata = pageMetadata({
  title: "My Route | White Glove Itineraries",
  description: "The stops you have saved, in order, with driving times and directions.",
  path: "/my-route",
  noIndex: true,
});

// The route itself lives on the signed-in account. Which crossings exist and
// what was found at them does not — so it is read here and handed down.
export const dynamic = "force-dynamic";

export default async function MyRoutePage() {
  const crossings = await allCrossings();
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <MyRouteDashboard crossings={crossings} today={new Date().toISOString().slice(0, 10)} />
      <Footer />
    </main>
  );
}
