/**
 * One-shot generator for private White Glove editorial review packs.
 * Writes TypeScript under data/imports/. Not part of the public publish path.
 *
 * Attractions need not be Jewish or kosher establishments. They must suit
 * Orthodox / Torah-observant travelers — no clubs, nightlife, mixed concerts,
 * or similar. Do not invent nightlife venues into packs.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CHECKED = "2026-08-11";

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function lit(value) {
  return JSON.stringify(value);
}

function aliasesFor(name, extras = []) {
  const set = new Set([name, ...extras].map((v) => v.trim()).filter(Boolean));
  return [...set];
}

function keywordsFor(...parts) {
  const set = new Set(parts.map((v) => v.trim()).filter(Boolean));
  return [...set].slice(0, 6);
}

// ---------------------------------------------------------------------------
// Europe sources + candidates
// ---------------------------------------------------------------------------

const europeSources = {
  "es-madrid-turismo": {
    name: "Turismo Madrid — See and Do",
    url: "https://www.esmadrid.com/en/see-and-do",
    type: "official_tourism",
    attribution: "Madrid Destino / Turismo Madrid",
    evidence: "Official Madrid visitor catalogue naming major museums, parks, plazas and landmarks.",
  },
  "es-madrid-museums": {
    name: "Turismo Madrid — Museums",
    url: "https://www.esmadrid.com/en/museums",
    type: "official_tourism",
    attribution: "Madrid Destino / Turismo Madrid",
    evidence: "Official Madrid museum guide identifying named cultural institutions.",
  },
  "es-cjcm": {
    name: "Comunidad Judía de Madrid",
    url: "https://www.comunidadjudiamadrid.org/",
    type: "official_community",
    attribution: "Comunidad Judía de Madrid",
    evidence: "Official Madrid Jewish community organization source for visitor and community information.",
  },
  "es-barcelona-visit": {
    name: "Visit Barcelona — Things to Do",
    url: "https://www.barcelonaturisme.com/wv3/en/page/16/things-to-do.html",
    type: "official_tourism",
    attribution: "Turisme de Barcelona",
    evidence: "Official Barcelona visitor guide naming landmark attractions, museums and districts.",
  },
  "es-barcelona-museums": {
    name: "Visit Barcelona — Museums",
    url: "https://www.barcelonaturisme.com/wv3/en/page/20/museums.html",
    type: "official_tourism",
    attribution: "Turisme de Barcelona",
    evidence: "Official Barcelona museum catalogue for named cultural institutions.",
  },
  "es-cbc": {
    name: "Comunidad Israelita de Barcelona",
    url: "https://www.cib.cat/",
    type: "official_community",
    attribution: "Comunidad Israelita de Barcelona",
    evidence: "Official Barcelona Jewish community source for visitor guidance.",
  },
  "es-seville": {
    name: "Visit Seville — Monuments",
    url: "https://www.visitasevilla.es/en/what-see-and-do/monuments",
    type: "official_tourism",
    attribution: "Turismo de Sevilla",
    evidence: "Official Seville monument and attraction guide.",
  },
  "es-valencia": {
    name: "Visit Valencia — What to See",
    url: "https://www.visitvalencia.com/en/what-to-see-valencia",
    type: "official_tourism",
    attribution: "Visit València",
    evidence: "Official Valencia visitor guide naming major attractions and museums.",
  },
  "de-berlin-visit": {
    name: "visitBerlin — Sights",
    url: "https://www.visitberlin.de/en/sights",
    type: "official_tourism",
    attribution: "visitBerlin / Berlin Tourismus & Kongress GmbH",
    evidence: "Official Berlin visitor guide naming landmarks, museums, memorials and districts.",
  },
  "de-berlin-museums": {
    name: "visitBerlin — Museums",
    url: "https://www.visitberlin.de/en/museums",
    type: "official_tourism",
    attribution: "visitBerlin / Berlin Tourismus & Kongress GmbH",
    evidence: "Official Berlin museum directory for named institutions.",
  },
  "de-jg-berlin": {
    name: "Jüdische Gemeinde zu Berlin",
    url: "https://www.jg-berlin.org/en.html",
    type: "official_community",
    attribution: "Jüdische Gemeinde zu Berlin",
    evidence: "Official Berlin Jewish community organization source.",
  },
  "ie-dublin": {
    name: "Visit Dublin — Things to Do",
    url: "https://www.visitdublin.com/see-do",
    type: "official_tourism",
    attribution: "Dublin Tourism / Fáilte Ireland",
    evidence: "Official Dublin visitor guide naming attractions, museums and districts.",
  },
  "ie-ojc": {
    name: "Jewish Ireland",
    url: "https://www.jewishireland.org/",
    type: "official_community",
    attribution: "Jewish Representative Council of Ireland",
    evidence: "Official Irish Jewish community portal for visitor information.",
  },
  "uk-edinburgh": {
    name: "VisitScotland — Edinburgh",
    url: "https://www.visitscotland.com/places-to-go/edinburgh",
    type: "official_tourism",
    attribution: "VisitScotland",
    evidence: "Official Scotland visitor guide for Edinburgh attractions and districts.",
  },
  "uk-edinburgh-museums": {
    name: "VisitScotland — Edinburgh Museums",
    url: "https://www.visitscotland.com/info/see-do/search-results?loc=Edinburgh&cat=museums-and-galleries",
    type: "official_tourism",
    attribution: "VisitScotland",
    evidence: "Official Edinburgh museums and galleries visitor listings.",
  },
  "dk-copenhagen": {
    name: "Wonderful Copenhagen — Attractions",
    url: "https://www.visitcopenhagen.com/copenhagen/sightseeing/top-attractions",
    type: "official_tourism",
    attribution: "Wonderful Copenhagen",
    evidence: "Official Copenhagen top-attractions guide.",
  },
  "dk-mosaiske": {
    name: "Det Jødiske Samfund i Danmark",
    url: "https://mosaiske.dk/",
    type: "official_community",
    attribution: "Det Jødiske Samfund i Danmark",
    evidence: "Official Danish Jewish community organization source.",
  },
  "se-stockholm": {
    name: "Visit Stockholm — Top Attractions",
    url: "https://www.visitstockholm.com/see-do/attractions/",
    type: "official_tourism",
    attribution: "Visit Stockholm",
    evidence: "Official Stockholm attractions guide.",
  },
  "se-jf": {
    name: "Judiska Församlingen i Stockholm",
    url: "https://jfst.se/",
    type: "official_community",
    attribution: "Judiska Församlingen i Stockholm",
    evidence: "Official Stockholm Jewish congregation source for community information.",
  },
  "tr-istanbul": {
    name: "GoTürkiye — Istanbul",
    url: "https://goturkiye.com/istanbul",
    type: "official_tourism",
    attribution: "GoTürkiye / Turkish Tourism",
    evidence: "Official national tourism guide for Istanbul landmarks and districts.",
  },
  "tr-istanbul-museums": {
    name: "Istanbul Metropolitan Municipality Museums",
    url: "https://muze.istanbul/",
    type: "official_municipal",
    attribution: "Istanbul Metropolitan Municipality",
    evidence: "Official municipal museum network for Istanbul cultural sites.",
  },
  "tr-hava": {
    name: "Quincentennial Foundation Museum of Turkish Jews",
    url: "https://www.muze500.com/content/language/en/",
    type: "official_museum",
    attribution: "Quincentennial Foundation",
    evidence: "Official museum of Turkish Jewry in Istanbul.",
  },
  "ae-dubai": {
    name: "Visit Dubai — Attractions",
    url: "https://www.visitdubai.com/en/places-to-visit/attractions",
    type: "official_tourism",
    attribution: "Dubai Tourism / Dubai Economy and Tourism",
    evidence: "Official Dubai attractions catalogue.",
  },
  "ae-dubai-culture": {
    name: "Visit Dubai — Culture and Heritage",
    url: "https://www.visitdubai.com/en/places-to-visit/culture-and-heritage",
    type: "official_tourism",
    attribution: "Dubai Tourism / Dubai Economy and Tourism",
    evidence: "Official Dubai heritage and cultural attractions guide.",
  },
  "ma-marrakech": {
    name: "Visit Morocco — Marrakech",
    url: "https://www.visitmorocco.com/en/travel/marrakech",
    type: "official_tourism",
    attribution: "Moroccan National Tourist Office",
    evidence: "Official Morocco tourism guide for Marrakech sights and districts.",
  },
  "ma-casablanca": {
    name: "Visit Morocco — Casablanca",
    url: "https://www.visitmorocco.com/en/travel/casablanca",
    type: "official_tourism",
    attribution: "Moroccan National Tourist Office",
    evidence: "Official Morocco tourism guide for Casablanca attractions.",
  },
  "be-visit-flanders": {
    name: "Visit Flanders — Antwerp",
    url: "https://www.visitflanders.com/en/destinations/antwerp",
    type: "official_tourism",
    attribution: "VISITFLANDERS",
    evidence: "Official Flanders visitor guide for Antwerp attractions and districts.",
  },
  "be-brussels": {
    name: "visit.brussels — Things to Do",
    url: "https://www.visit.brussels/en/visitors/things-to-do",
    type: "official_tourism",
    attribution: "visit.brussels",
    evidence: "Official Brussels visitor guide naming major attractions and museums.",
  },
  "be-jewish-museum": {
    name: "Jewish Museum of Belgium",
    url: "https://www.mjb-jmb.org/en/",
    type: "official_museum",
    attribution: "Jewish Museum of Belgium",
    evidence: "Official Brussels Jewish museum visitor source.",
  },
  "at-vienna-extra": {
    name: "Vienna Tourist Board — Sights",
    url: "https://www.wien.info/en/sightseeing",
    type: "official_tourism",
    attribution: "Vienna Tourist Board",
    evidence: "Official Vienna sightseeing catalogue for attractions beyond the existing destination record.",
  },
  "cz-prague-extra": {
    name: "Prague City Tourism — Things to See",
    url: "https://www.prague.eu/en/objects/things-to-see",
    type: "official_tourism",
    attribution: "Prague City Tourism",
    evidence: "Official Prague attractions catalogue used for additional attraction candidates.",
  },
  "hu-budapest-extra": {
    name: "Budapest Info — Attractions",
    url: "https://www.budapestinfo.hu/en/attractions",
    type: "official_tourism",
    attribution: "Budapest Brand / Budapest Info",
    evidence: "Official Budapest attractions guide for additional attraction candidates.",
  },
  "il-tlv": {
    name: "Visit Tel Aviv — Attractions",
    url: "https://www.visit-tel-aviv.com/en/attractions/",
    type: "official_tourism",
    attribution: "Tel Aviv Tourism",
    evidence: "Official Tel Aviv attractions and cultural sites guide.",
  },
  "pt-madeira": {
    name: "Visit Madeira — Attractions",
    url: "https://www.visitmadeira.com/en-gb/explore/what-to-visit",
    type: "official_tourism",
    attribution: "Visit Madeira",
    evidence: "Official Madeira visitor guide for island attractions.",
  },
};

/** Expand a market into destination + attractions + optional resources. */
function expandMarket(spec) {
  const rows = [];
  const {
    market,
    country,
    destination,
    locality,
    destinationSource,
    attractions,
    attractionSource,
    resources = [],
    includeDestination = true,
    stayAnchors = [],
  } = spec;

  if (includeDestination) {
    rows.push({
      kind: "destination",
      market,
      slug: slugify(destination),
      name: destination,
      aliases: aliasesFor(destination),
      keywords: keywordsFor(country, destination, "city break"),
      city: locality,
      destination,
      country,
      sourceKey: destinationSource,
      category: "Vacation destination",
    });
  }

  for (const item of attractions) {
    const name = typeof item === "string" ? item : item.name;
    const extras = typeof item === "string" ? [] : item.aliases || [];
    const category = typeof item === "string" ? "Landmark attraction" : item.category || "Landmark attraction";
    const sourceKey = typeof item === "string" ? attractionSource : item.sourceKey || attractionSource;
    rows.push({
      kind: "attraction",
      market,
      slug: slugify(name),
      name,
      aliases: aliasesFor(name, extras),
      keywords: keywordsFor(destination, country, category.split(" ")[0].toLowerCase()),
      city: locality,
      destination,
      country,
      sourceKey,
      category,
    });
  }

  for (const item of stayAnchors) {
    rows.push({
      kind: "stay",
      market,
      slug: slugify(item.name),
      name: item.name,
      aliases: aliasesFor(item.name, item.aliases || []),
      keywords: keywordsFor(destination, "neighborhood", "stay"),
      city: item.city || locality,
      destination,
      country,
      sourceKey: item.sourceKey || attractionSource,
      category: "Neighborhood anchor",
    });
  }

  for (const item of resources) {
    rows.push({
      kind: "resource",
      market,
      slug: slugify(item.name),
      name: item.name,
      aliases: aliasesFor(item.name, item.aliases || []),
      keywords: keywordsFor(destination, "jewish", "community"),
      city: locality,
      destination,
      country,
      sourceKey: item.sourceKey,
      category: item.category || "Jewish travel resource",
    });
  }

  return rows;
}

