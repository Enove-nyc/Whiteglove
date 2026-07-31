// Admin-side content mutations (Prisma writes) and reads for the editor.
//
// These are plain server-side functions. The Next.js server actions that call
// them handle auth + revalidation. Each throws a friendly error when the DB
// isn't connected, so the admin UI can show a clear "connect the database"
// message instead of a stack trace.

import { randomUUID } from "node:crypto";
import type { ContentStatus, PlaceCategory, ProviderCategory } from "@prisma/client";

const DB_OFF_MESSAGE =
  "The content database is not connected yet. Add DATABASE_URL (see docs/DATABASE.md) to edit content.";

export function isDbEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

async function db() {
  if (!isDbEnabled()) throw new Error(DB_OFF_MESSAGE);
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// ---- Reads for the admin editor -------------------------------------

/** All destinations with light counts, for the picker list. */
export async function listDestinationsForAdmin() {
  const prisma = await db();
  return prisma.destination.findMany({
    orderBy: [{ country: "asc" }, { city: "asc" }],
    select: {
      id: true,
      slug: true,
      city: true,
      yiddishCity: true,
      country: true,
      kind: true,
      status: true,
      _count: { select: { places: true, contacts: true } },
    },
  });
}

/** One destination with everything needed to edit it. */
export async function getDestinationForAdmin(slug: string) {
  const prisma = await db();
  return prisma.destination.findUnique({
    where: { slug },
    include: {
      contacts: { orderBy: { label: "asc" } },
      places: { orderBy: [{ category: "asc" }, { name: "asc" }] },
    },
  });
}

// ---- Destination core fields ----------------------------------------

export type DestinationFields = {
  city: string;
  yiddishCity: string;
  country: string;
  overview: string | null;
  summary: string | null;
  safetyNote: string | null;
  status: ContentStatus;
};

export async function updateDestinationFields(slug: string, fields: DestinationFields) {
  const prisma = await db();
  return prisma.destination.update({
    where: { slug },
    data: {
      city: fields.city,
      yiddishCity: fields.yiddishCity,
      country: fields.country,
      overview: fields.overview,
      summary: fields.summary,
      safetyNote: fields.safetyNote,
      status: fields.status,
      lastVerified: new Date(),
    },
  });
}

// ---- Contacts (shomer / access) -------------------------------------

export type ContactFields = {
  label: string;
  phone: string | null;
  email: string | null;
  note: string | null;
};

export async function createContact(destinationId: string, fields: ContactFields) {
  const prisma = await db();
  return prisma.contact.create({
    data: { ...fields, status: "VERIFIED", destinationId },
  });
}

export async function updateContact(id: string, fields: ContactFields) {
  const prisma = await db();
  return prisma.contact.update({ where: { id }, data: fields });
}

export async function deleteContact(id: string) {
  const prisma = await db();
  return prisma.contact.delete({ where: { id } });
}

// ---- Practical places (lodging/food/minyan/mikvah/transport/etc.) ----

export type PlaceFields = {
  category: PlaceCategory;
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  notes: string | null;
  status: ContentStatus;
};

export async function createPlace(destinationId: string, fields: PlaceFields) {
  const prisma = await db();
  return prisma.practicalPlace.create({
    data: { ...fields, lastVerified: new Date(), destinationId },
  });
}

export async function updatePlace(id: string, fields: PlaceFields) {
  const prisma = await db();
  return prisma.practicalPlace.update({
    where: { id },
    data: { ...fields, lastVerified: new Date() },
  });
}

export async function deletePlace(id: string) {
  const prisma = await db();
  return prisma.practicalPlace.delete({ where: { id } });
}

// ---- Editable general pages (heading + intro text) -------------------

export type PageFields = {
  title: string;
  body: string;
  status: ContentStatus;
};

export async function upsertPage(slug: string, fields: PageFields) {
  const prisma = await db();
  return prisma.page.upsert({
    where: { slug },
    update: fields,
    create: { slug, ...fields },
  });
}

// ---- Directory providers (tour operators, planners, agencies, guides) --

export type ProviderFields = {
  name: string;
  category: ProviderCategory;
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
  status: ContentStatus;
  /** Permission to put their phone number on a public page. Never inferred. */
  contactConsent: boolean;
  contactConsentAt: Date | null;
  contactConsentNote: string | null;
  verifiedAt: Date | null;
  responseTime: string | null;
};

function providerSlug(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "provider";
  return `${base}-${randomUUID().slice(0, 6)}`;
}

export async function listProvidersForAdmin() {
  const prisma = await db();
  return prisma.directoryProvider.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getProviderForAdmin(slug: string) {
  const prisma = await db();
  return prisma.directoryProvider.findUnique({ where: { slug } });
}

export async function createProvider(fields: ProviderFields) {
  const prisma = await db();
  return prisma.directoryProvider.create({
    data: { slug: providerSlug(fields.name), ...fields },
  });
}

export async function updateProvider(slug: string, fields: ProviderFields) {
  const prisma = await db();
  return prisma.directoryProvider.update({ where: { slug }, data: fields });
}

export async function deleteProvider(slug: string) {
  const prisma = await db();
  return prisma.directoryProvider.delete({ where: { slug } });
}

// ---- Owner-added new entries (cemeteries, tzaddikim, info pages) -------

function newSlug(value: string, fallback: string) {
  const base = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
  return `${base}-${randomUUID().slice(0, 6)}`;
}

export type NewCemeteryFields = {
  name: string;
  yiddishName: string;
  city: string;
  yiddishCity: string;
  country: string;
  address: string | null;
  coordinates: string | null;
  accessNote: string | null;
  sourceUrl: string | null;
};

/** Create a new (owner-added) cemetery. Slug is generated; row is a draft-ish
 *  NEEDS_VERIFICATION so the owner can fill details in later. */
export async function createCemetery(fields: NewCemeteryFields) {
  const prisma = await db();
  return prisma.cemetery.create({
    data: {
      slug: newSlug(fields.name, "cemetery"),
      name: fields.name,
      yiddishName: fields.yiddishName || fields.name,
      city: fields.city,
      yiddishCity: fields.yiddishCity || fields.city,
      country: fields.country,
      address: fields.address,
      coordinates: fields.coordinates,
      accessNote: fields.accessNote,
      sourceUrl: fields.sourceUrl,
      status: "NEEDS_VERIFICATION",
    },
  });
}

/** Cemeteries that have a database row — the owner-added ones, plus any
 *  built-in one something has already been saved against. */
export async function listCemeteriesForAdmin() {
  const prisma = await db();
  return prisma.cemetery.findMany({
    orderBy: [{ country: "asc" }, { city: "asc" }],
    select: { id: true, slug: true, name: true, city: true, country: true },
  });
}

// ---- Shomer / access contacts on a beis hachaim -----------------------
//
// The 97 built-in batei hachaim live in code and have no database row, so a
// contact had nowhere to attach and their phone numbers could never be
// corrected. Saving one now creates a stub row for that slug on demand; the
// public page layers stored contacts over the built-in ones (see
// lib/cemeteries-view.ts), so re-saving a label replaces that number.

export type CemeteryContactFields = {
  label: string;
  phone: string | null;
  email: string | null;
  note: string | null;
};

/**
 * The database row for a cemetery slug, created if this is a built-in one that
 * has never been edited. Only the fields needed to satisfy the schema are set —
 * everything the traveler sees still comes from the built-in record.
 */
async function cemeteryRowForSlug(slug: string, fallback: { city: string; yiddishCity: string; name: string; yiddishName: string; country: string }) {
  const prisma = await db();
  const existing = await prisma.cemetery.findUnique({ where: { slug }, select: { id: true } });
  if (existing) return existing;
  return prisma.cemetery.create({
    data: {
      slug,
      city: fallback.city,
      yiddishCity: fallback.yiddishCity,
      name: fallback.name,
      yiddishName: fallback.yiddishName,
      country: fallback.country,
      status: "NEEDS_VERIFICATION",
    },
    select: { id: true },
  });
}

/** Contacts already stored for a cemetery slug (empty for an untouched one). */
export async function listCemeteryContacts(slug: string) {
  const prisma = await db();
  const row = await prisma.cemetery.findUnique({
    where: { slug },
    select: { contacts: { orderBy: { label: "asc" }, select: { id: true, label: true, phone: true, email: true, note: true } } },
  });
  return row?.contacts ?? [];
}

/**
 * Save a contact for a cemetery. Matching an existing stored label updates it
 * rather than adding a second one, which is what makes this an edit.
 */
export async function saveCemeteryContact(
  slug: string,
  fallback: { city: string; yiddishCity: string; name: string; yiddishName: string; country: string },
  fields: CemeteryContactFields,
) {
  const prisma = await db();
  const cemetery = await cemeteryRowForSlug(slug, fallback);
  const existing = await prisma.contact.findFirst({
    where: { cemeteryId: cemetery.id, label: { equals: fields.label.trim(), mode: "insensitive" } },
    select: { id: true },
  });
  const data = {
    label: fields.label.trim(),
    phone: fields.phone?.trim() || null,
    email: fields.email?.trim() || null,
    note: fields.note?.trim() || null,
    status: "NEEDS_VERIFICATION" as const,
  };
  if (existing) return prisma.contact.update({ where: { id: existing.id }, data });
  return prisma.contact.create({ data: { ...data, cemeteryId: cemetery.id } });
}

/** Remove a stored contact. The built-in one, if any, reappears. */
export async function deleteCemeteryContact(id: string) {
  const prisma = await db();
  await prisma.contact.delete({ where: { id } });
}

// ---- Tzaddikim on a beis hachaim --------------------------------------
//
// The same problem the shomer numbers had. `listCemeteriesForAdmin` lists
// database rows, and the 97 built-in batei hachaim have none, so the old
// "add a tzadik" picker could only ever offer the handful of owner-added
// cemeteries — there was no way to say "this person is buried in Lizhensk".
//
// A person is attached by SLUG instead, and the row is created on demand,
// exactly as saving a shomer's number does.

export type BurialFields = {
  name: string;
  yiddishName: string;
  knownAs: string | null;
  seforim: string | null;
  yahrzeit: string | null;
  note: string | null;
};

/** Tzaddikim stored against a cemetery slug (empty for an untouched one). */
export async function listCemeteryBurials(slug: string) {
  const prisma = await db();
  const row = await prisma.cemetery.findUnique({
    where: { slug },
    select: {
      burials: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, yiddishName: true, knownAs: true, seforim: true, yahrzeit: true, note: true },
      },
    },
  });
  return row?.burials ?? [];
}

