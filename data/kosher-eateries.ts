// Where to eat.
//
// The last of the four things a trip needs. The site could tell you where the
// kever is, what to do on the days between, and which part of town to sleep in
// — and then said nothing at all about dinner, except a live OpenStreetMap
// lookup that returns whatever happens to be tagged "kosher" nearby.
//
// THIS IS THE HARDEST CONTENT ON THE SITE TO KEEP HONEST, and the design is
// shaped entirely around that. A kever does not close. A mountain does not
// change hands. A restaurant does both, and a hechsher can lapse between the
// day it is written down and the day somebody eats there.
//
// So four rules, and they are enforced by tests rather than by good intentions:
//
//   1. THE HECHSHER IS A HechsherStatus, NOT A STRING. The site already has
//      that type — certified / reported / none / unverified — and it already
//      means something precise. "certified" means the owner checked with the
//      certifying body. Nothing researched from a directory may ship as
//      certified; it ships as "reported", which prints as unverified and tells
//      the reader to check before eating. See data/hechsherim.ts.
//
//   2. NO HOURS, NO PRICES, NO MENUS. Same rule as attractions and for a
//      stronger reason. A stale opening time sends a family across a city to a
//      locked door on Erev Shabbos.
//
//   3. EVERY ENTRY LINKS TO SOMETHING LIVE — the place's own site, or better,
//      the certifying body's own list. The list on this page will go out of
//      date; the link is how a reader gets the current answer.
//
//   4. LISTED, NOT RECOMMENDED. Nothing here is an endorsement of the kashrus.
//      It is a record of what exists, who is said to certify it, and how far
//      that has been checked.
//
// Coordinates ARE stored and are safe: these are commercial premises with
// published addresses, like the attractions and unlike the kevarim.

import type { HechsherStatus } from "@/data/hechsherim";

export type EateryKind =
  | "Restaurant"
  | "Bakery"
  | "Butcher"
  | "Grocery"
  | "Takeaway"
  | "Cafe";

/** Meat, dairy or neither — the first thing anybody actually asks. */
export type EateryDiet = "Meat" | "Dairy" | "Parve" | "Mixed premises";

export type KosherEatery = {
  slug: string;
  name: string;
  city: string;
  country: string;
  kind: EateryKind;
  diet: EateryDiet;
  /** One line: what it is and who it suits. */
  summary: string;
  address?: string;
  /** "lat, lng" — a real, navigable location. */
  coordinates?: string;
  website?: string;
  phone?: string;
  /**
   * What is claimed about the kashrus and how far it has been checked.
   *
   * Never set state: "certified" from research. That word is reserved for the
   * owner having confirmed it with the certifying body, and a test enforces it.
   */
  hechsher: HechsherStatus;
  notes?: string[];
  /** Which quarter or shul this sits in, tying it to the stays data. */
  nearQuarter?: string;
  sourceUrl: string;
};

