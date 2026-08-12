import { NextRequest, NextResponse } from "next/server";
import { findPlaces, timeZoneAt } from "@/lib/place-lookup";

// Finding the place somebody wants zmanim for.
//
// Server-side, so the visitor's browser never talks to OpenStreetMap directly:
// a search for "Boro Park" would otherwise carry their IP address to a third
// party, and the answer could not be cached for the next person to ask.
//
// Two questions, one route. ?q= is a search — a city, a town, a postcode, and
// the answer is every match with its country so the traveller picks. ?lat=&lon=
// is the timezone for coordinates they typed themselves.

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const lat = params.get("lat");
  const lon = params.get("lon");
  if (lat !== null && lon !== null) {
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return NextResponse.json({ timeZoneId: null }, { status: 400 });
    }
    return NextResponse.json(
      { timeZoneId: timeZoneAt(latitude, longitude) },
      { headers: { "Cache-Control": "public, max-age=86400" } },
    );
  }

  const places = await findPlaces(params.get("q") ?? "");
  return NextResponse.json(
    { places },
    {
      // A place name is not private and its coordinates do not change, so one
      // answer serves everybody who asks for the same town.
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    },
  );
}
