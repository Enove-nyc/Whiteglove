// Airports for the flight search AND for the "nearest airport to this beis
// hachaim" feature. Every airport here is a real commercial airport with
// scheduled passenger service (no private airfields), with coordinates so we
// can rank the closest ones to a kever. City aliases let a city search return
// every airport in it (e.g. "NYC" -> JFK, EWR, LGA).
//
// `size`: "major" = large international hub with lots of flights; "regional" =
// smaller airport with a normal but lighter schedule. Coordinates are the
// well-known public airport locations (used only for distance ranking; exact
// driving/transit times come from the live Maps links on the page).

export type AirportSize = "major" | "regional";
export type Airport = {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  size: AirportSize;
  aliases: string[];
  /**
   * The IATA METROPOLITAN code for this airport's city, where one exists.
   *
   * These are real IATA codes for a whole city rather than one airport — LON
   * covers Heathrow, Gatwick, Stansted, Luton and City. Duffel accepts them in
   * place of an airport code and searches every airport in the area, which is
   * the whole point: somebody flying to London does not care which of the five
   * they land at, and searching only Heathrow hides the cheap flight.
   *
   * Set only where the metropolitan code is its own code. Istanbul and Kyiv are
   * deliberately left off: their city codes are also the codes of one of their
   * airports, so sending one would silently search that airport alone.
   */
  cityCode?: string;
};

/**
 * The cities where searching the whole area is offered, and what to call it.
 *
 * Keyed by metropolitan code so the label is written once rather than derived
 * from whichever airport happened to sort first.
 */
export const METRO_AREAS: Record<string, { label: string; country: string }> = {
  NYC: { label: "New York — all airports", country: "USA" },
  CHI: { label: "Chicago — all airports", country: "USA" },
  WAS: { label: "Washington DC — all airports", country: "USA" },
  LON: { label: "London — all airports", country: "UK" },
  PAR: { label: "Paris — all airports", country: "France" },
  MIL: { label: "Milan — all airports", country: "Italy" },
};

