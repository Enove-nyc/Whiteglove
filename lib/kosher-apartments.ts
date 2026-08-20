/**
 * Published kosher-apartment providers for the public "Where to stay" page.
 *
 * A flat, source-backed list (data/kosher-apartment-hosts.ts) plus the ones the
 * owner adds from the admin — the same shape as the eruvin and the shuls. What
 * it lists is where to FIND a kosher short-term apartment: a kosher-Airbnb site,
 * a frum rental agency, a private host. Every entry routes out to the provider;
 * nothing here is booked on the site.
 *
 * No coordinate is stored, so none of these appears as a pin on the map — a
 * provider covers a city or the whole world, not a single point.
 */

import { kosherApartmentHosts } from "@/data/kosher-apartment-hosts";

export type ApartmentProvider = {
  id: string;
  name: string;
  /** Where they offer apartments — a city, a country, a region, or "Worldwide". */
  area: string;
  note: string | null;
  /** The provider's website, when it is a site. */
  url: string | null;
  /** A phone number, for a host or agent you call. */
  phone: string | null;
  /** A WhatsApp number, for a host you message. */
  whatsapp: string | null;
  /** True for an owner-added provider — the only kind the admin can remove. */
  added?: boolean;
};

function byAreaName(a: ApartmentProvider, b: ApartmentProvider): number {
  return a.area.localeCompare(b.area) || a.name.localeCompare(b.name);
}

/** Every built-in provider from the flat file, sorted by area and name. */
export function listApartmentProviders(): ApartmentProvider[] {
  return kosherApartmentHosts
    .map((host) => ({
      id: `apartment-${host.slug}`,
      name: host.name,
      area: host.area,
      note: host.note ?? null,
      url: host.url ?? null,
      phone: host.phone ?? null,
      whatsapp: host.whatsapp ?? null,
    }))
    .sort(byAreaName);
}

/**
 * What the owner types when adding a provider, before it becomes a listing.
 *
 * A provider is worth listing only if a traveller can reach it, so at least one
 * of website, phone or WhatsApp is required — a name with no way to get there is
 * not a listing.
 */
export type ApartmentInput = {
  name: string;
  area: string;
  note?: string | null;
  url?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

/** Why this provider cannot be saved, or null. Checked in the admin action. */
export function apartmentProblem(input: ApartmentInput): string | null {
  if (!input.name.trim()) return "Give the provider a name.";
  if (!input.area.trim()) return "Say where they offer apartments — a city, a country, or Worldwide.";
  const url = input.url?.trim() ?? "";
  if (url && !/^https?:\/\//i.test(url)) return "The website must be a full web address (https://…).";
  const hasContact = Boolean(url) || Boolean(input.phone?.trim()) || Boolean(input.whatsapp?.trim());
  if (!hasContact) return "Add a way to reach them — a website, a phone number, or a WhatsApp number.";
  return null;
}

/** A stable id for an owner-added provider, from its area and name. */
export function apartmentId(input: ApartmentInput): string {
  const slug = `${input.area} ${input.name}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `apartment-added-${slug || "provider"}`;
}

/** Turn validated input into the listing shape the public page renders. */
export function apartmentFromInput(input: ApartmentInput): ApartmentProvider {
  return {
    id: apartmentId(input),
    name: input.name.trim(),
    area: input.area.trim(),
    note: input.note?.trim() || null,
    url: input.url?.trim() || null,
    phone: input.phone?.trim() || null,
    whatsapp: input.whatsapp?.trim() || null,
    added: true,
  };
}

/**
 * The built-in providers and the owner-added ones, together.
 *
 * The owner's own additions win when an id clashes, since an edit is how he
 * corrects a built-in entry. Everything is re-sorted so the two sources read as
 * one list. Fails open: if the store cannot be read, the page is the built-in
 * list — currently empty, so the public section simply does not appear.
 */
export async function listAllApartmentProviders(): Promise<ApartmentProvider[]> {
  let stored: ApartmentProvider[] = [];
  try {
    const { getStoredApartments } = await import("@/lib/kosher-apartments-store");
    stored = await getStoredApartments();
  } catch {
    /* store unavailable — the page is the built-in list */
  }
  const byId = new Map<string, ApartmentProvider>();
  for (const provider of listApartmentProviders()) byId.set(provider.id, provider);
  for (const provider of stored) byId.set(provider.id, provider);
  return [...byId.values()].sort(byAreaName);
}
