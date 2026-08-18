// Where to go on holiday, for somebody who keeps kosher.
//
// WHY THIS IS A SEPARATE LIST FROM data/destinations.ts. That one is towns
// with kevarim in them — three hundred of them, sorted by who is buried there.
// A family choosing between a week in the Dolomites and four days in Rome is
// asking a different question, and answering it out of a kevarim directory is
// how the site came to look like a burial-records database with a travel page
// bolted on.
//
// WHAT IS IN A RECORD, AND WHAT IS NOT.
//
// Every practical fact about kosher food, Shabbos, where to stay and what to
// do is DERIVED, at render time, from the data the site already holds —
// data/attractions.ts, data/kosher-stays.ts, data/kosher-eateries.ts and the
// quarters in kosherAreas. Nothing about kashrus, opening, or what exists in a
// town is written here. That is the whole design: a destination page can only
// claim what some other file already stands behind, and lib/vacation-ideas.ts
// is the one place that reads them.
//
// What IS written here is editorial: why the place is worth the flight, who it
// suits, roughly how long to give it, when in the year it works, what catches
// people out. That is a judgement rather than a fact, and it is signed as one
// on the page.
//
// THE LINE THIS FILE DOES NOT CROSS: no opening hours, no prices, no kashrus
// claims, no "the best restaurant in the Ghetto", no hotel we have not got a
// record for. Those are facts that go stale or that belong to somebody else to
// assert, and the site's rule about them is in data/kosher-eateries.ts.
//
// ADDING A DESTINATION is adding a record here whose `cities` match the way
// those cities are spelled in the three data files above. Nothing else has to
// change: the hub, the filters, the card and the page template all read this
// list. A destination whose cities match nothing renders as a page with honest
// empty states rather than a broken one — and the test suite says so.

export type TripTheme = "beach" | "city" | "mountains" | "family" | "couples" | "short-break" | "heritage";

export type Season = "spring" | "summer" | "autumn" | "winter";

export const TRIP_THEMES: ReadonlyArray<{ value: TripTheme; label: string; blurb: string }> = [
  { value: "beach", label: "Beach", blurb: "Sea, sun and somewhere to stop." },
  { value: "city", label: "Cities", blurb: "Streets, museums and a kehilla to daven with." },
  { value: "mountains", label: "Mountains", blurb: "Air, height and quiet." },
  { value: "family", label: "Family", blurb: "Enough for children and enough for you." },
  { value: "couples", label: "Couples", blurb: "Somewhere calm and unhurried." },
  { value: "short-break", label: "Short Trips", blurb: "Three or four days, one flight." },
  /**
   * HERITAGE IS A KIND OF TRIP, NOT A SECOND WEBSITE.
   *
   * It is not a top-level section and is not going back to being one — the
   * navigation stays Destinations / Kosher / Plan / Travel. This is the other
   * half of that decision, and the half that was missing: somebody choosing
   * where to go who wants the kevarim and the old kehillos within reach had no
   * way to say so, and the destinations that answer it were sitting in the hub
   * unmarked. Kraków's own write-up already says it is "a vacation destination
   * and a heritage base at the same time"; the filter just lets a visitor ask
   * for that.
   *
   * Marked where the heritage is genuinely part of the trip — a quarter you
   * walk, kevarim within reach — not on every city that has a shul.
   */
  { value: "heritage", label: "Heritage", blurb: "Kevarim and old kehillos within reach." },
] as const;

export const SEASONS: ReadonlyArray<{ value: Season; label: string }> = [
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "autumn", label: "Autumn" },
  { value: "winter", label: "Winter" },
] as const;

export type VacationDestination = {
  slug: string;
  /** What it is called on the card and in the heading. */
  name: string;
  country: string;
  /** A wider area, where the destination is not one town. */
  region?: string;
  /**
   * The cities to join against, spelled EXACTLY as they are in
   * data/attractions.ts, data/kosher-stays.ts and data/kosher-eateries.ts.
   * A typo here shows as an empty section rather than a wrong one, and the
   * tests catch it.
   */
  cities: readonly string[];
  /**
   * Where the kosher food comes from when there is none in the destination.
   *
   * The alpine case, and it is the single most useful thing this site can say
   * about an alpine holiday: the mountains have the scenery and the nearest
   * city has the butcher. The cities named here are joined the same way, so
   * the page shows what is actually on record in them.
   */
  kosherBase?: { cities: readonly string[]; note: string };
  themes: readonly TripTheme[];
  seasons: readonly Season[];
  /** One sentence, on the card. Why go at all. */
  whyGo: string;
  /** Two or three, as chips. Who it is for. */
  bestFor: readonly string[];
  /** "3–4 days". Rough on purpose. */
  suggestedLength: string;
  /** Two or three sentences at the top of the destination page. */
  overview: string;
  /** The longer answer, as points. */
  whyVisit: readonly string[];
  /** When in the year, in seasons — the honest unit for this. */
  bestTime: string;
  /** Who it suits and who it does not, in prose. */
  suits: string;
  /** Getting there and getting round once you have. */
  transport: string;
  /** A shape for the days. Never presented as a booking. */
  outline?: { title: string; days: readonly string[] };
  /** What catches people out. Practical, and specific enough to act on. */
  cautions: readonly string[];
};

