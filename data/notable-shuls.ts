// Notable working shuls of the world.
//
// The shul directory grew out of the kever-towns: its minyanim came from the
// researched practical content and the cemetery pages, so it knew where to
// daven near a tziyun and almost nowhere else. This is the parallel to the
// worldwide attractions list — the landmark synagogues of the great
// communities, each one still a working shul, each checked against a source.
//
// Rules, matching the rest of the site:
//   • Every entry carries a source, and only sources the site already trusts.
//   • Coordinates are real and navigable — these are public buildings.
//   • No hours. A shul's zmanim change; the link is how a reader gets them.
//   • Listed, not vouched for. Whether a given minyan runs on the day you come
//     is a question for the shul, not for this page — so `href` points at the
//     shul (its own site, or the write-up it already has here).

export type NotableShul = {
  slug: string;
  name: string;
  city: string;
  country: string;
  /** "lat, lng" — a real, navigable location. */
  coordinates: string;
  address?: string;
  website?: string;
  sourceUrl: string;
  notes?: string[];
  /** Where the card links: the shul's own page here, or its site. */
  href: string;
};

export const notableShuls: NotableShul[] = [
  {
    slug: "bevis-marks-synagogue",
    name: "Bevis Marks Synagogue",
    city: "London",
    country: "United Kingdom",
    coordinates: "51.5144, -0.0792",
    address: "4 Heneage Lane, London EC3A 5DQ",
    website: "https://www.bevismarks.org.uk/",
    sourceUrl: "https://en.wikipedia.org/wiki/Bevis_Marks_Synagogue",
    notes: [
      "The oldest shul in Britain still in use, consecrated in 1701 and never closed since — the Spanish and Portuguese kehilla of the City.",
    ],
    href: "/attractions#bevis-marks-synagogue",
  },
  {
    slug: "amsterdam-portuguese-synagogue",
    name: "The Portuguese Synagogue (Esnoga)",
    city: "Amsterdam",
    country: "Netherlands",
    coordinates: "52.3675, 4.9054",
    address: "Mr. Visserplein 3, Amsterdam",
    sourceUrl: "https://en.wikipedia.org/wiki/Portuguese_Synagogue_(Amsterdam)",
    notes: [
      "The great Sephardi shul completed in 1675, still lit by candles and still holding services, with the ancient Ets Haim library alongside.",
    ],
    href: "https://en.wikipedia.org/wiki/Portuguese_Synagogue_(Amsterdam)",
  },
  {
    slug: "sydney-great-synagogue",
    name: "The Great Synagogue",
    city: "Sydney",
    country: "Australia",
    coordinates: "-33.8727, 151.2095",
    address: "187a Elizabeth Street, Sydney NSW",
    website: "https://greatsynagogue.org.au/",
    sourceUrl: "https://en.wikipedia.org/wiki/Great_Synagogue,_Sydney",
    notes: [
      "The mother congregation of Sydney, consecrated in 1878, with daily minyanim through the week. In the city centre by Hyde Park.",
    ],
    href: "https://greatsynagogue.org.au/",
  },
  {
    slug: "hong-kong-ohel-leah",
    name: "Ohel Leah Synagogue",
    city: "Hong Kong",
    country: "China",
    coordinates: "22.2816, 114.1489",
    address: "70 Robinson Road, Mid-Levels, Hong Kong",
    website: "https://www.ohelleah.org/",
    sourceUrl: "https://en.wikipedia.org/wiki/Ohel_Leah_Synagogue",
    notes: [
      "The historic shul of Hong Kong, built in 1902 by the Sassoon family and still active, on the Mid-Levels above the city.",
    ],
    href: "https://www.ohelleah.org/",
  },
  {
    slug: "buenos-aires-templo-libertad",
    name: "Templo Libertad",
    city: "Buenos Aires",
    country: "Argentina",
    coordinates: "-34.5995, -58.3837",
    address: "Libertad 769, Buenos Aires",
    website: "https://templolibertad.org.ar/en/",
    sourceUrl: "https://en.wikipedia.org/wiki/Synagogue_of_the_Israelite_Argentine_Congregation",
    notes: [
      "The first and largest synagogue in South America, finished in 1932, with the Jewish Museum of Buenos Aires inside. By the Teatro Colón.",
    ],
    href: "/attractions#buenos-aires-templo-libertad",
  },
  {
    slug: "istanbul-neve-shalom",
    name: "Neve Shalom Synagogue",
    city: "Istanbul",
    country: "Turkey",
    coordinates: "41.0269, 28.9725",
    address: "Büyük Hendek Caddesi 61, Karaköy, Beyoğlu, Istanbul",
    sourceUrl: "https://en.wikipedia.org/wiki/Neve_Shalom_Synagogue",
    notes: [
      "The central and largest Sephardic synagogue of Istanbul, in the old Galata quarter. Visits are by prior arrangement with security screening.",
    ],
    href: "/attractions#istanbul-neve-shalom",
  },
  {
    slug: "sofia-synagogue",
    name: "Sofia Synagogue",
    city: "Sofia",
    country: "Bulgaria",
    coordinates: "42.7000, 23.3211",
    address: "Ekzarh Yosif St 16, Sofia",
    sourceUrl: "https://en.wikipedia.org/wiki/Sofia_Synagogue",
    notes: [
      "The largest synagogue in south-eastern Europe, opened in 1909 for the Sephardic kehilla and still in use, near the central market.",
    ],
    href: "/attractions#sofia-synagogue",
  },
  {
    slug: "fez-ibn-danan-synagogue",
    name: "The Ibn Danan Synagogue",
    city: "Fez",
    country: "Morocco",
    coordinates: "34.0523, -4.9922",
    address: "Mellah, Fes el-Jdid, Fez",
    sourceUrl: "https://en.wikipedia.org/wiki/Ibn_Danan_Synagogue",
    notes: [
      "A shul of about 1700 in the mellah of Fez, restored in the 1990s — one of the oldest standing in North Africa.",
    ],
    href: "/attractions#fez-ibn-danan-synagogue",
  },
  {
    slug: "abu-dhabi-moses-ben-maimon",
    name: "The Moses Ben Maimon Synagogue",
    city: "Abu Dhabi",
    country: "United Arab Emirates",
    coordinates: "24.5308, 54.4061",
    address: "Abrahamic Family House, Saadiyat, Abu Dhabi",
    website: "https://www.abrahamicfamilyhouse.ae/",
    sourceUrl: "https://en.wikipedia.org/wiki/Abrahamic_Family_House",
    notes: [
      "The first purpose-built synagogue in the Emirates, opened in 2023 at the Abrahamic Family House on Saadiyat Island.",
    ],
    href: "/attractions#abu-dhabi-abrahamic-family-house",
  },
  {
    slug: "mumbai-knesset-eliyahoo",
    name: "Knesset Eliyahoo Synagogue",
    city: "Mumbai",
    country: "India",
    coordinates: "18.9281, 72.8326",
    address: "55 Dr V. B. Gandhi Marg, Kala Ghoda, Fort, Mumbai",
    sourceUrl: "https://en.wikipedia.org/wiki/Knesset_Eliyahoo",
    notes: [
      "A Sephardi shul of 1884 in the Kala Ghoda quarter, built by the Sassoon family and restored to its white and indigo.",
    ],
    href: "/attractions#mumbai-knesset-eliyahoo",
  },
  {
    slug: "kochi-paradesi-synagogue",
    name: "The Paradesi Synagogue",
    city: "Kochi",
    country: "India",
    coordinates: "9.9572, 76.2594",
    address: "Jew Town, Mattancherry, Kochi, Kerala",
    sourceUrl: "https://en.wikipedia.org/wiki/Paradesi_Synagogue",
    notes: [
      "The oldest working synagogue in the Commonwealth, built in 1568 in old Cochin; it still holds services when a minyan can be gathered.",
    ],
    href: "/attractions#kochi-paradesi-synagogue",
  },
  {
    slug: "singapore-maghain-aboth",
    name: "Maghain Aboth Synagogue",
    city: "Singapore",
    country: "Singapore",
    coordinates: "1.2983, 103.8507",
    address: "24/26 Waterloo Street, Singapore",
    sourceUrl: "https://en.wikipedia.org/wiki/Maghain_Aboth_Synagogue",
    notes: [
      "The oldest synagogue in South-East Asia, built in 1878 and still a working shul with a kosher kitchen alongside.",
    ],
    href: "/attractions#singapore-maghain-aboth",
  },
];
