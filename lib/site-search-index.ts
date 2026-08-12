/**
 * Server-side searchable index for global search.
 *
 * Built once per process and reused. Owner-published DB rows (attractions,
 * stays, practical listings, quarters, info pages) are merged in when
 * DATABASE_URL is set. Call invalidateSiteSearchIndex() after a publish so the
 * next request rebuilds.
 *
 * The browser never receives this index — only ranked hit rows go over the wire.
 */

import { cemeteries } from "@/data/cemeteries";
import { destinationHaystack, destinationHref as heritageDestinationHref, destinations, getDestination } from "@/data/destinations";
import { HECHSHERIM } from "@/data/hechsherim";
import { kosherEateries } from "@/data/kosher-eateries";
import { services } from "@/data/services";
import { SEASONS, TRIP_THEMES, vacationDestinations } from "@/data/vacation-destinations";
import { getAreaList, getAttractionList, getStayList } from "@/lib/attractions-view";
import { isDisallowedImportSource } from "@/lib/bulk-content";
import { heritageTownHref } from "@/lib/route-migration";
import { extraSpellings, normalize } from "@/lib/place-search";
import { compact } from "@/lib/site-search-match";
import { sectionForKind, type SearchDocument } from "@/lib/site-search-types";
import { allTzaddikim } from "@/lib/tzaddikim";
import { destinationHref as vacationHref } from "@/lib/vacation-ideas";

/** Attach pre-normalised tokens used for fast candidate filtering. */
function finalize(doc: Omit<SearchDocument, "normTokens" | "normCompact">): SearchDocument {
  const parts = [doc.title, ...doc.names, ...doc.keywords, doc.city ?? "", doc.country ?? ""];
  const normTokens = unique(
    parts
      .flatMap((p) => normalize(p).split(" "))
      .filter((t) => t.length > 0),
  );
  const normCompact = unique(
    [doc.title, ...doc.names].map((p) => compact(p)).filter((t) => t.length >= 3),
  );
  return { ...doc, normTokens, normCompact };
}

let cached: SearchDocument[] | null = null;
let building: Promise<SearchDocument[]> | null = null;

/** Drop the in-memory index so the next search rebuilds from current data. */
export function invalidateSiteSearchIndex(): void {
  cached = null;
  building = null;
}

export async function getSearchIndex(): Promise<SearchDocument[]> {
  if (cached) return cached;
  if (building) return building;
  building = buildSearchIndex()
    .then((docs) => {
      cached = docs;
      building = null;
      return docs;
    })
    .catch((error) => {
      building = null;
      throw error;
    });
  return building;
}

type DraftDoc = Omit<SearchDocument, "normTokens" | "normCompact">;

export type PublishedPracticalPlaceSearchRow = {
  id: string;
  category: string;
  name: string;
  address: string | null;
  notes: string | null;
  sourceUrl?: string | null;
  destination: {
    slug: string;
    city: string;
    country: string;
  };
};

/** Pure builder for tests — does not touch the module cache. */
export async function buildSearchIndex(): Promise<SearchDocument[]> {
  const docs: DraftDoc[] = [];

  pushVacationDestinations(docs);
  pushHeritageTowns(docs);
  pushCemeteries(docs);
  pushTzaddikim(docs);
  await pushAttractionsStaysAreas(docs);
  await pushPublishedPracticalPlaces(docs);
  pushEateries(docs);
  pushServices(docs);
  pushSitePages(docs);
  await pushPublishedInfoPages(docs);

  return docs.map(finalize);
}

