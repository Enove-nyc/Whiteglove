import Link from "next/link";
import DestinationSearch from "@/components/DestinationSearch";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Travel information | White Glove Kosher Travel", description: "Find kosher food, places to visit and practical information while you travel.", path: "/travel" });
const sections = [
  ["/kosher", "Kosher food", "Restaurants, bakeries and groceries"],
  ["/destinations", "Destinations", "Find your bearings in a city or region"],
  ["/things-to-do", "Things to do", "Places to visit and family activities"],
  ["/hotels", "Where to stay", "Hotels, apartments and local details"],
  ["/map", "Map", "Explore the places around you"],
  ["/directory", "Local help", "Useful contacts and local services"],
];
export default function TravelAppHome() {
  return <main className="min-h-screen bg-[linear-gradient(150deg,#eef8f7,#faf8f3_65%,#f5efe3)] px-5 py-8 text-[#102F35]">
    <section className="mx-auto max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-600">Wherever you are</p><h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight">Find what you need.</h1><p className="mt-3 text-sm leading-6 text-stone-600">Search destinations, kosher food, shuls, places to stay and practical travel information.</p>
      <div className="relative z-10 mt-6"><DestinationSearch id="travel-app-search" placeholder="Search places and travel info" showChrome={false} /></div>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">{sections.map(([href, title, detail]) => <Link key={href} href={href} className="rounded-2xl border border-[#d8e5df] bg-white/90 p-5 shadow-sm"><h2 className="text-base font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{detail}</p></Link>)}</div>
      <Link href="/travel/assistant" className="mt-5 block rounded-2xl border border-[#d8e5df] bg-[#e5f1ed] p-5"><h2 className="text-base font-semibold">Ask the AI companion</h2><p className="mt-2 text-sm leading-6 text-stone-600">Ask a travel question and explore suggestions. AI answers are clearly identified.</p></Link>
    </section>
  </main>;
}
