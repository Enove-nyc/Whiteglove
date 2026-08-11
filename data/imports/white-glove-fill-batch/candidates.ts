import {
  sourceBackedCandidate,
  type CandidateEntityType,
  type CandidateInput,
  type WhiteGloveFillCandidate,
} from "./schema";
import { sourceCatalog } from "./sources";

const requiredBeforePublication: Readonly<Record<CandidateEntityType, readonly string[]>> = {
  vacation_destination: [
    "Destination editorial fields and facets reviewed",
    "Destination readiness checks pass against imported practical content",
  ],
  attraction: [
    "Customer-facing summary reviewed against the cited source",
    "Current visit and Shabbos suitability checked before public release",
  ],
  stay_anchor: [
    "Published anchor coordinates and customer note supplied from a primary source",
    "Editorial review confirms the anchor remains useful for Where to stay",
  ],
  practical_travel_resource: [
    "Resource scope and current access route reviewed",
    "Editorial review confirms practical framing only",
  ],
  kosher_travel_resource: [
    "Resource scope and current access route reviewed",
    "Editorial review confirms it is not presented as a food or accommodation provider",
  ],
};

function sourceDraft(
  input: Omit<CandidateInput, "publicationReadiness" | "requiredBeforePublication">,
): WhiteGloveFillCandidate {
  return sourceBackedCandidate(sourceCatalog, {
    ...input,
    publicationReadiness: "NEEDS_REVIEW",
    requiredBeforePublication: requiredBeforePublication[input.entityType],
  });
}

type Row = {
  market: string;
  slug: string;
  name: string;
  aliases: readonly string[];
  keywords: readonly string[];
  locality: string;
  destination: string;
  country: string;
  sourceKey: keyof typeof sourceCatalog;
  category: string;
};

function destination(row: Omit<Row, "category">): WhiteGloveFillCandidate {
  return sourceDraft({
    ...row,
    entityType: "vacation_destination",
    importKind: "PRACTICAL",
    importTarget: "VacationDestination",
    category: "Vacation destination",
  });
}

function attraction(row: Row): WhiteGloveFillCandidate {
  return sourceDraft({
    ...row,
    entityType: "attraction",
    importKind: "ATTRACTION",
    importTarget: "Attraction",
  });
}

function stayAnchor(row: Omit<Row, "category">): WhiteGloveFillCandidate {
  return sourceDraft({
    ...row,
    entityType: "stay_anchor",
    importKind: "PLACE_TO_STAY",
    importTarget: "KosherArea",
    category: "Neighborhood anchor",
  });
}

function resource(row: Row): WhiteGloveFillCandidate {
  return sourceDraft({
    ...row,
    entityType: "kosher_travel_resource",
    importKind: "PRACTICAL",
    importTarget: "PracticalPlace",
  });
}

