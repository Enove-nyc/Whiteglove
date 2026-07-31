// Directory of service providers travelers can look up — tour operators,
// vacation planners, travel agencies, and guides/drivers. Feeds the DB seed
// (lib/seed-data.ts): on "Set up database" these become editable
// DirectoryProvider rows shown at /directory and editable at /admin/directory.
//
// IMPORTANT: everything here is gathered from public web sources and should be
// confirmed by the owner before travelers rely on it (contacts change). Each
// entry carries a `source`.

export type ProviderCat =
  | "TOUR_OPERATOR"
  | "VACATION_PLANNER"
  | "TRAVEL_AGENCY"
  | "GUIDE_DRIVER";

export type DirectoryProviderSeed = {
  slug: string;
  name: string;
  category: ProviderCat;
  tagline?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  basedIn?: string;
  regions?: string[];
  languages?: string[];
  specialties?: string[];
  featured?: boolean;
  source?: string;
};

/**
 * One provider as a public page sees it.
 *
 * Lives here rather than in lib/directory.ts because the components that
 * render it run in the browser. Importing it from the read layer dragged that
 * whole module — and through it Prisma and the Redis client — into the client
 * bundle. Nothing leaked, because Next replaces a non-NEXT_PUBLIC env var with
 * undefined, but shipping the server's data access to a browser is one careless
 * default away from being a real problem.
 */
export type PublicProvider = {
  slug: string;
  name: string;
  category: ProviderCat;
  tagline: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  basedIn: string | null;
  regions: string[];
  languages: string[];
  specialties: string[];
  featured: boolean;
  source: string | null;
  /** Set when a number is held on file but may not be published. */
  contactWithheld: boolean;
  /** When somebody last checked this listing. Null unless it was checked. */
  verifiedAt: string | null;
  /** How quickly they answer, in their own words. */
  responseTime: string | null;
};

export const PROVIDER_CATEGORY_LABELS: Record<ProviderCat, { english: string; yiddish: string }> = {
  TOUR_OPERATOR: { english: "Tour operators", yiddish: "טור־אָפּעראַטאָרן" },
  VACATION_PLANNER: { english: "Vacation planners", yiddish: "וואַקאַציע־פּלאַנירער" },
  TRAVEL_AGENCY: { english: "Travel agencies", yiddish: "רייזע־אַגענטורן" },
  GUIDE_DRIVER: { english: "Guides & drivers", yiddish: "גיידס און דרייווערס" },
};

export const PROVIDER_CATEGORY_ORDER: ProviderCat[] = [
  "TOUR_OPERATOR",
  "VACATION_PLANNER",
  "TRAVEL_AGENCY",
  "GUIDE_DRIVER",
];