function pushVacationDestinations(docs: DraftDoc[]) {
  vacationDestinations.forEach((d, index) => {
    const themeLabels = d.themes.map((t) => TRIP_THEMES.find((x) => x.value === t)?.label ?? t);
    const seasonLabels = d.seasons.map((s) => SEASONS.find((x) => x.value === s)?.label ?? s);
    const conceptKeywords = [
      ...d.themes,
      ...themeLabels,
      ...d.seasons,
      ...seasonLabels,
      ...d.bestFor,
      d.region ?? "",
      "vacation",
      "holiday",
      "kosher vacation",
      "shabbos",
      "shabos",
    ];
    // Theme-specific extras so “family beach” / “warm winter” land here —
    // deliberately NOT global “kosher hotel” (that belongs on stays / /hotels).
    if (d.themes.includes("beach")) conceptKeywords.push("beach", "sea", "resort", "sun", "warm winter", "winter sun", "family beach");
    if (d.themes.includes("mountains")) conceptKeywords.push("mountains", "alps", "hiking", "nature", "mountains kosher");
    if (d.themes.includes("city")) conceptKeywords.push("city break", "city");
    if (d.themes.includes("family")) conceptKeywords.push("family", "kids", "children");
    if (d.themes.includes("couples")) conceptKeywords.push("couples", "honeymoon", "romantic");
    if (d.themes.includes("short-break")) conceptKeywords.push("short break", "weekend");
    if (d.seasons.includes("winter")) conceptKeywords.push("winter", "snow");
    if (d.seasons.includes("summer")) conceptKeywords.push("summer", "warm");
    if (d.themes.includes("beach") && d.seasons.includes("winter")) conceptKeywords.push("warm winter", "winter sun");
    if (d.themes.includes("family") && d.themes.includes("beach")) conceptKeywords.push("family beach");

    docs.push({
      id: `vacation-${d.slug}`,
      kind: "Vacation destination",
      section: sectionForKind("Vacation destination"),
      title: d.name,
      subtitle: d.region ? `${d.region} · ${d.country}` : d.country,
      href: vacationHref(d),
      names: [
        d.name,
        d.slug.replace(/-/g, " "),
        ...d.cities,
        d.region ?? "",
        d.country,
        extraSpellings([d.slug, d.name, ...d.cities]),
      ].filter(Boolean),
      keywords: unique(conceptKeywords),
      body: [d.whyGo, d.overview, d.suits, d.bestTime].join(" "),
      city: d.cities[0],
      country: d.country,
      rankWeight: index,
      heritage: false,
      vacation: true,
    });
  });
}

function pushHeritageTowns(docs: DraftDoc[]) {
  destinations.forEach((d, index) => {
    const g = d.guide;
    docs.push({
      id: `heritage-${d.slug}`,
      kind: "Heritage town",
      section: sectionForKind("Heritage town"),
      title: d.city,
      yiddish: d.yiddishCity || undefined,
      subtitle: g?.tzaddik ? `${g.tzaddik} · ${d.country}` : d.country,
      href: d.guide ? `/${d.slug}` : heritageTownHref(d.slug),
      names: [
        d.city,
        d.yiddishCity,
        d.slug.replace(/-/g, " "),
        ...d.aliases,
        g?.tzaddik ?? "",
        g?.yiddishTzaddik ?? "",
        g?.seforim ?? "",
        extraSpellings([d.slug, d.city]),
        destinationHaystack(d),
      ].filter(Boolean),
      keywords: ["heritage", "heritage town", "kever", "tzaddik", "rebbe", "nesios"],
      body: d.summary ?? "",
      city: d.city,
      country: d.country,
      rankWeight: index,
      heritage: true,
      vacation: false,
    });
  });
}

function pushCemeteries(docs: DraftDoc[]) {
  cemeteries.forEach((c, index) => {
    docs.push({
      id: `cemetery-${c.slug}`,
      kind: "Beis hachaim",
      section: sectionForKind("Beis hachaim"),
      title: c.name,
      yiddish: c.yiddishName || c.yiddishCity || undefined,
      subtitle: `${c.city} · ${c.country}`,
      href: `/cemeteries/${c.slug}`,
      names: [
        c.name,
        c.yiddishName,
        c.city,
        c.yiddishCity,
        c.slug.replace(/-/g, " "),
        c.country,
        extraSpellings([c.slug, c.city]),
      ].filter(Boolean),
      keywords: ["beis hachaim", "beit hachaim", "cemetery", "kever", "kevarim", "batei hachaim"],
      body: "",
      city: c.city,
      country: c.country,
      rankWeight: index,
      heritage: true,
      vacation: false,
    });
  });
}

