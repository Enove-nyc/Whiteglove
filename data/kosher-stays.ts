// Where to sleep, and how far that is from everything you need.
//
// Three honesties this file is built around, because getting any of them wrong
// costs somebody a Shabbos:
//
// 1. WHETHER A HOTEL IS KOSHER IS A KASHRUS CLAIM. It is the same kind of claim
//    as a hechsher on a restaurant, and this site does not make it on its own
//    authority. Every entry says what the source says and who the source is,
//    and `kosherClaim` records how far it has been checked. A hotel that makes
//    no kosher claim carries no kashrus caveat either — a disclaimer under a
//    plain hotel reads as a doubt about something, and there is nothing there
//    to doubt.
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
  | "Kosher-friendly, in the Jewish quarter"
  | "Ordinary hotel, well placed";

/**
 * What, if anything, this place claims about kashrus.
 *
 * A hotel does not have to be kosher to be worth listing — most of the good
 * ones are ordinary hotels chosen for where they stand. But a plain hotel
 * should not carry a kashrus disclaimer it never invited: "we have not
 * confirmed the kashrus here" printed under a hotel that makes no such claim
 * reads as a doubt about something, and there is nothing to doubt.
 *
 *   none      — makes no kosher claim, and none is implied
 *   reported  — a source says it is kosher; nobody here has checked
 *   confirmed — checked by the owner against the hotel or its mashgiach
 */
export type KosherClaim = "none" | "reported" | "confirmed";

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
  /** What it claims about kashrus, and how far that has been checked. */
  kosherClaim: KosherClaim;
  notes?: string[];
  website?: string;
  sourceUrl: string;
};

/**
 * The Jewish quarters themselves, with published coordinates.
 *
 * These answer "which part of town do I stay in", which is the question people
 * ask before they have picked a hotel at all.
 */
