// What to actually do on a kosher vacation, in the places people take one.
//
// The site knows a great deal about kevarim and almost nothing about the rest
// of a trip. Somebody spending a week in Rome or the Alps is not davening for
// eight hours a day, and until now the planner had nothing to put in the other
// hours except "free time".
//
// Two things make an attraction worth listing here rather than in any guidebook:
//
//   1. Where it sits relative to the kosher part of town. A museum twenty
//      minutes' walk from the only kosher restaurant is a different plan from
//      one across the city, and that is the fact a guidebook never gives you.
//   2. What it does on Shabbos and yom tov, and whether it can be done at all
//      without carrying, driving or handling money.
//
// COORDINATES here are the real thing and are safe to navigate to — these are
// public landmarks with published locations, not graves. That is the opposite
// of the rule in data/cemeteries.ts, and the reason is simply that nobody is
// harmed by arriving at the wrong corner of a public square.
//
// Opening hours and ticket prices are deliberately NOT stored. They change by
// season and by year, every entry carries the official site, and a stale hour
// printed here would be worse than none.

export type AttractionKind =
  | "Jewish heritage"
  | "Museum"
  | "Landmark"
  | "Nature"
  | "Family"
  | "Viewpoint";

export type Attraction = {
  slug: string;
  name: string;
  city: string;
  country: string;
  kind: AttractionKind;
  /** One line: what it is and why it is worth the half day. */
  summary: string;
  address?: string;
  /** "lat, lng" — a real, navigable location. */
  coordinates?: string;
  website?: string;
  /** Practical notes, kosher-travel first. */
  notes?: string[];
  /** How it sits with Shabbos and yom tov, when that is worth saying. */
  shabbos?: string;
  sourceUrl: string;
};