export const kosherEateries: KosherEatery[] = [
  // ---- Italy ----------------------------------------------------------
  {
    slug: "rome-ba-ghetto",
    name: "Ba'Ghetto",
    city: "Rome",
    country: "Italy",
    kind: "Restaurant",
    diet: "Meat",
    summary:
      "Roman-Jewish cooking on Via del Portico d'Ottavia, in the middle of the Ghetto — the street where most of kosher Rome eats.",
    address: "Via del Portico d'Ottavia 57, Rome",
    coordinates: "41.8925, 12.4783",
    website: "https://www.baghetto.com/",
    hechsher: { state: "reported", note: "Under the Rabbinato of the Jewish Community of Rome", source: "The restaurant's own listing", },
    notes: [
      "Carciofi alla giudia — the flattened deep-fried artichoke — is the dish this street is known for, and it is Roman-Jewish rather than Italian.",
      "There is a separate dairy branch under the same name nearby. Check which one you are booking.",
      "Minutes from the Great Synagogue, so it works around a Mincha.",
    ],
    nearQuarter: "rome-ghetto",
    sourceUrl: "https://www.baghetto.com/",
  },
  // ---- France ---------------------------------------------------------
  {
    slug: "paris-marais-rue-des-rosiers",
    name: "Rue des Rosiers — the Pletzl's kosher street",
    city: "Paris",
    country: "France",
    kind: "Takeaway",
    diet: "Mixed premises",
    summary:
      "Not one address but the street itself: falafel counters, patisseries and traiteurs along the old Jewish lane in the Marais.",
    address: "Rue des Rosiers, 4th arrondissement, Paris",
    coordinates: "48.8571, 2.3596",
    hechsher: {
      state: "unverified",
      note: "A street rather than one business — each counter has its own supervision, or none, and they differ",
    },
    notes: [
      "Listed as a street on purpose. Individual shops here open, close and change hands often, and printing a name would age badly.",
      "Supervision differs from door to door. Look for the current teudah in the window rather than assuming the street is uniform — some are under the Beth Din de Paris, some are not.",
      "Paris has far more kosher food out in the 19th and 17th arrondissements than in the Marais; the Marais is the historic street, not the biggest concentration.",
    ],
    nearQuarter: "paris-pletzl",
    sourceUrl: "https://en.wikipedia.org/wiki/Rue_des_Rosiers",
  },
  // ---- Belgium --------------------------------------------------------
  {
    slug: "antwerp-jewish-quarter-eating",
    name: "The Antwerp Jewish quarter — eating there",
    city: "Antwerp",
    country: "Belgium",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "Butchers, bakeries, groceries and takeaways through the streets between Central Station and the diamond bourses — the deepest everyday kosher provision in Western Europe.",
    address: "Around Lange Kievitstraat and Isabellalei, Antwerp",
    coordinates: "51.2078, 4.3970",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — most are under Machsike Hadass or Shomre Hadas, and the two are not the same",
    },
    notes: [
      "Antwerp has two kehillos with two separate rabbinates, Machsike Hadass and Shomre Hadas, and shops are certified by one or the other. Which you accept is a question for you and your rov, not for this site.",
      "Provision here is everyday rather than special-occasion: this is a place where people do their weekly shopping, so opening hours follow the community's week and Friday closes early.",
      "Listed as a quarter for the same reason as Rue des Rosiers — individual shops change, the streets do not.",
    ],
    nearQuarter: "antwerp-jewish-quarter",
    sourceUrl: "https://en.wikipedia.org/wiki/History_of_the_Jews_in_Antwerp",
  },
  // ---- Israel ---------------------------------------------------------
  {
    slug: "bnei-brak-rabbi-akiva-eating",
    name: "Rabbi Akiva Street — eating in Bnei Brak",
    city: "Bnei Brak",
    country: "Israel",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "The densest kosher shopping street anywhere: bakeries, takeaways, restaurants and groceries the length of it, and the whole city keeps Shabbos.",
    address: "Rabbi Akiva Street, Bnei Brak",
    coordinates: "32.08603, 34.83194",
    hechsher: {
      state: "unverified",
      note: "A street rather than one business — badatz supervisions differ shop by shop and are displayed in the window",
    },
    notes: [
      "The question in Bnei Brak is never whether something is kosher but under which badatz, and the teudah is in the window of every one of them.",
      "Prices are ordinary-neighbourhood rather than tourist, because this is where people actually shop.",
      "Everything shuts early on Erev Shabbos and the street empties. Do not plan a late Friday afternoon here.",
    ],
    nearQuarter: "bnei-brak-rabbi-akiva",
    sourceUrl: "https://www.wikidata.org/wiki/Q6907785",
  },
  {
    slug: "milan-via-sally-mayer-eating",
    name: "Via Sally Mayer — eating in Milan",
    city: "Milan",
    country: "Italy",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "Italy's largest kosher provision, in the streets around Via Sally Mayer — restaurants, bakeries and a supermarket, about 3 km out from the Duomo.",
    address: "Around Via Sally Mayer, Milan",
    coordinates: "45.4580, 9.1560",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — most places here are under the Milan Rabbinate, and each displays its own teudah",
    },
    notes: [
      "This is the practical reason to stay near Via Sally Mayer rather than by the Duomo: staying by the sights puts a 3 km journey between you and every meal.",
      "Milan's provision is the deepest in Italy — you can shop for a week here, which you cannot do in Florence or Venice.",
      "Listed as a quarter for the same reason as Rue des Rosiers. Individual shops change hands; the streets do not.",
    ],
    nearQuarter: "milan-via-sally-mayer",
    sourceUrl: "https://en.wikipedia.org/wiki/Milan_Synagogue",
  },
  {
    slug: "venice-ghetto-eating",
    name: "The Venice Ghetto — eating in Cannaregio",
    city: "Venice",
    country: "Italy",
    kind: "Restaurant",
    diet: "Mixed premises",
    summary:
      "A handful of kosher places in and around the Campo di Ghetto Nuovo — the whole of Venice's kosher provision, in one small square.",
    address: "Campo di Ghetto Nuovo, Cannaregio, Venice",
    coordinates: "45.4450, 12.3260",
    hechsher: {
      state: "unverified",
      note: "Under the Venice Rabbinate where certified; check the teudah at each door, and note that some places in the square are not kosher at all",
    },
    notes: [
      "Small, and that is the point to plan around: this is not a city where you can improvise a meal. Book ahead, especially for Shabbos, and expect limited days.",
      "The word ghetto is Venetian and this is where it comes from — the 1516 foundry island the Jews of Venice were confined to. The square is the original.",
      "The old bais hachaim on the Lido, listed on this site, is a vaporetto away and makes the other half of a Venice day.",
    ],
    nearQuarter: "venice-cannaregio",
    sourceUrl: "https://en.wikipedia.org/wiki/Venetian_Ghetto",
  },
  {
    slug: "florence-great-synagogue-eating",
    name: "Around the Great Synagogue — eating in Florence",
    city: "Florence",
    country: "Italy",
    kind: "Restaurant",
    diet: "Mixed premises",
    summary:
      "Florence's kosher provision sits by the Great Synagogue east of the centre — a small number of places, and worth confirming before you arrive.",
    address: "Around Via Farini and the Great Synagogue, Florence",
    coordinates: "43.7719, 11.2680",
    hechsher: {
      state: "unverified",
      note: "Under the Florence Rabbinate where certified; confirm at the door and with the community",
    },
    notes: [
      "Thin provision, and seasonal. Establish what is actually open for your dates rather than assuming — this is a city to arrive in with a plan and, for Shabbos, with arrangements made.",
      "It is about twenty minutes' walk east of the Duomo, so a hotel by the sights is not a hotel by the food.",
      "The Great Synagogue itself is on this site's things-to-do list; the shul and the food are the same short walk.",
    ],
    nearQuarter: "florence-great-synagogue",
    sourceUrl: "https://en.wikipedia.org/wiki/Great_Synagogue_of_Florence",
  },
  {
    slug: "golders-green-road-eating",
    name: "Golders Green Road — eating in north-west London",
    city: "London",
    country: "United Kingdom",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "The densest run of kosher shops and restaurants in Europe outside Israel, along one road — bakeries, butchers, restaurants and takeaways for most of a mile.",
    address: "Golders Green Road, London NW11",
    coordinates: "51.5720, -0.1940",
    hechsher: {
      state: "unverified",
      note: "A street rather than one business — most places here are under the London Beth Din (KLBD) or Kedassia, and the two are not the same; each displays its own",
    },
    notes: [
      "If food is what decides where you stay in London, this is the street, and it is the argument for Golders Green over Stamford Hill for a visitor.",
      "KLBD and Kedassia both certify here and which you accept is a question for you and your rov. The teudah is in the window.",
      "Twenty-five minutes on the Northern line from the centre, so you can stay here and still see London.",
      "Everything shuts early on Erev Shabbos and the road empties.",
    ],
    nearQuarter: "london-golders-green",
    sourceUrl: "https://en.wikipedia.org/wiki/Golders_Green",
  },
  {
    slug: "prestwich-manchester-eating",
    name: "Prestwich and Broughton Park — eating in Manchester",
    city: "Manchester",
    country: "United Kingdom",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "The everyday kosher provision of the largest kehilla in Britain outside London, spread across the north Manchester suburbs.",
    address: "Around Bury New Road, Prestwich and Broughton Park, Manchester",
    coordinates: "53.5250, -2.2820",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — mostly under the Manchester Beth Din (MBD); check the teudah at each door",
    },
    notes: [
      "Spread out rather than concentrated on one street, which is the practical difference from Golders Green — a car helps here in a way it does not in London.",
      "Broughton Park is the most walkable of the suburbs for Shabbos; Prestwich and Whitefield are more spread.",
      "Prices are ordinary rather than tourist, because this is where a large community does its weekly shopping.",
    ],
    nearQuarter: "manchester-prestwich",
    sourceUrl: "https://en.wikipedia.org/wiki/Prestwich",
  },
  {
    slug: "gateshead-coatsworth-road-eating",
    name: "Coatsworth Road — eating in Gateshead",
    city: "Gateshead",
    country: "United Kingdom",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "A short row of kosher shops serving the largest Torah centre in Europe — small, and entirely sufficient for the community that uses it.",
    address: "Coatsworth Road, Bensham, Gateshead",
    coordinates: "54.95311, -1.61061",
    hechsher: {
      state: "unverified",
      note: "Serving a strictly-observant community; supervision is displayed in each shop and should be checked there",
    },
    notes: [
      "Three establishments close together on the one road is roughly the whole of it. This is a community shopping street, not a choice of restaurants.",
      "Plan around it rather than assuming: a visitor expecting to eat out every night will be disappointed, and a visitor buying for a self-catered week will be fine.",
      "Everything runs to the community's week, and Erev Shabbos closes early.",
    ],
    nearQuarter: "gateshead-bensham",
    sourceUrl: "https://www.totallyjewishtravel.com/Kosher_Tours-TL1164-gateshead_united_kingdom_uk-Vacations.html",
  },
];

/** Everything in one country, for the country filters. */
export function eateriesIn(country: string) {
  return kosherEateries.filter((e) => e.country === country);
}