function pushTzaddikim(docs: DraftDoc[]) {
  allTzaddikim().forEach((entry, index) => {
    const { burial, cemetery, slug } = entry;
    docs.push({
      id: `tzaddik-${slug}`,
      kind: "Kever or tzaddik",
      section: sectionForKind("Kever or tzaddik"),
      title: burial.knownAs || burial.name,
      yiddish: burial.yiddishName || undefined,
      subtitle: `${burial.name} · ${cemetery.city}`,
      href: `/tzaddikim/${slug}`,
      names: [
        burial.name,
        burial.knownAs ?? "",
        burial.yiddishName ?? "",
        cemetery.city,
        cemetery.yiddishCity,
        slug.replace(/-/g, " "),
        extraSpellings([cemetery.slug, cemetery.city, burial.name, burial.knownAs]),
      ].filter(Boolean),
      keywords: ["kever", "tzaddik", "rebbe", "yahrzeit", "ohel", "kivrei tzaddikim"],
      body: burial.note ?? "",
      city: cemetery.city,
      country: cemetery.country,
      rankWeight: index,
      heritage: true,
      vacation: false,
    });
  });
}

async function pushAttractionsStaysAreas(docs: DraftDoc[]) {
  const [attractions, stays, areas] = await Promise.all([getAttractionList(), getStayList(), getAreaList()]);

  attractions.forEach((a, index) => {
    docs.push({
      id: `attraction-${a.slug}`,
      kind: "Thing to do",
      section: sectionForKind("Thing to do"),
      title: a.name,
      subtitle: `${a.city} · ${a.country} · ${a.kind}`,
      href: `/things-to-do#${a.slug}`,
      names: [a.name, a.city, a.country, a.kind, a.slug.replace(/-/g, " "), extraSpellings([a.slug, a.city])].filter(Boolean),
      keywords: ["thing to do", "things to do", "attraction", "attractions", "activity", "activities", a.kind, "sightseeing", "museum", "day out"],
      body: a.summary,
      city: a.city,
      country: a.country,
      rankWeight: index,
      heritage: false,
      vacation: false,
    });
  });

  stays.forEach((s, index) => {
    docs.push({
      id: `stay-${s.slug}`,
      kind: "Hotel or stay",
      section: sectionForKind("Hotel or stay"),
      title: s.name,
      subtitle: `${s.city} · ${s.country} · ${s.kind}`,
      href: `/hotels#${s.slug}`,
      names: [s.name, s.city, s.country, s.kind, s.anchor.name, s.slug.replace(/-/g, " "), extraSpellings([s.slug, s.city])].filter(Boolean),
      keywords: [
        "hotel",
        "hotels",
        "kosher hotel",
        "kosher hotels",
        "where to stay",
        "places to stay",
        "seasonal programme",
        "seasonal program",
        s.season ?? "",
        s.kind,
      ].filter(Boolean),
      body: s.summary,
      city: s.city,
      country: s.country,
      rankWeight: index,
      heritage: false,
      vacation: false,
    });
  });

  areas.forEach((a, index) => {
    docs.push({
      id: `area-${a.slug}`,
      kind: "Neighborhood",
      section: sectionForKind("Neighborhood"),
      title: a.name,
      subtitle: `${a.city} · ${a.country}`,
      href: `/hotels#${a.slug}`,
      names: [a.name, a.city, a.country, a.slug.replace(/-/g, " "), extraSpellings([a.slug, a.city])].filter(Boolean),
      keywords: ["neighborhood", "neighbourhood", "quarter", "jewish quarter", "eruv", "walkable", "shabbos"],
      body: a.note,
      city: a.city,
      country: a.country,
      rankWeight: index,
      heritage: false,
      vacation: false,
    });
  });
}

/**
 * Practical listings live on destination pages, so they used to be invisible
 * to global search even after the owner had published them. This is a
 * database-only additive read; with no database the existing static index
 * remains exactly as it was.
 */
async function pushPublishedPracticalPlaces(docs: DraftDoc[]) {
  if (!process.env.DATABASE_URL) return;
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.practicalPlace.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        category: true,
        name: true,
        address: true,
        notes: true,
        sourceUrl: true,
        destination: { select: { slug: true, city: true, country: true } },
      },
      orderBy: [{ destination: { country: "asc" } }, { destination: { city: "asc" } }, { name: "asc" }],
    });
    rows
      .filter((place) => !isDisallowedImportSource({
        sourceUrl: place.sourceUrl ?? "",
        sourceName: "",
        attribution: "",
      }))
      .forEach((place, index) => {
      docs.push(publishedPracticalPlaceSearchDocument(place, index));
      });
  } catch {
    // Search is a navigation aid, not a reason to blank its static index if an
    // optional DB table is temporarily unavailable.
  }
}

