import { notFound } from "next/navigation";
import FindTravelPage from "@/components/FindTravelPage";
import type { TravelTab } from "@/lib/travel-tabs";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";
import { BRAND_NAME } from "@/lib/site-brand-core";

/**
 * One search on its own page (owner, 20 November 2026: on a phone "everything
 * by Find Travel with a separate page", not tabs). The home page lists these on
 * a phone and the Find travel menu opens them; on a computer the home page
 * still carries all of them as tabs. Transfers, eSIMs and Travel insurance keep
 * the pages they already had (/transfers, /esim, /travel-insurance).
 */
const PAGES: Record<string, { tab: TravelTab; title: string; lead: string }> = {
  flights: { tab: "flights", title: "Flights", lead: "Compare airlines and fares, then book with our travel partner." },
  hotels: { tab: "hotels", title: "Hotels", lead: "Hotels, apartments and guesthouses, compared across booking sites." },
  "car-rentals": { tab: "cars", title: "Car rentals", lead: "Compare rental companies, with a different drop-off place if you need one." },
  "things-to-do": { tab: "activities", title: "Things to do", lead: "Tours, tickets and day trips for wherever you are going." },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const page = PAGES[(await params).slug];
  if (!page) return {};
  const brand = await currentBrand();
  return pageMetadata({
    title: `${page.title} | ${BRAND_NAME[brand]}`,
    description: page.lead,
    path: `/find/${(await params).slug}`,
    brand,
  });
}

export default async function FindPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const query = await searchParams;
  const first = (key: string) => { const v = query[key]; return (Array.isArray(v) ? v[0] : v)?.slice(0, 80) || undefined; };
  const prefill = { from: first("from"), to: first("to"), depart: first("depart"), ret: first("return"), destination: first("destination") };
  const page = PAGES[slug];
  if (!page) notFound();
  return <FindTravelPage tab={page.tab} title={page.title} path={`/find/${slug}`} prefill={prefill} />;
}
