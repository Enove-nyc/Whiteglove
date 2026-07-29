// Public read layer for cemeteries that merges the built-in static list
// (data/cemeteries.ts, which carries the rich arrival notes + nearby places)
// with owner-added cemeteries and tzaddikim stored in the database.
//
// FAIL SAFE: with the DB off/unreachable it returns the static content only, so
// the cemetery pages always work.

import { cemeteries as staticCemeteries, getCemetery as getStaticCemetery, type Cemetery } from "@/data/cemeteries";

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

export type CemeteryListItem = {
  slug: string;
  city: string;
  yiddishCity: string;
  name: string;
  yiddishName: string;
  country: string;
  burialCount: number;
  /** Who is buried there, for searching and for sorting by tzaddik. */
  burials: string[];
  ownerAdded: boolean;
};

const staticSlugs = new Set(staticCemeteries.map((c) => c.slug));

function staticListItem(c: Cemetery): CemeteryListItem {
  return {
    slug: c.slug,
    city: c.city,
    yiddishCity: c.yiddishCity,
    name: c.name,
    yiddishName: c.yiddishName,
    country: c.country,
    burialCount: c.burials.length,
    burials: c.burials.map((b) => [b.knownAs, b.name, b.yiddishName].filter(Boolean).join(" ")),
    ownerAdded: false,
  };
}

/** The cemetery directory list: built-in cemeteries plus owner-added ones. */
export async function getCemeteryList(): Promise<CemeteryListItem[]> {
  const base = staticCemeteries.map(staticListItem);
  if (!DB_ENABLED) return base;
  try {
    const { prisma } = await import("@/lib/prisma");
    const [rows, storedOnBuiltIn] = await Promise.all([
      prisma.cemetery.findMany({
        where: { slug: { notIn: [...staticSlugs] } },
        select: {
          slug: true, city: true, yiddishCity: true, name: true, yiddishName: true, country: true,
          _count: { select: { burials: true } },
        },
        orderBy: [{ country: "asc" }, { city: "asc" }],
      }),
      // A person added to a built-in beis hachaim shows on its page, so the
      // count beside it in the directory has to know about him too — otherwise
      // the card says two kevarim and the page lists three.
      prisma.cemetery.findMany({
        where: { slug: { in: [...staticSlugs] } },
        select: { slug: true, burials: { select: { name: true } } },
      }),
    ]);

    const extraBySlug = new Map(storedOnBuiltIn.map((r) => [r.slug, r.burials.map((b) => b.name.toLowerCase())]));
    const withExtras = base.map((item) => {
      const extras = extraBySlug.get(item.slug);
      if (!extras?.length) return item;
      const known = new Set(
        (staticCemeteries.find((c) => c.slug === item.slug)?.burials ?? []).map((b) => b.name.toLowerCase()),
      );
      const added = extras.filter((name) => !known.has(name)).length;
      return added ? { ...item, burialCount: item.burialCount + added } : item;
    });

    const added = rows.map((r) => ({
      slug: r.slug, city: r.city, yiddishCity: r.yiddishCity, name: r.name,
      yiddishName: r.yiddishName, country: r.country, burialCount: r._count.burials, burials: [], ownerAdded: true,
    }));
    return [...withExtras, ...added];
  } catch {
    return base;
  }
}

type StoredContact = { label: string; phone: string | null; email: string | null; note: string | null };
type ViewContact = NonNullable<Cemetery["accessContacts"]>[number];

const contactKey = (label: string) => label.trim().toLowerCase();

/**
 * Built-in contacts, with stored ones layered over the top.
 *
 * Matching is by label, so re-saving "Shomer" replaces the built-in "Shomer"
 * rather than adding a second one. A stored contact with neither a phone nor an
 * email means "this contact is gone" and hides the built-in entry — otherwise a
 * number that has stopped working could never be taken off the page, and a
 * traveler standing at a locked gate would keep calling it.
 */