/**
 * One published practical listing's global-search representation. Exported so
 * the publish/search contract can be tested without requiring a live database.
 */
export function publishedPracticalPlaceSearchDocument(
  place: PublishedPracticalPlaceSearchRow,
  rankWeight = 0,
): SearchDocument {
  const staticDestination = getDestination(place.destination.slug);
  const vacationDestination = vacationDestinations.find((item) => item.slug === place.destination.slug);
  const href = vacationDestination
    ? vacationHref(vacationDestination)
    : staticDestination
      ? heritageDestinationHref(staticDestination)
      : heritageTownHref(place.destination.slug);
  return finalize({
    id: `practical-${place.id}`,
    kind: "Practical travel",
    section: sectionForKind("Practical travel"),
    title: place.name,
    subtitle: `${place.destination.city} · ${place.destination.country} · ${place.category.replace(/_/g, " ")}`,
    href,
    names: [
      place.name,
      place.destination.city,
      place.destination.country,
      place.category.replace(/_/g, " "),
      extraSpellings([place.destination.slug, place.destination.city, place.name]),
    ].filter(Boolean),
    keywords: [
      "practical travel",
      "travel information",
      place.category.replace(/_/g, " "),
      ...(place.category === "MIKVAH"
        ? ["mikvah", "mikvaos", "mikveh", "mikve", "tvilah", "ritual bath"]
        : place.category === "MINYAN"
          ? ["minyan", "minyanim", "shul", "davening"]
          : []),
    ],
    body: [place.address ?? "", place.notes ?? ""].join(" "),
    city: place.destination.city,
    country: place.destination.country,
    rankWeight,
    heritage: false,
    vacation: Boolean(vacationDestination),
  });
}

function pushEateries(docs: DraftDoc[]) {
  kosherEateries.forEach((e, index) => {
    docs.push({
      id: `eatery-${e.slug}`,
      kind: "Kosher food",
      section: sectionForKind("Kosher food"),
      title: e.name,
      subtitle: `${e.city} · ${e.country} · ${e.kind}`,
      href: `/kosher#${e.slug}`,
      names: [e.name, e.city, e.country, e.kind, e.diet, e.slug.replace(/-/g, " "), extraSpellings([e.slug, e.city])].filter(Boolean),
      keywords: [
        "kosher",
        "kosher food",
        "restaurant",
        "restaurants",
        "bakery",
        "bakeries",
        "grocery",
        "groceries",
        "eatery",
        "food",
        e.kind,
        e.diet,
      ],
      body: e.summary,
      city: e.city,
      country: e.country,
      rankWeight: index,
      heritage: false,
      vacation: false,
    });
  });
}

function pushServices(docs: DraftDoc[]) {
  services.forEach((s, index) => {
    docs.push({
      id: `service-${s.id}`,
      kind: "Service",
      section: sectionForKind("Service"),
      title: s.title,
      subtitle: s.summary,
      href: "/services",
      names: [s.title, s.id.replace(/-/g, " ")],
      keywords: ["service", "travel service", "planning", "white glove", ...s.included.slice(0, 4)],
      body: [s.who, s.summary].join(" "),
      rankWeight: index,
      heritage: false,
      vacation: false,
    });
  });
}

/**
 * Public site pages a traveler might search for by topic — flights, Shabbos,
 * hechsherim, the itinerary planner, and so on. Private/admin/access pages stay out.
 */