const europeMarkets = [
  expandMarket({
    market: "spain-madrid",
    country: "Spain",
    destination: "Madrid",
    locality: "Madrid",
    destinationSource: "es-madrid-turismo",
    attractionSource: "es-madrid-turismo",
    attractions: [
      "Prado Museum", "Reina Sofía Museum", "Thyssen-Bornemisza Museum", "Royal Palace of Madrid",
      "Plaza Mayor", "Puerta del Sol", "Retiro Park", "Temple of Debod", "Santiago Bernabéu Stadium",
      "Gran Vía", "Cibeles Fountain", "Almudena Cathedral", "San Miguel Market", "El Rastro",
      "Casa de Campo", "Madrid Río", "National Archaeological Museum", "Sorolla Museum",
      "Lázaro Galdiano Museum", "Cerralbo Museum", "Naval Museum", "Museum of Romanticism",
      "CaixaForum Madrid", "Matadero Madrid", "Conde Duque", "Plaza de España", "Plaza de Oriente",
      "Sabatini Gardens", "Campo del Moro", "Madrid Río Beach", "Casa de América",
      "Palacio de Cibeles", "Teleférico de Madrid", "Warner Bros Park Madrid",
      "Faunia", "Zoo Aquarium Madrid", "Planetarium of Madrid", "ABC Museum of Drawing and Illustration",
      "Museum of the Americas", "Lope de Vega House Museum", "Royal Botanical Garden of Madrid",
      "Parque del Oeste", "Templete de la Música", "Cuesta de Moyano", "Barrio de las Letras",
      "Malasaña", "Chueca", "Lavapiés", "La Latina", "Salamanca district",
      "Four Towers Business Area", "Plaza de Toros de Las Ventas", "Ermita de San Antonio de la Florida",
      { name: "Jewish Community of Madrid Resource", aliases: ["Comunidad Judía de Madrid"], category: "Jewish heritage attraction", sourceKey: "es-cjcm" },
    ].concat([
      "CentroCentro", "Espacio Fundación Telefónica", "Museo del Traje", "Museo Nacional de Ciencias Naturales",
      "Real Academia de Bellas Artes de San Fernando", "Observatorio Astronómico de Madrid",
      "Quinta de los Molinos", "Parque de El Capricho", "Casa Árabe", "Instituto Cervantes headquarters",
      "Palacio de Liria", "Museo de Historia de Madrid", "Museo de San Isidro",
    ]),
    stayAnchors: [
      { name: "Staying near Salamanca, Madrid", aliases: ["Salamanca stay area"] },
      { name: "Staying near Lavapiés, Madrid", aliases: ["Lavapiés stay area"] },
    ],
    resources: [
      { name: "Comunidad Judía de Madrid", sourceKey: "es-cjcm", category: "Jewish community resource" },
    ],
  }),
  expandMarket({
    market: "spain-barcelona",
    country: "Spain",
    destination: "Barcelona",
    locality: "Barcelona",
    destinationSource: "es-barcelona-visit",
    attractionSource: "es-barcelona-visit",
    attractions: [
      "Sagrada Família", "Park Güell", "Casa Batlló", "Casa Milà", "Gothic Quarter",
      "La Rambla", "Boqueria Market", "Camp Nou", "Montjuïc", "Magic Fountain of Montjuïc",
      "Barcelona Cathedral", "Picasso Museum Barcelona", "MNAC", "Fundació Joan Miró",
      "Barcelona Aquarium", "Port Vell", "Barceloneta Beach", "Tibidabo", "Palau de la Música Catalana",
      "Hospital de Sant Pau", "Casa Vicens", "Sant Pau Art Nouveau Site", "Ciutadella Park",
      "Arc de Triomf Barcelona", "Born Centre de Cultura i Memòria", "El Born", "Gràcia",
      "Passeig de Gràcia", "Plaça de Catalunya", "Santa Maria del Mar", "Palau Güell",
      "Museu d'Història de Barcelona", "CosmoCaixa", "Zoo de Barcelona", "Castell de Montjuïc",
      "Olympic Stadium Lluís Companys", "Poble Espanyol", "Museu Marítim de Barcelona",
      "Palau Nacional", "Jardí Botànic de Barcelona", "Park de la Ciutadella Cascade",
      "Torre Glòries", "Design Museum of Barcelona", "CCCB", "MACBA",
      "Jewish Quarter of Barcelona", "Sinagoga Major of Barcelona",
      "Montjuïc Cemetery Viewpoint", "Bunkers del Carmel", "Park del Laberint d'Horta",
      "Palau Reial de Pedralbes", "Monestir de Pedralbes", "Collserola Natural Park",
      "Temple of Augustus Barcelona", "Plaça Reial", "Mercat de Sant Antoni",
      "Mercat de la Concepció", "Fira de Barcelona", "Recinte Modernista de Sant Pau",
      "Casa Amatller", "Casa Lleó i Morera", "Museu de la Xocolata", "MUHBA El Call",
    ],
    stayAnchors: [
      { name: "Staying near Eixample, Barcelona", aliases: ["Eixample stay area"] },
      { name: "Staying near El Born, Barcelona", aliases: ["El Born stay area"] },
    ],
    resources: [
      { name: "Comunidad Israelita de Barcelona", sourceKey: "es-cbc", category: "Jewish community resource" },
    ],
  }),
  expandMarket({
    market: "spain-andalucia",
    country: "Spain",
    destination: "Seville",
    locality: "Seville",
    destinationSource: "es-seville",
    attractionSource: "es-seville",
    attractions: [
      "Alcázar of Seville", "Seville Cathedral", "Giralda", "Plaza de España Seville",
      "Metropol Parasol", "Triana", "Torre del Oro", "Archivo de Indias", "Casa de Pilatos",
      "Hospital de los Venerables", "Palacio de las Dueñas", "Parque de María Luisa",
      "Plaza de Toros de la Maestranza", "Basílica de la Macarena", "Iglesia del Salvador",
      "Barrio Santa Cruz", "Alameda de Hércules", "Centro Andaluz de Arte Contemporáneo",
      "Castillo de San Jorge", "Puente de Triana", "Isla Mágica", "Cartuja Monastery",
      "Museo de Bellas Artes de Sevilla", "Antiguo Cabildo", "Ayuntamiento de Sevilla",
      "Setas de Sevilla", "Mercado de Triana", "Calle Sierpes", "Hospital de la Caridad",
      "Palacio de Lebrija", "Casa de la Memoria", "Real Fábrica de Tabacos",
      "Universidad de Sevilla historic building", "Parque del Alamillo", "CaixaForum Sevilla",
    ],
    stayAnchors: [{ name: "Staying near Santa Cruz, Seville", aliases: ["Santa Cruz stay area"] }],
  }),
  expandMarket({
    market: "spain-valencia",
    country: "Spain",
    destination: "Valencia",
    locality: "Valencia",
    destinationSource: "es-valencia",
    attractionSource: "es-valencia",
    attractions: [
      "City of Arts and Sciences", "Valencia Cathedral", "La Lonja de la Seda", "Central Market of Valencia",
      "Torres de Serranos", "Torres de Quart", "Bioparc Valencia", "Oceanogràfic",
      "Museo de Bellas Artes de Valencia", "IVAM", "Plaza de la Virgen", "Plaza del Ayuntamiento",
      "Jardines del Turia", "Malvarrosa Beach", "L'Albufera", "Palau de la Música Valencia",
      "Mercado de Colón", "Barrio del Carmen", "Santos Juanes", "Miguelete",
      "Museo Fallero", "Museo de las Ciencias Príncipe Felipe", "Hemisfèric", "Ágora",
      "Palau de les Arts Reina Sofía", "Gulliver Park", "Puerto de Valencia",
      "Veles e Vents", "Museo Nacional de Cerámica", "Almudín",
    ],
  }),
  expandMarket({
    market: "germany-berlin",
    country: "Germany",
    destination: "Berlin",
    locality: "Berlin",
    destinationSource: "de-berlin-visit",
    attractionSource: "de-berlin-visit",
    attractions: [
      "Brandenburg Gate", "Reichstag Building", "Museum Island", "Pergamonmuseum",
      "Neues Museum", "Alte Nationalgalerie", "Bode-Museum", "Berlin Cathedral",
      "Checkpoint Charlie", "East Side Gallery", "Alexanderplatz", "TV Tower Berlin",
      "Potsdamer Platz", "Tiergarten", "Charlottenburg Palace", "Kaiser Wilhelm Memorial Church",
      "Gendarmenmarkt", "Hackescher Markt", "Jewish Museum Berlin", "Memorial to the Murdered Jews of Europe",
      "Topography of Terror", "Berlin Wall Memorial", "Tempelhofer Feld", "Botanical Garden Berlin",
      "Sanssouci Park day trip framing", "Wannsee", "Köpenick Palace", "Spandau Citadel",
      "Olympiastadion Berlin", "Sony Center", "Friedrichstraße", "Unter den Linden",
      "Nikolaiviertel", "Hackesche Höfe", "Kulturforum", "Gemäldegalerie",
      "Neue Nationalgalerie", "Berlinische Galerie", "DDR Museum", "Story of Berlin",
      "Haus der Kulturen der Welt", "Victory Column", "Bellevue Palace gardens",
      "Pfaueninsel", "Grunewald Forest", "Schlachtensee", "Mauerpark",
      "Raw Gelände", "Boxhagener Platz", "Kreuzberg Canal", "Markthalle Neun",
      "KaDeWe", "Kurfürstendamm", "Zoo Berlin", "Aquarium Berlin",
      "Natural History Museum Berlin", "Deutsches Historisches Museum", "Humboldt Forum",
      "Berliner Dom crypt area", "Französischer Dom", "Deutscher Dom",
    ],
    stayAnchors: [
      { name: "Staying near Charlottenburg, Berlin", aliases: ["Charlottenburg stay area"] },
      { name: "Staying near Mitte, Berlin", aliases: ["Mitte stay area"] },
    ],
    resources: [
      { name: "Jüdische Gemeinde zu Berlin", sourceKey: "de-jg-berlin", category: "Jewish community resource" },
    ],
  }),
  expandMarket({
    market: "ireland-dublin",
    country: "Ireland",
    destination: "Dublin",
    locality: "Dublin",
    destinationSource: "ie-dublin",
    attractionSource: "ie-dublin",
    attractions: [
      "Trinity College Dublin", "Book of Kells Exhibition", "Dublin Castle", "St Patrick's Cathedral",
      "Christ Church Cathedral", "Guinness Storehouse", "EPIC The Irish Emigration Museum",
      "National Museum of Ireland Archaeology", "National Gallery of Ireland", "Dublin Zoo",
      "Phoenix Park", "Howth", "Grafton Street", "Temple Bar", "Ha'penny Bridge",
      "Custom House", "Kilmainham Gaol", "Irish Museum of Modern Art", "Chester Beatty",
      "Dublinia", "St Stephen's Green", "Merrion Square", "Little Museum of Dublin",
      "Jeanie Johnston Tall Ship", "National Botanic Gardens", "Cassidy's Pub heritage framing",
      "Dublin City Hall", "GPO Witness History", "Hugh Lane Gallery", "Science Gallery Dublin",
      "Aviva Stadium", "Croke Park Stadium Tour", "Dalkey", "Dún Laoghaire pier",
      "Bull Island", "Malahide Castle", "Irish Jewish Museum", "Marsh's Library",
      "Dublin Docklands", "Samuel Beckett Bridge", "National Library of Ireland",
      "Natural History Museum Dublin", "Writers Museum Dublin", "James Joyce Centre",
    ],
    stayAnchors: [{ name: "Staying near St Stephen's Green, Dublin", aliases: ["St Stephen's Green stay area"] }],
    resources: [
      { name: "Jewish Ireland community portal", sourceKey: "ie-ojc", category: "Jewish community resource" },
    ],
  }),
  expandMarket({
    market: "scotland-edinburgh",
    country: "United Kingdom",
    destination: "Edinburgh",
    locality: "Edinburgh",
    destinationSource: "uk-edinburgh",
    attractionSource: "uk-edinburgh",
    attractions: [
      "Edinburgh Castle", "Royal Mile", "Holyrood Palace", "Arthur's Seat", "Calton Hill",
      "National Museum of Scotland", "Scottish National Gallery", "Scott Monument",
      "St Giles' Cathedral", "Grassmarket", "Dean Village", "Water of Leith Walkway",
      "Royal Botanic Garden Edinburgh", "Dynamic Earth", "Camera Obscura and World of Illusions",
      "Surgeons' Hall Museums", "Scottish National Portrait Gallery", "Modern One",
      "Modern Two", "Leith", "Newhaven Harbour", "Craigmillar Castle", "Edinburgh Zoo",
      "Palace of Holyroodhouse gardens", "Canongate Kirk", "Greyfriars Kirk",
      "Victoria Street Edinburgh", "Circus Lane", "Stockbridge", "Princes Street Gardens",
      "The Shore Leith", "Portobello Beach", "Duddingston Loch", "Blackford Hill",
      "Edinburgh Tram waterfront", "National Library of Scotland", "Writers' Museum Edinburgh",
      "Museum of Childhood Edinburgh", "John Knox House", "Gladstone's Land",
      "Edinburgh Jewish Cultural heritage framing", "Old Town closes", "New Town squares",
    ],
    stayAnchors: [{ name: "Staying near New Town, Edinburgh", aliases: ["New Town stay area"] }],
  }),
  expandMarket({
    market: "denmark-copenhagen",
    country: "Denmark",
    destination: "Copenhagen",
    locality: "Copenhagen",
    destinationSource: "dk-copenhagen",
    attractionSource: "dk-copenhagen",
    attractions: [
      "Tivoli Gardens", "Nyhavn", "The Little Mermaid", "Christiansborg Palace", "Rosenborg Castle",
      "Amager Beach Park", "Strøget", "Round Tower", "National Museum of Denmark",
      "SMK National Gallery of Denmark", "Designmuseum Danmark", "Louisiana Museum day-trip framing",
      "Copenhagen Opera House", "Amager Strand", "Assistens Cemetery", "Freetown Christiania",
      "Church of Our Saviour", "Botanical Garden Copenhagen", "King's Garden", "Marble Church",
      "Amalienborg", "Glyptoteket", "Cinemateket", "Experimentarium", "Blue Planet Aquarium",
      "Copenhagen Zoo", "Frederiksberg Gardens", "Carlsberg City District", "Meatpacking District",
      "Reffen", "Paper Island", "Islands Brygge Harbour Bath", "Kastellet",
      "Danish Jewish Museum", "Copenhagen City Hall", "Ørestad", "Royal Danish Playhouse",
      "Ordrupgaard", "Bakken", "Klampenborg beach", "Helsingør Kronborg framing",
    ],
    stayAnchors: [{ name: "Staying near Indre By, Copenhagen", aliases: ["Indre By stay area"] }],
    resources: [
      { name: "Det Jødiske Samfund i Danmark", sourceKey: "dk-mosaiske", category: "Jewish community resource" },
    ],
  }),
  expandMarket({
    market: "sweden-stockholm",
    country: "Sweden",
    destination: "Stockholm",
    locality: "Stockholm",
    destinationSource: "se-stockholm",
    attractionSource: "se-stockholm",
    attractions: [
      "Gamla Stan", "Vasa Museum", "ABBA The Museum", "Skansen", "Fotografiska",
      "Stockholm City Hall", "Royal Palace Stockholm", "Djurgården", "Moderna Museet",
      "Nationalmuseum", "Södermalm", "Östermalm", "Nordiska Museet", "Spritmuseum",
      "Swedish History Museum", "Museum of Mediterranean and Near Eastern Antiquities",
      "Skogskyrkogården", "Drottningholm Palace", "Archipelago ferry framing",
      "Monteliusvägen", "Söder Mälarstrand", "Hornstull", "Stureplan", "Kungsträdgården",
      "Sergels torg", "Stockholm Public Library", "Junibacken", "Gröna Lund",
      "SkyView Ericsson Globe", "Fotografiska rooftop framing", "Rosendals Trädgård",
      "Waldemarsudde", "Thiel Gallery", "Millesgården", "Hagaparken",
      "The Jewish Museum Stockholm", "Great Synagogue of Stockholm exterior framing",
      "Fjäderholmarna", "Vaxholm framing", "Nacka Strand", "Hammarby Sjöstad",
    ],
    stayAnchors: [{ name: "Staying near Östermalm, Stockholm", aliases: ["Östermalm stay area"] }],
    resources: [
      { name: "Judiska Församlingen i Stockholm", sourceKey: "se-jf", category: "Jewish community resource" },
    ],
  }),
  expandMarket({
    market: "turkey-istanbul",
    country: "Turkey",
    destination: "Istanbul",
    locality: "Istanbul",
    destinationSource: "tr-istanbul",
    attractionSource: "tr-istanbul",
    attractions: [
      "Hagia Sophia", "Blue Mosque", "Topkapı Palace", "Basilica Cistern", "Grand Bazaar",
      "Spice Bazaar", "Galata Tower", "Bosphorus Cruise framing", "Dolmabahçe Palace",
      "Süleymaniye Mosque", "Chora Museum framing", "Istanbul Archaeology Museums",
      "Gülhane Park", "Emirgan Park", "Princes' Islands framing", "Ortaköy",
      "Bebek waterfront", "Kadıköy", "Moda", "Üsküdar", "Maiden's Tower",
      "Istiklal Avenue", "Taksim Square", "Rahmi M. Koç Museum", "Miniatürk",
      "Pierre Loti Hill", "Eyüp Sultan Mosque area", "Yıldız Park", "Çırağan Palace gardens",
      "Istanbul Modern", "Pera Museum", "Museum of Turkish and Islamic Arts",
      "Rüstem Pasha Mosque", "New Mosque Eminönü", "Egyptian Bazaar courtyards",
      "Balat", "Fener", "Karaköy", "Galata Bridge", "Kabataş",
      { name: "Quincentennial Foundation Museum of Turkish Jews", aliases: ["Museum of Turkish Jews"], category: "Jewish heritage attraction", sourceKey: "tr-hava" },
      "Vialand", "Sapphire Observation Deck", "Camlica Hill", "Belgrad Forest",
      "Prince Islands Büyükada framing", "Heybeliada framing", "Kız Kulesi viewpoint",
    ],
    stayAnchors: [
      { name: "Staying near Sultanahmet, Istanbul", aliases: ["Sultanahmet stay area"] },
      { name: "Staying near Beyoğlu, Istanbul", aliases: ["Beyoğlu stay area"] },
    ],
  }),
  expandMarket({
    market: "uae-dubai",
    country: "United Arab Emirates",
    destination: "Dubai",
    locality: "Dubai",
    destinationSource: "ae-dubai",
    attractionSource: "ae-dubai",
    attractions: [
      "Burj Khalifa", "Dubai Mall", "Dubai Fountain", "Palm Jumeirah", "Atlantis The Palm framing",
      "Dubai Marina", "JBR Beach", "Dubai Frame", "Museum of the Future", "Al Fahidi Historical Neighbourhood",
      "Dubai Creek", "Gold Souk", "Spice Souk", "Dubai Miracle Garden", "Global Village framing",
      "IMG Worlds of Adventure", "Legoland Dubai", "Motiongate Dubai", "Bollywood Parks Dubai",
      "Dubai Opera", "La Mer", "Kite Beach", "Al Qudra Lakes", "Ras Al Khor Wildlife Sanctuary",
      "Jumeirah Mosque", "Etihad Museum", "Dubai Museum Al Fahidi Fort", "Coffee Museum Dubai",
      "Sharjah framing day trip", "Abu Dhabi Louvre day-trip framing", "Desert Conservation Reserve framing",
      "Dubai Aquarium and Underwater Zoo", "VR Park Dubai", "Green Planet Dubai",
      "Aya Universe", "City Walk", "Boxpark Dubai", "Dubai Design District",
      "Alserkal Avenue", "Satwa", "Karama", "Bur Dubai textile souk",
      "Bluewaters Island", "Ain Dubai", "Sky Views Observatory", "Dubai Hills Park",
      "Safa Park", "Zabeel Park", "Creek Park", "Mushrif Park",
    ],
    stayAnchors: [
      { name: "Staying near Dubai Marina", aliases: ["Marina stay area"] },
      { name: "Staying near Downtown Dubai", aliases: ["Downtown Dubai stay area"] },
    ],
  }),
  expandMarket({
    market: "morocco-marrakech",
    country: "Morocco",
    destination: "Marrakech",
    locality: "Marrakech",
    destinationSource: "ma-marrakech",
    attractionSource: "ma-marrakech",
    attractions: [
      "Jemaa el-Fnaa", "Koutoubia Mosque", "Bahia Palace", "El Badi Palace", "Saadian Tombs",
      "Majorelle Garden", "Yves Saint Laurent Museum Marrakech", "Ben Youssef Madrasa",
      "Marrakech Museum", "Souks of Marrakech", "Menara Gardens", "Agdal Gardens",
      "Palmeraie", "Atlas Mountains day-trip framing", "Ourika Valley framing",
      "Cyber Park", "Dar Si Said Museum", "Maison de la Photographie", "Secret Garden Marrakech",
      "Tanneries framing", "Kasbah Mosque", "Mellah of Marrakech", "Jewish Cemetery Marrakech framing",
      "Lazama Synagogue framing", "Gueliz", "Hivernage", "Place des Épices",
      "Chouara framing Fez day-trip note", "Essaouira day-trip framing", "Ouzoud Falls framing",
      "Anima Garden", "Museum of African Contemporary Art Al Maaden", "MACAAL",
      "Berber Museum Majorelle", "Café Clock framing", "Rnajat Palace gardens",
    ],
    stayAnchors: [{ name: "Staying near the Medina, Marrakech", aliases: ["Medina stay area"] }],
  }),
  expandMarket({
    market: "morocco-casablanca",
    country: "Morocco",
    destination: "Casablanca",
    locality: "Casablanca",
    destinationSource: "ma-casablanca",
    attractionSource: "ma-casablanca",
    attractions: [
      "Hassan II Mosque", "Corniche Ain Diab", "Old Medina of Casablanca", "Habous Quarter",
      "Morocco Mall", "Arab League Park", "Cathedral of Sacré-Cœur Casablanca",
      "Villa des Arts Casablanca", "Museum of Moroccan Judaism", "Place Mohammed V",
      "Rick's Café framing", "Anfa Place", "La Sqala", "Phare d'El Hank",
      "Casablanca Twin Center", "Mahkama du Pasha", "Central Market Casablanca",
      "Abderrahman Slaoui Museum", "Park of the Arab League fountains",
    ],
  }),
  expandMarket({
    market: "belgium-antwerp-brussels",
    country: "Belgium",
    destination: "Antwerp and Brussels",
    locality: "Antwerp",
    destinationSource: "be-visit-flanders",
    attractionSource: "be-visit-flanders",
    attractions: [
      "Antwerp Central Station", "Cathedral of Our Lady Antwerp", "Grote Markt Antwerp",
      "MAS Museum", "Rubens House", "Museum Plantin-Moretus", "Antwerp Zoo",
      "Het Steen", "Meir shopping street", "Zurenborg", "Cogels-Osylei",
      "Port House Antwerp", "Red Star Line Museum", "Fashion Museum Antwerp",
      "Middelheim Museum", "Scheldt quays", "ModeNatie", "Diamond District Antwerp",
      { name: "Grand-Place Brussels", aliases: ["Grote Markt Brussels"], sourceKey: "be-brussels" },
      { name: "Atomium", sourceKey: "be-brussels" },
      { name: "Manneken Pis", sourceKey: "be-brussels" },
      { name: "Royal Museums of Fine Arts of Belgium", sourceKey: "be-brussels" },
      { name: "Magritte Museum", sourceKey: "be-brussels" },
      { name: "European Quarter Brussels", sourceKey: "be-brussels" },
      { name: "Sablon", sourceKey: "be-brussels" },
      { name: "Cinquantenaire Park", sourceKey: "be-brussels" },
      { name: "Mini-Europe", sourceKey: "be-brussels" },
      { name: "Belgian Comic Strip Center", sourceKey: "be-brussels" },
      { name: "Jewish Museum of Belgium", aliases: ["Musée Juif de Belgique"], category: "Jewish heritage attraction", sourceKey: "be-jewish-museum" },
      "MAS rooftop", "St Anna's Tunnel", "Park Spoor Noord", "Eilandje",
    ],
    stayAnchors: [
      { name: "Staying near Antwerp Centraal", aliases: ["Centraal stay area"] },
      { name: "Staying near Sablon, Brussels", aliases: ["Sablon stay area"], city: "Brussels", sourceKey: "be-brussels" },
    ],
  }),
  expandMarket({
    market: "austria-vienna-extra",
    country: "Austria",
    destination: "Vienna",
    locality: "Vienna",
    includeDestination: false,
    destinationSource: "at-vienna-extra",
    attractionSource: "at-vienna-extra",
    attractions: [
      "Belvedere Palace", "Schönbrunn Palace", "Hofburg", "St Stephen's Cathedral Vienna",
      "Prater", "Kunsthistorisches Museum", "Natural History Museum Vienna", "Albertina",
      "MuseumsQuartier", "Naschmarkt", "Hundertwasserhaus", "Karlskirche",
      "Vienna State Opera", "Rathaus Vienna", "Stadtpark Vienna", "Donauinsel",
      "Danube Tower", "Zentralfriedhof", "Jewish Museum Vienna", "Stadttempel exterior framing",
      "Third Man Museum", "Haus der Musik", "Time Travel Vienna", "Spanish Riding School",
      "Imperial Treasury Vienna", "Sisi Museum", "Vienna Woods framing", "Kloesterneuburg framing",
    ],
  }),
  expandMarket({
    market: "czechia-prague-extra",
    country: "Czechia",
    destination: "Prague",
    locality: "Prague",
    includeDestination: false,
    destinationSource: "cz-prague-extra",
    attractionSource: "cz-prague-extra",
    attractions: [
      "Prague Castle", "Charles Bridge", "Old Town Square Prague", "Astronomical Clock Prague",
      "St Vitus Cathedral", "Josefov", "Old Jewish Cemetery Prague", "Spanish Synagogue Prague",
      "Pinkas Synagogue", "Maisel Synagogue", "Klaus Synagogue", "Jewish Museum in Prague",
      "Petřín Hill", "Vyšehrad", "National Museum Prague", "Dancing House",
      "Lennon Wall", "Kampa Island", "Letná Park", "Stromovka",
      "Municipal House", "Powder Tower", "Wenceslas Square", "National Theatre Prague",
      "Strahov Monastery", "Loreta Prague", "Wallenstein Garden", "Vltava river islands",
    ],
  }),
  expandMarket({
    market: "hungary-budapest-extra",
    country: "Hungary",
    destination: "Budapest",
    locality: "Budapest",
    includeDestination: false,
    destinationSource: "hu-budapest-extra",
    attractionSource: "hu-budapest-extra",
    attractions: [
      "Buda Castle", "Fisherman's Bastion", "Parliament Building Budapest", "Chain Bridge",
      "Heroes' Square", "Széchenyi Thermal Bath", "Gellért Hill", "Matthias Church",
      "Great Market Hall", "Dohány Street Synagogue", "Hungarian Jewish Museum",
      "Andrássy Avenue", "Opera House Budapest", "House of Terror", "City Park Budapest",
      "Vajdahunyad Castle", "Margaret Island", "Citadella", "Gellért Baths",
      "Rudas Baths", "Central Market framing", "Liberty Statue Budapest", "Memento Park",
      "Hospital in the Rock", "Hospital in the Rock Nuclear Bunker Museum", "Zwack Museum",
      "Pinball Museum Budapest", "Ludwig Museum", "Palace of Arts Budapest",
    ],
  }),
  expandMarket({
    market: "israel-tel-aviv",
    country: "Israel",
    destination: "Tel Aviv",
    locality: "Tel Aviv",
    destinationSource: "il-tlv",
    attractionSource: "il-tlv",
    attractions: [
      "Tel Aviv Beach Promenade", "Jaffa Old City", "Neve Tzedek", "Rothschild Boulevard",
      "Carmel Market", "Tel Aviv Museum of Art", "ANU Museum of the Jewish People",
      "Bauhaus White City", "Sarona Market", "Port of Tel Aviv", "HaTachana",
      "Independence Hall Tel Aviv", "Rabin Square", "Yarkon Park", "Eretz Israel Museum",
      "Design Museum Holon framing", "Old Jaffa Port", "Ilana Goor Museum",
      "Beit Ha'ir", "Nachalat Binyamin", "Florentin", "Kikar HaMedina",
      "Gordon Beach", "Frishman Beach", "Hilton Beach", "Charles Clore Park",
    ],
    stayAnchors: [{ name: "Staying near the Tel Aviv beachfront", aliases: ["Beachfront stay area"] }],
  }),
  expandMarket({
    market: "portugal-madeira",
    country: "Portugal",
    destination: "Madeira",
    locality: "Funchal",
    destinationSource: "pt-madeira",
    attractionSource: "pt-madeira",
    attractions: [
      "Funchal Old Town", "Monte Palace Tropical Garden", "Cable Car Funchal",
      "Cabo Girão", "Pico do Arieiro", "Curral das Freiras", "Mercado dos Lavradores",
      "Botanical Garden Madeira", "Santa Catarina Park", "Sé Cathedral Funchal",
      "CR7 Museum", "Whale Museum Madeira", "Porto Moniz natural pools",
      "São Vicente Caves", "Laurisilva forest framing", "Ponta de São Lourenço",
      "Câmara de Lobos", "Eira do Serrado", "Levada walks framing", "Palheiro Gardens",
    ],
  }),
].flat();

