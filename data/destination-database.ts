import { cemeteries, type Burial } from "@/data/cemeteries";
import { guidedDestinations, unguidedDestinations } from "@/data/destinations";

/**
 * How far a piece of information has got.
 *
 * "verified" and "unavailable" are the two ends. The three in between exist
 * because a visitor deciding whether to drive four hours needs to know which
 * of them applies: partly checked, sent in by somebody local, or currently
 * being re-checked are three different things, and lumping them together as
 * "being checked" was telling people less than we know.
 *
 * lib/verification.ts turns these into the words a visitor actually sees.
 */
export type VerificationStatus = "verified" | "partial" | "community" | "needs-verification" | "unavailable";

export type Contact = {
  label: string;
  phone?: string;
  email?: string;
  note?: string;
  source?: string;
  status: VerificationStatus;
};

export type PracticalSection = {
  status: VerificationStatus;
  lastChecked?: string;
  entries: string[];
  note: string;
};

export type BurialRecord = Burial & {
  status: VerificationStatus;
  source?: string;
};

export type CemeteryRecord = {
  id: string;
  yiddishName: string;
  name: string;
  address?: string;
  coordinates?: string;
  arrivalNotes: string[];
  shomerContacts: Contact[];
  burials: BurialRecord[];
  status: VerificationStatus;
  sourceUrl?: string;
};

export type DestinationRecord = {
  id: string;
  city: string;
  yiddishCity: string;
  country: string;
  aliases: string[];
  lastChecked?: string;
  cemeteries: CemeteryRecord[];
  accommodations: PracticalSection;
  kosherFood: PracticalSection;
  minyanim: PracticalSection;
  mikvaos: PracticalSection;
  transport: PracticalSection;
  notes: string[];
};

const unavailable = (note: string): PracticalSection => ({
  status: "unavailable",
  entries: [],
  note,
});

const standardEssentials = () => ({
  accommodations: unavailable("Information is not available yet. Accommodations will be listed only after their current details are checked."),
  kosherFood: unavailable("Information is not available yet. Kosher food information will be published only after it is checked for this exact destination."),
  minyanim: unavailable("Information is not available yet. Minyan schedules can change and require current verification."),
  mikvaos: unavailable("Information is not available yet. Mikvah details will be added only after their current access is confirmed."),
  transport: unavailable("Information is not available yet. Local transport and driver details will be added only after current verification."),
});

const cemeteryBySlug = new Map(cemeteries.map((cemetery) => [cemetery.slug, cemetery]));

const cityGuideRecords: DestinationRecord[] = guidedDestinations().map(({ guide }) => {
  const cemetery = cemeteryBySlug.get(guide.slug);
  const contacts = guide.accessContacts ?? (guide.accessContact ? [guide.accessContact] : []);

  return {
    id: guide.slug,
    city: guide.city,
    yiddishCity: guide.yiddishCity,
    country: guide.country,
    aliases: guide.aliases ?? [],
    cemeteries: cemetery ? [{
      id: cemetery.slug,
      yiddishName: cemetery.yiddishName,
      name: cemetery.name,
      address: cemetery.address,
      coordinates: cemetery.coordinates,
      arrivalNotes: cemetery.arrivalNotes,
      shomerContacts: contacts.map((contact) => ({ ...contact, source: guide.sourceUrl, status: "verified" as const })),
      burials: cemetery.burials.map((burial) => ({ ...burial, source: cemetery.sourceUrl, status: "verified" as const })),
      status: contacts.length > 0 || cemetery.burials.length > 0 ? "verified" : "needs-verification",
      sourceUrl: cemetery.sourceUrl,
    }] : [],
    ...standardEssentials(),
    notes: [guide.overview],
  };
});

// Lizhensk used to be hand-assembled here, ahead of the generated records and
// with empty shomerContacts, because it was the one guided town with no entry
// in cityGuides — it had a bespoke page at /lizensk instead. It is an ordinary
// city guide now, so cityGuideRecords builds it like every other town and this
// special case would only shadow it with a worse copy.
/**
 * The batei hachaim this site already holds for a town, joined to it.
 *
 * WHY THIS WAS EMPTY, AND WHAT IT COST. `cemeteries: []` — a hundred and nine
 * town pages rendering nothing, while data/cemeteries.ts held the kevarim for
 * a third of them the whole time. /heritage/towns/warsaw said it had no
 * information; /cemeteries/warsaw-okopowa had the address, the arrival notes
 * and who is buried there. The two were never introduced.
 *
 * MATCHED ON THE SLUG, NOT ON THE WORDS. A cemetery is named for the town and
 * then for whoever is in it — warsaw-okopowa, lublin-chozeh, ger-gora-kalwaria
 * — so an exact slug, a `town-` prefix or a `-town` suffix is the town, and
 * nothing else is. Matching on the city NAME instead looked more generous and
 * was wrong: "Tomaszów Mazowiecki" and "Grodzisk Mazowiecki" share a word, and
 * that word is a region, so it put the Imrei Elimelech in the wrong town. On
 * kevarim a false match is worse than an empty page — somebody drives to it.
 * Thirty-six towns match; the rest stay empty until their bais hachaim is
 * written, and their pages stay unindexed until then (lib/site-map.ts).
 */
const cemeteriesForTown = (slug: string) =>
  cemeteries.filter(
    (cemetery) => cemetery.slug === slug || cemetery.slug.startsWith(`${slug}-`) || cemetery.slug.endsWith(`-${slug}`),
  );

const bulkRecords: DestinationRecord[] = unguidedDestinations().map((destination) => ({
  id: destination.slug,
  city: destination.city,
  yiddishCity: destination.yiddishCity,
  country: destination.country,
  aliases: destination.aliases,
  cemeteries: cemeteriesForTown(destination.slug).map((cemetery) => ({
    id: cemetery.slug,
    yiddishName: cemetery.yiddishName,
    name: cemetery.name,
    address: cemetery.address,
    coordinates: cemetery.coordinates,
    arrivalNotes: cemetery.arrivalNotes,
    // No shomer contact is invented here. The guided towns carry one because
    // somebody rang it; these carry what the cemetery record actually holds.
    shomerContacts: [],
    burials: cemetery.burials.map((burial) => ({ ...burial, source: cemetery.sourceUrl, status: "verified" as const })),
    status: cemetery.burials.length > 0 ? ("verified" as const) : ("needs-verification" as const),
    sourceUrl: cemetery.sourceUrl,
  })),
  ...standardEssentials(),
  notes: destination.summary ? [destination.summary] : [],
}));

export const destinationDatabase: DestinationRecord[] = [
  ...cityGuideRecords,
  ...bulkRecords,
];

export function getDestinationRecord(id: string) {
  return destinationDatabase.find((record) => record.id === id);
}
