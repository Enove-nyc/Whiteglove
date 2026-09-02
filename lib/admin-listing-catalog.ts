/**
 * Admin catalog lists for things to do, where to stay, and kosher food.
 *
 * These live under /admin/directory/... so they never take over public
 * /things-to-do, /hotels, or /kosher on a shared host.
 */

import { emptyQuickEdit, type QuickListing } from "@/data/listing-quick-edit";
import { kosherEateries } from "@/data/kosher-eateries";
import { getAttractionList, getStayList } from "@/lib/attractions-view";
import { isDbEnabled } from "@/lib/content-admin";

export type AdminCatalogKind = "attraction" | "stay" | "food";

export type AdminCatalogEntry = {
  id: string;
  name: string;
  kind: string;
  city: string;
  country: string;
  sourceUrl: string;
  viewHref: string;
  editHref: string;
  ownerAdded: boolean;
  /**
   * What the View panel opens with. Built here because this file already reads
   * the whole record — the panel needs no second read, and the row and the
   * panel cannot disagree about what the listing says.
   */
  quick: QuickListing;
};

export async function listAdminCatalog(kind: AdminCatalogKind): Promise<AdminCatalogEntry[]> {
  if (kind === "attraction") {
    const rows = await getAttractionList();
    return rows.map((item) => ({
      id: item.slug,
      name: item.name,
      kind: item.kind,
      city: item.city,
      country: item.country,
      sourceUrl: item.sourceUrl,
      viewHref: `/things-to-do#${item.slug}`,
      editHref: "/admin/add",
      ownerAdded: item.ownerAdded,
      quick: {
        kind: "attraction" as const,
        id: item.slug,
        savable: false,
        whyNot: "This one comes from the site's own list rather than the database, so there is no row here to change.",
        fullEditHref: "/admin/add",
        fields: { ...emptyQuickEdit(), name: item.name, city: item.city, country: item.country, published: true },
      },
    }));
  }
  if (kind === "stay") {
    const rows = await getStayList();
    return rows.map((item) => ({
      id: item.slug,
      name: item.name,
      kind: item.kind,
      city: item.city,
      country: item.country,
      sourceUrl: item.sourceUrl,
      viewHref: `/hotels#${item.slug}`,
      quick: {
        kind: "stay" as const,
        id: item.slug,
        // Only an owner-added stay has a database row behind it. One the site
        // ships with has nowhere to save a change to, and the panel says so
        // rather than offering a Save that does nothing.
        savable: item.ownerAdded,
        ...(item.ownerAdded
          ? {}
          : { whyNot: "This stay comes with the site rather than from the database, so there is no row here to change." }),
        fullEditHref: item.ownerAdded ? `/admin/directory/stays/${item.slug}/edit` : "/admin/add",
        fields: { ...emptyQuickEdit(), name: item.name, city: item.city, country: item.country, published: true },
      },
      // Only an owner-added stay has a database row to edit. A stay the site
      // shipped with (in data/kosher-stays.ts) has nowhere to save a change to
      // yet, so it still points at Add — the same as before this screen existed.
      editHref: item.ownerAdded ? `/admin/directory/stays/${item.slug}/edit` : "/admin/add",
      ownerAdded: item.ownerAdded,
    }));
  }

  const fromFiles: AdminCatalogEntry[] = kosherEateries.map((item) => ({
    id: item.slug,
    name: item.name,
    kind: item.kind,
    city: item.city,
    country: item.country,
    sourceUrl: item.sourceUrl,
    viewHref: `/kosher#${item.slug}`,
    editHref: "/admin/add",
    ownerAdded: false,
    quick: {
      kind: "food" as const,
      id: item.slug,
      savable: false,
      whyNot: "This one comes from the site's own list rather than the database, so there is no row here to change.",
      fullEditHref: "/admin/add",
      fields: { ...emptyQuickEdit(), name: item.name, city: item.city, country: item.country, published: true },
    },
  }));
  if (!isDbEnabled()) return fromFiles;
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.practicalPlace.findMany({
      where: { category: { in: ["KOSHER_FOOD", "GROCERY"] } },
      select: {
        id: true,
        name: true,
        category: true,
        sourceUrl: true,
        destination: { select: { slug: true, city: true, country: true } },
      },
      orderBy: [{ destination: { country: "asc" } }, { destination: { city: "asc" } }, { name: "asc" }],
    });
    return [
      ...fromFiles,
      ...rows.map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.category === "GROCERY" ? "Grocery" : "Kosher food",
        city: item.destination.city,
        country: item.destination.country,
        sourceUrl: item.sourceUrl ?? "",
        viewHref: `/destinations/${item.destination.slug}`,
        editHref: `/admin/destinations?slug=${item.destination.slug}`,
        ownerAdded: true,
        quick: {
          kind: "food" as const,
          id: item.id,
          savable: true,
          fullEditHref: `/admin/destinations?slug=${item.destination.slug}`,
          fields: {
            ...emptyQuickEdit(),
            name: item.name,
            city: item.destination.city,
            country: item.destination.country,
            published: true,
          },
        },
      })),
    ];
  } catch {
    return fromFiles;
  }
}
