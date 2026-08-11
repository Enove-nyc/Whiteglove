/**
 * What the vacation list should grow into, and the order to build it in.
 *
 * WHY A FILE AND NOT A DOCUMENT. The first South Florida batch has made the
 * beach category broad enough to browse, but the list is still weighted toward
 * European cities. The obvious fix is to write twenty more destination records
 * — and it is the wrong fix, because
 * a record on its own renders as a page of honest empty states. The practical
 * sections of a destination page are DERIVED from data/kosher-eateries.ts,
 * data/kosher-stays.ts, data/attractions.ts and the quarters in kosherAreas
 * (see lib/vacation-ideas.ts); a destination whose cities join to none of them
 * is truthful and useless, and twenty of those would make the site bigger and
 * worth less.
 *
 * So the work is not "write destinations". It is "gather the evidence for a
 * place, then the destination record is the last twenty minutes of it". This
 * file is that queue: what we intend to cover, which towns each one joins
 * against, and what has to be on record before it is published.
 *
 * NOTHING HERE IS PUBLISHED. Nothing in this file renders on the site. A
 * candidate becomes a destination by being added to vacationDestinations, and
 * lib/destination-readiness.ts decides whether it may be — five checks, from
 * the data itself, printed by `npm run audit:pipeline` and asserted by a test.
 * A candidate that has not cleared them stays here.
 *
 * NO CLAIMS ARE MADE HERE. A candidate says its name, the towns it would cover
 * and what still has to be found out. It does not say a town has kosher food,
 * how good it is, or that we will be able to publish it — several of these may
 * turn out to have too little behind them, and the honest end of that is that
 * they stay in this file.
 */

import type { Season, TripTheme } from "@/data/vacation-destinations";

/**
 * The ten groups the expansion is for.
 *
 * Written as the brief named them, because they are what a customer asks for
 * rather than what the data model happens to call things. `theme` maps each
 * onto the categories the site already filters by; where a group has no theme
 * yet, `newTheme` names the one it would need — and it is not added to
 * TRIP_THEMES until there is something behind it, for the same reason the hub
 * does not render an empty filter.
 */
export type PipelineGroup = {
  id: string;
  label: string;
  /** Why this group, in the customer's terms rather than ours. */
  rationale: string;
  themes: readonly TripTheme[];
  /** A category the site does not have yet, and would need for this group. */
  newTheme?: { value: string; label: string };
};

export const PIPELINE_GROUPS: readonly PipelineGroup[] = [
  {
    id: "south-florida",
    label: "South Florida",
    rationale:
      "The most-travelled kosher vacation route out of the American north-east. Miami Beach and Hollywood/Hallandale are published; deepen the region only when the next listings clear the same bar.",
    themes: ["beach", "family", "couples"],
  },
  {
    id: "orlando",
    label: "Orlando",
    rationale: "The family trip that gets planned around the food problem rather than the parks. Answering the food problem is the whole value.",
    themes: ["family"],
  },
  {
    id: "new-york-getaways",
    label: "New York getaways",
    rationale:
      "The Catskills, the Poconos and the Hudson Valley — a drive rather than a flight, which is a different kind of trip and the one people take most often.",
    themes: ["short-break", "family", "mountains"],
  },
  {
    id: "los-angeles",
    label: "Los Angeles",
    rationale: "A large kehilla, a walkable quarter, and a coast — the west-coast counterpart to the Florida route.",
    themes: ["city", "family", "beach"],
  },
  {
    id: "israel-regions",
    label: "Israeli vacation regions and resorts",
    rationale:
      "The site has Jerusalem and nothing else in Israel. Eilat, the Kinneret, the Golan, Netanya and the Dead Sea are holidays rather than pilgrimages, and they are missing.",
    themes: ["beach", "family", "couples", "mountains"],
  },
  {
    id: "caribbean-mexico",
    label: "Caribbean and Mexican resorts",
    rationale:
      "Where a kosher beach holiday actually happens in winter, and almost always as a seasonal programme rather than a permanent kitchen — which is the fact that decides the trip.",
    themes: ["beach", "couples", "family"],
  },
  {
    id: "mediterranean-beaches",
    label: "Mediterranean beaches",
    rationale:
      "Greece, southern Italy, the Spanish coast and the Turkish coast. The site's Mediterranean coverage is cities; the beach half of the same region is empty.",
    themes: ["beach", "family", "couples"],
  },
  {
    id: "winter-and-ski",
    label: "Winter and ski vacations",
    rationale:
      "The four alpine destinations already here are written for summer walking. Ski is a different trip with a different Shabbos problem, and it deserves its own category once there is more than one of it.",
    themes: ["mountains"],
    newTheme: { value: "ski", label: "Winter and ski" },
  },
  {
    id: "seasonal-programmes",
    label: "Seasonal kosher programs",
    rationale:
      "Pesach, Sukkos and summer programmes are how a large share of kosher travel is actually booked, and the site already models the thing that matters about them — a season, after which the room is there and the food is not.",
    themes: [],
    newTheme: { value: "seasonal-programme", label: "Seasonal kosher programme" },
  },
  {
    id: "domestic-weekends",
    label: "Domestic weekend getaways",
    rationale:
      "Two nights, a car, and somewhere to be for Shabbos. The shortest trip the site can be useful about, and the one with the least competition.",
    themes: ["short-break", "family"],
  },
] as const;

