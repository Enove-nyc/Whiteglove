// Where to sleep, and how far that is from everything you need.
//
// Three honesties this file is built around, because getting any of them wrong
// costs somebody a Shabbos:
//
// 1. WHETHER A HOTEL IS KOSHER IS A KASHRUS CLAIM. It is the same kind of claim
//    as a hechsher on a restaurant, and this site does not make it on its own
//    authority. Every entry says what the source says and who the source is,
//    and `ownerVerified` stays false until somebody here has actually checked.
//
// 2. MOST ALPINE KOSHER HOTELS ARE SEASONS, NOT PLACES. A hotel in Arosa or
//    Engelberg is an ordinary hotel that a caterer turns into a kosher one for
//    a few weeks a year. Turning up in November at a hotel that ran a kosher
//    programme in August gets you a room and nothing to eat. Every seasonal
//    entry says so in the season field, and none of them is listed as though
//    it were open all year.
//
// 3. "NEAR THE JEWISH QUARTER" IS THE FACT THAT DECIDES THE TRIP. So each stay
//    carries an `anchor` — the shul or quarter it sits by, with that anchor's
//    real published coordinate. Distances on the site are then measured from
//    the anchor, which is a thing we can stand behind, rather than from a hotel
//    coordinate we would have had to guess at.
//
// The anchors are useful on their own. Somebody who has not chosen a hotel yet
// is really asking "which part of this city do I stay in", and the anchor list
// answers that.

export type StayKind =
  | "Kosher hotel"
  | "Kosher B&B"
  | "Seasonal kosher programme"
  | "Kosher-friendly, in the Jewish quarter";

/** The shul or quarter a stay is measured from. Public, published locations. */
export type StayAnchor = {
  name: string;
  /** "lat, lng" — the anchor's own position, not the hotel's. */
  coordinates: string;
};

export type KosherStay = {
  slug: string;
  name: string;
  city: string;
  country: string;
  kind: StayKind;
  summary: string;
  /** What the anchor is and where. Distances are measured from here. */
  anchor: StayAnchor;
  /** Present only for a seasonal programme. Absence means "not seasonal". */
  season?: string;
  notes?: string[];
  website?: string;
  /**
   * False until somebody here has confirmed the kashrus with the hotel or its
   * mashgiach. Nothing on the site presents an unverified stay as certified.
   */
  ownerVerified: boolean;
  sourceUrl: string;
};

/**
 * The Jewish quarters themselves, with published coordinates.
 *
 * These answer "which part of town do I stay in", which is the question people
 * ask before they have picked a hotel at all.
 */
export const kosherAreas: Array<{ city: string; country: string; name: string; coordinates: string; note: string; sourceUrl: string }> = [
  {
    city: "Rome",
    country: "Italy",
    name: "The Ghetto — around the Great Synagogue and Via del Portico d'Ottavia",
    coordinates: "41.8921, 12.4780",
    note: "The kosher restaurants, the bakeries and the Great Synagogue are in the same few streets, and it is walkable to the Forum and the river. This is where a kosher Rome trip is based.",
    sourceUrl: "https://en.wikipedia.org/wiki/Great_Synagogue_of_Rome",
  },
  {
    city: "Milan",
    country: "Italy",
    name: "Around Via Sally Mayer and the Via Guastalla synagogue",
    coordinates: "45.4580, 9.1560",
    note: "Milan's kosher infrastructure is the largest in Italy and sits away from the Duomo, roughly 3 km out. Staying by the sights means a journey to every meal.",
    sourceUrl: "https://en.wikipedia.org/wiki/Milan_Synagogue",
  },
  {
    city: "Paris",
    country: "France",
    name: "The Pletzl — rue des Rosiers and the Marais",
    coordinates: "48.8571, 2.3599",
    note: "Central Paris's kosher food, the Agudath Hakehilot shul and a walk to the Seine, Notre-Dame and the Louvre. The 19th arrondissement has more kosher food again, but is further from the sights.",
    sourceUrl: "https://en.wikipedia.org/wiki/Marais",
  },
  {
    city: "Zurich",
    country: "Switzerland",
    name: "Wiedikon",
    coordinates: "47.3690, 8.5170",
    note: "The shuls, the kosher shops and the eruv are here, about 2 km from the old town. For Shabbos this is the only sensible part of Zurich to be in.",
    sourceUrl: "https://en.wikipedia.org/wiki/Z%C3%BCrich-Wiedikon",
  },
  {
    city: "Nice",
    country: "France",
    name: "Around the Boulevard Dubouchage synagogue",
    coordinates: "43.7020, 7.2700",
    note: "Nice has a real kosher community, which is what makes the Côte d'Azur workable for a family when most of the French coast is not.",
    sourceUrl: "https://en.wikipedia.org/wiki/Nice",
  },
];

