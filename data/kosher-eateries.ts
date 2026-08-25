// Where to eat.
//
// The last of the four things a trip needs. The site could tell you where the
// kever is, what to do on the days between, and which part of town to sleep in
// — and then said nothing at all about dinner.
//
// THIS IS THE HARDEST CONTENT ON THE SITE TO KEEP HONEST, and the design is
// shaped entirely around that. A kever does not close. A mountain does not
// change hands. A restaurant does both, and a hechsher can lapse between the
// day it is written down and the day somebody eats there.
//
// So four rules, and they are enforced by tests rather than by good intentions:
//
//   1. THE HECHSHER IS A HechsherStatus, NOT A STRING. "Certified" means the
//      owner checked with the certifying body. A source-backed listing may be
//      marked "reported", but never elevated to certified by a bulk import.
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
import { directoryEateries } from "@/data/kosher-eateries-directory";
import { withoutScrapedJunk } from "@/data/listing-quality";

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
  /**
   * Meat, dairy or parve — where it is known. Optional because the certifier
   * directories the bulk set is drawn from list a place as kosher without
   * saying which, and guessing a diet is exactly the kind of invention this
   * file exists to prevent. Absent means "not stated by the source".
   */
  diet?: EateryDiet;
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

const curatedEateries: KosherEatery[] = [
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
  {
    slug: "paris-19th-rue-manin",
    name: "The 19th arrondissement — where Paris actually eats",
    city: "Paris",
    country: "France",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "Around Rue Manin and the Buttes-Chaumont, the densest concentration of kosher shops, restaurants, shuls and schools in Paris — and it is not the Marais.",
    address: "Around Rue Manin, 75019 Paris",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — most places here are under the Beth Din de Paris or a badatz, and each displays its own",
    },
    notes: [
      "This is the correction most Paris trips need, and it is the same shape as the Amsterdam one. The Pletzl in the Marais is the historic Jewish street and worth walking; the 19th is where the community lives and where the food is. Orthodox families settled here through the 1970s, 80s and 90s and the provision followed them.",
      "Coordinates deliberately not listed: this is a district several streets across rather than one address, and we found no pin worth standing behind for its centre. Navigate to Buttes-Chaumont and walk Rue Manin.",
      "Supervision differs door to door — the Consistoire and various badatzim both certify in Paris and they are not the same. Look for the current teudah in the window.",
      "It is well out from the sightseeing. That is the trade, and it is the same trade as Golders Green in London.",
    ],
    nearQuarter: "paris-pletzl",
    sourceUrl: "https://www.totallyjewishtravel.com/Kosher_Tours-TL7753-19th_arrondissement_paris-Vacations.html",
  },
  {
    slug: "nice-dubouchage-eating",
    name: "Around the Dubouchage shul — eating in Nice",
    city: "Nice",
    country: "France",
    kind: "Restaurant",
    diet: "Mixed premises",
    summary:
      "Kosher restaurants and shops in the streets around the Boulevard Dubouchage synagogue, in the middle of town rather than out in a suburb.",
    address: "Around Boulevard Dubouchage, Nice",
    coordinates: "43.7020, 7.2700",
    hechsher: {
      state: "unverified",
      note: "Mostly under the local Consistoire rabbinate; confirm at each door",
    },
    notes: [
      "Unusual and useful: the shul and the food are central in Nice, so a hotel near the sights is also a hotel near dinner. That is not true of Paris, London or Milan.",
      "One of the larger Jewish communities in France outside Paris, so the provision is real rather than token — but confirm what is open for your dates, because the Riviera runs on a season.",
      "Nice Airport is a short taxi from the centre, which makes this a practical stop on a wider trip rather than a detour.",
    ],
    nearQuarter: "nice-dubouchage",
    sourceUrl: "https://en.wikipedia.org/wiki/Nice",
  },

  // ---- The Alps, and the cities that feed them ------------------------
  //
  // An alpine valley almost never has kosher food in it. So the honest answer
  // to "where do we eat in the Tyrol" is not a restaurant in the Tyrol — it is
  // the city two hours down the mountain where you shop before you go up, or a
  // service that drives the food to you. Both kinds are listed here, and each
  // says which mountains it actually serves, because that is the fact a
  // traveler needs and no restaurant directory records it.
  {
    slug: "vienna-leopoldstadt-eating",
    name: "The 2nd district — eating in Vienna, and provisioning for the Austrian Alps",
    city: "Vienna",
    country: "Austria",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "Butchers, bakeries, a kosher supermarket and restaurants in the streets of Leopoldstadt — and the only kosher shopping in Austria, which makes this the starting point for anywhere in the Austrian Alps.",
    address: "Around Hollandstraße and the Karmelitermarkt, 1020 Vienna",
    coordinates: "48.2160, 16.3830",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — Vienna has more than one kashrus authority and shops are certified by one or another; each displays its own",
    },
    notes: [
      "The fact that governs an Austrian trip: this is the only place in the country with kosher shops. Salzburg has none, Innsbruck has none, the Tyrol and the Pinzgau have none. Whatever the Alps end of the trip needs is bought here or delivered.",
      "There is more than one supervising body in Vienna — the IKG rabbinate and the Komitee Kosher Wien among them — and they are not the same. Which you accept is a question for you and your rov; the teudah is in the window.",
      "Convenient in a way most kosher quarters are not: Leopoldstadt is one bridge from the Innere Stadt, so the food and the sightseeing are the same short walk.",
      "Vienna to the Tyrol is most of a day's drive. If the mountains are the trip, look at whether Munich is the better shop — it is much closer to Innsbruck than Vienna is.",
    ],
    nearQuarter: "vienna-leopoldstadt",
    sourceUrl: "https://www.ikg-wien.at/en/rabbinate",
  },
  {
    slug: "kosher-tirol",
    name: "Kosher Tirol — meals delivered into the Austrian Alps",
    city: "Innsbruck",
    country: "Austria",
    kind: "Takeaway",
    diet: "Mixed premises",
    summary:
      "Not a shop but a go-between: prepared kosher meals, Shabbos packages and basics arranged across Tirol and the Salzburg province, in valleys that have no kosher provision of their own.",
    address: "Serves Tirol and the Salzburg province — no premises to visit",
    website: "https://koshertirol.com/",
    hechsher: {
      state: "unverified",
      note: "Kosher Tirol says of itself that it is a facilitator rather than a producer, and that kashrus is a matter between the customer and the supplier — so the supervision to establish is the supplier's, not this service's",
    },
    notes: [
      "This is the one thing that makes an Austrian alpine trip workable without driving to Vienna, and it is the reason the Krimml and Nordkette entries on this site no longer say there is nothing.",
      "Read the disclaimer as written. The service connects travelers to suppliers and states plainly that it is not responsible for the kashrus. That means the question 'who supervises this' has to be asked of whoever cooks the food, every time, for that season.",
      "It runs to a season and to pre-orders. Shabbos packages in particular are ordered ahead rather than picked up, and a family that leaves it until Friday will not eat.",
      "Coordinates deliberately not listed: there is no premises. This is a delivery and collection arrangement across two provinces, not an address you drive to.",
      "Beyond it, some ordinary Tyrolean supermarkets carry kosher basics, and the service publishes which. Basics is the right word — this is not a week's shopping.",
    ],
    sourceUrl: "https://koshertirol.com/",
  },
  {
    slug: "lyon-villeurbanne-eating",
    name: "Villeurbanne and the 8th — eating in Lyon, and provisioning for the French Alps",
    city: "Lyon",
    country: "France",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "Restaurants, butchers and groceries through Villeurbanne and eastern Lyon, serving one of the largest kehillos in France — and the last real kosher shopping before the Alps.",
    address: "Around Villeurbanne and the 8th arrondissement, Lyon",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — a good many places here are under the Beth Din de Lyon, and each displays its own teudah",
    },
    notes: [
      "The same correction as Paris, in a smaller city. The Grande Synagogue on the quai Tilsitt is the one people find; the food is out east in Villeurbanne and the 8th, a few kilometres from it. Base yourself by the shul and you will travel to every meal.",
      "Coordinates deliberately not listed: this is a spread of streets across two districts rather than one address, and we found no pin worth standing behind for its centre. Navigate to Villeurbanne and work outward.",
      "What it is for, if the trip is the mountains: Grenoble, Annecy and Chamonix have no kosher provision at all. Lyon is the last place to shop properly, and it is between one and two and a half hours from all three.",
      "Supervision differs door to door. The Beth Din de Lyon certifies widely here, but not everything, and a place trading as kosher is not the same as a place with a current teudah in the window.",
    ],
    nearQuarter: "lyon-villeurbanne",
    sourceUrl: "https://www.123cacher.com/lyon.htm",
  },
  {
    slug: "grenoble-kosher",
    name: "Eating in Grenoble",
    city: "Grenoble",
    country: "France",
    kind: "Restaurant",
    diet: "Mixed premises",
    summary:
      "A brasserie under the local rabbinate, a grocery and butcher, and Chabad — small, but the only kosher provision inside the French Alps rather than on the edge of them.",
    address: "Across central Grenoble — see the community's own kashrus page",
    coordinates: "45.17167, 5.72250",
    hechsher: {
      state: "unverified",
      note: "Several separate businesses — the Grenoble Rabbinate certifies here, and each place displays its own teudah",
    },
    notes: [
      "Set expectations by size. This is a few establishments in a city of a hundred and fifty thousand, not a kosher district. It is enough to eat well for a week and not enough to improvise a Friday afternoon.",
      "The reason it matters out of proportion to its size: Chamonix, Annecy, Megève and the whole of the Savoie have nothing at all. Grenoble is the only town actually inside the French Alps where kosher food exists.",
      "The community publishes its own kashrus page, which is the live list and the thing to check rather than this one. Supervision here is the Grenoble Rabbinate; confirm at the door.",
      "The coordinate is the town rather than a shop, and is here so the site can measure distances. It is not an address to navigate to — the places are spread across the city.",
      "Lyon is about an hour and a quarter north and has many times as much. If a week's shopping is the question rather than a dinner, shop in Lyon on the way in.",
    ],
    nearQuarter: "grenoble-jewish-life",
    sourceUrl: "https://www.grande-synagogue-de-grenoble.fr/casher",
  },
  {
    slug: "salzburg-chabad-meals",
    name: "Chabad of Salzburg — Shabbos and yom tov meals",
    city: "Salzburg",
    country: "Austria",
    kind: "Restaurant",
    diet: "Mixed premises",
    summary:
      "Not a restaurant but a table: Shabbos and yom tov meals at the Chabad house on the Linzer Gasse, booked ahead, in a province with no kosher shop in it.",
    address: "Linzer Gasse 76, 5020 Salzburg",
    website: "https://chabadsalzburg.com/",
    hechsher: {
      state: "unverified",
      note: "A Chabad house table rather than a certified commercial kitchen — ask the rov there what the arrangements are, as you would anywhere",
    },
    notes: [
      "Advance registration, not walk-in. This is the difference between eating and not eating on a Shabbos in Salzburg, and it is the single most important line in this entry.",
      "It exists because nothing else does. There is no kosher shop or restaurant in Salzburg, in the Salzkammergut, or anywhere in Austria outside Vienna — so for a family doing Hallstatt, the Eisriesenwelt or the Grossglockner, this is the Shabbos.",
      "For weekdays out in the valleys, Kosher Tirol delivers prepared meals across the Salzburg province and is listed separately here.",
      "Coordinates deliberately not listed: we found no pin we would stand behind. Linzer Gasse 76 is in the Neustadt, on the far side of the river from the old town, and is walkable from most of the centre.",
    ],
    sourceUrl: "https://chabadsalzburg.com/",
  },
  {
    slug: "turin-kosher",
    name: "Eating in Turin — through the community, not through a restaurant",
    city: "Turin",
    country: "Italy",
    kind: "Takeaway",
    diet: "Mixed premises",
    summary:
      "A kehilla of about nine hundred and fifty with its own rabbinical office and kashrus supervision, which will provide packed or served kosher meals on reservation.",
    address: "Jewish Community of Turin, Piazzetta Primo Levi 12, 10125 Turin",
    coordinates: "45.06028, 7.68222",
    website: "https://torinoebraica.it/en/",
    hechsher: {
      state: "unverified",
      note: "Arranged and supervised through the Turin community's own rabbinical office rather than by a commercial certifier — ask them directly what applies to what you are ordering",
    },
    notes: [
      "This is a different shape of listing from a restaurant street, and the difference is the point: in Turin you write to the community and reserve, rather than turning up somewhere and eating. Plan it before you fly, not on the day.",
      "Why it belongs in an Alps section: Turin is the gate to the western Italian Alps — the Aosta valley, the Gran Paradiso, the Susa valley and the passes into France — and none of them has a kosher anything. Milan, four hours from the Dolomites, is not the answer on this side of the country.",
      "The coordinate is the Great Synagogue on Via Pio V, which is beside the community offices on Piazzetta Primo Levi. The shul itself is visited by arrangement rather than walked into.",
      "The community also runs a mikvah. Turin is a small kehilla with a full week, which is more than any Italian alpine valley has.",
    ],
    sourceUrl: "https://torinoebraica.it/en/jewish-life/",
  },

  // ---- Where an alpine trip actually shops ----------------------------
  //
  // Two of these three are not in the Alps and are here because of them. The
  // ranges this site now covers have, between them, one kosher kitchen —
  // Canazei, below — and beyond that the food comes from a city on the edge:
  // Munich for the Tyrol and the Dolomites, Geneva for the Savoie and the
  // Mont Blanc valleys, Milan, Lyon and Vienna already listed above. Filing
  // them under the mountains they serve is the only arrangement that answers
  // the question a person is really asking.
  {
    slug: "munich-jakobsplatz-eating",
    name: "St.-Jakobs-Platz — eating in Munich, and shopping for the Tyrol",
    city: "Munich",
    country: "Germany",
    kind: "Restaurant",
    diet: "Mixed premises",
    summary:
      "A glatt restaurant inside the Jewish centre by the Marienplatz, a delicatessen across town, and named bakeries the community vouches for — and the closest full kosher provision to Innsbruck and the Dolomites.",
    address: "Jewish Centre, St.-Jakobs-Platz, 80331 Munich",
    website: "https://www.ikg-m.de/kultus-und-religion/koscheres-essen/",
    hechsher: {
      state: "unverified",
      note: "Several separate businesses under the Munich community's rabbinate; the community publishes its own kashrus page and that is the list to read rather than this one",
    },
    notes: [
      "Why it is in an Alps section: Innsbruck is about two hours south by road and the Dolomites a good deal further, and neither has a kosher shop. For a Tyrolean or a South Tyrolean trip driven from the north, this is where the week's food is bought.",
      "The restaurant sits inside the Jewish centre on St.-Jakobs-Platz, a few minutes from the Marienplatz — unusually central for kosher food in a European city, and the reason a Munich stop works on the way through.",
      "There is a separate kosher delicatessen out on the Prinzregentenstraße, and the community names the bakeries whose bread it stands behind. Take the list from the community's page, not from here.",
      "Security at the Jewish centre is real. Bring passports and expect to be checked, as at the Great Synagogue in Rome.",
      "Coordinates deliberately not listed: this is a centre and a scatter of shops rather than one address. Navigate to St.-Jakobs-Platz.",
    ],
    nearQuarter: "munich-jakobsplatz",
    sourceUrl: "https://www.ikg-m.de/kultus-und-religion/koscheres-essen/",
  },
  {
    slug: "geneva-kosher",
    name: "Eating in Geneva — and provisioning for the Mont Blanc valleys",
    city: "Geneva",
    country: "Switzerland",
    kind: "Restaurant",
    diet: "Mixed premises",
    summary:
      "A glatt restaurant within the community's own building, and kosher shopping around Champel — the nearest real provision to Chamonix, Annecy and the Savoie.",
    address: "Around the Communauté Israélite de Genève and Champel, Geneva",
    website: "https://swissjews.ch/en/jewishlife/religion/kosher/restaurants_hotels/",
    hechsher: {
      state: "unverified",
      note: "More than one supervision operates in Geneva — the CIG's own rabbinate and Machzikei Hadas among them — and they are not the same; each place displays its own",
    },
    notes: [
      "The geography that makes this matter: Chamonix is about an hour away and Annecy about thirty-five kilometres, and neither has a kosher shop. Geneva is the last stop before both.",
      "The restaurant is inside the Communauté Israélite de Genève's building rather than on a street, which means access and times follow a community's rules rather than a restaurant's. Book.",
      "Kosher shopping is around Champel, including counters inside ordinary supermarkets — a Swiss arrangement that surprises people expecting a kosher shop with its own front door.",
      "Geneva is expensive even by Swiss standards. A family driving in from France often shops in Lyon and keeps Geneva for the Shabbos that has to be somewhere.",
      "Coordinates deliberately not listed: the community building and the Champel shops are not the same place and we would rather send nobody to the wrong one of them. The Swiss federation's own list, linked here, is the live answer.",
    ],
    nearQuarter: "geneva-tranchees",
    sourceUrl: "https://swissjews.ch/en/jewishlife/religion/kosher/restaurants_hotels/",
  },
  {
    slug: "canazei-kosher-table",
    name: "Alba di Canazei — the only kosher kitchen in the Italian Alps",
    city: "Canazei",
    country: "Italy",
    kind: "Restaurant",
    diet: "Mixed premises",
    summary:
      "The kitchen at My Kosher Hotel in the Val di Fassa: reported as mehadrin under the Badatz of Lugano with a permanent mashgiach, and as far as we can establish the only one of its kind in the Italian mountains.",
    address: "Alba di Canazei, Val di Fassa, Trentino",
    coordinates: "46.47500, 11.77333",
    website: "https://www.mykosherhotel.it/en/",
    hechsher: {
      state: "reported",
      note: "Reported as kosher mehadrin under the Badatz of Lugano — Rav Benzion Rabinowitz, the Biale Rebbe — with a mashgiach on the premises",
      source: "The hotel's own published listings",
    },
    notes: [
      "Listed as an eatery as well as a stay because it answers a question a hotel listing does not: driving through the Dolomites, is there anywhere at all to eat. This is the answer, and it is the only one.",
      "It is a hotel kitchen. Whether it serves people who are not staying, and on what notice, is a question for the hotel — ask before building a day's drive around lunch there.",
      "Reported, not confirmed. Nobody here has checked the supervision with the Badatz, and the wording above is what the hotel publishes about itself. Check it yourself before you eat.",
      "The coordinate is Canazei, the published one for the comune. The hotel is at Alba, a little further up the valley.",
      "For scale: the next kosher provision in any direction is Milan to the south-west, Turin beyond it, and Munich or Vienna over the mountains to the north. Merano has the only shul in South Tyrol but no kosher shop, and Innsbruck has neither. This valley is genuinely on its own.",
    ],
    sourceUrl: "https://www.mykosherhotel.it/en/",
  },

  // ---- South Florida ---------------------------------------------------
  {
    slug: "miami-beach-41st-street-kosher",
    name: "Certified food near 41st Street, Miami Beach",
    city: "Miami Beach",
    country: "United States",
    kind: "Restaurant",
    diet: "Mixed premises",
    summary:
      "The official ORB directory identifies several certified restaurants around West 41st Street, a useful starting point for a Miami Beach food plan.",
    address: "West 41st Street, Miami Beach, FL 33140",
    website: "https://www.orbkosher.com/find-kosher/",
    hechsher: {
      state: "reported",
      hechsherId: "orb-kosher",
      note: "The ORB publishes individual listings and certificate links for several restaurants in this corridor.",
      source: "ORB's official Find Kosher directory",
    },
    notes: [
      "This is a corridor listing, not one restaurant. Use the ORB's live page to choose an exact establishment and read its current certificate.",
      "Kosher Miami also provides an official establishments directory with a Miami Beach area filter.",
      "The street is near the Jewish Learning Center-Chabad on West 41st Street, which is the practical anchor for a walkable Shabbos base.",
    ],
    nearQuarter: "miami-beach-41st-street",
    sourceUrl: "https://koshermiami.org/establishments/",
  },
  {
    slug: "hollywood-stirling-road-kosher",
    name: "Certified food around Stirling Road, Hollywood",
    city: "Hollywood",
    country: "United States",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "The official ORB directory identifies restaurants, bakeries and markets on or around Stirling Road in Hollywood.",
    address: "Stirling Road, Hollywood, FL 33021 — use the ORB directory for individual addresses",
    website: "https://www.orbkosher.com/find-kosher/",
    hechsher: {
      state: "reported",
      hechsherId: "orb-kosher",
      note: "The ORB publishes individual Hollywood listings and certificate links for this food corridor.",
      source: "ORB's official Find Kosher directory",
    },
    notes: [
      "This is a corridor listing, not a claim about every business on the road. Choose an individual establishment from the ORB's current directory.",
      "The Hallandale Shabbos anchor and the Hollywood food listings are different parts of the same South Florida trip, so choose your hotel with both in mind.",
    ],
    sourceUrl: "https://www.orbkosher.com/find-kosher/",
  },

  // ---- Orlando and Central Florida ------------------------------------
  {
    slug: "kosher-grill-orlando",
    name: "Kosher Grill",
    city: "Orlando",
    country: "United States",
    kind: "Restaurant",
    diet: "Meat",
    summary:
      "A meat restaurant on International Drive that Kosher Orlando lists with an RCF hechsher.",
    address: "5615 International Drive, Orlando, FL 32819",
    hechsher: {
      state: "reported",
      note: "RCF hechsher",
      source: "Kosher Orlando’s local food directory",
    },
    notes: [
      "The local directory identifies this as a meat restaurant and names the RCF hechsher.",
      "Confirm current supervision and arrangements directly before relying on it for a meal or a Shabbos order.",
    ],
    sourceUrl: "https://www.kosherorlando.org/kosher-food-2/",
  },
  {
    slug: "krembo-orlando",
    name: "Krembo",
    city: "Orlando",
    country: "United States",
    kind: "Cafe",
    diet: "Dairy",
    summary:
      "A dairy café and bakery on Turkey Lake Road that Kosher Orlando lists with an RCF hechsher.",
    address: "8015 Turkey Lake Road, Orlando, FL 32819",
    hechsher: {
      state: "reported",
      note: "RCF hechsher; cholov Yisroel as listed",
      source: "Kosher Orlando’s local food directory",
    },
    notes: [
      "The local directory identifies Krembo as a dairy café and bakery, and records the RCF hechsher and cholov Yisroel claim.",
      "Confirm current supervision and arrangements directly before relying on it for a meal or a Shabbos order.",
    ],
    sourceUrl: "https://www.kosherorlando.org/kosher-food-2/",
  },

  // ---- Worldwide community quarters -----------------------------------
  // Listed as quarters, not single businesses, for the reason the Marais and
  // Antwerp entries above are: the shops change hands, the street does not. The
  // hechsher is left unverified because a quarter has many supervisions at once
  // and no single one covers it — the teudah in each window is the live answer.
  {
    slug: "jerusalem-geula-eating",
    name: "Geula and Mea Shearim — eating in Jerusalem",
    city: "Jerusalem",
    country: "Israel",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "The old chareidi shopping streets north of the centre — bakeries, takeaways, groceries and restaurants, the length of Malchei Yisrael and around.",
    address: "Malchei Yisrael and Geula, Jerusalem",
    coordinates: "31.7896, 35.2197",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — badatz supervisions differ shop by shop and are displayed in the window",
    },
    notes: [
      "The question here is never whether something is kosher but under which badatz, and the teudah is in every window.",
      "Everything shuts early on Erev Shabbos and the streets empty. Do not plan a late Friday afternoon here.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Geula",
  },
  {
    slug: "borough-park-eating",
    name: "Borough Park — eating in Brooklyn",
    city: "New York",
    country: "United States",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "One of the densest kosher shopping districts anywhere, along 13th Avenue and the streets around it in Brooklyn.",
    address: "13th Avenue, Borough Park, Brooklyn, NY",
    coordinates: "40.6335, -73.9950",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — supervisions differ shop by shop and the teudah is in the window",
    },
    notes: [
      "Bakeries, groceries, butchers and takeaways for blocks. A car is a burden here — the district is walkable and parking is not.",
      "Flatbush and Williamsburg are the other two great kosher districts of Brooklyn, each with its own supervisions.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Borough_Park,_Brooklyn",
  },
  {
    slug: "pico-robertson-eating",
    name: "Pico-Robertson — eating in Los Angeles",
    city: "Los Angeles",
    country: "United States",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "The kosher heart of Los Angeles, restaurants and bakeries along Pico Boulevard and Robertson in the city's Jewish quarter.",
    address: "Pico Boulevard and Robertson, Los Angeles, CA",
    coordinates: "34.0546, -118.3855",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — supervisions differ shop by shop and the teudah is in the window",
    },
    notes: [
      "The widest choice of kosher restaurants on the West Coast, from delis to fine dining, in a few walkable blocks.",
      "Los Angeles is spread out; this quarter is where a frum visitor without a car can base themselves.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Pico-Robertson",
  },
  {
    slug: "toronto-bathurst-eating",
    name: "The Bathurst corridor — eating in Toronto",
    city: "Toronto",
    country: "Canada",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "Toronto's kosher food runs up Bathurst Street through North York to Thornhill — bakeries, groceries and restaurants the length of it.",
    address: "Bathurst Street, North York, Toronto",
    coordinates: "43.7350, -79.4290",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — most are under COR (Kashruth Council of Canada); the teudah is in the window",
    },
    notes: [
      "The community stretches north along Bathurst; the food follows it, thickening toward Thornhill at the top.",
      "COR, the Kashruth Council of Canada, certifies much of it — but confirm each place rather than assuming.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/History_of_the_Jews_in_Toronto",
  },
  {
    slug: "montreal-snowdon-eating",
    name: "Côte-des-Neiges and Snowdon — eating in Montreal",
    city: "Montreal",
    country: "Canada",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "Montreal's kosher shopping, through Snowdon and Côte-des-Neiges and out to Hampstead and Côte-Saint-Luc.",
    address: "Snowdon / Côte-des-Neiges, Montreal, QC",
    coordinates: "45.4890, -73.6320",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — much is under the MK (Council of Orthodox Rabbis of Montreal); the teudah is in the window",
    },
    notes: [
      "One of the oldest and most established kosher communities in North America, with deep everyday provision.",
      "The MK certifies much of the city's kosher food; confirm each place before relying on it.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/History_of_the_Jews_in_Montreal",
  },
  {
    slug: "buenos-aires-once-eating",
    name: "Once — eating in Buenos Aires",
    city: "Buenos Aires",
    country: "Argentina",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "The kosher heart of one of the world's largest Jewish communities, in the Once quarter around Calle Tucumán.",
    address: "Once (Balvanera), Buenos Aires",
    coordinates: "-34.6093, -58.4053",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — supervisions differ shop by shop and the teudah is in the window",
    },
    notes: [
      "Restaurants, bakeries and groceries through the streets of Once; the smarter Belgrano neighbourhood to the north has more as well.",
      "Buenos Aires keeps a full kosher provision — meat, dairy and parve — rare on this scale outside Israel and New York.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/History_of_the_Jews_in_Argentina",
  },
  {
    slug: "sydney-bondi-eating",
    name: "Bondi and the eastern suburbs — eating in Sydney",
    city: "Sydney",
    country: "Australia",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "Sydney's kosher food gathers in the eastern suburbs around Bondi — bakeries, butchers and takeaways along Hall Street and beyond.",
    address: "Bondi and the eastern suburbs, Sydney NSW",
    coordinates: "-33.8900, 151.2650",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — much is under the NSW Kashrut Authority; the teudah is in the window",
    },
    notes: [
      "The community sits in the eastern suburbs, and the food with it — walkable from the beach and the shuls.",
      "The Kashrut Authority (KA) certifies much of Sydney's kosher food; confirm each place before relying on it.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Bondi,_New_South_Wales",
  },
  {
    slug: "melbourne-caulfield-eating",
    name: "Caulfield and Ripponlea — eating in Melbourne",
    city: "Melbourne",
    country: "Australia",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "Melbourne's large frum community and its kosher food, around Caulfield, Ripponlea and Carlisle Street in Balaclava.",
    address: "Caulfield / Ripponlea, Melbourne VIC",
    coordinates: "-37.8770, 145.0230",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — much is under Kosher Australia (Melbourne); the teudah is in the window",
    },
    notes: [
      "The deepest kosher provision in the southern hemisphere, everyday rather than special-occasion.",
      "Kosher Australia certifies much of it; confirm each place before relying on it.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Caulfield,_Victoria",
  },
  {
    slug: "cape-town-sea-point-eating",
    name: "Sea Point — eating in Cape Town",
    city: "Cape Town",
    country: "South Africa",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "Cape Town's kosher food along Regent Road and Main Road in Sea Point, below the community on the Atlantic seaboard.",
    address: "Regent Road, Sea Point, Cape Town",
    coordinates: "-33.9150, 18.3840",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — much is under the Cape Beth Din; the teudah is in the window",
    },
    notes: [
      "Restaurants, bakeries and a kosher supermarket, walkable along the seafront suburb.",
      "The Cape Beth Din certifies much of the city's kosher food; confirm each place before relying on it.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Sea_Point",
  },
  {
    slug: "johannesburg-glenhazel-eating",
    name: "Glenhazel — eating in Johannesburg",
    city: "Johannesburg",
    country: "South Africa",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "The kosher centre of Johannesburg's large frum community, through Glenhazel and the northern suburbs around it.",
    address: "Glenhazel, Johannesburg",
    coordinates: "-26.1300, 28.0950",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — much is under the Johannesburg Beth Din (UOS); the teudah is in the window",
    },
    notes: [
      "Full everyday provision — restaurants, bakeries, butchers and supermarkets — in a compact, walkable suburb.",
      "The Beth Din (Union of Orthodox Synagogues) certifies much of it; confirm each place before relying on it.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Glenhazel",
  },
  {
    slug: "mexico-city-polanco-eating",
    name: "Polanco and Tecamachalco — eating in Mexico City",
    city: "Mexico City",
    country: "Mexico",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "Mexico City's kosher food, in the smart Polanco district and out toward the community in Tecamachalco.",
    address: "Polanco / Tecamachalco, Mexico City",
    coordinates: "19.4330, -99.1900",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — supervisions differ shop by shop and the teudah is in the window",
    },
    notes: [
      "Mexico City holds a large, well-organised Jewish community with restaurants, bakeries and groceries.",
      "Provision runs from Polanco out to Tecamachalco and Bosques; a car helps between them.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/History_of_the_Jews_in_Mexico",
  },
  {
    slug: "amsterdam-buitenveldert-eating",
    name: "Buitenveldert and Amstelveen — eating in Amsterdam",
    city: "Amsterdam",
    country: "Netherlands",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "Amsterdam's kosher food, in the southern district of Buitenveldert and out toward Amstelveen where the community now lives.",
    address: "Buitenveldert / Amstelveen, Amsterdam",
    coordinates: "52.3300, 4.8700",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — much is under the NIK (Dutch Ashkenazi rabbinate); the teudah is in the window",
    },
    notes: [
      "The historic Jewish quarter by the Portuguese Synagogue is a heritage site; the living community and its food moved south to Buitenveldert.",
      "A kosher supermarket, a butcher and a bakery serve the district; confirm each before relying on it.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/History_of_the_Jews_in_Amsterdam",
  },
  {
    slug: "zurich-wiedikon-eating",
    name: "Wiedikon — eating in Zurich",
    city: "Zurich",
    country: "Switzerland",
    kind: "Grocery",
    diet: "Mixed premises",
    summary:
      "Zurich's kosher food in Wiedikon, the district around the shuls where the frum community lives.",
    address: "Wiedikon, Zurich",
    coordinates: "47.3670, 8.5170",
    hechsher: {
      state: "unverified",
      note: "A quarter rather than one business — supervisions differ shop by shop and the teudah is in the window",
    },
    notes: [
      "Restaurants, a bakery and a kosher supermarket, walkable around the Löwenstrasse and Erikastrasse shuls.",
      "Zurich has Switzerland's largest kosher provision; Geneva and Basel have smaller communities of their own.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Wiedikon",
  },
];

