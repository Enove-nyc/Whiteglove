// Airports for the flight search, with city aliases so a city search returns
// every airport in it (e.g. "NYC" -> JFK, EWR, LGA). Focused on the routes
// White Glove travelers actually use, plus major world hubs.

export type Airport = { code: string; name: string; city: string; country: string; aliases: string[] };

export const AIRPORTS: Airport[] = [
  // New York area
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "USA", aliases: ["nyc", "new york city", "manhattan", "brooklyn", "queens"] },
  { code: "EWR", name: "Newark Liberty International", city: "Newark / New York", country: "USA", aliases: ["nyc", "new york", "new york city", "new jersey", "lakewood"] },
  { code: "LGA", name: "LaGuardia", city: "New York", country: "USA", aliases: ["nyc", "new york city", "queens"] },
  // Other US
  { code: "BOS", name: "Logan International", city: "Boston", country: "USA", aliases: [] },
  { code: "MIA", name: "Miami International", city: "Miami", country: "USA", aliases: ["miami beach"] },
  { code: "FLL", name: "Fort Lauderdale-Hollywood International", city: "Fort Lauderdale", country: "USA", aliases: ["hollywood", "miami"] },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "USA", aliases: [] },
  { code: "MDW", name: "Midway International", city: "Chicago", country: "USA", aliases: [] },
  { code: "IAD", name: "Washington Dulles International", city: "Washington", country: "USA", aliases: ["dc", "washington dc"] },
  { code: "BWI", name: "Baltimore/Washington International", city: "Baltimore", country: "USA", aliases: ["washington", "dc"] },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "USA", aliases: ["la"] },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "USA", aliases: ["bay area"] },
  { code: "SEA", name: "Seattle-Tacoma International", city: "Seattle", country: "USA", aliases: [] },
  { code: "ATL", name: "Hartsfield-Jackson International", city: "Atlanta", country: "USA", aliases: [] },
  { code: "DTW", name: "Detroit Metropolitan", city: "Detroit", country: "USA", aliases: [] },
  { code: "CLE", name: "Cleveland Hopkins International", city: "Cleveland", country: "USA", aliases: [] },
  // Canada
  { code: "YYZ", name: "Toronto Pearson International", city: "Toronto", country: "Canada", aliases: [] },
  { code: "YUL", name: "Montreal-Trudeau International", city: "Montreal", country: "Canada", aliases: [] },
  // Poland
  { code: "KRK", name: "John Paul II International", city: "Krakow", country: "Poland", aliases: ["krokow", "cracow"] },
  { code: "WAW", name: "Warsaw Chopin", city: "Warsaw", country: "Poland", aliases: ["warszawa"] },
  { code: "RZE", name: "Rzeszow-Jasionka", city: "Rzeszow", country: "Poland", aliases: ["lizhensk", "lizensk", "lezajsk", "lancut", "ropshitz", "dynow", "rymanow"] },
  // Hungary / Slovakia / Ukraine region
  { code: "BUD", name: "Budapest Ferenc Liszt International", city: "Budapest", country: "Hungary", aliases: ["kerestir", "keresztur", "liska", "ujhely", "ijhel"] },
  { code: "KSC", name: "Kosice International", city: "Kosice", country: "Slovakia", aliases: ["munkatch", "uzhhorod"] },
  { code: "KBP", name: "Boryspil International", city: "Kyiv", country: "Ukraine", aliases: ["kiev", "uman", "medzhybizh"] },
  { code: "IEV", name: "Zhuliany International", city: "Kyiv", country: "Ukraine", aliases: ["kiev"] },
  // Central / Western Europe
  { code: "PRG", name: "Vaclav Havel Airport", city: "Prague", country: "Czechia", aliases: ["praha"] },
  { code: "VIE", name: "Vienna International", city: "Vienna", country: "Austria", aliases: ["wien", "preshburg", "bratislava"] },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", aliases: [] },
  { code: "MUC", name: "Munich Airport", city: "Munich", country: "Germany", aliases: ["munchen"] },
  { code: "BER", name: "Berlin Brandenburg", city: "Berlin", country: "Germany", aliases: [] },
  { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", aliases: [] },
  { code: "BRU", name: "Brussels Airport", city: "Brussels", country: "Belgium", aliases: ["antwerp"] },
  { code: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland", aliases: [] },
  // UK
  { code: "LHR", name: "Heathrow", city: "London", country: "UK", aliases: ["england", "britain"] },
  { code: "LGW", name: "Gatwick", city: "London", country: "UK", aliases: [] },
  { code: "STN", name: "Stansted", city: "London", country: "UK", aliases: [] },
  { code: "LTN", name: "Luton", city: "London", country: "UK", aliases: [] },
  { code: "MAN", name: "Manchester Airport", city: "Manchester", country: "UK", aliases: [] },
  // France / Italy / Spain / Greece
  { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France", aliases: [] },
  { code: "ORY", name: "Orly", city: "Paris", country: "France", aliases: [] },
  { code: "FCO", name: "Fiumicino", city: "Rome", country: "Italy", aliases: ["roma"] },
  { code: "MXP", name: "Malpensa", city: "Milan", country: "Italy", aliases: ["milano"] },
  { code: "BCN", name: "Barcelona-El Prat", city: "Barcelona", country: "Spain", aliases: [] },
  { code: "MAD", name: "Adolfo Suarez Madrid-Barajas", city: "Madrid", country: "Spain", aliases: [] },
  { code: "ATH", name: "Athens International", city: "Athens", country: "Greece", aliases: [] },
  // Israel / Middle East / hubs
  { code: "TLV", name: "Ben Gurion Airport", city: "Tel Aviv", country: "Israel", aliases: ["jerusalem", "israel", "bnei brak"] },
  { code: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Turkey", aliases: [] },
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "UAE", aliases: [] },
  { code: "DOH", name: "Hamad International", city: "Doha", country: "Qatar", aliases: [] },
];