/**
 * One place we intend to cover, and what stands between it and publication.
 *
 * `cities` are the names the evidence has to be filed under. They are written
 * here first, deliberately: the commonest way a destination page comes out
 * empty is a city spelled one way in data/attractions.ts and another way in
 * the destination record, and agreeing the spelling before the research starts
 * is cheaper than finding it afterwards.
 */
export type PipelineCandidate = {
  /** The slug it would be published under. */
  slug: string;
  name: string;
  country: string;
  group: PipelineGroup["id"];
  cities: readonly string[];
  /** Where the food would come from, when the place itself has none. */
  kosherBase?: readonly string[];
  seasons: readonly Season[];
  /**
   * What has to exist before this is written up, in the order it should be
   * gathered. Every line names a file, because that is where the work lands.
   */
  needs: readonly string[];
};

/**
 * The queue.
 *
 * ORDERED BY HOW MANY PEOPLE ASK FOR IT, not by how easy it is. South Florida
 * has its first publishable pair; the remaining candidates are the next
 * places a visitor is likely to look for. Within a group, the place with the
 * largest existing kehilla comes first, because that is where the evidence is
 * easiest to stand behind.
 */
export const PIPELINE: readonly PipelineCandidate[] = [
  {
    slug: "catskills",
    name: "The Catskills",
    country: "United States",
    group: "new-york-getaways",
    cities: ["Monticello", "Woodbourne", "Fallsburg"],
    seasons: ["summer", "autumn"],
    needs: [
      "Seasonal provision recorded AS seasonal, with the season written in — the field exists for exactly this, and turning up in November to a summer kitchen is the failure it prevents.",
      "Quarters or the honest absence of them.",
      "Attractions: what there is to do that is not the bungalow colony.",
      "A transport note written for a drive rather than a flight.",
    ],
  },
  {
    slug: "hudson-valley",
    name: "The Hudson Valley",
    country: "United States",
    group: "new-york-getaways",
    cities: ["Kingston", "Poughkeepsie", "Monroe"],
    kosherBase: ["Monsey"],
    seasons: ["spring", "summer", "autumn"],
    needs: [
      "A base-town note: this is the American version of the alpine case, and the site already knows how to say it.",
      "Attractions with Shabbos notes.",
      "At least one stay or quarter in the region itself, or it fails the somewhere-to-stay check and stays here.",
    ],
  },
  {
    slug: "los-angeles",
    name: "Los Angeles",
    country: "United States",
    group: "los-angeles",
    cities: ["Los Angeles", "Beverly Hills", "Santa Monica"],
    seasons: ["spring", "summer", "autumn", "winter"],
    needs: [
      "The Pico-Robertson and Fairfax quarters with published coordinates.",
      "Eateries with their certifying agency named.",
      "Stays inside walking distance of a quarter.",
      "Attractions with Shabbos notes, and a transport note that is honest about needing a car.",
    ],
  },
  {
    slug: "eilat",
    name: "Eilat",
    country: "Israel",
    group: "israel-regions",
    cities: ["Eilat"],
    seasons: ["winter", "spring", "autumn"],
    needs: [
      "Hotels and their kashrus claim state — the whole town is a resort strip and which hotel is which is the entire question.",
      "Whether the strip is walkable to a minyan, from a coordinate.",
      "Attractions with Shabbos notes.",
      "A transport note covering both the flight and the drive from the centre.",
    ],
  },
  {
    slug: "kinneret-and-galil",
    name: "The Kinneret and the Galil",
    country: "Israel",
    group: "israel-regions",
    cities: ["Tiberias", "Safed"],
    seasons: ["spring", "summer", "autumn"],
    needs: [
      "Stays with their kashrus claim state.",
      "Quarters, which both towns plausibly have and neither has a record for yet.",
      "Attractions with Shabbos notes.",
      "Note: both towns already appear in the heritage side of the site. The vacation record must not simply inherit that — a kever is not an answer to where to eat.",
    ],
  },
  {
    slug: "netanya",
    name: "Netanya",
    country: "Israel",
    group: "israel-regions",
    cities: ["Netanya"],
    seasons: ["spring", "summer", "autumn"],
    needs: ["Quarters, stays, eateries and attractions — the standard five. The beach and the kehilla are in the same place, which is what makes it worth doing early."],
  },
  {
    slug: "dead-sea",
    name: "The Dead Sea",
    country: "Israel",
    group: "israel-regions",
    cities: ["Ein Bokek"],
    kosherBase: ["Jerusalem"],
    seasons: ["winter", "spring", "autumn"],
    needs: [
      "Hotels and their kashrus claim state.",
      "Whether there is a minyan on the strip, from a record rather than an assumption.",
      "A base-town note for anything that has to be brought in.",
    ],
  },
  {
    slug: "cancun-riviera-maya",
    name: "Cancún and the Riviera Maya",
    country: "Mexico",
    group: "caribbean-mexico",
    cities: ["Cancún", "Playa del Carmen"],
    seasons: ["winter", "spring"],
    needs: [
      "Seasonal programmes recorded with their season — this is the case the season field exists for, and publishing one without it would be the specific failure the site is built to avoid.",
      "Whether anything runs outside a programme week, and the honest answer if nothing does.",
      "Attractions with Shabbos notes.",
    ],
  },
  {
    slug: "greek-islands",
    name: "The Greek islands",
    country: "Greece",
    group: "mediterranean-beaches",
    cities: ["Rhodes", "Corfu"],
    kosherBase: ["Athens"],
    seasons: ["summer", "autumn"],
    needs: [
      "A base-town note for Athens: this is the alpine case at sea level, and it is the most useful sentence the page will contain.",
      "Whichever quarters or stays exist on the islands themselves, or the honest absence.",
      "Attractions with Shabbos notes.",
    ],
  },
  {
    slug: "costa-del-sol",
    name: "The Costa del Sol",
    country: "Spain",
    group: "mediterranean-beaches",
    cities: ["Marbella", "Torremolinos"],
    kosherBase: ["Málaga"],
    seasons: ["spring", "summer", "autumn"],
    needs: ["Quarters, stays and eateries, or a base-town note. Marbella has a kehilla; the record for it does not exist here yet."],
  },
  {
    slug: "st-moritz-engadin",
    name: "St. Moritz and the Engadin",
    country: "Switzerland",
    group: "winter-and-ski",
    cities: ["St. Moritz"],
    kosherBase: ["Zurich"],
    seasons: ["winter"],
    needs: [
      "Seasonal kosher hotels with their season written in.",
      "A base-town note for Zurich, which the site already holds the other half of.",
      "A winter transport note: the pass roads and the train are the trip, and they close.",
      "This one needs the ski category. A category is added when three destinations sit behind it, not when the first does.",
    ],
  },
  {
    slug: "berkshires-and-vermont",
    name: "The Berkshires and southern Vermont",
    country: "United States",
    group: "domestic-weekends",
    cities: ["Great Barrington", "Manchester"],
    kosherBase: ["Albany"],
    seasons: ["summer", "autumn", "winter"],
    needs: [
      "A base-town note, and whatever stays exist.",
      "Attractions with Shabbos notes.",
      "A transport note written for a two-night drive.",
    ],
  },
] as const;

/**
 * When a new filter category earns its place.
 *
 * THREE. The hub already refuses to render a filter with nothing behind it,
 * and the front page stopped printing the counts because "Beach and resort · 1"
 * says more about how far this section has got than about the holiday. One
 * destination behind a category is the same problem with a new name on it.
 */
export const NEW_THEME_THRESHOLD = 3;

export function candidatesIn(group: PipelineGroup["id"]): PipelineCandidate[] {
  return PIPELINE.filter((candidate) => candidate.group === group);
}
