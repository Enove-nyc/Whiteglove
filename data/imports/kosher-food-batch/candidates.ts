import harvestedRows from "./_harvested.json";
import { collapseKosherFoodDraft } from "./dedupe";
import {
  KOSHER_FOOD_REVIEW_GATES,
  slugify,
  sourceBackedCandidate,
  type CandidateInput,
  type FoodCategory,
  type KosherFoodCandidate,
} from "./schema";
import { sourceCatalog } from "./sources";

type Row = {
  market: string;
  slug: string;
  name: string;
  aliases?: readonly string[];
  keywords: readonly string[];
  locality: string;
  destination: string;
  country: string;
  address: string;
  category: FoodCategory;
  sourceKey: keyof typeof sourceCatalog;
  website?: string;
  kosherSourceUrl?: string;
  summary: string;
};

type HarvestedRow = {
  sourceKey: string;
  name: string;
  address: string;
  locality: string;
  destination: string;
  country: string;
  category: string;
  listingUrl: string;
  website: string | null;
  type: string;
  summary: string;
};

function food(row: Row): KosherFoodCandidate {
  const source = sourceCatalog[row.sourceKey];
  const input: CandidateInput = {
    market: row.market,
    entityType: "kosher_food_listing",
    importKind: "KOSHER_FOOD",
    category: row.category,
    listingLabel: "Kosher food",
    slug: row.slug,
    name: row.name,
    aliases: row.aliases ?? [row.name],
    keywords: row.keywords,
    locality: row.locality,
    destination: row.destination,
    country: row.country,
    address: row.address,
    summary: row.summary,
    website: row.website,
    kosherClaim: "reported",
    kosherSourceUrl: row.kosherSourceUrl || source.url,
    sourceKey: row.sourceKey,
    publicationReadiness: "NEEDS_REVIEW",
    requiredBeforePublication: KOSHER_FOOD_REVIEW_GATES,
  };
  return sourceBackedCandidate(sourceCatalog, input);
}

function harvestedFood(row: HarvestedRow): KosherFoodCandidate | null {
  if (!(row.sourceKey in sourceCatalog)) return null;
  if (/type_text|color_link_inherit|<|>/.test(row.address || "")) return null;
  const category = (
    ["Restaurant", "Bakery", "Butcher", "Grocery", "Takeaway", "Cafe"].includes(row.category)
      ? row.category
      : "Restaurant"
  ) as FoodCategory;
  const typeBits = `${row.type} ${row.category}`.toLocaleLowerCase("en");
  const keywords = ["kosher", category.toLowerCase(), ...typeBits.split(/[^a-z]+/).filter((bit) => bit.length > 2)].slice(0, 8);
  return food({
    market: `${row.country}-${row.locality}`,
    slug: slugify(`${row.sourceKey}-${row.name}-${row.address || row.listingUrl}`).slice(0, 80),
    name: row.name,
    keywords: keywords.length ? keywords : ["kosher"],
    locality: row.locality,
    destination: row.destination || row.locality,
    country: row.country,
    address: row.address || `${row.name}, listed by the cited kosher directory`,
    category,
    sourceKey: row.sourceKey as keyof typeof sourceCatalog,
    website: row.website || undefined,
    kosherSourceUrl: row.listingUrl,
    summary: row.summary,
  });
}

/**
 * Named kosher establishments already sourced in this repo or on community
 * food directories this site already cites. Private NEEDS_REVIEW only.
 * Draft list is collapsed by `collapseKosherFoodDraft` before export.
 */