// ---------------------------------------------------------------------------
// Global candidates (sources already exist)
// ---------------------------------------------------------------------------

const globalMarkets = [
  expandMarket({
    market: "usa-nyc",
    country: "United States",
    destination: "New York City",
    locality: "New York",
    destinationSource: "nyc-tourism-manhattan",
    attractionSource: "nyc-tourism-manhattan",
    attractions: [
      "Central Park", "The Metropolitan Museum of Art", "American Museum of Natural History",
      "Museum of Modern Art", "Statue of Liberty framing", "Ellis Island framing",
      "Empire State Building", "Top of the Rock", "One World Observatory", "Brooklyn Bridge",
      "High Line", "Times Square", "Broadway Theatre District", "Grand Central Terminal",
      "New York Public Library Stephen A. Schwarzman Building", "Fifth Avenue",
      "Rockefeller Center", "St Patrick's Cathedral New York", "9/11 Memorial",
      "The Cloisters", "Guggenheim Museum", "Whitney Museum", "The Frick Collection",
      "New-York Historical Society", "Tenement Museum", "Museum of the City of New York",
      "Intrepid Museum", "Vessel Hudson Yards", "Little Island", "Bryant Park",
      "Washington Square Park", "Union Square", "Chelsea Market", "Meatpacking District",
      "SoHo", "Greenwich Village", "Lower East Side", "Chinatown New York",
      "Battery Park", "South Street Seaport", "Governors Island", "Prospect Park",
      "Brooklyn Botanic Garden", "Brooklyn Museum", "Coney Island", "The Met Cloisters gardens",
      "Lincoln Center", "Carnegie Hall", "Apollo Theater", "Harlem",
      "Columbia University campus framing", "Riverside Park", "Smorgasburg framing",
      { name: "UJA-Federation of New York community resource framing", aliases: ["UJA Federation NY"], category: "Jewish heritage attraction", sourceKey: "nyc-uja" },
      "Jewish Museum New York", "Museum of Jewish Heritage", "Center for Jewish History",
    ].concat([
      "The Shed", "Edge Hudson Yards", "Summit One Vanderbilt", "New Museum",
      "MoMA PS1", "Brooklyn Heights Promenade", "DUMBO", "Domino Park",
    ]),
    stayAnchors: [
      { name: "Staying near Upper West Side, New York", aliases: ["UWS stay area"] },
      { name: "Staying near Midtown Manhattan", aliases: ["Midtown stay area"] },
    ],
    resources: [
      { name: "UJA-Federation of New York", sourceKey: "nyc-uja", category: "Jewish community resource" },
      { name: "New York State Kosher Foods Registration", sourceKey: "nyc-kosher-registry", category: "Kosher certifier resource" },
      { name: "Metropolitan Transportation Authority trip planning", sourceKey: "nyc-mta", category: "Transit planning resource" },
    ],
  }),
  expandMarket({
    market: "usa-catskills-hudson",
    country: "United States",
    destination: "Catskills and Hudson Valley",
    locality: "Sullivan County",
    destinationSource: "catskills-region",
    attractionSource: "catskills-region",
    attractions: [
      "Catskill Park", "Kaaterskill Falls", "Hunter Mountain framing", "Windham Mountain framing",
      "Bethel Woods Center for the Arts", "Sullivan Catskills lakes", "Neversink River framing",
      "Roscoe Beaverkill framing", "Callicoon", "Liberty New York", "Monticello",
      { name: "Hudson River Valley National Heritage Area sites", sourceKey: "hudson-heritage" },
      { name: "Walkway Over the Hudson", sourceKey: "hudson-tourism" },
      { name: "Franklin D. Roosevelt Home", sourceKey: "hudson-heritage" },
      { name: "Vanderbilt Mansion", sourceKey: "hudson-heritage" },
      { name: "Olana State Historic Site", sourceKey: "hudson-heritage" },
      { name: "Storm King Art Center", sourceKey: "hudson-tourism" },
      { name: "Dia Beacon", sourceKey: "hudson-tourism" },
      { name: "Beacon waterfront", sourceKey: "hudson-tourism" },
      { name: "New Paltz Mohonk framing", sourceKey: "hudson-tourism" },
      { name: "Minnewaska State Park Preserve", sourceKey: "hudson-tourism" },
      { name: "Hyde Park estates", sourceKey: "hudson-heritage" },
      { name: "Rhinebeck", sourceKey: "hudson-tourism" },
      { name: "Hudson historic waterfront", sourceKey: "hudson-tourism" },
      { name: "Catskill Mountain Railroad framing", sourceKey: "catskills-sullivan" },
      { name: "Livingston Manor", sourceKey: "catskills-sullivan" },
      { name: "Narrowsburg", sourceKey: "catskills-sullivan" },
      { name: "Forestburgh", sourceKey: "catskills-sullivan" },
      { name: "Bashakill Wildlife Management Area", sourceKey: "catskills-sullivan" },
    ],
    stayAnchors: [
      { name: "Staying in the Sullivan Catskills", aliases: ["Sullivan Catskills stay area"], sourceKey: "catskills-sullivan" },
      { name: "Staying near Beacon and the Mid-Hudson", aliases: ["Beacon stay area"], city: "Beacon", sourceKey: "hudson-tourism" },
    ],
  }),
  expandMarket({
    market: "usa-los-angeles",
    country: "United States",
    destination: "Los Angeles",
    locality: "Los Angeles",
    destinationSource: "la-attractions",
    attractionSource: "la-attractions",
    attractions: [
      "Griffith Observatory", "Hollywood Sign viewpoint framing", "Universal Studios Hollywood framing",
      "Getty Center", "Getty Villa", "Los Angeles County Museum of Art", "The Broad",
      "Walt Disney Concert Hall", "Santa Monica Pier", "Venice Beach boardwalk",
      "Runyon Canyon", "Griffith Park", "Natural History Museum of Los Angeles",
      "California Science Center", "La Brea Tar Pits", "Petersen Automotive Museum",
      "Huntington Library gardens framing", "Norton Simon Museum", "Descanso Gardens",
      "Warner Bros Studio Tour framing", "Paramount Studio lot framing", "Rodeo Drive",
      "The Grove", "Original Farmers Market", "Olvera Street", "Union Station Los Angeles",
      "Downtown LA Arts District", "Little Tokyo Los Angeles", "Chinatown Los Angeles",
      "Echo Park Lake", "Silver Lake Reservoir path", "Malibu Pier framing",
      "Point Dume", "Manhattan Beach pier", "Hermosa Beach", "Redondo Beach",
      "Aquarium of the Pacific framing", "Queen Mary Long Beach framing",
      { name: "Skirball Cultural Center", category: "Jewish heritage attraction", sourceKey: "la-museums" },
      { name: "Museum of Tolerance", category: "Jewish heritage attraction", sourceKey: "la-museums" },
      "Academy Museum of Motion Pictures", "Pantages Theatre", "Greek Theatre",
      "Hollywood Bowl", "Dodger Stadium framing", "Crypto.com Arena framing",
    ],
    stayAnchors: [
      { name: "Staying near West Hollywood", aliases: ["West Hollywood stay area"] },
      { name: "Staying near Santa Monica", aliases: ["Santa Monica stay area"], city: "Santa Monica" },
    ],
    resources: [
      { name: "Rabbinical Council of California", sourceKey: "la-rcc", category: "Kosher certifier resource" },
      { name: "LA Metro trip planning", sourceKey: "la-metro", category: "Transit planning resource" },
    ],
  }),
  expandMarket({
    market: "usa-san-diego",
    country: "United States",
    destination: "San Diego",
    locality: "San Diego",
    destinationSource: "sd-attractions",
    attractionSource: "sd-attractions",
    attractions: [
      "Balboa Park", "San Diego Zoo", "USS Midway Museum", "Gaslamp Quarter",
      "La Jolla Cove", "Torrey Pines State Natural Reserve", "Coronado Beach",
      "Old Town San Diego", "Seaport Village", "Maritime Museum of San Diego",
      "Birch Aquarium", "Cabrillo National Monument", "Mission Beach", "Pacific Beach",
      "Petco Park framing", "Little Italy San Diego", "Sunset Cliffs",
      "Legoland California framing", "Safari Park framing", "Belmont Park",
      { name: "San Diego Museum of Art", sourceKey: "sd-museums" },
      { name: "Fleet Science Center", sourceKey: "sd-museums" },
      { name: "Mingei International Museum", sourceKey: "sd-museums" },
      { name: "Museum of Us", sourceKey: "sd-museums" },
      { name: "San Diego Natural History Museum", sourceKey: "sd-museums" },
      "Point Loma", "Harbor Island", "Shelter Island", "Liberty Station",
    ],
    stayAnchors: [{ name: "Staying near La Jolla", aliases: ["La Jolla stay area"], city: "La Jolla" }],
    resources: [
      { name: "Congregation Adat Yeshurun kosher visitor resource", sourceKey: "sd-community", category: "Jewish community resource" },
      { name: "San Diego MTS trip planning", sourceKey: "sd-transit", category: "Transit planning resource" },
    ],
  }),
  expandMarket({
    market: "mexico-city",
    country: "Mexico",
    destination: "Mexico City",
    locality: "Mexico City",
    destinationSource: "mexico-city-guide",
    attractionSource: "mexico-city-venues",
    attractions: [
      "Zócalo", "Templo Mayor", "Palacio de Bellas Artes", "Chapultepec Castle",
      "Museo Nacional de Antropología", "Frida Kahlo Museum", "Coyoacán",
      "Xochimilco", "Basilica of Our Lady of Guadalupe", "Torre Latinoamericana",
      "Reforma Avenue", "Bosque de Chapultepec", "Museo Soumaya", "Museo Jumex",
      "Casa de los Azulejos", "Palacio Nacional", "Alameda Central", "Plaza Garibaldi",
      "Polanco", "Condesa", "Roma Norte", "San Ángel", "UNAM Central Campus framing",
      "Teotihuacan day-trip framing", "Floating gardens framing", "Arena México framing",
      "Castillo de Chapultepec gardens", "Museo Tamayo", "Museo de Arte Moderno",
      "Mercado de la Merced framing", "Mercado Roma", "Parque México",
    ],
    stayAnchors: [
      { name: "Staying near Polanco, Mexico City", aliases: ["Polanco stay area"] },
      { name: "Staying near Condesa, Mexico City", aliases: ["Condesa stay area"] },
    ],
    resources: [
      { name: "Mexico City Metro trip planning", sourceKey: "mexico-city-transit", category: "Transit planning resource" },
    ],
  }),
  expandMarket({
    market: "canada-vancouver",
    country: "Canada",
    destination: "Vancouver",
    locality: "Vancouver",
    destinationSource: "vancouver-attractions",
    attractionSource: "vancouver-attractions",
    attractions: [
      "Stanley Park", "Capilano Suspension Bridge framing", "Granville Island",
      "Canada Place", "Gastown", "Science World", "Vancouver Aquarium",
      "Grouse Mountain framing", "Queen Elizabeth Park", "VanDusen Botanical Garden",
      "Museum of Anthropology framing", "Dr. Sun Yat-Sen Classical Chinese Garden",
      "English Bay", "Kitsilano Beach", "False Creek", "Olympic Village Vancouver",
      "Robson Street", "Yaletown", "Chinatown Vancouver", "Commercial Drive",
      { name: "Lynn Canyon Park", sourceKey: "vancouver-things" },
      { name: "Deep Cove", sourceKey: "vancouver-things" },
      { name: "Burnaby Mountain framing", sourceKey: "vancouver-things" },
      { name: "Steveston", sourceKey: "vancouver-things" },
      { name: "Richmond Night Market framing", sourceKey: "vancouver-things" },
      "Seawall", "Bloedel Conservatory", "HR MacMillan Space Centre",
      "Vancouver Art Gallery", "Bill Reid Gallery", "Contemporary Art Gallery Vancouver",
    ],
    stayAnchors: [{ name: "Staying near Downtown Vancouver", aliases: ["Downtown Vancouver stay area"] }],
    resources: [
      { name: "Kosher Check", sourceKey: "vancouver-kosher-check", category: "Kosher certifier resource" },
      { name: "TransLink trip planning", sourceKey: "vancouver-translink", category: "Transit planning resource" },
    ],
  }),
  expandMarket({
    market: "japan-tokyo",
    country: "Japan",
    destination: "Tokyo",
    locality: "Tokyo",
    destinationSource: "tokyo-attractions",
    attractionSource: "tokyo-attractions",
    attractions: [
      "Senso-ji", "Tokyo Skytree", "Meiji Shrine", "Shibuya Crossing", "Shinjuku Gyoen",
      "Imperial Palace East Gardens", "teamLab Borderless framing", "teamLab Planets framing",
      "Tokyo Tower", "Ginza", "Akihabara", "Harajuku", "Yoyogi Park",
      { name: "Ueno Park", sourceKey: "tokyo-ueno" },
      { name: "Tokyo National Museum", sourceKey: "tokyo-ueno" },
      { name: "Ueno Zoo", sourceKey: "tokyo-ueno" },
      { name: "National Museum of Western Art", sourceKey: "tokyo-ueno" },
      { name: "National Museum of Nature and Science", sourceKey: "tokyo-ueno" },
      "Odaiba", "teamLab digital art framing", "Roppongi Hills", "Mori Art Museum",
      "Tokyo Station Marunouchi", "Imperial Palace plaza", "Sumida River cruise framing",
      "Tsukiji Outer Market", "Toyosu Market framing", "Koishikawa Korakuen",
      "Hama-rikyu Gardens", "Rikugien Gardens", "Nezu Museum", "Ghibli Museum framing",
      "Inokashira Park", "Nakamise-dori", "Asakusa", "Yanaka",
      "Kagurazaka", "Kichijoji", "Shimokitazawa", "Daikanyama",
    ],
    stayAnchors: [
      { name: "Staying near Shinjuku", aliases: ["Shinjuku stay area"] },
      { name: "Staying near Ginza", aliases: ["Ginza stay area"] },
    ],
    resources: [
      { name: "Chabad Lubavitch of Japan", sourceKey: "tokyo-chabad", category: "Jewish community resource" },
      { name: "JR East trip planning", sourceKey: "tokyo-jr-east", category: "Transit planning resource" },
    ],
  }),
  expandMarket({
    market: "japan-kyoto",
    country: "Japan",
    destination: "Kyoto",
    locality: "Kyoto",
    destinationSource: "kyoto-destinations",
    attractionSource: "kyoto-destinations",
    attractions: [
      "Fushimi Inari Taisha", "Kiyomizu-dera", "Arashiyama Bamboo Grove", "Kinkaku-ji",
      "Ginkaku-ji", "Nijo Castle", "Kyoto Imperial Palace", "Gion",
      "Philosopher's Path", "Tō-ji", "Sanjūsangen-dō", "Nishiki Market",
      "Nanzen-ji", "Eikan-dō", "Heian Shrine", "Kyoto Station building",
      "Pontocho", "Kamogawa", "Uji day-trip framing", "Ohara Sanzen-in framing",
      "Kurama and Kibune framing", "Katsura Imperial Villa framing", "Saihō-ji framing",
      "Ryoan-ji", "Tenryu-ji", "Okochi Sanso", "Togetsukyo Bridge",
      "Sagano Romantic Train framing", "Kyoto Railway Museum", "Manga Museum Kyoto",
    ],
    stayAnchors: [{ name: "Staying near Downtown Kyoto", aliases: ["Kawaramachi stay area"] }],
    resources: [
      { name: "Chabad of Kyoto kosher visitor resource", sourceKey: "kyoto-chabad", category: "Jewish community resource" },
    ],
  }),
  expandMarket({
    market: "singapore",
    country: "Singapore",
    destination: "Singapore",
    locality: "Singapore",
    destinationSource: "singapore-things",
    attractionSource: "singapore-things",
    attractions: [
      "Gardens by the Bay", "Marina Bay Sands SkyPark framing", "Merlion Park",
      "Sentosa", "Universal Studios Singapore framing", "Singapore Zoo",
      "Night Safari", "River Wonders", "Bird Paradise", "Orchard Road",
      "Chinatawn Singapore", "Little India Singapore", "Kampong Glam",
      "National Gallery Singapore", "ArtScience Museum", "Singapore Botanic Gardens",
      "Fort Canning Park", "Clarke Quay", "Boat Quay", "Esplanade",
      { name: "Singapore Flyer", sourceKey: "singapore-itinerary" },
      { name: "Helix Bridge", sourceKey: "singapore-itinerary" },
      { name: "Supertree Grove", sourceKey: "singapore-itinerary" },
      { name: "Cloud Forest", sourceKey: "singapore-itinerary" },
      { name: "Flower Dome", sourceKey: "singapore-itinerary" },
      "Asian Civilisations Museum", "National Museum of Singapore", "Peranakan Museum",
      "Haw Par Villa", "East Coast Park", "Southern Islands framing",
      "Jewel Changi Airport framing", "S.E.A. Aquarium framing",
    ],
    stayAnchors: [{ name: "Staying near Marina Bay", aliases: ["Marina Bay stay area"] }],
    resources: [
      { name: "Jewish Welfare Board of Singapore", sourceKey: "singapore-jwb", category: "Jewish community resource" },
      { name: "SMRT trip planning", sourceKey: "singapore-smrt", category: "Transit planning resource" },
    ],
  }),
  expandMarket({
    market: "australia-sydney",
    country: "Australia",
    destination: "Sydney",
    locality: "Sydney",
    destinationSource: "sydney-attractions",
    attractionSource: "sydney-attractions",
    attractions: [
      "Sydney Opera House", "Sydney Harbour Bridge", "Bondi Beach", "Taronga Zoo",
      "Royal Botanic Garden Sydney", "The Rocks", "Darling Harbour", "SEA LIFE Sydney Aquarium",
      "Art Gallery of New South Wales", "Museum of Contemporary Art Australia",
      "Australian Museum", "Hyde Park Sydney", "Queen Victoria Building",
      "Manly Beach", "Watsons Bay", "Vaucluse House framing", "Centennial Parklands",
      { name: "Blue Mountains day-trip framing", sourceKey: "sydney-destinations" },
      { name: "Barangaroo Reserve", sourceKey: "sydney-destinations" },
      { name: "Circular Quay", sourceKey: "sydney-destinations" },
      { name: "Coogee Beach", sourceKey: "sydney-destinations" },
      { name: "Bronte Beach", sourceKey: "sydney-destinations" },
      { name: "Royal National Park framing", sourceKey: "sydney-destinations" },
      "Powerhouse Museum", "Sydney Tower Eye", "Luna Park Sydney",
      "Cockatoo Island", "Wendy Whiteley's Secret Garden", "Mrs Macquaries Point",
    ],
    stayAnchors: [{ name: "Staying near Circular Quay", aliases: ["Circular Quay stay area"] }],
    resources: [
      { name: "The Kashrut Authority iKosher", sourceKey: "sydney-kashrut", category: "Kosher certifier resource" },
      { name: "Transport for NSW trip planning", sourceKey: "sydney-transport", category: "Transit planning resource" },
    ],
  }),
  expandMarket({
    market: "australia-melbourne",
    country: "Australia",
    destination: "Melbourne",
    locality: "Melbourne",
    destinationSource: "melbourne-top",
    attractionSource: "melbourne-top",
    attractions: [
      "Federation Square", "National Gallery of Victoria", "Royal Botanic Gardens Victoria",
      "Melbourne Cricket Ground framing", "Queen Victoria Market", "Laneways of Melbourne",
      "State Library Victoria", "Shrine of Remembrance", "St Kilda Beach",
      "Luna Park Melbourne", "Brighton Bathing Boxes", "Docklands",
      { name: "ACMI", sourceKey: "melbourne-day" },
      { name: "Flinders Street Station", sourceKey: "melbourne-day" },
      { name: "Yarra River cruise framing", sourceKey: "melbourne-day" },
      { name: "Southbank Promenade", sourceKey: "melbourne-day" },
      { name: "Melbourne Museum", sourceKey: "melbourne-day" },
      { name: "Royal Exhibition Building", sourceKey: "melbourne-day" },
      "Carlton Gardens", "Fitzroy", "Brunswick Street", "Chapel Street",
      "Healesville Sanctuary framing", "Great Ocean Road framing", "Phillip Island framing",
      "Eureka Skydeck", "Sea Life Melbourne Aquarium", "Immigration Museum Melbourne",
    ],
    stayAnchors: [{ name: "Staying near Southbank, Melbourne", aliases: ["Southbank stay area"] }],
    resources: [
      { name: "Kosher Australia", sourceKey: "melbourne-kosher", category: "Kosher certifier resource" },
      { name: "Public Transport Victoria trip planning", sourceKey: "melbourne-transport", category: "Transit planning resource" },
    ],
  }),
  expandMarket({
    market: "south-africa-cape-town",
    country: "South Africa",
    destination: "Cape Town",
    locality: "Cape Town",
    destinationSource: "cape-attractions",
    attractionSource: "cape-attractions",
    attractions: [
      "Table Mountain", "V&A Waterfront", "Robben Island framing", "Cape Point",
      "Boulders Beach", "Kirstenbosch National Botanical Garden", "Signal Hill",
      "Bo-Kaap", "Company's Gardens", "Castle of Good Hope", "Chapman's Peak Drive",
      "Camps Bay", "Clifton Beaches", "Sea Point Promenade", "Hout Bay",
      { name: "Iziko South African Museum", sourceKey: "cape-museums" },
      { name: "Iziko South African National Gallery", sourceKey: "cape-museums" },
      { name: "Zeitz MOCAA", sourceKey: "cape-museums" },
      { name: "South African Jewish Museum", category: "Jewish heritage attraction", sourceKey: "cape-museums" },
      { name: "Holocaust Centre Cape Town", category: "Jewish heritage attraction", sourceKey: "cape-museums" },
      "District Six Museum", "Two Oceans Aquarium", "Constantia wine route framing",
      "Stellenbosch day-trip framing", "Franschhoek framing", "Hermanus framing",
      "Lion's Head", "Devil's Peak", "False Bay", "Muizenberg",
    ],
    stayAnchors: [
      { name: "Staying near Sea Point, Cape Town", aliases: ["Sea Point stay area"] },
      { name: "Staying near the V&A Waterfront", aliases: ["Waterfront stay area"] },
    ],
    resources: [
      { name: "Kosher SA", sourceKey: "cape-kosher", category: "Kosher certifier resource" },
    ],
  }),
  expandMarket({
    market: "brazil-rio",
    country: "Brazil",
    destination: "Rio de Janeiro",
    locality: "Rio de Janeiro",
    destinationSource: "rio-highlights",
    attractionSource: "rio-highlights",
    attractions: [
      "Christ the Redeemer", "Sugarloaf Mountain", "Copacabana Beach", "Ipanema Beach",
      "Selarón Steps", "Maracanã Stadium framing", "Tijuca National Park",
      "Botanical Garden Rio", "Museum of Tomorrow", "Municipal Theatre Rio",
      "Lapa Arches", "Santa Teresa", "Flamengo Park", "Barra da Tijuca beach",
      { name: "Quinta da Boa Vista", sourceKey: "rio-welcome" },
      { name: "National Museum of Brazil framing", sourceKey: "rio-welcome" },
      { name: "Catedral Metropolitana", sourceKey: "rio-welcome" },
      { name: "Praca XV", sourceKey: "rio-welcome" },
      { name: "Ilha Fiscal", sourceKey: "rio-welcome" },
      "Lagoa Rodrigo de Freitas", "Leblon Beach", "Arpoador", "Pedra do Arpoador",
      "Parque Lage", "Vista Chinesa", "Mirante Dona Marta framing",
      "AquaRio", "Boulevard Olímpico", "Museum of Modern Art Rio",
    ],
    stayAnchors: [
      { name: "Staying near Copacabana", aliases: ["Copacabana stay area"] },
      { name: "Staying near Ipanema", aliases: ["Ipanema stay area"] },
    ],
    resources: [
      { name: "Chabad Copacabana visitors resource", sourceKey: "rio-chabad", category: "Jewish community resource" },
      { name: "Rabinado do Rio de Janeiro kosher supervision", sourceKey: "rio-rabbinatorio", category: "Kosher certifier resource" },
    ],
  }),
  // Complementary Americas / Asia-Pacific markets (avoid fill-batch, FL/Orlando, Toronto/Montréal, Buenos Aires).
  expandMarket({
    market: "usa-san-francisco",
    country: "United States",
    destination: "San Francisco",
    locality: "San Francisco",
    destinationSource: "sf-visit",
    attractionSource: "sf-visit",
    attractions: [
      "Golden Gate Bridge", "Alcatraz Island framing", "Fisherman's Wharf", "Pier 39",
      "Golden Gate Park", "California Academy of Sciences", "de Young Museum",
      "Exploratorium", "Cable Car Museum", "Chinatown San Francisco", "North Beach",
      "Lombard Street", "Coit Tower", "Palace of Fine Arts", "Crissy Field",
      "Lands End", "Ocean Beach San Francisco", "Mission Dolores", "Castro Theatre framing",
      "Salesforce Park", "Ferry Building", "Oracle Park framing", "Chase Center framing",
      { name: "San Francisco Museum of Modern Art", sourceKey: "sf-museums" },
      { name: "Asian Art Museum San Francisco", sourceKey: "sf-museums" },
      { name: "Contemporary Jewish Museum", category: "Jewish heritage attraction", sourceKey: "sf-museums" },
      "Twin Peaks viewpoint", "Baker Beach", "Presidio of San Francisco", "Fort Point",
      "Angel Island framing", "Sausalito day-trip framing",
    ],
    stayAnchors: [
      { name: "Staying near Union Square, San Francisco", aliases: ["Union Square stay area"] },
      { name: "Staying near the Marina District", aliases: ["Marina stay area"] },
    ],
    resources: [
      { name: "Jewish Community Federation and Endowment Fund", sourceKey: "sf-jcf", category: "Jewish community resource" },
      { name: "SFMTA trip planning", sourceKey: "sf-transit", category: "Transit planning resource" },
    ],
  }),
  expandMarket({
    market: "usa-seattle",
    country: "United States",
    destination: "Seattle",
    locality: "Seattle",
    destinationSource: "seattle-visit",
    attractionSource: "seattle-visit",
    attractions: [
      "Space Needle", "Pike Place Market", "Chihuly Garden and Glass", "Museum of Pop Culture",
      "Seattle Waterfront", "Olympic Sculpture Park", "Kerry Park", "Discovery Park Seattle",
      "Ballard Locks", "Fremont Troll", "University of Washington campus framing",
      "Volunteer Park", "Seattle Center", "Pacific Science Center", "Seattle Aquarium",
      "Museum of Flight framing", "Gas Works Park", "Alki Beach", "Ferry to Bainbridge framing",
      { name: "Seattle Art Museum", sourceKey: "seattle-museums" },
      { name: "Frye Art Museum", sourceKey: "seattle-museums" },
      { name: "Wing Luke Museum", sourceKey: "seattle-museums" },
      "Capitol Hill Seattle", "Pioneer Square", "International District Seattle",
      "Mount Rainier day-trip framing", "Snoqualmie Falls framing",
    ],
    stayAnchors: [{ name: "Staying near Downtown Seattle", aliases: ["Downtown Seattle stay area"] }],
    resources: [
      { name: "Jewish Federation of Greater Seattle", sourceKey: "seattle-federation", category: "Jewish community resource" },
      { name: "King County Metro trip planning", sourceKey: "seattle-transit", category: "Transit planning resource" },
    ],
  }),
  expandMarket({
    market: "usa-honolulu",
    country: "United States",
    destination: "Honolulu",
    locality: "Honolulu",
    destinationSource: "honolulu-gohawaii",
    attractionSource: "honolulu-gohawaii",
    attractions: [
      "Waikiki Beach", "Diamond Head State Monument", "Pearl Harbor National Memorial framing",
      "USS Arizona Memorial framing", "Iolani Palace", "Bishop Museum",
      "Honolulu Museum of Art", "Ala Moana Beach Park", "Hanauma Bay framing",
      "Kailua Beach framing", "Lanikai Beach framing", "Manoa Falls framing",
      "Foster Botanical Garden", "Lyon Arboretum", "Waikiki Aquarium",
      "Kakaako murals", "Aloha Tower", "Chinatown Honolulu", "Punchbowl National Memorial Cemetery framing",
      "Shangri La Museum of Islamic Art Culture and Design framing",
      "Kualoa Ranch framing", "Polynesian Cultural Center framing",
      "Sunset Beach North Shore framing", "Waimea Bay framing",
    ],
    stayAnchors: [{ name: "Staying near Waikiki", aliases: ["Waikiki stay area"] }],
    resources: [
      { name: "Jewish Community of Hawaii visitor resource", sourceKey: "honolulu-jewish", category: "Jewish community resource" },
    ],
  }),
  expandMarket({
    market: "taiwan-taipei",
    country: "Taiwan",
    destination: "Taipei",
    locality: "Taipei",
    destinationSource: "taipei-travel",
    attractionSource: "taipei-travel",
    attractions: [
      "Taipei 101", "National Palace Museum", "Chiang Kai-shek Memorial Hall",
      "Longshan Temple", "Dihua Street", "Raohe Night Market", "Shilin Night Market",
      "Elephant Mountain", "Yangmingshan National Park framing", "Beitou Hot Springs",
      "Taipei Fine Arts Museum", "Museum of Contemporary Art Taipei",
      "Huashan 1914 Creative Park", "Songshan Cultural and Creative Park",
      "Ximending", "Zhongxiao shopping corridor", "Daan Forest Park",
      "Maokong Gondola", "Taipei Zoo", "National Taiwan Museum",
      "Presidential Office Building exterior framing", "228 Peace Memorial Park",
      "Jiufen day-trip framing", "Keelung Miaokou Night Market framing",
      "Tamsui old street framing", "Yehliu Geopark framing",
    ],
    stayAnchors: [{ name: "Staying near Zhongxiao Fuxing, Taipei", aliases: ["Zhongxiao stay area"] }],
    resources: [
      { name: "Taiwan Jewish Community visitor resource", sourceKey: "taipei-jewish", category: "Jewish community resource" },
      { name: "Taipei Metro trip planning", sourceKey: "taipei-metro", category: "Transit planning resource" },
    ],
  }),
  expandMarket({
    market: "thailand-bangkok",
    country: "Thailand",
    destination: "Bangkok",
    locality: "Bangkok",
    destinationSource: "bangkok-tat",
    attractionSource: "bangkok-tat",
    attractions: [
      "Grand Palace Bangkok", "Wat Pho", "Wat Arun", "Wat Saket Golden Mount",
      "Chatuchak Weekend Market", "Jim Thompson House", "MBK Center framing",
      "Asiatique The Riverfront", "ICONSIAM framing", "Lumphini Park",
      "Victory Monument", "Democracy Monument", "Yaowarat Chinatown Bangkok",
      "Khao San Road framing", "Flower Market Pak Khlong Talat",
      "Museum of Siam", "Bangkok National Museum", "Erawan Shrine",
      "Siam Paragon framing", "CentralWorld framing", "Benjakitti Park",
      "Bang Krachao framing", "Ayutthaya day-trip framing", "Damnoen Saduak framing",
      "Chao Phraya river ferry framing", "Asok corridor", "Sukhumvit Road framing",
      "MBK Skywalk framing", "China Town Gate Bangkok",
    ],
    stayAnchors: [
      { name: "Staying near Sukhumvit, Bangkok", aliases: ["Sukhumvit stay area"] },
      { name: "Staying near Siam, Bangkok", aliases: ["Siam stay area"] },
    ],
    resources: [
      { name: "Jewish Association of Thailand", sourceKey: "bangkok-jewish", category: "Jewish community resource" },
      { name: "Bangkok MRT trip planning", sourceKey: "bangkok-transit", category: "Transit planning resource" },
    ],
  }),
].flat();

