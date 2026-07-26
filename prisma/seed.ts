/**
 * Seed script — imports the hardcoded `data/*.ts` content into Postgres so
 * nothing has to be retyped. Run after provisioning the DB:
 *
 *   npx prisma db seed
 *
 * Dry run (no DB connection — just prints what it would insert, useful for
 * validating the mapping before the database exists):
 *
 *   SEED_DRY_RUN=1 npx tsx prisma/seed.ts
 *
 * Re-running wipes and reloads the imported CONTENT tables (Destination,
 * Tzaddik, Cemetery, Contact, PracticalPlace). It does NOT touch admin-owned
 * tables (Promotion, EditSuggestion, Page); SiteSetting is upserted to the
 * current defaults only if a row does not already exist.
 */
import { bulkDestinations } from "@/data/bulk-destinations";
import { cemeteries } from "@/data/cemeteries";
import { cityGuides } from "@/data/city-guides";
import { sacredStops } from "@/data/sacred-stops";

const DRY_RUN = process.env.SEED_DRY_RUN === "1";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---- Build the plan from the static data (pure, no DB) ---------------

type TzaddikSeed = {
  name: string;
  yiddishName: string;
  knownAs: string | null;
  seforim: string | null;
  yahrzeit: string | null;
  niftar: string | null;
  graveAddress: string | null;
  graveCoordinates: string | null;
  findingNotes: string[];
  note: string | null;
  isPrimary: boolean;
  status: "VERIFIED" | "UNAVAILABLE" | "NEEDS_VERIFICATION";
  source: string | null;
};

type ContactSeed = {
  label: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  source: string | null;
  status: "VERIFIED" | "UNAVAILABLE" | "NEEDS_VERIFICATION";
};

type DestinationSeed = {
  slug: string;
  kind: "CITY_GUIDE" | "DESTINATION" | "SACRED_STOP";
  city: string;
  yiddishCity: string;
  country: string;
  aliases: string[];
  overview: string | null;
  summary: string | null;
  safetyNote: string | null;
  sourceUrl: string | null;
  tzaddikim: TzaddikSeed[];
  contacts: ContactSeed[];
};

type CemeterySeed = {
  slug: string;
  city: string;
  yiddishCity: string;
  name: string;
  yiddishName: string;
  country: string;
  address: string | null;
  coordinates: string | null;
  arrivalNotes: string[];
  accessNote: string | null;
  sourceUrl: string | null;
  destinationSlug: string | null;
  burials: TzaddikSeed[];
  contacts: ContactSeed[];
};

function buildPlan() {
  const destinations: DestinationSeed[] = [];
  const takenSlugs = new Set<string>();

  // City guides — rich records, each with its primary tzaddik + contacts.
  for (const g of cityGuides) {
    const contacts = g.accessContacts ?? (g.accessContact ? [g.accessContact] : []);
    destinations.push({
      slug: g.slug,
      kind: "CITY_GUIDE",
      city: g.city,
      yiddishCity: g.yiddishCity,
      country: g.country,
      aliases: g.aliases ?? [],
      overview: g.overview,
      summary: null,
      safetyNote: g.safetyNote ?? null,
      sourceUrl: g.sourceUrl,
      tzaddikim: [
        {
          name: g.tzaddik,
          yiddishName: g.yiddishTzaddik,
          knownAs: null,
          seforim: g.seforim,
          yahrzeit: g.yahrzeit,
          niftar: g.niftar,
          graveAddress: g.graveAddress ?? null,
          graveCoordinates: g.graveCoordinates ?? null,
          findingNotes: g.findingNotes ?? [],
          note: null,
          isPrimary: true,
          status: "VERIFIED",
          source: g.sourceUrl,
        },
      ],
      contacts: contacts.map((c) => ({
        label: c.label,
        phone: c.phone ?? null,
        email: c.email ?? null,
        note: c.note ?? null,
        source: g.sourceUrl,
        status: "VERIFIED" as const,
      })),
    });
    takenSlugs.add(g.slug);
  }

  // Bulk destinations — compact entries (skip any slug a guide already owns).
  for (const b of bulkDestinations) {
    if (takenSlugs.has(b.slug)) continue;
    destinations.push({
      slug: b.slug,
      kind: "DESTINATION",
      city: b.city,
      yiddishCity: b.yiddishCity,
      country: b.country,
      aliases: b.aliases ?? [],
      overview: null,
      summary: b.summary,
      safetyNote: null,
      sourceUrl: null,
      tzaddikim: [],
      contacts: [],
    });
    takenSlugs.add(b.slug);
  }

  // Sacred stops — waypoints not already covered above.
  for (const s of sacredStops) {
    const slug = slugify(s.city);
    if (takenSlugs.has(slug)) continue;
    destinations.push({
      slug,
      kind: "SACRED_STOP",
      city: s.city,
      yiddishCity: s.yiddishName,
      country: s.country,
      aliases: s.aliases ?? (s.traditionalName ? [s.traditionalName] : []),
      overview: null,
      summary: s.note ?? null,
      safetyNote: null,
      sourceUrl: null,
      tzaddikim: [],
      contacts: [],
    });
    takenSlugs.add(slug);
  }

  // Cemeteries — canonical list; link to a destination when the slug matches.
  const cemeteryPlan: CemeterySeed[] = cemeteries.map((c) => ({
    slug: c.slug,
    city: c.city,
    yiddishCity: c.yiddishCity,
    name: c.name,
    yiddishName: c.yiddishName,
    country: c.country,
    address: c.address ?? null,
    coordinates: c.coordinates ?? null,
    arrivalNotes: c.arrivalNotes ?? [],
    accessNote: c.accessNote ?? null,
    sourceUrl: c.sourceUrl,
    destinationSlug: takenSlugs.has(c.slug) ? c.slug : null,
    burials: c.burials.map((b) => ({
      name: b.name,
      yiddishName: b.yiddishName,
      knownAs: b.knownAs ?? null,
      seforim: b.seforim ?? null,
      yahrzeit: b.yahrzeit ?? null,
      niftar: null,
      graveAddress: null,
      graveCoordinates: null,
      findingNotes: [],
      note: b.note ?? null,
      isPrimary: false,
      status: "VERIFIED" as const,
      source: c.sourceUrl,
    })),
    contacts: (c.accessContacts ?? []).map((ct) => ({
      label: ct.label,
      phone: ct.phone ?? null,
      email: ct.email ?? null,
      note: ct.note ?? null,
      source: c.sourceUrl,
      status: "VERIFIED" as const,
    })),
  }));

  return { destinations, cemeteryPlan };
}