/**
 * Add a person to a beis hachaim, or correct one already added.
 *
 * Saving the same name twice updates that person rather than listing him
 * twice — a spelling fix should not leave two matzeivos on the page.
 */
export async function saveCemeteryBurial(
  slug: string,
  fallback: { city: string; yiddishCity: string; name: string; yiddishName: string; country: string },
  fields: BurialFields,
) {
  const prisma = await db();
  const cemetery = await cemeteryRowForSlug(slug, fallback);
  const existing = await prisma.tzaddik.findFirst({
    where: { cemeteryId: cemetery.id, name: { equals: fields.name.trim(), mode: "insensitive" } },
    select: { id: true },
  });
  const data = {
    name: fields.name.trim(),
    yiddishName: fields.yiddishName.trim() || fields.name.trim(),
    knownAs: fields.knownAs?.trim() || null,
    seforim: fields.seforim?.trim() || null,
    yahrzeit: fields.yahrzeit?.trim() || null,
    note: fields.note?.trim() || null,
    status: "NEEDS_VERIFICATION" as const,
  };
  if (existing) return prisma.tzaddik.update({ where: { id: existing.id }, data });
  return prisma.tzaddik.create({ data: { ...data, isPrimary: false, cemeteryId: cemetery.id } });
}

/** Take a person off a beis hachaim. Built-in burials are in code and untouched. */
export async function deleteCemeteryBurial(id: string) {
  const prisma = await db();
  await prisma.tzaddik.delete({ where: { id } });
}

