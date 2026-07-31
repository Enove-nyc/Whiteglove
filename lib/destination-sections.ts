/**
 * What a destination page is made of, written once.
 *
 * The admin editor had seven kinds of listing hardcoded in a dropdown. The
 * completeness tracker had its own list, with five entries marked "the schema
 * has nowhere to put this". The public page had a third. Three lists of the
 * same thing, each edited separately, is how a section ends up editable but
 * uncounted — or counted but not editable, which is what Tefillos, Shabbos
 * arrangements, Hospital and Emergency services were.
 *
 * One list. Add a section here and the editor offers it, the tracker counts
 * it, and the page has a heading for it.
 *
 * The values are the `PlaceCategory` enum in prisma/schema.prisma. The six
 * added by the 2026-07-31 migration are the ones that had nowhere to live.
 */

export type SectionGroup = "essentials" | "the rest of the day" | "if something goes wrong";

export type DestinationSection = {
  /** The PlaceCategory value. */
  key: string;
  /** Heading, on the page and in the admin. */
  label: string;
  /** What belongs here, for whoever is filling it in. */
  blurb: string;
  group: SectionGroup;
  /**
   * The heading in Yiddish, where there is a real Yiddish word for it.
   *
   * ABSENT IS THE NORMAL CASE, and absent is honest. Several of these used to
   * carry an English word spelled in Hebrew letters — טראַנספארט for
   * "transport", דרייווערס for "drivers", פליגפעלד for an airport, which is a
   * calque nobody says. To a Yiddish reader that is not a translation; it is
   * the English word made harder to read, and it says the site does not know
   * the difference.
   *
   * What is left is the words people actually use: כשרות עסן, מנינים, מקוה,
   * אכסניא. The rest show English alone until somebody who speaks the language
   * supplies a real one — an invented translation is wrong in a way only the
   * reader can see.
   */
  yiddish?: string;
  /**
   * The ones a traveller needs before anything else.
   *
   * Not a judgement about importance — it is what somebody standing in a town
   * at four in the afternoon needs answered. A hospital matters enormously and
   * almost never; kosher food matters every day.
   */
  essential: boolean;
};

export const DESTINATION_SECTIONS: DestinationSection[] = [
  {
    key: "KOSHER_FOOD",
    yiddish: "כשרות עסן",
    label: "Kosher food",
    blurb: "Restaurants, caterers, anywhere a meal can be eaten. Not shops — those are their own section.",
    group: "essentials",
    essential: true,
  },
  {
    key: "MINYAN",
    yiddish: "מנינים",
    label: "Minyanim",
    blurb: "Where and when. Times change, so say when this was last checked.",
    group: "essentials",
    essential: true,
  },
  {
    key: "MIKVAH",
    yiddish: "מקוה",
    label: "Mikvaos",
    blurb: "Address, hours, and who to ring for access out of hours.",
    group: "essentials",
    essential: true,
  },
  {
    key: "ACCOMMODATION",
    yiddish: "אכסניא",
    label: "Where to stay",
    blurb: "Hotels and apartments, with what is walkable from them.",
    group: "essentials",
    essential: true,
  },
  {
    key: "TRANSPORT",
    label: "Getting around",
    blurb: "Local transport, taxis, car hire — how somebody moves once they are there.",
    group: "essentials",
    essential: true,
  },
  {
    key: "TEFILLOS",
    label: "Tefillos",
    blurb: "The shul or beis medrash itself, seder hayom, and anything about davening at the kever.",
    group: "essentials",
    essential: true,
  },
  {
    key: "SHABBOS",
    label: "Shabbos",
    blurb: "Eruv, seudos, hospitality, what closes and when. The questions somebody arriving Friday asks first.",
    group: "essentials",
    essential: true,
  },
  {
    key: "GROCERY",
    label: "Kosher shops",
    blurb: "Where to buy food to cook — the question a family in a rented flat is actually asking.",
    group: "the rest of the day",
    essential: false,
  },
  {
    key: "AIRPORT",
    label: "Airports",
    blurb: "Which one to fly into, and how far it really is.",
    group: "the rest of the day",
    essential: false,
  },
  {
    key: "DRIVER",
    label: "Drivers",
    blurb: "People who will take you to the kever and wait. Names and numbers, with permission to publish them.",
    group: "the rest of the day",
    essential: false,
  },
  {
    key: "PARKING",
    label: "Parking",
    blurb: "Where a car can actually be left, especially near the beis hachaim.",
    group: "the rest of the day",
    essential: false,
  },
  {
    key: "HOSPITAL",
    label: "Hospital",
    blurb: "The nearest one that will treat a foreigner, and how to get there.",
    group: "if something goes wrong",
    essential: false,
  },
  {
    key: "EMERGENCY",
    label: "Emergency",
    blurb: "Hatzolah, chaveirim, police, the embassy. Numbers somebody hopes never to use.",
    group: "if something goes wrong",
    essential: false,
  },
];

export const SECTION_GROUPS: SectionGroup[] = ["essentials", "the rest of the day", "if something goes wrong"];

const BY_KEY = new Map(DESTINATION_SECTIONS.map((section) => [section.key, section]));

export function sectionLabel(key: string): string {
  return BY_KEY.get(key)?.label ?? key;
}

export function sectionFor(key: string): DestinationSection | undefined {
  return BY_KEY.get(key);
}

export function sectionsInGroup(group: SectionGroup): DestinationSection[] {
  return DESTINATION_SECTIONS.filter((section) => section.group === group);
}

/** For a dropdown: every section, grouped, in the order above. */
export function sectionOptions(): Array<{ group: SectionGroup; options: Array<{ value: string; label: string }> }> {
  return SECTION_GROUPS.map((group) => ({
    group,
    options: sectionsInGroup(group).map((section) => ({ value: section.key, label: section.label })),
  }));
}

/**
 * Which of these the old fixed record can answer.
 *
 * data/destination-database.ts has five sections baked into its type —
 * accommodations, kosherFood, minyanim, mikvaos, transport — from before the
 * rest existed. The tracker reads that record, so for now only these five can
 * be answered from it; everything else is genuinely missing rather than
 * unmeasured. Once a destination is read from the database instead, this map
 * goes and every section is answerable.
 */
export const LEGACY_RECORD_SECTIONS: Record<string, "accommodations" | "kosherFood" | "minyanim" | "mikvaos" | "transport"> = {
  ACCOMMODATION: "accommodations",
  KOSHER_FOOD: "kosherFood",
  MINYAN: "minyanim",
  MIKVAH: "mikvaos",
  TRANSPORT: "transport",
};
