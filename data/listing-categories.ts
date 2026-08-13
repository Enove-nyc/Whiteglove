/**
 * Site-wide listing category taxonomy — one list for admin forms, import
 * review, and pack prefills.
 *
 * Customer-facing section names follow AGENTS.md (Where to stay, mikvaos,
 * kosher food finder distinctions, Things to do). Stored values stay stable
 * for publish paths that already expect them (Attraction.kind, StayKind,
 * PlaceCategory enums).
 *
 * Audience-appropriate ≠ kosher-only: vacation attractions and lodging do not
 * need a Jewish or kosher label. Reject clubs, nightlife, mixed concerts, and
 * similar regardless of category.
 */

export const LISTING_CATEGORY_OTHER = "Other" as const;

export type ListingCategoryGroupId =
  | "heritage"
  | "things-to-do"
  | "where-to-stay"
  | "kosher-food"
  | "practical"
  | "destinations"
  | "editorial";

export type ListingCategoryOption = {
  /** Value persisted on Attraction.kind / ContentImportCandidate.category. */
  value: string;
  /** Label shown in admin selects. */
  label: string;
  group: ListingCategoryGroupId;
};

export const LISTING_CATEGORY_GROUPS: ReadonlyArray<{ id: ListingCategoryGroupId; label: string }> = [
  { id: "heritage", label: "Heritage" },
  { id: "things-to-do", label: "Things to do" },
  { id: "where-to-stay", label: "Where to stay" },
  { id: "kosher-food", label: "Kosher food" },
  { id: "practical", label: "Practical travel" },
  { id: "destinations", label: "Destinations" },
  { id: "editorial", label: "Research leads" },
];

/**
 * Preset categories drawn from existing site kinds. Keep labels in site voice;
 * keep values that publish paths already understand where applicable.
 */
export const LISTING_CATEGORY_PRESETS: readonly ListingCategoryOption[] = [
  // Heritage — own admin screens; import queue will not publish these.
  { value: "Beis hachaim", label: "Beis hachaim", group: "heritage" },
  { value: "Kever", label: "Kever", group: "heritage" },

  // Things to do → Attraction.kind
  { value: "Jewish heritage", label: "Jewish heritage", group: "things-to-do" },
  { value: "Museum", label: "Museum", group: "things-to-do" },
  { value: "Landmark", label: "Landmark / sightseeing", group: "things-to-do" },
  { value: "Park", label: "Park", group: "things-to-do" },
  { value: "Nature", label: "Nature", group: "things-to-do" },
  { value: "Family", label: "Family", group: "things-to-do" },
  { value: "Viewpoint", label: "Viewpoint", group: "things-to-do" },

  // Where to stay → KosherStay.kind
  { value: "Kosher hotel", label: "Kosher hotel", group: "where-to-stay" },
  { value: "Kosher B&B", label: "Kosher B&B", group: "where-to-stay" },
  { value: "Seasonal kosher programme", label: "Seasonal kosher programme", group: "where-to-stay" },
  { value: "Kosher-friendly, in the Jewish quarter", label: "Kosher-friendly, in the Jewish quarter", group: "where-to-stay" },
  { value: "Ordinary hotel, well placed", label: "Ordinary hotel, well placed", group: "where-to-stay" },

  // Kosher food finder kinds (destination editor confirms before public food claims)
  { value: "Restaurant", label: "Kosher restaurant", group: "kosher-food" },
  { value: "Bakery", label: "Kosher bakery", group: "kosher-food" },
  { value: "Butcher", label: "Kosher butcher", group: "kosher-food" },
  { value: "Grocery", label: "Kosher grocery / shop", group: "kosher-food" },
  { value: "Takeaway", label: "Kosher takeaway", group: "kosher-food" },
  { value: "Cafe", label: "Kosher cafe", group: "kosher-food" },

  // PracticalPlace PlaceCategory values (store the enum token)
  { value: "MINYAN", label: "Shul / minyan", group: "practical" },
  { value: "MIKVAH", label: "Mikvah", group: "practical" },
  { value: "TEFILLOS", label: "Tefillos / beis medrash", group: "practical" },
  { value: "SHABBOS", label: "Shabbos arrangements", group: "practical" },
  { value: "ACCOMMODATION", label: "Where to stay (practical listing)", group: "practical" },
  { value: "KOSHER_FOOD", label: "Kosher food (practical listing)", group: "practical" },
  { value: "GROCERY", label: "Kosher shops (practical)", group: "practical" },
  { value: "TRANSPORT", label: "Getting around", group: "practical" },
  { value: "AIRPORT", label: "Airport", group: "practical" },
  { value: "DRIVER", label: "Driver", group: "practical" },
  { value: "PARKING", label: "Parking", group: "practical" },
  { value: "HOSPITAL", label: "Hospital", group: "practical" },
  { value: "EMERGENCY", label: "Emergency", group: "practical" },

  // Destinations / research leads (not auto-published as attractions)
  { value: "Vacation destination", label: "Vacation destination", group: "destinations" },
  { value: "Neighborhood anchor", label: "Neighborhood / stay anchor", group: "editorial" },
  { value: "Jewish community resource", label: "Jewish community resource", group: "editorial" },
  { value: "Kosher certifier resource", label: "Kosher certifier resource", group: "editorial" },
];

/** Attraction.kind presets used by Things to do filters and static data. */
export const ATTRACTION_CATEGORY_PRESETS = LISTING_CATEGORY_PRESETS.filter((option) => option.group === "things-to-do").map(
  (option) => option.value,
) as readonly string[];

const PRESET_BY_VALUE = new Map(LISTING_CATEGORY_PRESETS.map((option) => [option.value, option]));