/**
 * The other direction: you know who the person is and where he is buried, but
 * that beis hachaim isn't on the site yet. Creates both in one write, so a
 * failure can't leave a nameless cemetery behind.
 */
export async function createCemeteryWithBurial(cemetery: NewCemeteryFields, burial: BurialFields) {
  const prisma = await db();
  return prisma.cemetery.create({
    data: {
      slug: newSlug(cemetery.city || cemetery.name, "cemetery"),
      name: cemetery.name,
      yiddishName: cemetery.yiddishName || cemetery.name,
      city: cemetery.city,
      yiddishCity: cemetery.yiddishCity || cemetery.city,
      country: cemetery.country,
      address: cemetery.address,
      coordinates: cemetery.coordinates,
      accessNote: cemetery.accessNote,
      sourceUrl: cemetery.sourceUrl,
      status: "NEEDS_VERIFICATION",
      burials: {
        create: [
          {
            name: burial.name.trim(),
            yiddishName: burial.yiddishName.trim() || burial.name.trim(),
            knownAs: burial.knownAs?.trim() || null,
            seforim: burial.seforim?.trim() || null,
            yahrzeit: burial.yahrzeit?.trim() || null,
            note: burial.note?.trim() || null,
            isPrimary: true,
            status: "NEEDS_VERIFICATION",
          },
        ],
      },
    },
    select: { slug: true, name: true, city: true },
  });
}