const handDraft: KosherFoodCandidate[] = [
  food({
    market: "hungary-budapest",
    slug: "tel-aviv-cafe",
    name: "Tel Aviv Cafe",
    keywords: ["kosher", "dairy", "restaurant"],
    locality: "Budapest",
    destination: "Budapest",
    country: "Hungary",
    address: "28 Kazinczy utca, Budapest, Hungary",
    category: "Restaurant",
    sourceKey: "chabad-budapest-food",
    summary: "Dairy kosher restaurant on Kazinczy utca, listed on Chabad of Budapest’s kosher food directory.",
  }),
  food({
    market: "hungary-budapest",
    slug: "carmel",
    name: "Carmel",
    aliases: ["Carmel Glatt Kosher Restaurant"],
    keywords: ["kosher", "meat", "restaurant"],
    locality: "Budapest",
    destination: "Budapest",
    country: "Hungary",
    address: "31 Kazinczy utca, Budapest, Hungary",
    category: "Restaurant",
    sourceKey: "chabad-budapest-carmel",
    website: "https://chabadhungary.com/en/food/92/",
    summary: "Meat kosher restaurant on Kazinczy utca, listed on Chabad of Budapest’s kosher food directory.",
  }),
  food({
    market: "hungary-budapest",
    slug: "meetup",
    name: "Meetup",
    keywords: ["kosher", "meat", "restaurant"],
    locality: "Budapest",
    destination: "Budapest",
    country: "Hungary",
    address: "4 Nagy Diófa utca, Budapest, Hungary",
    category: "Restaurant",
    sourceKey: "chabad-budapest-food",
    summary: "Meat kosher restaurant on Nagy Diófa utca, listed on Chabad of Budapest’s kosher food directory.",
  }),
  food({
    market: "hungary-budapest",
    slug: "brooklyn-bagel",
    name: "Brooklyn Bagel",
    keywords: ["kosher", "dairy", "restaurant"],
    locality: "Budapest",
    destination: "Budapest",
    country: "Hungary",
    address: "1 Újpesti rakpart, Budapest, Hungary",
    category: "Restaurant",
    sourceKey: "chabad-budapest-food",
    summary: "Dairy kosher restaurant on Újpesti rakpart, listed on Chabad of Budapest’s kosher food directory.",
  }),
  food({
    market: "hungary-budapest",
    slug: "falafel-bar",
    name: "Falafel bar",
    keywords: ["kosher", "meat", "parve", "restaurant"],
    locality: "Budapest",
    destination: "Budapest",
    country: "Hungary",
    address: "30 Wesselényi utca, Budapest, Hungary",
    category: "Restaurant",
    sourceKey: "chabad-budapest-food",
    summary: "Kosher restaurant on Wesselényi utca, listed on Chabad of Budapest’s kosher food directory.",
  }),
  food({
    market: "hungary-budapest",
    slug: "hanna",
    name: "Hanna Orthodox Kosher Restaurant",
    aliases: ["Hanna"],
    keywords: ["kosher", "meat", "parve", "restaurant"],
    locality: "Budapest",
    destination: "Budapest",
    country: "Hungary",
    address: "29 Kazinczy utca, Budapest, Hungary",
    category: "Restaurant",
    sourceKey: "chabad-budapest-hanna",
    website: "https://chabadhungary.com/en/food/864/",
    summary: "Orthodox-supervised kosher restaurant in the Kazinczy synagogue courtyard, listed on Chabad of Budapest’s food directory.",
  }),
  food({
    market: "hungary-budapest",
    slug: "marrakesh",
    name: "Marrakesh kosher restaurant",
    keywords: ["kosher", "meat", "restaurant"],
    locality: "Budapest",
    destination: "Budapest",
    country: "Hungary",
    address: "30 Wesselényi utca, Budapest, Hungary",
    category: "Restaurant",
    sourceKey: "chabad-budapest-food",
    summary: "Meat kosher restaurant on Wesselényi utca, listed on Chabad of Budapest’s kosher food directory.",
  }),
  food({
    market: "hungary-budapest",
    slug: "hummusbar-kosher",
    name: "hummusbar kosher",
    keywords: ["kosher", "parve", "restaurant"],
    locality: "Budapest",
    destination: "Budapest",
    country: "Hungary",
    address: "14 Wesselényi utca, Budapest, Hungary",
    category: "Restaurant",
    sourceKey: "chabad-budapest-food",
    summary: "Parve kosher restaurant on Wesselényi utca, listed on Chabad of Budapest’s kosher food directory.",
  }),
  food({
    market: "hungary-budapest",
    slug: "shuk-hacarmel",
    name: "Shuk HaCarmel",
    aliases: ["שוק הכרמל", "Shuk HaCarmel"],
    keywords: ["kosher", "parve", "meat", "restaurant"],
    locality: "Budapest",
    destination: "Budapest",
    country: "Hungary",
    address: "32 Kazinczy utca, Budapest, Hungary",
    category: "Restaurant",
    sourceKey: "chabad-budapest-food",
    summary: "Kosher restaurant on Kazinczy utca, listed on Chabad of Budapest’s kosher food directory.",
  }),
  food({
    market: "hungary-budapest",
    slug: "uptown-kosher-bakery",
    name: "Uptown kosher bakery",
    keywords: ["kosher", "dairy", "parve", "bakery"],
    locality: "Budapest",
    destination: "Budapest",
    country: "Hungary",
    address: "4 Nagy Diófa utca, Budapest, Hungary",
    category: "Bakery",
    sourceKey: "chabad-budapest-food",
    summary: "Kosher bakery on Nagy Diófa utca, listed on Chabad of Budapest’s kosher food directory.",
  }),
  food({
    market: "hungary-budapest",
    slug: "kosher-market",
    name: "Kosher market",
    keywords: ["kosher", "grocery", "shop"],
    locality: "Budapest",
    destination: "Budapest",
    country: "Hungary",
    address: "36 Dohány utca, Budapest, Hungary",
    category: "Grocery",
    sourceKey: "chabad-budapest-food",
    summary: "Kosher product store on Dohány utca, listed on Chabad of Budapest’s kosher food directory.",
  }),
  food({
    market: "hungary-budapest",
    slug: "kurotosh-kosher-ice-cream",
    name: "Kurotosh and Kosher Ice Cream Shop",
    keywords: ["kosher", "dairy", "parve", "cafe"],
    locality: "Budapest",
    destination: "Budapest",
    country: "Hungary",
    address: "21 Nagy Diófa utca, Budapest, Hungary",
    category: "Cafe",
    sourceKey: "chabad-budapest-food",
    summary: "Kosher ice cream shop on Nagy Diófa utca, listed on Chabad of Budapest’s kosher food directory.",
  }),
  food({
    market: "poland-warsaw",
    slug: "kosher-delight",
    name: "Kosher Delight",
    keywords: ["kosher", "meat", "parve", "restaurant"],
    locality: "Warsaw",
    destination: "Warsaw",
    country: "Poland",
    address: "ul. Grzybowska 2, 1st floor, 00-131 Warszawa",
    category: "Restaurant",
    sourceKey: "chabad-poland-kosher-delight",
    summary: "Kosher restaurant near the Nożyk Synagogue, listed on Chabad Poland’s food directory.",
  }),
  food({
    market: "poland-warsaw",
    slug: "chabad-kitchen",
    name: "Chabad of Warsaw — kosher kitchen",
    keywords: ["kosher", "catering", "shabbos"],
    locality: "Warsaw",
    destination: "Warsaw",
    country: "Poland",
    address: "ul. Zygmunta Słomińskiego 19, 00-195 Warszawa",
    category: "Takeaway",
    sourceKey: "chabad-poland-food",
    website: "https://chabad.org.pl",
    summary: "Chabad Warsaw kosher kitchen and catering, including Shabbos meals arranged in advance.",
  }),
  food({
    market: "poland-krakow",
    slug: "chabad-store",
    name: "Chabad Kraków kosher store",
    keywords: ["kosher", "grocery", "shop"],
    locality: "Kraków",
    destination: "Kraków",
    country: "Poland",
    address: "ul. św. Sebastiana 23, 31-039 Kraków",
    category: "Grocery",
    sourceKey: "chabad-krakow-food",
    summary: "Chabad Kraków kosher store, named on Chabad’s kosher food page.",
  }),
  food({
    market: "poland-krakow",
    slug: "kosher-delight",
    name: "Kosher Delight",
    keywords: ["kosher", "restaurant", "kazimierz"],
    locality: "Kraków",
    destination: "Kraków",
    country: "Poland",
    address: "ul. Kupa 18, Kraków",
    category: "Restaurant",
    sourceKey: "chabad-krakow-food",
    summary: "Kosher dining hall on ul. Kupa in Kazimierz, named on Chabad Kraków’s kosher food page.",
  }),
  food({
    market: "poland-krakow",
    slug: "falafel-shelanu",
    name: "Falafel Shelanu",
    keywords: ["kosher", "takeaway"],
    locality: "Kraków",
    destination: "Kraków",
    country: "Poland",
    address: "ul. Berka Joselewicza 9, Kraków",
    category: "Takeaway",
    sourceKey: "chabad-krakow-food",
    summary: "Kosher takeaway in Kazimierz, named on Chabad Kraków’s kosher food page.",
  }),
  food({
    market: "poland-lublin",
    slug: "olive-restaurant",
    name: "The Olive Restaurant",
    keywords: ["kosher", "hotel", "restaurant"],
    locality: "Lublin",
    destination: "Lublin",
    country: "Poland",
    address: "ul. Lubartowska 85, Lublin",
    category: "Restaurant",
    sourceKey: "hotel-ilan-olive",
    website: "https://www.hotelilan.pl/en/the-olive-restaurant",
    summary: "Certified kosher restaurant at Hotel Ilan, by reservation.",
  }),
  food({
    market: "austria-vienna",
    slug: "chabad-food",
    name: "Chabad Vienna kosher food",
    keywords: ["kosher", "takeaway", "leopoldstadt"],
    locality: "Vienna",
    destination: "Vienna",
    country: "Austria",
    address: "Taborstraße 20A, 1020 Vienna",
    category: "Takeaway",
    sourceKey: "chabad-vienna-food",
    summary: "Chabad Vienna kosher food counter in Leopoldstadt.",
  }),
  food({
    market: "hungary-debrecen",
    slug: "hamsza",
    name: "Hamsza Glatt Kosher Restaurant",
    aliases: ["Hamsza"],
    keywords: ["kosher", "meat", "restaurant"],
    locality: "Debrecen",
    destination: "Debrecen",
    country: "Hungary",
    address: "Piac utca 5-7, Debrecen",
    category: "Restaurant",
    sourceKey: "hamsza-debrecen",
    website: "https://www.hamszadebrecen.hu/en",
    summary: "Glatt kosher restaurant in Debrecen, under Chabad of Debrecen supervision as recorded on this site.",
  }),
  food({
    market: "slovakia-bratislava",
    slug: "chabad-kosher",
    name: "Chabad of Slovakia — kosher food",
    keywords: ["kosher", "grocery", "advance-order"],
    locality: "Bratislava",
    destination: "Bratislava",
    country: "Slovakia",
    address: "Kozia 25, Bratislava",
    category: "Grocery",
    sourceKey: "jewish-slovakia-kosher",
    website: "https://www.chabadslovakia.com/?lang=en",
    summary: "Kosher products and meals by advance order through Chabad of Slovakia.",
  }),
  food({
    market: "slovakia-kosice",
    slug: "community-cafeteria",
    name: "Košice community kosher cafeteria and butcher",
    keywords: ["kosher", "butcher", "cafeteria"],
    locality: "Košice",
    destination: "Košice",
    country: "Slovakia",
    address: "Zvonárska 5 / Krmanová 4, 040 01 Košice",
    category: "Butcher",
    sourceKey: "jguide-kosice",
    summary: "Kosher cafeteria and butcher in the Košice Jewish community compound. Pre-order.",
  }),
  food({
    market: "hungary-kerestir",
    slug: "guest-house-kitchen",
    name: "Reb Shayele's Guest House kitchen",
    keywords: ["kosher", "guest-house", "meals"],
    locality: "Bodrogkeresztúr",
    destination: "Bodrogkeresztúr",
    country: "Hungary",
    address: "Kossuth Lajos u. 67, Bodrogkeresztúr",
    category: "Restaurant",
    sourceKey: "reb-shayele",
    website: "https://rebshayele.org/",
    summary: "Kosher kitchen at Reb Shayele’s Guest House in Kerestir.",
  }),
  food({
    market: "ukraine-ivano-frankivsk",
    slug: "tzimmes-lounge",
    name: "Tzimmes Lounge",
    keywords: ["kosher", "restaurant", "chabad"],
    locality: "Ivano-Frankivsk",
    destination: "Ivano-Frankivsk",
    country: "Ukraine",
    address: "Next to the main synagogue, Ivano-Frankivsk",
    category: "Restaurant",
    sourceKey: "lubavitch-ivano-frankivsk",
    summary: "Kosher dining next to the main synagogue, under Rabbi Kolesnik’s supervision.",
  }),
  food({
    market: "ukraine-uzhhorod",
    slug: "chabad-meals",
    name: "Chabad of Uzhgorod — kosher meals",
    keywords: ["kosher", "meals", "reservation"],
    locality: "Uzhhorod",
    destination: "Uzhhorod",
    country: "Ukraine",
    address: "vul. Ruskaya 36, Uzhhorod 88000",
    category: "Takeaway",
    sourceKey: "chabad-uzhgorod",
    summary: "Kosher meals by advance reservation at Chabad of Uzhgorod.",
  }),
  food({
    market: "ukraine-lviv",
    slug: "tsori-gilod-kitchen",
    name: "Kosher kitchen at the Tsori Gilod Synagogue",
    keywords: ["kosher", "synagogue", "kitchen"],
    locality: "Lviv",
    destination: "Lviv",
    country: "Ukraine",
    address: "4 Brativ Mikhnovskykh St., Lviv 79018",
    category: "Takeaway",
    sourceKey: "lviv-tsori-gilod",
    summary: "Kosher kitchen at Lviv’s active synagogue. Arrange meals in advance.",
  }),
  food({
    market: "ukraine-berdychiv",
    slug: "kiryat-kedushat-levi",
    name: "Kiryat Kedushat Levi dining room",
    keywords: ["kosher", "guest-house", "meals"],
    locality: "Berdychiv",
    destination: "Berdychiv",
    country: "Ukraine",
    address: "Kiryat Kedushat Levi guest house, Berdychiv",
    category: "Restaurant",
    sourceKey: "hatzolah-berdychiv",
    summary: "Kosher dining room at the Kiryat Kedushat Levi guest house for pilgrims.",
  }),
  food({
    market: "ukraine-mukachevo",
    slug: "community-kitchen",
    name: "Mukachevo Jewish community kosher kitchen",
    keywords: ["kosher", "community", "kitchen"],
    locality: "Mukachevo",
    destination: "Mukachevo",
    country: "Ukraine",
    address: "Mukachevo Jewish community, Mukachevo",
    category: "Takeaway",
    sourceKey: "jewishgen-mukachevo",
    summary: "Supervised kosher kitchen of the Mukachevo Jewish community. Arrange meals in advance.",
  }),
  food({
    market: "czech-prague",
    slug: "dinitz",
    name: "Dinitz Kosher Restaurant",
    keywords: ["kosher", "restaurant", "josefov"],
    locality: "Prague",
    destination: "Prague",
    country: "Czech Republic",
    address: "Bílkova 869/12, 110 00 Josefov, Prague 1",
    category: "Restaurant",
    sourceKey: "world-jewish-travel-dinitz",
    summary: "Kosher restaurant in Josefov, listed as under the Chief Rabbinate of the Czech Republic.",
  }),
];

const harvestedDraft = (harvestedRows as HarvestedRow[])
  .map(harvestedFood)
  .filter((row): row is KosherFoodCandidate => Boolean(row));

const kosherFoodBatchDraft: readonly KosherFoodCandidate[] = [...handDraft, ...harvestedDraft];
const collapsed = collapseKosherFoodDraft(kosherFoodBatchDraft);

export const kosherFoodDedupeReport = collapsed.report;
export const kosherFoodBatchCandidates: readonly KosherFoodCandidate[] = collapsed.kept;