export const kosherStays: KosherStay[] = [
  // ---- Italy ----------------------------------------------------------
  {
    slug: "rome-ghetto-quarter-stays",
    name: "Staying inside the Roman Ghetto",
    city: "Rome",
    country: "Italy",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary:
      "Several small hotels and apartment lets sit inside the quarter, within a few minutes of the Great Synagogue and the kosher restaurants. They are ordinary hotels in a kosher neighbourhood rather than kosher hotels, and some arrange a kosher breakfast on request.",
    anchor: { name: "Great Synagogue of Rome", coordinates: "41.8921, 12.4780" },
    notes: [
      "The distinction matters: a hotel here is not under supervision. What you are buying is the position — food, shul and a walkable Shabbos — not a kosher kitchen.",
      "Ask specifically whether a kosher breakfast is arranged and under whose hechsher, rather than accepting 'kosher available'.",
      "Rome's kosher restaurants are almost all in these streets, so the walk to dinner is minutes rather than a journey.",
    ],
    website: "https://www.totallyjewishtravel.com/kosherhotels-TJ7742-Roman_Ghetto_Rome-Observant_Friendly_Accommodation.html",
    ownerVerified: false,
    sourceUrl: "https://www.totallyjewishtravel.com/kosherhotels-TJ7742-Roman_Ghetto_Rome-Observant_Friendly_Accommodation.html",
  },
  {
    slug: "milan-chezromyk",
    name: "Chezromyk — kosher B&B",
    city: "Milan",
    country: "Italy",
    kind: "Kosher B&B",
    summary: "A small kosher bed and breakfast in Milan, listed on the mainstream booking sites as well as the Jewish travel directories.",
    anchor: { name: "Milan's kosher quarter, around Via Sally Mayer", coordinates: "45.4580, 9.1560" },
    notes: [
      "Small, so it books out; Milan's kosher accommodation is thin and this is one of the few named options.",
      "Confirm the hechsher on the breakfast directly with the owners before relying on it.",
    ],
    ownerVerified: false,
    sourceUrl: "https://www.booking.com/hotel/it/chezromyk-the-kosher-b-amp-b.html",
  },

  // ---- France ---------------------------------------------------------
  {
    slug: "paris-marais-stays",
    name: "Staying in the Marais, by the Pletzl",
    city: "Paris",
    country: "France",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary:
      "The practical base for a kosher Paris trip: rue des Rosiers and the streets around it hold most of central Paris's kosher food and the Agudath Hakehilot shul, and the Louvre and the Seine are a walk away.",
    anchor: { name: "Rue des Rosiers, the Pletzl", coordinates: "48.8571, 2.3599" },
    notes: [
      "The 19th arrondissement has more kosher food and more minyanim, but it is a long way from the sights. The Marais is the compromise most families want.",
      "For Shabbos the walkability is the whole point — food, shul and somewhere to walk on Shabbos afternoon, without a metro.",
      "None of the hotels here is under supervision. As in Rome, what you are choosing is the position.",
    ],
    ownerVerified: false,
    sourceUrl: "https://en.wikipedia.org/wiki/Marais",
  },

  // ---- Switzerland ----------------------------------------------------
  {
    slug: "arosa-levin-metropol",
    name: "Levin's Kosher Hotel, Arosa",
    city: "Arosa",
    country: "Switzerland",
    kind: "Seasonal kosher programme",
    summary: "A glatt kosher operation run by the Levin family, who have run kosher hotels in Arosa and Davos for decades, at the Hotel Metropol in the centre of Arosa.",
    anchor: { name: "Arosa village centre", coordinates: "46.7830, 9.6800" },
    season: "Winter season. It is a kosher hotel while the programme runs and an ordinary hotel the rest of the year — check the dates for the year you are going, not a previous one.",
    notes: [
      "A ski base rather than a summer one. If you want the Alps in summer, this is the wrong entry.",
      "Confirm the supervision and the dates with the operator directly; a programme that ran last winter is not a promise about this one.",
    ],
    website: "http://www.levinarosa.com/",
    ownerVerified: false,
    sourceUrl: "http://www.levinarosa.com/",
  },
  {
    slug: "engelberg-kempinski-kosher",
    name: "Kempinski Palace Engelberg — kosher offer",
    city: "Engelberg",
    country: "Switzerland",
    kind: "Seasonal kosher programme",
    summary: "The hotel publishes its own kosher offering, run as a catered programme in the Swiss Alps rather than as a permanent kosher kitchen.",
    anchor: { name: "Engelberg village", coordinates: "46.8210, 8.4050" },
    season: "Summer programme. Outside it the hotel is not kosher — the kitchen is turned over for the programme and turned back afterwards.",
    notes: [
      "Engelberg sits under Mount Titlis, so the mountain days are on the doorstep rather than a drive.",
      "Confirm dates and supervision with the hotel for the specific year. This is the failure people have: booking the hotel because it 'is kosher' and arriving in a month when it is not.",
    ],
    website: "https://www.kempinski.com/en/kempinski-palace-engelberg/exclusive/kosher-offer",
    ownerVerified: false,
    sourceUrl: "https://www.kempinski.com/en/kempinski-palace-engelberg/exclusive/kosher-offer",
  },
  {
    slug: "zurich-wiedikon-stays",
    name: "Staying in Wiedikon, Zurich",
    city: "Zurich",
    country: "Switzerland",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary:
      "Zurich's Jewish life — the shuls, the kosher shops, the eruv — is in Wiedikon, about 2 km from the old town, and it is the practical base for a Swiss trip because every mountain is a day trip from the city.",
    anchor: { name: "Wiedikon", coordinates: "47.3690, 8.5170" },
    notes: [
      "Switzerland's year-round kosher food is in the cities, not the resorts. Basing in Zurich and travelling out solves what the alpine villages cannot.",
      "For Shabbos, staying in the old town means no shul within walking distance. This is the single most common mistake on a Swiss trip.",
      "A Swiss Travel Pass usually beats separate tickets once you are doing day trips from a city base.",
    ],
    ownerVerified: false,
    sourceUrl: "https://swissjews.ch/en/jewishlife/religion/kosher/restaurants_hotels/",
  },
];

export function staysIn(country: string) {
  return kosherStays.filter((s) => s.country === country);
}