// Researched providers. Filled from web research; owner-verifiable in the admin
// directory editor. Each carries a source; confirm contacts before relying.
export const directoryProviders: DirectoryProviderSeed[] = [
  // ---- Tour operators / organizers ----------------------------------
  {
    slug: "breslov-research-uman",
    name: "Breslov Research Institute — Uman",
    category: "TOUR_OPERATOR",
    tagline: "Rosh Hashanah and year-round trips to Rebbe Nachman's tziyun",
    description: "Breslov organization running organized Uman programs, with hotels a short walk from the tziyun, private mikvahs, an in-house beis medrash, and group Shabbos/Yom Tov meals.",
    phone: "+972-53-315-8007",
    whatsapp: "+972-53-315-8007",
    website: "https://breslov.org/the-uman-experience-for-men-women/",
    basedIn: "Uman, Ukraine",
    regions: ["Uman", "Ukraine"],
    languages: ["English"],
    specialties: ["Uman", "Rebbe Nachman", "Rosh Hashanah", "groups"],
    source: "https://breslov.org/the-uman-experience-for-men-women/",
  },
  {
    slug: "momentum-tours",
    name: "Momentum Tours & Travel",
    category: "TOUR_OPERATOR",
    tagline: "Jewish heritage tours to Ukraine, Europe and beyond",
    description: "Jewish heritage tour operator with set departures and tailor-made itineraries, including Ukraine routes (Kiev, Uman, Medzhibizh) and heritage tours in Poland, Hungary and the Baltics.",
    phone: "+1-305-466-0652",
    email: "travel@momentumtours.com",
    website: "https://www.momentumtours.com/",
    basedIn: "Miami, Florida, USA",
    regions: ["Ukraine", "Poland", "Hungary", "Baltics", "Israel"],
    specialties: ["heritage tours", "kivrei tzaddikim", "Uman", "groups"],
    source: "https://www.momentumtours.com/jewish-heritage-tours-ukraine/",
  },
  {
    slug: "european-jewish-heritage-tours",
    name: "European Jewish Heritage Tours",
    category: "TOUR_OPERATOR",
    tagline: "Customized private Jewish and kosher tours in Europe",
    description: "Paris-based operator creating customized private Jewish and kosher tours and events across Europe — heritage sites, cemeteries and synagogues, plus kosher resort stays.",
    phone: "+33-1-40-90-00-48",
    website: "https://www.europeanjewishtours.com/",
    basedIn: "Paris, France",
    regions: ["France", "Poland", "Hungary", "Italy", "Spain"],
    specialties: ["Europe heritage", "kosher tours", "private tours", "cemeteries"],
    source: "https://www.europeanjewishtours.com/contact/",
  },
  {
    slug: "zadikim-tours-europe",
    name: "Zadikim Tours in Europe",
    category: "TOUR_OPERATOR",
    tagline: "Transport & trip planning to kivrei tzaddikim in Eastern Europe",
    description: "Transportation and trip planning to kivrei tzaddikim across Ukraine and Eastern Europe using SUVs and minivans (up to 9 passengers); routes can combine Ukraine, Romania, Hungary and Poland, with hotel and kosher food arrangeable.",
    whatsapp: "+49-176-2084-5707",
    email: "yoin18@yahoo.com",
    website: "https://sites.google.com/site/zadikimtoursineurope/",
    regions: ["Ukraine", "Poland", "Hungary", "Romania"],
    languages: ["English", "Hebrew", "German"],
    specialties: ["kivrei tzaddikim", "private transport", "custom routes"],
    source: "https://sites.google.com/site/zadikimtoursineurope/ukraine-1",
  },
  {
    slug: "nesiah-travel",
    name: "Nesiah Travel",
    category: "TOUR_OPERATOR",
    tagline: "Uman Rosh Hashanah specialists — flights, trips, transport",
    description: "Travel agency offering a full range of services to Uman for Rosh Hashanah — flights, organized trips and personalized transportation — plus Israel and other Jewish-travel itineraries.",
    phone: "+1-845-444-8785",
    email: "dovi123@aol.com",
    website: "https://www.nesiahtravel.com/",
    basedIn: "New York, USA",
    regions: ["Uman", "Ukraine", "Israel"],
    specialties: ["Uman", "Rosh Hashanah", "flights", "groups"],
    source: "https://www.nesiahtravel.com/trip-categories/uman-rosh-hashana",
  },
  {
    slug: "do-all-travel",
    name: "Do All Travel",
    category: "TOUR_OPERATOR",
    tagline: "Discounted flights, hotels and trips — including Uman",
    description: "Brooklyn-based travel agency serving the frum community with discounted flights, hotels, trips and tours, including dedicated Uman Rosh Hashanah travel.",
    phone: "+1-718-972-6000",
    website: "https://doalltravel.com/",
    basedIn: "Brooklyn, New York, USA",
    regions: ["Uman", "Ukraine", "Worldwide"],
    specialties: ["Uman", "flights", "hotels", "groups"],
    source: "https://doalltravel.com/content/uman",
  },

  // ---- Vacation planners / concierges -------------------------------
  {
    slug: "kosher-travelers",
    name: "Kosher Travelers",
    category: "VACATION_PLANNER",
    tagline: "Luxury kosher vacations and Jewish heritage tours worldwide",
    description: "Veteran kosher travel operator building custom itineraries — accommodations, kosher dining, transportation and holiday arrangements — across dozens of countries, with Shabbat programs and a Jewish Heritage Tours department.",
    phone: "+972-2-992-9801",
    email: "info@koshertravelers.com",
    website: "https://koshertravelers.com/",
    basedIn: "Modi'in, Israel",
    regions: ["Israel", "Europe", "Worldwide"],
    languages: ["English", "Hebrew"],
    specialties: ["luxury", "heritage tours", "Pesach programs", "family trips", "cruises"],
    source: "https://koshertravelers.com/contact/",
  },
  {
    slug: "bespoke-kosher-travel",
    name: "Bespoke Kosher Travel",
    category: "VACATION_PLANNER",
    tagline: "Tailor-made luxury kosher holidays",
    description: "A bespoke kosher tour operator designing fully customized trips worldwide — flights, accommodation, transfers, tours and every kosher requirement, from business-trip meal logistics to honeymoons and organized tours.",
    phone: "+44-20-3151-1660",
    email: "info@bespokekoshertravel.com",
    website: "https://bespokekoshertravel.com/",
    basedIn: "London, UK",
    regions: ["Worldwide"],
    specialties: ["luxury", "honeymoons", "family trips", "kosher meal logistics"],
    source: "https://bespokekoshertravel.com/contact/",
  },
  {
    slug: "mg-kosher-trips",
    name: "MG Kosher Trips",
    category: "VACATION_PLANNER",
    tagline: "Gourmet luxury kosher trips in Europe",
    description: "Curated luxury kosher vacations for families and private groups in top European destinations — high-end villas, gourmet kosher dining, private chefs and drivers, and full concierge service.",
    website: "https://mgkoshertrips.com/",
    basedIn: "Saint-Tropez, France",
    regions: ["French Riviera", "Tuscany", "Europe"],
    specialties: ["luxury", "gourmet dining", "private villas", "family trips"],
    source: "https://www.gokosher.com/en/v95870",
  },
  {
    slug: "kesher-tours",
    name: "Kesher Tours",
    category: "VACATION_PLANNER",
    tagline: "Travel the world the Jewish way",
    description: "Long-running operator of kosher tours, cruises and vacations for families, singles and groups, with Shabbat- and holiday-observant itineraries worldwide.",
    phone: "+1-212-481-3721",
    email: "keshertours@verizon.net",
    website: "https://keshertours.com/",
    basedIn: "New York, NY, USA",
    regions: ["Worldwide"],
    specialties: ["tours", "cruises", "family trips", "singles"],
    source: "https://keshertours.com/contact/",
  },
  {
    slug: "gourmet-kosher-safaris",
    name: "Gourmet Kosher Safaris",
    category: "VACATION_PLANNER",
    tagline: "Luxury kosher travel to the world's wild places",
    description: "Meticulously planned luxury kosher safaris and exotic tours — from Argentina's glaciers to Kenya's wildlife migrations — with gourmet kosher cuisine and personal service.",
    phone: "+972-52-392-1883",
    website: "https://www.gourmetkoshersafaris.com/",
    basedIn: "Israel",
    regions: ["Africa", "South America", "Worldwide"],
    specialties: ["luxury", "safaris", "gourmet dining", "adventure travel"],
    source: "https://www.gourmetkoshersafaris.com/contact",
  },
  {
    slug: "kosher-vacation-experts",
    name: "Kosher Vacation Experts",
    category: "VACATION_PLANNER",
    tagline: "Hassle-free kosher vacation planning",
    description: "Vacation planners, logistics experts, trip leaders, kosher chefs, mashgichim and travel agents who arrange everything from couples' getaways to multi-family trips with specific kosher needs.",
    website: "https://koshervacationexperts.com/",
    basedIn: "Forest Hills, Queens, NY, USA",
    regions: ["USA", "Worldwide"],
    specialties: ["family trips", "couples getaways", "ski", "women's retreats"],
    source: "https://koshervacationexperts.com/about/",
  },
  {
    slug: "kmr-tours",
    name: "KMR Luxury Kosher Vacations",
    category: "VACATION_PLANNER",
    tagline: "Five-star kosher vacation programs",
    description: "Year-round luxury family vacation programs with five-star accommodations, world-class kosher catering and supervision, full children's programming, and top-tier entertainment.",
    phone: "+1-718-778-4241",
    whatsapp: "+1-718-395-9040",
    email: "kmr@kmrtours.com",
    website: "https://www.kmrtours.com/",
    basedIn: "New York, USA",
    regions: ["USA", "Worldwide"],
    specialties: ["luxury", "Pesach programs", "family trips", "holiday programs"],
    source: "https://www.kmrtours.com/contact-us/",
  },

  // ---- Travel agencies ----------------------------------------------
  {
    slug: "crown-travel",
    name: "Crown Travel",
    category: "TRAVEL_AGENCY",
    tagline: "Israel & luxury travel experts",
    description: "Crown Heights agency serving Chabad shluchim, yeshivas, seminaries and families with Israel flights, group travel and VIP logistics for 35+ years.",
    phone: "+1-718-493-1111",
    website: "https://crowntravel.com/",
    basedIn: "Brooklyn (Crown Heights), NY, USA",
    regions: ["Israel", "Europe", "Worldwide"],
    specialties: ["Israel flights", "yeshiva/seminary travel", "groups", "VIP"],
    source: "https://crowntravel.com/",
  },
  {
    slug: "farebreakers-travel",
    name: "Farebreakers Travel",
    category: "TRAVEL_AGENCY",
    tagline: "Discounted airline tickets to all destinations",
    description: "Family-run Brooklyn ticket office (est. 1995) selling airline tickets worldwide, specializing in cheaper fares for heavily booked or sold-out flights.",
    phone: "+1-718-758-3600",
    basedIn: "Brooklyn, NY (1717 Avenue M), USA",
    regions: ["Worldwide"],
    specialties: ["airline tickets", "discount fares", "last-minute"],
    source: "https://myjewishlistings.com/listing/farebreakers-travel-inc-in-brooklyn-new-york-travel-insurance-agency/",
  },
  {
    slug: "gil-travel",
    name: "Gil Travel",
    category: "TRAVEL_AGENCY",
    tagline: "Jewish and kosher travel worldwide for 45+ years",
    description: "Long-established Jewish travel agency handling Israel tours, Jewish heritage trips (including in-depth Eastern Europe itineraries) and worldwide travel for individuals and groups.",
    phone: "+1-215-568-6655",
    website: "https://www.giltravel.com/",
    basedIn: "Philadelphia, PA, USA",
    regions: ["Israel", "Poland", "Hungary", "Europe", "Worldwide"],
    specialties: ["Israel tours", "heritage tours", "groups"],
    source: "https://www.giltravel.com/jewish-heritage-tours/",
  },
  {
    slug: "jewish-travel-agency",
    name: "Jewish Travel Agency",
    category: "TRAVEL_AGENCY",
    tagline: "Customized Jewish itineraries & heritage tours",
    description: "Boutique agency building custom Jewish itineraries, heritage tours and Holocaust research trips for clients worldwide.",
    phone: "+1-877-466-2934",
    website: "https://jewishtravelagency.com/",
    basedIn: "Palm Harbor, FL, USA",
    regions: ["Israel", "Europe", "Worldwide"],
    specialties: ["custom itineraries", "heritage tours", "Holocaust research"],
    source: "https://jewishtravelagency.com/contact-2/",
  },
  {
    slug: "j2-adventures",
    name: "J² Adventures",
    category: "TRAVEL_AGENCY",
    tagline: "The luxury Jewish heritage travel company",
    description: "Tel Aviv-based luxury Jewish travel company creating private and group Jewish heritage journeys to Israel and beyond.",
    website: "https://www.j2adventures.com/",
    basedIn: "Tel Aviv, Israel",
    regions: ["Israel", "Worldwide"],
    specialties: ["luxury heritage tours", "private tours", "groups"],
    source: "https://www.j2adventures.com/about-us/",
  },
  {
    slug: "kosherica",
    name: "Kosherica",
    category: "TRAVEL_AGENCY",
    tagline: "Glatt kosher cruises & Jewish travel",
    description: "Miami Beach operator of glatt kosher cruises, Passover vacations and kosher tour packages worldwide for 25+ years, with full kashrus supervision and Shabbat/holiday programming.",
    phone: "+1-877-724-5567",
    website: "https://kosherica.com/",
    basedIn: "Miami Beach, FL, USA",
    regions: ["Caribbean", "Mediterranean", "Europe", "Worldwide"],
    specialties: ["cruises", "Passover programs", "kosher packages", "groups"],
    source: "https://kosherica.com/contact-kosherica-cruises/",
  },
  {
    slug: "leisure-time-tours",
    name: "Leisure Time Tours",
    category: "TRAVEL_AGENCY",
    tagline: "Luxury kosher Passover & Sukkot programs",
    description: "Long-running kosher travel company (60+ years) operating luxury Passover and Sukkot vacation programs at destinations in the US and abroad.",
    website: "https://www.leisuretimetours.com/passover/",
    basedIn: "New York / New Jersey, USA",
    regions: ["USA", "Israel", "Worldwide"],
    specialties: ["Passover programs", "Sukkot programs", "kosher packages"],
    source: "https://www.leisuretimetours.com/passover/",
  },

  // ---- Tour guides & private drivers --------------------------------
  {
    slug: "alex-dunai",
    name: "Alex Dunai",
    category: "GUIDE_DRIVER",
    tagline: "Jewish genealogy researcher and guide in western Ukraine",
    description: "Lviv-based historian working as a genealogist, guide and translator since the mid-1990s; specializes in archival research and accompanying travelers to ancestral shtetls and Jewish sites across Galicia.",
    email: "dunai@dunai.lviv.ua",
    website: "https://www.alexdunai.com",
    basedIn: "Lviv, Ukraine",
    regions: ["Western Ukraine", "Galicia", "Bukovina"],
    languages: ["English", "Russian", "Polish", "Ukrainian"],
    specialties: ["genealogy", "archival research", "shtetl visits", "translation"],
    source: "https://www.alexdunai.com",
  },
  {
    slug: "rohatyn-jewish-heritage",
    name: "Rohatyn Jewish Heritage",
    category: "GUIDE_DRIVER",
    tagline: "Heritage project and guided tours in Galicia",
    description: "Nonprofit dedicated to recovering and preserving Jewish heritage in Rohatyn, leading heritage-site tours for educators, descendants and researchers in the region.",
    website: "https://rohatynjewishheritage.org",
    basedIn: "Rohatyn, Ukraine",
    regions: ["Western Ukraine", "Galicia"],
    languages: ["English"],
    specialties: ["cemetery preservation", "heritage-site tours", "roots travel"],
    source: "https://rohatynjewishheritage.org/en/info/about/",
  },
  {
    slug: "kerestir-transfer",
    name: "Kerestir Transfer",
    category: "GUIDE_DRIVER",
    tagline: "VIP transfers from Budapest to Kerestir and heritage sites",
    description: "Chauffeur / private transfer service for Jewish pilgrims from Budapest Airport to Reb Shayele's kever in Kerestir and nearby holy sites (Liska, Ujhel, Mád).",
    website: "https://kerestir-transfer.com",
    basedIn: "Budapest, Hungary",
    regions: ["Hungary", "Tokaj region"],
    languages: ["English", "Hungarian"],
    specialties: ["kivrei tzaddikim", "Kerestir transfers", "airport transfers"],
    source: "https://kerestir-transfer.com/",
  },
  {
    slug: "budtransfer",
    name: "BUDtransfer.com",
    category: "GUIDE_DRIVER",
    tagline: "Budapest airport transfers and Kerestir day-tours since 1995",
    description: "Budapest transfer company offering meet-and-greet airport pickups and organized Jewish heritage day-tours to Nagykálló, Sátoraljaújhely, Olaszliszka and Bodrogkeresztúr.",
    email: "info@budtransfer.com",
    website: "https://budtransfer.com",
    basedIn: "Budapest, Hungary",
    regions: ["Hungary", "Tokaj region"],
    languages: ["English", "Hungarian"],
    specialties: ["kivrei tzaddikim", "airport transfers", "group transfers"],
    source: "https://budtransfer.com/en/personally-organized-tours-to-kerestir-bodrogkeresztur",
  },
  {
    slug: "visit-kerestir",
    name: "Visit Kerestir",
    category: "GUIDE_DRIVER",
    tagline: "Daily shuttle from Budapest's Jewish Quarter to Kerestir",
    description: "Transport service organizing visits to Jewish heritage sites, including a daily shuttle from Budapest (Kazinczy Street) to Kerestir.",
    whatsapp: "+36-1-323-7388",
    website: "https://www.visitkerestir.com/en",
    basedIn: "Budapest, Hungary",
    regions: ["Hungary", "Tokaj region"],
    languages: ["English", "Hungarian"],
    specialties: ["Kerestir shuttle", "kivrei tzaddikim"],
    source: "https://www.visitkerestir.com/en/transportation",
  },
  {
    slug: "polin-travel",
    name: "Polin Travel (Dr. Tomasz Cebulski)",
    category: "GUIDE_DRIVER",
    tagline: "Private Jewish guide and genealogy in Kraków and Poland",
    description: "Founded in 2000 by historian Dr. Tomasz Cebulski, offering academically designed private tours of Auschwitz-Birkenau, Kraków/Kazimierz and Jewish heritage sites, plus genealogy and archival research.",
    website: "https://jewish-guide.pl",
    basedIn: "Kraków, Poland",
    regions: ["Poland", "Central Europe"],
    languages: ["English", "Polish"],
    specialties: ["genealogy", "Auschwitz guiding", "heritage tours"],
    source: "https://jewish-guide.pl/",
  },
  {
    slug: "malarek-tour-poland",
    name: "Malarek Tour Poland",
    category: "GUIDE_DRIVER",
    tagline: "Family-run private guides, transfers and genealogy",
    description: "Family-owned business (30+ years) providing private guided tours of the Auschwitz Memorial, Polish Jewish heritage sites, genealogy research and private transport across southern Poland.",
    phone: "+48-601-815-687",
    website: "https://tours-krakow.com",
    basedIn: "Oświęcim, Poland",
    regions: ["Poland", "Southern Poland"],
    languages: ["English", "Polish"],
    specialties: ["Auschwitz guiding", "heritage tours", "genealogy", "private transport"],
    source: "https://tours-krakow.com/contact-us/",
  },
  {
    slug: "enjoy-slovakia-dmc",
    name: "Enjoy Slovakia DMC",
    category: "GUIDE_DRIVER",
    tagline: "Slovak Jewish Heritage tours",
    description: "Destination management company running Slovak Jewish Heritage tours with the Slovak Jewish Heritage Center — synagogues, cemeteries and communities across Slovakia.",
    website: "https://www.enjoyslovakia.com",
    basedIn: "Slovakia",
    regions: ["Slovakia"],
    languages: ["English", "Slovak"],
    specialties: ["Slovak Jewish heritage route", "synagogues & cemeteries", "guided tours"],
    source: "https://www.enjoyslovakia.com/what-we-do/special-interest-tours/slovak-jewish-heritage-tour/",
  },
  {
    slug: "danny-the-digger",
    name: "Danny the Digger (Danny Herman)",
    category: "GUIDE_DRIVER",
    tagline: "Private licensed tour guide and archaeologist in Israel",
    description: "Jerusalem-based archaeologist and private tour guide offering premium private and helicopter tours across Israel, including kivrei tzaddikim itineraries to the northern holy tombs.",
    email: "info@dannythedigger.com",
    website: "https://dannythedigger.com",
    basedIn: "Jerusalem, Israel",
    regions: ["Israel"],
    languages: ["English", "Hebrew"],
    specialties: ["kivrei tzaddikim", "archaeology tours", "private guiding"],
    source: "https://dannythedigger.com/contact-us/",
  },
  {
    slug: "guided-tours-of-israel",
    name: "Guided Tours of Israel",
    category: "GUIDE_DRIVER",
    tagline: "Private Kivrei Tzadikim and frum-oriented tours of Israel",
    description: "Private touring agency offering full-day Kivrei Tzadikim tours with a private guide and personalized itinerary, including the northern kevarim circuit (Meron, Tzfat, Tiveria, Amuka).",
    phone: "+1-800-401-9207",
    email: "ns@guidedtoursofisrael.com",
    website: "https://guidedtoursofisrael.com",
    basedIn: "Israel",
    regions: ["Israel"],
    languages: ["English", "Hebrew"],
    specialties: ["kivrei tzaddikim", "frum travel", "private tours"],
    source: "https://guidedtoursofisrael.com/kivrei-tzadikim",
  },
];
