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

/** All cemeteries in the DB (built-in + owner-added), for the add-tzadik picker. */
export async function listCemeteriesForAdmin() {
  const prisma = await db();
  return prisma.cemetery.findMany({
    orderBy: [{ country: "asc" }, { city: "asc" }],
    select: { id: true, slug: true, name: true, city: true, country: true },
  });
}

export type NewBurialFields = {
  cemeteryId: string;
  name: string;
  yiddishName: string;
  knownAs: string | null;
  seforim: string | null;
  yahrzeit: string | null;
  note: string | null;
};

/** Add a tzadik (burial) to a cemetery. */
export async function createBurial(fields: NewBurialFields) {
  const prisma = await db();
  return prisma.tzaddik.create({
    data: {
      name: fields.name,
      yiddishName: fields.yiddishName || fields.name,
      knownAs: fields.knownAs,
      seforim: fields.seforim,
      yahrzeit: fields.yahrzeit,
      note: fields.note,
      isPrimary: false,
      status: "NEEDS_VERIFICATION",
      cemeteryId: fields.cemeteryId,
    },
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
