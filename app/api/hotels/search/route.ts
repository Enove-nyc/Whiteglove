import { NextResponse } from "next/server";
import { cityGuides, getCityGuide } from "@/data/destinations-detailed";
import { getDestinationRecord } from "@/data/destination-database";

export async function POST(request: Request) {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ message: "Hotel search will be available once the White Glove Duffel Stays account is connected.", detail: "Duffel Stays access must be enabled for the account before live hotel results can be shown." });

  const { destination, guests, checkInDate, checkOutDate } = await request.json();
  const slug = String(destination).trim().toLowerCase();
  const guide = getCityGuide(slug) ?? cityGuides.find((item) => [item.slug, item.city, ...(item.aliases ?? [])].some((value) => value.toLowerCase() === slug));
  const record = getDestinationRecord(slug);
  const coordinateValue = guide?.graveCoordinates ?? record?.cemeteries[0]?.coordinates;
  const coordinates = coordinateValue?.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!coordinates || !/^\d{4}-\d{2}-\d{2}$/.test(String(checkInDate)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(checkOutDate))) return NextResponse.json({ message: "Choose one of the White Glove destinations and valid stay dates." }, { status: 400 });

  const response = await fetch("https://api.duffel.com/stays/search", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", "Duffel-Version": "v2", Authorization: `Bearer ${token}` }, body: JSON.stringify({ data: { check_in_date: checkInDate, check_out_date: checkOutDate, rooms: 1, guests: Array.from({ length: Math.max(1, Number(guests) || 1) }, () => ({ type: "adult" })), location: { geographic_coordinates: { latitude: Number(coordinates[1]), longitude: Number(coordinates[2]) }, radius: 25 } } }), cache: "no-store" });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const detail = error?.errors?.[0]?.message ?? error?.message ?? (response.status === 401 || response.status === 403 ? "Duffel Stays access is not enabled for this token yet." : `Duffel returned an error (${response.status}).`);
    return NextResponse.json({ message: "Duffel could not complete this hotel search right now.", detail }, { status: 502 });
  }
  const result = await response.json();
  const hotels = (result.data?.results ?? []).slice(0, 12).map((item: { id: string; cheapest_rate_total_amount: string; cheapest_rate_currency: string; accommodation?: { name?: string; rating?: number; address?: { city_name?: string } } }) => ({ id: item.id, name: item.accommodation?.name ?? "Hotel", city: item.accommodation?.address?.city_name, rating: item.accommodation?.rating, totalAmount: item.cheapest_rate_total_amount, totalCurrency: item.cheapest_rate_currency }));
  return NextResponse.json({ message: hotels.length ? `${hotels.length} hotel options found.` : "No hotel options were returned for those dates.", hotels });
}