/** Pack wording → stored taxonomy value. */
const PACK_CATEGORY_ALIASES: Readonly<Record<string, string>> = {
  "landmark attraction": "Landmark",
  landmark: "Landmark",
  sightseeing: "Landmark",
  "jewish heritage attraction": "Jewish heritage",
  "jewish heritage": "Jewish heritage",
  museum: "Museum",
  nature: "Nature",
  park: "Park",
  family: "Family",
  viewpoint: "Viewpoint",
  "vacation destination": "Vacation destination",
  "neighborhood anchor": "Neighborhood anchor",
  "jewish community resource": "Jewish community resource",
  "kosher certifier resource": "Kosher certifier resource",
  "community resource": "Jewish community resource",
  "beis hachaim": "Beis hachaim",
  cemetery: "Beis hachaim",
  kever: "Kever",
  shul: "MINYAN",
  minyan: "MINYAN",
  minyanim: "MINYAN",
  mikvah: "MIKVAH",
  mikvaos: "MIKVAH",
  "where to stay": "Ordinary hotel, well placed",
  "ordinary hotel, well placed": "Ordinary hotel, well placed",
  "kosher hotel": "Kosher hotel",
};

export function isListingCategoryPreset(value: string | null | undefined): boolean {
  return Boolean(value && PRESET_BY_VALUE.has(value));
}

export function listingCategoryLabel(value: string | null | undefined): string {
  if (!value) return "";
  return PRESET_BY_VALUE.get(value)?.label ?? value;
}

/**
 * Map free pack / editorial category text onto the site taxonomy when possible.
 * Unknown strings are kept (write-in) after trim — never discarded.
 */
export function normalizeListingCategory(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (PRESET_BY_VALUE.has(trimmed)) return trimmed;
  const alias = PACK_CATEGORY_ALIASES[trimmed.toLocaleLowerCase("en")];
  if (alias) return alias;
  return trimmed;
}

export function isHeritageOnlyCategory(value: string | null | undefined): boolean {
  return value === "Beis hachaim" || value === "Kever";
}

export function isAttractionPublishCategory(value: string | null | undefined): boolean {
  const category = normalizeListingCategory(value);
  if (!category) return false;
  const preset = PRESET_BY_VALUE.get(category);
  // Write-in categories are allowed on attractions; presets must be Things to do.
  if (!preset) return true;
  return preset.group === "things-to-do";
}

/**
 * Map batch-3 style listing labels onto stored category values for pack generators.
 */
export function categoryFromListingLabel(label: string | null | undefined): string {
  const normalized = normalizeListingCategory(label);
  if (normalized) return normalized;
  return "Landmark";
}

/**
 * What the owner should fill or verify, by entry type — for the coordinator.
 * Prefill covers what packs + known site data can supply; publish still needs a human check.
 */
export type EntryFillPlan = {
  entryType: string;
  where: string;
  prefilled: string[];
  mustCheck: string[];
  requiredToPublish: string[];
};

export const ENTRY_FILL_PLANS: readonly EntryFillPlan[] = [
  {
    entryType: "Thing to do (attraction)",
    where: "Add entry · Things to do, or import review (Type: Attraction)",
    prefilled: ["Name", "Category (taxonomy or write-in)", "City / country", "Draft summary", "Address / coordinates when already on the site", "Source URL"],
    mustCheck: [
      "Suitable for Orthodox / Torah-observant travelers (not clubs, nightlife, mixed concerts)",
      "Customer summary reads true against the source",
      "Address or coordinates are navigable",
      "Category fits (or write in Other)",
    ],
    requiredToPublish: ["Name", "City", "Country", "Category", "Summary", "Address or coordinates", "Source"],
  },
  {
    entryType: "Place to stay",
    where: "Add entry · Where to stay, or import review (Type: Place to stay)",
    prefilled: ["Name", "Category (stay kind)", "City / country", "Draft summary", "Source"],
    mustCheck: [
      "Quarter or shul it is near (anchor name + coordinates)",
      "Stay kind is honest (ordinary vs kosher claim)",
      "No kosher claim invented from a bulk source",
    ],
    requiredToPublish: ["Name", "City", "Country", "Stay kind", "Summary", "Anchor name", "Anchor coordinates", "Source"],
  },
  {
    entryType: "Practical (shul, mikvah, transport, …)",
    where: "Import review (Type: Practical) or destination editor",
    prefilled: ["Name", "Category (MINYAN / MIKVAH / …)", "City / country", "Destination link when known", "Draft summary", "Source"],
    mustCheck: ["Linked destination slug exists", "Category matches the PlaceCategory enum", "Address or coordinates"],
    requiredToPublish: ["Name", "City", "Country", "Practical category", "Destination slug", "Summary", "Address or coordinates", "Source"],
  },
  {
    entryType: "Kosher food",
    where: "Import review leads only — confirm in the destination editor",
    prefilled: ["Name", "Category (restaurant / grocery / …)", "City", "Source / certifier URL when present"],
    mustCheck: ["Current hechsher / community listing", "Never publish a confirmed claim from the bulk queue alone"],
    requiredToPublish: ["Confirmed in destination editor (bulk queue cannot publish food claims)"],
  },
  {
    entryType: "Beis hachaim",
    where: "/admin/add (cemetery) — not the import publish path",
    prefilled: ["Name / city when coming from a research pack as a lead"],
    mustCheck: ["Access note", "Coordinates when safe to publish", "Source"],
    requiredToPublish: ["Name", "City — then use the cemetery form"],
  },
  {
    entryType: "Kever",
    where: "/admin/kevarim — not the import publish path",
    prefilled: ["Name when present on a research lead"],
    mustCheck: ["Linked beis hachaim", "Person details"],
    requiredToPublish: ["Use the kevarim screen"],
  },
];
