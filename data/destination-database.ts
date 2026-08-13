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
const bulkRecords: DestinationRecord[] = unguidedDestinations().map((destination) => ({
  id: destination.slug,
  city: destination.city,
  yiddishCity: destination.yiddishCity,
  country: destination.country,
  aliases: destination.aliases,
  cemeteries: [],
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
