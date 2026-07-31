import Footer from "@/components/Footer";
import MyRouteDashboard from "@/components/MyRouteDashboard";
import Navbar from "@/components/Navbar";

import { pageMetadata } from "@/lib/seo";

// Private to one person. Nothing here belongs in a search result.
export const metadata = pageMetadata({
  title: "My Route | White Glove Itineraries",
  description: "The stops you have saved, in order, with driving times and directions.",
  path: "/my-route",
  noIndex: true,
});

export default function MyRoutePage() { return <main className="min-h-screen bg-[var(--cream)]"><Navbar /><MyRouteDashboard /><Footer /></main>; }