export const AIRPORTS: Airport[] = [
  // --- United States ---
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "USA", lat: 40.6413, lng: -73.7781, size: "major", aliases: ["nyc", "new york city", "manhattan", "brooklyn", "queens"], cityCode: "NYC" },
  { code: "EWR", name: "Newark Liberty International", city: "Newark / New York", country: "USA", lat: 40.6895, lng: -74.1745, size: "major", aliases: ["nyc", "new york", "new york city", "new jersey", "lakewood"], cityCode: "NYC" },
  { code: "LGA", name: "LaGuardia", city: "New York", country: "USA", lat: 40.7769, lng: -73.874, size: "major", aliases: ["nyc", "new york city", "queens"], cityCode: "NYC" },
  { code: "BOS", name: "Logan International", city: "Boston", country: "USA", lat: 42.3656, lng: -71.0096, size: "major", aliases: [] },
  { code: "MIA", name: "Miami International", city: "Miami", country: "USA", lat: 25.7959, lng: -80.287, size: "major", aliases: ["miami beach"] },
  { code: "FLL", name: "Fort Lauderdale-Hollywood International", city: "Fort Lauderdale", country: "USA", lat: 26.0742, lng: -80.1506, size: "major", aliases: ["hollywood", "miami"] },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "USA", lat: 41.9742, lng: -87.9073, size: "major", aliases: [], cityCode: "CHI" },
  { code: "MDW", name: "Midway International", city: "Chicago", country: "USA", lat: 41.7868, lng: -87.7522, size: "regional", aliases: [], cityCode: "CHI" },
  { code: "IAD", name: "Washington Dulles International", city: "Washington", country: "USA", lat: 38.9531, lng: -77.4565, size: "major", aliases: ["dc", "washington dc"], cityCode: "WAS" },
  { code: "BWI", name: "Baltimore/Washington International", city: "Baltimore", country: "USA", lat: 39.1774, lng: -76.6684, size: "major", aliases: ["washington", "dc"], cityCode: "WAS" },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "USA", lat: 33.9416, lng: -118.4085, size: "major", aliases: ["la"] },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "USA", lat: 37.6213, lng: -122.379, size: "major", aliases: ["bay area"] },
  { code: "SEA", name: "Seattle-Tacoma International", city: "Seattle", country: "USA", lat: 47.4502, lng: -122.3088, size: "major", aliases: [] },
  { code: "ATL", name: "Hartsfield-Jackson International", city: "Atlanta", country: "USA", lat: 33.6407, lng: -84.4277, size: "major", aliases: [] },
  { code: "DTW", name: "Detroit Metropolitan", city: "Detroit", country: "USA", lat: 42.2162, lng: -83.3554, size: "major", aliases: [] },
  { code: "CLE", name: "Cleveland Hopkins International", city: "Cleveland", country: "USA", lat: 41.4117, lng: -81.8498, size: "regional", aliases: [] },
  // --- Canada ---
  { code: "YYZ", name: "Toronto Pearson International", city: "Toronto", country: "Canada", lat: 43.6777, lng: -79.6248, size: "major", aliases: [] },
  { code: "YUL", name: "Montreal-Trudeau International", city: "Montreal", country: "Canada", lat: 45.4706, lng: -73.7408, size: "major", aliases: [] },
  // --- Poland ---
  { code: "WAW", name: "Warsaw Chopin", city: "Warsaw", country: "Poland", lat: 52.1657, lng: 20.9671, size: "major", aliases: ["warszawa"] },
  { code: "KRK", name: "John Paul II International", city: "Krakow", country: "Poland", lat: 50.0777, lng: 19.7848, size: "major", aliases: ["krokow", "cracow"] },
  { code: "KTW", name: "Katowice", city: "Katowice", country: "Poland", lat: 50.4743, lng: 19.08, size: "regional", aliases: ["katowice pyrzowice"] },
  { code: "RZE", name: "Rzeszów-Jasionka", city: "Rzeszów", country: "Poland", lat: 50.11, lng: 22.019, size: "regional", aliases: ["rzeszow"] },
  { code: "GDN", name: "Gdańsk Lech Wałęsa", city: "Gdańsk", country: "Poland", lat: 54.3776, lng: 18.4662, size: "regional", aliases: ["gdansk"] },
  { code: "WRO", name: "Wrocław Copernicus", city: "Wrocław", country: "Poland", lat: 51.1027, lng: 16.8858, size: "regional", aliases: ["wroclaw", "breslau"] },
  { code: "POZ", name: "Poznań-Ławica", city: "Poznań", country: "Poland", lat: 52.421, lng: 16.8263, size: "regional", aliases: ["poznan"] },
  { code: "LUZ", name: "Lublin", city: "Lublin", country: "Poland", lat: 51.2403, lng: 22.7136, size: "regional", aliases: [] },
  // --- Ukraine ---
  { code: "KBP", name: "Kyiv Boryspil International", city: "Kyiv", country: "Ukraine", lat: 50.345, lng: 30.8947, size: "major", aliases: ["kiev", "kyiv"] },
  { code: "IEV", name: "Kyiv Zhuliany (Ihor Sikorsky)", city: "Kyiv", country: "Ukraine", lat: 50.4017, lng: 30.4497, size: "regional", aliases: ["kiev", "kyiv"] },
  { code: "LWO", name: "Lviv Danylo Halytskyi International", city: "Lviv", country: "Ukraine", lat: 49.8125, lng: 23.9561, size: "regional", aliases: ["lvov", "lemberg"] },
  { code: "ODS", name: "Odesa International", city: "Odesa", country: "Ukraine", lat: 46.4268, lng: 30.6765, size: "regional", aliases: ["odessa"] },
  { code: "DNK", name: "Dnipro International", city: "Dnipro", country: "Ukraine", lat: 48.3572, lng: 35.1006, size: "regional", aliases: ["dnepropetrovsk"] },
  { code: "HRK", name: "Kharkiv International", city: "Kharkiv", country: "Ukraine", lat: 49.9248, lng: 36.29, size: "regional", aliases: ["kharkov"] },
  // --- Hungary ---
  { code: "BUD", name: "Budapest Ferenc Liszt International", city: "Budapest", country: "Hungary", lat: 47.4298, lng: 19.2611, size: "major", aliases: [] },
  { code: "DEB", name: "Debrecen International", city: "Debrecen", country: "Hungary", lat: 47.4889, lng: 21.6153, size: "regional", aliases: [] },
  // --- Slovakia ---
  { code: "BTS", name: "Bratislava M. R. Štefánik", city: "Bratislava", country: "Slovakia", lat: 48.1702, lng: 17.2127, size: "regional", aliases: ["pressburg", "pozsony"] },
  { code: "KSC", name: "Košice International", city: "Košice", country: "Slovakia", lat: 48.6631, lng: 21.2411, size: "regional", aliases: ["kosice"] },
  { code: "TAT", name: "Poprad-Tatry", city: "Poprad", country: "Slovakia", lat: 49.0736, lng: 20.2411, size: "regional", aliases: ["tatry"] },
  // --- Czechia ---
  { code: "PRG", name: "Václav Havel Airport Prague", city: "Prague", country: "Czechia", lat: 50.1008, lng: 14.26, size: "major", aliases: ["praha", "prag"] },
  { code: "BRQ", name: "Brno-Tuřany", city: "Brno", country: "Czechia", lat: 49.1513, lng: 16.6944, size: "regional", aliases: [] },
  { code: "OSR", name: "Ostrava Leoš Janáček", city: "Ostrava", country: "Czechia", lat: 49.6963, lng: 18.1111, size: "regional", aliases: [] },
  // --- Lithuania ---
  { code: "VNO", name: "Vilnius International", city: "Vilnius", country: "Lithuania", lat: 54.6341, lng: 25.2858, size: "regional", aliases: ["vilna"] },
  { code: "KUN", name: "Kaunas International", city: "Kaunas", country: "Lithuania", lat: 54.9639, lng: 24.0848, size: "regional", aliases: ["kovno"] },
  // --- Belarus ---
  { code: "MSQ", name: "Minsk National", city: "Minsk", country: "Belarus", lat: 53.8825, lng: 28.0307, size: "regional", aliases: [] },
  // --- Austria ---
  { code: "VIE", name: "Vienna International", city: "Vienna", country: "Austria", lat: 48.1103, lng: 16.5697, size: "major", aliases: ["wien"] },
  { code: "SZG", name: "Salzburg Airport", city: "Salzburg", country: "Austria", lat: 47.7933, lng: 13.0043, size: "regional", aliases: [] },
  { code: "GRZ", name: "Graz Airport", city: "Graz", country: "Austria", lat: 46.9911, lng: 15.4396, size: "regional", aliases: [] },
  { code: "INN", name: "Innsbruck Airport", city: "Innsbruck", country: "Austria", lat: 47.2602, lng: 11.344, size: "regional", aliases: [] },
  // --- Romania & Moldova ---
  { code: "OTP", name: "Bucharest Henri Coandă International", city: "Bucharest", country: "Romania", lat: 44.5711, lng: 26.085, size: "major", aliases: ["bucuresti"] },
  { code: "CLJ", name: "Cluj-Napoca International", city: "Cluj-Napoca", country: "Romania", lat: 46.7852, lng: 23.6862, size: "regional", aliases: ["cluj"] },
  { code: "IAS", name: "Iași International", city: "Iași", country: "Romania", lat: 47.1785, lng: 27.6206, size: "regional", aliases: ["iasi", "jassy"] },
  { code: "SBZ", name: "Sibiu International", city: "Sibiu", country: "Romania", lat: 45.7856, lng: 24.0913, size: "regional", aliases: [] },
  { code: "TSR", name: "Timișoara Traian Vuia", city: "Timișoara", country: "Romania", lat: 45.8099, lng: 21.3379, size: "regional", aliases: ["timisoara"] },
  { code: "KIV", name: "Chișinău International", city: "Chișinău", country: "Moldova", lat: 46.9277, lng: 28.9309, size: "regional", aliases: ["chisinau", "kishinev"] },
  // --- Germany ---
  { code: "FRA", name: "Frankfurt", city: "Frankfurt", country: "Germany", lat: 50.0379, lng: 8.5622, size: "major", aliases: [] },
  { code: "MUC", name: "Munich", city: "Munich", country: "Germany", lat: 48.3538, lng: 11.7861, size: "major", aliases: ["münchen", "munchen"] },
  { code: "BER", name: "Berlin Brandenburg", city: "Berlin", country: "Germany", lat: 52.3667, lng: 13.5033, size: "major", aliases: [] },
  { code: "DUS", name: "Düsseldorf", city: "Düsseldorf", country: "Germany", lat: 51.2895, lng: 6.7668, size: "major", aliases: ["dusseldorf"] },
  { code: "HAM", name: "Hamburg", city: "Hamburg", country: "Germany", lat: 53.6304, lng: 9.9882, size: "regional", aliases: [] },
  { code: "STR", name: "Stuttgart", city: "Stuttgart", country: "Germany", lat: 48.6899, lng: 9.222, size: "regional", aliases: [] },
  { code: "CGN", name: "Cologne Bonn", city: "Cologne", country: "Germany", lat: 50.8659, lng: 7.1427, size: "regional", aliases: ["köln", "koln"] },
  // --- Netherlands / Belgium ---
  { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", lat: 52.3105, lng: 4.7683, size: "major", aliases: [] },
  { code: "BRU", name: "Brussels", city: "Brussels", country: "Belgium", lat: 50.9014, lng: 4.4844, size: "major", aliases: ["brussel", "bruxelles"] },
  { code: "ANR", name: "Antwerp International", city: "Antwerp", country: "Belgium", lat: 51.1894, lng: 4.4603, size: "regional", aliases: ["antwerpen", "anvers"] },
  { code: "CRL", name: "Brussels South Charleroi", city: "Charleroi", country: "Belgium", lat: 50.4592, lng: 4.4538, size: "regional", aliases: ["brussels charleroi"] },
  // --- Switzerland ---
  { code: "ZRH", name: "Zurich", city: "Zurich", country: "Switzerland", lat: 47.4647, lng: 8.5492, size: "major", aliases: ["zürich"] },
  { code: "GVA", name: "Geneva", city: "Geneva", country: "Switzerland", lat: 46.2381, lng: 6.109, size: "major", aliases: ["genève", "geneve"] },
  { code: "BSL", name: "EuroAirport Basel-Mulhouse", city: "Basel", country: "Switzerland", lat: 47.5896, lng: 7.5299, size: "regional", aliases: ["basle", "mulhouse"] },
  // --- United Kingdom ---
  { code: "LHR", name: "London Heathrow", city: "London", country: "UK", lat: 51.47, lng: -0.4543, size: "major", aliases: ["london"], cityCode: "LON" },
  { code: "LGW", name: "London Gatwick", city: "London", country: "UK", lat: 51.1537, lng: -0.1821, size: "major", aliases: ["london"], cityCode: "LON" },
  { code: "STN", name: "London Stansted", city: "London", country: "UK", lat: 51.886, lng: 0.2389, size: "regional", aliases: ["london"], cityCode: "LON" },
  { code: "LTN", name: "London Luton", city: "London", country: "UK", lat: 51.8747, lng: -0.3683, size: "regional", aliases: ["london"], cityCode: "LON" },
  { code: "LCY", name: "London City", city: "London", country: "UK", lat: 51.5053, lng: 0.0553, size: "regional", aliases: ["london"], cityCode: "LON" },
  { code: "MAN", name: "Manchester", city: "Manchester", country: "UK", lat: 53.3537, lng: -2.275, size: "major", aliases: [] },
  { code: "BHX", name: "Birmingham", city: "Birmingham", country: "UK", lat: 52.4539, lng: -1.748, size: "regional", aliases: [] },
  // --- France ---
  { code: "CDG", name: "Paris Charles de Gaulle", city: "Paris", country: "France", lat: 49.0097, lng: 2.5479, size: "major", aliases: ["paris"], cityCode: "PAR" },
  { code: "ORY", name: "Paris Orly", city: "Paris", country: "France", lat: 48.7233, lng: 2.3794, size: "major", aliases: ["paris"], cityCode: "PAR" },
  { code: "NCE", name: "Nice Côte d'Azur", city: "Nice", country: "France", lat: 43.6584, lng: 7.2159, size: "regional", aliases: [] },
  { code: "LYS", name: "Lyon-Saint Exupéry", city: "Lyon", country: "France", lat: 45.7256, lng: 5.0811, size: "regional", aliases: [] },
  { code: "MRS", name: "Marseille Provence", city: "Marseille", country: "France", lat: 43.4393, lng: 5.2214, size: "regional", aliases: [] },
  // --- Italy ---
  { code: "FCO", name: "Rome Fiumicino", city: "Rome", country: "Italy", lat: 41.8003, lng: 12.2389, size: "major", aliases: ["roma"] },
  { code: "MXP", name: "Milan Malpensa", city: "Milan", country: "Italy", lat: 45.6301, lng: 8.7231, size: "major", aliases: ["milano"], cityCode: "MIL" },
  { code: "LIN", name: "Milan Linate", city: "Milan", country: "Italy", lat: 45.4451, lng: 9.2767, size: "regional", aliases: ["milano"], cityCode: "MIL" },
  { code: "VCE", name: "Venice Marco Polo", city: "Venice", country: "Italy", lat: 45.5053, lng: 12.3519, size: "regional", aliases: ["venezia"] },
  { code: "BLQ", name: "Bologna Guglielmo Marconi", city: "Bologna", country: "Italy", lat: 44.5354, lng: 11.2887, size: "regional", aliases: [] },
  { code: "NAP", name: "Naples International", city: "Naples", country: "Italy", lat: 40.886, lng: 14.2908, size: "regional", aliases: ["napoli"] },
  // --- Iberia ---
  { code: "MAD", name: "Madrid Barajas", city: "Madrid", country: "Spain", lat: 40.4719, lng: -3.5626, size: "major", aliases: [] },
  { code: "BCN", name: "Barcelona El Prat", city: "Barcelona", country: "Spain", lat: 41.2974, lng: 2.0833, size: "major", aliases: [] },
  { code: "AGP", name: "Málaga-Costa del Sol", city: "Málaga", country: "Spain", lat: 36.6749, lng: -4.4991, size: "regional", aliases: ["malaga"] },
  { code: "LIS", name: "Lisbon Humberto Delgado", city: "Lisbon", country: "Portugal", lat: 38.7742, lng: -9.1342, size: "major", aliases: ["lisboa"] },
  // --- Greece ---
  { code: "ATH", name: "Athens International", city: "Athens", country: "Greece", lat: 37.9364, lng: 23.9445, size: "major", aliases: ["athina"] },
  { code: "SKG", name: "Thessaloniki Macedonia", city: "Thessaloniki", country: "Greece", lat: 40.5197, lng: 22.9709, size: "regional", aliases: [] },
  // --- Israel ---
  { code: "TLV", name: "Ben Gurion International", city: "Tel Aviv", country: "Israel", lat: 32.0114, lng: 34.8867, size: "major", aliases: ["tel aviv", "jerusalem", "yerushalayim", "israel"] },
  { code: "HFA", name: "Haifa Airport", city: "Haifa", country: "Israel", lat: 32.8094, lng: 35.0431, size: "regional", aliases: ["chaifa"] },
  { code: "ETM", name: "Ramon Airport", city: "Eilat", country: "Israel", lat: 29.7233, lng: 35.0114, size: "regional", aliases: ["eilat", "ramon"] },
  // --- Turkey ---
  { code: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Turkey", lat: 41.2753, lng: 28.7519, size: "major", aliases: ["istanbul"] },
  { code: "SAW", name: "Istanbul Sabiha Gökçen", city: "Istanbul", country: "Turkey", lat: 40.8986, lng: 29.3092, size: "regional", aliases: ["istanbul"] },
  // --- Gulf hubs ---
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "UAE", lat: 25.2532, lng: 55.3657, size: "major", aliases: [] },
  { code: "AUH", name: "Abu Dhabi International", city: "Abu Dhabi", country: "UAE", lat: 24.433, lng: 54.6511, size: "major", aliases: [] },
  { code: "DOH", name: "Hamad International", city: "Doha", country: "Qatar", lat: 25.2731, lng: 51.6081, size: "major", aliases: [] },
];
