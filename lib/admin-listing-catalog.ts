/**
 * Admin catalog lists for things to do, where to stay, and kosher food.
 *
 * These live under /admin/directory/... so they never take over public
 * /things-to-do, /hotels, or /kosher on a shared host.
 */

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
      editHref: "/admin/add",
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
      })),
    ];
  } catch {
    return fromFiles;
  }
}