export type NewPageFields = {
  title: string;
  body: string;
  status: ContentStatus;
};

/** Create a new standalone info page (rendered at /info/[slug]). */
export async function createInfoPage(fields: NewPageFields) {
  const prisma = await db();
  return prisma.page.create({
    data: {
      slug: newSlug(fields.title, "page"),
      title: fields.title,
      body: fields.body,
      status: fields.status,
    },
  });
}

// ---- The rest of the trip ---------------------------------------------
//
// Things to do and places to stay, added by the owner. These write to the same
// tables the built-in data seeds into, and everything on the site reads them
// back through lib/attractions-view.ts — so an entry added here shows on its
// directory page, in the /stops search, and in the planner's pickers straight
// away, with no redeploy and nothing to copy into a data file.
//
// Coordinates here are public landmarks and are safe to navigate to. That is
// not true of a kever, and the difference is why the two are separate screens.

export type NewAttractionFields = {
  name: string;
  city: string;
  country: string;
  kind: string;
  summary: string;
  address: string | null;
  coordinates: string | null;
  website: string | null;
  shabbos: string | null;
  notes: string[];
  sourceUrl: string;
};

export async function createAttraction(fields: NewAttractionFields) {
  const prisma = await db();
  return prisma.attraction.create({
    data: {
      slug: newSlug(`${fields.city}-${fields.name}`, "attraction"),
      name: fields.name,
      city: fields.city,
      country: fields.country,
      kind: fields.kind,
      summary: fields.summary,
      address: fields.address,
      coordinates: fields.coordinates,
      website: fields.website,
      shabbos: fields.shabbos,
      notes: fields.notes,
      sourceUrl: fields.sourceUrl,
      status: "PUBLISHED",
    },
    select: { slug: true, name: true },
  });
}

export type NewStayFields = {
  name: string;
  city: string;
  country: string;
  kind: string;
  summary: string;
  anchorName: string;
  anchorCoords: string;
  season: string | null;
  kosherClaim: string;
  website: string | null;
  notes: string[];
  sourceUrl: string;
};

export async function createKosherStay(fields: NewStayFields) {
  const prisma = await db();
  return prisma.kosherStay.create({
    data: {
      slug: newSlug(`${fields.city}-${fields.name}`, "stay"),
      name: fields.name,
      city: fields.city,
      country: fields.country,
      kind: fields.kind,
      summary: fields.summary,
      anchorName: fields.anchorName,
      anchorCoords: fields.anchorCoords,
      season: fields.season,
      // "confirmed" means the owner checked it with the hotel or its mashgiach.
      // It is never reached by default, and never inferred from a source.
      kosherClaim: ["none", "reported", "confirmed"].includes(fields.kosherClaim) ? fields.kosherClaim : "none",
      website: fields.website,
      notes: fields.notes,
      sourceUrl: fields.sourceUrl,
      status: "PUBLISHED",
    },
    select: { slug: true, name: true },
  });
}