export const kosherAreas: Array<{ slug: string; city: string; country: string; name: string; coordinates: string; note: string; sourceUrl: string }> = [
  {
    slug: "rome-ghetto",
    city: "Rome",
    country: "Italy",
    name: "The Ghetto — around the Great Synagogue and Via del Portico d'Ottavia",
    coordinates: "41.8921, 12.4780",
    note: "The kosher restaurants, the bakeries and the Great Synagogue are in the same few streets, and it is walkable to the Forum and the river. This is where a kosher Rome trip is based.",
    sourceUrl: "https://en.wikipedia.org/wiki/Great_Synagogue_of_Rome",
  },
  {
    slug: "milan-via-sally-mayer",
    city: "Milan",
    country: "Italy",
    name: "Around Via Sally Mayer and the Via Guastalla synagogue",
    coordinates: "45.4580, 9.1560",
    note: "Milan's kosher infrastructure is the largest in Italy and sits away from the Duomo, roughly 3 km out. Staying by the sights means a journey to every meal.",
    sourceUrl: "https://en.wikipedia.org/wiki/Milan_Synagogue",
  },
  {
    slug: "paris-pletzl",
    city: "Paris",
    country: "France",
    name: "The Pletzl — rue des Rosiers and the Marais",
    coordinates: "48.8571, 2.3599",
    note: "Central Paris's kosher food, the Agudath Hakehilot shul and a walk to the Seine, Notre-Dame and the Louvre. The 19th arrondissement has more kosher food again, but is further from the sights.",
    sourceUrl: "https://en.wikipedia.org/wiki/Marais",
  },
  {
    slug: "zurich-wiedikon",
    city: "Zurich",
    country: "Switzerland",
    name: "Wiedikon",
    coordinates: "47.3690, 8.5170",
    note: "The shuls, the kosher shops and the eruv are here, about 2 km from the old town — which is what makes it the part of Zurich to be in for Shabbos.",
    sourceUrl: "https://en.wikipedia.org/wiki/Z%C3%BCrich-Wiedikon",
  },
  {
    slug: "venice-cannaregio",
    city: "Venice",
    country: "Italy",
    name: "Cannaregio, around the Ghetto",
    coordinates: "45.4453, 12.3265",
    note: "The Ghetto and the little kosher provision there are in Cannaregio. Venice is walked everywhere, so staying here means Shabbos works — but order food ahead, because there is very little of it.",
    sourceUrl: "https://en.wikipedia.org/wiki/Venetian_Ghetto",
  },
  {
    slug: "florence-great-synagogue",
    city: "Florence",
    country: "Italy",
    name: "Around the Great Synagogue, east of the centre",
    coordinates: "43.7714, 11.2665",
    note: "Ten minutes' walk from the Duomo, which is unusual — in most Italian cities the Jewish quarter and the sights are not the same walk. In Florence they are.",
    sourceUrl: "https://en.wikipedia.org/wiki/Great_Synagogue_of_Florence",
  },
  {
    slug: "geneva-tranchees",
    city: "Geneva",
    country: "Switzerland",
    name: "Around the Beth Yaacov synagogue, Les Tranchées",
    coordinates: "46.2000, 6.1500",
    note: "Geneva is the practical base for the French Alps and Lake Geneva — Annecy, Chamonix and Chillon are all day trips, and unlike the resorts the kosher food here is year-round.",
    sourceUrl: "https://en.wikipedia.org/wiki/Grande_Synagogue_de_Gen%C3%A8ve",
  },
  {
    slug: "lucerne-central",
    city: "Lucerne",
    country: "Switzerland",
    name: "Central Lucerne, near the synagogue on Bruchstrasse",
    coordinates: "47.0480, 8.3050",
    note: "A small kehilla, but it makes Lucerne workable as a base for Pilatus, Rigi and the lake. Confirm what food is available before relying on it — this is not Zurich.",
    sourceUrl: "https://www.chabadluzern.com/",
  },
  {
    slug: "london-golders-green",
    city: "London",
    country: "United Kingdom",
    name: "Golders Green, Hendon and Stamford Hill",
    coordinates: "51.5720, -0.1940",
    note: "London's kosher food and shuls are in the north-west and the north-east, 30 to 45 minutes by Underground from the central sights. Staying in the middle of town means carrying every meal.",
    sourceUrl: "https://en.wikipedia.org/wiki/Golders_Green",
  },
  {
    slug: "manchester-prestwich",
    city: "Manchester",
    country: "United Kingdom",
    name: "Prestwich, Broughton Park and Whitefield",
    coordinates: "53.5250, -2.2820",
    note: "One of the largest kosher infrastructures in Europe, and the practical base for the Lake District and the north — neither of which has any kosher food at all.",
    sourceUrl: "https://en.wikipedia.org/wiki/Prestwich",
  },
  {
    slug: "vienna-leopoldstadt",
    city: "Vienna",
    country: "Austria",
    name: "The 2nd district, Leopoldstadt",
    coordinates: "48.2160, 16.3830",
    note: "Vienna's kehilla, its shuls and its kosher shops are across the canal in the 2nd, about twenty minutes' walk from the Judenplatz and the centre.",
    sourceUrl: "https://en.wikipedia.org/wiki/Leopoldstadt",
  },
  {
    slug: "madrid-chamberi",
    city: "Madrid",
    country: "Spain",
    name: "Chamberi, around the Beth Yaacov synagogue",
    coordinates: "40.4380, -3.7000",
    note: "Spain's Jewish heritage is in Toledo, Cordoba and Girona, and none of those towns has kosher food. Madrid and Barcelona are where you sleep and eat; the juderias are day trips.",
    sourceUrl: "https://en.wikipedia.org/wiki/Madrid_Synagogue",
  },
  {
    slug: "athens-thiseio",
    city: "Athens",
    country: "Greece",
    name: "Around the Beth Shalom synagogue, Thiseio",
    coordinates: "37.9760, 23.7180",
    note: "A small kehilla but a real one, and close enough to the Acropolis to walk. It is what makes Athens workable when most of Greece is not.",
    sourceUrl: "https://en.wikipedia.org/wiki/Athens_Synagogue",
  },
  {
    slug: "jerusalem-quarters",
    city: "Jerusalem",
    country: "Israel",
    name: "The Old City, Rechavia, Geula and Har Nof",
    coordinates: "31.7780, 35.2300",
    note: "The whole city is kosher, so the question is not food but distance. Inside the Old City walls you are minutes from the Kosel; Rechavia and Geula are a short bus or a long walk; Har Nof is out west and quiet.",
    sourceUrl: "https://en.wikipedia.org/wiki/Jerusalem",
  },
  {
    slug: "nice-dubouchage",
    city: "Nice",
    country: "France",
    name: "Around the Boulevard Dubouchage synagogue",
    coordinates: "43.7020, 7.2700",
    note: "Nice has a real kosher community, which is what makes the Côte d'Azur workable for a family when most of the French coast is not.",
    sourceUrl: "https://en.wikipedia.org/wiki/Nice",
  },
  {
    slug: "lyon-villeurbanne",
    city: "Lyon",
    country: "France",
    name: "Lyon and Villeurbanne — the Grande Synagogue, and the food out at Villeurbanne",
    coordinates: "45.7571, 4.8277",
    note: "The coordinate is the Grande Synagogue on the quai Tilsitt, in the middle of Lyon. The kosher shops and restaurants are not there — they are out in Villeurbanne and the 8th, a few kilometres east, which is the same split as Paris between the Marais and the 19th. This is the base that makes the French Alps possible: Annecy, Grenoble and Chamonix are all a day trip, and unlike the resorts there is food here every week of the year.",
    sourceUrl: "https://en.wikipedia.org/wiki/Great_Synagogue_of_Lyon",
  },
  {
    slug: "grenoble-jewish-life",
    city: "Grenoble",
    country: "France",
    name: "Grenoble — a kehilla with a rabbinate, in the mountains themselves",
    coordinates: "45.17167, 5.72250",
    note: "Not a quarter but a city: Grenoble's shuls, its rabbinate and its handful of kosher places are spread across it rather than gathered in one street, so this is a city to stay anywhere central in. What makes it worth knowing is the geography — this is a real kehilla inside the Alps rather than on the edge of them, with the Vercors, the Chartreuse and the Belledonne all visible from the town.",
    sourceUrl: "https://www.grande-synagogue-de-grenoble.fr/casher",
  },
  // ---- The countries the kevarim are in -------------------------------
  //
  // Added after the attractions batch, because a family with eleven batei
  // hachaim and eleven things to do in Poland still had nowhere to sleep.
  //
  // These are not all the same kind of place, and the notes say which is which.
  // Antwerp is a living kehilla you can walk a Shabbos in. Berlin's Jewish life
  // is scattered across a very large city and the big shul is not where the food
  // is. Kraków and Prague are historic quarters that are now largely tourist
  // districts with a working shul inside them. Somebody choosing a hotel needs
  // to know the difference before they book, not after.
  {
    slug: "antwerp-jewish-quarter",
    city: "Antwerp",
    country: "Belgium",
    name: "The Jewish quarter — around Bouwmeestersstraat and the diamond district",
    coordinates: "51.20777, 4.39698",
    note: "The strongest kehilla in this batch by a distance, and the one place in Western Europe where Yiddish is still a working street language. Some twenty thousand Jews live in the streets between Central Station and the bourses, with the butchers, bakers, seforim shops and a choice of shuls all inside a few blocks. If you want a trip where Shabbos looks like Shabbos, stay here rather than in Brussels and travel out.",
    sourceUrl: "https://en.wikipedia.org/wiki/Hollandse_Synagoge",
  },
  {
    slug: "frankfurt-westend",
    city: "Frankfurt",
    country: "Germany",
    name: "The Westend, around the Westend Synagogue",
    coordinates: "50.12111, 8.66439",
    note: "Frankfurt has the most usable kosher infrastructure in Germany and it sits in the Westend, around the one large pre-war shul that survived 1938 and the bombing. Walkable, central, and about fifteen minutes from the Hauptbahnhof — which matters because Frankfurt is the natural gateway for a ShUM trip to Worms, Speyer and Mainz, all within an hour.",
    sourceUrl: "https://en.wikipedia.org/wiki/Westend_Synagogue",
  },
  {
    slug: "munich-jakobsplatz",
    city: "Munich",
    country: "Germany",
    name: "Around St.-Jakobs-Platz and the Ohel Jakob synagogue",
    coordinates: "48.13444, 11.57250",
    note: "The community centre, the shul and the Jewish Museum are one complex on Jakobsplatz, five minutes' walk from Marienplatz — unusually central for a European kehilla. This is the base for the Bavarian Alps: Neuschwanstein is two hours out and the Zugspitze an hour and a half, and neither has anything kosher, so the day's food comes from here.",
    sourceUrl: "https://en.wikipedia.org/wiki/Ohel_Jakob_synagogue_(Munich)",
  },
  {
    slug: "berlin-jewish-life",
    city: "Berlin",
    country: "Germany",
    name: "Charlottenburg for the food, Prenzlauer Berg for the big shul",
    coordinates: "52.53528, 13.41861",
    note: "Berlin is the one city here where naming a single quarter would mislead you. Germany's largest shul is the Rykestrasse synagogue in Prenzlauer Berg — the coordinate here — but most of the kosher shopping and the community services are across the city in Charlottenburg and Wilmersdorf, and Berlin is very large. Decide which you are optimising for and check the distance on a map before booking; a hotel that is walking distance to one is a journey from the other.",
    sourceUrl: "https://en.wikipedia.org/wiki/Rykestrasse_Synagogue",
  },
  {
    slug: "prague-josefov",
    city: "Prague",
    country: "Czechia",
    name: "Josefov, around the Altneuschul",
    coordinates: "50.09000, 14.41861",
    note: "The old Jewish town, and now also one of the busiest tourist districts in Europe — both things are true at once. What makes it worth staying in is that the Altneuschul still has daily minyanim, the kosher restaurants are in the same few streets, and the Maharal's kever is a few minutes' walk. It is also five minutes from the Old Town Square, so the sightseeing needs no travel at all.",
    sourceUrl: "https://en.wikipedia.org/wiki/Old_New_Synagogue",
  },
  {
    slug: "budapest-seventh-district",
    city: "Budapest",
    country: "Hungary",
    name: "The 7th district, around the Kazinczy Street synagogue",
    coordinates: "47.49833, 19.06250",
    note: "The Kazinczy Street shul is the centre of Budapest's orthodox kehilla and its complex holds a beis midrash, a school and a kosher kitchen. The surrounding 7th district is the old Jewish quarter and Budapest's kosher food is here. One thing to know before booking a room: these same streets are now the city's nightlife district, so ask where the hotel sits within them.",
    sourceUrl: "https://en.wikipedia.org/wiki/Kazinczy_Street_Synagogue,_Budapest",
  },
  {
    slug: "krakow-kazimierz-quarter",
    city: "Kraków",
    country: "Poland",
    name: "Kazimierz, around the Remuh on Szeroka",
    coordinates: "50.05264, 19.94731",
    note: "Where a Kraków trip is based. The Remuh is a working shul of 1557 with the Remuh's own kever behind it, the kosher food is on the same streets, and Wawel is ten minutes' walk with the Main Square twenty. It is also the base for Auschwitz — an hour and a half west, and a day that needs food carried from here.",
    sourceUrl: "https://en.wikipedia.org/wiki/Remah_Synagogue",
  },
  {
    slug: "warsaw-nozyk",
    city: "Warsaw",
    country: "Poland",
    name: "Śródmieście, around the Nożyk synagogue on Twarda",
    coordinates: "52.23611, 21.00111",
    note: "The Nożyk is the only pre-war shul in Warsaw still standing — the Germans used it as a stable, which is what saved it — and it is the centre of what Jewish Warsaw there now is. Central, and within reach of POLIN and the Old Town on foot or one tram. Warsaw's kosher provision is thinner than Kraków's; check what is open for the days you are there rather than assuming.",
    sourceUrl: "https://en.wikipedia.org/wiki/No%C5%BCyk_Synagogue",
  },
  // ---- Israel ---------------------------------------------------------
  //
  // Yerushalayim was the only Israeli quarter listed, and the country had no
  // stays at all — for the place this audience travels to most, and where the
  // site carries sixty kevarim.
  {
    slug: "bnei-brak-rabbi-akiva",
    city: "Bnei Brak",
    country: "Israel",
    name: "Around Rabbi Akiva Street",
    coordinates: "32.08603, 34.83194",
    note: "There is nowhere in the world with more kosher food per square metre. Rabbi Akiva Street runs the length of the city and everything is on it or off it, and the whole town keeps Shabbos, so nothing has to be arranged or asked about. What Bnei Brak does not have is hotels — it is a city of flats, and what visitors take are short-term apartments. Ten minutes from Tel Aviv and forty-five from Yerushalayim.",
    sourceUrl: "https://www.wikidata.org/wiki/Q6907785",
  },
  {
    slug: "tiberias-centre",
    city: "Tiberias (Teverya)",
    country: "Israel",
    name: "Central Teverya, around the Rambam's kever",
    coordinates: "32.79015, 35.53734",
    note: "The base for the Galilee kevarim, and the reason is geography: the Rambam and the Shelah are in the city centre, Rabbi Meir Baal HaNes is two and a half kilometres south, and Meron, Tzfat and Amuka are all inside an hour. Teverya has real hotels, which Tzfat and Bnei Brak largely do not, and kosher food is the default rather than something to hunt for. Note that the Kinneret beaches are mixed bathing; the town is worth staying in for the kevarim and the position, and that is what it is listed for.",
    sourceUrl: "https://en.wikipedia.org/wiki/Tomb_of_Maimonides",
  },
  {
    slug: "amsterdam-buitenveldert",
    city: "Amsterdam",
    country: "Netherlands",
    name: "Buitenveldert and Amstelveen — the modern Jewish quarter",
    coordinates: "52.32861, 4.87528",
    note: "The single most useful thing this site can tell somebody about Amsterdam. The famous Jewish quarter — the Esnoga, the Jewish Museum, the Hollandsche Schouwburg — is a heritage district in the centre, and almost nobody Jewish lives there now. About half of the forty thousand Jews in the Netherlands live out here in Buitenveldert and neighbouring Amstelveen, and between them these two suburbs hold six shuls, three schools, the community's main offices and nearly all its kosher shops. Stay in the centre and every meal is a journey; stay here and the sightseeing is a fifteen-minute tram.",
    sourceUrl: "https://en.wikipedia.org/wiki/Buitenveldert",
  },
  {
    slug: "gateshead-bensham",
    city: "Gateshead",
    country: "United Kingdom",
    name: "Bensham — the Jewish quarter of Gateshead",
    coordinates: "54.95311, -1.61061",
    note: "The largest centre of Torah learning in Europe, in a working-class district of a north-eastern industrial town — which is exactly as unlikely as it sounds. The Gateshead Yeshiva was founded in 1929 and draws talmidim from around the world, and the streets around it hold a full set of institutions and hundreds of families. Bensham was called Little Jerusalem long before anybody outside Britain had heard of it. The kosher shops are clustered on Coatsworth Road. This is not a tourist quarter and it is not set up as one — people live and learn here, and visitors are guests.",
    sourceUrl: "https://en.wikipedia.org/wiki/Gateshead_Talmudical_College",
  },
  {
    slug: "miami-beach-41st-street",
    city: "Miami Beach",
    country: "United States",
    name: "West 41st Street, around the Jewish Learning Center-Chabad",
    coordinates: "25.8122, -80.1315",
    note: "The Jewish Learning Center-Chabad is at 411 West 41st Street. Use the area as a practical stay anchor, then choose exact food from the official ORB and Kosher Miami directories rather than assuming every nearby business has the same certification.",
    sourceUrl: "https://www.lubavitch.com/centers/118271",
  },
  {
    slug: "hallandale-beach-chabad",
    city: "Hallandale Beach",
    country: "United States",
    name: "East Hallandale Beach Boulevard, around Chabad of South Broward",
    coordinates: "25.9877, -80.1388",
    note: "Chabad of South Broward is at 1295 East Hallandale Beach Boulevard. This is the Shabbos anchor to use when comparing Hallandale hotels; Hollywood's Stirling Road food listings are a separate part of the wider South Florida trip.",
    sourceUrl: "https://www.lubavitch.com/centers/117595",
  },
  {
    slug: "orlando-sand-lake-road",
    city: "Orlando",
    country: "United States",
    name: "Around Chabad of South Orlando on West Sand Lake Road",
    coordinates: "28.450015, -81.481941",
    note: "Chabad of South Orlando publishes its address as 7347 West Sand Lake Road. Use this as a practical Shabbos planning anchor, then check the community’s current service location and the real walking route before booking nearby.",
    sourceUrl: "https://www.jewishorlando.com/templates/articlecco_cdo/aid/61721/jewish/Location.htm",
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
    kosherClaim: "none",
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
    kosherClaim: "reported",
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
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Marais",
  },

  {
    slug: "florence-centre-stays",
    name: "Staying near the Great Synagogue, Florence",
    city: "Florence",
    country: "Italy",
    kind: "Ordinary hotel, well placed",
    summary:
      "Florence is the rare Italian city where the shul and the sights are the same walk — ten minutes between the Great Synagogue and the Duomo. Ordinary hotels in that stretch put both within reach on foot.",
    anchor: { name: "Great Synagogue of Florence", coordinates: "43.7714, 11.2665" },
    notes: [
      "Nothing here is under supervision. What the position buys is a Shabbos you can walk and a Sunday you can walk too.",
      "Kosher food in Florence is limited and worth arranging before you arrive rather than on the day.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://www.jewishflorence.it/",
  },
  {
    slug: "venice-cannaregio-stays",
    name: "Staying in Cannaregio, by the Ghetto",
    city: "Venice",
    country: "Italy",
    kind: "Ordinary hotel, well placed",
    summary:
      "Venice has no cars, so where you sleep decides what you can reach on Shabbos more sharply than in any other city. Cannaregio puts you by the Ghetto and its shuls.",
    anchor: { name: "Campo di Ghetto Nuovo", coordinates: "45.4453, 12.3265" },
    notes: [
      "Everything in Venice is carried or walked. A hotel on the far side of the city is not a short journey on Shabbos, it is no journey at all.",
      "Kosher food here is very limited and usually needs ordering in advance. Sort it before you book the room, not after.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://www.museoebraico.it/en/",
  },
  {
    slug: "geneva-stays",
    name: "Staying in Geneva",
    city: "Geneva",
    country: "Switzerland",
    kind: "Ordinary hotel, well placed",
    summary:
      "The base that makes the French Alps and Lake Geneva work: Annecy, Chamonix and Chillon are day trips, and the kosher food is there all year rather than for six weeks in summer.",
    anchor: { name: "Beth Yaacov synagogue, Geneva", coordinates: "46.2000, 6.1500" },
    notes: [
      "The alpine resorts have kosher food only in season. A city base solves that, at the cost of an hour or two of travel each way.",
      "Geneva airport sits on the border and has a French exit as well as a Swiss one — worth knowing if the hire car is booked on the French side.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Grande_Synagogue_de_Gen%C3%A8ve",
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
    kosherClaim: "reported",
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
    kosherClaim: "reported",
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
    kosherClaim: "none",
    sourceUrl: "https://swissjews.ch/en/jewishlife/religion/kosher/restaurants_hotels/",
  },

  // ---- Germany, Belgium, Czechia, Hungary, Poland, Israel -------------
  //
  // WHY THESE NAME A QUARTER AND NOT A HOTEL. A hotel's kosher arrangement, its
  // ownership and whether it is still trading all change from year to year, and
  // a named hotel printed here on the strength of a directory listing is a
  // recommendation this site cannot stand behind. What does not change from year
  // to year is which streets the shul, the food and the walk are in — so that is
  // what is listed, and the hotel is left to the traveler and a booking site.
  //
  // Every one of these is kosherClaim "none". None of them claims a kosher
  // kitchen, and none is given a kashrus caveat it never invited: what you are
  // buying is the position.
  {
    slug: "antwerp-quarter-stays",
    name: "Staying in the Antwerp Jewish quarter",
    city: "Antwerp",
    country: "Belgium",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary: "Hotels and apartment lets in the streets between Central Station and the diamond bourses, inside a kehilla of some twenty thousand people with a full week of shuls, shops and schools.",
    anchor: { name: "Shomre Hadas — the Hollandse Synagoge, Bouwmeestersstraat", coordinates: "51.20777, 4.39698" },
    notes: [
      "This is the strongest position in Western Europe for a Shabbos away from home: several shuls to choose from, butchers and bakers within a few blocks, and a community that lives there rather than visits.",
      "Ask about the eruv locally. Do not assume it from anything printed here.",
      "Brussels is forty minutes by train and Bruges an hour, so the sightseeing works from here — the reverse does not, because Brussels has far less kosher food.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Hollandse_Synagoge",
  },
  {
    slug: "frankfurt-westend-stays",
    name: "Staying in the Frankfurt Westend",
    city: "Frankfurt",
    country: "Germany",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary: "Central Frankfurt hotels within walking distance of the Westend Synagogue and the city's kosher shopping — the most usable kosher base in Germany.",
    anchor: { name: "Westend Synagogue, Freiherr-vom-Stein-Straße 30", coordinates: "50.12111, 8.66439" },
    notes: [
      "The Westend is an expensive district and the hotels reflect that; the compensation is that everything is walkable and the Hauptbahnhof is fifteen minutes away.",
      "This is the right base for a ShUM trip — Worms, Speyer and Mainz are each within an hour, and none of the three has kosher food.",
      "Frankfurt Airport is one of the largest in Europe, so the flight options are better than anywhere else in this list.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Westend_Synagogue",
  },
  {
    slug: "munich-jakobsplatz-stays",
    name: "Staying near Jakobsplatz, Munich",
    city: "Munich",
    country: "Germany",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary: "Hotels in Munich's old town within a few minutes of the Ohel Jakob synagogue and community centre, five minutes from Marienplatz.",
    anchor: { name: "Ohel Jakob synagogue, St.-Jakobs-Platz", coordinates: "48.13444, 11.57250" },
    notes: [
      "Unusually central for a European kehilla — the shul, the community centre and the Jewish Museum are one complex right by Marienplatz, so a hotel by the sights is also a hotel by the shul.",
      "This is the base for the Alps. Neuschwanstein is two hours, the Zugspitze an hour and a half, and there is nothing kosher at either — carry the day's food from here.",
      "Confirm what is open for the days you are travelling; Munich's kosher provision is real but small.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Ohel_Jakob_synagogue_(Munich)",
  },
  {
    slug: "berlin-stays",
    name: "Staying in Berlin — Charlottenburg or Prenzlauer Berg",
    city: "Berlin",
    country: "Germany",
    kind: "Ordinary hotel, well placed",
    summary: "Berlin has no single Jewish quarter to stay in. The largest shul is in Prenzlauer Berg and most of the kosher shopping is in Charlottenburg, and the two are a long way apart — so this entry is the choice rather than an answer.",
    anchor: { name: "Rykestrasse Synagogue, Prenzlauer Berg — Germany's largest shul", coordinates: "52.53528, 13.41861" },
    notes: [
      "Charlottenburg and Wilmersdorf, in the west, is where most of the kosher shopping and the community services are. Prenzlauer Berg, in the east, has the big shul. Berlin is large enough that this is a real decision and not a detail.",
      "Whichever you pick, check the distance to the other on a map before booking — a hotel that is a walk from one is a journey from the other.",
      "Listed as an ordinary hotel district rather than a Jewish quarter, because Berlin does not have one in the sense that Antwerp does.",
      "Everything on the things-to-do list for Berlin — the Brandenburg Gate, Museum Island, the Jewish Museum — is central and reachable from either.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Rykestrasse_Synagogue",
  },
  {
    slug: "prague-josefov-stays",
    name: "Staying in Josefov, Prague",
    city: "Prague",
    country: "Czechia",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary: "Hotels inside the old Jewish town, minutes from the Altneuschul, the kosher restaurants and the Maharal's kever — and five minutes from the Old Town Square.",
    anchor: { name: "The Altneuschul (Old-New Synagogue), Červená 2", coordinates: "50.09000, 14.41861" },
    notes: [
      "The best position of any city in this batch for combining kevarim and sightseeing: the Maharal, the shul, the food and the Charles Bridge are all inside a fifteen-minute walk.",
      "Josefov is also one of the busiest tourist quarters in Europe. Expect crowds outside your door in season, and book early.",
      "The Altneuschul has daily minyanim and is a working shul, not a museum — ask the kehilla about times rather than relying on visitor hours.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Old_New_Synagogue",
  },
  {
    slug: "budapest-seventh-stays",
    name: "Staying in Budapest's 7th district",
    city: "Budapest",
    country: "Hungary",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary: "The old Jewish quarter around the Kazinczy Street shul, where Budapest's kosher food is, and a natural base for the Hungarian kevarim.",
    anchor: { name: "Kazinczy Street Synagogue, Kazinczy utca 29-31", coordinates: "47.49833, 19.06250" },
    notes: [
      "One caution that decides which street you book on: the same few blocks are now Budapest's nightlife district. Ask the hotel exactly where it sits, and expect noise if it is on the wrong corner.",
      "This is the base for Kerestir, Ujhely, Kaliv and Liska — all of them two to three hours east, and all needing food carried from here.",
      "The Kazinczy complex holds a beis midrash and a kosher kitchen alongside the shul.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Kazinczy_Street_Synagogue,_Budapest",
  },
  {
    slug: "krakow-kazimierz-stays",
    name: "Staying in Kazimierz, Kraków",
    city: "Kraków",
    country: "Poland",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary: "Apartments and small hotels in Kazimierz, on the streets around the Remuh — the shul, the kever, the kosher food and the walk into the old town all from one place.",
    anchor: { name: "Remuh Synagogue, Szeroka 40", coordinates: "50.05264, 19.94731" },
    notes: [
      "Kazimierz is where a Polish kevarim trip is based, and the reason is simple: it is the one place in Poland with a working shul, kosher food and a real choice of lodging on the same streets.",
      "Auschwitz is an hour and a half west and Wieliczka half an hour east — both are day trips from here.",
      "Szeroka itself is lively in the evenings. A flat one street back is quieter for the same money.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Remah_Synagogue",
  },
  {
    slug: "warsaw-nozyk-stays",
    name: "Staying near the Nożyk synagogue, Warsaw",
    city: "Warsaw",
    country: "Poland",
    kind: "Ordinary hotel, well placed",
    summary: "Central Śródmieście hotels within reach of the Nożyk — the only pre-war shul left in Warsaw — and of POLIN and the Old Town.",
    anchor: { name: "Nożyk Synagogue, Twarda 6", coordinates: "52.23611, 21.00111" },
    notes: [
      "Listed as an ordinary hotel district rather than a Jewish quarter, because that is what it is. There is a shul and a community here; there is not a neighbourhood you can do a whole Shabbos in the way you can in Antwerp or Kazimierz.",
      "Warsaw's kosher provision is thinner than Kraków's. Establish what is actually open for your dates before you rely on it, and consider bringing what you need.",
      "Treblinka is two hours north-east with nothing on the way, and Warsaw is the only sensible base for it.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/No%C5%BCyk_Synagogue",
  },
  {
    slug: "bnei-brak-stays",
    name: "Staying in Bnei Brak",
    city: "Bnei Brak",
    country: "Israel",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary: "Short-term apartments off Rabbi Akiva Street. Not a hotel town — a city of flats where the whole week is already kosher and the whole city already keeps Shabbos.",
    anchor: { name: "Rabbi Akiva Street, the spine of the city", coordinates: "32.08603, 34.83194" },
    notes: [
      "Set expectations correctly: there is very little hotel stock here. What visitors rent are apartments, usually by the week, and usually through the community rather than a booking site.",
      "The compensation is that nothing needs arranging. Food, shuls, minyanim at every hour, and a Shabbos that requires no planning at all.",
      "Ten minutes from Tel Aviv and about forty-five from Yerushalayim, so it works as a base for both.",
      "The Chazon Ish, the Ponevezh bais hachaim and Zichron Meir are all in the city; three of this site's kever pages are within a short walk.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://www.wikidata.org/wiki/Q6907785",
  },
  {
    slug: "tiberias-stays",
    name: "Staying in central Teverya",
    city: "Tiberias (Teverya)",
    country: "Israel",
    kind: "Ordinary hotel, well placed",
    summary: "Hotels in the centre of Teverya, minutes from the Rambam and within an hour of Meron, Tzfat and Amuka — the practical base for a Galilee kevarim trip.",
    anchor: { name: "Kever HaRambam, central Teverya", coordinates: "32.79015, 35.53734" },
    notes: [
      "Teverya has actual hotels, at a range of prices, which is why people base here rather than in Tzfat — Tzfat's lodging is mostly tzimmerim and small guesthouses that book out.",
      "Kosher food is the default here rather than something to find. Confirm the hechsher of any particular place as you would anywhere.",
      "Rabbi Meir Baal HaNes is two and a half kilometres south; Meron, Tzfat and Amuka are each within about an hour.",
      "One thing to know before booking on the water: the Kinneret beaches are mixed bathing. A hotel on the promenade is a hotel beside them.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Tomb_of_Maimonides",
  },

  // ---- Every quarter now has a stay beside it -------------------------
  //
  // Eight of the twenty-six quarters had no matching stay, so somebody who
  // worked out WHICH part of town to be in was then left with nothing about
  // being there. These close that, and Amsterdam gets its first of either.
  //
  // Same rule as the rest of the file: a quarter, not a hotel. And the same
  // honesty about what kind of place each one is — three of these are listed
  // as ordinary hotel districts rather than Jewish quarters, because that is
  // what they are, and a family planning a Shabbos needs to know which.
  {
    slug: "amsterdam-buitenveldert-stays",
    name: "Staying in Buitenveldert or Amstelveen, not the old quarter",
    city: "Amsterdam",
    country: "Netherlands",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary:
      "Where Jewish Amsterdam actually lives — six shuls, three schools and nearly all the kosher shops, about fifteen minutes south of the centre by tram.",
    anchor: { name: "Buitenveldert, Amsterdam-Zuid", coordinates: "52.32861, 4.87528" },
    notes: [
      "This is the correction most Amsterdam trips need. The Jewish Cultural Quarter in the centre — the Esnoga, the Jewish Museum — is where the history is; Buitenveldert and Amstelveen are where the community is. Roughly half the Jews in the Netherlands live in these two suburbs.",
      "Staying here means the kosher shops and a choice of shuls are local and the sightseeing is a short tram ride. Staying in the centre reverses that, and the reverse is worse.",
      "It is ordinary residential Amsterdam — hotels are fewer out here than in the centre, and apartment lets are common.",
      "Beth Haim at Ouderkerk, listed on this site, is fifteen minutes further south from here rather than a trek out from the middle of town.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Buitenveldert",
  },
  {
    slug: "london-golders-green-stays",
    name: "Staying in Golders Green, Hendon or Stamford Hill",
    city: "London",
    country: "United Kingdom",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary:
      "Three separate Jewish neighbourhoods in one city, none of them central, each with a full week of shuls, shops and schools — and the choice between them is a real one.",
    anchor: { name: "Golders Green, north-west London", coordinates: "51.5720, -0.1940" },
    notes: [
      "They are not interchangeable. Golders Green and Hendon are north-west and about twenty-five minutes on the Northern line from the centre; Stamford Hill is north-east and has no tube at all, which surprises people who booked there for the shuls.",
      "Golders Green Road is the densest concentration of kosher food in Europe outside Israel. If food is the deciding factor, that is the street.",
      "None of the three is near the sightseeing. Expect to travel in each day — that is the trade for a walkable Shabbos.",
      "Ask locally about the eruv rather than relying on anything printed here; London has more than one and their boundaries matter.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Golders_Green",
  },
  {
    slug: "manchester-prestwich-stays",
    name: "Staying in Prestwich, Broughton Park or Whitefield",
    city: "Manchester",
    country: "United Kingdom",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary:
      "The largest kehilla in Britain outside London, spread across a few adjoining north Manchester suburbs, with kosher provision that is genuinely everyday.",
    anchor: { name: "Prestwich, north Manchester", coordinates: "53.5250, -2.2820" },
    notes: [
      "Broughton Park is the most concentrated of the three and the most walkable for Shabbos; Prestwich and Whitefield are more spread out and better if you have a car.",
      "About twenty minutes north of central Manchester, so the city itself is easy to get into and out of.",
      "Hotel stock in these suburbs is thin — most visitors take an apartment or stay with family. Plan accordingly rather than assuming a hotel.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Prestwich",
  },
  {
    slug: "vienna-leopoldstadt-stays",
    name: "Staying in Leopoldstadt, Vienna",
    city: "Vienna",
    country: "Austria",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary:
      "The 2nd district, across the canal from the old town — Vienna's Jewish quarter before the war and again now, with the kosher shops and shuls back in the same streets.",
    anchor: { name: "Leopoldstadt, Vienna's 2nd district", coordinates: "48.2160, 16.3830" },
    notes: [
      "Unusually convenient: Leopoldstadt is a bridge away from the Innere Stadt, so a hotel by the kosher food is also a hotel near everything a visitor came to see.",
      "The Boyaner Rebbe — the Pachad Yitzchak — is buried in Vienna and is listed on this site; the Zentralfriedhof is out to the south-east.",
      "Vienna is the natural gateway for the Hungarian and Slovak kevarim: Preshburg is an hour by train, and Kerestir about four hours by road.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Leopoldstadt",
  },
  {
    slug: "jerusalem-stays",
    name: "Staying in Yerushalayim — which neighbourhood",
    city: "Jerusalem",
    country: "Israel",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary:
      "Not one quarter but four answers — the Old City, Rechavia, Geula and Har Nof — and they suit completely different trips.",
    anchor: { name: "Central Jerusalem", coordinates: "31.7780, 35.2300" },
    notes: [
      "The Old City puts you minutes from the Kosel and is the reason many people come; it is also cramped, expensive, and hard with pushchairs and luggage.",
      "Rechavia and the centre are the hotel district — the widest choice of rooms, walkable to the Old City in twenty to thirty minutes, and everything kosher.",
      "Geula and Meah Shearim are where the heimishe shopping is and where apartment lets are cheapest; it is a residential neighbourhood and visitors are expected to dress and behave as residents do.",
      "Har Nof is quieter, family-oriented and further out to the west — good with children, and a bus or a car from anything else.",
      "Kosher is the default in all of them. The question here is position and price, not kashrus.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Jerusalem",
  },
  {
    slug: "nice-dubouchage-stays",
    name: "Staying near the Boulevard Dubouchage shul, Nice",
    city: "Nice",
    country: "France",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary:
      "Central Nice around the Dubouchage synagogue, which is the heart of one of the largest Jewish communities in France outside Paris.",
    anchor: { name: "Synagogue de Nice, Boulevard Dubouchage", coordinates: "43.7020, 7.2700" },
    notes: [
      "The kosher restaurants and shops are in the streets around the shul, and the shul itself is central rather than suburban — unusual, and it makes Nice easy.",
      "The Riviera is a beach destination and the seafront is what it is. This entry is for the position relative to the shul and the food; what you do with the beach is your own affair.",
      "Nice Airport is a short taxi from the centre and has good connections across Europe, which makes this a practical stop rather than a detour.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Nice",
  },
  {
    slug: "lucerne-central-stays",
    name: "Staying in central Lucerne",
    city: "Lucerne",
    country: "Switzerland",
    kind: "Ordinary hotel, well placed",
    summary:
      "Central Lucerne hotels near the Bruchstrasse synagogue, as a base for the mountains rather than for a kehilla.",
    anchor: { name: "Lucerne synagogue, Bruchstrasse", coordinates: "47.0480, 8.3050" },
    notes: [
      "Listed as an ordinary hotel district, because that is what it is. Lucerne's kehilla is small and its kosher provision is limited — this is not Zurich, which is an hour away and has the real infrastructure.",
      "The reason to be here is position: Pilatus, the Rigi and the lake are all from Lucerne, and the alpine attractions on this site cluster around it.",
      "Establish what kosher food is available for your dates before relying on any, and consider shopping in Zurich on the way through.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://www.chabadluzern.com/",
  },
  {
    slug: "madrid-chamberi-stays",
    name: "Staying in Chamberí, Madrid",
    city: "Madrid",
    country: "Spain",
    kind: "Ordinary hotel, well placed",
    summary:
      "Central Madrid around the Beth Yaacov synagogue — a real but small kehilla, in a district that is easy to stay in.",
    anchor: { name: "Beth Yaacov synagogue, Chamberí", coordinates: "40.4380, -3.7000" },
    notes: [
      "Listed as an ordinary hotel district. Madrid has a community and a shul and some kosher provision; it does not have a neighbourhood you can do a whole Shabbos in the way Antwerp does.",
      "Chamberí is central and well connected, so a hotel here is a hotel near the Prado and the rest of it as well as near the shul.",
      "Check what is open for your dates. Spanish kosher provision is thin and seasonal, and August empties the city.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Madrid_Synagogue",
  },
  {
    slug: "athens-thiseio-stays",
    name: "Staying near the Beth Shalom synagogue, Athens",
    city: "Athens",
    country: "Greece",
    kind: "Ordinary hotel, well placed",
    summary:
      "Central Athens around Thiseio and the Beth Shalom synagogue, within walking distance of the Acropolis.",
    anchor: { name: "Beth Shalom synagogue, Thiseio", coordinates: "37.9760, 23.7180" },
    notes: [
      "Listed as an ordinary hotel district. The Athens kehilla is small — a few hundred families — and kosher food needs arranging rather than finding.",
      "The position is the point: Thiseio is at the foot of the Acropolis, so the shul and the sightseeing are the same walk.",
      "Confirm arrangements with the community well before travelling, particularly for Shabbos meals. This is not a city to improvise in.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Athens_Synagogue",
  },
  {
    slug: "gateshead-stays",
    name: "Staying in Gateshead",
    city: "Gateshead",
    country: "United Kingdom",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary:
      "Bensham, around the yeshiva — the largest Torah centre in Europe, with a full week of shuls, schools and shops, and almost no hotel stock at all.",
    anchor: { name: "Gateshead Talmudical College, Bewick Road, Bensham", coordinates: "54.95311, -1.61061" },
    notes: [
      "Set expectations first: this is a residential community, not a destination, and there is very little to book. Most visitors are here for a simcha or a son in yeshiva and stay in an apartment or with family arranged through the community.",
      "What you get in exchange is a place where nothing needs planning — minyanim at every hour, kosher shops on Coatsworth Road, and a whole neighbourhood keeping the same week.",
      "Newcastle is across the river and has the airport and the station, so getting here is easy even though staying here takes arranging.",
      "Not a tourist quarter and not set up as one. Dress and conduct as the neighbourhood does.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Gateshead_Talmudical_College",
  },

  // ---- The Italian, French and Austrian Alps --------------------------
  //
  // The Swiss alpine entries above are both seasonal programmes, and the note
  // at the top of this file says that is what alpine kosher hotels usually are.
  // The Italian one below is the exception that makes the rule worth stating:
  // a hotel that is reported to keep a kosher kitchen all year, with a shul and
  // a mikveh in the building. It is still "reported" rather than "confirmed",
  // and the dates still want checking, but it is a different kind of listing
  // from a caterer taking over a hotel for six weeks.
  //
  // The other two are the opposite case and are the more common one. There is
  // no kosher provision in the Tyrol and none in the French alpine valleys, so
  // what these entries buy is a city an hour or two down the mountain that has
  // food, a shul and a station. That is the whole trade, and it is the same
  // trade the Zurich and Geneva entries above describe for Switzerland.
  {
    slug: "canazei-my-kosher-hotel",
    name: "My Kosher Hotel, Alba di Canazei",
    city: "Canazei",
    country: "Italy",
    kind: "Kosher hotel",
    summary:
      "A kosher hotel in the Val di Fassa, in the Dolomites, with a shul and a mikveh on the premises — and reported to run all year rather than for a season, which in the Alps is the unusual part.",
    anchor: { name: "Canazei, at the head of the Val di Fassa", coordinates: "46.47500, 11.77333" },
    notes: [
      "This is the entry that changes what an Italian Alps trip can be. Everything else in the Dolomites is a valley you carry food into; this is a valley you can arrive in empty-handed. The attractions on this site for the Dolomites have been rewritten around it.",
      "Reported to be under the Badatz of Lugano — Rav Benzion Rabinowitz, the Biale Rebbe — with a permanent mashgiach. Nobody here has confirmed that with the Badatz, so confirm it yourself before booking; this site does not certify kashrus.",
      "The hotel is at Alba di Canazei, a little up the valley from Canazei itself. The coordinate above is Canazei, because that is the published one; ask the hotel for the door.",
      "Confirm the dates. Reported year-round is not the same as confirmed year-round, and a hotel that ran a kitchen last winter is not a promise about this summer.",
      "On the swimming: the pool is reported to run both mixed and separate hours. If separate hours are what you need, get the schedule for your own dates before you book rather than after you arrive.",
      "For where to go from here, the Sella passes, the Great Dolomites Road and the Marmolada are all on the doorstep, and Tre Cime and Lago di Braies are a drive across the range.",
    ],
    website: "https://www.mykosherhotel.it/en/",
    kosherClaim: "reported",
    sourceUrl: "https://www.mykosherhotel.it/en/",
  },
  {
    slug: "innsbruck-stays",
    name: "Staying in Innsbruck for the Tyrol",
    city: "Innsbruck",
    country: "Austria",
    kind: "Ordinary hotel, well placed",
    summary:
      "The one alpine city with a proper town centre, a shul, and a cable car to 2,334 m starting five minutes from the old town — and no kosher shop of any kind, which is the thing to plan the trip around.",
    anchor: { name: "Innsbruck synagogue, Sillgasse 15", coordinates: "47.26803, 11.39963" },
    notes: [
      "Say the hard part first: there is no kosher shop or restaurant in Innsbruck, and none anywhere in Austria outside Vienna. What Innsbruck has is a kehilla of about a hundred people, a shul rebuilt in 1993 on the site the old one was destroyed on in 1938, and everything else a town has.",
      "Two ways to eat here, both listed on this site. Kosher Tirol coordinates prepared meals and Shabbos food across Tirol and the Salzburg province in season. Otherwise Munich is about two hours by road and has a full kosher quarter.",
      "The position is the argument. The Nordkette cable cars leave from the middle of town, the Zillertal and the Stubai are short drives, and the Brenner puts the Dolomites within reach — so one base does the Austrian and the Italian Alps both.",
      "For Shabbos, arrange with the community well in advance rather than assuming. A hundred-member kehilla is not set up for unannounced visitors, and the shul's times are not something to guess at.",
      "Listed as an ordinary hotel city. Innsbruck makes no kosher claim and none is implied — the hotels here are hotels.",
    ],
    website: "https://ikg-innsbruck.at/en/",
    kosherClaim: "none",
    sourceUrl: "https://ikg-innsbruck.at/en/contact/",
  },
  {
    slug: "lyon-villeurbanne-stays",
    name: "Staying in Lyon for the French Alps",
    city: "Lyon",
    country: "France",
    kind: "Kosher-friendly, in the Jewish quarter",
    summary:
      "One of the largest kehillos in France, with kosher shops and restaurants out in Villeurbanne — and Annecy, Grenoble and Chamonix all close enough to drive out and back in a day.",
    anchor: { name: "Grande Synagogue de Lyon, 13 quai Tilsitt", coordinates: "45.7571, 4.8277" },
    notes: [
      "This solves the French Alps the way Zurich solves the Swiss ones. The alpine resorts themselves have no kosher food of their own outside a seasonal programme; Lyon has it every week of the year, and the mountains are a drive rather than a move.",
      "The distances are the point: Grenoble is about an hour and a quarter, Annecy about an hour and twenty, Chamonix about two and a half. Those are day trips from a fixed base, not a touring itinerary.",
      "The split to know before booking. The Grande Synagogue is central, on the quai Tilsitt by the Saône, but the everyday kosher provision is out east in Villeurbanne and the 8th. Staying by the sights means travelling to every meal — the same trade as the Marais against the 19th in Paris.",
      "Geneva, already listed on this site, is the other base for the same mountains and is closer to Chamonix. Lyon has more kosher food; Geneva has less distance. That is the whole choice.",
      "Listed as a quarter rather than a hotel. Nothing here claims a kosher kitchen — what you are buying is the position.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Great_Synagogue_of_Lyon",
  },
  {
    slug: "grenoble-stays",
    name: "Staying in Grenoble",
    city: "Grenoble",
    country: "France",
    kind: "Ordinary hotel, well placed",
    summary:
      "A city of a hundred and fifty thousand people wedged between three mountain ranges, with a rabbinate, a mikvah and a few kosher places — the only town in the French Alps where all of that is true at once.",
    anchor: { name: "Grenoble city centre", coordinates: "45.17167, 5.72250" },
    notes: [
      "The trade against Lyon: Lyon has far more kosher food, Grenoble has far less driving. Grenoble is in the mountains rather than an hour and a quarter from them, and for a family doing a week of walking that is the difference between a base and a commute.",
      "There is kosher provision here but it is small — a brasserie under the local rabbinate, a grocery and butcher, and Chabad. Establish what is open for your dates before you commit to a week, and do not plan Shabbos on the assumption of a restaurant.",
      "Anchored on the city centre rather than on a shul, deliberately. Grenoble's Jewish life is spread across the city rather than gathered in one quarter, and published addresses for the Grande Synagogue disagree with each other — so the honest anchor is the town, and the community is who to ask for the door.",
      "The cable car to the Bastille goes up from the middle of town and is listed on this site; the Vercors and the Chartreuse start at the edge of it.",
      "Listed as an ordinary hotel city. Nothing here makes a kosher claim and none is implied.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://www.grande-synagogue-de-grenoble.fr/casher",
  },
  {
    slug: "merano-stays",
    name: "Staying in Merano for South Tyrol",
    city: "Merano",
    country: "Italy",
    kind: "Ordinary hotel, well placed",
    summary:
      "A spa town at 325 m with the only shul in South Tyrol, an hour from Bolzano and a morning from the Dolomites passes — the softest base in the Italian Alps and the only one with a kehilla.",
    anchor: { name: "Merano old town", coordinates: "46.66667, 11.16667" },
    notes: [
      "No kosher shop and no kosher restaurant. The nearest kosher kitchen is My Kosher Hotel at Alba di Canazei, over in the Val di Fassa, and the nearest real shopping is Milan. Merano is a base you carry food into or drive out from.",
      "What it has instead is a working shul and a Jewish museum, both listed on this site, and the reason they are here: Merano was a cure resort that Jewish families from Vienna, Prague and Budapest came to from the 1830s, and enough of that community survived to keep the building.",
      "It is low, warm and flat compared with the rest of this list — 325 m, promenades along the Passer, and gardens. That makes it the base that works when half the party does not want a mountain every day.",
      "The anchor coordinate is the published one for the town and is accurate to about a kilometre, which is the whole of central Merano. Anything in the old town is within a walk of the shul.",
      "Listed as an ordinary hotel town. Nothing here claims a kosher kitchen and none is implied.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://www.visitjewishitaly.it/en/listing/synagogue-of-merano/",
  },
  {
    slug: "salzburg-stays",
    name: "Staying in Salzburg for the Austrian Alps",
    city: "Salzburg",
    country: "Austria",
    kind: "Ordinary hotel, well placed",
    summary:
      "The city at the mouth of the mountains — Hallstatt, the Eisriesenwelt, the Grossglockner and the Krimml falls are all day trips from it, and it has a shul and a Chabad house where Vienna is a day's drive away.",
    anchor: { name: "Salzburg city centre", coordinates: "47.80000, 13.04500" },
    notes: [
      "The position is the entire argument. Every Austrian entry on this site except Vienna and the Nordkette is within a day of Salzburg, and nothing else in that half of the country has a kehilla at all.",
      "There is no kosher shop here — there is none anywhere in Austria outside Vienna. What there is: the community synagogue on Lasserstraße, in use since 1893, and Chabad of Salzburg, which does Shabbos and yom tov meals on advance registration and is listed on this site. Register early rather than late.",
      "The community covers three federal states from here and runs to a couple of hundred members. Treat Shabbos as something to arrange weeks ahead, not days.",
      "Kosher Tirol, also listed here, delivers prepared meals across the Salzburg province as well as Tirol, which is the other way to eat on a week out in the Pinzgau.",
      "Listed as an ordinary hotel city. No kosher claim is made by anything here and none is implied.",
    ],
    website: "https://ikg-salzburg.at/en/contact/",
    kosherClaim: "none",
    sourceUrl: "https://ikg-salzburg.at/en/contact/",
  },
  {
    slug: "annecy-stays",
    name: "Staying in Annecy",
    city: "Annecy",
    country: "France",
    kind: "Ordinary hotel, well placed",
    summary:
      "A lake town at the foot of the Alps with a shul and a mikvah and not one kosher shop — which is a stranger combination than it sounds, and worth understanding before booking a week here.",
    anchor: { name: "Annecy old town, on the lake", coordinates: "45.91611, 6.13306" },
    notes: [
      "The shul is on the rue de Narvik and the community runs to about fifty families. There is a mikvah in the compound. There is no kosher shop and no kosher restaurant in the town at all.",
      "How people here actually eat: they buy elsewhere. Geneva is about thirty-five kilometres north and Grenoble and Lyon are down the motorway, all three listed on this site. The rov here is a shochet who supplies communities across the border and in Grenoble, which tells you how the meat moves in this corner of the Alps.",
      "The position is very good and that is why it is listed: the lake and the old town are the attraction, Chamonix and Geneva are each about an hour, and the Gorges du Fier is twenty minutes away.",
      "For Shabbos, write to the community first. Fifty families is a kehilla that will know you are coming; it is not one that will absorb an unannounced family of six.",
      "Listed as an ordinary hotel town. Nothing here claims a kosher kitchen and none is implied.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://jguideeurope.org/en/region/france/rhone-alpes/annecy/",
  },
  {
    slug: "zell-am-see-stays",
    name: "Staying at Zell am See for the Austrian Alps",
    city: "Zell am See",
    country: "Austria",
    kind: "Ordinary hotel, well placed",
    summary:
      "The best-placed town in the Austrian Alps for a week of driving out and back — the Krimml falls, the Grossglockner road, the Eisriesenwelt and a glacier are all day trips from it — and the food all has to come to you.",
    anchor: { name: "Zell am See, on Lake Zell", coordinates: "47.31667, 12.80000" },
    notes: [
      "Every Austrian mountain entry on this site except the Nordkette is reachable from here in a day, which no other town in the country manages. That is the reason to be here rather than anywhere prettier.",
      "There is no kosher provision in the Pinzgau and none anywhere in Austria outside Vienna. Two ways round it, both listed here: Kosher Tirol delivers prepared meals and Shabbos food into this valley in season, and Chabad of Salzburg does Shabbos meals on advance registration.",
      "Order the food before you book the hotel, not after. A valley with no shop is a valley where the meals are the fixed part of the plan and the hotel is the flexible one.",
      "There is a lake, with lidos and open public bathing and no separate arrangement of any kind. Worth knowing before choosing a hotel on the shore for the swimming.",
      "Listed as an ordinary hotel town. No kosher claim is made by anything here and none is implied.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Zell_am_See",
  },
  {
    slug: "val-gardena-stays",
    name: "Staying in the Val Gardena",
    city: "Ortisei",
    country: "Italy",
    kind: "Ordinary hotel, well placed",
    summary:
      "Ortisei and the Val Gardena, with lifts to the Alpe di Siusi and the Seceda ridge going up from the village itself — the Dolomites base that needs the least driving.",
    anchor: { name: "Ortisei (St. Ulrich, Urtijëi), Val Gardena", coordinates: "46.56667, 11.66667" },
    notes: [
      "The argument for it over Merano or Canazei is the lifts. They leave from the middle of Ortisei, so a family without a car still has two mountains, and a family with one leaves it parked.",
      "This is Ladin country: three languages on every sign, and the town answers to Ortisei, St. Ulrich and Urtijëi equally. Book under whichever name the site you are using prefers.",
      "No kosher food, in the village or the valley. My Kosher Hotel at Alba di Canazei is over the Sella pass and is the nearest kitchen; Milan is the nearest shop. Both are listed on this site.",
      "The Sella passes put Canazei, the Marmolada and the Great Dolomites Road within a morning, so this base and the kosher one are a plausible split week rather than alternatives.",
      "Listed as an ordinary hotel village. Nothing here claims a kosher kitchen and none is implied.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://en.wikipedia.org/wiki/Urtij%C3%ABi",
  },
  {
    slug: "miami-beach-41st-street-stays",
    name: "Staying near 41st Street, Miami Beach",
    city: "Miami Beach",
    country: "United States",
    kind: "Ordinary hotel, well placed",
    summary:
      "Ordinary hotels near West 41st Street put the Jewish Learning Center-Chabad and the Miami Beach food corridor within the same local area.",
    anchor: { name: "Jewish Learning Center-Chabad, 411 West 41st Street", coordinates: "25.8122, -80.1315" },
    notes: [
      "The anchor is a community location, not a hotel pin. Use it to compare a hotel's walking distance before booking.",
      "This listing makes no kosher claim about any hotel. Check each property's own breakfast and kitchen arrangements if those matter to your trip.",
      "The ORB and Kosher Miami directories are the current places to choose an exact food option for the area.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://www.lubavitch.com/centers/118271",
  },
  {
    slug: "hallandale-beach-chabad-stays",
    name: "Staying near Chabad of South Broward, Hallandale Beach",
    city: "Hallandale Beach",
    country: "United States",
    kind: "Ordinary hotel, well placed",
    summary:
      "Ordinary hotels near East Hallandale Beach Boulevard give a South Florida trip a defined community anchor for Shabbos planning.",
    anchor: { name: "Chabad of South Broward, 1295 East Hallandale Beach Boulevard", coordinates: "25.9877, -80.1388" },
    notes: [
      "The anchor is Chabad of South Broward, not a hotel. Check the actual walking route from the property you are considering before booking.",
      "This listing makes no kosher claim about any hotel or its kitchen.",
      "The broader Hollywood and Hallandale trip is spread out, so decide whether the Shabbos anchor or the Stirling Road food corridor matters more for your base.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://www.lubavitch.com/centers/117595",
  },
  {
    slug: "orlando-sand-lake-road-stays",
    name: "Staying near Chabad of South Orlando, West Sand Lake Road",
    city: "Orlando",
    country: "United States",
    kind: "Ordinary hotel, well placed",
    summary:
      "Ordinary hotels around West Sand Lake Road can give an Orlando stay a defined community anchor for Shabbos planning, while keeping the wider park region within reach by car.",
    anchor: { name: "Chabad of South Orlando, 7347 West Sand Lake Road", coordinates: "28.450015, -81.481941" },
    notes: [
      "The anchor is a community address, not a hotel pin. Check the actual walking route from the property you are considering before booking.",
      "This listing makes no kosher claim about any hotel or its kitchen.",
      "Orlando’s attractions and food listings are spread across the region, so decide whether the Shabbos anchor or a particular park district matters most for your base.",
    ],
    kosherClaim: "none",
    sourceUrl: "https://www.jewishorlando.com/templates/articlecco_cdo/aid/61721/jewish/Location.htm",
  },
];

export function staysIn(country: string) {
  return kosherStays.filter((s) => s.country === country);
}