function mergeContacts(builtIn: ViewContact[], stored: StoredContact[]): ViewContact[] {
  if (!stored.length) return builtIn;
  const overrides = new Map(stored.map((c) => [contactKey(c.label), c]));
  const out: ViewContact[] = [];

  for (const contact of builtIn) {
    const override = overrides.get(contactKey(contact.label));
    if (!override) {
      out.push(contact);
      continue;
    }
    overrides.delete(contactKey(contact.label));
    const phone = override.phone?.trim() || undefined;
    const email = override.email?.trim() || undefined;
    if (!phone && !email) continue; // retired
    out.push({ label: override.label, phone, email, note: override.note ?? contact.note });
  }

  // Anything stored that didn't match a built-in label is a new contact.
  for (const contact of overrides.values()) {
    const phone = contact.phone?.trim() || undefined;
    const email = contact.email?.trim() || undefined;
    if (!phone && !email) continue;
    out.push({ label: contact.label, phone, email, note: contact.note ?? "" });
  }
  return out;
}

/** One cemetery for its detail page. For a built-in cemetery, returns the rich
 *  static record with any owner-added tzaddikim appended; for an owner-added
 *  cemetery, builds the record from the database. */
export async function getCemeteryView(slug: string): Promise<Cemetery | null> {
  const staticRecord = getStaticCemetery(slug);

  if (!DB_ENABLED) return staticRecord ?? null;

  try {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.cemetery.findUnique({
      where: { slug },
      include: {
        burials: { orderBy: { name: "asc" } },
        contacts: { orderBy: { label: "asc" } },
      },
    });

    if (staticRecord) {
      if (!row) return staticRecord;

      // Append owner-added tzaddikim (names not already listed statically).
      const known = new Set(staticRecord.burials.map((b) => b.name.toLowerCase()));
      const extraBurials = row.burials
        .filter((b) => !known.has(b.name.toLowerCase()))
        .map((b) => ({
          name: b.name, yiddishName: b.yiddishName, knownAs: b.knownAs ?? undefined,
          seforim: b.seforim ?? undefined, yahrzeit: b.yahrzeit ?? undefined, note: b.note ?? undefined,
        }));

      // Contacts saved against a built-in cemetery used to be dropped on the
      // floor here, which meant a shomer's phone number could be added but
      // never corrected — the built-in one is in code and always won. A stored
      // contact now takes precedence over the built-in one with the same
      // label, so editing a number is simply saving it again. Clearing both
      // the phone and the email removes the built-in contact from the page,
      // which is the only way to retire a number that no longer works.
      const accessContacts = mergeContacts(staticRecord.accessContacts ?? [], row.contacts);

      if (!extraBurials.length && accessContacts === staticRecord.accessContacts) return staticRecord;
      return {
        ...staticRecord,
        burials: extraBurials.length ? [...staticRecord.burials, ...extraBurials] : staticRecord.burials,
        accessContacts,
      };
    }

    if (!row) return null;
    // Owner-added cemetery — build the static shape from the DB row.
    return {
      slug: row.slug,
      city: row.city,
      yiddishCity: row.yiddishCity,
      name: row.name,
      yiddishName: row.yiddishName,
      country: row.country,
      address: row.address ?? "",
      coordinates: row.coordinates ?? undefined,
      arrivalNotes: row.arrivalNotes ?? [],
      accessNote: row.accessNote ?? undefined,
      accessContacts: row.contacts.map((c) => ({
        label: c.label, phone: c.phone ?? undefined, email: c.email ?? undefined, note: c.note ?? "",
      })),
      burials: row.burials.map((b) => ({
        name: b.name, yiddishName: b.yiddishName, knownAs: b.knownAs ?? undefined,
        seforim: b.seforim ?? undefined, yahrzeit: b.yahrzeit ?? undefined, note: b.note ?? undefined,
      })),
      sourceUrl: row.sourceUrl ?? "",
    };
  } catch {
    return staticRecord ?? null;
  }
}