/** Complementary private NEEDS_REVIEW candidates to close the editorial-count gap. */
export const whiteGloveFillCandidates: readonly WhiteGloveFillCandidate[] = [
  destination({
    market: "usa-chicago",
    slug: "chicago",
    name: "Chicago",
    aliases: ["City of Chicago"],
    keywords: ["United States", "lakefront", "architecture"],
    locality: "Chicago",
    destination: "Chicago",
    country: "United States",
    sourceKey: "chicago-choose",
  }),
  ...[
    "Millennium Park",
    "Art Institute of Chicago",
    "Navy Pier",
    "Willis Tower Skydeck",
    "Cloud Gate",
    "Museum of Science and Industry",
    "Field Museum",
    "Shedd Aquarium",
    "Adler Planetarium",
    "Lincoln Park Zoo",
    "Chicago Riverwalk",
    "Magnificent Mile",
    "Wrigley Field framing",
    "Grant Park",
    "Buckingham Fountain",
    "Chicago Cultural Center",
    "Museum of Contemporary Art Chicago",
    "360 CHICAGO",
  ].map((name) =>
    attraction({
      market: "usa-chicago",
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name,
      aliases: [name],
      keywords: ["Chicago", "attraction", "lakefront"],
      locality: "Chicago",
      destination: "Chicago",
      country: "United States",
      sourceKey: "chicago-choose",
      category: "Landmark attraction",
    }),
  ),
  stayAnchor({
    market: "usa-chicago",
    slug: "staying-near-downtown-chicago",
    name: "Staying near Downtown Chicago",
    aliases: ["Loop stay area"],
    keywords: ["Chicago", "neighborhood", "stay"],
    locality: "Chicago",
    destination: "Chicago",
    country: "United States",
    sourceKey: "chicago-choose",
  }),
  resource({
    market: "usa-chicago",
    slug: "chicago-rabbinical-council",
    name: "Chicago Rabbinical Council",
    aliases: ["cRc"],
    keywords: ["Chicago", "kosher", "certifier"],
    locality: "Chicago",
    destination: "Chicago",
    country: "United States",
    sourceKey: "chicago-crc",
    category: "Kosher certifier resource",
  }),

  destination({
    market: "korea-seoul",
    slug: "seoul",
    name: "Seoul",
    aliases: ["Seoul Capital Area"],
    keywords: ["South Korea", "city break", "palaces"],
    locality: "Seoul",
    destination: "Seoul",
    country: "South Korea",
    sourceKey: "seoul-visit",
  }),
  ...[
    "Gyeongbokgung Palace",
    "Changdeokgung Palace",
    "Bukchon Hanok Village",
    "Insadong",
    "Myeongdong",
    "N Seoul Tower",
    "Hongdae",
    "Dongdaemun Design Plaza",
    "Lotte World Tower Seoul Sky",
    "COEX Aquarium",
    "National Museum of Korea",
    "War Memorial of Korea",
    "Han River Park",
    "Namdaemun Market",
    "Gwangjang Market",
    "Itaewon",
    "Yeouido",
  ].map((name) =>
    attraction({
      market: "korea-seoul",
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name,
      aliases: [name],
      keywords: ["Seoul", "attraction", "korea"],
      locality: "Seoul",
      destination: "Seoul",
      country: "South Korea",
      sourceKey: "seoul-visit",
      category: "Landmark attraction",
    }),
  ),
  stayAnchor({
    market: "korea-seoul",
    slug: "staying-near-myeongdong",
    name: "Staying near Myeongdong",
    aliases: ["Myeongdong stay area"],
    keywords: ["Seoul", "neighborhood", "stay"],
    locality: "Seoul",
    destination: "Seoul",
    country: "South Korea",
    sourceKey: "seoul-visit",
  }),
  resource({
    market: "korea-seoul",
    slug: "chabad-of-korea",
    name: "Chabad of Korea",
    aliases: ["Chabad Korea"],
    keywords: ["Seoul", "jewish", "community"],
    locality: "Seoul",
    destination: "Seoul",
    country: "South Korea",
    sourceKey: "seoul-chabad",
    category: "Jewish community resource",
  }),

  destination({
    market: "hong-kong",
    slug: "hong-kong",
    name: "Hong Kong",
    aliases: ["Hong Kong SAR"],
    keywords: ["harbour", "skyline", "asia"],
    locality: "Hong Kong",
    destination: "Hong Kong",
    country: "Hong Kong",
    sourceKey: "hk-discover",
  }),
  ...[
    "Victoria Peak",
    "Star Ferry",
    "Tian Tan Buddha",
    "Hong Kong Disneyland framing",
    "Ocean Park Hong Kong",
    "Avenue of Stars",
    "Tsim Sha Tsui Promenade",
    "Temple Street Night Market",
    "Man Mo Temple",
    "Nan Lian Garden",
    "Chi Lin Nunnery",
    "Hong Kong Park",
    "Symphony of Lights framing",
    "Ngong Ping 360",
    "Stanley Market",
    "Repulse Bay",
  ].map((name) =>
    attraction({
      market: "hong-kong",
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name,
      aliases: [name],
      keywords: ["Hong Kong", "attraction", "harbour"],
      locality: "Hong Kong",
      destination: "Hong Kong",
      country: "Hong Kong",
      sourceKey: "hk-discover",
      category: "Landmark attraction",
    }),
  ),
  stayAnchor({
    market: "hong-kong",
    slug: "staying-near-tsim-sha-tsui",
    name: "Staying near Tsim Sha Tsui",
    aliases: ["TST stay area"],
    keywords: ["Hong Kong", "neighborhood", "stay"],
    locality: "Hong Kong",
    destination: "Hong Kong",
    country: "Hong Kong",
    sourceKey: "hk-discover",
  }),
  resource({
    market: "hong-kong",
    slug: "ohel-leah-synagogue",
    name: "Ohel Leah Synagogue",
    aliases: ["Ohel Leah"],
    keywords: ["Hong Kong", "jewish", "community"],
    locality: "Hong Kong",
    destination: "Hong Kong",
    country: "Hong Kong",
    sourceKey: "hk-ohel-leah",
    category: "Jewish community resource",
  }),

  destination({
    market: "nz-auckland",
    slug: "auckland",
    name: "Auckland",
    aliases: ["Tāmaki Makaurau"],
    keywords: ["New Zealand", "harbour", "city break"],
    locality: "Auckland",
    destination: "Auckland",
    country: "New Zealand",
    sourceKey: "nz-auckland",
  }),
  ...[
    "Auckland Domain",
    "Auckland War Memorial Museum",
    "Sky Tower Auckland",
    "Waiheke Island framing",
    "Rangitoto Island framing",
    "Viaduct Harbour",
    "Britomart",
    "Mount Eden",
    "One Tree Hill",
    "Devonport",
    "Mission Bay",
    "Kelly Tarlton's Sea Life Aquarium",
    "Auckland Art Gallery Toi o Tāmaki",
    "Albert Park Auckland",
  ].map((name) =>
    attraction({
      market: "nz-auckland",
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name,
      aliases: [name],
      keywords: ["Auckland", "attraction", "harbour"],
      locality: "Auckland",
      destination: "Auckland",
      country: "New Zealand",
      sourceKey: "nz-auckland",
      category: "Landmark attraction",
    }),
  ),
  stayAnchor({
    market: "nz-auckland",
    slug: "staying-near-viaduct-harbour",
    name: "Staying near Viaduct Harbour",
    aliases: ["Viaduct stay area"],
    keywords: ["Auckland", "neighborhood", "stay"],
    locality: "Auckland",
    destination: "Auckland",
    country: "New Zealand",
    sourceKey: "nz-auckland",
  }),

  // Amsterdam attractions only — destination already exists in core content.
  ...[
    "Rijksmuseum",
    "Van Gogh Museum",
    "Anne Frank House",
    "Canal Belt",
    "Vondelpark",
    "Dam Square",
    "Royal Palace Amsterdam",
    "A'DAM Lookout",
    "NEMO Science Museum",
    "Hermitage Amsterdam framing",
    "Museumplein",
    "Jordaan",
    "Albert Cuyp Market",
    "Bloemenmarkt",
    "Artis Zoo",
    "Stedelijk Museum",
  ].map((name) =>
    attraction({
      market: "netherlands-amsterdam-extra",
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name,
      aliases: [name],
      keywords: ["Amsterdam", "attraction", "museum"],
      locality: "Amsterdam",
      destination: "Amsterdam",
      country: "Netherlands",
      sourceKey: "nl-amsterdam-extra",
      category: "Landmark attraction",
    }),
  ),
  attraction({
    market: "netherlands-amsterdam-extra",
    slug: "jewish-cultural-quarter",
    name: "Jewish Cultural Quarter",
    aliases: ["Joods Cultureel Kwartier"],
    keywords: ["Amsterdam", "jewish", "museum"],
    locality: "Amsterdam",
    destination: "Amsterdam",
    country: "Netherlands",
    sourceKey: "nl-nihs",
    category: "Jewish heritage attraction",
  }),
  resource({
    market: "netherlands-amsterdam-extra",
    slug: "jewish-cultural-quarter-resource",
    name: "Jewish Cultural Quarter visitor resource",
    aliases: ["JCK Amsterdam"],
    keywords: ["Amsterdam", "jewish", "museum"],
    locality: "Amsterdam",
    destination: "Amsterdam",
    country: "Netherlands",
    sourceKey: "nl-nihs",
    category: "Jewish community resource",
  }),
];