function pushSitePages(docs: DraftDoc[]) {
  const pages: Array<{
    id: string;
    kind: SearchDocument["kind"];
    title: string;
    subtitle: string;
    href: string;
    names: string[];
    keywords: string[];
    body?: string;
    rankWeight?: number;
  }> = [
    {
      id: "page-destinations",
      kind: "Site page",
      title: "Vacation destinations",
      subtitle: "Every published kosher vacation idea",
      href: "/destinations",
      names: ["vacation destinations", "destinations", "vacation ideas", "getaways"],
      keywords: ["vacation", "holiday", "where to go"],
    },
    {
      id: "page-hotels",
      kind: "Site page",
      title: "Where to stay",
      subtitle: "Kosher hotels, seasonal programmes and recommended neighborhoods",
      href: "/hotels",
      names: ["where to stay", "hotels", "kosher hotels", "kosher hotel", "places to stay"],
      keywords: ["hotel", "hotels", "kosher hotel", "seasonal programme", "seasonal program"],
    },
    {
      id: "page-things-to-do",
      kind: "Site page",
      title: "Things to do",
      subtitle: "Attractions and days out",
      href: "/things-to-do",
      names: ["things to do", "attractions", "activities", "activity"],
      keywords: ["sightseeing", "attraction", "attractions", "activities", "day out"],
    },
    {
      id: "page-kosher",
      kind: "Site page",
      title: "Kosher food finder",
      subtitle: "Restaurants, bakeries and groceries",
      href: "/kosher",
      names: ["kosher food finder", "kosher food", "kosher restaurants", "bakeries", "groceries"],
      keywords: ["kosher", "restaurant", "bakery", "grocery"],
    },
    {
      id: "page-kosher-travel",
      kind: "Travel guide",
      title: "Kosher travel",
      subtitle: "Food, Shabbos, minyanim, mikvaos and hechsherim",
      href: "/kosher-travel",
      names: ["kosher travel", "shabbos", "shabos", "shabbat", "minyanim", "mikvaos", "mikvah", "eruvim", "eruv", "hechsherim"],
      keywords: ["shabbos", "shabos", "minyan", "mikvah", "eruv", "hechsher", "walkable"],
    },
    {
      id: "page-hechsherim",
      kind: "Travel guide",
      title: "Hechsherim",
      subtitle: `${HECHSHERIM.length} certifying bodies the site knows by name`,
      href: "/hechsherim",
      names: ["hechsherim", "hechsher", "kashrus", "certification"],
      keywords: ["hechsher", "kosher certification", ...HECHSHERIM.flatMap((h) => [h.name, h.mark, ...h.aliases])],
    },
    {
      id: "page-mikvaos",
      kind: "Travel guide",
      title: "Mikvaos",
      subtitle: "Source-backed mikvah listings for travel",
      href: "/mikvaos",
      names: ["mikvaos", "mikvah", "mikveh", "mikve", "ritual bath"],
      keywords: ["mikvah", "mikvaos", "mikveh", "tvilah", "kosher travel"],
    },
    {
      id: "page-zmanim",
      kind: "Travel guide",
      title: "Zmanim",
      subtitle: "Halachic times for a place and date",
      href: "/zmanim",
      names: ["zmanim", "zman", "halachic times", "candle lighting", "alos", "tzeit"],
      keywords: ["zmanim", "sof zman shema", "chatzos", "mincha", "sunset", "sunrise", "candle-lighting"],
    },
    {
      id: "page-travel-guide",
      kind: "Travel guide",
      title: "Travel guide",
      subtitle: "Documents, borders and paying for the trip",
      href: "/travel-guide",
      names: ["travel guide", "practical info", "entry documents", "visa", "passport"],
      keywords: ["documents", "border", "insurance", "points"],
    },
    {
      id: "page-esim",
      kind: "Site page",
      title: "eSIMs and data abroad",
      subtitle: "A data plan installed before you fly",
      href: "/esim",
      names: ["esim", "e-sim", "sim", "data", "data plan", "internet", "roaming", "phone"],
      keywords: ["esim", "data", "connectivity", "roaming"],
    },
    {
      id: "page-transfers",
      kind: "Site page",
      title: "Airport transfers",
      subtitle: "A booked ride from the airport to your first stop",
      href: "/transfers",
      names: ["transfers", "transfer", "airport transfer", "airport pickup", "taxi"],
      keywords: ["transfers", "airport", "arrival"],
    },
    {
      id: "page-book",
      kind: "Site page",
      title: "Search booking partners",
      subtitle: "Flights, hotels and cars",
      href: "/book",
      // The flight and car words live here rather than on pages of their own:
      // /flights and /cars were these same searches and now redirect to this
      // one, so a visitor typing "airfare" or "rental car" should land on the
      // page that actually runs it.
      names: ["book", "booking", "booking partners", "flights", "flight", "airfare", "plane", "cars", "car hire", "car rental", "rental car"],
      keywords: ["flights", "hotels", "cars", "air travel", "driving"],
    },
    {
      id: "page-plan",
      kind: "Service",
      title: "Get recommendations",
      subtitle: "Three short steps to destination ideas that fit",
      href: "/plan",
      names: ["get recommendations", "plan", "recommendations", "trip ideas"],
      keywords: ["planning", "recommendations"],
    },
    {
      id: "page-itinerary",
      kind: "Service",
      title: "Itinerary planner",
      subtitle: "Build the trip yourself — days, stops and Shabbos",
      href: "/itinerary",
      names: ["itinerary planner", "itinerary", "trip planner", "route planner"],
      keywords: ["itinerary", "planning", "route planning"],
    },
    {
      id: "page-services",
      kind: "Service",
      title: "Have White Glove plan it",
      subtitle: "Personal vacation planning and travel services",
      href: "/services",
      names: ["services", "white glove plan", "personal vacation planning"],
      keywords: ["planning", "concierge", "services"],
    },
    {
      id: "page-heritage",
      kind: "Site page",
      title: "Jewish heritage journeys",
      subtitle: "Towns, batei hachaim and tzaddikim",
      href: "/heritage",
      names: ["heritage", "jewish heritage", "nesios"],
      keywords: ["heritage", "kever", "tzaddik"],
    },
    {
      id: "page-cemeteries",
      kind: "Site page",
      title: "Batei hachaim",
      subtitle: "Cemetery directory",
      href: "/cemeteries",
      names: ["batei hachaim", "cemeteries", "cemetery directory"],
      keywords: ["cemetery", "beis hachaim", "kever"],
    },
    {
      id: "page-tzaddikim",
      kind: "Site page",
      title: "Tzaddikim",
      subtitle: "Find a kever by the person",
      href: "/tzaddikim",
      names: ["tzaddikim", "tzadikim", "kevarim directory"],
      keywords: ["tzaddik", "rebbe", "kever"],
    },
    {
      id: "page-travel-insurance",
      kind: "Site page",
      title: "Travel insurance",
      subtitle: "Cover for the trip",
      href: "/travel-insurance",
      names: ["travel insurance", "insurance"],
      keywords: ["insurance"],
    },
    {
      id: "page-sample-itinerary",
      kind: "Travel guide",
      title: "Sample itinerary",
      subtitle: "An example of how a White Glove trip is shaped",
      href: "/sample-itinerary",
      names: ["sample itinerary"],
      keywords: ["itinerary", "example"],
    },
  ];

  for (const [index, page] of pages.entries()) {
    docs.push({
      id: page.id,
      kind: page.kind,
      section: sectionForKind(page.kind),
      title: page.title,
      subtitle: page.subtitle,
      href: page.href,
      names: page.names,
      keywords: page.keywords,
      body: page.body ?? "",
      rankWeight: page.rankWeight ?? index,
      heritage: page.href.startsWith("/heritage") || page.href.startsWith("/cemeteries") || page.href.startsWith("/tzaddikim") || page.href === "/stops",
      vacation: page.href === "/destinations",
    });
  }

}

async function pushPublishedInfoPages(docs: DraftDoc[]) {
  if (!process.env.DATABASE_URL) return;
  try {
    const { prisma } = await import("@/lib/prisma");
    const { editablePages } = await import("@/data/pages");
    const predefined = new Set(editablePages.map((p) => p.slug));
    const rows = await prisma.page.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, title: true, body: true, seoDescription: true },
    });
    for (const row of rows) {
      if (predefined.has(row.slug)) continue;
      docs.push({
        id: `info-${row.slug}`,
        kind: "Site page",
        section: sectionForKind("Site page"),
        title: row.title,
        subtitle: "Travel guide",
        href: `/info/${row.slug}`,
        names: [row.title, row.slug.replace(/-/g, " ")],
        keywords: ["guide", "info"],
        body: (row.seoDescription || row.body || "").slice(0, 400),
        rankWeight: 50,
        heritage: false,
        vacation: false,
      });
    }
  } catch {
    // Fail safe: built-in index still works without the DB.
  }
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}