/**
 * The curated highlights, plus the certifier-directory set.
 *
 * The curated entries above carry the detail — diet, the quarter they sit in,
 * what the dish is. The directory set (data/kosher-eateries-directory.ts) is
 * the breadth: every place a recognised hechsher or community lists, with the
 * source and the same "confirm supervision" caution, and nothing invented on
 * top of what the source says.
 */
/**
 * THE ONE DOOR EVERYTHING KOSHER-FOOD COMES THROUGH, so the junk filter cannot
 * be walked around by a page importing the directory array directly.
 *
 * withoutScrapedJunk drops what is not a business at all — a "Need Help?"
 * support box, a cookie "Close" button, a newsletter form — and tidies the
 * HTML entities a scraped name arrives carrying. Ten harvested rows in the
 * directory set were page furniture, each wrapped by the generator in a
 * sentence asserting a named certifier lists it as kosher. See
 * data/listing-quality.ts for why the test is deliberately conservative.
 *
 * This is a fail-safe, not the only guard: the import pack's own validator now
 * refuses the same shape, so a future harvest fails at the source rather than
 * being quietly filtered here forever.
 */
export const kosherEateries: KosherEatery[] = withoutScrapedJunk([...curatedEateries, ...directoryEateries]);

/** Everything in one country, for the country filters. */
export function eateriesIn(country: string) {
  return kosherEateries.filter((e) => e.country === country);
}
