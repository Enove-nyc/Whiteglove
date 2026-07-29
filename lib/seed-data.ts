// Shared seed data builder — turns the static data/*.ts content into flat rows
// (with pre-assigned ids so foreign keys resolve) ready for Prisma createMany.
// Used by both the CLI seed (prisma/seed.ts) and the in-app setup route
// (app/api/admin/db-setup). Pure data — no DB access here.

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { cemeteries } from "@/data/cemeteries";
import { guidedDestinations, unguidedDestinations } from "@/data/destinations";
import { directoryProviders } from "@/data/directory";
import { practicalContent } from "@/data/practical-content";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type SeedRows = {
  destinations: Prisma.DestinationCreateManyInput[];
  cemeteries: Prisma.CemeteryCreateManyInput[];
  tzaddikim: Prisma.TzaddikCreateManyInput[];
  contacts: Prisma.ContactCreateManyInput[];
  places: Prisma.PracticalPlaceCreateManyInput[];
  directory: Prisma.DirectoryProviderCreateManyInput[];
};

export function buildSeedRows(): SeedRows {
  const destinations: Prisma.DestinationCreateManyInput[] = [];
  const tzaddikim: Prisma.TzaddikCreateManyInput[] = [];
  const contacts: Prisma.ContactCreateManyInput[] = [];
  const cemeteryRows: Prisma.CemeteryCreateManyInput[] = [];
  const places: Prisma.PracticalPlaceCreateManyInput[] = [];

  const slugToDestId = new Map<string, string>();

  // City guides — rich records with a primary tzaddik + access contacts.
  for (const { guide: g } of guidedDestinations()) {
    if (!g) continue;
    const id = randomUUID();
    slugToDestId.set(g.slug, id);
    destinations.push({
      id,
      slug: g.slug,
      kind: "CITY_GUIDE",
      city: g.city,
      yiddishCity: g.yiddishCity,
      country: g.country,
      aliases: g.aliases ?? [],
      overview: g.overview,
      safetyNote: g.safetyNote ?? null,
      sourceUrl: g.sourceUrl,
      status: "PUBLISHED",
    });
    tzaddikim.push({
      id: randomUUID(),
      name: g.tzaddik,
      yiddishName: g.yiddishTzaddik,
      seforim: g.seforim,
      yahrzeit: g.yahrzeit,
      niftar: g.niftar,
      graveAddress: g.graveAddress ?? null,
      graveCoordinates: g.graveCoordinates ?? null,
      findingNotes: g.findingNotes ?? [],
      isPrimary: true,
      status: "VERIFIED",
      source: g.sourceUrl,
      destinationId: id,
    });
    const guideContacts = g.accessContacts ?? (g.accessContact ? [g.accessContact] : []);
    for (const c of guideContacts) {
      contacts.push({
        id: randomUUID(),
        label: c.label,
        phone: c.phone ?? null,
        email: c.email ?? null,
        note: c.note ?? null,
        source: g.sourceUrl,
        status: "VERIFIED",
        destinationId: id,
      });
    }
  }

  // Bulk destinations — compact entries (skip slugs a guide already owns).
  for (const b of unguidedDestinations()) {
    if (slugToDestId.has(b.slug)) continue;
    const id = randomUUID();
    slugToDestId.set(b.slug, id);
    destinations.push({
      id,
      slug: b.slug,
      kind: "DESTINATION",
      city: b.city,
      yiddishCity: b.yiddishCity,
      country: b.country,
      aliases: b.aliases ?? [],
      summary: b.summary,
      status: "PUBLISHED",
    });
  }

  // Cemeteries — link to a destination when the slug matches; add burials +
  // contacts as related rows.
  for (const c of cemeteries) {
    const cemeteryId = randomUUID();
    cemeteryRows.push({
      id: cemeteryId,
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
      status: "VERIFIED",
      sourceUrl: c.sourceUrl,
      destinationId: slugToDestId.get(c.slug) ?? null,
    });
    for (const b of c.burials) {
      tzaddikim.push({
        id: randomUUID(),
        name: b.name,
        yiddishName: b.yiddishName,
        knownAs: b.knownAs ?? null,
        seforim: b.seforim ?? null,
        yahrzeit: b.yahrzeit ?? null,
        note: b.note ?? null,
        isPrimary: false,
        status: "VERIFIED",
        source: c.sourceUrl,
        cemeteryId,
      });
    }
    for (const ct of c.accessContacts ?? []) {
      contacts.push({
        id: randomUUID(),
        label: ct.label,
        phone: ct.phone ?? null,
        email: ct.email ?? null,
        note: ct.note ?? null,
        source: c.sourceUrl,
        status: "VERIFIED",
        cemeteryId,
      });
    }
  }

  // Web-researched practical content (data/practical-content.ts) — attach
  // published places + extra contacts to the destination that owns the slug.
  // Everything carries a source and is owner-verifiable in the admin editor.
  for (const [slug, content] of Object.entries(practicalContent)) {
    const destinationId = slugToDestId.get(slug);
    if (!destinationId) continue;
    for (const p of content.places ?? []) {
      places.push({
        id: randomUUID(),
        category: p.category,
        name: p.name,
        address: p.address ?? null,
        coordinates: p.coordinates ?? null,
        phone: p.phone ?? null,
        whatsapp: p.whatsapp ?? null,
        email: p.email ?? null,
        website: p.website ?? null,
        hours: p.hours ?? null,
        notes: [p.notes, p.source ? `Source: ${p.source}` : null]
          .filter(Boolean)
          .join("\n") || null,
        status: "PUBLISHED",
        destinationId,
      });
    }
    for (const c of content.contacts ?? []) {
      contacts.push({
        id: randomUUID(),
        label: c.label,
        phone: c.phone ?? null,
        email: c.email ?? null,
        note: c.note ?? null,
        source: c.source ?? null,
        status: "NEEDS_VERIFICATION",
        destinationId,
      });
    }
  }

  // Directory of service providers (data/directory.ts).
  const directory: Prisma.DirectoryProviderCreateManyInput[] = directoryProviders.map((p) => ({
    id: randomUUID(),
    slug: p.slug,
    name: p.name,
    category: p.category,
    tagline: p.tagline ?? null,
    description: p.description ?? null,
    phone: p.phone ?? null,
    whatsapp: p.whatsapp ?? null,
    email: p.email ?? null,
    website: p.website ?? null,
    basedIn: p.basedIn ?? null,
    regions: p.regions ?? [],
    languages: p.languages ?? [],
    specialties: p.specialties ?? [],
    featured: p.featured ?? false,
    status: "PUBLISHED",
    source: p.source ?? null,
  }));

  return { destinations, cemeteries: cemeteryRows, tzaddikim, contacts, places, directory };
}

export const DEFAULT_SETTINGS = {
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

export function countSeedRows(rows: SeedRows) {
  return {
    destinations: rows.destinations.length,
    cemeteries: rows.cemeteries.length,
    tzaddikim: rows.tzaddikim.length,
    contacts: rows.contacts.length,
    places: rows.places.length,
    directory: rows.directory.length,
  };
}