export const vacationDestinations: readonly VacationDestination[] = [
  {
    slug: "rome",
    name: "Rome",
    country: "Italy",
    cities: ["Rome"],
    themes: ["city", "family", "couples", "short-break", "heritage"],
    seasons: ["spring", "autumn", "winter"],
    whyGo: "The oldest Jewish community in Europe, living in the same few streets as its kosher restaurants — with the Forum a walk away.",
    bestFor: ["First-time Europe", "Families", "Couples"],
    suggestedLength: "3–5 days",
    overview:
      "Rome is the rare city where the Jewish quarter and the sightseeing are the same walk. The Ghetto by the Portico d'Ottavia holds the Great Synagogue, the kosher restaurants and the bakeries, and the Forum, the Capitoline and the river are all on foot from it. That is what makes it work for a kosher family: you are not travelling to every meal.",
    whyVisit: [
      "A kehilla that has been in these streets since before the Churban, and a quarter you can daven, eat and sleep in.",
      "The Arch of Titus, a few minutes from the Colosseum, with its relief of the Menorah being carried out of the Beis HaMikdash.",
      "Enough for children — ruins they can climb around, fountains, and a compact centre that does not need a car.",
      "A short flight from most of Europe, which makes it work as a four-day break as well as a week.",
    ],
    bestTime:
      "Spring and autumn are the comfortable months. High summer in Rome is genuinely hot and the queues are at their worst; winter is mild, quiet and much cheaper, with shorter days to plan around.",
    suits:
      "Suits a first trip to Europe, a family with children old enough to walk a city, and couples who want to eat well without a car. Less suited to anybody wanting quiet or countryside — Rome is loud, and that is part of it.",
    transport:
      "Fiumicino is the main airport, with a direct train into the centre; Ciampino is closer but served mostly by low-cost carriers. Once you are in, the historic centre is walked. A car is a liability inside the city — the restricted-traffic zones are enforced by camera.",
    outline: {
      title: "Four days without a car",
      days: [
        "Arrive, settle in the Ghetto, and walk the quarter — the Portico d'Ottavia, the Great Synagogue from outside, and dinner nearby.",
        "The ancient city: Colosseum, the Forum and the Arch of Titus, then the Capitoline. Book the Colosseum before you fly.",
        "The other Rome — the Pantheon, the Trevi Fountain, the river and the bridges, at whatever pace the children allow.",
        "A slower morning, whatever you missed, and out.",
      ],
    },
    cautions: [
      "The Colosseum is timed-entry and sells out in season. It is the one thing worth booking before you leave.",
      "The Great Synagogue can only be entered on a museum ticket and with security checks — bring passports.",
      "The Vatican Museums are a church complex, and the collection is largely religious art.",
    ],
  },
  {
    slug: "paris",
    name: "Paris",
    country: "France",
    cities: ["Paris"],
    themes: ["city", "couples", "family", "short-break"],
    seasons: ["spring", "summer", "autumn"],
    whyGo: "One of the strongest kosher food scenes in the world, and the city it is in.",
    bestFor: ["Couples", "Food", "Culture"],
    suggestedLength: "3–5 days",
    overview:
      "Paris has two Jewish addresses and the difference between them decides the trip. The Pletzl, around rue des Rosiers in the Marais, is central: kosher food, a shul, and a walk to the Seine, the Louvre and Notre-Dame. The 19th arrondissement has far more kosher food again and is much further from the sights. Which one you stay in is the single biggest planning decision here.",
    whyVisit: [
      "Kosher food of a range and quality that very few cities outside Israel can match.",
      "The Marais itself — the Pletzl, the old streets, and the museums on either side of it.",
      "The classics are walkable or one métro ride apart, so a short trip is not spent travelling.",
      "It works as a couple's trip and as a family one, which is unusual.",
    ],
    bestTime:
      "Late spring and early autumn. July and August are hot and the city empties of Parisians, which changes the atmosphere and can change what is open. Winter is grey but quiet and the museums are at their best.",
    suits:
      "Suits couples, and families who like walking a city. If your priority is the widest kosher choice you may want the 19th; if it is the sights, stay in the Marais and accept a smaller selection.",
    transport:
      "Charles de Gaulle and Orly both connect to the centre by train or bus. Inside Paris the métro reaches everything; a car is not worth having.",
    cautions: [
      "Kosher food is concentrated in two quarters that are a real distance apart. Decide which before booking a hotel, not after.",
      "Museum and monument tickets are increasingly timed-entry and sell out. Book the ones you care about in advance.",
    ],
  },
  {
    slug: "venice",
    name: "Venice",
    country: "Italy",
    cities: ["Venice"],
    themes: ["city", "couples", "short-break", "heritage"],
    seasons: ["spring", "autumn", "winter"],
    whyGo: "The original Ghetto, in a city with no cars, where everything is walked — which is what makes Shabbos there work.",
    bestFor: ["Couples", "Short break", "Jewish history"],
    suggestedLength: "2–3 days",
    overview:
      "Venice is walked everywhere, so a Shabbos here is genuinely walkable in a way that most European cities are not. The Ghetto in Cannaregio is where the Jewish provision is, and there is not much of it — this is a place to arrange food in advance rather than to find it when you arrive.",
    whyVisit: [
      "The Venetian Ghetto — the first place in the world to carry the name, and still a working Jewish square.",
      "A city with no traffic, which changes what a Shabbos and a walk with children feel like.",
      "It is small. Two or three days is a whole trip rather than a taste of one.",
      "Murano and Burano are a boat ride out and are the part children remember.",
    ],
    bestTime:
      "Spring and autumn. Summer is crowded and hot and the canals are at their least pleasant; winter is quiet and atmospheric, with acqua alta a real possibility — check before you travel.",
    suits:
      "Suits couples and a short break. Harder with very young children — bridges and steps everywhere, and pushchairs are a genuine problem.",
    transport:
      "Fly to Venice Marco Polo and take the boat or bus in. Inside the city there are no cars at all; it is walking and the vaporetto.",
    cautions: [
      "There is very little kosher food in Venice. Order ahead through the community — this is not a city to arrive in hungry on a Friday.",
      "Bridges and steps make Venice hard with a pushchair or with limited mobility.",
      "Acqua alta floods parts of the city in autumn and winter. It is forecast, and worth checking the week you travel.",
    ],
  },
  {
    slug: "florence",
    name: "Florence",
    country: "Italy",
    cities: ["Florence"],
    themes: ["city", "couples", "short-break"],
    seasons: ["spring", "autumn"],
    whyGo: "Ten minutes' walk between the Great Synagogue and the Duomo — in most Italian cities that is an hour.",
    bestFor: ["Couples", "Art", "Short break"],
    suggestedLength: "2–4 days",
    overview:
      "Florence is unusual: the Jewish quarter and the sights are the same walk, which is not true of Milan, of Turin, or of most of Italy. The Great Synagogue sits east of the centre, about ten minutes on foot from the Duomo, and the Uffizi and the river are the other way.",
    whyVisit: [
      "The Great Synagogue of Florence, one of the most striking shul buildings in Europe.",
      "The Uffizi and the Renaissance city, in a centre small enough to walk end to end.",
      "It pairs naturally with Rome or with the Italian lakes for a longer trip.",
    ],
    bestTime: "Spring and autumn. Florence in August is hot and packed; the shoulder seasons are the whole point here.",
    suits: "Suits couples and anybody who came for the art. Less for young children — this is a city of galleries.",
    transport:
      "Fly to Florence or Pisa, or take the fast train from Rome or Milan, which is often the better answer. The centre is walked.",
    cautions: [
      "The Uffizi is timed-entry and sells out. Book it before you fly.",
      "Kosher provision in Florence is small. Check what is open for your dates rather than assuming.",
    ],
  },
  {
    slug: "italian-dolomites",
    name: "The Dolomites",
    country: "Italy",
    region: "South Tyrol and Trentino",
    cities: ["Dolomites", "Canazei", "Merano"],
    themes: ["mountains", "family", "couples"],
    seasons: ["summer", "winter"],
    whyGo: "The most dramatic mountains in Europe, and the only kosher kitchen in the Italian Alps sitting in the middle of them.",
    bestFor: ["Families", "Nature", "Summer air"],
    suggestedLength: "5–8 days",
    overview:
      "The Dolomites are the rare alpine holiday where the kosher problem has an answer on the ground rather than a three-hour drive away: there is a kosher hotel with its own kitchen at Alba di Canazei, in the Val di Fassa, with the Sella and the Marmolada around it. Merano, further west, is a spa town with a synagogue and a Jewish museum of its own.",
    whyVisit: [
      "Tre Cime di Lavaredo, the Alpe di Siusi and Lago di Braies — walks that a family can do and that look like nothing else in Europe.",
      "The Great Dolomites Road, which is a day's driving through the best of it.",
      "Long summer daylight, which makes both the walking and a late Friday afternoon far easier to plan.",
      "Merano's synagogue and Jewish museum, for a rest day out of the mountains.",
    ],
    bestTime:
      "Summer for the walking and the long days; winter for snow. Late spring and late autumn are the awkward months — lifts and mountain huts close between seasons, so check what is running for your dates.",
    suits:
      "Suits families and anybody who wants air and height rather than streets. Suits a driver: this is a region where a car makes the difference between one valley and all of them.",
    transport:
      "Fly to Venice, Verona, Innsbruck or Munich and drive in — three to four hours from most of them. A car is close to essential; the valleys are connected by bus but on a timetable built for locals.",
    outline: {
      title: "A week in the valleys",
      days: [
        "Fly in and drive up. A short valley walk to get the legs going.",
        "The Sella and the Great Dolomites Road, stopping at the passes.",
        "A full day on the Alpe di Siusi — the biggest high meadow in the Alps, and easy underfoot.",
        "Lago di Braies early, before the crowds, then a slower afternoon.",
        "Tre Cime di Lavaredo — the walk everybody comes for. A long day.",
        "Shabbos in the valley.",
        "Merano or a lower day, and out.",
      ],
    },
    cautions: [
      "Mountain lifts and huts run to a season and close between them. What is open in August is not what is open in late May.",
      "Kosher food in the Alps is a matter of planning, not of turning up. Check the kosher kitchen's own arrangements for your dates before booking anything else.",
      "Weather turns fast at altitude, and a walk that is easy in the sun is not in cloud. Take the forecast seriously.",
    ],
  },
  {
    slug: "jungfrau-region",
    name: "The Jungfrau region",
    country: "Switzerland",
    region: "Bernese Oberland",
    cities: ["Interlaken", "Lauterbrunnen", "Grindelwald", "Mürren"],
    kosherBase: {
      cities: ["Zurich", "Lucerne"],
      note: "The kosher shops are in Zurich's Wiedikon, about two and a half hours away by train or car. Most people bring what they need in with them.",
    },
    themes: ["mountains", "family", "couples"],
    seasons: ["summer", "winter"],
    whyGo: "Waterfalls, cable cars and the Jungfraujoch — the classic Swiss mountain holiday, with the shopping done in Zurich on the way.",
    bestFor: ["Families", "Nature", "Big views"],
    suggestedLength: "5–7 days",
    overview:
      "Lauterbrunnen's valley of waterfalls, Grindelwald under the Eiger, and the railway up to the Jungfraujoch are what most people picture when they picture Switzerland. There is no kosher infrastructure in the valley itself: the food comes in with you from Zurich, which is a real constraint and a manageable one.",
    whyVisit: [
      "The Lauterbrunnen valley, with seventy-two waterfalls in it, and the Trümmelbach falls running inside the rock.",
      "Jungfraujoch — the highest railway station in Europe, and a day out even in poor weather.",
      "Grindelwald First and the cable cars, which turn a mountain into something a child can do.",
      "Everything runs on the Swiss timetable, so the whole region works without a car.",
    ],
    bestTime:
      "Summer for walking and long days; winter for snow, with shorter days and a much earlier Shabbos. The shoulder seasons are quiet but many lifts stop.",
    suits:
      "Suits families and anybody who would rather look at mountains than at buildings. Suits somebody willing to plan food properly in advance — that is the price of this one.",
    transport:
      "Fly to Zurich or Basel, then train. Swiss rail reaches the valley directly and the mountain railways carry on from there; a travel pass usually pays for itself.",
    cautions: [
      "There is no kosher food in the valley. Provision in Zurich before you go up, and plan Shabbos properly.",
      "Switzerland is expensive in a way that surprises people. Budget for food and transport, not only the hotel.",
      "Mountain railways and lifts run to a season and to the weather, and the Jungfraujoch is not worth the fare in cloud — check the webcams the morning of.",
    ],
  },
  {
    slug: "lucerne",
    name: "Lucerne",
    country: "Switzerland",
    cities: ["Lucerne"],
    themes: ["mountains", "family", "short-break", "couples"],
    seasons: ["spring", "summer", "autumn"],
    whyGo: "A lake, a covered bridge and a mountain, all reachable on foot or by boat from one town — with a shul in the middle of it.",
    bestFor: ["Families", "Short break", "Lakes"],
    suggestedLength: "2–4 days",
    overview:
      "Lucerne is the easiest way into the Swiss mountains: an old town on a lake with the Chapel Bridge through the middle of it, Mount Pilatus above, and a synagogue on Bruchstrasse in the centre. It works as a trip on its own and as the civilised end of a longer alpine one.",
    whyVisit: [
      "Lake Lucerne and the boats, which are transport and sightseeing at the same time.",
      "Mount Pilatus and the cogwheel railway — a mountain day with no walking required.",
      "A small, walkable old town, which suits a short stay.",
    ],
    bestTime: "Late spring through autumn. The lake boats and the mountain railways are at their fullest service in summer.",
    suits: "Suits families, a first alpine trip, and anybody pairing a city with mountains in one week.",
    transport: "Fly to Zurich and take the train — about an hour. Inside Lucerne, walking and the lake boats.",
    cautions: [
      "Kosher provision is limited. Zurich's Wiedikon is under an hour away by train and is where the shops are.",
      "Pilatus and the other mountain railways run seasonal timetables and stop for maintenance — check the dates.",
    ],
  },
  {
    slug: "zurich",
    name: "Zurich",
    country: "Switzerland",
    cities: ["Zurich"],
    themes: ["city", "short-break"],
    seasons: ["spring", "summer", "autumn", "winter"],
    whyGo: "The kosher capital of the Alps: shuls, shops and an eruv in one quarter, two kilometres from the old town.",
    bestFor: ["Shabbos", "Alpine base", "Short break"],
    suggestedLength: "2–3 days, or as a base",
    overview:
      "Wiedikon is where Zurich's shuls, kosher shops and eruv are, which is what makes it the part of the city to be in for Shabbos. It is about two kilometres from the old town and the lake. Most people meet Zurich as the place they provision before going up into the mountains, and it is worth a day or two of its own.",
    whyVisit: [
      "A working kehilla with an eruv, which is rare in this part of Europe and changes what Shabbos looks like.",
      "The old town and the lake, small enough to see in a day.",
      "The natural base and provisioning stop for the Bernese Oberland, central Switzerland and the Tyrol.",
    ],
    bestTime: "All year. Summer for the lake, winter if the mountains are the reason you are here.",
    suits: "Suits anybody building an alpine trip around a proper Shabbos, and a short city break in its own right.",
    transport: "Zurich airport is fifteen minutes from the centre by train. Trams reach Wiedikon; the old town is walked.",
    cautions: [
      "Wiedikon and the old town are not the same walk. Stay in Wiedikon if Shabbos matters, and accept the tram ride to the sights.",
      "Swiss prices are high, and the food bill on an alpine trip is usually the part people underestimate.",
    ],
  },
  {
    slug: "london",
    name: "London",
    country: "United Kingdom",
    cities: ["London"],
    themes: ["city", "family", "short-break"],
    seasons: ["spring", "summer", "autumn", "winter"],
    whyGo: "One of the largest kosher infrastructures outside Israel, in a city that needs no translating.",
    bestFor: ["Families", "First trip abroad", "Kosher choice"],
    suggestedLength: "3–5 days",
    overview:
      "London's kosher life is in the north-west — Golders Green, Hendon and Stamford Hill — rather than in the centre, so the trip is shaped by which of those you stay in and how you get in and out. In exchange you get a range of kosher food that very few cities can match, and everything else in English.",
    whyVisit: [
      "Kosher choice on a scale that makes a family trip simple rather than a logistics exercise.",
      "The Tower of London, the parks and the museums — many of the best of them free.",
      "No language barrier, which matters more with children than people expect.",
    ],
    bestTime:
      "Late spring and summer for the long days and the parks; the museums make winter workable. Note how early Shabbos comes in in December — it is a genuine planning constraint.",
    suits: "Suits a first family trip abroad and anybody who wants the kosher side to be the easy part.",
    transport:
      "Six airports, so compare. The Underground reaches everything, though north-west London to the centre is a real journey — allow for it rather than assuming a hotel is central.",
    cautions: [
      "The kosher quarters are not central. Staying by the sights means travelling to every meal; staying by the food means travelling to the sights.",
      "Winter Shabbos comes in very early in London. Check the times against your Friday plans.",
    ],
  },
  {
    slug: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    cities: ["Amsterdam"],
    themes: ["city", "short-break", "family", "heritage"],
    seasons: ["spring", "summer", "autumn"],
    whyGo: "The Esnoga, one of the great shul buildings of the world, and a compact city you can see in three days.",
    bestFor: ["Short break", "Jewish history", "Museums"],
    suggestedLength: "2–4 days",
    overview:
      "Amsterdam's Jewish history is in the old centre — the Portuguese Synagogue, the Jewish Museum, the Anne Frank House — and its Jewish life today is in Buitenveldert and Amstelveen, to the south. Those are different parts of town, and where you sleep should follow where you need to be on Shabbos.",
    whyVisit: [
      "The Esnoga, still lit by candles, and the Jewish Museum beside it.",
      "The Rijksmuseum, and a centre small enough to walk.",
      "It is an easy short flight from most of Europe, which makes three days worth doing.",
    ],
    bestTime: "Spring for the light and the flowers, early autumn for the quiet. Winter is short-dayed and grey.",
    suits: "Suits a short break, and anybody for whom the Jewish history is part of the reason for going.",
    transport: "Schiphol is fifteen minutes from the centre by train. The city is walked, or cycled by those who dare.",
    cautions: [
      "The historic Jewish quarter and the modern Jewish neighbourhoods are not the same place. Book accordingly.",
      "The Anne Frank House is timed-entry, released in advance, and sells out immediately.",
    ],
  },
  {
    slug: "prague",
    name: "Prague",
    country: "Czechia",
    cities: ["Prague"],
    themes: ["city", "short-break", "couples", "heritage"],
    seasons: ["spring", "autumn", "winter"],
    whyGo: "The Altneuschul — the oldest working shul in Europe — with the old town around it.",
    bestFor: ["Short break", "Jewish history", "Couples"],
    suggestedLength: "2–4 days",
    overview:
      "Josefov, Prague's old Jewish quarter, is in the middle of the city rather than off to one side, so the Altneuschul, the old cemetery and the Charles Bridge are within a few minutes of each other. That compactness is what makes Prague such a good three-day trip.",
    whyVisit: [
      "The Altneuschul, davened in continuously for some seven centuries.",
      "The Charles Bridge, the Astronomical Clock and the castle above the river.",
      "Everything in walking distance of everything else.",
    ],
    bestTime: "Spring and autumn. Prague at Christmas is beautiful and extremely crowded; midsummer is hot and busy.",
    suits: "Suits couples and short breaks. Manageable with children because the distances are small.",
    transport: "Fly to Václav Havel airport, then bus or taxi in — there is no train from the airport. The centre is walked.",
    cautions: [
      "Kosher provision in Prague is limited and concentrated in Josefov. Confirm what is open for your dates.",
      "The old town is very crowded in season; early mornings are a different city.",
    ],
  },
  {
    slug: "vienna",
    name: "Vienna",
    country: "Austria",
    cities: ["Vienna"],
    themes: ["city", "couples", "family", "heritage"],
    seasons: ["spring", "autumn", "winter"],
    whyGo: "A real kehilla in Leopoldstadt with the food to match, and an imperial city on the other side of the canal.",
    bestFor: ["Couples", "Families", "Alpine base"],
    suggestedLength: "3–4 days",
    overview:
      "Leopoldstadt — the 2nd district — is Vienna's Jewish quarter, and it is across the canal from the centre rather than out in a suburb. It is also the best provisioning stop in Austria for anyone heading into the Tyrol or the Salzkammergut afterwards.",
    whyVisit: [
      "Judenplatz and the Shoah memorial, and the Jewish city that stood around them.",
      "Schönbrunn and its gardens, which is the day that works with children.",
      "Kosher shops in the 2nd district, walkable from the centre.",
    ],
    bestTime: "Spring and autumn are the best of it. Winter has the museums and the markets; August is quiet and hot.",
    suits: "Suits couples, families, and anybody starting or ending an Austrian mountain trip in the city.",
    transport: "Vienna airport connects by train in around fifteen minutes. The U-Bahn and trams reach everything.",
    cautions: [
      "If you are going on to the Alps, do the shopping here. What is available in the mountains is a fraction of it.",
    ],
  },
  {
    slug: "budapest",
    name: "Budapest",
    country: "Hungary",
    cities: ["Budapest"],
    themes: ["city", "short-break", "family", "heritage"],
    seasons: ["spring", "summer", "autumn"],
    whyGo: "The largest shul in Europe, a Jewish quarter you can stay inside, and a river city that costs less than its neighbours.",
    bestFor: ["Short break", "Jewish history", "Value"],
    suggestedLength: "3–4 days",
    overview:
      "The 7th district is Budapest's Jewish quarter and where most kosher travelers stay: the Dohány Street synagogue and the Kazinczy Street shul are both in it, and the Danube, the Parliament and the castle hill are a short walk or tram ride away.",
    whyVisit: [
      "The Dohány Street Synagogue, the largest in Europe, and the Kazinczy Street shul in the middle of the quarter.",
      "Shoes on the Danube Bank, and the Parliament along the same stretch of river.",
      "Margaret Island and the Fisherman's Bastion, which are the days children remember.",
      "It is markedly cheaper than Vienna or Prague for the same kind of trip.",
    ],
    bestTime: "Spring and early autumn. Summer is hot but the river and the island take the edge off it.",
    suits: "Suits a short break, a family, and anybody who wants a lot of city for the money.",
    transport: "Fly to Budapest airport and take the bus or a taxi in. Trams, metro and walking inside the city.",
    cautions: [
      "Budapest is also the gateway to the Hungarian kevarim — Kerestir, Ijhel, Liska and Nagykálló are all within a few hours. If that is part of the plan, it belongs in the same itinerary rather than a second trip.",
    ],
  },
  {
    slug: "nice-cote-dazur",
    name: "Nice and the Côte d'Azur",
    country: "France",
    region: "Provence-Alpes-Côte d'Azur",
    cities: ["Nice"],
    themes: ["beach", "couples", "family", "short-break"],
    seasons: ["spring", "summer", "autumn"],
    whyGo: "Sea, sun and an old town, with a kehilla and kosher food a few streets back from the promenade.",
    bestFor: ["Sea and sun", "Couples", "Families"],
    suggestedLength: "4–7 days",
    overview:
      "Nice is the practical answer to a kosher beach holiday in Europe: a real Jewish community around the Boulevard Dubouchage shul, kosher food in the same few streets, and the sea at the end of them. The rest of the coast is on the train line from there.",
    whyVisit: [
      "The Promenade des Anglais and Vieux Nice, with the beach and the old town in the same walk.",
      "A community with a shul and kosher food a short walk from the front, which is what makes this workable at all.",
      "The coastal train, so the rest of the Riviera is a day trip rather than a second hotel.",
    ],
    bestTime:
      "Late spring and September are the best of it — warm sea, fewer people. July and August are hot and very full. Winter is mild and quiet, but it is not a beach.",
    suits:
      "Suits families and couples who want sea rather than streets. Note that public beaches on this coast are mixed; plan around that in the way that suits your family.",
    transport:
      "Nice airport is on the edge of the city with a tram into the centre. The coastal railway reaches Monaco, Antibes and Cannes without a car.",
    cautions: [
      "Beaches here are mixed and can be crowded in season. Worth planning your days and your part of the coast with that in mind.",
      "Nice beaches are pebble, not sand. This surprises people every year — bring shoes for the water.",
      "August is the busiest and most expensive month on the whole coast.",
    ],
  },
  {
    slug: "austrian-tyrol",
    name: "The Austrian Tyrol",
    country: "Austria",
    region: "Tyrol and Salzburgerland",
    cities: ["Innsbruck", "Zell am See", "Salzburg"],
    kosherBase: {
      cities: ["Vienna", "Munich"],
      note: "The nearest full kosher shopping is Vienna or Munich. Between them and the delivered meals available locally, an Alpine week is arrangeable — but all of it in advance.",
    },
    themes: ["mountains", "family", "couples"],
    seasons: ["summer", "winter"],
    whyGo: "Mountains a cable car away from a city, with meals that can be delivered into the valleys.",
    bestFor: ["Families", "Mountain air", "Winter or summer"],
    suggestedLength: "5–8 days",
    overview:
      "Innsbruck is a city with cable cars going up out of the middle of it, which makes the Tyrol unusually easy: you can stay somewhere with shops and still be on a mountain in twenty minutes. Zell am See adds a lake and a glacier, and Salzburg is the town at the other end of it.",
    whyVisit: [
      "The Nordkette cable cars, which run from the centre of Innsbruck to a ridge at over two thousand metres.",
      "Zell am See and the Kitzsteinhorn — a lake, and a glacier that has snow on it in summer.",
      "Salzburg's old town and fortress, for the day that is not a mountain.",
      "It works in both seasons, which few alpine destinations really do.",
    ],
    bestTime: "Summer for walking and long days; winter for snow, with a much earlier Shabbos and shorter afternoons.",
    suits: "Suits families and mixed-ability groups: nearly everything here has a lift to the top of it.",
    transport:
      "Fly to Innsbruck, Salzburg or Munich. A car helps for the valleys, though Innsbruck and Salzburg themselves are fine without one.",
    cautions: [
      "Kosher arrangements in the Alps have to be made before you travel. Confirm delivery and Shabbos arrangements for your exact dates.",
      "Lift and cable-car seasons have gaps in spring and autumn when almost nothing runs.",
    ],
  },
  {
    slug: "french-alps",
    name: "The French Alps",
    country: "France",
    region: "Haute-Savoie and Isère",
    cities: ["Chamonix", "Annecy", "Grenoble"],
    kosherBase: {
      cities: ["Lyon", "Geneva"],
      note: "Lyon and Villeurbanne have the food; Geneva is the other side of the same valley system. Grenoble has a kehilla with a rabbinate in the mountains themselves, which is unusual here.",
    },
    themes: ["mountains", "family", "couples"],
    seasons: ["summer", "winter"],
    whyGo: "Mont Blanc, a lake town that looks unreal, and a kehilla in the mountains rather than three hours from them.",
    bestFor: ["Nature", "Families", "Lakes and peaks"],
    suggestedLength: "5–8 days",
    overview:
      "Chamonix sits under Mont Blanc with the Aiguille du Midi cable car going up beside it and the Mer de Glace railway going out to the glacier. Annecy, an hour away, is a lake town with a old quarter on the water. Grenoble, south of both, has a community with a rabbinate — which is rare this deep into the Alps.",
    whyVisit: [
      "The Aiguille du Midi — one of the highest cable cars in the world, and the view straight at Mont Blanc.",
      "The Mer de Glace and the Montenvers railway, which is glacier scenery without a mountaineer's day.",
      "Annecy and its lake, which is the gentle day in an otherwise vertical week.",
    ],
    bestTime: "Summer for the walking and the lake; winter for snow. Late spring and late autumn close a lot of the lifts.",
    suits: "Suits families and couples who want mountains with something to do at the bottom of them as well.",
    transport:
      "Fly to Geneva or Lyon and drive — Chamonix is about an hour and a half from Geneva. A car is the practical choice for the valleys.",
    cautions: [
      "Provision in Lyon or Geneva on the way in. The valleys themselves have very little.",
      "Cable cars close for weather and for maintenance seasons. Check before committing a day to one.",
      "Altitude at the top of the Aiguille du Midi is nearly 3,800m and people feel it. Take it slowly, especially with children.",
    ],
  },
  // ---- South Florida ---------------------------------------------------
  {
    slug: "miami-beach",
    name: "Miami Beach",
    country: "United States",
    region: "South Florida",
    cities: ["Miami Beach"],
    themes: ["beach", "family", "couples", "short-break"],
    seasons: ["winter", "spring", "autumn"],
    whyGo: "A warm-weather break built around a long oceanfront walk, gardens and Jewish heritage stops, with a defined local Shabbos anchor.",
    bestFor: ["Families", "Winter sun", "Short breaks"],
    suggestedLength: "4–7 days",
    overview:
      "Miami Beach works best as a city-and-coast break rather than a list of resort days. The Beachwalk links the island north toward Surfside and Bal Harbour, while the Holocaust Memorial and Botanical Garden add quieter stops in the middle. West 41st Street is the practical starting point for choosing where to stay, food arrangements and a Shabbos plan.",
    whyVisit: [
      "The Miami Beach Beachwalk, a long pedestrian route that connects the island's neighbourhoods without a car.",
      "The Holocaust Memorial Miami Beach, a thoughtful Jewish heritage stop with an education center.",
      "The Botanical Garden, a compact green pause close to the Convention Center and Meridian Avenue.",
      "Hollywood's Broadwalk and ArtsPark are close enough to make a second South Florida day without changing hotels.",
    ],
    bestTime:
      "Winter, spring and autumn are the practical seasons for an outdoor itinerary. Summer brings heavier heat, humidity and a less predictable forecast, so plan indoor alternatives and keep the walking days flexible.",
    suits:
      "Suits families who want a warm, low-logistics trip and couples looking for a few restful days between city breaks. It is less suited to anyone expecting one compact Jewish quarter to contain every food option and attraction.",
    transport:
      "Miami International Airport is the usual arrival point for Miami Beach; Fort Lauderdale-Hollywood International Airport can work well for the northern part of the trip. Use a car, taxi or rideshare for moves between the beach communities and Hollywood. The Beachwalk is useful once you are in Miami Beach, but the wider region is too spread out to treat as one walking district.",
    cautions: [
      "Use the official ORB and Kosher Miami directories to choose an exact food option and confirm its current certification before visiting.",
      "Choose a hotel by its real walking route to the community anchor, not only by the neighbourhood name.",
      "The page focuses on parks, promenades and cultural stops; make separate arrangements for any water activity that matters to your family.",
    ],
  },
  {
    slug: "hollywood-hallandale",
    name: "Hollywood and Hallandale",
    country: "United States",
    region: "South Florida",
    cities: ["Hollywood", "Hallandale Beach"],
    themes: ["beach", "family", "couples", "short-break"],
    seasons: ["winter", "spring", "autumn"],
    whyGo: "A South Florida base with a pedestrian seaside promenade, a family park in downtown Hollywood and a clear Hallandale Shabbos anchor.",
    bestFor: ["Families", "Short breaks", "Outdoor days"],
    suggestedLength: "3–5 days",
    overview:
      "Hollywood and Hallandale make a useful second South Florida base when you want a quieter rhythm than central Miami Beach. Hollywood supplies the Broadwalk, ArtsPark and the Anne Kolb mangroves; Hallandale supplies the community anchor for Shabbos planning. The food and community addresses are not all in one square, so selecting the hotel comes before booking the days out.",
    whyVisit: [
      "The nearly 2.5-mile Hollywood Beach Broadwalk, a pedestrian route for a long outdoor walk.",
      "ArtsPark at Young Circle, with a playground, walking path and public art in downtown Hollywood.",
      "Anne Kolb Nature Center, a large coastal mangrove wetland with county-run environmental programmes.",
      "A Hallandale-based Shabbos plan can be paired with Hollywood's food corridor and day stops.",
    ],
    bestTime:
      "Winter, spring and autumn are the easiest seasons to spend long stretches outdoors. Summer has stronger heat, humidity and rain risk, so build the trip around shorter walks and indoor alternatives.",
    suits:
      "Suits families who value walks, parks and a manageable base for several days, and couples looking for an unhurried South Florida stop. It is less suited to travelers who want every food option and every community address on the same block.",
    transport:
      "Fort Lauderdale-Hollywood International Airport is the closest main airport, while Miami International Airport is another option for a wider South Florida route. A car, taxi or rideshare is practical for moving between Hallandale, Hollywood's Stirling Road corridor and the Broadwalk. The Broadwalk itself is easy on foot, but it is not beside the community and food anchors.",
    cautions: [
      "The Hallandale community anchor, Hollywood food corridor and seaside promenade are distinct places; trace the real route before choosing a hotel.",
      "Use the official ORB directory for an individual food listing and its current certification rather than assuming a whole street is uniform.",
      "The outdoor stops here are best planned as weekday activities; check each operator's current visitor arrangements before you go.",
    ],
  },
  // ---- Orlando and Central Florida ------------------------------------
  {
    slug: "orlando",
    name: "Orlando",
    country: "United States",
    region: "Central Florida",
    cities: ["Orlando", "Lake Buena Vista"],
    themes: ["family", "short-break"],
    seasons: ["winter", "spring", "summer", "autumn"],
    whyGo: "A family park holiday built around food and a practical Shabbos anchor, so the rest of the week can be planned around the attractions.",
    bestFor: ["Families", "Park days", "School holidays"],
    suggestedLength: "5–7 days",
    overview:
      "Orlando is a region of separate park districts, not a compact city break. Disney is in Lake Buena Vista, while Universal, SeaWorld, the food listings and the Shabbos anchor sit in other parts of the area. That makes the order of planning matter: settle the base and the food first, then give each major park or quieter day its own outing instead of trying to cross Central Florida repeatedly.",
    whyVisit: [
      "Walt Disney World Resort in Lake Buena Vista and Universal Orlando Resort, each substantial enough to deserve their own park days.",
      "SeaWorld Orlando for animal encounters and family rides, plus Gatorland for a more Florida-focused outdoor day.",
      "Orlando Science Center and Harry P. Leu Gardens when the family needs a break from the big park rhythm.",
      "A local food directory and a defined Chabad of South Orlando anchor to make Shabbos and meal planning part of the itinerary from the start.",
    ],
    bestTime:
      "Winter and spring make long outdoor days easier. Summer can work well for school holidays, but build in indoor breaks and leave the order of the days flexible around the weather. Autumn is often a useful quieter window, while holiday weeks need earlier planning.",
    suits:
      "Suits families who want a full holiday built around attractions and are comfortable planning each day in advance. It is less suited to travelers looking for a walkable city where the hotel, food and sightseeing are all on the same few streets.",
    transport:
      "Orlando International Airport (MCO) is the usual arrival point. A car or rideshare is practical once you land: Lake Buena Vista, Universal, SeaWorld, the food listings and the Shabbos anchor are separate parts of a large metro area. Treat one major attraction cluster as a day rather than trying to move between several of them.",
    outline: {
      title: "Six days with room to breathe",
      days: [
        "Arrive, settle the food plan, and make the short local journeys before the first full park day.",
        "Give one Disney park day the whole day rather than adding another major stop.",
        "Choose Universal or SeaWorld for a second park day, based on the family’s pace.",
        "Use Gatorland, Orlando Science Center or Leu Gardens as a lower-intensity change of rhythm.",
        "Keep a flexible day for a second major park, a rest day or anything missed earlier in the week.",
        "Leave enough time to collect food for the journey home rather than fitting in one last long drive.",
      ],
    },
    cautions: [
      "The accommodation, Shabbos anchor and food listings are not all in the same district; check the actual route before booking a property.",
      "Use the official attraction pages for current entry and visitor arrangements, and make ticketed parks weekday plans.",
      "Use the local food directory to select exact establishments, then confirm the current supervision and arrangements directly before relying on them.",
    ],
  },
  {
    slug: "jerusalem",
    name: "Jerusalem",
    country: "Israel",
    cities: ["Jerusalem"],
    themes: ["city", "family", "couples"],
    seasons: ["spring", "autumn", "winter"],
    whyGo: "The one destination where the kosher question does not arise, and everything else about the trip is the reason you came.",
    bestFor: ["Families", "First trip to Israel", "Every kind of traveler"],
    suggestedLength: "5 days upward",
    overview:
      "Jerusalem is the trip that needs the least explaining and the most planning: which neighbourhood you stay in shapes everything, from how far you walk on Shabbos to what is around you at night. The Old City, Rechavia, Geula and Har Nof are all different holidays.",
    whyVisit: [
      "The Kosel and the Kosel tunnels, and the City of David beneath the Old City.",
      "Yad Vashem, and the Shrine of the Book at the Israel Museum.",
      "The Biblical Zoo and the Tower of David, which are the days that work with children.",
      "Kosher food everywhere, which changes what a family holiday costs in effort.",
    ],
    bestTime:
      "Spring and autumn. Summer is very hot and the yom tov seasons are crowded and expensive — which for some people is exactly the reason to come then. Winter is cool and can be genuinely wet.",
    suits: "Suits everybody, which is not something that can be said of anywhere else on this list.",
    transport:
      "Fly to Ben Gurion; the train reaches Jerusalem in around half an hour. Inside the city, light rail, buses and taxis — a car is more trouble than it is worth in the centre.",
    cautions: [
      "Which neighbourhood you stay in matters more here than in any other city on this list. Decide it deliberately.",
      "Check current travel advice and your insurer's position before booking, as you would for anywhere.",
      "Yom tov and chol hamoed are peak. Book flights and rooms far earlier than feels necessary.",
    ],
  },
  {
    slug: "krakow",
    name: "Kraków",
    country: "Poland",
    cities: ["Kraków"],
    themes: ["city", "short-break", "family", "heritage"],
    seasons: ["spring", "summer", "autumn"],
    whyGo: "Kazimierz — a whole Jewish quarter still standing — and the natural base for the Polish kevarim.",
    bestFor: ["Jewish history", "Short break", "Heritage base"],
    suggestedLength: "3–4 days, or as a base",
    overview:
      "Kraków is a vacation destination and a heritage base at the same time, and most people come for both. Kazimierz holds the Remuh and the old shuls; the main square and Wawel are twenty minutes' walk away; and Lizhensk, Dynow, Sanz and Bobowa are all within a few hours by road.",
    whyVisit: [
      "Kazimierz, the Jewish quarter, with the Remuh on Szeroka at the middle of it.",
      "The main square and Wawel Castle, in a centre that is walked.",
      "Schindler's Factory, which is the museum most people come out of quietest.",
      "The best base in Poland for a kevarim route, if that is part of the trip.",
    ],
    bestTime: "Late spring through early autumn. Polish winters are cold and the days are very short.",
    suits:
      "Suits somebody who wants a city break and a heritage journey in one week rather than two trips. Consider carefully whether the heavier sites are right for younger children.",
    transport:
      "Fly to Kraków. The centre is walked; a car or a driver is what you want for the kevarim, not for the city.",
    cautions: [
      "Kazimierz's Jewish sites are museums as much as shuls. What is a working minyan and what is a monument is worth knowing before Shabbos.",
      "If you are adding kevarim, access and opening at each one has to be checked separately — that is what the heritage section of this site is for.",
    ],
  },
] as const;

export function getVacationDestination(slug: string): VacationDestination | undefined {
  return vacationDestinations.find((destination) => destination.slug === slug);
}

/** Every country represented, for the browse-by-country filter. */
export function vacationCountries(): string[] {
  return [...new Set(vacationDestinations.map((destination) => destination.country))].sort();
}
