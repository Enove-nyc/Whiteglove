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

// WHAT GOES IN, AND WHAT DOES NOT.
//
// An attraction does not have to be kosher or Jewish to belong here. Most of
// these are ordinary sights — mountains, museums, castles, waterfalls — and
// that is the point: a family on a two-week trip needs somewhere to be on the
// days that are not kevarim.
//
// What does not go in, at any price:
//
//   • bars, clubs and nightlife
//   • mixed swimming and mixed dancing venues, and beach resorts sold on that
//   • anything explicit, and anything whose draw is immodest
//   • gambling
//
// The test is not "is it forbidden" — it is "would this be promoted in the
// community this site is for". If it would not be, it is not listed, and no
// entry is included with a warning attached instead. A caveat is not a filter.
//
// Where something is a genuine question rather than a line — a church that is
// also one of the great art collections, say — it is listed with the question
// named and left to the reader and their rov. Deciding that quietly, in either
// direction, is not the site's job.

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

  // ---- Italy, added ---------------------------------------------------
  {
    slug: "lake-como",
    name: "Lake Como",
    city: "Como",
    country: "Italy",
    kind: "Nature",
    summary: "Mountains straight down into the water, with boats between the villages — the walking is flat and the scenery does the work.",
    address: "Como, Lombardy",
    coordinates: "45.9860, 9.2570",
    notes: [
      "About an hour by train from Milan, so it is a day trip from the largest kosher base in Italy rather than a place to stay.",
      "The lake boats are the sightseeing. Varenna and Bellagio are the usual stops and both are walkable villages.",
      "Take the day's food from Milan — there is nothing kosher on the lake.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Lake_Como",
  },
  {
    slug: "cinque-terre",
    name: "Cinque Terre",
    city: "La Spezia",
    country: "Italy",
    kind: "Nature",
    summary: "Five villages stacked on cliffs above the sea, joined by a train and by footpaths.",
    address: "Cinque Terre National Park, Liguria",
    coordinates: "44.1270, 9.7100",
    website: "https://www.parconazionale5terre.it/Eindex.php",
    notes: [
      "The train between the villages runs every few minutes and is the easy way to do it; the coastal footpaths are the harder and better way.",
      "Very steep and very stepped. Not a day for a pushchair or for anybody who cannot manage stairs.",
      "The beaches are not the point here and are not what to plan around — the villages and the paths are.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Cinque_Terre",
  },
  {
    slug: "verona-arena",
    name: "The Verona Arena",
    city: "Verona",
    country: "Italy",
    kind: "Landmark",
    summary: "A Roman amphitheatre older than the Colosseum and still standing almost whole, in the middle of a walkable town.",
    address: "Piazza Bra 1, 37121 Verona",
    coordinates: "45.4390, 10.9944",
    website: "https://www.arena.it/en/",
    notes: [
      "Smaller and far less crowded than the Colosseum, and you can walk the tiers.",
      "Verona sits between Milan and Venice on the fast line, so it works as a stop rather than a detour.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Verona_Arena",
  },
  {
    slug: "siena-piazza-del-campo",
    name: "Siena and the Piazza del Campo",
    city: "Siena",
    country: "Italy",
    kind: "Landmark",
    summary: "A medieval town almost unchanged, built round a sloping shell-shaped square.",
    address: "Piazza del Campo, 53100 Siena",
    coordinates: "43.3186, 11.3316",
    notes: [
      "The old town is closed to traffic, so it is a walking day. Good shoes; the streets are steep.",
      "About 1h15 from Florence by bus, which is the practical way in — the train station is well below the town.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Piazza_del_Campo",
  },
  {
    slug: "rome-pantheon-trevi",
    name: "The Pantheon and the Trevi Fountain",
    city: "Rome",
    country: "Italy",
    kind: "Landmark",
    summary: "Two of Rome's set pieces, ten minutes' walk apart and both free to stand in front of.",
    address: "Piazza della Rotonda, 00186 Roma",
    coordinates: "41.8986, 12.4769",
    notes: [
      "Both are about a fifteen-minute walk from the Ghetto, which makes them the easiest thing to do from a kosher base in Rome.",
      "The Pantheon now charges and is timed; the fountain is a street corner and is free.",
      "Go early. By eleven the Trevi is shoulder to shoulder.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Pantheon,_Rome",
  },
  {
    slug: "murano-burano",
    name: "Murano and Burano",
    city: "Venice",
    country: "Italy",
    kind: "Family",
    summary: "Two islands in the lagoon — glassblowing on one, painted houses on the other. The best half day in Venice with children.",
    address: "Murano and Burano, Venetian Lagoon",
    coordinates: "45.4854, 12.4170",
    notes: [
      "Reached by vaporetto from the Fondamente Nove, which is a short walk from the Ghetto.",
      "The glass furnaces run demonstrations through the day; children who are finished with churches and museums will sit through this one.",
      "Burano is about colour and canals and needs no ticket for anything.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Burano",
  },

  // ---- France, added --------------------------------------------------
  {
    slug: "mont-saint-michel",
    name: "Mont-Saint-Michel",
    city: "Normandy",
    country: "France",
    kind: "Landmark",
    summary: "An island that becomes a peninsula and back again with the tide, with a walled village climbing it.",
    address: "50170 Le Mont-Saint-Michel",
    coordinates: "48.6361, -1.5115",
    website: "https://www.ot-montsaintmichel.com/en/",
    notes: [
      "The tides here are among the largest in Europe and the causeway and car parks are managed around them — check the tide table for the day.",
      "A long way from Paris: roughly four hours by road. This is an overnight or a very long day, not an afternoon.",
      "Steep and heavily stepped inside the walls.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Mont-Saint-Michel",
  },
  {
    slug: "chateau-de-chambord",
    name: "Château de Chambord",
    city: "Loire Valley",
    country: "France",
    kind: "Landmark",
    summary: "The largest of the Loire châteaux, with a double-helix staircase you can climb up one side while somebody else climbs the other without meeting.",
    address: "41250 Chambord",
    coordinates: "47.6161, 1.5170",
    website: "https://www.chambord.org/en/",
    notes: [
      "The staircase is the thing children remember. Let them do it twice.",
      "The grounds are enormous and largely free to walk; bicycles and boats are hired on site.",
      "About two hours from Paris by car. Bring the day's food.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Ch%C3%A2teau_de_Chambord",
  },
  {
    slug: "annecy",
    name: "Annecy and its lake",
    city: "Annecy",
    country: "France",
    kind: "Nature",
    summary: "One of the cleanest lakes in Europe, with an old town of canals behind it and the Alps around it.",
    address: "74000 Annecy",
    coordinates: "45.8992, 6.1294",
    notes: [
      "The lakeside path is flat, long and pushchair-friendly — a rare easy day in the mountains.",
      "Close to Geneva, which is the practical kosher base for this corner of France.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Lake_Annecy",
  },
  {
    slug: "chamonix-aiguille-du-midi",
    name: "Chamonix and the Aiguille du Midi",
    city: "Chamonix",
    country: "France",
    kind: "Viewpoint",
    summary: "A cable car from the valley floor to 3,842 m, under Mont Blanc, in about twenty minutes.",
    address: "100 Place de l'Aiguille du Midi, 74400 Chamonix",
    coordinates: "45.8786, 6.8875",
    website: "https://www.montblancnaturalresort.com/en",
    notes: [
      "One of the steepest cable-car ascents anywhere, and the altitude at the top is felt immediately. Go slowly; think twice with small children.",
      "Weather-dependent — check the summit webcam before you set out or you will pay a great deal to stand in cloud.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Aiguille_du_Midi",
  },
  {
    slug: "giverny-monet-garden",
    name: "Monet's garden at Giverny",
    city: "Giverny",
    country: "France",
    kind: "Nature",
    summary: "The water-lily pond and the flower garden the paintings were made from, kept as they were.",
    address: "84 Rue Claude Monet, 27620 Giverny",
    coordinates: "49.0757, 1.5330",
    website: "https://fondation-monet.com/en/",
    notes: [
      "Open roughly April to November only — it is a garden and it closes for the winter.",
      "About an hour and a quarter from Paris. Timed tickets; it is small and it fills.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Giverny",
  },

  // ---- Switzerland, added ---------------------------------------------
  {
    slug: "zermatt-gornergrat",
    name: "Zermatt and the Gornergrat",
    city: "Zermatt",
    country: "Switzerland",
    kind: "Viewpoint",
    summary: "A car-free village under the Matterhorn, and a cog railway to 3,089 m facing it.",
    address: "3920 Zermatt",
    coordinates: "46.0207, 7.7491",
    website: "https://www.gornergratbahn.ch/en",
    notes: [
      "Zermatt allows no petrol cars at all — you leave the car at Täsch and take the shuttle train up. Plan for that; people are caught by it.",
      "The Gornergrat railway is gentler than Jungfraujoch, cheaper, and the Matterhorn view is the better one.",
      "No kosher food. Zurich or Geneva is the base; this is a long day trip or an overnight with food carried in.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Gornergrat",
  },
  {
    slug: "chateau-de-chillon",
    name: "Château de Chillon",
    city: "Montreux",
    country: "Switzerland",
    kind: "Landmark",
    summary: "An island castle on Lake Geneva, walked through room by room from the dungeons to the towers.",
    address: "Avenue de Chillon 21, 1820 Veytaux",
    coordinates: "46.4143, 6.9276",
    website: "https://www.chillon.ch/en/",
    notes: [
      "One of the most visited historic buildings in Switzerland, and one of the few that holds children right through.",
      "The lakeside walk from Montreux takes about forty-five minutes and is flat.",
      "Geneva, about ninety minutes away, is the nearest kosher base.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Ch%C3%A2teau_de_Chillon",
  },
  {
    slug: "schilthorn-piz-gloria",
    name: "Schilthorn",
    city: "Mürren",
    country: "Switzerland",
    kind: "Viewpoint",
    summary: "A revolving summit terrace at 2,970 m looking straight across at the Eiger, Mönch and Jungfrau.",
    address: "Schilthorn, 3826 Lauterbrunnen",
    coordinates: "46.5578, 7.8353",
    website: "https://schilthorn.ch/en",
    notes: [
      "Cheaper than Jungfraujoch and the view is of the mountains rather than from inside them — many people prefer it.",
      "Reached by cable car in stages from Stechelberg in the Lauterbrunnen valley, so the two combine into one day.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Schilthorn",
  },
  {
    slug: "trummelbach-falls",
    name: "Trümmelbach Falls",
    city: "Lauterbrunnen",
    country: "Switzerland",
    kind: "Nature",
    summary: "Ten glacier waterfalls inside the mountain, reached by a lift cut into the rock.",
    address: "3824 Lauterbrunnen",
    coordinates: "46.5769, 7.9059",
    website: "https://www.truemmelbachfaelle.ch/en/",
    notes: [
      "Indoors and inside the rock, which makes it the answer to a wet day in the Alps when everything else is in cloud.",
      "Loud, wet and cold even in August. Take a jacket.",
      "Open roughly April to November.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Tr%C3%BCmmelbach_Falls",
  },
  {
    slug: "glacier-express",
    name: "The Glacier Express",
    city: "Zermatt to St Moritz",
    country: "Switzerland",
    kind: "Nature",
    summary: "Eight hours across the Alps by panoramic train, over nearly three hundred bridges and through ninety-one tunnels.",
    address: "Zermatt / St. Moritz",
    coordinates: "46.4908, 9.8355",
    website: "https://www.glacierexpress.ch/en/",
    notes: [
      "Seat reservations are compulsory and the good seats go months ahead.",
      "A whole day sitting down, which makes it the easiest possible day with elderly parents or a baby.",
      "Take food. The catering is not kosher and eight hours is a long time.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Glacier_Express",
  },
  {
    slug: "grindelwald-first",
    name: "Grindelwald First",
    city: "Grindelwald",
    country: "Switzerland",
    kind: "Family",
    summary: "A cable car to a ridge with a cliff walkway, and a mountain cart and a toboggan run back down.",
    address: "3818 Grindelwald",
    coordinates: "46.6659, 8.0530",
    website: "https://www.jungfrau.ch/en-gb/grindelwald-first/",
    notes: [
      "The one in the Jungfrau region built for children rather than for the view alone.",
      "The Cliff Walk is a railed walkway out over the drop — safe, and not for anybody who dislikes heights.",
      "Grindelwald has kosher hotel programmes in season; out of season, carry food.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/First_(mountain)",
  },

  // ---- Spain ----------------------------------------------------------
  {
    slug: "toledo-transito-synagogue",
    name: "Toledo — the Transito and Santa Maria la Blanca",
    city: "Toledo",
    country: "Spain",
    kind: "Jewish heritage",
    summary: "Two shuls of the Spanish golden age still standing, one of them now the Sephardi Museum, in the juderia of the city Sephardi Jewry is named for.",
    address: "Calle Samuel Levi, 45002 Toledo",
    coordinates: "39.8564, -4.0298",
    website: "https://www.cultura.gob.es/msefardi/en/home.html",
    notes: [
      "The Transito was built in the 1350s by Shmuel HaLevi Abulafia and its walls are covered in Hebrew. Santa Maria la Blanca is older still, from about 1180, and is the oldest surviving shul building in Europe.",
      "Both were taken as churches after 1492 and neither is a working shul. That is the history rather than a complaint, but people arrive expecting to daven and cannot.",
      "About an hour from Madrid by fast train, so it is a day trip from a Madrid base.",
    ],
    shabbos: "Museum closed Shabbos. There is no kosher food in Toledo; bring the day's food from Madrid.",
    sourceUrl: "https://en.wikipedia.org/wiki/Synagogue_of_El_Transito",
  },
  {
    slug: "cordoba-juderia",
    name: "Cordoba — the juderia and the old shul",
    city: "Cordoba",
    country: "Spain",
    kind: "Jewish heritage",
    summary: "The old Jewish quarter and the small 14th-century shul in it, in the city the Rambam was born in.",
    address: "Calle Judios 20, 14004 Cordoba",
    coordinates: "37.8845, -4.7845",
    notes: [
      "One of only three medieval shuls left standing in Spain. It is tiny — a single room — and takes minutes rather than an hour.",
      "The Rambam was born in Cordoba in 1138 and left as a boy; there is a statue of him in the quarter. He is buried in Teverya, which is on this site under Tiberias.",
      "The whitewashed lanes of the juderia are the pleasant part of a Cordoba day and cost nothing.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Synagogue_of_C%C3%B3rdoba",
  },
  {
    slug: "girona-call",
    name: "Girona — the Call and the Jewish History Museum",
    city: "Girona",
    country: "Spain",
    kind: "Jewish heritage",
    summary: "One of the best-preserved medieval Jewish quarters anywhere, in the town of the Ramban.",
    address: "Carrer de la Forca 8, 17004 Girona",
    coordinates: "41.9870, 2.8261",
    website: "https://www.girona.cat/call/eng/museu.php",
    notes: [
      "The stepped stone lanes of the Call are largely as they were, which is rare — most Spanish juderias were rebuilt over.",
      "The Ramban lived and taught here before leaving for Eretz Yisroel in 1267. The museum holds matzeivos recovered from the town's bais hachaim.",
      "About 40 minutes from Barcelona by fast train.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Call_of_Girona",
  },
  {
    slug: "granada-alhambra",
    name: "The Alhambra",
    city: "Granada",
    country: "Spain",
    kind: "Landmark",
    summary: "A Moorish palace-city of courtyards, water and carved plaster, above Granada.",
    address: "Calle Real de la Alhambra, 18009 Granada",
    coordinates: "37.1761, -3.5881",
    website: "https://www.alhambra-patronato.es/en/",
    notes: [
      "Tickets sell out weeks ahead and entry to the Nasrid Palaces is timed to the minute — miss the slot and it is gone. This is the one thing in Spain to book before anything else.",
      "Largely outdoors, with a great deal of walking on uneven stone.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Alhambra",
  },
  {
    slug: "barcelona-park-guell",
    name: "Park Guell",
    city: "Barcelona",
    country: "Spain",
    kind: "Family",
    summary: "Gaudi's hillside park of mosaic terraces and curving benches, with the city and the sea below it.",
    address: "08024 Barcelona",
    coordinates: "41.4145, 2.1527",
    website: "https://parkguell.barcelona/en",
    notes: [
      "The monumental zone is ticketed and timed; the surrounding woodland park is free and worth the walk on its own.",
      "Steep. There are escalators up from the Lesseps side, which is worth knowing with a pushchair.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Park_G%C3%BCell",
  },

  // ---- Greece ---------------------------------------------------------
  {
    slug: "athens-acropolis",
    name: "The Acropolis",
    city: "Athens",
    country: "Greece",
    kind: "Landmark",
    summary: "The Parthenon and the rock it stands on, above the old city.",
    address: "Athens 105 58",
    coordinates: "37.9715, 23.7267",
    notes: [
      "Go at opening or late in the day. There is no shade on the rock and Athens in summer is punishing.",
      "Athens has a working kehilla and kosher food, which makes it a rare Greek city where a frum family can base itself.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Acropolis_of_Athens",
  },
  {
    slug: "rhodes-jewish-quarter",
    name: "Rhodes — La Juderia and the Kahal Shalom",
    city: "Rhodes",
    country: "Greece",
    kind: "Jewish heritage",
    summary: "The oldest shul in Greece, from 1577, in the walled old town's Jewish quarter, with a museum beside it.",
    address: "Dosiadou Street, Rhodes 851 00",
    coordinates: "36.4432, 28.2273",
    website: "https://www.rhodesjewishmuseum.org/",
    notes: [
      "The Rhodes kehilla was one of the great Sephardi communities and was almost entirely destroyed in 1944. The Square of the Martyred Jews in the quarter is the memorial.",
      "The shul still functions in summer, when there are visitors enough for a minyan.",
      "The old town is walled and car-free, so it is walked.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Kahal_Shalom_Synagogue",
  },
  {
    slug: "meteora",
    name: "Meteora",
    city: "Kalabaka",
    country: "Greece",
    kind: "Nature",
    summary: "Sandstone pillars hundreds of metres high rising straight out of the plain, with monasteries built on top of them.",
    address: "Kalabaka 422 00",
    coordinates: "39.7217, 21.6306",
    notes: [
      "The rock formations are the reason to come and are free to drive among and walk below. The monasteries themselves are churches — the same question as the Vatican, and the same answer: ask your rov.",
      "About four and a half hours from Athens. An overnight, not a day trip.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Meteora",
  },

  // ---- United Kingdom -------------------------------------------------
  {
    slug: "york-cliffords-tower",
    name: "York — Clifford's Tower",
    city: "York",
    country: "United Kingdom",
    kind: "Jewish heritage",
    summary: "The castle keep where the Jews of York died al kiddush Hashem in 1190 rather than be forced to convert.",
    address: "Tower Street, York YO1 9SA",
    coordinates: "53.9557, -1.0801",
    website: "https://www.english-heritage.org.uk/visit/places/cliffords-tower-york/",
    notes: [
      "On Shabbos HaGadol 1190 the kehilla took refuge in the tower and, besieged, most died al kiddush Hashem rather than convert. A plaque at the foot of the mound records it.",
      "For centuries many Jews would not stay overnight in York because of it, and some still hold that way. Worth knowing before booking a hotel there.",
      "The mound is steep and the tower is climbed by stairs.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Clifford%27s_Tower",
  },
  {
    slug: "tower-of-london",
    name: "The Tower of London",
    city: "London",
    country: "United Kingdom",
    kind: "Landmark",
    summary: "A fortress, a prison and the Crown Jewels, on the river in the middle of the city.",
    address: "London EC3N 4AB",
    coordinates: "51.5081, -0.0759",
    website: "https://www.hrp.org.uk/tower-of-london/",
    notes: [
      "London's kosher food is largely in Golders Green, Hendon and Stamford Hill, 30 to 45 minutes out on the Underground. Central sightseeing means carrying lunch.",
      "The Yeoman Warder tours are included in the ticket and are the best part; they run every half hour.",
      "Jews were imprisoned here before the expulsion of 1290, and the coin-clipping trials of 1278 were run from this mint.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Tower_of_London",
  },
  {
    slug: "windsor-castle",
    name: "Windsor Castle",
    city: "Windsor",
    country: "United Kingdom",
    kind: "Landmark",
    summary: "The oldest inhabited castle in the world, an hour from central London.",
    address: "Windsor SL4 1NJ",
    coordinates: "51.4839, -0.6044",
    website: "https://www.rct.uk/visit/windsor-castle",
    notes: [
      "Check before you go whether the State Apartments are open — they close when the castle is in official use, and that is the bulk of the visit.",
      "Reachable by train from Paddington or Waterloo, so it works without a car.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Windsor_Castle",
  },
  {
    slug: "lake-district",
    name: "The Lake District",
    city: "Windermere",
    country: "United Kingdom",
    kind: "Nature",
    summary: "Mountains, lakes and walking, about three hours north of Manchester's kosher community.",
    address: "Windermere, Cumbria",
    coordinates: "54.3781, -2.9082",
    notes: [
      "Manchester has one of the largest kosher infrastructures in Europe and is the practical base — the Lakes have none at all.",
      "The lake cruises from Bowness are the easy version; the fells are the real thing and need proper boots and weather sense.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Lake_District",
  },

  // ---- Austria --------------------------------------------------------
  {
    slug: "vienna-judenplatz",
    name: "Vienna — Judenplatz and the Shoah memorial",
    city: "Vienna",
    country: "Austria",
    kind: "Jewish heritage",
    summary: "The square of the medieval kehilla, with Rachel Whiteread's memorial standing above the excavated foundations of the shul burned in 1421.",
    address: "Judenplatz, 1010 Wien",
    coordinates: "48.2117, 16.3697",
    website: "https://www.jmw.at/en",
    notes: [
      "The memorial is a concrete room turned inside out — the books face outward and the door does not open. Beneath it are the foundations of the shul destroyed in the Wiener Gesera of 1420-21, reached through the museum.",
      "Vienna has a working kehilla with kosher food, largely in the 2nd district across the canal.",
    ],
    shabbos: "Museum closed Shabbos; the square and the memorial are open air and always there.",
    sourceUrl: "https://en.wikipedia.org/wiki/Judenplatz_Holocaust_Memorial",
  },
  {
    slug: "schonbrunn-palace",
    name: "Schonbrunn Palace and gardens",
    city: "Vienna",
    country: "Austria",
    kind: "Family",
    summary: "The Habsburg summer palace, with formal gardens, a maze and the oldest zoo in the world in the grounds.",
    address: "Schonbrunner Schlossstrasse 47, 1130 Wien",
    coordinates: "48.1845, 16.3122",
    website: "https://www.schoenbrunn.at/en/",
    notes: [
      "The gardens are free and enormous; the palace interior and the zoo are separate tickets. With children the gardens and the maze can be the whole visit.",
      "On the U4 line, so it is straightforward from the 2nd district where the kosher food is.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Sch%C3%B6nbrunn_Palace",
  },
  {
    slug: "hallstatt",
    name: "Hallstatt",
    city: "Hallstatt",
    country: "Austria",
    kind: "Nature",
    summary: "A village on a shelf between a lake and a mountain, with a salt mine above it that has been worked for three thousand years.",
    address: "4830 Hallstatt",
    coordinates: "47.5622, 13.6493",
    notes: [
      "Very small and very visited. Early or late in the day is a different place from the middle of it.",
      "The funicular up to the skywalk and the salt mine is one half day; the lake shore is the other.",
      "Roughly an hour and a quarter from Salzburg. No kosher food — carry the day's.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Hallstatt",
  },

  // ---- Israel ---------------------------------------------------------
  {
    slug: "kosel-tunnels",
    name: "The Kosel and the Kosel tunnels",
    city: "Jerusalem",
    country: "Israel",
    kind: "Jewish heritage",
    summary: "The Kosel itself, and the tunnel along the rest of the western wall to the point closest to the Kodesh HaKodashim.",
    address: "Western Wall Plaza, Old City, Jerusalem",
    coordinates: "31.7767, 35.2345",
    website: "https://english.thekotel.org/",
    notes: [
      "The plaza is open at every hour and needs no ticket. The tunnels are a booked tour and they sell out — book before you fly, not on the day.",
      "The tunnel tour walks the full length of the wall underground and reaches the closest accessible point to the site of the Kodesh HaKodashim. Narrow and stepped in places.",
      "Separate men's and women's sections at the wall itself, as always.",
    ],
    shabbos: "The Kosel is at its fullest on Friday night and it is worth being there for it. The tunnel tours do not run on Shabbos.",
    sourceUrl: "https://en.wikipedia.org/wiki/Western_Wall_Tunnel",
  },
  {
    slug: "city-of-david",
    name: "The City of David",
    city: "Jerusalem",
    country: "Israel",
    kind: "Jewish heritage",
    summary: "The original Yerushalayim of Dovid HaMelech, on the ridge below the Old City, with Chizkiyahu's water tunnel running under it.",
    address: "Ma'alot Ir David, Jerusalem",
    coordinates: "31.7739, 35.2358",
    website: "https://www.cityofdavid.org.il/en",
    notes: [
      "Chizkiyahu's tunnel is walked through knee-deep water in the dark for about half an hour — take a torch, water shoes and dry clothes, or take the dry Canaanite tunnel instead.",
      "It comes out at the Shiloach, and the stepped street from there back up is the road the olei regel walked.",
      "Ten minutes' walk from the Kosel, so the two go together.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/City_of_David",
  },
  {
    slug: "masada",
    name: "Masada",
    city: "Dead Sea",
    country: "Israel",
    kind: "Landmark",
    summary: "Herod's fortress on a plateau above the Dead Sea, and the last place held in the revolt against Rome.",
    address: "Masada National Park, Dead Sea",
    coordinates: "31.3157, 35.3535",
    website: "https://en.parks.org.il/reserve-park/masada-national-park/",
    notes: [
      "Cable car, or the Snake Path on foot — about 45 minutes up, and it has to be started before dawn in summer because the path closes once the heat comes.",
      "The plateau is entirely exposed. Water, hats, and not the middle of a summer day.",
      "About an hour and a half from Yerushalayim.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Masada",
  },
  {
    slug: "ein-gedi",
    name: "Ein Gedi",
    city: "Dead Sea",
    country: "Israel",
    kind: "Nature",
    summary: "Waterfalls and pools in a desert canyon above the Dead Sea, where Dovid HaMelech hid from Shaul.",
    address: "Ein Gedi Nature Reserve, Dead Sea",
    coordinates: "31.4614, 35.3925",
    website: "https://en.parks.org.il/reserve-park/ein-gedi-nature-reserve/",
    notes: [
      "The walk to David's Waterfall is short, shaded in places and manageable with children; the upper trails are longer and steeper.",
      "Ibex and hyrax on the path, close up. This is the desert day young children remember.",
      "Sensible to pair with Masada, twenty minutes down the road.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Ein_Gedi",
  },
  {
    slug: "machtesh-ramon",
    name: "Machtesh Ramon",
    city: "Mitzpe Ramon",
    country: "Israel",
    kind: "Nature",
    summary: "A crater forty kilometres long in the middle of the Negev, with the town sitting on the lip of it.",
    address: "Mitzpe Ramon",
    coordinates: "30.6094, 34.8016",
    website: "https://en.parks.org.il/reserve-park/mitzpe-ramon-visitors-center/",
    notes: [
      "The view from the edge costs nothing and is most of it. The visitor centre and the drives down into the crater are the rest.",
      "Some of the darkest skies in the country — worth staying the night for rather than driving back.",
      "About two hours from Be'er Sheva. Fill the tank; there is very little in between.",
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Makhtesh_Ramon",
  },
];
