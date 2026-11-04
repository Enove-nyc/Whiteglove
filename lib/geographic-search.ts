import type { SearchDocument } from "@/lib/site-search-types";
import { canonicalCountry, cityNames, geographicKey, geographicTerms } from "@/lib/destination-geography";

type Place = { city: string; country: string };
type Destination = { name: string; cities: readonly string[]; country: string };
type Draft = Omit<SearchDocument, "normTokens" | "normCompact">;

/** Country/city doors lead to real published listings, including cities without a full guide. */
export function geographicSearchDocuments(places: readonly Place[], destinations: readonly Destination[]): Draft[] {
  const countries = new Map<string, string>();
  const cities = new Map<string, Place>();
  const covered = new Set(destinations.flatMap((d) => d.cities.map((city) => `${geographicKey(city)}|${geographicKey(canonicalCountry(d.country))}`)));
  for (const place of places) {
    if (!place.city.trim() || !place.country.trim()) continue;
    const country = canonicalCountry(place.country);
    countries.set(geographicKey(country), country);
    const key = `${geographicKey(place.city)}|${geographicKey(country)}`;
    if (!cities.has(key)) cities.set(key, { city: place.city, country });
  }
  const docs: Draft[] = [];
  for (const country of countries.values()) {
    docs.push({
      id: `country-${geographicKey(country).replaceAll(" ", "-")}`,
      kind: "Vacation destination", section: "Vacation", title: country,
      subtitle: "Explore cities, culture and things to do",
      href: `/things-to-do?${new URLSearchParams({ country })}`,
      names: geographicTerms("", country).filter(Boolean), keywords: ["country", "destinations", "culture", "sightseeing"],
      body: "", country, rankWeight: 0, heritage: false, vacation: true,
    });
  }
  for (const [key, { city, country }] of cities) {
    if (covered.has(key)) continue; // A full destination guide is the stronger city result.
    docs.push({
      id: `city-${key.replaceAll(" ", "-")}`,
      kind: "Vacation destination", section: "Vacation", title: city,
      subtitle: `${country} · Explore things to do`,
      href: `/things-to-do?${new URLSearchParams({ country, city })}`,
      names: [...cityNames(city), `${city} ${country}`], keywords: ["city", "culture", "sightseeing", ...geographicTerms(city, country)],
      body: "", city, country, rankWeight: 1, heritage: false, vacation: true,
    });
  }
  return docs;
}