export const attractions: Attraction[] = [
  // ---- Italy ----------------------------------------------------------
  {
    slug: "rome-colosseum",
    name: "The Colosseum",
    city: "Rome",
    country: "Italy",
    kind: "Landmark",
    summary: "The amphitheatre built with the spoils of the Churban, and the arch beside it that shows the Menorah being carried out of the Beis HaMikdash.",
    address: "Piazza del Colosseo 1, 00184 Roma",
    coordinates: "41.8902, 12.4922",
    website: "https://colosseo.it/en/",
    notes: [
      "The Arch of Titus stands a few minutes away at the edge of the Forum, on the same ticket. Its relief of the Menorah and the Temple vessels being carried in triumph is the reason many Jews come to this corner of Rome at all — and for centuries the kehilla here would not walk under it.",
      "About 2.5 km from the Jewish quarter by the Portico d'Ottavia, which is a comfortable walk or one bus.",
      "Timed entry, booked online. It sells out in season; this is the one thing in Rome worth booking before you fly.",
    ],
    shabbos: "Open on Shabbos, but it is ticketed and the ticket is scanned — not something to plan for Shabbos itself.",
    sourceUrl: "https://en.wikipedia.org/wiki/Colosseum",
  },
  {
    slug: "rome-jewish-quarter",
    name: "The Ghetto and the Great Synagogue",
    city: "Rome",
    country: "Italy",
    kind: "Jewish heritage",
    summary: "The oldest Jewish community in Europe, in the streets it has lived in since before the Churban, with the Great Synagogue and the Jewish Museum at its centre.",
    address: "Via Catalana, 00186 Roma",
    coordinates: "41.8921, 12.4780",
    website: "https://www.museoebraico.roma.it/en/",
    notes: [
      "This is also where the kosher restaurants are, so it is the natural base for a Rome trip rather than a stop on one.",
      "The Great Synagogue can only be entered on a museum ticket and with security checks; bring passports.",
      "The Portico d'Ottavia ruins are in the middle of the quarter, so the sightseeing and the eating are the same few streets.",
    ],
    shabbos: "The museum and synagogue tours are closed on Shabbos and yom tov. The quarter itself is where you will be anyway.",
    sourceUrl: "https://en.wikipedia.org/wiki/Great_Synagogue_of_Rome",
  },
  {
    slug: "rome-vatican-museums",
    name: "Vatican Museums",
    city: "Rome",
    country: "Italy",
    kind: "Museum",
    summary: "Among the largest art collections in the world. Some frum travelers visit and some do not; it is listed so the choice is made deliberately rather than by surprise.",
    address: "Viale Vaticano, 00165 Roma",
    coordinates: "41.9065, 12.4536",
    website: "https://www.museivaticani.va/",
    notes: [
      "Ask your rov. This is a church complex and the collection is largely religious art; people hold differently about going in, and the site is not the place to decide it for you.",
      "About 4 km from the Jewish quarter — the far side of the river, not a walk.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Vatican_Museums",
  },
  {
    slug: "venice-ghetto",
    name: "The Venetian Ghetto",
    city: "Venice",
    country: "Italy",
    kind: "Jewish heritage",
    summary: "The first place in the world to be called a ghetto, in 1516, with five shuls built one above another because there was nowhere else to build.",
    address: "Campo di Ghetto Nuovo, 30121 Venezia",
    coordinates: "45.4453, 12.3265",
    website: "https://www.museoebraico.it/en/",
    notes: [
      "The shuls are reached only on the museum's guided tour — they are upper floors of ordinary buildings and there is no other way in.",
      "The tallest buildings in Venice are here, because the community could build up and not out.",
      "Kosher food in Venice is limited and often needs ordering ahead. Do not arrive on a Friday assuming you will find something.",
    ],
    shabbos: "Museum and tours closed Shabbos and yom tov. Venice is a walking city, so a Shabbos here works well once food is arranged.",
    sourceUrl: "https://en.wikipedia.org/wiki/Venetian_Ghetto",
  },
  {
    slug: "venice-st-marks-square",
    name: "Piazza San Marco and the Grand Canal",
    city: "Venice",
    country: "Italy",
    kind: "Landmark",
    summary: "The square and the water that Venice is, walkable end to end from the Ghetto in about forty minutes.",
    address: "Piazza San Marco, 30124 Venezia",
    coordinates: "45.4341, 12.3388",
    notes: [
      "The walk from the Ghetto crosses most of the city and is the sightseeing, not the commute.",
      "Vaporetto tickets are bought in advance or from machines — worth sorting before Shabbos if you are staying past it.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Piazza_San_Marco",
  },
  {
    slug: "florence-great-synagogue",
    name: "Great Synagogue of Florence",
    city: "Florence",
    country: "Italy",
    kind: "Jewish heritage",
    summary: "A Moorish-revival shul of 1882 with a green copper dome, still the kehilla's, with a museum upstairs and a garden around it.",
    address: "Via Luigi Carlo Farini 6, 50121 Firenze",
    coordinates: "43.7714, 11.2665",
    website: "https://www.jewishflorence.it/",
    notes: [
      "Ten minutes' walk from the Duomo, so it fits into a normal Florence day rather than needing one of its own.",
      "Security at the door; bring passports.",
    ],
    shabbos: "Museum closed Shabbos and yom tov; there are minyanim.",
    sourceUrl: "https://en.wikipedia.org/wiki/Great_Synagogue_of_Florence",
  },
  {
    slug: "florence-uffizi",
    name: "Uffizi Gallery",
    city: "Florence",
    country: "Italy",
    kind: "Museum",
    summary: "The Renaissance collection, in the building the Medici built for it.",
    address: "Piazzale degli Uffizi 6, 50122 Firenze",
    coordinates: "43.7678, 11.2553",
    website: "https://www.uffizi.it/en",
    notes: [
      "Timed tickets, and the queue without one is long enough to lose a morning.",
      "Fifteen minutes' walk from the shul, so the two go together in a day.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Uffizi",
  },
  {
    slug: "milan-duomo-rooftop",
    name: "Duomo rooftop terraces",
    city: "Milan",
    country: "Italy",
    kind: "Viewpoint",
    summary: "Walking on the roof of the cathedral, among the spires, with the Alps visible on a clear day.",
    address: "Piazza del Duomo, 20122 Milano",
    coordinates: "45.4641, 9.1919",
    website: "https://www.duomomilano.it/en/",
    notes: [
      "The roof is reached by its own ticket, stairs or lift, and is outdoors — it is the terraces people come for rather than the interior.",
      "Milan has the largest kosher infrastructure in Italy, mostly around Via Sally Mayer and the Via Eupili shul, roughly 3 km from the Duomo.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Milan_Cathedral",
  },
  {
    slug: "pompeii",
    name: "Pompeii",
    city: "Naples",
    country: "Italy",
    kind: "Landmark",
    summary: "A Roman town stopped in 79 CE — streets, houses and shops, walkable for a full day.",
    address: "Via Villa dei Misteri 2, 80045 Pompei",
    coordinates: "40.7497, 14.4869",
    website: "https://pompeiisites.org/en/",
    notes: [
      "It is a whole town and mostly unshaded. Water, hats and real shoes; a summer afternoon here is punishing.",
      "About 40 minutes by train from Naples. Kosher food in Naples is very limited — bring the day's food with you.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Pompeii",
  },

  // ---- France ---------------------------------------------------------
  {
    slug: "paris-eiffel-tower",
    name: "The Eiffel Tower",
    city: "Paris",
    country: "France",
    kind: "Landmark",
    summary: "The one thing everybody wants to have done, best booked for a timed slot and left at that.",
    address: "Champ de Mars, 5 Avenue Anatole France, 75007 Paris",
    coordinates: "48.8584, 2.2945",
    website: "https://www.toureiffel.paris/en",
    notes: [
      "Book the lift slot online. Turning up wastes an afternoon in a queue.",
      "About 5 km from the kosher streets of the 4th and the Marais, and a similar distance from the 19th — a metro ride either way, not a walk.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Eiffel_Tower",
  },
  {
    slug: "paris-marais-pletzl",
    name: "The Pletzl — Jewish Marais",
    city: "Paris",
    country: "France",
    kind: "Jewish heritage",
    summary: "Rue des Rosiers and the streets around it: the old Jewish quarter, the Agudath Hakehilot shul, and most of central Paris's kosher food in a few blocks.",
    address: "Rue des Rosiers, 75004 Paris",
    coordinates: "48.8571, 2.3599",
    notes: [
      "This is the practical centre of a kosher Paris trip — food, minyanim and walking distance to the Seine and Notre-Dame.",
      "The Agudath Hakehilot shul on rue Pavée was built by Hector Guimard, who designed the Métro entrances, and is a listed building.",
      "The Shoah Memorial with its Wall of Names is a few minutes away on rue Geoffroy-l'Asnier.",
    ],
    shabbos: "The whole quarter is walkable, which is why people stay here for Shabbos rather than near the sights.",
    sourceUrl: "https://en.wikipedia.org/wiki/Marais",
  },
  {
    slug: "paris-louvre",
    name: "The Louvre",
    city: "Paris",
    country: "France",
    kind: "Museum",
    summary: "Too big for one visit; pick two or three wings and accept that.",
    address: "Rue de Rivoli, 75001 Paris",
    coordinates: "48.8606, 2.3376",
    website: "https://www.louvre.fr/en",
    notes: [
      "Twenty-five minutes' walk from the Pletzl along the river, which is a pleasant part of the day in itself.",
      "Timed tickets. Closed one day a week — check before building a day around it.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Louvre",
  },
  {
    slug: "versailles",
    name: "Palace of Versailles",
    city: "Versailles",
    country: "France",
    kind: "Landmark",
    summary: "The palace and, more to the point, the gardens — a full day out of Paris.",
    address: "Place d'Armes, 78000 Versailles",
    coordinates: "48.8049, 2.1204",
    website: "https://en.chateauversailles.fr/",
    notes: [
      "About an hour from central Paris on the RER C. Take the day's food; there is nothing kosher there.",
      "The gardens are most of the visit and are largely free; the fountains run only on certain days.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Palace_of_Versailles",
  },
  {
    slug: "nice-promenade",
    name: "Promenade des Anglais and Vieux Nice",
    city: "Nice",
    country: "France",
    kind: "Nature",
    summary: "The seafront and the old town, with a real kosher community behind them.",
    address: "Promenade des Anglais, 06000 Nice",
    coordinates: "43.6952, 7.2653",
    notes: [
      "Nice has a substantial kosher scene, which makes the Côte d'Azur workable for a family in a way most of the French coast is not.",
      "The beaches are pebble, not sand. Bring shoes for the water.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Promenade_des_Anglais",
  },
  {
    slug: "carcassonne",
    name: "Cité de Carcassonne",
    city: "Carcassonne",
    country: "France",
    kind: "Landmark",
    summary: "A walled medieval city you walk into and around, which children take to more than any museum.",
    address: "1 Rue Viollet le Duc, 11000 Carcassonne",
    coordinates: "43.2061, 2.3639",
    website: "https://www.remparts-carcassonne.fr/en",
    notes: [
      "The walls and the streets are free; the castle and the ramparts walk are ticketed.",
      "No kosher food locally — this is a day trip you carry food for.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Cit%C3%A9_de_Carcassonne",
  },

  // ---- Switzerland ----------------------------------------------------
  {
    slug: "jungfraujoch",
    name: "Jungfraujoch — Top of Europe",
    city: "Interlaken",
    country: "Switzerland",
    kind: "Viewpoint",
    summary: "The highest railway station in Europe, at 3,454 m, reached by cog railway through the inside of the Eiger.",
    address: "Jungfraujoch, 3801 Fieschertal",
    coordinates: "46.5474, 7.9855",
    website: "https://www.jungfrau.ch/en-gb/jungfraujoch-top-of-europe/",
    notes: [
      "Expensive and weather-dependent. Check the summit webcam the morning you go — in cloud you pay a great deal to stand inside a white room.",
      "Altitude is real at 3,454 m. Go slowly at the top, and think twice with very young children.",
      "Interlaken and Grindelwald are the usual bases, and both have kosher hotels operating in season. Out of season, bring food.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Jungfraujoch",
  },
  {
    slug: "lucerne-chapel-bridge",
    name: "Chapel Bridge and Lake Lucerne",
    city: "Lucerne",
    country: "Switzerland",
    kind: "Landmark",
    summary: "The covered wooden bridge of 1333 and the lake behind it — the postcard, and genuinely worth the stop.",
    address: "Kapellbrücke, 6002 Luzern",
    coordinates: "47.0517, 8.3076",
    notes: [
      "Walkable from the station, so it works as a half-day between trains.",
      "The lake boats run from beside it, and a short crossing is the cheapest way to see the mountains from the water.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Chapel_Bridge",
  },
  {
    slug: "rhine-falls",
    name: "Rhine Falls",
    city: "Schaffhausen",
    country: "Switzerland",
    kind: "Nature",
    summary: "The largest waterfall in Europe by volume, with walkways right down to the water.",
    address: "Rheinfallquai, 8212 Neuhausen am Rheinfall",
    coordinates: "47.6779, 8.6153",
    website: "https://rheinfall.ch/en/",
    notes: [
      "About 50 minutes by train from Zurich, so it is an easy half day from a Zurich base.",
      "The lower walkways get you wet. That is the point, but dress for it.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Rhine_Falls",
  },
  {
    slug: "zurich-old-town",
    name: "Zurich old town and the lake",
    city: "Zurich",
    country: "Switzerland",
    kind: "Landmark",
    summary: "The old streets, the river and the lakefront, in the city with Switzerland's largest kosher infrastructure.",
    address: "Altstadt, 8001 Zürich",
    coordinates: "47.3717, 8.5423",
    notes: [
      "Zurich is the practical base for a Swiss trip: the kosher shops and restaurants are around Wiedikon, roughly 2 km from the old town, and the mountains are all day trips from here.",
      "Swiss Travel Pass or a regional pass usually beats buying tickets one at a time once you are doing day trips.",
    ],
    shabbos: "Wiedikon is where to stay for Shabbos — the shuls, the food and the eruv are there, not in the old town.",
    sourceUrl: "https://en.wikipedia.org/wiki/Z%C3%BCrich",
  },
  {
    slug: "mount-pilatus",
    name: "Mount Pilatus",
    city: "Lucerne",
    country: "Switzerland",
    kind: "Viewpoint",
    summary: "Cable car up and the world's steepest cogwheel railway down, in a round trip from Lucerne.",
    address: "Schlossweg 1, 6010 Kriens",
    coordinates: "46.9790, 8.2528",
    website: "https://www.pilatus.ch/en/",
    notes: [
      "The classic golden round trip runs boat, cogwheel, cable car and bus. The cogwheel railway runs only in the warmer months.",
      "A gentler and much cheaper alternative to Jungfraujoch, and better with small children.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Pilatus_(mountain)",
  },
  {
    slug: "lauterbrunnen-valley",
    name: "Lauterbrunnen valley",
    city: "Lauterbrunnen",
    country: "Switzerland",
    kind: "Nature",
    summary: "A flat valley floor with seventy-two waterfalls coming off the cliffs on both sides — the walking is easy and the scenery is not.",
    address: "3822 Lauterbrunnen",
    coordinates: "46.5936, 7.9094",
    notes: [
      "The valley floor walk is level and pushchair-friendly, which makes it one of the few genuinely easy days in the Alps.",
      "Staubbach Falls drops almost 300 m right beside the village.",
      "Twenty minutes by train from Interlaken, and on the way up to Jungfraujoch, so the two combine.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Lauterbrunnen",
  },
];

/** One attraction by slug. */
export function getAttraction(slug: string) {
  return attractions.find((a) => a.slug === slug);
}

/** Everything in one country, in city order. */
export function attractionsIn(country: string) {
  return attractions.filter((a) => a.country === country).sort((a, b) => a.city.localeCompare(b.city));
}