const DEFAULT_SETTINGS = {
  id: "site",
  heroTitle: "Every Journey Begins with Purpose.",
  heroSubtitle:
    "A trusted guide for meaningful journeys: tefillos, kosher food, minyanim, mikvaos, local contacts, and every practical detail around your visit.",
  searchPlaceholder: "Search a city, tzaddik, or country...",
  publicNotice: "Travel and access information is checked before publication.",
  footerEmail: "whitegloveitineraries@gmail.com",
  bookingNotice:
    "Live travel tools remain linked to the owner dashboard and can be refined here.",
};

async function main() {
  const { destinations, cemeteryPlan } = buildPlan();

  const counts = {
    destinations: destinations.length,
    tzaddikim:
      destinations.reduce((n, d) => n + d.tzaddikim.length, 0) +
      cemeteryPlan.reduce((n, c) => n + c.burials.length, 0),
    cemeteries: cemeteryPlan.length,
    contacts:
      destinations.reduce((n, d) => n + d.contacts.length, 0) +
      cemeteryPlan.reduce((n, c) => n + c.contacts.length, 0),
    cemeteriesLinked: cemeteryPlan.filter((c) => c.destinationSlug).length,
    byKind: {
      cityGuide: destinations.filter((d) => d.kind === "CITY_GUIDE").length,
      destination: destinations.filter((d) => d.kind === "DESTINATION").length,
      sacredStop: destinations.filter((d) => d.kind === "SACRED_STOP").length,
    },
  };

  if (DRY_RUN) {
    console.log("[seed dry run] would insert:");
    console.log(JSON.stringify(counts, null, 2));
    return;
  }

  // Real run — connect and load. Imported lazily so the dry run needs no DB.
  const { prisma } = await import("@/lib/prisma");

  console.log("Clearing imported content tables...");
  await prisma.contact.deleteMany();
  await prisma.tzaddik.deleteMany();
  await prisma.practicalPlace.deleteMany();
  await prisma.cemetery.deleteMany();
  await prisma.destination.deleteMany();

  console.log(`Inserting ${destinations.length} destinations...`);
  for (const d of destinations) {
    const { tzaddikim, contacts, ...rest } = d;
    await prisma.destination.create({
      data: {
        ...rest,
        tzaddikim: { create: tzaddikim },
        contacts: { create: contacts },
      },
    });
  }

  console.log(`Inserting ${cemeteryPlan.length} cemeteries...`);
  for (const c of cemeteryPlan) {
    const { burials, contacts, destinationSlug, ...rest } = c;
    await prisma.cemetery.create({
      data: {
        ...rest,
        destination: destinationSlug
          ? { connect: { slug: destinationSlug } }
          : undefined,
        burials: { create: burials },
        contacts: { create: contacts },
      },
    });
  }

  console.log("Ensuring default site settings...");
  await prisma.siteSetting.upsert({
    where: { id: DEFAULT_SETTINGS.id },
    update: {},
    create: DEFAULT_SETTINGS,
  });

  console.log("Seed complete:", JSON.stringify(counts, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
