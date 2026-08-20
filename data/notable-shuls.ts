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
  {
    slug: "prague-altneuschul",
    name: "The Old-New Synagogue (Altneuschul)",
    city: "Prague",
    country: "Czech Republic",
    coordinates: "50.0902, 14.4177",
    address: "Červená 2, 110 00 Josefov, Prague",
    website: "https://www.synagogue.cz/",
    sourceUrl: "https://en.wikipedia.org/wiki/Old_New_Synagogue",
    notes: [
      "The oldest active synagogue in Europe, built around 1270, still the shul of the Prague kehilla in the old Jewish quarter.",
    ],
    href: "https://www.synagogue.cz/",
  },
  {
    slug: "budapest-dohany-street",
    name: "The Dohány Street Synagogue",
    city: "Budapest",
    country: "Hungary",
    coordinates: "47.4956, 19.0611",
    address: "Dohány u. 2, 1074 Budapest",
    website: "https://dohany-zsinagoga.hu/en",
    sourceUrl: "https://en.wikipedia.org/wiki/Doh%C3%A1ny_Street_Synagogue",
    notes: [
      "The largest synagogue in Europe, built in 1859 in Moorish style, the seat of Budapest's Neolog community with a memorial garden alongside.",
    ],
    href: "https://dohany-zsinagoga.hu/en",
  },
  {
    slug: "rome-great-synagogue",
    name: "The Great Synagogue of Rome (Tempio Maggiore)",
    city: "Rome",
    country: "Italy",
    coordinates: "41.8919, 12.4779",
    address: "Lungotevere de' Cenci, 00186 Roma",
    website: "https://www.romaebraica.it/",
    sourceUrl: "https://en.wikipedia.org/wiki/Great_Synagogue_of_Rome",
    notes: [
      "The main shul of Rome, of 1904, on the edge of the old Ghetto by the river, with the Jewish Museum of Rome inside.",
    ],
    href: "https://www.romaebraica.it/",
  },
  {
    slug: "venice-ghetto-synagogues",
    name: "The synagogues of the Venetian Ghetto",
    city: "Venice",
    country: "Italy",
    coordinates: "45.4450, 12.3261",
    address: "Campo di Ghetto Nuovo, 30121 Venezia",
    website: "https://www.museoebraico.it/en/",
    sourceUrl: "https://en.wikipedia.org/wiki/Venetian_Ghetto",
    notes: [
      "Five scholae hidden in the upper floors of the first ghetto in the world, of the 1500s; the community still davens in them, reached through the Jewish Museum.",
    ],
    href: "https://www.museoebraico.it/en/",
  },
  {
    slug: "vienna-stadttempel",
    name: "The Stadttempel",
    city: "Vienna",
    country: "Austria",
    coordinates: "48.2114, 16.3759",
    address: "Seitenstettengasse 4, 1010 Wien",
    website: "https://www.ikg-wien.at/",
    sourceUrl: "https://en.wikipedia.org/wiki/Stadttempel",
    notes: [
      "The main shul of Vienna, of 1826, the only one to survive the war intact because it was built hidden within a block of houses.",
    ],
    href: "https://www.ikg-wien.at/",
  },
  {
    slug: "paris-grande-synagogue-victoire",
    name: "The Grande Synagogue de la Victoire",
    city: "Paris",
    country: "France",
    coordinates: "48.8759, 2.3402",
    address: "44 Rue de la Victoire, 75009 Paris",
    sourceUrl: "https://en.wikipedia.org/wiki/Grande_Synagogue_de_la_Victoire",
    notes: [
      "The great central shul of Paris, of 1874, the seat of the French chief rabbinate, near the Opéra.",
    ],
    href: "https://en.wikipedia.org/wiki/Grande_Synagogue_de_la_Victoire",
  },
  {
    slug: "berlin-rykestrasse",
    name: "The Rykestrasse Synagogue",
    city: "Berlin",
    country: "Germany",
    coordinates: "52.5352, 13.4181",
    address: "Rykestraße 53, 10405 Berlin",
    sourceUrl: "https://en.wikipedia.org/wiki/Rykestrasse_Synagogue",
    notes: [
      "The largest synagogue in Germany, of 1904, restored after the war and again in 2007, a working shul in Prenzlauer Berg.",
    ],
    href: "https://en.wikipedia.org/wiki/Rykestrasse_Synagogue",
  },
  {
    slug: "new-york-shearith-israel",
    name: "Congregation Shearith Israel",
    city: "New York",
    country: "United States",
    coordinates: "40.7812, -73.9761",
    address: "8 W 70th St, New York, NY 10023",
    website: "https://shearithisrael.org/",
    sourceUrl: "https://en.wikipedia.org/wiki/Congregation_Shearith_Israel",
    notes: [
      "The Spanish and Portuguese Synagogue, the oldest Jewish congregation in the United States, founded in 1654, by Central Park.",
    ],
    href: "https://shearithisrael.org/",
  },
  {
    slug: "curacao-mikve-israel-emanuel",
    name: "Mikvé Israel-Emanuel",
    city: "Willemstad",
    country: "Curaçao",
    coordinates: "12.1084, -68.9335",
    address: "Hanchi Snoa 29, Willemstad, Curaçao",
    website: "https://www.snoa.com/",
    sourceUrl: "https://en.wikipedia.org/wiki/Congregation_Mikv%C3%A9_Israel-Emanuel",
    notes: [
      "The oldest surviving synagogue in the Americas, in use since 1732, known for the white sand covering its floor.",
    ],
    href: "https://www.snoa.com/",
  },
  {
    slug: "jerusalem-hurva-synagogue",
    name: "The Hurva Synagogue",
    city: "Jerusalem",
    country: "Israel",
    coordinates: "31.7767, 35.2312",
    address: "Hurva Square, Jewish Quarter, Old City, Jerusalem",
    sourceUrl: "https://en.wikipedia.org/wiki/Hurva_Synagogue",
    notes: [
      "The landmark shul of the Jewish Quarter, twice destroyed and rebuilt, reopened in 2010 under its high dome.",
    ],
    href: "https://en.wikipedia.org/wiki/Hurva_Synagogue",
  },
  {
    slug: "florence-great-synagogue",
    name: "The Great Synagogue of Florence",
    city: "Florence",
    country: "Italy",
    coordinates: "43.7712, 11.2686",
    address: "Via Luigi Carlo Farini 6, 50121 Firenze",
    sourceUrl: "https://en.wikipedia.org/wiki/Great_Synagogue_of_Florence",
    notes: [
      "A green-domed Moorish-style shul of 1882, one of the largest in south-central Europe, with a Jewish museum inside.",
    ],
    href: "https://en.wikipedia.org/wiki/Great_Synagogue_of_Florence",
  },
  {
    slug: "gibraltar-shaar-hashamayim",
    name: "The Great Synagogue (Sha'ar Hashamayim)",
    city: "Gibraltar",
    country: "Gibraltar",
    coordinates: "36.1408, -5.3534",
    address: "47-49 Engineer Lane, Gibraltar",
    sourceUrl: "https://en.wikipedia.org/wiki/Sha%27ar_Hashamayim_Synagogue",
    notes: [
      "The oldest of Gibraltar's four working shuls, founded in 1724 by the Spanish and Portuguese community of the Rock.",
    ],
    href: "https://en.wikipedia.org/wiki/Sha%27ar_Hashamayim_Synagogue",
  },
];