function dedupeRows(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = `${row.kind}::${slugify(row.name)}::${slugify(row.city)}::${slugify(row.country)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function writeEuropeSources() {
  const lines = [
    `import type { SourceDefinition } from "./schema";`,
    ``,
    `/**`,
    ` * First-party and official source registry for the Europe / Mediterranean /`,
    ` * Middle East private review pack. Candidates store resolved source fields;`,
    ` * this file does not reproduce source copy, media, prices, hours or contacts.`,
    ` */`,
    `export const sourceCatalog = {`,
  ];
  for (const [key, source] of Object.entries(europeSources)) {
    lines.push(`  ${lit(key)}: {`);
    lines.push(`    name: ${lit(source.name)},`);
    lines.push(`    url: ${lit(source.url)},`);
    lines.push(`    type: ${lit(source.type)},`);
    lines.push(`    attribution: ${lit(source.attribution)},`);
    lines.push(`    evidence: ${lit(source.evidence)},`);
    lines.push(`    rights: ${lit("Research link only; no source text, imagery, reviews, prices, hours or contacts are stored.")},`);
    lines.push(`    lastChecked: ${lit(CHECKED)},`);
    lines.push(`  },`);
  }
  lines.push(`} as const satisfies Readonly<Record<string, SourceDefinition>>;`);
  lines.push(``);
  lines.push(`export type SourceKey = keyof typeof sourceCatalog;`);
  lines.push(``);
  fs.writeFileSync(path.join(ROOT, "data/imports/white-glove-europe-batch/sources.ts"), lines.join("\n"));
}

function emitEuropeCandidate(row) {
  const entity =
    row.kind === "destination"
      ? "vacation_destination"
      : row.kind === "attraction"
        ? "attraction"
        : row.kind === "stay"
          ? "practical_travel_anchor"
          : "kosher_travel_resource";
  const kind = row.kind === "attraction" ? "ATTRACTION" : "PRACTICAL";
  const target =
    row.kind === "destination"
      ? "VacationDestination"
      : row.kind === "attraction"
        ? "Attraction"
        : "PracticalPlace";
  return [
    `  sourceDraft({`,
    `    market: ${lit(row.market)},`,
    `    entityType: ${lit(entity)},`,
    `    kind: ${lit(kind)},`,
    `    importTarget: ${lit(target)},`,
    `    category: ${lit(row.category)},`,
    `    slug: ${lit(row.slug)},`,
    `    name: ${lit(row.name)},`,
    `    aliases: ${lit(row.aliases)},`,
    `    keywords: ${lit(row.keywords)},`,
    `    city: ${lit(row.city)},`,
    `    destination: ${lit(row.destination)},`,
    `    country: ${lit(row.country)},`,
    `    sourceKey: ${lit(row.sourceKey)},`,
    `  }),`,
  ].join("\n");
}

function writeEuropeCandidates(rows) {
  const body = [
    `import { sourceBackedCandidate, type CandidateEntityType, type CandidateInput, type EuropeEditorialCandidate } from "./schema";`,
    `import { sourceCatalog } from "./sources";`,
    ``,
    `const requiredBeforePublication: Readonly<Record<CandidateEntityType, readonly string[]>> = {`,
    `  vacation_destination: [`,
    `    "Destination editorial fields and facets reviewed",`,
    `    "Destination readiness checks pass against imported practical content",`,
    `  ],`,
    `  attraction: [`,
    `    "Customer-facing summary reviewed against the cited source",`,
    `    "Current visit and Shabbos suitability checked before public release",`,
    `  ],`,
    `  practical_travel_anchor: [`,
    `    "Neighborhood anchor coordinates and customer note supplied from a primary source",`,
    `    "Editorial review confirms the anchor remains useful for trip planning",`,
    `  ],`,
    `  kosher_travel_resource: [`,
    `    "Resource scope and current access route reviewed",`,
    `    "Editorial review confirms it is not presented as a food or accommodation provider",`,
    `  ],`,
    `};`,
    ``,
    `function sourceDraft(`,
    `  input: Omit<CandidateInput, "status" | "requiredBeforePublication">,`,
    `): EuropeEditorialCandidate {`,
    `  return sourceBackedCandidate(sourceCatalog, {`,
    `    ...input,`,
    `    status: "NEEDS_REVIEW",`,
    `    requiredBeforePublication: requiredBeforePublication[input.entityType],`,
    `  });`,
    `}`,
    ``,
    `/** Private NEEDS_REVIEW Europe / Mediterranean / Middle East editorial candidates. */`,
    `export const whiteGloveEuropeCandidates: readonly EuropeEditorialCandidate[] = [`,
    ...rows.map(emitEuropeCandidate),
    `];`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(ROOT, "data/imports/white-glove-europe-batch/candidates.ts"), body);
}

function emitGlobalCandidate(row) {
  const entity =
    row.kind === "destination"
      ? "vacation_destination"
      : row.kind === "attraction"
        ? "attraction"
        : row.kind === "stay"
          ? "stay_anchor"
          : row.category.toLowerCase().includes("transit")
            ? "practical_travel_resource"
            : "kosher_travel_resource";
  const importKind =
    row.kind === "attraction" ? "ATTRACTION" : row.kind === "stay" ? "PLACE_TO_STAY" : "PRACTICAL";
  const importTarget =
    row.kind === "destination"
      ? "VacationDestination"
      : row.kind === "attraction"
        ? "Attraction"
        : row.kind === "stay"
          ? "KosherArea"
          : "PracticalPlace";
  return [
    `  sourceDraft({`,
    `    market: ${lit(row.market)},`,
    `    entityType: ${lit(entity)},`,
    `    importKind: ${lit(importKind)},`,
    `    importTarget: ${lit(importTarget)},`,
    `    category: ${lit(row.category)},`,
    `    slug: ${lit(row.slug)},`,
    `    name: ${lit(row.name)},`,
    `    aliases: ${lit(row.aliases)},`,
    `    keywords: ${lit(row.keywords)},`,
    `    locality: ${lit(row.city)},`,
    `    destination: ${lit(row.destination)},`,
    `    country: ${lit(row.country)},`,
    `    sourceKey: ${lit(row.sourceKey)},`,
    `  }),`,
  ].join("\n");
}

function writeGlobalCandidates(rows) {
  const body = [
    `import { sourceBackedCandidate, type CandidateEntityType, type CandidateInput, type WhiteGloveGlobalCandidate } from "./schema";`,
    `import { sourceCatalog } from "./sources";`,
    ``,
    `const requiredBeforePublication: Readonly<Record<CandidateEntityType, readonly string[]>> = {`,
    `  vacation_destination: [`,
    `    "Destination editorial fields and facets reviewed",`,
    `    "Destination readiness checks pass against imported practical content",`,
    `  ],`,
    `  attraction: [`,
    `    "Customer-facing summary reviewed against the cited source",`,
    `    "Current visit and Shabbos suitability checked before public release",`,
    `  ],`,
    `  stay_anchor: [`,
    `    "Published anchor coordinates and customer note supplied from a primary source",`,
    `    "Editorial review confirms the anchor remains useful for Where to stay",`,
    `  ],`,
    `  practical_travel_resource: [`,
    `    "Resource scope and current access route reviewed",`,
    `    "Editorial review confirms practical framing only",`,
    `  ],`,
    `  kosher_travel_resource: [`,
    `    "Resource scope and current access route reviewed",`,
    `    "Editorial review confirms it is not presented as a food or accommodation provider",`,
    `  ],`,
    `};`,
    ``,
    `function sourceDraft(`,
    `  input: Omit<CandidateInput, "publicationReadiness" | "requiredBeforePublication">,`,
    `): WhiteGloveGlobalCandidate {`,
    `  return sourceBackedCandidate(sourceCatalog, {`,
    `    ...input,`,
    `    publicationReadiness: "NEEDS_REVIEW",`,
    `    requiredBeforePublication: requiredBeforePublication[input.entityType],`,
    `  });`,
    `}`,
    ``,
    `/** Private NEEDS_REVIEW Americas / Asia-Pacific / Africa editorial candidates. */`,
    `export const whiteGloveGlobalCandidates: readonly WhiteGloveGlobalCandidate[] = [`,
    ...rows.map(emitGlobalCandidate),
    `];`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(ROOT, "data/imports/white-glove-global-batch/candidates.ts"), body);
}

const europeRows = dedupeRows(europeMarkets);
const globalRows = dedupeRows(globalMarkets);

writeEuropeSources();
writeEuropeCandidates(europeRows);
writeGlobalCandidates(globalRows);
// validate.ts / validation.test.ts are hand-maintained — do not overwrite.

console.log(
  JSON.stringify(
    {
      europe: europeRows.length,
      global: globalRows.length,
      worldwideKnown: 152,
      curatedApprox: 22,
      grandApprox: europeRows.length + globalRows.length + 152 + 22,
    },
    null,
    2,
  ),
);
